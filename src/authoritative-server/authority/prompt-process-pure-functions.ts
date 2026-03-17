/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { AiServicesResponseTypes } from "../../authoritative-server/llm-request/ai-services/ai-service-types";
import {
  TargetAiModelServiceType,
  GenericLlmRequest,
  PromptOutputTypes,
  JsonResponseData,
  PromptRoles,
  JsonResponseDataType,
} from "../../authoritative-server/llm-request/types";
import { CancelToken } from "axios";
import {
  PromptStageStep,
  PromptConfiguration,
  isDiscussionStage,
} from "../../schemas/models/DiscussionStage/types";
import { PlayerDocument } from "../../schemas/models/Player";
import { GameData } from "../../schemas/models/Room";
import {
  replaceStoredDataInString,
  recursivelyConvertExpectedDataToAiPromptString,
  recursiveUpdateAdditionalInfo,
  isJsonString,
  receivedExpectedData,
} from "./helpers/helpers";
import { removePersistTruthDataFromNewData } from "./pure-state-modifiers";
import { buildSystemMessage } from "./state-modifier-helpers";
import {
  AtomicRoomModiticationAction,
  RoomModificationEnum,
  UpdateDiscussionDataRoomAtomicAction,
  UpdateGlobalGameStateDataRoomAtomicAction,
  UpdatePlayerGameStateDataRoomAtomicAction,
  AddMessageRoomAtomicAction,
} from "../llm-request/types";
import {
  IncludeMessagesContextTypeEnum,
  ProcessPromptAs,
} from "../../schemas/models/DiscussionStage/objects";
import { generateChatContext } from "../../helpers/chatContextGenerator";
import LearningObjectiveModel from "../../schemas/models/LearningObjective";
import { findRequestUserInputStepByStepId } from "../../helpers";
import { DiscussionStage } from "../../schemas/models/DiscussionStage/types";
import { getGameById } from "../games/game-helpers";
import StudentSubmissionLogModel from "../../schemas/models/StudentSubmissionLog";
import { Room } from "../../schemas/models/Room";

export async function processPromptStep(
  room: Room,
  curStep: PromptStageStep,
  targetAiServiceModel: TargetAiModelServiceType,
  executePrompt: (
    llmRequest: GenericLlmRequest,
    cancelToken?: CancelToken
  ) => Promise<AiServicesResponseTypes>,
  playerIdToUpdate: string,
  sessionId: string,
  activePlayerData: PlayerDocument[],
  discussionStages: DiscussionStage[]
): Promise<AtomicRoomModiticationAction[]> {
  // Execute all prompts in parallel
  const promptResults = await Promise.all(
    curStep.prompts.map(async (promptConfig) => {
      // Check if we should process as GROUP or INDIVIDUALLY
      if (promptConfig.processPromptAs === ProcessPromptAs.GROUP) {
        return processGroupPrompt(
          promptConfig,
          room,
          curStep,
          targetAiServiceModel,
          executePrompt,
          sessionId,
          activePlayerData
        );
      } else {
        return processIndividualPrompts(
          promptConfig,
          room,
          curStep,
          targetAiServiceModel,
          executePrompt,
          sessionId,
          activePlayerData,
          discussionStages
        );
      }
    })
  );

  // Flatten all actions from all prompts into a single array
  return promptResults.flat();
}

