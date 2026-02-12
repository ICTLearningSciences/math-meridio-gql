/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

/// <reference types="jest" />
import {
  JsonResponseDataType,
  MessageDisplayType,
  PromptOutputTypes,
  SenderType,
} from "../../llm-request/types";
import {
  startRequestUserInputStep,
  processNewSystemMessageStep,
  processConditionalStep,
  processPromptStep,
} from "../step-process-pure-functions";
import {
  RequestUserInputStageStep,
  SystemMessageStageStep,
  PromptStageStep,
  CollectedDiscussionData,
} from "../../../schemas/models/DiscussionStage/types";
import {
  createBaseGameData,
  createPromptStep,
  createRequestUserInputStep,
  createSystemMessageStep,
} from "./helpers";
import { PromptRoles, TargetAiModelServiceType } from "../../llm-request/types";
import * as helpers from "../helpers/helpers";
import { AiServicesResponseTypes } from "../../llm-request/ai-services/ai-service-types";

// Mock uuid
jest.mock("uuid", () => ({
  v4: jest.fn(() => "test-uuid-1234"),
}));

// Mock helper functions from discussion-stage-builder
jest.mock(
  "../../../../../src/classes/llm-request/authority/helpers/helpers.ts",
  () => ({
    replaceStoredDataInString: jest.fn((str: string) => str), // Default: no replacement
    convertCollectedDataToGSData: jest.fn((data: CollectedDiscussionData) => [
      { key: "test-key", value: JSON.stringify(data) },
    ]),
    receivedExpectedData: jest.fn(() => true),
    recursivelyConvertExpectedDataToAiPromptString: jest.fn(
      () => "\nExpected JSON structure"
    ),
    recursiveUpdateAdditionalInfo: jest.fn((data) => data),
    chatLogToString: jest.fn((chatLog: any[]) => "mock chat log"),
    isJsonString: jest.fn((str: string) => {
      try {
        JSON.parse(str);
        return true;
      } catch {
        return false;
      }
    }),
  })
);

// Helper to create mock AI service response
function createMockAiResponse(responseText: string): AiServicesResponseTypes {
  return {
    aiAllStepsData: [
      {
        aiServiceRequestParams: {
          model: "gpt-4",
          temperature: 0.5,
          input: [],
          max_output_tokens: 100,
          store: false,
        },
        aiServiceResponse: {
          id: "",
          created_at: 0,
          error: null,
          incomplete_details: null,
          instructions: null,
          output: [],
          parallel_tool_calls: false,
          temperature: 1,
          tool_choice: "none",
          tools: [],
          top_p: 1,
          metadata: null,
          model: "gpt-4",
          object: "response",
          output_text: responseText,
        },
      },
    ],
    answer: responseText,
  };
}

process.env.LLM_API_ENDPOINT = "test-value";

