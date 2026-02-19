/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import { CancelToken } from "axios";
import {
  getSimulationViewedKey,
  receivedExpectedData,
  recursivelyConvertExpectedDataToAiPromptString,
  recursiveUpdateAdditionalInfo,
  replaceStoredDataInString,
  chatLogToString,
  isJsonString,
} from "./helpers/helpers";
import {
  CollectedDiscussionData,
  DiscussionStage,
  DiscussionStageStepType,
  EndOfPhaseReflectionStep,
  isDiscussionStage,
  PromptStageStep,
  RequestUserInputStageStep,
  SystemMessageStageStep,
} from "../../schemas/models/DiscussionStage/types";
import {
  GenericLlmRequest,
  JsonResponseData,
  PromptOutputTypes,
  PromptRoles,
  SenderType,
  TargetAiModelServiceType,
} from "../llm-request/types";
import {
  removePersistTruthDataFromNewData,
  updateRoomWithNextStep,
} from "./pure-state-modifiers";
import { buildSystemMessage, getGameDataCopy } from "./state-modifier-helpers";
import { getCurStageAndStep } from "./user-action-pure-functions";
import {
  ChatMessage,
  DiscussionData,
  GameData,
  GameStateData,
  Room,
} from "../../schemas/models/Room";
import { AiServicesResponseTypes } from "../llm-request/ai-services/ai-service-types";
import { syncLlmRequest } from "../llm-request/llm-request";
import {
  getGameById,
  WAIT_FOR_SIMULATION_STAGE_CLIENT_ID,
} from "../../authoritative-server/games/game-helpers";
import RoomModel from "../../schemas/models/Room";
import { PlayerDocument } from "../../schemas/models/Player";
import { RequireInputType } from "../../schemas/models/DiscussionStage/objects";
import { GamePhaseReflections } from "../../schemas/models/GamePhaseReflections";
import GamePhaseReflectionsModel from "../../schemas/models/GamePhaseReflections";

export enum RoomModificationEnum {
  ADD_MESSAGE = "ADD_MESSAGE",
  ADD_TO_PLAYER_STATE_DATA = "ADD_TO_PLAYER_STATE_DATA",
  ADD_TO_GLOBAL_STATE_DATA = "ADD_TO_GLOBAL_STATE_DATA",
  ADD_TO_DISCUSSION_DATA = "ADD_TO_DISCUSSION_DATA",
  ADD_PLAYER_TO_ROOM = "ADD_PLAYER_TO_ROOM",
  NO_OP = "NO_OP",
}

export interface AtomicRoomModiticationAction {
  actionType: RoomModificationEnum;
}

export interface NoOpRoomAtomicAction
  extends Omit<AtomicRoomModiticationAction, "actionType"> {
  actionType: RoomModificationEnum.NO_OP;
}

export interface AddMessageRoomAtomicAction
  extends Omit<AtomicRoomModiticationAction, "actionType"> {
  actionType: RoomModificationEnum.ADD_MESSAGE;
  newMessage: ChatMessage;
}

export interface UpdatePlayerGameStateDataRoomAtomicAction
  extends Omit<AtomicRoomModiticationAction, "actionType"> {
  actionType: RoomModificationEnum.ADD_TO_PLAYER_STATE_DATA;
  playerId: string;
  newData: GameStateData;
}

export interface UpdateGlobalGameStateDataRoomAtomicAction
  extends Omit<AtomicRoomModiticationAction, "actionType"> {
  actionType: RoomModificationEnum.ADD_TO_GLOBAL_STATE_DATA;
  newData: GameStateData;
}

export interface UpdateDiscussionDataRoomAtomicAction
  extends Omit<AtomicRoomModiticationAction, "actionType"> {
  actionType: RoomModificationEnum.ADD_TO_DISCUSSION_DATA;
  newData: DiscussionData;
}

export interface AddPlayerToRoomAtomicAction
  extends Omit<AtomicRoomModiticationAction, "actionType"> {
  actionType: RoomModificationEnum.ADD_PLAYER_TO_ROOM;
  playerId: string;
  playerStateData: GameStateData;
}

