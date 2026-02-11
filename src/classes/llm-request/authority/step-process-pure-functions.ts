/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

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
} from "./helpers/helpers";
import {
  CollectedDiscussionData,
  DiscussionStage,
  DiscussionStageStepType,
  PromptStageStep,
  RequestUserInputStageStep,
  SystemMessageStageStep,
} from "../../../schemas/models/DiscussionStage/types";
import { chatLogToString, isJsonString } from "./helpers/helpers";
import {
  GenericLlmRequest,
  JsonResponseData,
  PromptOutputTypes,
  PromptRoles,
  TargetAiModelServiceType,
} from "../types";
import {
  initializeResponseTracking,
  updatePlayerStateData,
} from "./pure-state-modifiers";
import {
  addPromptResponseToGameData,
  addSystemMessageToGameData,
  everyPlayerHasRespondedToStep,
  getGameDataCopy,
  getAllStepResponseTrackingFromGameState,
} from "./state-modifier-helpers";
import { getCurStageAndStep } from "./user-action-pure-functions";
import { GameData } from "../../../schemas/models/Room";
import {
  AiServicesResponseTypes,
  extractServiceStepResponse,
} from "../ai-services/ai-service-types";
import { syncLlmRequest } from "../llm-request";

export function startRequestUserInputStep(
  _gameData: GameData,
  curStep: RequestUserInputStageStep,
  sessionId: string
): GameData {
  let gameData = getGameDataCopy(_gameData);
  if (curStep.requireAllUserInputs) {
    gameData = initializeResponseTracking(gameData);
  }
  gameData = addSystemMessageToGameData(gameData, curStep.message, sessionId);
  return gameData;
}

export function processNewSystemMessageStep(
  _gameData: GameData,
  curStep: SystemMessageStageStep,
  sessionId: string
): GameData {
  let gameData = getGameDataCopy(_gameData);
  gameData = addSystemMessageToGameData(gameData, curStep.message, sessionId);
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
      curStep.jsonResponseData
    );
    llmRequest.responseFormat += recursivelyConvertExpectedDataToAiPromptString(
      recursiveUpdateAdditionalInfo(jsonResponseData, collectedDiscussionData)
    );
  }

  const requestFunction = async () => {
    const _response = await executePrompt(llmRequest);
    const response = extractServiceStepResponse(_response, 0);

    if (curStep.outputDataType === PromptOutputTypes.JSON) {
      if (!isJsonString(response)) {
        throw new Error(`Did not receive valid JSON data: ${response}`);
      }
      const jsonResponseData: JsonResponseData[] = JSON.parse(
        curStep.jsonResponseData
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
      const resData = JSON.parse(response);

      // aggregate the new JSON data
      gameData.globalStateData.discussionDataStringified = JSON.stringify({
        ...collectedDiscussionData,
        ...resData,
      });

      gameData = updatePlayerStateData(
        gameData,
        persistTruthFields,
        playerIdToUpdate,
        convertCollectedDataToGSData(resData)
      );
    } else {
      gameData = addPromptResponseToGameData(gameData, response, sessionId);
    }
  };

  await requestFunction();

  return gameData;
}

export async function processCurStep(
  _gameData: GameData,
  discussionStages: DiscussionStage[],
  setResponsePending: (pending: boolean) => void,
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
      setResponsePending(true);
      gameData = await processPromptStep(
        gameData,
        curStep,
        targetAiServiceModel,
        syncLlmRequest,
        gameData.persistTruthGlobalStateData,
        playerIdToUpdate,
        sessionId
      );
      setResponsePending(false);
      break;
    default:
      throw new Error(`Unknown step type: ${curStep}`);
  }
  return gameData;
}

function isRequestUserInputStepComplete(
  gameData: GameData,
  curStep: RequestUserInputStageStep
): boolean {
  const { allStepResponseTracking } =
    getAllStepResponseTrackingFromGameState(gameData);
  if (!curStep.requireAllUserInputs) {
    return true; // do not require all user inputs, so we assume the step is complete
  }
  const targetStepResponseTracking = allStepResponseTracking.find(
    (stepResponseTracking) => stepResponseTracking.stepId === curStep.stepId
  );
  if (!targetStepResponseTracking) {
    return false; // step response tracking not found, so the step is not complete
  }
  return everyPlayerHasRespondedToStep(targetStepResponseTracking);
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
