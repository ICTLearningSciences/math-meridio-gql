/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import createApp, { appStart, appStop } from "../../../src/app";
import { expect } from "chai";
import e, { Express } from "express";
import mongoUnit from "mongo-unit";
import request from "supertest";

describe("send message", () => {
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
        query: `
        mutation UpdateRoom($roomId: ID!, $gameData: GameDataInput!) {
          updateRoom(roomId: $roomId, gameData: $gameData) {
            _id
            name
            gameData {
              gameId
              players {
                clientId
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
        }`,
        variables: {
          roomId: "5f748650f4b3f1b9f1f1f1f1",
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
      _id: "5f748650f4b3f1b9f1f1f1f1",
      name: "Basketball Room 1",
      gameData: {
        gameId: "basketball",
        players: [
          {
            clientId: "Player 1",
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
            player: "Player 1",
            animation: "",
            gameStateData: [
              {
                key: "Player variable 1",
                value: "Player variable 1 value",
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
        query: `
        mutation UpdateRoom($roomId: ID!, $gameData: GameDataInput!) {
          updateRoom(roomId: $roomId, gameData: $gameData) {
            _id
            name
            gameData {
              gameId
              players {
                clientId
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
        }`,
        variables: {
          roomId: "5f748650f4b3f1b9f1f1f1f1",
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
      _id: "5f748650f4b3f1b9f1f1f1f1",
      name: "Basketball Room 1",
      gameData: {
        gameId: "basketball",
        players: [
          {
            clientId: "Player 1",
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
            player: "Player 1",
            animation: "",
            gameStateData: [
              {
                key: "Player variable 1",
                value: "Player variable 1 value",
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
        query: `
        mutation UpdateRoom($roomId: ID!, $gameData: GameDataInput!) {
          updateRoom(roomId: $roomId, gameData: $gameData) {
            _id
            name
            gameData {
              gameId
              players {
                clientId
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
        }`,
        variables: {
          roomId: "5f748650f4b3f1b9f1f1f1f1",
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
      _id: "5f748650f4b3f1b9f1f1f1f1",
      name: "Basketball Room 1",
      gameData: {
        gameId: "basketball",
        players: [
          {
            clientId: "Player 1",
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
            player: "Player 1",
            animation: "",
            gameStateData: [
              {
                key: "Player variable 1",
                value: "Player variable 1 value",
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
        query: `
        mutation UpdateRoom($roomId: ID!, $gameData: GameDataInput!) {
          updateRoom(roomId: $roomId, gameData: $gameData) {
            _id
            name
            gameData {
              gameId
              players {
                clientId
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
        }`,
        variables: {
          roomId: "5f748650f4b3f1b9f1f1f1f1",
          gameData: {
            playerStateData: [
              {
                player: "Player 1",
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
      _id: "5f748650f4b3f1b9f1f1f1f1",
      name: "Basketball Room 1",
      gameData: {
        gameId: "basketball",
        players: [
          {
            clientId: "Player 1",
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
            player: "Player 1",
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
        query: `
        mutation UpdateRoom($roomId: ID!, $gameData: GameDataInput!) {
          updateRoom(roomId: $roomId, gameData: $gameData) {
            name
            gameData {
              gameId
              players {
                clientId
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
        }`,
        variables: {
          roomId: "5f748650f4b3f1b9f1f1f1f2",
          gameData: {},
        },
      });
    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "Invalid room"
    );
  });
});