export async function applyAtomicRoomModificationActions(
  _gameData: GameData,
  atomicRoomModificationActions: AtomicRoomModiticationAction[],
  roomId: string
): Promise<GameData> {
  // Aggregate messages to add
  const messagesToAdd: ChatMessage[] = [];

  // Aggregate player state data updates by playerId
  const playerStateUpdates: Record<string, GameStateData> = {};

  // Aggregate global state data updates
  let globalStateDataUpdate: GameStateData = {};

  // Aggregate discussion data updates
  let discussionDataUpdate: DiscussionData = {};

  // Process all actions in order, aggregating updates
  for (const action of atomicRoomModificationActions) {
    if (action.actionType === RoomModificationEnum.NO_OP) {
      continue;
    }
    switch (action.actionType) {
      case RoomModificationEnum.ADD_MESSAGE:
        const addMessageAction = action as AddMessageRoomAtomicAction;
        messagesToAdd.push(addMessageAction.newMessage);
        break;

      case RoomModificationEnum.ADD_TO_PLAYER_STATE_DATA:
        const playerAction =
          action as UpdatePlayerGameStateDataRoomAtomicAction;
        if (!playerStateUpdates[playerAction.playerId]) {
          playerStateUpdates[playerAction.playerId] = {};
        }
        // Merge in order - later values overwrite earlier ones
        playerStateUpdates[playerAction.playerId] = {
          ...playerStateUpdates[playerAction.playerId],
          ...playerAction.newData,
        };
        break;

      case RoomModificationEnum.ADD_TO_GLOBAL_STATE_DATA:
        const globalAction =
          action as UpdateGlobalGameStateDataRoomAtomicAction;
        globalStateDataUpdate = {
          ...globalStateDataUpdate,
          ...globalAction.newData,
        };
        break;

      case RoomModificationEnum.ADD_TO_DISCUSSION_DATA:
        const discussionAction = action as UpdateDiscussionDataRoomAtomicAction;
        discussionDataUpdate = {
          ...discussionDataUpdate,
          ...discussionAction.newData,
        };
        break;
    }
  }

  // Build MongoDB atomic operations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateOperations: any = {};

  // Add messages to chat using $push
  if (messagesToAdd.length > 0) {
    updateOperations.$push = {
      "gameData.chat": { $each: messagesToAdd },
    };
  }

  // Update player state data, global state data, and discussion data using $set with dot notation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setOperations: Record<string, any> = {};

  // Update player state data
  for (const [playerId, updates] of Object.entries(playerStateUpdates)) {
    for (const [key, value] of Object.entries(updates)) {
      setOperations[`gameData.playersGameStateData.${playerId}.${key}`] = value;
    }
  }

  // Update global state data
  for (const [key, value] of Object.entries(globalStateDataUpdate)) {
    setOperations[`gameData.globalStateData.gameStateData.${key}`] = value;
  }

  // Update discussion data
  for (const [key, value] of Object.entries(discussionDataUpdate)) {
    setOperations[`gameData.globalStateData.discussionData.${key}`] = value;
  }

  if (
    !Object.keys(updateOperations).length &&
    !Object.keys(setOperations).length
  ) {
    console.log("No updates to apply to room, returning original game data");
    return _gameData;
  }

  if (Object.keys(setOperations).length > 0) {
    updateOperations.$set = setOperations;
  }

  console.log("updateOperations: ", updateOperations);

  // Execute atomic update operation
  const updatedRoom = await RoomModel.findByIdAndUpdate(
    roomId,
    updateOperations,
    { new: true }
  );

  if (!updatedRoom) {
    throw new Error(`Room not found: ${roomId}`);
  }

  return updatedRoom.gameData;
}

export function startEndOfPhaseReflectionStep(
  _gameData: GameData,
  curStep: EndOfPhaseReflectionStep,
  sessionId: string
): AddMessageRoomAtomicAction {
  const newMessage = buildSystemMessage(
    _gameData,
    curStep.message,
    sessionId,
    curStep.stepId
  );
  return {
    actionType: RoomModificationEnum.ADD_MESSAGE,
    newMessage: newMessage,
  };
}

