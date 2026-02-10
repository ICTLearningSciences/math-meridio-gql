/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import createApp, { appStart, appStop } from "../../../src/app";
import { expect } from "chai";
import { Express } from "express";
import mongoUnit from "mongo-unit";
import request from "supertest";
import mongoose from "mongoose";
import { getToken, createUser, createClassroom } from "../../helpers";
import { UserRole } from "../../../src/schemas/types/types";
import { EducationalRole } from "../../../src/schemas/models/Player";
import RoomModel from "../../../src/schemas/models/Room";
const { ObjectId } = mongoose.Types;

const createNewRoomMutation = `
  mutation CreateNewRoom($gameId: String!, $gameName: String!, $classId: String) {
    createNewRoom(gameId: $gameId, gameName: $gameName, classId: $classId) {
      _id
      name
      classId
      gameData {
        gameId
        players {
          _id
        }
        chat {
          message
        }
        persistTruthGlobalStateData
        playerStateData {
          player
          animation
          gameStateData {
            key
            value
          }
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
      }
      deletedRoom
    }
  }
`;

describe("create new room", () => {
  let app: Express;

  let userId: string;
  let classId: string;
  let accessToken: string;

  beforeEach(async () => {
    await mongoUnit.load(require("test/fixtures/mongodb/data-default.js"));
    app = await createApp();
    await appStart();

    userId = new ObjectId().toString();
    classId = new ObjectId().toString();

    await createUser(userId, UserRole.USER, EducationalRole.STUDENT);
    await createClassroom(classId, userId);

    accessToken = await getToken(
      userId,
      UserRole.USER,
      EducationalRole.STUDENT
    );
  });

  afterEach(async () => {
    await appStop();
    await mongoUnit.drop();
  });

  it(`successfully creates a room without classId`, async () => {
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: createNewRoomMutation,
        variables: {
          gameId: "game123",
          gameName: "Math Challenge",
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body.data.createNewRoom).to.exist;
    expect(response.body.data.createNewRoom._id).to.exist;
    expect(response.body.data.createNewRoom.name).to.equal(
      "Math Challenge Solution Space 1"
    );
    expect(response.body.data.createNewRoom.classId).to.be.null;
    expect(response.body.data.createNewRoom.deletedRoom).to.equal(false);

    const room = await RoomModel.findById(response.body.data.createNewRoom._id);
    expect(room).to.exist;
    expect(room?.name).to.equal("Math Challenge Solution Space 1");
  });

  it(`successfully creates a room with a valid classId`, async () => {
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: createNewRoomMutation,
        variables: {
          gameId: "game123",
          gameName: "Math Challenge",
          classId: classId,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body.data.createNewRoom).to.exist;
    expect(response.body.data.createNewRoom._id).to.exist;
    expect(response.body.data.createNewRoom.name).to.equal(
      "Math Challenge Solution Space 1"
    );
    expect(response.body.data.createNewRoom.classId).to.equal(classId);
    expect(response.body.data.createNewRoom.deletedRoom).to.equal(false);
    expect(response.body.data.createNewRoom.gameData).to.exist;
    expect(response.body.data.createNewRoom.gameData).to.deep.equal({
      gameId: "game123",
      players: [],
      chat: [],
      persistTruthGlobalStateData: [],
      playerStateData: [],
      globalStateData: {
        curStageId: "",
        curStepId: "",
        roomOwnerId: userId,
        discussionDataStringified: "",
        gameStateData: [],
      },
    });

    const room = await RoomModel.findById(response.body.data.createNewRoom._id);
    expect(room).to.exist;
    expect(room?.classId?.toString()).to.equal(classId);
  });

  it(`fails when user is not authenticated`, async () => {
    const response = await request(app)
      .post("/graphql")
      .send({
        query: createNewRoomMutation,
        variables: {
          gameId: "game123",
          gameName: "Math Challenge",
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body.errors).to.exist;
    expect(response.body.errors[0].message).to.include("Unauthorized");
  });

  it(`fails when classId is invalid`, async () => {
    const invalidClassId = new ObjectId().toString();

    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: createNewRoomMutation,
        variables: {
          gameId: "game123",
          gameName: "Math Challenge",
          classId: invalidClassId,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body.errors).to.exist;
    expect(response.body.errors[0].message).to.include("Invalid class");
  });

  it(`creates room with empty gameData object`, async () => {
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: createNewRoomMutation,
        variables: {
          gameId: "testGame",
          gameName: "Test Game",
        },
      });

    expect(response.status).to.equal(200);

    const room = await RoomModel.findById(response.body.data.createNewRoom._id);
    expect(room?.gameData).to.exist;
  });
});
