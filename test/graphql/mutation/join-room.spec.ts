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

describe("join room", () => {
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

  it(`can join an existing room`, async () => {
    await request(app)
      .post("/graphql")
      .send({
        query: `
        mutation AddOrUpdatePlayer($player: PlayerInput!) {
          addOrUpdatePlayer(player: $player) {
            clientId
          }
        }`,
        variables: {
          player: {
            clientId: "Player 2",
            name: "Jenny Appleseed",
            description: "I want an avatar with an apple for a head",
            avatar: [{ id: "woman_apple_head" }],
          },
        },
      });
    const response = await request(app)
      .post("/graphql")
      .send({
        query: `
        mutation JoinRoom($playerId: String!, $roomId: ID!) {
          joinRoom(playerId: $playerId, roomId: $roomId) {
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
          playerId: "Player 2",
          roomId: "5f748650f4b3f1b9f1f1f1f1",
        },
      });
    expect(response.status).to.equal(200);
    expect(response.body.data.joinRoom).to.eql({
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
          {
            clientId: "Player 2",
            name: "Jenny Appleseed",
            description: "I want an avatar with an apple for a head",
            avatar: [{ id: "woman_apple_head" }],
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
                value: "Player variable 1 value",
              },
            ],
          },
          {
            player: "Player 2",
            animation: "",
            gameStateData: [],
          },
        ],
      },
    });
  });

  it(`fails if already in room`, async () => {
    const response = await request(app)
      .post("/graphql")
      .send({
        query: `
        mutation JoinRoom($playerId: String!, $roomId: ID!) {
          joinRoom(playerId: $playerId, roomId: $roomId) {
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
          playerId: "Player 1",
          roomId: "5f748650f4b3f1b9f1f1f1f1",
        },
      });
    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "Already in room"
    );
  });

  it(`fails if non-existent player id`, async () => {
    const response = await request(app)
      .post("/graphql")
      .send({
        query: `
        mutation JoinRoom($playerId: String!, $roomId: ID!) {
          joinRoom(playerId: $playerId, roomId: $roomId) {
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
          playerId: "Player none",
          roomId: "5f748650f4b3f1b9f1f1f1f1",
        },
      });
    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "Invalid player"
    );
  });

  it(`fails if non-existent room id`, async () => {
    const response = await request(app)
      .post("/graphql")
      .send({
        query: `
        mutation JoinRoom($playerId: String!, $roomId: ID!) {
          joinRoom(playerId: $playerId, roomId: $roomId) {
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
          playerId: "Player 1",
          roomId: "5f748650f4b3f1b9f1f1f1f2",
        },
      });
    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "Invalid room"
    );
  });
});