export function startRequestUserInputStep(
  _gameData: GameData,
  curStep: RequestUserInputStageStep,
  sessionId: string
): AddMessageRoomAtomicAction {
  const newMessage = buildSystemMessage(
    _gameData,
    curStep.message,
    sessionId,
    curStep.stepId
  );
  return {
    actionType: RoomModificationEnum.ADD_MESSAGE,
    newMessage: newMessage,
  };
}

export function processNewSystemMessageStep(
  _gameData: GameData,
  curStep: SystemMessageStageStep,
  sessionId: string
): AddMessageRoomAtomicAction {
  const newMessage = buildSystemMessage(
    _gameData,
    curStep.message,
    sessionId,
    curStep.stepId
  );
  return {
    actionType: RoomModificationEnum.ADD_MESSAGE,
    newMessage: newMessage,
  };
}

export function processConditionalStep(): NoOpRoomAtomicAction {
  // Non-op. Conditionals are evaluated when determining the next step.
  return {
    actionType: RoomModificationEnum.NO_OP,
  };
}

export async function processPromptStep(
  gameData: GameData,
  curStep: PromptStageStep,
  targetAiServiceModel: TargetAiModelServiceType,
  executePrompt: (
    llmRequest: GenericLlmRequest,
    cancelToken?: CancelToken
  ) => Promise<AiServicesResponseTypes>,
  playerIdToUpdate: string,
  sessionId: string
): Promise<AtomicRoomModiticationAction[]> {
  const atomicRoomModificationActions: AtomicRoomModiticationAction[] = [];
  const collectedDiscussionData: CollectedDiscussionData =
    gameData.globalStateData.discussionData || {};
  // handle replacing promptText with stored data
  const promptText = replaceStoredDataInString(
    curStep.promptText,
    collectedDiscussionData
  );
  // handle replacing responseFormat with stored data
  const responseFormat = replaceStoredDataInString(
    curStep.responseFormat,
    collectedDiscussionData
  );
  // handle replacing customSystemRole with stored data
  const customSystemRole = replaceStoredDataInString(
    curStep.customSystemRole,
    collectedDiscussionData
  );

  const llmRequest: GenericLlmRequest = {
    prompts: [],
    outputDataType: curStep.outputDataType as PromptOutputTypes,
    targetAiServiceModel: targetAiServiceModel,
    responseFormat: responseFormat,
    systemRole: customSystemRole,
  };

  if (curStep.includeChatLogContext) {
    llmRequest.prompts.push({
      promptText: `Current state of chat log between user and system: ${chatLogToString(
        gameData.chat
      )}`,
      promptRole: PromptRoles.SYSTEM,
    });
  }

  llmRequest.prompts.push({
    promptText: promptText,
    promptRole: PromptRoles.SYSTEM,
  });

  if (
    curStep.jsonResponseData &&
    curStep.outputDataType === PromptOutputTypes.JSON
  ) {
    const jsonResponseData: JsonResponseData[] = JSON.parse(
      curStep.jsonResponseData || "[]"
    );
    llmRequest.responseFormat += recursivelyConvertExpectedDataToAiPromptString(
      recursiveUpdateAdditionalInfo(jsonResponseData, collectedDiscussionData)
    );
  }

  const requestFunction = async () => {
    const _response = await executePrompt(llmRequest);
    const response = _response.answer;

    if (curStep.outputDataType === PromptOutputTypes.JSON) {
      if (!isJsonString(response)) {
        throw new Error(`Did not receive valid JSON data: ${response}`);
      }
      const jsonResponseData: JsonResponseData[] = JSON.parse(
        curStep.jsonResponseData || "[]"
      );
      if (curStep.jsonResponseData && curStep.jsonResponseData.length > 0) {
        if (!receivedExpectedData(jsonResponseData, response)) {
          throw new Error(
            `Did not receive expected JSON data: ${response}. \n Expected: ${JSON.stringify(
              jsonResponseData
            )}`
          );
        }
      }
      const resData: Record<string, any> = JSON.parse(response);
      const newDataToAdd = removePersistTruthDataFromNewData(gameData, resData);

      if (Object.keys(newDataToAdd).length > 0) {
        atomicRoomModificationActions.push({
          actionType: RoomModificationEnum.ADD_TO_DISCUSSION_DATA,
          newData: newDataToAdd,
        } as UpdateDiscussionDataRoomAtomicAction);

        atomicRoomModificationActions.push({
          actionType: RoomModificationEnum.ADD_TO_GLOBAL_STATE_DATA,
          newData: newDataToAdd,
        } as UpdateGlobalGameStateDataRoomAtomicAction);

        atomicRoomModificationActions.push({
          actionType: RoomModificationEnum.ADD_TO_PLAYER_STATE_DATA,
          playerId: playerIdToUpdate,
          newData: newDataToAdd,
        } as UpdatePlayerGameStateDataRoomAtomicAction);
      }
    } else {
      atomicRoomModificationActions.push({
        actionType: RoomModificationEnum.ADD_MESSAGE,
        newMessage: buildSystemMessage(
          gameData,
          response,
          sessionId,
          curStep.stepId
        ),
      } as AddMessageRoomAtomicAction);
    }
  };

  await requestFunction();

  return atomicRoomModificationActions;
}

