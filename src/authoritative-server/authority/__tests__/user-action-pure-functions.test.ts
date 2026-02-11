/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
/// <reference types="jest" />
import {
  processPlayerSentMessageAction,
  processPlayerLeavesRoomAction,
  processActionUpdatePlayerStateDataAction,
} from "../user-action-pure-functions";
import { RoomActionQueueDocument } from "../../../schemas/models/RoomActionQueue";
import {
  RequestUserInputStageStep,
  SystemMessageStageStep,
} from "../../../schemas/models/DiscussionStage/types";
import {
  createBaseGameData,
  createMockPlayer,
  createRequestUserInputStep,
  createSystemMessageStep,
} from "./helpers";
import { RoomActionType, SenderType } from "../../llm-request/types";

describe("user-action-pure-functions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("processPlayerSentMessageAction", () => {
    it("should add user message to chat and record player response for the step", () => {
      const gameData = createBaseGameData();
      const step: RequestUserInputStageStep = createRequestUserInputStep(
        "step-1",
        {
          message: "Please provide input",
          saveResponseVariableName: "userResponse",
          requireAllUserInputs: true,
        }
      );
      const action: RoomActionQueueDocument = {
        roomId: "room-1",
        playerId: "player1",
        actionType: RoomActionType.SEND_MESSAGE,
        payload: "Hello, this is my response",
        actionSentAt: new Date(),
        processedAt: null,
      } as any as RoomActionQueueDocument;

      const sendingPlayer = createMockPlayer("player1", "Player 1");
      const sessionId = "session-1";

      const result = processPlayerSentMessageAction(
        gameData,
        step,
        action,
        sendingPlayer,
        sessionId
      );

      // Should have message in chat
      const userMessage = result.chat.find(
        (msg) => msg.message === "Hello, this is my response"
      );
      expect(userMessage).toBeDefined();
      expect(userMessage?.sender).toBe(SenderType.PLAYER);
      expect(userMessage?.senderId).toBe(sendingPlayer._id);
      expect(userMessage?.senderName).toBe("Player 1");

      // Should have recorded player response for step
      const trackingItem = result.globalStateData.gameStateData.find(
        (item) => item.key === "stepResponseTracking"
      );
      expect(trackingItem).toBeDefined();
    });

    it("should update global/player state data and sync truth data when step is REQUEST_USER_INPUT with saveResponseVariableName", () => {
      const gameData = createBaseGameData();
      gameData.persistTruthGlobalStateData = ["persistThis"];

      const step: RequestUserInputStageStep = createRequestUserInputStep(
        "step-1",
        {
          message: "Please provide input",
          saveResponseVariableName: "userAnswer",
        }
      );
      const action: RoomActionQueueDocument = {
        _id: "action-1",
        roomId: "room-1",
        playerId: "player1",
        actionType: RoomActionType.SEND_MESSAGE,
        payload: "My answer is 42",
        actionSentAt: new Date(),
        processedAt: null,
      } as any as RoomActionQueueDocument;
      const sendingPlayer = createMockPlayer("player1", "Player 1");
      const sessionId = "session-1";

      const result = processPlayerSentMessageAction(
        gameData,
        step,
        action,
        sendingPlayer,
        sessionId
      );

      // Should have updated global state with saveResponseVariableName
      const globalStateItem = result.globalStateData.gameStateData.find(
        (item) => item.key === "userAnswer"
      );
      expect(globalStateItem).toBeDefined();
      expect(globalStateItem?.value).toBe("My answer is 42");

      // Should have updated player state
      const player1State = result.playerStateData.find(
        (ps) => ps.player === "player1"
      );
      const playerStateItem = player1State?.gameStateData.find(
        (item) => item.key === "userAnswer"
      );
      expect(playerStateItem).toBeDefined();
      expect(playerStateItem?.value).toBe("My answer is 42");

      // All players should have global state keys synced
      for (const playerState of result.playerStateData) {
        const hasUserAnswer = playerState.gameStateData.find(
          (item) => item.key === "userAnswer"
        );
        expect(hasUserAnswer).toBeDefined();
      }
    });

    it("should not update state data when step is not REQUEST_USER_INPUT or has no saveResponseVariableName", () => {
      const gameData = createBaseGameData();

      // Test with SYSTEM_MESSAGE step (not REQUEST_USER_INPUT)
      const systemStep: SystemMessageStageStep = createSystemMessageStep(
        "step-1",
        {
          message: "System message",
        }
      );
      const action: RoomActionQueueDocument = {
        _id: "action-1",
        roomId: "room-1",
        playerId: "player1",
        actionType: RoomActionType.SEND_MESSAGE,
        payload: "Some response",
        actionSentAt: new Date(),
        processedAt: null,
      } as any as RoomActionQueueDocument;

      const sendingPlayer = createMockPlayer("player1", "Player 1");
      const sessionId = "session-1";

      const result1 = processPlayerSentMessageAction(
        gameData,
        systemStep,
        action,
        sendingPlayer,
        sessionId
      );

      // Should not have added any state data beyond response tracking
      const stateDataKeys = result1.globalStateData.gameStateData
        .map((item) => item.key)
        .filter((key) => key !== "stepResponseTracking");
      expect(stateDataKeys.length).toBe(0);

      // Test with REQUEST_USER_INPUT but no saveResponseVariableName
      const stepNoSave: RequestUserInputStageStep = createRequestUserInputStep(
        "step-2",
        {
          message: "Input please",
          saveResponseVariableName: "", // Empty string
        }
      );

      const result2 = processPlayerSentMessageAction(
        gameData,
        stepNoSave,
        action,
        sendingPlayer,
        sessionId
      );

      // Should not have added state data beyond response tracking
      const stateDataKeys2 = result2.globalStateData.gameStateData
        .map((item) => item.key)
        .filter((key) => key !== "stepResponseTracking");
      expect(stateDataKeys2.length).toBe(0);
    });

    it("should throw error when action type is invalid", () => {
      const gameData = createBaseGameData();
      const step: RequestUserInputStageStep = createRequestUserInputStep(
        "step-1",
        {
          message: "Input",
          saveResponseVariableName: "response",
        }
      );

      const sendingPlayer = createMockPlayer("player1", "Player 1");
      const sessionId = "session-1";

      // Test with invalid action type
      const actionBadType: RoomActionQueueDocument = {
        _id: "action-2",
        roomId: "room-1",
        playerId: "player1",
        actionType: "INVALID_ACTION_TYPE", // Wrong type
        payload: "Message",
        actionSentAt: new Date(),
        processedAt: null,
      } as any as RoomActionQueueDocument;

      expect(() =>
        processPlayerSentMessageAction(
          gameData,
          step,
          actionBadType,
          sendingPlayer,
          sessionId
        )
      ).toThrow("Invalid action type: INVALID_ACTION_TYPE");
    });
  });

  describe("processPlayerLeavesRoomAction", () => {
    it("should remove player from both players array and playerStateData without affecting other players", () => {
      const gameData = createBaseGameData();
      const initialPlayerCount = gameData.players.length;
      const initialPlayerStateCount = gameData.playerStateData.length;

      const action: RoomActionQueueDocument = {
        _id: "action-1",
        roomId: "room-1",
        playerId: "player1",
        actionType: RoomActionType.LEAVE_ROOM,
        payload: "",
        actionSentAt: new Date(),
        processedAt: null,
      } as any as RoomActionQueueDocument;

      const result = processPlayerLeavesRoomAction(gameData, action);

      // Player should be removed from players array
      expect(result.players.length).toBe(initialPlayerCount - 1);
      expect(result.players.find((p) => p === "player1")).toBeUndefined();

      // Player should be removed from playerStateData
      expect(result.playerStateData.length).toBe(initialPlayerStateCount - 1);
      expect(
        result.playerStateData.find((ps) => ps.player === "player1")
      ).toBeUndefined();

      // Other players should still be present
      expect(result.players.find((p) => p === "player2")).toBeDefined();
      expect(
        result.playerStateData.find((ps) => ps.player === "player2")
      ).toBeDefined();
    });

    it("should throw error when action type is not LEAVE_ROOM", () => {
      const gameData = createBaseGameData();

      const action: RoomActionQueueDocument = {
        _id: "action-1",
        roomId: "room-1",
        playerId: "player1",
        actionType: RoomActionType.SEND_MESSAGE, // Wrong type
        payload: "",
        actionSentAt: new Date(),
        processedAt: null,
      } as any as RoomActionQueueDocument;

      expect(() => processPlayerLeavesRoomAction(gameData, action)).toThrow(
        "Incorrect action type provided to processPlayerLeavesRoom"
      );
    });
  });

  describe("processPlayerJoinsRoomAction", () => {
    it.skip("should fetch and add player with playerStateData initialized from global state", async () => {
      // const gameData = createBaseGameData();
      // gameData.globalStateData.gameStateData = [
      //   { key: "globalKey1", value: "globalValue1" },
      //   { key: "globalKey2", value: "globalValue2" },
      // ];
      // const newPlayer = createMockPlayer("player3", "Player 3");
      // (fetchPlayer as jest.Mock).mockResolvedValue(newPlayer);
      // const action: RoomActionQueueEntry = {
      //   _id: "action-1",
      //   roomId: "room-1",
      //   playerId: newPlayer._id,
      //   actionType: RoomActionType.JOIN_ROOM,
      //   payload: "",
      //   actionSentAt: new Date(),
      //   processedAt: null,
      //   source: "local",
      // };
      // const result = processPlayerJoinsRoomAction(gameData, action, newPlayer);
      // // Player should be added to players array
      // expect(result.players.length).toBe(3);
      // expect(result.players.find((p) => p._id === "player3")).toEqual(
      //   newPlayer
      // );
      // // PlayerStateData should be added with global state copied
      // const newPlayerState = result.playerStateData.find(
      //   (ps) => ps.player === "player3"
      // );
      // expect(newPlayerState).toBeDefined();
      // expect(newPlayerState?.animation).toBe("");
      // expect(newPlayerState?.gameStateData).toEqual(
      //   gameData.globalStateData.gameStateData
      // );
    });
  });

  describe("processActionUpdatePlayerStateDataAction", () => {
    it("should parse JSON payload and update correct player's state data while respecting persistTruthFields", () => {
      const gameData = createBaseGameData();
      gameData.persistTruthGlobalStateData = ["hasSeen"];

      // Pre-populate player1 with some state data including a truth field
      gameData.playerStateData[0].gameStateData = [
        { key: "hasSeen", value: "true" },
        { key: "score", value: "10" },
      ];

      const newStateData = [
        { key: "hasSeen", value: "false" }, // Should NOT update (truth field)
        { key: "score", value: "25" }, // Should update
        { key: "newField", value: "newValue" }, // Should add
      ];

      const action: RoomActionQueueDocument = {
        _id: "action-1",
        roomId: "room-1",
        playerId: "player1",
        actionType: RoomActionType.UPDATE_ROOM,
        payload: JSON.stringify(newStateData),
        actionSentAt: new Date(),
        processedAt: null,
      } as any as RoomActionQueueDocument;

      const result = processActionUpdatePlayerStateDataAction(gameData, action);

      const player1State = result.playerStateData.find(
        (ps) => ps.player === "player1"
      );
      expect(player1State).toBeDefined();

      // hasSeen should remain 'true' (persisted truth field)
      const hasSeenField = player1State?.gameStateData.find(
        (item) => item.key === "hasSeen"
      );
      expect(hasSeenField?.value).toBe("true");

      // score should be updated
      const scoreField = player1State?.gameStateData.find(
        (item) => item.key === "score"
      );
      expect(scoreField?.value).toBe("25");

      // newField should be added
      const newField = player1State?.gameStateData.find(
        (item) => item.key === "newField"
      );
      expect(newField?.value).toBe("newValue");

      // Other players should not be affected
      const player2State = result.playerStateData.find(
        (ps) => ps.player === "player2"
      );
      expect(player2State?.gameStateData).toEqual(
        gameData.playerStateData[1].gameStateData
      );
    });
  });
});
