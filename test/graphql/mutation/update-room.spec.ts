/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import createApp, { appStart, appStop } from "../../../src/app";
import { expect } from "chai";
import e, { Express, response } from "express";
import mongoUnit from "mongo-unit";
import request from "supertest";
import RoomModel from "../../../src/schemas/models/Room";
import {
  nonExistentId,
  player1Id,
  room1Id,
  room2Id,
} from "../../fixtures/mongodb/data";
export const fullUpdateRoomMutation = `
        mutation UpdateRoom($roomId: ID!, $gameData: GameDataInput!) {
          updateRoom(roomId: $roomId, gameData: $gameData) {
            _id
            name
            gameData {
              gameId
              players {
                _id
                name
                description
                avatar {
                  id
                }
              }
              chat {
                id
                message
                sender
                senderId
                senderName
                displayType
                disableUserInput
                mcqChoices
              }
              globalStateData {
                curStageId
                curStepId
                gameStateData {
                  key
                  value
                }
              }
              playerStateData {
                player
                animation
                gameStateData {
                  key
                  value
                }
              }
            }
          }
        }`;

describe("update room", () => {
  let app: Express;

  beforeEach(async () => {
    await mongoUnit.load(require("test/fixtures/mongodb/data-default.js"));
    app = await createApp();
    await appStart();
  });

  afterEach(async () => {
    await appStop();
    await mongoUnit.drop();
  });

  it(`can update existing step and stage`, async () => {
    const response = await request(app)
      .post("/graphql")
      .send({
        query: fullUpdateRoomMutation,
        variables: {
          roomId: room1Id,
          gameData: {
            globalStateData: {
              curStageId: "Stage 2",
              curStepId: "Step 2",
            },
          },
        },
      });
    expect(response.status).to.equal(200);
    expect(response.body.data.updateRoom).to.eql({
      _id: room1Id,
      name: "Basketball Room 1",
      gameData: {
        gameId: "basketball",
        players: [
          {
            _id: player1Id,
            name: "Jonny Appleseed",
            description: "I want an avatar with an apple for a head",
            avatar: [{ id: "man_apple_head" }],
          },
        ],
        chat: [],
        globalStateData: {
          curStageId: "Stage 2",
          curStepId: "Step 2",
          gameStateData: [
            {
              key: "Global variable 1",
              value: "Global variable 1 value",
            },
          ],
        },
        playerStateData: [
          {
            player: player1Id,
            animation: "",
            gameStateData: [
              {
                key: "Player variable 1",
                value: "Player variable 1 value",
              },
              {
                key: "Global variable 1",
                value: "Global variable 1 value",
              },
            ],
          },
        ],
      },
    });
  });

  it(`can add global gameStateData`, async () => {
    const response = await request(app)
      .post("/graphql")
      .send({
        query: fullUpdateRoomMutation,
        variables: {
          roomId: room1Id,
          gameData: {
            globalStateData: {
              gameStateData: [
                {
                  key: "glob var 2",
                  value: 10,
                },
                {
                  key: "glob var 3",
                  value: true,
                },
                {
                  key: "glob var 4",
                  value: { text: "hi", num: 0.5 },
                },
              ],
            },
          },
        },
      });
    expect(response.status).to.equal(200);
    expect(response.body.data.updateRoom).to.eql({
      _id: room1Id,
      name: "Basketball Room 1",
      gameData: {
        gameId: "basketball",
        players: [
          {
            _id: player1Id,
            name: "Jonny Appleseed",
            description: "I want an avatar with an apple for a head",
            avatar: [{ id: "man_apple_head" }],
          },
        ],
        chat: [],
        globalStateData: {
          curStageId: "Stage 1",
          curStepId: "Step 1",
          gameStateData: [
            {
              key: "Global variable 1",
              value: "Global variable 1 value",
            },
            {
              key: "glob var 2",
              value: 10,
            },
            {
              key: "glob var 3",
              value: true,
            },
            {
              key: "glob var 4",
              value: { text: "hi", num: 0.5 },
            },
          ],
        },
        playerStateData: [
          {
            player: player1Id,
            animation: "",
            gameStateData: [
              {
                key: "Player variable 1",
                value: "Player variable 1 value",
              },
              {
                key: "Global variable 1",
                value: "Global variable 1 value",
              },
              {
                key: "glob var 2",
                value: 10,
              },
              {
                key: "glob var 3",
                value: true,
              },
              {
                key: "glob var 4",
                value: { text: "hi", num: 0.5 },
              },
            ],
          },
        ],
      },
    });
  });

  it(`can update global gameStateData`, async () => {
    const response = await request(app)
      .post("/graphql")
      .send({
        query: fullUpdateRoomMutation,
        variables: {
          roomId: room1Id,
          gameData: {
            globalStateData: {
              gameStateData: [
                {
                  key: "Global variable 1",
                  value: "test",
                },
              ],
            },
          },
        },
      });
    expect(response.status).to.equal(200);
    expect(response.body.data.updateRoom).to.eql({
      _id: room1Id,
      name: "Basketball Room 1",
      gameData: {
        gameId: "basketball",
        players: [
          {
            _id: player1Id,
            name: "Jonny Appleseed",
            description: "I want an avatar with an apple for a head",
            avatar: [{ id: "man_apple_head" }],
          },
        ],
        chat: [],
        globalStateData: {
          curStageId: "Stage 1",
          curStepId: "Step 1",
          gameStateData: [
            {
              key: "Global variable 1",
              value: "test",
            },
          ],
        },
        playerStateData: [
          {
            player: player1Id,
            animation: "",
            gameStateData: [
              {
                key: "Player variable 1",
                value: "Player variable 1 value",
              },
              {
                key: "Global variable 1",
                value: "test",
              },
            ],
          },
        ],
      },
    });
  });

  it(`can add and update player gameStateData`, async () => {
    const response = await request(app)
      .post("/graphql")
      .send({
        query: fullUpdateRoomMutation,
        variables: {
          roomId: room1Id,
          gameData: {
            playerStateData: [
              {
                player: player1Id,
                gameStateData: [
                  {
                    key: "Player variable 1",
                    value: 10,
                  },
                  {
                    key: "var 2",
                    value: true,
                  },
                ],
              },
            ],
          },
        },
      });
    expect(response.status).to.equal(200);
    expect(response.body.data.updateRoom).to.eql({
      _id: room1Id,
      name: "Basketball Room 1",
      gameData: {
        gameId: "basketball",
        players: [
          {
            _id: player1Id,
            name: "Jonny Appleseed",
            description: "I want an avatar with an apple for a head",
            avatar: [{ id: "man_apple_head" }],
          },
        ],
        chat: [],
        globalStateData: {
          curStageId: "Stage 1",
          curStepId: "Step 1",
          gameStateData: [
            {
              key: "Global variable 1",
              value: "Global variable 1 value",
            },
          ],
        },
        playerStateData: [
          {
            player: player1Id,
            animation: "",
            gameStateData: [
              {
                key: "Player variable 1",
                value: 10,
              },
              {
                key: "var 2",
                value: true,
              },
              {
                key: "Global variable 1",
                value: "Global variable 1 value",
              },
            ],
          },
        ],
      },
    });
  });

  it(`fails if non-existent room id`, async () => {
    const response = await request(app)
      .post("/graphql")
      .send({
        query: fullUpdateRoomMutation,
        variables: {
          roomId: nonExistentId,
          gameData: {},
        },
      });
    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "Invalid room"
    );
  });

  describe("truth global values", () => {
    it("when a global value is set to true, it updates all users to true", async () => {
      await RoomModel.create({
        _id: room2Id,
        name: "Boolean test room",
        gameData: {
          gameId: "boolean-game",
          players: [player1Id],
          chat: [],
          persistTruthGlobalStateData: ["truth-boolean-1", "truth-boolean-2"],
          globalStateData: {
            curStageId: "Stage 1",
            curStepId: "Step 1",
            roomOwnerId: player1Id,
            gameStateData: [
              {
                key: "truth-boolean-1",
                value: "false",
              },
              {
                key: "truth-boolean-2",
                value: "false",
              },
            ],
          },
          playerStateData: [
            {
              player: player1Id,
              animation: "",
              gameStateData: [
                {
                  key: "truth-boolean-1",
                  value: "false",
                },
                {
                  key: "truth-boolean-2",
                  value: "false",
                },
              ],
            },
          ],
        },
        deletedRoom: false,
      });
      await request(app)
        .post("/graphql")
        .send({
          query: `mutation UpdateRoom($roomId: ID!, $gameData: GameDataInput!) {
          updateRoom(roomId: $roomId, gameData: $gameData) {
            gameData {
              globalStateData {
                gameStateData {
                  key
                  value
                }
              }
              playerStateData {
                gameStateData {
                  key
                  value
                }
              }
            }
          }
        }`,
          variables: {
            roomId: room2Id,
            gameData: {
              persistTruthGlobalStateData: [
                "truth-boolean-1",
                "truth-boolean-2",
              ],
              globalStateData: {
                gameStateData: [
                  {
                    key: "truth-boolean-1",
                    value: "true",
                  },
                  {
                    key: "truth-boolean-2",
                    value: "false",
                  },
                ],
              },
            },
          },
        });
      const roomAfter = await RoomModel.findOne({
        _id: room2Id,
      }).lean();
      const globalTruthBoolean1 =
        roomAfter?.gameData.globalStateData.gameStateData.find(
          (d) => d.key === "truth-boolean-1"
        );
      const globalTruthBoolean2 =
        roomAfter?.gameData.globalStateData.gameStateData.find(
          (d) => d.key === "truth-boolean-2"
        );
      expect(globalTruthBoolean1?.value).to.equal("true");
      expect(globalTruthBoolean2?.value).to.equal("false");
      const userTruthBoolean1 =
        roomAfter?.gameData.playerStateData[0].gameStateData.find(
          (d) => d.key === "truth-boolean-1"
        );
      const userTruthBoolean2 =
        roomAfter?.gameData.playerStateData[0].gameStateData.find(
          (d) => d.key === "truth-boolean-2"
        );
      expect(userTruthBoolean1?.value).to.equal("true");
      expect(userTruthBoolean2?.value).to.equal("false");
    });

    it("a true global value cannot be set to false", async () => {
      await RoomModel.create({
        _id: room2Id,
        name: "Boolean test room",
        gameData: {
          gameId: "boolean-game",
          players: [player1Id],
          chat: [],
          persistTruthGlobalStateData: ["truth-boolean-1", "truth-boolean-2"],
          globalStateData: {
            curStageId: "Stage 1",
            curStepId: "Step 1",
            roomOwnerId: player1Id,
            gameStateData: [
              {
                key: "truth-boolean-1",
                value: "true",
              },
              {
                key: "truth-boolean-2",
                value: "true",
              },
            ],
          },
          playerStateData: [
            {
              player: player1Id,
              animation: "",
              gameStateData: [
                {
                  key: "truth-boolean-1",
                  value: "true",
                },
                {
                  key: "truth-boolean-2",
                  value: "true",
                },
              ],
            },
          ],
        },
        deletedRoom: false,
      });
      const response = await request(app)
        .post("/graphql")
        .send({
          query: `mutation UpdateRoom($roomId: ID!, $gameData: GameDataInput!) {
          updateRoom(roomId: $roomId, gameData: $gameData) {
            gameData {
              globalStateData {
                gameStateData {
                  key
                  value
                }
              }
              playerStateData {
                gameStateData {
                  key
                  value
                }
              }
            }
          }
        }`,
          variables: {
            roomId: room2Id,
            gameData: {
              persistTruthGlobalStateData: [
                "truth-boolean-1",
                "truth-boolean-2",
              ],
              globalStateData: {
                gameStateData: [
                  {
                    key: "truth-boolean-1",
                    value: "false",
                  },
                  {
                    key: "truth-boolean-2",
                    value: "false",
                  },
                ],
              },
              playerStateData: [
                {
                  player: player1Id,
                  animation: "",
                  gameStateData: [
                    {
                      key: "truth-boolean-1",
                      value: "false",
                    },
                    {
                      key: "truth-boolean-2",
                      value: "false",
                    },
                  ],
                },
              ],
            },
          },
        });
      expect(response.status).to.equal(200);
      const roomAfter = await RoomModel.findOne({
        _id: room2Id,
      }).lean();
      const globalTruthBoolean1 =
        roomAfter?.gameData.globalStateData.gameStateData.find(
          (d) => d.key === "truth-boolean-1"
        );
      const globalTruthBoolean2 =
        roomAfter?.gameData.globalStateData.gameStateData.find(
          (d) => d.key === "truth-boolean-2"
        );
      expect(globalTruthBoolean1?.value).to.equal("true");
      expect(globalTruthBoolean2?.value).to.equal("true");
      const userTruthBoolean1 =
        roomAfter?.gameData.playerStateData[0].gameStateData.find(
          (d) => d.key === "truth-boolean-1"
        );
      const userTruthBoolean2 =
        roomAfter?.gameData.playerStateData[0].gameStateData.find(
          (d) => d.key === "truth-boolean-2"
        );
      expect(userTruthBoolean1?.value).to.equal("true");
      expect(userTruthBoolean2?.value).to.equal("true");
    });

    it("cannot clear out a users/global truth values", async () => {
      await RoomModel.create({
        _id: room2Id,
        name: "Boolean test room",
        gameData: {
          gameId: "boolean-game",
          players: [player1Id],
          chat: [],
          persistTruthGlobalStateData: ["truth-boolean-1", "truth-boolean-2"],
          globalStateData: {
            curStageId: "Stage 1",
            curStepId: "Step 1",
            roomOwnerId: player1Id,
            gameStateData: [
              {
                key: "truth-boolean-1",
                value: "true",
              },
              {
                key: "truth-boolean-2",
                value: "true",
              },
            ],
          },
          playerStateData: [
            {
              player: player1Id,
              animation: "",
              gameStateData: [
                {
                  key: "truth-boolean-1",
                  value: "true",
                },
                {
                  key: "truth-boolean-2",
                  value: "true",
                },
              ],
            },
          ],
        },
        deletedRoom: false,
      });
      const response = await request(app)
        .post("/graphql")
        .send({
          query: `mutation UpdateRoom($roomId: ID!, $gameData: GameDataInput!) {
          updateRoom(roomId: $roomId, gameData: $gameData) {
            gameData {
              globalStateData {
                gameStateData {
                  key
                  value
                }
              }
              playerStateData {
                gameStateData {
                  key
                  value
                }
              }
            }
          }
        }`,
          variables: {
            roomId: room2Id,
            gameData: {
              globalStateData: {
                gameStateData: [],
              },
              playerStateData: [
                {
                  player: player1Id,
                  animation: "",
                  gameStateData: [],
                },
              ],
            },
          },
        });
      expect(response.status).to.equal(200);
      const roomAfter = await RoomModel.findOne({
        _id: room2Id,
      }).lean();
      const globalTruthBoolean1 =
        roomAfter?.gameData.globalStateData.gameStateData.find(
          (d) => d.key === "truth-boolean-1"
        );
      const globalTruthBoolean2 =
        roomAfter?.gameData.globalStateData.gameStateData.find(
          (d) => d.key === "truth-boolean-2"
        );
      expect(globalTruthBoolean1?.value).to.equal("true");
      expect(globalTruthBoolean2?.value).to.equal("true");
      const userTruthBoolean1 =
        roomAfter?.gameData.playerStateData[0].gameStateData.find(
          (d) => d.key === "truth-boolean-1"
        );
      const userTruthBoolean2 =
        roomAfter?.gameData.playerStateData[0].gameStateData.find(
          (d) => d.key === "truth-boolean-2"
        );
      expect(userTruthBoolean1?.value).to.equal("true");
      expect(userTruthBoolean2?.value).to.equal("true");
    });

    it("users data gets updated with global data that they don't already have", async () => {
      await RoomModel.create({
        _id: room2Id,
        name: "Boolean test room",
        gameData: {
          gameId: "boolean-game",
          players: [player1Id],
          chat: [],
          persistTruthGlobalStateData: ["truth-boolean-1", "truth-boolean-2"],
          globalStateData: {
            curStageId: "Stage 1",
            curStepId: "Step 1",
            roomOwnerId: player1Id,
            gameStateData: [],
          },
          playerStateData: [
            {
              player: player1Id,
              animation: "",
              gameStateData: [],
            },
          ],
        },
        deletedRoom: false,
      });
      const response = await request(app)
        .post("/graphql")
        .send({
          query: `mutation UpdateRoom($roomId: ID!, $gameData: GameDataInput!) {
        updateRoom(roomId: $roomId, gameData: $gameData) {
          gameData {
            globalStateData {
              gameStateData {
                key
                value
              }
            }
            playerStateData {
              gameStateData {
                key
                value
              }
            }
          }
        }
      }`,
          variables: {
            roomId: room2Id,
            gameData: {
              globalStateData: {
                gameStateData: [
                  {
                    key: "new-global-key",
                    value: "new-global-value",
                  },
                ],
              },
            },
          },
        });
      expect(response.status).to.equal(200);
      const roomAfter = await RoomModel.findOne({
        _id: room2Id,
      }).lean();
      const userGlobalKey =
        roomAfter?.gameData.playerStateData[0].gameStateData.find(
          (d) => d.key === "new-global-key"
        );
      expect(userGlobalKey?.value).to.equal("new-global-value");
    });
  });
});
