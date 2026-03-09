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
} from "../../authoritative-server/llm-request/types";
import { CancelToken } from "axios";
import {
  PromptStageStep,
  PromptConfiguration,
} from "../../schemas/models/DiscussionStage/types";
import { Player, PlayerDocument } from "../../schemas/models/Player";
import { GameData } from "../../schemas/models/Room";
import {
  replaceStoredDataInString,
  chatLogToString,
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
import { ProcessPromptAs } from "../../schemas/models/DiscussionStage/objects";

export async function processPromptStep(
  gameData: GameData,
  curStep: PromptStageStep,
  targetAiServiceModel: TargetAiModelServiceType,
  executePrompt: (
    llmRequest: GenericLlmRequest,
    cancelToken?: CancelToken
  ) => Promise<AiServicesResponseTypes>,
  playerIdToUpdate: string,
  sessionId: string,
  activePlayerData: PlayerDocument[]
): Promise<AtomicRoomModiticationAction[]> {
  // Execute all prompts in parallel
  const promptResults = await Promise.all(
    curStep.prompts.map(async (promptConfig) => {
      // Check if we should process as GROUP or INDIVIDUALLY
      if (promptConfig.processPromptAs === ProcessPromptAs.GROUP) {
        return processGroupPrompt(
          promptConfig,
          gameData,
          curStep,
          targetAiServiceModel,
          executePrompt,
          sessionId,
          activePlayerData
        );
      } else {
        return processIndividualPrompts(
          promptConfig,
          gameData,
          curStep,
          targetAiServiceModel,
          executePrompt,
          sessionId,
          activePlayerData
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
  gameData: GameData,
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

  if (promptConfig.includeChatLogContext) {
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

  return atomicRoomModificationActions;
}

// Process prompts in INDIVIDUALLY mode (one per student, in parallel)
async function processIndividualPrompts(
  promptConfig: PromptConfiguration,
  gameData: GameData,
  curStep: PromptStageStep,
  targetAiServiceModel: TargetAiModelServiceType,
  executePrompt: (
    llmRequest: GenericLlmRequest,
    cancelToken?: CancelToken
  ) => Promise<AiServicesResponseTypes>,
  sessionId: string,
  activePlayerData: PlayerDocument[]
): Promise<AtomicRoomModiticationAction[]> {
  // Process each student individually in parallel
  const individualResults = await Promise.all(
    activePlayerData.map(async (player) => {
      return processSingleStudentPrompt(
        promptConfig,
        player,
        gameData,
        curStep,
        targetAiServiceModel,
        executePrompt,
        sessionId
      );
    })
  );

  // Flatten and return all actions
  return individualResults.flat();
}

// Process a single student's prompt in INDIVIDUALLY mode
async function processSingleStudentPrompt(
  promptConfig: PromptConfiguration,
  player: PlayerDocument,
  gameData: GameData,
  curStep: PromptStageStep,
  targetAiServiceModel: TargetAiModelServiceType,
  executePrompt: (
    llmRequest: GenericLlmRequest,
    cancelToken?: CancelToken
  ) => Promise<AiServicesResponseTypes>,
  sessionId: string
): Promise<AtomicRoomModiticationAction[]> {
  const playerActions: AtomicRoomModiticationAction[] = [];

  // Build student-specific state data (player data takes precedence over global)
  const studentStateData = buildStudentStateData(player._id, gameData);

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
        playerId: player._id,
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
        curStep.stepId
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
      const playerStateData = gameData.playersGameStateData[player._id] || {};
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

  return aggregatedData;
}

// Helper to build student-specific state data for INDIVIDUALLY mode
function buildStudentStateData(
  playerId: string,
  gameData: GameData
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  const playerStateData = gameData.playersGameStateData[playerId] || {};
  const globalStateData = gameData.globalStateData.gameStateData || {};

  // Merge with player data taking precedence over global data
  return {
    ...globalStateData,
    ...playerStateData,
  };
}
