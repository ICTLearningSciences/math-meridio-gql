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
import { GameStateData } from "../../../schemas/models/Room";
import {
  updateGlobalStateData,
  updatePlayerStateData,
  syncGlobalTruthDataToPlayers,
  syncGlobalGameStateKeysToPlayers,
} from "../pure-state-modifiers";
import { createBaseGameData } from "./helpers";

describe("game-state-updates", () => {
  describe("updateGlobalStateData", () => {
    it("should add new game state data when key doesn't exist", () => {
      const gameData = createBaseGameData();
      const newData: GameStateData = { newKey: "newValue" };

      const result = updateGlobalStateData(gameData, [], newData);

      expect(Object.keys(result.globalStateData.gameStateData).length).toBe(1);
      expect(result.globalStateData.gameStateData["newKey"]).toBe("newValue");
    });

    it("should update existing game state data when key exists and not in persistTruthFields", () => {
      const gameData = createBaseGameData();
      gameData.globalStateData.gameStateData = {
        existingKey: "oldValue",
      };
      const newData: GameStateData = {
        existingKey: "newValue",
      };

      const result = updateGlobalStateData(gameData, [], newData);

      expect(Object.keys(result.globalStateData.gameStateData).length).toBe(1);
      expect(result.globalStateData.gameStateData["existingKey"]).toBe(
        "newValue"
      );
    });

    it("should persist existing 'true' values for fields in persistTruthFields (not overwrite)", () => {
      const gameData = createBaseGameData();
      gameData.globalStateData.gameStateData = {
        truthField: "true",
      };
      const newData: GameStateData = { truthField: "false" };

      const result = updateGlobalStateData(gameData, ["truthField"], newData);

      expect(result.globalStateData.gameStateData["truthField"]).toBe("true");
    });

    it("should update 'false' values even if field is in persistTruthFields (only 'true' is persisted)", () => {
      const gameData = createBaseGameData();
      gameData.globalStateData.gameStateData = {
        truthField: "false",
      };
      const newData: GameStateData = { truthField: "true" };

      const result = updateGlobalStateData(gameData, ["truthField"], newData);

      expect(result.globalStateData.gameStateData["truthField"]).toBe("true");
    });

    it("should handle multiple new data items at once", () => {
      const gameData = createBaseGameData();
      gameData.globalStateData.gameStateData = {
        existing1: "value1",
      };
      const newData: GameStateData = {
        existing1: "updated1",
        new1: "value2",
        new2: "value3",
      };

      const result = updateGlobalStateData(gameData, [], newData);

      expect(Object.keys(result.globalStateData.gameStateData).length).toBe(3);
      expect(result.globalStateData.gameStateData["existing1"]?.value).toBe(
        "updated1"
      );
      expect(result.globalStateData.gameStateData["new1"]?.value).toBe(
        "value2"
      );
      expect(result.globalStateData.gameStateData["new2"]?.value).toBe(
        "value3"
      );
    });

    it("should not mutate the original gameData object", () => {
      const gameData = createBaseGameData();
      const newData: GameStateData = { newKey: "newValue" };

      const result = updateGlobalStateData(gameData, [], newData);

      expect(Object.keys(result.globalStateData.gameStateData).length).toBe(1);
      expect(gameData.globalStateData.gameStateData.length).toBe(0);
    });
  });

  describe("updatePlayerStateData", () => {
    it("should add new player state data when key doesn't exist", () => {
      const gameData = createBaseGameData();
      const newData: GameStateData = {
        playerKey: "playerValue",
      };

      const result = updatePlayerStateData(gameData, [], "player1", newData);

      const player1Data = result.playersGameStateData["player1"];
      expect(Object.keys(player1Data).length).toBe(1);
      expect(player1Data["playerKey"]).toEqual("playerValue");
    });

    it("should update existing player state data when key exists and not in persistTruthFields", () => {
      const gameData = createBaseGameData();
      gameData.playersGameStateData["player1"] = {
        existingKey: "oldValue",
      };
      const newData: GameStateData = {
        existingKey: "newValue",
      };

      const result = updatePlayerStateData(gameData, [], "player1", newData);

      const player1Data = result.playersGameStateData["player1"];
      expect(player1Data["existingKey"]).toBe("newValue");
    });

    it("should persist existing 'true' values for fields in persistTruthFields (not overwrite)", () => {
      const gameData = createBaseGameData();
      gameData.playersGameStateData["player1"] = {
        truthField: "true",
      };
      const newData: GameStateData = { truthField: "false" };

      const result = updatePlayerStateData(
        gameData,
        ["truthField"],
        "player1",
        newData
      );

      const player1Data = result.playersGameStateData["player1"];
      expect(player1Data["truthField"]).toBe("true");
    });

    it("should update 'false' values even if field is in persistTruthFields", () => {
      const gameData = createBaseGameData();
      gameData.playersGameStateData["player1"] = {
        truthField: "false",
      };
      const newData: GameStateData = { truthField: "true" };

      const result = updatePlayerStateData(
        gameData,
        ["truthField"],
        "player1",
        newData
      );

      const player1Data = result.playersGameStateData["player1"];
      expect(player1Data["truthField"]).toBe("true");
    });

    it("should throw error when player not found", () => {
      const gameData = createBaseGameData();
      const newData: GameStateData = { key: "value" };

      expect(() => {
        updatePlayerStateData(gameData, [], "nonexistent-player", newData);
      }).toThrow("Player data not found for player nonexistent-player");
    });

    it("should handle multiple new data items at once for a player", () => {
      const gameData = createBaseGameData();
      gameData.playersGameStateData["player1"] = {
        existing1: "value1",
      };
      const newData: GameStateData = {
        existing1: "updated1",
        new1: "value2",
        new2: "value3",
      };

      const result = updatePlayerStateData(gameData, [], "player1", newData);

      const player1Data = result.playersGameStateData["player1"];
      expect(Object.keys(player1Data).length).toBe(3);
      expect(player1Data["existing1"]).toBe("updated1");
      expect(player1Data["new1"]).toBe("value2");
      expect(player1Data["new2"]).toBe("value3");
    });

    it("should not mutate the original gameData object", () => {
      const gameData = createBaseGameData();
      const newData: GameStateData = { newKey: "newValue" };

      const result = updatePlayerStateData(gameData, [], "player1", newData);

      const resultPlayer1Data = result.playersGameStateData["player1"];
      const originalPlayer1Data = gameData.playersGameStateData["player1"];

      expect(Object.keys(resultPlayer1Data).length).toBe(1);
      expect(Object.keys(originalPlayer1Data).length).toBe(0);
    });
  });

  describe("syncGlobalTruthDataToPlayers", () => {
    it("should sync global truth data to all players, adding new keys and updating existing ones, while skipping missing global fields", () => {
      const gameData = createBaseGameData();
      gameData.globalStateData.gameStateData = {
        field1: "globalValue1",
        field2: "globalValue2",
      };
      gameData.playersGameStateData["player1"] = {
        field1: "oldValue1",
      };
      // player2 has no existing data

      const result = syncGlobalTruthDataToPlayers(gameData, [
        "field1",
        "field2",
        "nonexistentField",
      ]);

      const player1Data = result.playersGameStateData["player1"];
      const player2Data = result.playersGameStateData["player2"];

      // Player 1: field1 should be updated, field2 should be added
      expect(player1Data["field1"]).toBe("globalValue1");
      expect(player1Data["field2"]).toBe("globalValue2");

      // Player 2: both should be added
      expect(player2Data["field1"]).toBe("globalValue1");
      expect(player2Data["field2"]).toBe("globalValue2");

      // nonexistentField should not be added (doesn't exist in global)
      expect(player1Data["nonexistentField"]).toBeUndefined();
      expect(player2Data["nonexistentField"]).toBeUndefined();
    });

    it("should handle multiple persistTruthFields at once", () => {
      const gameData = createBaseGameData();
      gameData.globalStateData.gameStateData = {
        truth1: "globalTrue1",
        truth2: "globalTrue2",
        truth3: "globalTrue3",
      };

      const result = syncGlobalTruthDataToPlayers(gameData, [
        "truth1",
        "truth2",
        "truth3",
      ]);

      const player1Data = result.playersGameStateData["player1"];
      const player2Data = result.playersGameStateData["player2"];

      expect(Object.keys(player1Data).length).toBe(3);
      expect(Object.keys(player2Data).length).toBe(3);

      expect(player1Data["truth1"]).toBe("globalTrue1");
      expect(player1Data["truth2"]).toBe("globalTrue2");
      expect(player1Data["truth3"]).toBe("globalTrue3");
    });

    it("should not mutate the original gameData object", () => {
      const gameData = createBaseGameData();
      gameData.globalStateData.gameStateData = {
        field1: "value1",
      };

      const result = syncGlobalTruthDataToPlayers(gameData, ["field1"]);

      const resultPlayer1Data = result.playersGameStateData["player1"];
      const originalPlayer1Data = gameData.playersGameStateData["player1"];

      expect(Object.keys(resultPlayer1Data).length).toBe(1);
      expect(Object.keys(originalPlayer1Data).length).toBe(0);
    });
  });

  describe("syncGlobalGameStateKeysToPlayers", () => {
    it("should sync all global keys to all players, only adding missing keys (not updating existing ones)", () => {
      const gameData = createBaseGameData();
      gameData.globalStateData.gameStateData = {
        global1: "globalValue1",
        global2: "globalValue2",
        global3: "globalValue3",
      };
      gameData.playersGameStateData["player1"] = {
        global1: "existingPlayerValue",
      };
      // player2 has no existing data

      const result = syncGlobalGameStateKeysToPlayers(gameData);

      const player1Data = result.playersGameStateData["player1"];
      const player2Data = result.playersGameStateData["player2"];

      // Player 1: global1 should NOT be updated (keeps existing value), global2 and global3 should be added
      expect(Object.keys(player1Data).length).toBe(3);
      expect(player1Data["global1"]).toBe("existingPlayerValue");
      expect(player1Data["global2"]).toBe("globalValue2");
      expect(player1Data["global3"]).toBe("globalValue3");

      // Player 2: all should be added
      expect(Object.keys(player2Data).length).toBe(3);
      expect(player2Data["global1"]).toBe("globalValue1");
      expect(player2Data["global2"]).toBe("globalValue2");
      expect(player2Data["global3"]).toBe("globalValue3");
    });

    it("should not mutate the original gameData object", () => {
      const gameData = createBaseGameData();
      gameData.globalStateData.gameStateData = {
        field1: "value1",
      };

      const result = syncGlobalGameStateKeysToPlayers(gameData);

      const resultPlayer1Data = result.playersGameStateData["player1"];
      const originalPlayer1Data = gameData.playersGameStateData["player1"];

      expect(Object.keys(resultPlayer1Data).length).toBe(1);
      expect(Object.keys(originalPlayer1Data).length).toBe(0);
    });
  });
});
