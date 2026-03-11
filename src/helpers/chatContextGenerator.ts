/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import { ChatMessage, GameData } from "../schemas/models/Room";
import { IncludeMessagesContextTypeEnum } from "../schemas/models/DiscussionStage/objects";
import { IncludeMessageContext } from "../schemas/models/DiscussionStage/types";

export function generateChatContext(
  gameData: GameData,
  currentUserId: string,
  isIndividualPrompt: boolean,
  includeMessageContext: IncludeMessageContext
): string {
  if (includeMessageContext.type === IncludeMessagesContextTypeEnum.NONE) {
    return "";
  }

  const fullChatLog = gameData.chat || [];

  console.log("fullChatLog", JSON.stringify(fullChatLog, null, 2));

  // Step 1: Filter by user if needed
  const userFilteredMessages = filterByUser(
    fullChatLog,
    currentUserId,
    includeMessageContext.includeMessagesFromOtherUsers,
    isIndividualPrompt
  );

  console.log(
    "userFilteredMessages",
    JSON.stringify(userFilteredMessages, null, 2)
  );

  // Step 2: Filter by type (ALL_MESSAGES, NUM_RECENT_MESSAGES, FROM_INPUT_STEPS)
  const typeFilteredMessages = filterByType(
    userFilteredMessages,
    includeMessageContext
  );

  console.log(
    "typeFilteredMessages",
    JSON.stringify(typeFilteredMessages, null, 2)
  );

  // Step 3: Format the filtered messages into a string
  return formatChatLog(typeFilteredMessages);
}

function filterByUser(
  messages: ChatMessage[],
  currentUserId: string,
  includeMessagesFromOtherUsers: boolean,
  isIndividualPrompt: boolean
): ChatMessage[] {
  // Only filter if this is an individual prompt AND we don't want other users' messages
  if (!isIndividualPrompt || includeMessagesFromOtherUsers) {
    return messages;
  }

  // Keep system messages and messages from current user
  return messages.filter(
    (msg) => msg.sender === "SYSTEM" || `${msg.senderId}` === `${currentUserId}`
  );
}

function filterByType(
  messages: ChatMessage[],
  includeMessageContext: IncludeMessageContext
): ChatMessage[] {
  const { type, stepIds = [] } = includeMessageContext;

  switch (type) {
    case IncludeMessagesContextTypeEnum.ALL_MESSAGES:
      // Include full chat log up to most recent 30 messages
      return messages.slice(-30);

    case IncludeMessagesContextTypeEnum.FROM_INPUT_STEPS:
      // Filter to specific input steps and their responses
      return filterByInputSteps(messages, stepIds);

    default:
      return [];
  }
}

function filterByInputSteps(
  messages: ChatMessage[],
  stepIds: string[]
): ChatMessage[] {
  const filtered: ChatMessage[] = [];
  let isIncluding = false;
  let hasSeenUserMessage = false;

  for (const message of messages) {
    if (message.sender === "SYSTEM") {
      // Check if this is a target system message
      if (message.fromStepId && stepIds.includes(message.fromStepId)) {
        // Start including from this message
        filtered.push(message);
        isIncluding = true;
        hasSeenUserMessage = false;
      } else if (isIncluding) {
        // This is a non-target system message
        if (hasSeenUserMessage) {
          // We've seen a user message and now another system message - stop including
          isIncluding = false;
          hasSeenUserMessage = false;
        } else {
          // We haven't seen a user message yet, so include this system message
          filtered.push(message);
        }
      }
    } else {
      // User message
      if (isIncluding) {
        filtered.push(message);
        hasSeenUserMessage = true;
      }
    }
  }

  return filtered;
}

function formatChatLog(messages: ChatMessage[]): string {
  if (messages.length === 0) {
    return "";
  }

  const sections: string[] = [];
  let currentQuestion = "";
  let currentResponses: string[] = [];

  for (const message of messages) {
    if (message.sender === "SYSTEM") {
      // If we have a previous question with responses, add it to sections
      if (currentQuestion && currentResponses.length > 0) {
        sections.push(
          formatQuestionResponsePair(
            currentQuestion,
            currentResponses,
            sections.length > 0
          )
        );
      }

      // Start a new question
      currentQuestion = message.message;
      currentResponses = [];
    } else {
      // User response - skip if no sender name
      if (!message.senderName) {
        continue;
      }
      currentResponses.push(`${message.senderName}: ${message.message}`);
    }
  }

  // Add the last question-response pair if it exists
  if (currentQuestion && currentResponses.length > 0) {
    sections.push(
      formatQuestionResponsePair(
        currentQuestion,
        currentResponses,
        sections.length > 0
      )
    );
  }

  return sections.join("\n\n");
}

export const questionPairPrefix = "The student(s) were asked this question:";
function formatQuestionResponsePair(
  question: string,
  responses: string[],
  isSubsequent: boolean
): string {
  const questionPrefix = isSubsequent
    ? "Then they were asked:"
    : questionPairPrefix;

  const responsesText = responses.join("\n");

  return `${questionPrefix} ${question}\nAnd these were their responses:\n${responsesText}`;
}
