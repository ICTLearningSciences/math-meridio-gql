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
import mongoose from "mongoose";
import { getToken, createUser, createClassroom } from "../../helpers";
import {
  fullRoomData,
  joinGameRoomMutation,
  PlayerComputedState,
  UserRole,
} from "../../../src/schemas/types/types";
import {
  EducationalRole,
  PlayerDocument,
} from "../../../src/schemas/models/Player";
import RoomModel from "../../../src/schemas/models/Room";
import { initializeGameRoom } from "../../../src/schemas/mutation/game-room-authoritative/create-new-game-room";
import DiscussionStageModel from "../../../src/schemas/models/DiscussionStage/DiscussionStage";
const { ObjectId } = mongoose.Types;

describe("join a game room", () => {
  let app: Express;

  let instructorUserId: string;
  let instructorAccessToken: string;
  let studentAccessToken: string;
  let studentUserId: string;
  let roomId: string;

  beforeEach(async () => {
    await mongoUnit.load(require("test/fixtures/mongodb/data-default.js"));
    app = await createApp();
    await appStart();

    instructorUserId = new ObjectId().toString();
    studentUserId = new ObjectId().toString();
    roomId = new ObjectId().toString();

    await createUser(studentUserId, UserRole.USER, EducationalRole.STUDENT);
    await createUser(
      instructorUserId,
      UserRole.USER,
      EducationalRole.INSTRUCTOR
    );
    instructorAccessToken = await getToken(
      instructorUserId,
      UserRole.USER,
      EducationalRole.INSTRUCTOR
    );
    studentAccessToken = await getToken(
      studentUserId,
      UserRole.USER,
      EducationalRole.STUDENT
    );
  });

  afterEach(async () => {
    await appStop();
    await mongoUnit.drop();
  });

  it(`student can join a game room`, async () => {
    const discussionStages = await DiscussionStageModel.find();
    const newGameRoom = await RoomModel.create(
      initializeGameRoom(studentUserId, "unit-test", "", discussionStages, 0)
    );
    roomId = `${newGameRoom._id}`;
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${studentAccessToken}`)
      .send({
        query: joinGameRoomMutation,
        variables: {
          roomId: roomId,
        },
      });
    expect(response.status).to.equal(200);
    expect(response.body.data.joinGameRoom).to.have.property("_id");
    expect(
      response.body.data.joinGameRoom.gameData.players.map(
        (player: PlayerDocument) => player._id
      )
    ).to.include(studentUserId);

    expect(
      response.body.data.joinGameRoom.gameData.playersStatusRecord[
        studentUserId
      ]
    ).to.exist;
    expect(
      response.body.data.joinGameRoom.gameData.playersStatusRecord[
        studentUserId
      ].computedState
    ).to.equal(PlayerComputedState.ACTIVE);
  });

  it(`fails if no access token`, async () => {
    const response = await request(app)
      .post("/graphql")
      .send({
        query: joinGameRoomMutation,
        variables: {
          roomId: roomId,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "Error: User Not Found"
    );
  });
});
