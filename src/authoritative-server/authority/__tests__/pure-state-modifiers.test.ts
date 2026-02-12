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

/// <reference types="jest" />
import { GameData } from "../../../schemas/models/Room";
import { addSystemMessageToChat } from "../state-modifier-helpers";
import { createBaseGameData } from "./helpers";
import { MessageDisplayType, SenderType } from "../../llm-request/types";

// Mock uuid
jest.mock("uuid", () => ({
  v4: jest.fn(() => "test-uuid-1234"),
}));

describe("pure-state-modifiers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("addSystemMessageToChat", () => {
    it("should add a system message to the chat with sessionId", () => {
      const mockSessionId = "test-session-123";

      const gameData: GameData = createBaseGameData();

      const message = "Test system message";
      const result = addSystemMessageToChat(
        gameData,
        message,
        mockSessionId,
        "step-1"
      );

      expect(result.chat).toHaveLength(1);
      expect(result.chat[0].sessionId).toEqual(mockSessionId);
    });

    it("should add system message with empty sessionId when sessionId is not provided", () => {
      const gameData: GameData = createBaseGameData();

      const message = "Test message without session";
      const result = addSystemMessageToChat(gameData, message, "", "");

      expect(result.chat).toHaveLength(1);
      expect(result.chat[0].sessionId).toBe("");
    });

    it("should append to existing chat messages", () => {
      const gameData: GameData = {
        chat: [
          {
            messageId: "existing-msg-1",
            sender: SenderType.PLAYER,
            message: "Existing message",
            sessionId: "session-456",
            senderId: "player1",
            senderName: "Player 1",
            displayType: MessageDisplayType.TEXT,
            disableUserInput: false,
            mcqChoices: [],
          },
        ],
        players: [],
        gameId: "basketball",
        playerStateData: [],
        persistTruthGlobalStateData: [],
        globalStateData: {
          curStageId: "stage1",
          roomOwnerId: "test-room-owner-id",
          curStepId: "step1",
          discussionData: {},
          gameStateData: [],
        },
      };

      const message = "New system message";
      const result = addSystemMessageToChat(
        gameData,
        message,
        "session-456",
        "step-1"
      );

      expect(result.chat).toHaveLength(2);
      expect(result.chat[0].messageId).toBe("existing-msg-1");
      expect(result.chat[1].sender).toBe(SenderType.SYSTEM);
      expect(result.chat[1].message).toBe("New system message");
    });

    it("should not mutate the original gameData object", () => {
      const originalGameData: GameData = createBaseGameData();
      const message = "New system message";

      const updatedGameData = addSystemMessageToChat(
        originalGameData,
        message,
        "session-456",
        "step-1"
      );

      expect(updatedGameData.chat.length).toBeGreaterThan(0);
      expect(originalGameData.chat.length).toBe(0);
    });
  });
});
