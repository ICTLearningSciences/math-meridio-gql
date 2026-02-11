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
      const newData: GameStateData[] = [{ key: "newKey", value: "newValue" }];

      const result = updateGlobalStateData(gameData, [], newData);

      expect(result.globalStateData.gameStateData).toHaveLength(1);
      expect(result.globalStateData.gameStateData[0]).toEqual({
        key: "newKey",
        value: "newValue",
      });
    });

    it("should update existing game state data when key exists and not in persistTruthFields", () => {
      const gameData = createBaseGameData();
      gameData.globalStateData.gameStateData = [
        { key: "existingKey", value: "oldValue" },
      ];
      const newData: GameStateData[] = [
        { key: "existingKey", value: "newValue" },
      ];

      const result = updateGlobalStateData(gameData, [], newData);

      expect(result.globalStateData.gameStateData).toHaveLength(1);
      expect(result.globalStateData.gameStateData[0].value).toBe("newValue");
    });

    it("should persist existing 'true' values for fields in persistTruthFields (not overwrite)", () => {
      const gameData = createBaseGameData();
      gameData.globalStateData.gameStateData = [
        { key: "truthField", value: "true" },
      ];
      const newData: GameStateData[] = [{ key: "truthField", value: "false" }];

      const result = updateGlobalStateData(gameData, ["truthField"], newData);

      expect(result.globalStateData.gameStateData[0].value).toBe("true");
    });

    it("should update 'false' values even if field is in persistTruthFields (only 'true' is persisted)", () => {
      const gameData = createBaseGameData();
      gameData.globalStateData.gameStateData = [
        { key: "truthField", value: "false" },
      ];
      const newData: GameStateData[] = [{ key: "truthField", value: "true" }];

      const result = updateGlobalStateData(gameData, ["truthField"], newData);

      expect(result.globalStateData.gameStateData[0].value).toBe("true");
    });

    it("should handle multiple new data items at once", () => {
      const gameData = createBaseGameData();
      gameData.globalStateData.gameStateData = [
        { key: "existing1", value: "value1" },
      ];
      const newData: GameStateData[] = [
        { key: "existing1", value: "updated1" },
        { key: "new1", value: "value2" },
        { key: "new2", value: "value3" },
      ];

      const result = updateGlobalStateData(gameData, [], newData);

      expect(result.globalStateData.gameStateData).toHaveLength(3);
      expect(
        result.globalStateData.gameStateData.find((d) => d.key === "existing1")
          ?.value
      ).toBe("updated1");
      expect(
        result.globalStateData.gameStateData.find((d) => d.key === "new1")
          ?.value
      ).toBe("value2");
      expect(
        result.globalStateData.gameStateData.find((d) => d.key === "new2")
          ?.value
      ).toBe("value3");
    });

    it("should not mutate the original gameData object", () => {
      const gameData = createBaseGameData();
      const newData: GameStateData[] = [{ key: "newKey", value: "newValue" }];

      const result = updateGlobalStateData(gameData, [], newData);

      expect(result.globalStateData.gameStateData.length).toBe(1);
      expect(gameData.globalStateData.gameStateData.length).toBe(0);
    });
  });

  describe("updatePlayerStateData", () => {
    it("should add new player state data when key doesn't exist", () => {
      const gameData = createBaseGameData();
      const newData: GameStateData[] = [
        { key: "playerKey", value: "playerValue" },
      ];

      const result = updatePlayerStateData(gameData, [], "player1", newData);

      const player1Data = result.playerStateData.find(
        (p) => p.player === "player1"
      );
      expect(player1Data?.gameStateData).toHaveLength(1);
      expect(player1Data?.gameStateData[0]).toEqual({
        key: "playerKey",
        value: "playerValue",
      });
    });

    it("should update existing player state data when key exists and not in persistTruthFields", () => {
      const gameData = createBaseGameData();
      gameData.playerStateData[0].gameStateData = [
        { key: "existingKey", value: "oldValue" },
      ];
      const newData: GameStateData[] = [
        { key: "existingKey", value: "newValue" },
      ];

      const result = updatePlayerStateData(gameData, [], "player1", newData);

      const player1Data = result.playerStateData.find(
        (p) => p.player === "player1"
      );
      expect(player1Data?.gameStateData[0].value).toBe("newValue");
    });

    it("should persist existing 'true' values for fields in persistTruthFields (not overwrite)", () => {
      const gameData = createBaseGameData();
      gameData.playerStateData[0].gameStateData = [
        { key: "truthField", value: "true" },
      ];
      const newData: GameStateData[] = [{ key: "truthField", value: "false" }];

      const result = updatePlayerStateData(
        gameData,
        ["truthField"],
        "player1",
        newData
      );

      const player1Data = result.playerStateData.find(
        (p) => p.player === "player1"
      );
      expect(player1Data?.gameStateData[0].value).toBe("true");
    });

    it("should update 'false' values even if field is in persistTruthFields", () => {
      const gameData = createBaseGameData();
      gameData.playerStateData[0].gameStateData = [
        { key: "truthField", value: "false" },
      ];
      const newData: GameStateData[] = [{ key: "truthField", value: "true" }];

      const result = updatePlayerStateData(
        gameData,
        ["truthField"],
        "player1",
        newData
      );

      const player1Data = result.playerStateData.find(
        (p) => p.player === "player1"
      );
      expect(player1Data?.gameStateData[0].value).toBe("true");
    });

    it("should throw error when player not found", () => {
      const gameData = createBaseGameData();
      const newData: GameStateData[] = [{ key: "key", value: "value" }];

      expect(() => {
        updatePlayerStateData(gameData, [], "nonexistent-player", newData);
      }).toThrow("Player data not found for player nonexistent-player");
    });

    it("should handle multiple new data items at once for a player", () => {
      const gameData = createBaseGameData();
      gameData.playerStateData[0].gameStateData = [
        { key: "existing1", value: "value1" },
      ];
      const newData: GameStateData[] = [
        { key: "existing1", value: "updated1" },
        { key: "new1", value: "value2" },
        { key: "new2", value: "value3" },
      ];

      const result = updatePlayerStateData(gameData, [], "player1", newData);

      const player1Data = result.playerStateData.find(
        (p) => p.player === "player1"
      );
      expect(player1Data?.gameStateData).toHaveLength(3);
      expect(
        player1Data?.gameStateData.find((d) => d.key === "existing1")?.value
      ).toBe("updated1");
      expect(
        player1Data?.gameStateData.find((d) => d.key === "new1")?.value
      ).toBe("value2");
      expect(
        player1Data?.gameStateData.find((d) => d.key === "new2")?.value
      ).toBe("value3");
    });

    it("should not mutate the original gameData object", () => {
      const gameData = createBaseGameData();
      const newData: GameStateData[] = [{ key: "newKey", value: "newValue" }];

      const result = updatePlayerStateData(gameData, [], "player1", newData);

      const resultPlayer1Data = result.playerStateData.find(
        (p) => p.player === "player1"
      );
      const originalPlayer1Data = gameData.playerStateData.find(
        (p) => p.player === "player1"
      );

      expect(resultPlayer1Data?.gameStateData.length).toBe(1);
      expect(originalPlayer1Data?.gameStateData.length).toBe(0);
    });
  });

  describe("syncGlobalTruthDataToPlayers", () => {
    it("should sync global truth data to all players, adding new keys and updating existing ones, while skipping missing global fields", () => {
      const gameData = createBaseGameData();
      gameData.globalStateData.gameStateData = [
        { key: "field1", value: "globalValue1" },
        { key: "field2", value: "globalValue2" },
      ];
      gameData.playerStateData[0].gameStateData = [
        { key: "field1", value: "oldValue1" },
      ];
      // player2 has no existing data

      const result = syncGlobalTruthDataToPlayers(gameData, [
        "field1",
        "field2",
        "nonexistentField",
      ]);

      const player1Data = result.playerStateData.find(
        (p) => p.player === "player1"
      );
      const player2Data = result.playerStateData.find(
        (p) => p.player === "player2"
      );

      // Player 1: field1 should be updated, field2 should be added
      expect(
        player1Data?.gameStateData.find((d) => d.key === "field1")?.value
      ).toBe("globalValue1");
      expect(
        player1Data?.gameStateData.find((d) => d.key === "field2")?.value
      ).toBe("globalValue2");

      // Player 2: both should be added
      expect(
        player2Data?.gameStateData.find((d) => d.key === "field1")?.value
      ).toBe("globalValue1");
      expect(
        player2Data?.gameStateData.find((d) => d.key === "field2")?.value
      ).toBe("globalValue2");

      // nonexistentField should not be added (doesn't exist in global)
      expect(
        player1Data?.gameStateData.find((d) => d.key === "nonexistentField")
      ).toBeUndefined();
      expect(
        player2Data?.gameStateData.find((d) => d.key === "nonexistentField")
      ).toBeUndefined();
    });

    it("should handle multiple persistTruthFields at once", () => {
      const gameData = createBaseGameData();
      gameData.globalStateData.gameStateData = [
        { key: "truth1", value: "globalTrue1" },
        { key: "truth2", value: "globalTrue2" },
        { key: "truth3", value: "globalTrue3" },
      ];

      const result = syncGlobalTruthDataToPlayers(gameData, [
        "truth1",
        "truth2",
        "truth3",
      ]);

      const player1Data = result.playerStateData.find(
        (p) => p.player === "player1"
      );
      const player2Data = result.playerStateData.find(
        (p) => p.player === "player2"
      );

      expect(player1Data?.gameStateData).toHaveLength(3);
      expect(player2Data?.gameStateData).toHaveLength(3);

      expect(
        player1Data?.gameStateData.find((d) => d.key === "truth1")?.value
      ).toBe("globalTrue1");
      expect(
        player1Data?.gameStateData.find((d) => d.key === "truth2")?.value
      ).toBe("globalTrue2");
      expect(
        player1Data?.gameStateData.find((d) => d.key === "truth3")?.value
      ).toBe("globalTrue3");
    });

    it("should not mutate the original gameData object", () => {
      const gameData = createBaseGameData();
      gameData.globalStateData.gameStateData = [
        { key: "field1", value: "value1" },
      ];

      const result = syncGlobalTruthDataToPlayers(gameData, ["field1"]);

      const resultPlayer1Data = result.playerStateData.find(
        (p) => p.player === "player1"
      );
      const originalPlayer1Data = gameData.playerStateData.find(
        (p) => p.player === "player1"
      );

      expect(resultPlayer1Data?.gameStateData.length).toBe(1);
      expect(originalPlayer1Data?.gameStateData.length).toBe(0);
    });
  });

  describe("syncGlobalGameStateKeysToPlayers", () => {
    it("should sync all global keys to all players, only adding missing keys (not updating existing ones)", () => {
      const gameData = createBaseGameData();
      gameData.globalStateData.gameStateData = [
        { key: "global1", value: "globalValue1" },
        { key: "global2", value: "globalValue2" },
        { key: "global3", value: "globalValue3" },
      ];
      gameData.playerStateData[0].gameStateData = [
        { key: "global1", value: "existingPlayerValue" },
      ];
      // player2 has no existing data

      const result = syncGlobalGameStateKeysToPlayers(gameData);

      const player1Data = result.playerStateData.find(
        (p) => p.player === "player1"
      );
      const player2Data = result.playerStateData.find(
        (p) => p.player === "player2"
      );

      // Player 1: global1 should NOT be updated (keeps existing value), global2 and global3 should be added
      expect(player1Data?.gameStateData).toHaveLength(3);
      expect(
        player1Data?.gameStateData.find((d) => d.key === "global1")?.value
      ).toBe("existingPlayerValue");
      expect(
        player1Data?.gameStateData.find((d) => d.key === "global2")?.value
      ).toBe("globalValue2");
      expect(
        player1Data?.gameStateData.find((d) => d.key === "global3")?.value
      ).toBe("globalValue3");

      // Player 2: all should be added
      expect(player2Data?.gameStateData).toHaveLength(3);
      expect(
        player2Data?.gameStateData.find((d) => d.key === "global1")?.value
      ).toBe("globalValue1");
      expect(
        player2Data?.gameStateData.find((d) => d.key === "global2")?.value
      ).toBe("globalValue2");
      expect(
        player2Data?.gameStateData.find((d) => d.key === "global3")?.value
      ).toBe("globalValue3");
    });

    it("should not mutate the original gameData object", () => {
      const gameData = createBaseGameData();
      gameData.globalStateData.gameStateData = [
        { key: "field1", value: "value1" },
      ];

      const result = syncGlobalGameStateKeysToPlayers(gameData);

      const resultPlayer1Data = result.playerStateData.find(
        (p) => p.player === "player1"
      );
      const originalPlayer1Data = gameData.playerStateData.find(
        (p) => p.player === "player1"
      );

      expect(resultPlayer1Data?.gameStateData.length).toBe(1);
      expect(originalPlayer1Data?.gameStateData.length).toBe(0);
    });
  });
});