export async function addPlayerToRoom(
  room: Room,
  player: PlayerDocument
): Promise<Room> {
  if (room.gameData.players.includes(player._id)) {
    console.log("Player already in room");
    return room;
  }
  const oldPlayerData = room.gameData.playersGameStateData[player._id] || {};
  const updatedRoom = await RoomModel.findByIdAndUpdate(
    room._id,
    {
      $push: { "gameData.players": player._id },
      $set: {
        "gameData.playersGameStateData": {
          [player._id]: {
            ...(room.gameData.globalStateData.gameStateData || {}),
            ...oldPlayerData,
          },
        },
      },
    },
    { new: true }
  );
  return updatedRoom.toObject();
}

export async function processCurStep(
  room: Room,
  discussionStages: DiscussionStage[],
  targetAiServiceModel: TargetAiModelServiceType,
  playerIdToUpdate: string,
  sessionId: string
): Promise<Room> {
  let gameData = getGameDataCopy(room.gameData);
  const { curStage, curStep } = getCurStageAndStep(gameData, discussionStages);
  if (!isDiscussionStage(curStage)) {
    console.log(
      "Cannot process step for simulation stage, returning original room"
    );
    return room;
  }
  switch (curStep.stepType) {
    case DiscussionStageStepType.END_OF_PHASE_REFLECTION:
      const endOfPhaseReflectionStepAction: AtomicRoomModiticationAction =
        startEndOfPhaseReflectionStep(gameData, curStep, sessionId);
      gameData = await applyAtomicRoomModificationActions(
        gameData,
        [endOfPhaseReflectionStepAction],
        room._id
      );
      break;
    case DiscussionStageStepType.REQUEST_USER_INPUT:
      const roomModificationActions: AtomicRoomModiticationAction =
        startRequestUserInputStep(gameData, curStep, sessionId);
      gameData = await applyAtomicRoomModificationActions(
        gameData,
        [roomModificationActions],
        room._id
      );
      const requestUserInputStep = curStep as RequestUserInputStageStep;
      const stageStatus = requestUserInputStageStatus(
        gameData,
        requestUserInputStep
      );
      gameData.curGameState = {
        curState: requestUserInputStep.requireInputType,
        playersLeftToRespond: stageStatus.playersLeftToRespond || [],
      };
      break;
    case DiscussionStageStepType.SYSTEM_MESSAGE:
      const newSystemMessageStepAction: AtomicRoomModiticationAction =
        processNewSystemMessageStep(gameData, curStep, sessionId);
      gameData = await applyAtomicRoomModificationActions(
        gameData,
        [newSystemMessageStepAction],
        room._id
      );
      break;
    case DiscussionStageStepType.CONDITIONAL:
      const conditionalStepAction: AtomicRoomModiticationAction =
        processConditionalStep();
      gameData = await applyAtomicRoomModificationActions(
        gameData,
        [conditionalStepAction],
        room._id
      );
      break;
    case DiscussionStageStepType.PROMPT:
      const atomicRoomModificationActions: AtomicRoomModiticationAction[] =
        await processPromptStep(
          gameData,
          curStep,
          targetAiServiceModel,
          syncLlmRequest,
          playerIdToUpdate,
          sessionId
        );
      gameData = await applyAtomicRoomModificationActions(
        gameData,
        atomicRoomModificationActions,
        room._id
      );
      break;
    default:
      throw new Error(`Unknown step type: ${curStep}`);
  }
  return {
    ...room,
    gameData: gameData,
  };
}

