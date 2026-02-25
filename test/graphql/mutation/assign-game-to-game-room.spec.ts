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
import { getToken, createUser, createRoom } from "../../helpers";
import { UserRole } from "../../../src/schemas/types/types";
import { EducationalRole } from "../../../src/schemas/models/Player";
import RoomModel from "../../../src/schemas/models/Room";
const { ObjectId } = mongoose.Types;

const assignGameToGameRoomMutation = `
  mutation AssignGameToGameRoom($roomId: String!, $gameId: String!) {
    assignGameToGameRoom(roomId: $roomId, gameId: $gameId) {
      _id
      name
      gameData {
        gameId
        persistTruthGlobalStateData
        globalStateData {
          curStageId
          curStepId
        }
      }
    }
  }
`;

describe("assign game to game room", () => {
  let app: Express;

  let userId: string;
  let accessToken: string;
  let roomId: string;

  beforeEach(async () => {
    await mongoUnit.load(require("test/fixtures/mongodb/data-default.js"));
    app = await createApp();
    await appStart();

    userId = new ObjectId().toString();
    roomId = new ObjectId().toString();

    await createUser(userId, UserRole.USER, EducationalRole.STUDENT);
    await createRoom(roomId, undefined, [userId]);

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

  it(`successfully assigns a game to a game room`, async () => {
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: assignGameToGameRoomMutation,
        variables: {
          roomId: roomId,
          gameId: "unit-test",
        },
      });
    expect(response.status).to.equal(200);
    expect(response.body.data.assignGameToGameRoom).to.have.property("_id");
    expect(response.body.data.assignGameToGameRoom._id).to.equal(roomId);
    expect(response.body.data.assignGameToGameRoom.gameData.gameId).to.equal(
      "unit-test"
    );
    expect(
      response.body.data.assignGameToGameRoom.gameData
        .persistTruthGlobalStateData
    ).to.exist;
    expect(
      response.body.data.assignGameToGameRoom.gameData.globalStateData
        .curStageId
    ).to.exist;
    expect(
      response.body.data.assignGameToGameRoom.gameData.globalStateData.curStepId
    ).to.exist;

    // Verify in database
    const room = await RoomModel.findById(roomId);
    expect(room?.gameData.gameId).to.equal("unit-test");
    expect(room?.gameData.persistTruthGlobalStateData).to.exist;
    expect(room?.gameData.globalStateData.curStageId).to.exist;
    expect(room?.gameData.globalStateData.curStepId).to.exist;
  });

  it(`successfully assigns a different game to an existing room that already has a game`, async () => {
    // First assign unit-test game
    await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: assignGameToGameRoomMutation,
        variables: {
          roomId: roomId,
          gameId: "unit-test",
        },
      });

    // Then assign unit-test-multiple-users game
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: assignGameToGameRoomMutation,
        variables: {
          roomId: roomId,
          gameId: "unit-test-multiple-users",
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body.data.assignGameToGameRoom.gameData.gameId).to.equal(
      "unit-test-multiple-users"
    );

    // Verify in database that the game was updated
    const room = await RoomModel.findById(roomId);
    expect(room?.gameData.gameId).to.equal("unit-test-multiple-users");
    expect(room?.gameData.persistTruthGlobalStateData).to.exist;
    expect(room?.gameData.globalStateData.curStageId).to.exist;
    expect(room?.gameData.globalStateData.curStepId).to.exist;
  });

  it(`verifies game data structure is correctly set after assignment`, async () => {
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: assignGameToGameRoomMutation,
        variables: {
          roomId: roomId,
          gameId: "unit-test",
        },
      });

    expect(response.status).to.equal(200);

    // Verify in database with deep structure check
    const room = await RoomModel.findById(roomId);
    expect(room?.gameData).to.exist;
    expect(room?.gameData.gameId).to.equal("unit-test");
    expect(room?.gameData.persistTruthGlobalStateData).to.be.an("array");
    expect(room?.gameData.globalStateData).to.exist;
    expect(room?.gameData.globalStateData.curStageId).to.be.a("string");
    expect(room?.gameData.globalStateData.curStageId).to.not.be.empty;
    expect(room?.gameData.globalStateData.curStepId).to.be.a("string");
    expect(room?.gameData.globalStateData.curStepId).to.not.be.empty;
  });

  it(`fails when room does not exist`, async () => {
    const nonExistentRoomId = new ObjectId().toString();

    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: assignGameToGameRoomMutation,
        variables: {
          roomId: nonExistentRoomId,
          gameId: "unit-test",
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "Error: Room not found"
    );
  });

  it(`fails when game ID is invalid`, async () => {
    const invalidGameId = "non-existent-game";

    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: assignGameToGameRoomMutation,
        variables: {
          roomId: roomId,
          gameId: invalidGameId,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      `Error: Game not found: ${invalidGameId}`
    );
  });
});
