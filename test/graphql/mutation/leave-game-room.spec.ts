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
import PlayerModel from "../../../src/schemas/models/Player";
import { getToken, createUser, createClassroom } from "../../helpers";
import {
  createNewGameRoomMutation,
  fullRoomData,
  leaveGameRoomMutation,
  UserRole,
} from "../../../src/schemas/types/types";
import {
  EducationalRole,
  Player,
  PlayerDocument,
} from "../../../src/schemas/models/Player";
import RoomModel from "../../../src/schemas/models/Room";
import { initializeGameRoom } from "../../../src/schemas/mutation/game-room-authoritative/create-new-game-room";
import DiscussionStageModel from "../../../src/schemas/models/DiscussionStage/DiscussionStage";
import { addPlayerToRoomAtomically } from "../../../src/authoritative-server/authority/step-process-pure-functions";
const { ObjectId } = mongoose.Types;

describe("leave a game room", () => {
  let app: Express;
  let studentUserId: string;
  let studentAccessToken: string;
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

  it(`student can leave a game room`, async () => {
    const discussionStages = await DiscussionStageModel.find();
    const newGameRoom = await RoomModel.create(
      initializeGameRoom(studentUserId, "unit-test", "", discussionStages, 0)
    );
    const player = await PlayerModel.findById(studentUserId);
    if (player) {
      const roomWithStudent = await addPlayerToRoomAtomically(
        newGameRoom,
        player
      );
      roomId = `${roomWithStudent._id}`;
      const response = await request(app)
        .post("/graphql")
        .set("Authorization", `Bearer ${studentAccessToken}`)
        .send({
          query: leaveGameRoomMutation,
          variables: {
            roomId: roomId,
          },
        });
      expect(response.status).to.equal(200);
      expect(response.body.data.leaveGameRoom).to.have.property("_id");
      expect(
        response.body.data.leaveGameRoom.gameData.players.map(
          (player: PlayerDocument) => player._id
        )
      ).to.not.include(studentUserId);
    }
  });
});
