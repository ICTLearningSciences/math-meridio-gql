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

describe("fetch rooms", () => {
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

  it(`can fetch existing rooms for game`, async () => {
    const response = await request(app)
      .post("/graphql")
      .send({
        query: `
        query FetchRooms($game: String) {
          fetchRooms(game: $game) {
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
            deletedRoom
          }
        }`,
        variables: {
          game: "basketball",
        },
      });
    expect(response.status).to.equal(200);
    expect(response.body.data.fetchRooms).to.eql([
      {
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
                  value: "Player variable 1 value",
                },
              ],
            },
          ],
        },
        deletedRoom: false,
      },
    ]);
  });

  it(`can fetch existing rooms`, async () => {
    const response = await request(app)
      .post("/graphql")
      .send({
        query: `
        query FetchRooms($game: String) {
          fetchRooms(game: $game) {
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
            deletedRoom
          }
        }`,
        variables: {},
      });

    expect(response.status).to.equal(200);
    expect(response.body.data.fetchRooms).to.eql([
      {
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
                  value: "Player variable 1 value",
                },
              ],
            },
          ],
        },
        deletedRoom: false,
      },
    ]);
  });

  it(`no rooms for game`, async () => {
    const response = await request(app)
      .post("/graphql")
      .send({
        query: `
        query FetchRooms($game: String) {
          fetchRooms(game: $game) {
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
            deletedRoom
          }
        }`,
        variables: {
          game: "asdf",
          deletedRoom: false,
        },
      });
    expect(response.status).to.equal(200);
    expect(response.body.data.fetchRooms).to.eql([]);
  });
});