export function processSimulationStep(room: Room): Room {
  return {
    ...room,
    gameData: {
      ...room.gameData,
      curGameState: {
        curState: "WAITING_FOR_SIMULATION",
        playersLeftToRespond: [],
      },
    },
  };
}

export interface RequestUserInputStepCompletionStatus {
  isComplete: boolean;
  playersLeftToRespond: string[];
}

export interface EndOfPhaseReflectionStepCompletionStatus {
  isComplete: boolean;
  playersLeftToRespond: string[];
}

/**
 *
 */
export async function transitionToEndOfPhaseReflectionState(
  room: Room,
  curStep: EndOfPhaseReflectionStep,
  curStepGamePhaseReflections: GamePhaseReflections[]
) {
  if (room.gameData.curGameState.curState === "END_OF_PHASE_REFLECTION") {
    console.log("already transitioned to end of phase reflection state");
    return room;
  }
  // TODO: create a new gamePhaseReflection for the roomId + phaseStepId + roundNumber
  const roundNumber = curStepGamePhaseReflections.length + 1;

  await GamePhaseReflectionsModel.create({
    roomId: room._id,
    stepId: curStep.stepId,
    roundNumber: roundNumber,
    reflections: {},
  });

  return (
    await RoomModel.findOneAndUpdate(
      { _id: room._id },
      {
        $set: {
          "gameData.curGameState": {
            curState: "END_OF_PHASE_REFLECTION",
            playersLeftToRespond: room.gameData.players,
            curRoundNumber: roundNumber,
            endOfPhaseStep: curStep,
          },
        },
      },
      { new: true }
    )
  ).toObject();
}

/**
 * Checks if all users CURRENTLY in the room have provided a response for the reflection
 * @param room A room that is already in the END_OF_PHASE_REFLECTION state
 * @returns
 */
export function endOfPhaseReflectionStepStatus(
  room: Room,
  curRoundGameReflections: GamePhaseReflections
): EndOfPhaseReflectionStepCompletionStatus {
  if (room.gameData.curGameState.curState !== "END_OF_PHASE_REFLECTION") {
    console.log("not in end of phase reflection state, will not check status");
    return {
      isComplete: false,
      playersLeftToRespond:
        room.gameData.curGameState.playersLeftToRespond || [],
    };
  }
  const playersInRoom = room.gameData.players;
  const playersWithNoReponse = playersInRoom.filter(
    (playerId) => !curRoundGameReflections.reflections[playerId]
  );
  return {
    isComplete: playersWithNoReponse.length === 0,
    playersLeftToRespond: playersWithNoReponse,
  };
}

