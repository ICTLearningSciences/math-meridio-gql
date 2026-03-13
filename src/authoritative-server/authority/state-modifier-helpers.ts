/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import { MessageDisplayType, SenderType } from "../llm-request/types";
import { ChatMessage, GameData } from "../../schemas/models/Room";

import * as crypto from "node:crypto"; // Use 'node:crypto' for ESM or require('crypto') for CommonJS
import { replaceStoredDataInString } from "./helpers/helpers";
import { DiscussionStageStepType } from "../../schemas/models/DiscussionStage/types";

export function getGameDataCopy(gameData: GameData): GameData {
  return JSON.parse(JSON.stringify(gameData));
}

export function buildSystemMessage(
  _gameData: GameData,
  newMessage: string,
  sessionId: string,
  fromStepId: string,
  fromStepType: DiscussionStageStepType
): ChatMessage {
  const gameData: GameData = getGameDataCopy(_gameData);
  const processMessageWithDiscussionData = replaceStoredDataInString(
    newMessage,
    gameData.globalStateData.discussionData || {}
  );
  const processedMessageWithGameStateData = replaceStoredDataInString(
    processMessageWithDiscussionData,
    gameData.globalStateData.gameStateData || {}
  );
  return {
    messageId: crypto.randomUUID(),
    sender: SenderType.SYSTEM,
    senderId: "",
    senderName: "",
    fromStepId: fromStepId,
    fromStepType: fromStepType,
    disableUserInput: false,
    mcqChoices: [],
    message: processedMessageWithGameStateData,
    sessionId: sessionId || "",
    displayType: MessageDisplayType.TEXT,
  };
}

export function buildUserMessage(
  newMessage: string,
  senderId: string,
  senderName: string,
  sessionId: string
): ChatMessage {
  return {
    messageId: crypto.randomUUID(),
    sender: SenderType.PLAYER,
    senderId: senderId,
    senderName: senderName,
    fromStepId: "",
    fromStepType: DiscussionStageStepType.SYSTEM_MESSAGE,
    disableUserInput: false,
    mcqChoices: [],
    message: newMessage,
    sessionId: sessionId || "",
    displayType: MessageDisplayType.TEXT,
  };
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
