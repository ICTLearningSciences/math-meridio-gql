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
import mongoose from "mongoose";
import {
  createUser,
  createClassroom,
  createClassMembership,
  createRoom,
} from "../../helpers";
import { UserRole } from "../../../src/schemas/types/types";
import { EducationalRole } from "../../../src/schemas/models/Player";
import { ClassMembershipStatus } from "../../../src/schemas/models/classes/ClassMembership";
const { ObjectId } = mongoose.Types;

export const smallJoinRoomQuery = `
  mutation JoinRoom($playerId: String!, $roomId: ID!) {
    joinRoom(playerId: $playerId, roomId: $roomId) {
              _id
            name
            classId
            gameData {
              players {
                _id
              }
            }
    }
  }
`;

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

  it(`can join a room with no class attached`, async () => {
    const studentUserId = new ObjectId().toString();
    const roomId = new ObjectId().toString();

    await createUser(studentUserId, UserRole.USER, EducationalRole.STUDENT);
    await createRoom(roomId, undefined, []); // No classId

    const response = await request(app)
      .post("/graphql")
      .send({
        query: smallJoinRoomQuery,
        variables: {
          playerId: studentUserId,
          roomId: roomId,
        },
      });

    console.log(JSON.stringify(response.body, null, 2));
    expect(response.status).to.equal(200);
    expect(response.body.data.joinRoom).to.have.property("_id");
    expect(response.body.data.joinRoom.gameData.players).to.have.lengthOf(1);
    expect(response.body.data.joinRoom.gameData.players[0]._id).to.equal(
      studentUserId
    );
  });

  it(`can join a room with a class if user is a MEMBER`, async () => {
    const instructorUserId = new ObjectId().toString();
    const studentUserId = new ObjectId().toString();
    const classId = new ObjectId().toString();
    const roomId = new ObjectId().toString();

    await createUser(
      instructorUserId,
      UserRole.USER,
      EducationalRole.INSTRUCTOR
    );
    await createUser(studentUserId, UserRole.USER, EducationalRole.STUDENT);
    await createClassroom(classId, instructorUserId);
    await createClassMembership(
      classId,
      studentUserId,
      ClassMembershipStatus.MEMBER
    );
    await createRoom(roomId, classId, []);

    const response = await request(app)
      .post("/graphql")
      .send({
        query: smallJoinRoomQuery,
        variables: {
          playerId: studentUserId,
          roomId: roomId,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body.data.joinRoom).to.have.property("_id");
    expect(response.body.data.joinRoom.classId).to.equal(classId);
    expect(response.body.data.joinRoom.gameData.players).to.have.lengthOf(1);
    expect(response.body.data.joinRoom.gameData.players[0]._id).to.equal(
      studentUserId
    );
  });

  it(`fails if room has a class and user is not a member`, async () => {
    const instructorUserId = new ObjectId().toString();
    const studentUserId = new ObjectId().toString();
    const classId = new ObjectId().toString();
    const roomId = new ObjectId().toString();

    await createUser(
      instructorUserId,
      UserRole.USER,
      EducationalRole.INSTRUCTOR
    );
    await createUser(studentUserId, UserRole.USER, EducationalRole.STUDENT);
    await createClassroom(classId, instructorUserId);
    // No class membership created
    await createRoom(roomId, classId, []);

    const response = await request(app)
      .post("/graphql")
      .send({
        query: smallJoinRoomQuery,
        variables: {
          playerId: studentUserId,
          roomId: roomId,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "User is not a member of this class"
    );
  });

  it(`fails if room has a class and user is BLOCKED`, async () => {
    const instructorUserId = new ObjectId().toString();
    const studentUserId = new ObjectId().toString();
    const classId = new ObjectId().toString();
    const roomId = new ObjectId().toString();

    await createUser(
      instructorUserId,
      UserRole.USER,
      EducationalRole.INSTRUCTOR
    );
    await createUser(studentUserId, UserRole.USER, EducationalRole.STUDENT);
    await createClassroom(classId, instructorUserId);
    await createClassMembership(
      classId,
      studentUserId,
      ClassMembershipStatus.BLOCKED
    );
    await createRoom(roomId, classId, []);

    const response = await request(app)
      .post("/graphql")
      .send({
        query: smallJoinRoomQuery,
        variables: {
          playerId: studentUserId,
          roomId: roomId,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "User is not a member of this class"
    );
  });

  it(`fails if room has a class and user is REMOVED`, async () => {
    const instructorUserId = new ObjectId().toString();
    const studentUserId = new ObjectId().toString();
    const classId = new ObjectId().toString();
    const roomId = new ObjectId().toString();

    await createUser(
      instructorUserId,
      UserRole.USER,
      EducationalRole.INSTRUCTOR
    );
    await createUser(studentUserId, UserRole.USER, EducationalRole.STUDENT);
    await createClassroom(classId, instructorUserId);
    await createClassMembership(
      classId,
      studentUserId,
      ClassMembershipStatus.REMOVED
    );
    await createRoom(roomId, classId, []);

    const response = await request(app)
      .post("/graphql")
      .send({
        query: smallJoinRoomQuery,
        variables: {
          playerId: studentUserId,
          roomId: roomId,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "User is not a member of this class"
    );
  });
});
