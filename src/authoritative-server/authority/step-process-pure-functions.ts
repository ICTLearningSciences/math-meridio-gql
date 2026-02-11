/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import { CancelToken } from "axios";
import {
  convertCollectedDataToGSData,
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
  DiscussionStageStep,
  DiscussionStageStepType,
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
  updateGameDataWithNextStep,
  updateGlobalStateData,
  updatePlayerStateData,
} from "./pure-state-modifiers";
import {
  addSystemMessageToChat,
  getGameDataCopy,
} from "./state-modifier-helpers";
import { getCurStageAndStep } from "./user-action-pure-functions";
import { GameData } from "../../schemas/models/Room";
import {
  AiServicesResponseTypes,
  extractServiceStepResponse,
} from "../llm-request/ai-services/ai-service-types";
import { syncLlmRequest } from "../llm-request/llm-request";
import { getGameById } from "authoritative-server/games/game-helpers";

export function startRequestUserInputStep(
  _gameData: GameData,
  curStep: RequestUserInputStageStep,
  sessionId: string
): GameData {
  let gameData = getGameDataCopy(_gameData);
  gameData = addSystemMessageToChat(
    gameData,
    curStep.message,
    sessionId,
    curStep.stepId
  );
  return gameData;
}

export function processNewSystemMessageStep(
  _gameData: GameData,
  curStep: SystemMessageStageStep,
  sessionId: string
): GameData {
  let gameData = getGameDataCopy(_gameData);
  gameData = addSystemMessageToChat(
    gameData,
    curStep.message,
    sessionId,
    curStep.stepId
  );
  return gameData;
}

export function processConditionalStep(_gameData: GameData): GameData {
  // Non-op. Conditionals are evaluated when determining the next step.
  return getGameDataCopy(_gameData);
}

export async function processPromptStep(
  _gameData: GameData,
  curStep: PromptStageStep,
  targetAiServiceModel: TargetAiModelServiceType,
  executePrompt: (
    llmRequest: GenericLlmRequest,
    cancelToken?: CancelToken
  ) => Promise<AiServicesResponseTypes>,
  persistTruthFields: string[],
  playerIdToUpdate: string,
  sessionId: string
): Promise<GameData> {
  console.log(`Starting to process prompt step: ${curStep.stepId}`);
  let gameData = getGameDataCopy(_gameData);
  const collectedDiscussionData: CollectedDiscussionData = JSON.parse(
    gameData.globalStateData.discussionDataStringified
  );
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

      // Add new JSON data to the discussion data
      gameData.globalStateData.discussionDataStringified = JSON.stringify({
        ...collectedDiscussionData,
        ...resData,
      });

      // Add new JSON data to the global state data
      gameData = updateGlobalStateData(
        gameData,
        persistTruthFields,
        Object.entries(resData).map(([key, value]) => ({ key, value }))
      );

      // Add new JSON data to the player state data
      gameData = updatePlayerStateData(
        gameData,
        persistTruthFields,
        playerIdToUpdate,
        convertCollectedDataToGSData(resData)
      );
    } else {
      // Add the prompt text response to the chat log
      gameData = addSystemMessageToChat(
        gameData,
        response,
        sessionId,
        curStep.stepId,
      );
    }
  };

  await requestFunction();

  return gameData;
}

export async function processCurStep(
  _gameData: GameData,
  discussionStages: DiscussionStage[],
  targetAiServiceModel: TargetAiModelServiceType,
  playerIdToUpdate: string,
  sessionId: string
): Promise<GameData> {
  let gameData = getGameDataCopy(_gameData);
  const { curStep } = getCurStageAndStep(gameData, discussionStages);
  switch (curStep.stepType) {
    case DiscussionStageStepType.REQUEST_USER_INPUT:
      gameData = startRequestUserInputStep(gameData, curStep, sessionId);
      break;
    case DiscussionStageStepType.SYSTEM_MESSAGE:
      gameData = processNewSystemMessageStep(gameData, curStep, sessionId);
      break;
    case DiscussionStageStepType.CONDITIONAL:
      gameData = processConditionalStep(gameData);
      break;
    case DiscussionStageStepType.PROMPT:
      gameData = await processPromptStep(
        gameData,
        curStep,
        targetAiServiceModel,
        syncLlmRequest,
        gameData.persistTruthGlobalStateData,
        playerIdToUpdate,
        sessionId
      );
      break;
    default:
      throw new Error(`Unknown step type: ${curStep}`);
  }
  return gameData;
}

