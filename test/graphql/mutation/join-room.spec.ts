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
import {
  nonExistentId,
  player1Id,
  player2Id,
  room1Id,
  room2Id,
  room3Id,
} from "../../fixtures/mongodb/data";

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
    const response = await request(app)
      .post("/graphql")
      .send({
        query: `
        mutation JoinRoom($playerId: String!, $roomId: ID!) {
          joinRoom(playerId: $playerId, roomId: $roomId) {
            _id
            name
            gameData {
              players {
                _id
              }
            }
          }
        }`,
        variables: {
          playerId: player1Id,
          roomId: room3Id,
        },
      });
    expect(response.status).to.equal(200);
    expect(response.body.data.joinRoom).to.eql({
      _id: room3Id,
      name: "Basketball Room 3",
      gameData: {
        players: [
          {
            _id: player1Id,
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
          playerId: player1Id,
          roomId: room1Id,
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
          playerId: nonExistentId,
          roomId: room1Id,
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
        }`,
        variables: {
          playerId: player1Id,
          roomId: room2Id,
        },
      });
    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "Invalid room"
    );
  });
});
