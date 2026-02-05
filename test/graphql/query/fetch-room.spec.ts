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
import { nonExistentId, player1Id } from "../../fixtures/mongodb/data";
import { room1Id } from "../../fixtures/mongodb/data";
import { UserRole } from "../../../src/schemas/types/types";
import { EducationalRole } from "../../../src/schemas/models/Player";
import { getToken } from "../../helpers";

describe("fetch room", () => {
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

  it(`can fetch existing room by id`, async () => {
    const token = await getToken(
      player1Id,
      UserRole.USER,
      EducationalRole.STUDENT
    );
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send({
        query: `
        query FetchRoom($roomId: ID!) {
          fetchRoom(roomId: $roomId) {
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
            deletedRoom
          }
        }`,
        variables: {
          roomId: room1Id,
        },
      });
    expect(response.status).to.equal(200);
    expect(response.body.data.fetchRoom).to.eql({
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
                value: "Player variable 1 value",
              },
            ],
          },
        ],
      },
      deletedRoom: false,
    });
  });

  it(`no room with id`, async () => {
    const response = await request(app)
      .post("/graphql")
      .send({
        query: `
        query FetchRoom($roomId: ID!) {
          fetchRoom(roomId: $roomId) {
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
            },
            deletedRoom
              
          }
        }`,
        variables: {
          roomId: nonExistentId,
          deletedRoom: false,
        },
      });
    expect(response.status).to.equal(200);
    expect(response.body.data.fetchRoom).to.eql(null);
  });

  it(`updates heart beat for a player in an existing room`, async () => {
    const token = await getToken(
      player1Id,
      UserRole.USER,
      EducationalRole.STUDENT
    );
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send({
        query: `
        query FetchRoom($roomId: ID!) {
          fetchRoom(roomId: $roomId) {
            gameData {
              gameId
              heartBeats {
                player
                timestamp
              }
            }
          }
        }`,
        variables: {
          roomId: room1Id,
        },
      });
    expect(response.status).to.equal(200);
    const heartBeats = response.body.data.fetchRoom.gameData.heartBeats;
    const myHeartBeat = heartBeats.find(
      (heartBeat: { player: string; timestamp: string }) =>
        heartBeat.player === player1Id
    );
    expect(myHeartBeat).to.not.be.undefined;
    expect(myHeartBeat.timestamp).to.not.be.null;
    const tenSecondsAgo = new Date(Date.now() - 10000);
    expect(new Date(myHeartBeat.timestamp)).to.be.greaterThan(tenSecondsAgo);
  });
});
