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
import { fullRoomData, UserRole } from "../../../src/schemas/types/types";
import { EducationalRole } from "../../../src/schemas/models/Player";
import RoomModel from "../../../src/schemas/models/Room";
const { ObjectId } = mongoose.Types;

const updatePlayerGameStateDataMutation = `
  mutation UpdatePlayerGameStateData($roomId: String!, $playerId: String!, $newPlayerGameStateData: JSON!) {
    updatePlayerGameStateData(roomId: $roomId, playerId: $playerId, newPlayerGameStateData: $newPlayerGameStateData) {
      ${fullRoomData}
    }
  }
`;

describe("update player game state data", () => {
  let app: Express;

  let userId: string;
  let roomId: string;
  let accessToken: string;

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

  it(`updates player game state data when authenticated`, async () => {
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: updatePlayerGameStateDataMutation,
        variables: {
          roomId: roomId,
          playerId: userId,
          newPlayerGameStateData: {
            test: "test",
          },
        },
      });

    expect(response.status).to.equal(200);
    const roomAfterUpdate = await RoomModel.findOne({ _id: roomId });
    expect(roomAfterUpdate).to.exist;
    expect(
      roomAfterUpdate?.gameData.playersGameStateData[userId].test
    ).to.equal("test");
  });

  it(`fails when user is not authenticated`, async () => {
    const response = await request(app)
      .post("/graphql")
      .send({
        query: updatePlayerGameStateDataMutation,
        variables: {
          roomId: roomId,
          playerId: userId,
          newPlayerGameStateData: {
            test: "test",
          },
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "Error: User Not Found"
    );
  });
});
