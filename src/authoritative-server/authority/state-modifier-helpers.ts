/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import {
  AbstractGameData,
  MessageDisplayType,
  SenderType,
} from "../llm-request/types";
import { GameData } from "../../schemas/models/Room";

import * as crypto from "node:crypto"; // Use 'node:crypto' for ESM or require('crypto') for CommonJS
import { replaceStoredDataInString } from "./helpers/helpers";
import {
  DiscussionStageStep,
  DiscussionStageStepType,
} from "schemas/models/DiscussionStage/types";
import {
  updateDiscussionData,
  updateGlobalStateData,
} from "./pure-state-modifiers";

export function getGameDataCopy(gameData: GameData): GameData {
  return JSON.parse(JSON.stringify(gameData));
}

export function addSystemMessageToGameData(
  _gameData: GameData,
  newMessage: string,
  sessionId: string,
  fromStepId: string
): GameData {
  const gameData: GameData = getGameDataCopy(_gameData);
  const processMessageWithDiscussionData = replaceStoredDataInString(
    newMessage,
    JSON.parse(gameData.globalStateData.discussionDataStringified || "{}")
  );
  const gameStateDataAsRecord: Record<string, string> =
    gameData.globalStateData.gameStateData.reduce((acc, data) => {
      acc[data.key] = data.value;
      return acc;
    }, {} as Record<string, string>);
  const processedMessageWithGameStateData = replaceStoredDataInString(
    processMessageWithDiscussionData,
    gameStateDataAsRecord
  );
  gameData.chat.push({
    messageId: crypto.randomUUID(),
    sender: SenderType.SYSTEM,
    senderId: "",
    senderName: "",
    isPromptResponse: false,
    fromStepId: fromStepId,
    disableUserInput: false,
    mcqChoices: [],
    message: processedMessageWithGameStateData,
    sessionId: sessionId || "",
    displayType: MessageDisplayType.TEXT,
  });
  return gameData;
}

export function addUserMessageToChat(
  _gameData: GameData,
  curStep: DiscussionStageStep,
  newMessage: string,
  senderId: string,
  senderName: string,
  sessionId: string
): GameData {
  let gameData: GameData = getGameDataCopy(_gameData);

  // TODO: need to add the response to the global state data if save variable of the current step exists.
  if (
    curStep.stepType === DiscussionStageStepType.REQUEST_USER_INPUT &&
    curStep.saveResponseVariableName
  ) {
    gameData = updateDiscussionData(gameData, [
      { key: curStep.saveResponseVariableName, value: newMessage },
    ]);
  }
  gameData.chat.push({
    messageId: crypto.randomUUID(),
    sender: SenderType.PLAYER,
    senderId: senderId,
    senderName: senderName,
    isPromptResponse: false,
    fromStepId: "",
    disableUserInput: false,
    mcqChoices: [],
    message: newMessage,
    sessionId: sessionId || "",
    displayType: MessageDisplayType.TEXT,
  });
  return gameData;
}

export function addPromptResponseToGameData(
  _gameData: GameData,
  newMessage: string,
  sessionId: string
): GameData {
  const gameData: GameData = getGameDataCopy(_gameData);
  gameData.chat.push({
    messageId: crypto.randomUUID(),
    sender: SenderType.SYSTEM,
    senderId: "",
    senderName: "",
    fromStepId: "",
    disableUserInput: false,
    mcqChoices: [],
    message: newMessage,
    sessionId: sessionId || "",
    displayType: MessageDisplayType.TEXT,
    isPromptResponse: true,
  });
  return gameData;
}

export function evaluateCondition(
  stateValue: string | number | boolean | string[],
  operator: string,
  expectedValue: string
): boolean {
  if (
    typeof stateValue !== "string" &&
    typeof stateValue !== "number" &&
    typeof stateValue !== "boolean"
  ) {
    throw new Error(
      `Expected a string, number, or boolean for state value, but got ${typeof stateValue}`
    );
  }

  if (typeof stateValue === "string") {
    return comparisonOperators(operator, stateValue, expectedValue);
  }

  if (typeof stateValue === "number") {
    try {
      return comparisonOperators(operator, stateValue, Number(expectedValue));
    } catch (error) {
      throw new Error(
        `expectdValue should be a parsable number, but got ${expectedValue}`
      );
    }
  }

  if (typeof stateValue === "boolean") {
    if (expectedValue !== "true" && expectedValue !== "false") {
      throw new Error(
        `expectedValue should be 'true' or 'false', but got ${expectedValue}`
      );
    }
    return comparisonOperators(operator, stateValue, expectedValue === "true");
  }
  throw new Error(
    `Expected a string, number, or boolean for state value, but got ${typeof stateValue}`
  );
}

function comparisonOperators(
  operator: string,
  stateValue: string | number | boolean | string[],
  expectedValue: string | number | boolean | string[]
): boolean {
  switch (operator) {
    case "==":
      return stateValue === expectedValue;
    case "===":
      return stateValue === expectedValue;
    case "!=":
      return stateValue !== expectedValue;
    case "!==":
      return stateValue !== expectedValue;
    case ">":
      return stateValue > expectedValue;
    case "<":
      return stateValue < expectedValue;
    case ">=":
      return stateValue >= expectedValue;
    case "<=":
      return stateValue <= expectedValue;
    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
}