export function requestUserInputStageStatus(
  _gameData: GameData,
  curStep: RequestUserInputStageStep
): RequestUserInputStepCompletionStatus {
  // Just check the chat log for the messages that came after the request user input step.
  const gameData = getGameDataCopy(_gameData);
  let mostRecentSystemMessageIdx = -1;
  let mostRecentUserMessageIdx = -1;

  if (!gameData.players.length) {
    console.log("no players in room, will not progress step");
    return {
      isComplete: false,
      playersLeftToRespond: [],
    };
  }

  for (let i = 0; i < gameData.chat.length; i++) {
    if (gameData.chat[i].fromStepId === curStep.stepId) {
      mostRecentSystemMessageIdx = i;
    }
    if (gameData.chat[i].sender === SenderType.PLAYER) {
      mostRecentUserMessageIdx = i;
    }
  }
  if (mostRecentSystemMessageIdx === -1) {
    // Find most recent system message.
    for (let i = gameData.chat.length - 1; i >= 0; i--) {
      if (gameData.chat[i].sender === SenderType.SYSTEM) {
        mostRecentSystemMessageIdx = i;
        break;
      }
    }
  }

  if (
    curStep.requireInputType ===
      RequireInputType.ALL_USER_RESPONSES_REQUIRED_FREE_FOR_ALL ||
    curStep.requireInputType ===
      RequireInputType.ALL_USER_RESPONSES_REQUIRED_IN_ORDER
  ) {
    // Both of these types require that every player provided a response, so check for that.
    console.log(
      `Requiring all player inputs with type: ${curStep.requireInputType}`
    );
    const playerIds = gameData.players;
    const messagesAfterInputStepMessage = gameData.chat.slice(
      mostRecentSystemMessageIdx + 1
    );
    const userMessagesAfterInputStepMessage =
      messagesAfterInputStepMessage.filter(
        (msg) => msg.sender === SenderType.PLAYER
      );

    // If no system message was found, then the step is not complete.
    if (mostRecentSystemMessageIdx === -1) {
      console.log("no system message found, step is not complete");
      return {
        isComplete: false,
        playersLeftToRespond: [],
      };
    }

    const isComplete = playerIds.every((playerId) =>
      userMessagesAfterInputStepMessage.some((msg) => msg.senderId === playerId)
    );

    const playersLeftToRespond = playerIds.filter(
      (playerId) =>
        !userMessagesAfterInputStepMessage.some(
          (msg) => msg.senderId === playerId
        )
    );
    return {
      isComplete: isComplete,
      playersLeftToRespond: playersLeftToRespond || [],
    };
  } else {
    // Single input required, so just check that we got 1 user message after the input step message.
    console.log(
      `Single input required, checking for 1 user message after input step message`
    );
    const isComplete = mostRecentUserMessageIdx > mostRecentSystemMessageIdx;
    return {
      isComplete: isComplete,
      playersLeftToRespond: [],
    };
  }
}

export function isSimulationStageComplete(_gameData: GameData): boolean {
  const gameData = getGameDataCopy(_gameData);
  // Check that atleast 1 player has viewed the simulation for this stage.
  const simulationViewedKey = getSimulationViewedKey(
    gameData.globalStateData.curStageId
  );
  return Object.values(gameData.playersGameStateData).some(
    (player) => player[simulationViewedKey] === "true"
  );
}

/**
 * Goes to the next step and continues processing steps until we reach the next stalling phase (Request user input, simulation stage, end of phase reflection stage)
 * This means we process prompts, system messages, and conditionals until we reach the next stalling phase, of which will still have its message added to the chat.
 */
export async function processStepsUntilNextStallingPhase(
  room: Room,
  discussionStages: DiscussionStage[],
  targetAiServiceModel: TargetAiModelServiceType,
  playerIdToUpdate: string,
  sessionId: string
): Promise<Room> {
  let latestRoom = room;
  let stepAndStage = getCurStageAndStep(latestRoom.gameData, discussionStages);
  const curGame = getGameById(latestRoom.gameData.gameId, discussionStages);

  do {
    const curStage = curGame.stageList.find(
      (stage) =>
        stage.stage.clientId === latestRoom.gameData.globalStateData.curStageId
    );
    latestRoom = await updateRoomWithNextStep(
      latestRoom,
      curStage,
      stepAndStage.curStep
    );
    stepAndStage = getCurStageAndStep(latestRoom.gameData, discussionStages);
    if (isDiscussionStage(stepAndStage.curStage)) {
      console.log(
        `processing ${stepAndStage.curStep.stepType} step: ${stepAndStage.curStep.stepId}`
      );
      latestRoom = await processCurStep(
        latestRoom,
        discussionStages,
        targetAiServiceModel,
        playerIdToUpdate,
        sessionId
      );
    } else {
      // is simulation stage
      latestRoom = processSimulationStep(latestRoom);
    }
  } while (
    stepAndStage.curStep?.stepType !==
      DiscussionStageStepType.REQUEST_USER_INPUT &&
    stepAndStage.curStep?.stepType !==
      DiscussionStageStepType.END_OF_PHASE_REFLECTION &&
    stepAndStage.curStage.clientId !== WAIT_FOR_SIMULATION_STAGE_CLIENT_ID
  );

  return latestRoom;
}
