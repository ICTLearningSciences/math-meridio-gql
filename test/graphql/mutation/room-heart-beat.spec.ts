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
import RoomHeartBeatModel from "../../../src/schemas/models/RoomHeartBeat";
const { ObjectId } = mongoose.Types;

const roomHeartBeatMutation = `
  mutation RoomHeartBeat($roomId: ID!) {
    roomHeartBeat(roomId: $roomId) {
      roomId
      userId
      lastHeartBeatAt
    }
  }
`;

describe("room heart beat", () => {
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

  it(`creates or updates heartbeat when authenticated`, async () => {
    const beforeRequest = new Date();

    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: roomHeartBeatMutation,
        variables: {
          roomId: roomId,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body.data.roomHeartBeat).to.exist;
    expect(response.body.data.roomHeartBeat.roomId).to.equal(roomId);
    expect(response.body.data.roomHeartBeat.userId).to.equal(userId);
    expect(response.body.data.roomHeartBeat.lastHeartBeatAt).to.exist;

    const heartbeat = await RoomHeartBeatModel.findOne({
      roomId: roomId,
      userId: userId,
    });
    expect(heartbeat).to.exist;
    expect(heartbeat?.lastHeartBeatAt).to.be.instanceof(Date);
    expect(heartbeat?.lastHeartBeatAt.getTime()).to.be.at.least(
      beforeRequest.getTime()
    );
  });

  it(`fails when user is not authenticated`, async () => {
    const response = await request(app)
      .post("/graphql")
      .send({
        query: roomHeartBeatMutation,
        variables: {
          roomId: roomId,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body.errors).to.exist;
    expect(response.body.errors[0].message).to.include("Unauthorized");
  });
});
