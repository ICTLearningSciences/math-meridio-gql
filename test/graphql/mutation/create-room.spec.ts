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
import mongoose from "mongoose";
import { createUser, createClassroom, getToken } from "../../helpers";
import { UserRole } from "../../../src/schemas/types/types";
import { EducationalRole } from "../../../src/schemas/models/Player";
import RoomModel from "../../../src/schemas/models/Room";
const { ObjectId } = mongoose.Types;

describe("create and join new room", () => {
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

  it(`can create a new room`, async () => {
    const response = await request(app)
      .post("/graphql")
      .send({
        query: `
        mutation CreateAndJoinRoom($playerId: String!, $gameId: String!, $gameName: String!) {
          createAndJoinRoom(playerId: $playerId, gameId: $gameId, gameName: $gameName) {
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
                messageId
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
                roomOwnerId
                discussionDataStringified
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
          gameId: "basketball-2",
          gameName: "Basketball-2",
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body.data.createAndJoinRoom).to.eql({
      name: "Basketball-2 Solution Space 1",
      gameData: {
        gameId: "basketball-2",
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
          curStageId: "",
          curStepId: "",
          roomOwnerId: player1Id,
          discussionDataStringified: "",
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
    });
  });

  it(`fails if non-existent player id`, async () => {
    const response = await request(app)
      .post("/graphql")
      .send({
        query: `
        mutation CreateAndJoinRoom($playerId: String!, $gameId: String!, $gameName: String!) {
          createAndJoinRoom(playerId: $playerId, gameId: $gameId, gameName: $gameName) {
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
                messageId
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
          playerId: nonExistentId,
          gameId: "basketball",
          gameName: "Basketball",
        },
      });
    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "Invalid player"
    );
  });

  it(`can create a new room with a classId`, async () => {
    const instructorUserId = new ObjectId().toString();
    const classId = new ObjectId().toString();

    await createUser(
      instructorUserId,
      UserRole.USER,
      EducationalRole.INSTRUCTOR
    );
    await createClassroom(classId, instructorUserId);

    const response = await request(app)
      .post("/graphql")
      .send({
        query: `
        mutation CreateAndJoinRoom($playerId: String!, $gameId: String!, $gameName: String!, $classId: String) {
          createAndJoinRoom(playerId: $playerId, gameId: $gameId, gameName: $gameName, classId: $classId) {
            _id
            name
            classId
            gameData {
              gameId
              players {
                _id
              }
            }
          }
        }`,
        variables: {
          playerId: player1Id,
          gameId: "basketball-3",
          gameName: "Basketball-3",
          classId: classId,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body.data.createAndJoinRoom).to.have.property("_id");
    expect(response.body.data.createAndJoinRoom.classId).to.equal(classId);
    expect(response.body.data.createAndJoinRoom.name).to.equal(
      "Basketball-3 Solution Space 1"
    );

    // Verify in database
    const room = await RoomModel.findById(
      response.body.data.createAndJoinRoom._id
    );
    expect(room?.classId?.toString()).to.equal(classId);
  });

  it(`fails if classId is invalid`, async () => {
    const invalidClassId = new ObjectId().toString();

    const response = await request(app)
      .post("/graphql")
      .send({
        query: `
        mutation CreateAndJoinRoom($playerId: String!, $gameId: String!, $gameName: String!, $classId: String) {
          createAndJoinRoom(playerId: $playerId, gameId: $gameId, gameName: $gameName, classId: $classId) {
            _id
            name
            classId
            gameData {
              gameId
            }
          }
        }`,
        variables: {
          playerId: player1Id,
          gameId: "basketball-4",
          gameName: "Basketball-4",
          classId: invalidClassId,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "Invalid class"
    );
  });
});
