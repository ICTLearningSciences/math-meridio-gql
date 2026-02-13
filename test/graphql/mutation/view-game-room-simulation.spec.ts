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
import { fullRoomData, UserRole } from "../../../src/schemas/types/types";
import {
  EducationalRole,
  PlayerDocument,
} from "../../../src/schemas/models/Player";
import RoomModel, { Room } from "../../../src/schemas/models/Room";
import { initializeGameRoom } from "../../../src/schemas/mutation/game-room-authoritative/create-new-game-room";
import DiscussionStageModel from "../../../src/schemas/models/DiscussionStage/DiscussionStage";
import { getSimulationViewedKey } from "../../../src/authoritative-server/authority/helpers/helpers";
const { ObjectId } = mongoose.Types;

const viewGameRoomSimulationMutation = `
  mutation ViewGameRoomSimulation($roomId: String!) {
    viewGameRoomSimulation(roomId: $roomId) {
       ${fullRoomData}
    }
  }
`;

describe("view a game room simulation", () => {
  let app: Express;

  let studentAccessToken: string;
  let studentUserId: string;
  let roomId: string;

  beforeEach(async () => {
    await mongoUnit.load(require("test/fixtures/mongodb/data-default.js"));
    app = await createApp();
    await appStart();

    studentUserId = new ObjectId().toString();
    roomId = new ObjectId().toString();

    await createUser(studentUserId, UserRole.USER, EducationalRole.STUDENT);
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

  it(`student can view a game room simulation`, async () => {
    const discussionStages = await DiscussionStageModel.find();
    const newGameRoom = await RoomModel.create(
      initializeGameRoom(studentUserId, "unit-test", "", discussionStages, 0)
    );
    roomId = newGameRoom._id;
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${studentAccessToken}`)
      .send({
        query: viewGameRoomSimulationMutation,
        variables: {
          roomId: roomId,
        },
      });
    expect(response.status).to.equal(200);
    const roomAfterViewingSimulation: Room | null = await RoomModel.findById(
      roomId
    );
    expect(roomAfterViewingSimulation).to.exist;
    expect(
      roomAfterViewingSimulation?.gameData.playersGameStateData[studentUserId][
        getSimulationViewedKey(newGameRoom.gameData.globalStateData.curStageId)
      ]
    ).to.equal("true");
  });

  it(`fails if no access token`, async () => {
    const response = await request(app)
      .post("/graphql")
      .send({
        query: viewGameRoomSimulationMutation,
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