export function isRequestUserInputStepComplete(
  _gameData: GameData,
  curStep: RequestUserInputStageStep
): boolean {
  // Just check the chat log for the messages that came after the request user input step.
  const gameData = getGameDataCopy(_gameData);
  let mostRecentSystemMessageIdx = -1;
  let mostRecentUserMessageIdx = -1;

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

  // If no system message was found, then the step is not complete.
  if (mostRecentSystemMessageIdx === -1) {
    return false;
  }

  if (curStep.requireAllUserInputs) {
    // Require all user inputs, so we check that every player provided a response AFTER the user inputs system message.
    const playerIds = gameData.playerStateData.map((player) => player.player);
    const messagesAfterInputStepMessage = gameData.chat.slice(
      mostRecentSystemMessageIdx + 1
    );
    const userMessagesAfterInputStepMessage =
      messagesAfterInputStepMessage.filter(
        (msg) => msg.sender === SenderType.PLAYER
      );
    return playerIds.every((playerId) =>
      userMessagesAfterInputStepMessage.some((msg) => msg.senderId === playerId)
    );
  } else {
    // Do not require all user inputs, so we check that the users message came after the most recent system message.
    return mostRecentUserMessageIdx > mostRecentSystemMessageIdx;
  }
}

export async function isDiscussionStageStepComplete(
  _gameData: GameData,
  discussionStages: DiscussionStage[]
): Promise<boolean> {
  const gameData = getGameDataCopy(_gameData);
  const { curStep } = getCurStageAndStep(gameData, discussionStages);
  switch (curStep.stepType) {
    case DiscussionStageStepType.REQUEST_USER_INPUT:
      return isRequestUserInputStepComplete(gameData, curStep);
    case DiscussionStageStepType.SYSTEM_MESSAGE:
      return true;
    case DiscussionStageStepType.CONDITIONAL:
      return true;
    case DiscussionStageStepType.PROMPT:
      return true;
    default:
      throw new Error(`Unknown step type: ${curStep}`);
  }
}

export async function isSimulationStageComplete(
  _gameData: GameData
): Promise<boolean> {
  const gameData = getGameDataCopy(_gameData);
  // Check that atleast 1 player has viewed the simulation for this stage.
  const simulationViewedKey = getSimulationViewedKey(
    gameData.globalStateData.curStageId
  );
  return gameData.playerStateData.some((player) =>
    player.gameStateData.some((data) => {
      if (data.key !== simulationViewedKey) {
        return false;
      }
      if (typeof data.value === "boolean") {
        return data.value;
      } else if (typeof data.value === "string") {
        return data.value === "true" || data.value === "True";
      } else {
        return false;
      }
    })
  );
}

/**
 * Goes to the next step and continues processing steps until we reach the next request user input step.
 * This means we process prompts, system messages, and conditionals until we reach the next request user input step, of which will still have its message added to the chat.
 */
export async function processStepsUntilNextRequestUserInputStep(
  _gameData: GameData,
  discussionStages: DiscussionStage[],
  targetAiServiceModel: TargetAiModelServiceType,
  playerIdToUpdate: string,
  sessionId: string
): Promise<GameData> {
  let gameData = getGameDataCopy(_gameData);
  let stepAndStage = getCurStageAndStep(gameData, discussionStages);
  const curGame = getGameById(gameData.gameId, discussionStages);

  do {
    const curStage = curGame.stageList.find(
      (stage) => stage.stage.clientId === gameData.globalStateData.curStageId
    );
    gameData = updateGameDataWithNextStep(
      gameData,
      curStage,
      stepAndStage.curStep
    );
    stepAndStage = getCurStageAndStep(gameData, discussionStages);
    console.log(
      `current stage: ${JSON.stringify(stepAndStage.curStage.title)} : ${
        stepAndStage.curStage.clientId
      }`
    );
    console.log(
      `processing ${stepAndStage.curStep.stepType} step: ${stepAndStage.curStep.stepId}`
    );
    gameData = await processCurStep(
      gameData,
      discussionStages,
      targetAiServiceModel,
      playerIdToUpdate,
      sessionId
    );
  } while (
    stepAndStage.curStep.stepType !== DiscussionStageStepType.REQUEST_USER_INPUT
  );
  return gameData;
}