// Process a single prompt in GROUP mode
async function processGroupPrompt(
  promptConfig: PromptConfiguration,
  room: Room,
  curStep: PromptStageStep,
  targetAiServiceModel: TargetAiModelServiceType,
  executePrompt: (
    llmRequest: GenericLlmRequest,
    cancelToken?: CancelToken
  ) => Promise<AiServicesResponseTypes>,
  sessionId: string,
  activePlayerData: PlayerDocument[]
): Promise<AtomicRoomModiticationAction[]> {
  const atomicRoomModificationActions: AtomicRoomModiticationAction[] = [];
  const gameData = room.gameData;
  // Build aggregated state data for find-and-replace
  const aggregatedStateData = buildAggregatedStateDataForGroup(
    promptConfig.promptText,
    promptConfig.responseFormat,
    promptConfig.customSystemRole,
    activePlayerData,
    gameData
  );

  // Replace variables with aggregated data
  const promptText = replaceStoredDataInString(
    promptConfig.promptText,
    aggregatedStateData
  );
  const responseFormat = replaceStoredDataInString(
    promptConfig.responseFormat,
    aggregatedStateData
  );
  const customSystemRole = replaceStoredDataInString(
    promptConfig.customSystemRole,
    aggregatedStateData
  );

  // Build LLM request
  const llmRequest: GenericLlmRequest = {
    prompts: [],
    outputDataType: promptConfig.outputDataType as PromptOutputTypes,
    targetAiServiceModel: targetAiServiceModel,
    responseFormat: responseFormat,
    systemRole: customSystemRole,
  };

  llmRequest.prompts.push({
    promptText: promptText,
    promptRole: PromptRoles.SYSTEM,
  });

  if (
    promptConfig.includeMessageContext?.type !==
    IncludeMessagesContextTypeEnum.NONE
  ) {
    const chatContext = generateChatContext(
      gameData,
      "",
      false,
      promptConfig.includeMessageContext
    );
    llmRequest.prompts.push({
      promptText: chatContext,
      promptRole: PromptRoles.SYSTEM,
    });
  }

  if (
    promptConfig.jsonResponseData &&
    promptConfig.outputDataType === PromptOutputTypes.JSON
  ) {
    const jsonResponseData: JsonResponseData[] = JSON.parse(
      promptConfig.jsonResponseData || "[]"
    );
    llmRequest.responseFormat += recursivelyConvertExpectedDataToAiPromptString(
      recursiveUpdateAdditionalInfo(jsonResponseData, aggregatedStateData)
    );
  }

  // Execute prompt
  const _response = await executePrompt(llmRequest);
  const response = _response.answer;

  // Process response
  if (promptConfig.outputDataType === PromptOutputTypes.JSON) {
    if (!isJsonString(response)) {
      throw new Error(`Did not receive valid JSON data: ${response}`);
    }
    const jsonResponseData: JsonResponseData[] = JSON.parse(
      promptConfig.jsonResponseData || "[]"
    );
    if (
      promptConfig.jsonResponseData &&
      promptConfig.jsonResponseData.length > 0
    ) {
      if (!receivedExpectedData(jsonResponseData, response)) {
        throw new Error(
          `Did not receive expected JSON data: ${response}. \n Expected: ${JSON.stringify(
            jsonResponseData
          )}`
        );
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resData: Record<string, any> = JSON.parse(response);
    const newDataToAdd = removePersistTruthDataFromNewData(gameData, resData);

    if (Object.keys(newDataToAdd).length > 0) {
      // GROUP mode: Update discussionData and globalStateData only
      atomicRoomModificationActions.push({
        actionType: RoomModificationEnum.ADD_TO_DISCUSSION_DATA,
        newData: newDataToAdd,
      } as UpdateDiscussionDataRoomAtomicAction);

      atomicRoomModificationActions.push({
        actionType: RoomModificationEnum.ADD_TO_GLOBAL_STATE_DATA,
        newData: newDataToAdd,
      } as UpdateGlobalGameStateDataRoomAtomicAction);

      for (const player of activePlayerData) {
        atomicRoomModificationActions.push({
          actionType: RoomModificationEnum.ADD_TO_PLAYER_STATE_DATA,
          playerId: player._id,
          newData: newDataToAdd,
        } as UpdatePlayerGameStateDataRoomAtomicAction);
      }
    }
  } else {
    atomicRoomModificationActions.push({
      actionType: RoomModificationEnum.ADD_MESSAGE,
      newMessage: buildSystemMessage(
        gameData,
        response,
        sessionId,
        curStep.stepId,
        curStep.stepType
      ),
    } as AddMessageRoomAtomicAction);
  }

  return atomicRoomModificationActions;
}

// Process prompts in INDIVIDUALLY mode (one per student, in parallel)
async function processIndividualPrompts(
  promptConfig: PromptConfiguration,
  room: Room,
  curStep: PromptStageStep,
  targetAiServiceModel: TargetAiModelServiceType,
  executePrompt: (
    llmRequest: GenericLlmRequest,
    cancelToken?: CancelToken
  ) => Promise<AiServicesResponseTypes>,
  sessionId: string,
  activePlayerData: PlayerDocument[],
  discussionStages: DiscussionStage[]
): Promise<AtomicRoomModiticationAction[]> {
  const gameData = room.gameData;
  try {
    // Check if this is an analyze learning objectives prompt
    if (promptConfig.analyzeLearningObjectives) {
      const individualResults = await Promise.all(
        activePlayerData.map(async (player) => {
          return processAnalyzeLearningObjectivePrompt(
            promptConfig,
            player,
            room,
            curStep,
            targetAiServiceModel,
            executePrompt,
            sessionId,
            discussionStages
          );
        })
      );
      return individualResults.flat();
    }

    // Process each student individually in parallel
    const individualResults = await Promise.all(
      activePlayerData.map(async (player) => {
        return processSingleStudentPrompt(
          promptConfig,
          player,
          room,
          curStep,
          targetAiServiceModel,
          executePrompt,
          sessionId
        );
      })
    );

    // Flatten and return all actions
    return individualResults.flat();
  } catch (error) {
    console.error("Error processing individual prompts: ", error);
    return [];
  }
}

// Process a single student's prompt for analyzing learning objectives
async function processAnalyzeLearningObjectivePrompt(
  promptConfig: PromptConfiguration,
  player: PlayerDocument,
  room: Room,
  curStep: PromptStageStep,
  targetAiServiceModel: TargetAiModelServiceType,
  executePrompt: (
    llmRequest: GenericLlmRequest,
    cancelToken?: CancelToken
  ) => Promise<AiServicesResponseTypes>,
  sessionId: string,
  _discussionStages: DiscussionStage[]
): Promise<AtomicRoomModiticationAction[]> {
  const gameData = room.gameData;
  const game = getGameById(gameData.gameId, _discussionStages);
  const discussionStages = game.stageList
    .map((s) => s.stage)
    .filter((s) => isDiscussionStage(s)) as DiscussionStage[];
  const playerId = String(player._id);
  console.log(
    "PROCESSING analyzeLearningObjectivePrompt for player: ",
    playerId
  );
  const playerActions: AtomicRoomModiticationAction[] = [];

  // Build student-specific state data (player data takes precedence over global)
  const studentStateData = buildStudentStateData(playerId, gameData);

  // Replace variables with student-specific data
  const promptText = replaceStoredDataInString(
    promptConfig.promptText,
    studentStateData
  );

  // Build LLM request
  const llmRequest: GenericLlmRequest = {
    prompts: [],
    outputDataType: PromptOutputTypes.JSON, // Force JSON output for learning objectives
    targetAiServiceModel: targetAiServiceModel,
    responseFormat: "",
    systemRole: "",
  };

  // Add learning objectives to context
  const requestUserInputStepsToPullLOIdsFrom =
    promptConfig.includeMessageContext.stepIds;
  console.log(
    "requestUserInputStepsToPullLOIdsFrom: ",
    requestUserInputStepsToPullLOIdsFrom
  );
  const learningObjectiveIds = Array.from(
    new Set(
      requestUserInputStepsToPullLOIdsFrom
        .map((stepId) => {
          const requestUserInputStep = findRequestUserInputStepByStepId(
            stepId,
            discussionStages
          );
          return requestUserInputStep?.learningObjectives || [];
        })
        .flat()
    )
  );
  const learningObjectives = await LearningObjectiveModel.find({
    _id: { $in: learningObjectiveIds },
  });
  if (learningObjectives.length > 0) {
    let learningObjectivesContext = `
      Your task is to analyze both user responses to questions and extra provided user data to determine if the user has demonstrated the learning objectives.
      Here are the active learning objectives:\n`;
    learningObjectives.forEach((lo) => {
      learningObjectivesContext += `- ${lo.title}: ${lo.criteria}\n`;
    });

    llmRequest.prompts.push({
      promptText: learningObjectivesContext.trim(),
      promptRole: PromptRoles.SYSTEM,
    });
  }

  if (
    promptConfig.includeMessageContext?.type !==
    IncludeMessagesContextTypeEnum.NONE
  ) {
    const chatContext = generateChatContext(
      gameData,
      playerId,
      true,
      promptConfig.includeMessageContext
    );
    llmRequest.prompts.push({
      promptText: chatContext,
      promptRole: PromptRoles.SYSTEM,
    });
  }

  llmRequest.prompts.push({
    promptText: promptText,
    promptRole: PromptRoles.SYSTEM,
  });

  // Build JSON response data from learning objectives
  const jsonResponseData: JsonResponseData[] = learningObjectives.map((lo) => ({
    name: lo.variableName,
    additionalInfo: `Respond with either a string "true" or "false", Set to "true" if the ${lo.title} learning objective was met by the provided user data, else return "false".`,
    clientId: lo.variableName,
    type: JsonResponseDataType.STRING,
    isRequired: true,
  }));

  llmRequest.responseFormat += recursivelyConvertExpectedDataToAiPromptString(
    recursiveUpdateAdditionalInfo(jsonResponseData, studentStateData)
  );

  // Execute prompt
  const _response = await executePrompt(llmRequest);
  const response = _response.answer;

  // Process response
  if (!isJsonString(response)) {
    throw new Error(`Did not receive valid JSON data: ${response}`);
  }

  if (jsonResponseData.length > 0) {
    if (!receivedExpectedData(jsonResponseData, response)) {
      throw new Error(
        `Did not receive expected JSON data: ${response}. \n Expected: ${JSON.stringify(
          jsonResponseData
        )}`
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resData: Record<string, any> = JSON.parse(response);
  const _newDataToAdd = removePersistTruthDataFromNewData(gameData, resData);
  // only keep the true values since we only care about newly met learning objectives
  const newDataToAdd = Object.fromEntries(
    Object.entries(_newDataToAdd).filter(([_, value]) => value === "true")
  );

  if (Object.keys(newDataToAdd).length > 0) {
    playerActions.push({
      actionType: RoomModificationEnum.ADD_TO_DISCUSSION_DATA,
      newData: newDataToAdd,
    } as UpdateDiscussionDataRoomAtomicAction);

    playerActions.push({
      actionType: RoomModificationEnum.ADD_TO_PLAYER_STATE_DATA,
      playerId: playerId,
      newData: newDataToAdd,
    } as UpdatePlayerGameStateDataRoomAtomicAction);

    playerActions.push({
      actionType: RoomModificationEnum.ADD_TO_GLOBAL_STATE_DATA,
      newData: newDataToAdd,
    } as UpdateGlobalGameStateDataRoomAtomicAction);
  }

  const coveredLearningObjectives = Object.fromEntries(
    Object.entries(resData).filter(([_, value]) => value === "true")
  );
  if (Object.keys(coveredLearningObjectives).length > 0) {
    await updateStudentSubmissionLog(
      playerId,
      room._id,
      room.gameData.curGameState.curRoundNumber,
      room.gameData.phaseProgression.curPhaseStepId,
      coveredLearningObjectives
    );
  }

  console.log(
    "Player actions for analyzeLearningObjectivePrompt: ",
    JSON.stringify(playerActions, null, 2)
  );
  return playerActions;
}

async function updateStudentSubmissionLog(
  userId: string,
  roomId: string,
  roundNumber: number,
  phaseStepId: string,
  newDataToAdd: Record<string, string>
): Promise<void> {
  const res = await StudentSubmissionLogModel.findOneAndUpdate(
    { userId, roomId, roundNumber, phaseStepId },
    {
      $addToSet: {
        studentCoveredLearningObjectives: Object.keys(newDataToAdd),
      },
    },
    { new: true, upsert: false }
  );
}

// Process a single student's prompt in INDIVIDUALLY mode
async function processSingleStudentPrompt(
  promptConfig: PromptConfiguration,
  player: PlayerDocument,
  room: Room,
  curStep: PromptStageStep,
  targetAiServiceModel: TargetAiModelServiceType,
  executePrompt: (
    llmRequest: GenericLlmRequest,
    cancelToken?: CancelToken
  ) => Promise<AiServicesResponseTypes>,
  sessionId: string
): Promise<AtomicRoomModiticationAction[]> {
  const gameData = room.gameData;
  const playerId = String(player._id);
  const playerActions: AtomicRoomModiticationAction[] = [];

  // Build student-specific state data (player data takes precedence over global)
  const studentStateData = buildStudentStateData(playerId, gameData);

  // Replace variables with student-specific data
  const promptText = replaceStoredDataInString(
    promptConfig.promptText,
    studentStateData
  );
  const responseFormat = replaceStoredDataInString(
    promptConfig.responseFormat,
    studentStateData
  );
  const customSystemRole = replaceStoredDataInString(
    promptConfig.customSystemRole,
    studentStateData
  );

  // Build LLM request
  const llmRequest: GenericLlmRequest = {
    prompts: [],
    outputDataType: promptConfig.outputDataType as PromptOutputTypes,
    targetAiServiceModel: targetAiServiceModel,
    responseFormat: responseFormat,
    systemRole: customSystemRole,
  };

  if (promptConfig.includeChatLogContext) {
    const chatContext = generateChatContext(
      gameData,
      playerId,
      true,
      promptConfig.includeMessageContext
    );
    llmRequest.prompts.push({
      promptText: chatContext,
      promptRole: PromptRoles.SYSTEM,
    });
  }

  llmRequest.prompts.push({
    promptText: promptText,
    promptRole: PromptRoles.SYSTEM,
  });

  if (
    promptConfig.jsonResponseData &&
    promptConfig.outputDataType === PromptOutputTypes.JSON
  ) {
    const jsonResponseData: JsonResponseData[] = JSON.parse(
      promptConfig.jsonResponseData || "[]"
    );
    llmRequest.responseFormat += recursivelyConvertExpectedDataToAiPromptString(
      recursiveUpdateAdditionalInfo(jsonResponseData, studentStateData)
    );
  }

  // Execute prompt
  const _response = await executePrompt(llmRequest);
  const response = _response.answer;

  // Process response
  if (promptConfig.outputDataType === PromptOutputTypes.JSON) {
    if (!isJsonString(response)) {
      throw new Error(`Did not receive valid JSON data: ${response}`);
    }
    const jsonResponseData: JsonResponseData[] = JSON.parse(
      promptConfig.jsonResponseData || "[]"
    );
    if (
      promptConfig.jsonResponseData &&
      promptConfig.jsonResponseData.length > 0
    ) {
      if (!receivedExpectedData(jsonResponseData, response)) {
        throw new Error(
          `Did not receive expected JSON data: ${response}. \n Expected: ${JSON.stringify(
            jsonResponseData
          )}`
        );
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resData: Record<string, any> = JSON.parse(response);
    const newDataToAdd = removePersistTruthDataFromNewData(gameData, resData);

    if (Object.keys(newDataToAdd).length > 0) {
      // INDIVIDUALLY mode: Update discussionData and player-specific data only
      playerActions.push({
        actionType: RoomModificationEnum.ADD_TO_DISCUSSION_DATA,
        newData: newDataToAdd,
      } as UpdateDiscussionDataRoomAtomicAction);

      playerActions.push({
        actionType: RoomModificationEnum.ADD_TO_PLAYER_STATE_DATA,
        playerId: playerId,
        newData: newDataToAdd,
      } as UpdatePlayerGameStateDataRoomAtomicAction);

      playerActions.push({
        actionType: RoomModificationEnum.ADD_TO_GLOBAL_STATE_DATA,
        newData: newDataToAdd,
      } as UpdateGlobalGameStateDataRoomAtomicAction);
    }
  } else {
    playerActions.push({
      actionType: RoomModificationEnum.ADD_MESSAGE,
      newMessage: buildSystemMessage(
        gameData,
        response,
        sessionId,
        curStep.stepId,
        curStep.stepType
      ),
    } as AddMessageRoomAtomicAction);
  }

  return playerActions;
}

// ========== Helper Functions ==========

// Helper function to extract variable paths from a string
function extractVariablePaths(text: string): string[] {
  const regex = /{{(.*?)}}/g;
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

// Helper function to get value from nested object path
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getValueByPath(obj: Record<string, any>, path: string): any {
  const keys = path.split(".");
  return keys.reduce((acc, key) => {
    return acc && acc[key] !== undefined ? acc[key] : undefined;
  }, obj);
}

// Helper to set value in nested object by path
function setValueByPath(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj: Record<string, any>,
  path: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any
): void {
  const keys = path.split(".");
  const lastKey = keys.pop()!;

  let current = obj;
  for (const key of keys) {
    if (!current[key]) {
      current[key] = {};
    }
    current = current[key];
  }

  current[lastKey] = value;
}

// Helper to build aggregated state data for GROUP mode
function buildAggregatedStateDataForGroup(
  promptText: string,
  responseFormat: string,
  customSystemRole: string,
  activePlayerData: PlayerDocument[],
  gameData: GameData
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  // Extract variables from all fields
  const allText = `${promptText} ${responseFormat} ${customSystemRole}`;
  const variablePaths = extractVariablePaths(allText);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aggregatedData: Record<string, any> = {};

  for (const varPath of variablePaths) {
    // Check if any students have this variable in their player state data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const studentValues: { name: string; value: any }[] = [];

    for (const player of activePlayerData) {
      const playerStateData =
        gameData.playersGameStateData[String(player._id)] || {};
      const value = getValueByPath(playerStateData, varPath);

      if (value !== undefined && value !== null && value !== "") {
        studentValues.push({
          name: player.name,
          value: value,
        });
      }
    }

    // If students have this data, format it
    if (studentValues.length > 0) {
      let formattedValue = "Here are each students responses:\n";
      studentValues.forEach((sv) => {
        formattedValue += `${sv.name}: ${sv.value}\n`;
      });

      // Set the aggregated value using nested structure
      setValueByPath(aggregatedData, varPath, formattedValue.trim());
    } else {
      // No student data found, try global state
      const globalValue = getValueByPath(
        gameData.globalStateData.gameStateData,
        varPath
      );
      if (globalValue !== undefined) {
        setValueByPath(aggregatedData, varPath, globalValue);
      }
    }
  }

  // HACK: num_pumps must be pulled from the global state data since it should not be part of the player state data
  aggregatedData["num_pumps"] =
    gameData.globalStateData.gameStateData["num_pumps"] || 0;

  return aggregatedData;
}

// Helper to build student-specific state data for INDIVIDUALLY mode
function buildStudentStateData(
  playerId: string,
  gameData: GameData
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  const playerStateData = gameData.playersGameStateData[String(playerId)] || {};
  const globalStateData = gameData.globalStateData.gameStateData || {};

  // Merge with player data taking precedence over global data
  return {
    ...globalStateData,
    ...playerStateData,
  };
}