describe("step-process-pure-functions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("processNewSystemMessageStep", () => {
    it("should add a system message to the chat", () => {
      const gameData = createBaseGameData();
      const step: SystemMessageStageStep = createSystemMessageStep("step-1", {
        message: "Welcome to the game!",
      });

      const result = processNewSystemMessageStep(gameData, step, "session-1");

      expect(result.chat).toHaveLength(1);
      expect(result.chat[0].displayType).toEqual(MessageDisplayType.TEXT);
      expect(result.chat[0].sender).toEqual(SenderType.SYSTEM);
      expect(result.chat[0].message).toEqual("Welcome to the game!");
      expect(result.chat[0].sessionId).toEqual("session-1");
    });

    it("should not mutate the original gameData object", () => {
      const originalGameData = createBaseGameData();
      const step: SystemMessageStageStep = createSystemMessageStep("step-1", {
        message: "Test message",
      });

      const result = processNewSystemMessageStep(
        originalGameData,
        step,
        "session-1"
      );

      expect(result.chat.length).toBe(1);
      expect(originalGameData.chat.length).toBe(0);
    });
  });

  describe("processConditionalStep", () => {
    it("should return a copy of gameData without modification", () => {
      const gameData = createBaseGameData();
      const result = processConditionalStep(gameData);

      expect(result).toEqual(gameData);
      expect(result).not.toBe(gameData); // Different object reference
    });

    it("should not mutate the original gameData object", () => {
      const originalGameData = createBaseGameData();
      const originalChatLength = originalGameData.chat.length;

      const result = processConditionalStep(originalGameData);

      expect(originalGameData.chat.length).toBe(originalChatLength);
      expect(result).not.toBe(originalGameData);
    });
  });

  describe("processPromptStep", () => {
    const mockTargetAiModel: TargetAiModelServiceType = {
      serviceName: "OPEN_AI",
      model: "gpt-4",
    };

    it("should process TEXT output type and add response to chat", async () => {
      const gameData = createBaseGameData();
      gameData.globalStateData.discussionData = {};

      const step: PromptStageStep = createPromptStep("step-1", {
        promptText: "Generate a response",
        lastStep: false,
      });

      const mockExecutePrompt = jest
        .fn()
        .mockResolvedValue(createMockAiResponse("This is the AI response"));

      const result = await processPromptStep(
        gameData,
        step,
        mockTargetAiModel,
        mockExecutePrompt,
        [],
        "player1",
        "session-1"
      );

      expect(mockExecutePrompt).toHaveBeenCalled();
      expect(result.chat).toHaveLength(1);
      expect(result.chat[0].sender).toBe(SenderType.SYSTEM);
      expect(result.chat[0].message).toBe("This is the AI response");
    });

    it("should process JSON output type and update discussionData", async () => {
      const gameData = createBaseGameData();
      gameData.globalStateData.discussionData = {
        existingKey: "existingValue",
      };

      const step: PromptStageStep = createPromptStep("step-1", {
        promptText: "Generate JSON data",
        responseFormat: "Return JSON",
        outputDataType: PromptOutputTypes.JSON,
      });

      const jsonResponse = JSON.stringify({
        newKey: "newValue",
        anotherKey: 42,
      });

      const mockExecutePrompt = jest
        .fn()
        .mockResolvedValue(createMockAiResponse(jsonResponse));

      const result = await processPromptStep(
        gameData,
        step,
        mockTargetAiModel,
        mockExecutePrompt,
        [],
        "player1",
        "session-1"
      );

      const parsedData = result.globalStateData.discussionData;
      expect(parsedData).toEqual({
        existingKey: "existingValue",
        newKey: "newValue",
        anotherKey: 42,
      });
    });

    it("should include chat log context in prompts when includeChatLogContext is true", async () => {
      const gameData = createBaseGameData();
      gameData.globalStateData.discussionData = {};
      gameData.chat = [
        {
          messageId: "msg-1",
          sender: SenderType.PLAYER,
          message: "Hello",
          sessionId: "session-1",
          senderId: "player1",
          senderName: "Player 1",
          displayType: MessageDisplayType.TEXT,
          disableUserInput: false,
          mcqChoices: [],
        },
        {
          messageId: "msg-2",
          sender: SenderType.SYSTEM,
          message: "Hi there",
          sessionId: "session-1",
          senderId: "system",
          senderName: "System",
          displayType: MessageDisplayType.TEXT,
          disableUserInput: false,
          mcqChoices: [],
        },
      ];

      const step: PromptStageStep = createPromptStep("step-1", {
        promptText: "Analyze the conversation",
        includeChatLogContext: true,
      });

      const mockExecutePrompt = jest
        .fn()
        .mockResolvedValue(createMockAiResponse("Analysis complete"));

      await processPromptStep(
        gameData,
        step,
        mockTargetAiModel,
        mockExecutePrompt,
        [],
        "player1",
        "session-1"
      );

      expect(mockExecutePrompt).toHaveBeenCalled();
      const callArgs = mockExecutePrompt.mock.calls[0][0];
      expect(callArgs.prompts).toHaveLength(2);
      expect(callArgs.prompts[0].promptText).toContain(
        "Current state of chat log"
      );
      expect(callArgs.prompts[0].promptRole).toBe(PromptRoles.SYSTEM);
      expect(callArgs.prompts[1].promptText).toBe("Analyze the conversation");
    });

    it("should replace stored data in promptText, responseFormat, and customSystemRole", async () => {
      (helpers.replaceStoredDataInString as jest.Mock).mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (str: string, data: Record<string, any>) => {
          if (str.includes("{{userName}}")) {
            return str.replace("{{userName}}", data.userName);
          }
          return str;
        }
      );

      const gameData = createBaseGameData();
      gameData.globalStateData.discussionData = {
        userName: "John",
      };

      const step: PromptStageStep = createPromptStep("step-1", {
        promptText: "Hello {{userName}}",
        responseFormat: "Format for {{userName}}",
        customSystemRole: "You are helping {{userName}}",
      });

      const mockExecutePrompt = jest
        .fn()
        .mockResolvedValue(createMockAiResponse("Response"));

      await processPromptStep(
        gameData,
        step,
        mockTargetAiModel,
        mockExecutePrompt,
        [],
        "player1",
        "session-1"
      );

      expect(helpers.replaceStoredDataInString).toHaveBeenCalledWith(
        "Hello {{userName}}",
        { userName: "John" }
      );
      expect(helpers.replaceStoredDataInString).toHaveBeenCalledWith(
        "Format for {{userName}}",
        { userName: "John" }
      );
      expect(helpers.replaceStoredDataInString).toHaveBeenCalledWith(
        "You are helping {{userName}}",
        { userName: "John" }
      );
    });

    it("should update player state data with JSON response data", async () => {
      (helpers.convertCollectedDataToGSData as jest.Mock).mockReturnValue([
        { key: "playerScore", value: "100" },
      ]);

      const gameData = createBaseGameData();
      gameData.globalStateData.discussionData = {};

      const step: PromptStageStep = createPromptStep("step-1", {
        promptText: "Calculate score",
        responseFormat: "",
        outputDataType: PromptOutputTypes.JSON,
      });

      const jsonResponse = JSON.stringify({ score: 100 });
      const mockExecutePrompt = jest
        .fn()
        .mockResolvedValue(createMockAiResponse(jsonResponse));

      const result = await processPromptStep(
        gameData,
        step,
        mockTargetAiModel,
        mockExecutePrompt,
        [],
        "player1",
        "session-1"
      );

      expect(helpers.convertCollectedDataToGSData).toHaveBeenCalledWith({
        score: 100,
      });
      const player1Data = result.playerStateData.find(
        (p) => p.player === "player1"
      );
      expect(player1Data?.gameStateData).toContainEqual({
        key: "playerScore",
        value: "100",
      });
    });

    it("should include jsonResponseData in response format when provided", async () => {
      (
        helpers.recursivelyConvertExpectedDataToAiPromptString as jest.Mock
      ).mockReturnValue('\nExpected: { "name": "string", "age": "number" }');

      const gameData = createBaseGameData();
      gameData.globalStateData.discussionData = {};

      const step: PromptStageStep = createPromptStep("step-1", {
        promptText: "Get user info",
        responseFormat: "Return user data as JSON:",
        outputDataType: PromptOutputTypes.JSON,
        jsonResponseData: JSON.stringify([
          {
            clientId: "field-1",
            name: "userName",
            type: JsonResponseDataType.STRING,
            isRequired: true,
          },
          {
            clientId: "field-2",
            name: "userAge",
            type: JsonResponseDataType.STRING,
            isRequired: true,
          },
        ]),
      });

      const jsonResponse = JSON.stringify({ userName: "John", userAge: 25 });
      const mockExecutePrompt = jest
        .fn()
        .mockResolvedValue(createMockAiResponse(jsonResponse));

      await processPromptStep(
        gameData,
        step,
        mockTargetAiModel,
        mockExecutePrompt,
        [],
        "player1",
        "session-1"
      );

      expect(
        helpers.recursivelyConvertExpectedDataToAiPromptString
      ).toHaveBeenCalled();
      const callArgs = mockExecutePrompt.mock.calls[0][0];
      expect(callArgs.responseFormat).toContain("Return user data as JSON:");
      expect(callArgs.responseFormat).toContain(
        'Expected: { "name": "string", "age": "number" }'
      );
    });

    it("should throw error when JSON output type receives invalid JSON", async () => {
      const gameData = createBaseGameData();
      gameData.globalStateData.discussionData = {};

      const step: PromptStageStep = createPromptStep("step-1", {
        promptText: "Generate JSON",
        outputDataType: PromptOutputTypes.JSON,
      });

      const mockExecutePrompt = jest
        .fn()
        .mockResolvedValue(createMockAiResponse("This is not valid JSON"));

      await expect(
        processPromptStep(
          gameData,
          step,
          mockTargetAiModel,
          mockExecutePrompt,
          [],
          "player1",
          "session-1"
        )
      ).rejects.toThrow("Did not receive valid JSON data");
    });

    it("should throw error when JSON response does not match expected data structure", async () => {
      (helpers.receivedExpectedData as jest.Mock).mockReturnValue(false);

      const gameData = createBaseGameData();
      gameData.globalStateData.discussionData = {};

      const step: PromptStageStep = createPromptStep("step-1", {
        promptText: "Generate JSON",
        outputDataType: PromptOutputTypes.JSON,
        jsonResponseData: JSON.stringify([
          {
            clientId: "field-1",
            name: "requiredField",
            type: JsonResponseDataType.STRING,
            isRequired: true,
          },
        ]),
      });

      const jsonResponse = JSON.stringify({ wrongField: "value" });
      const mockExecutePrompt = jest
        .fn()
        .mockResolvedValue(createMockAiResponse(jsonResponse));

      await expect(
        processPromptStep(
          gameData,
          step,
          mockTargetAiModel,
          mockExecutePrompt,
          [],
          "player1",
          "session-1"
        )
      ).rejects.toThrow("Did not receive expected JSON data");
    });

    it("should not mutate the original gameData object", async () => {
      const originalGameData = createBaseGameData();
      originalGameData.globalStateData.discussionData = {};
      const originalChatLength = originalGameData.chat.length;

      const step: PromptStageStep = createPromptStep("step-1", {
        promptText: "Test",
        outputDataType: PromptOutputTypes.TEXT,
      });

      const mockExecutePrompt = jest
        .fn()
        .mockResolvedValue(createMockAiResponse("Response"));

      const result = await processPromptStep(
        originalGameData,
        step,
        mockTargetAiModel,
        mockExecutePrompt,
        [],
        "player1",
        "session-1"
      );

      expect(result.chat.length).toBeGreaterThan(originalChatLength);
      expect(originalGameData.chat.length).toBe(originalChatLength);
    });

    it("should handle persistTruthFields correctly when updating player state", async () => {
      const gameData = createBaseGameData();
      gameData.globalStateData.discussionData = {};
      // Pre-populate player with a truth field
      gameData.playerStateData[0].gameStateData.push({
        key: "hasCompletedIntro",
        value: "true",
      });

      const step: PromptStageStep = createPromptStep("step-1", {
        promptText: "Update status",
        outputDataType: PromptOutputTypes.JSON,
      });

      const jsonResponse = JSON.stringify({ hasCompletedIntro: false });
      const mockExecutePrompt = jest
        .fn()
        .mockResolvedValue(createMockAiResponse(jsonResponse));

      const result = await processPromptStep(
        gameData,
        step,
        mockTargetAiModel,
        mockExecutePrompt,
        ["hasCompletedIntro"], // This field should persist as true
        "player1",
        "session-1"
      );

      const player1Data = result.playerStateData.find(
        (p) => p.player === "player1"
      );
      const truthField = player1Data?.gameStateData.find(
        (d) => d.key === "hasCompletedIntro"
      );
      // Should remain 'true' because it's in persistTruthFields
      expect(truthField?.value).toBe("true");
    });
  });
});
