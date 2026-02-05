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
import RoomActionQueueModel, {
  RoomActionType,
} from "../../../src/schemas/models/RoomActionQueue";
const { ObjectId } = mongoose.Types;

const submitRoomActionMutation = `
  mutation SubmitRoomAction($roomId: String!, $actionType: String!, $payload: String!, $actionSentAt: Date!) {
    submitRoomAction(roomId: $roomId, actionType: $actionType, payload: $payload, actionSentAt: $actionSentAt)
  }
`;

describe("submit room action", () => {
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

  it(`successfully submits a room action with authentication`, async () => {
    const actionSentAt = new Date();
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: submitRoomActionMutation,
        variables: {
          roomId: roomId,
          actionType: RoomActionType.SEND_MESSAGE,
          payload: JSON.stringify({ message: "Hello World" }),
          actionSentAt: actionSentAt.toISOString(),
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body.data.submitRoomAction).to.equal(true);

    // Verify the action was created in the database
    const actions = await RoomActionQueueModel.find({ roomId: roomId });
    expect(actions).to.have.lengthOf(1);
    expect(actions[0].roomId).to.equal(roomId);
    expect(actions[0].playerId).to.equal(userId);
    expect(actions[0].actionType).to.equal(RoomActionType.SEND_MESSAGE);
    expect(actions[0].payload).to.equal(
      JSON.stringify({ message: "Hello World" })
    );
    expect(actions[0].processedAt).to.be.null;
  });

  it(`submits JOIN_ROOM action`, async () => {
    const actionSentAt = new Date();
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: submitRoomActionMutation,
        variables: {
          roomId: roomId,
          actionType: RoomActionType.JOIN_ROOM,
          payload: JSON.stringify({ playerName: "John" }),
          actionSentAt: actionSentAt.toISOString(),
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body.data.submitRoomAction).to.equal(true);

    const actions = await RoomActionQueueModel.find({ roomId: roomId });
    expect(actions).to.have.lengthOf(1);
    expect(actions[0].actionType).to.equal(RoomActionType.JOIN_ROOM);
  });

  it(`submits LEAVE_ROOM action`, async () => {
    const actionSentAt = new Date();
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: submitRoomActionMutation,
        variables: {
          roomId: roomId,
          actionType: RoomActionType.LEAVE_ROOM,
          payload: JSON.stringify({ reason: "player left" }),
          actionSentAt: actionSentAt.toISOString(),
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body.data.submitRoomAction).to.equal(true);

    const actions = await RoomActionQueueModel.find({ roomId: roomId });
    expect(actions).to.have.lengthOf(1);
    expect(actions[0].actionType).to.equal(RoomActionType.LEAVE_ROOM);
  });

  it(`submits UPDATE_ROOM action`, async () => {
    const actionSentAt = new Date();
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: submitRoomActionMutation,
        variables: {
          roomId: roomId,
          actionType: RoomActionType.UPDATE_ROOM,
          payload: JSON.stringify({ roomName: "New Room Name" }),
          actionSentAt: actionSentAt.toISOString(),
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body.data.submitRoomAction).to.equal(true);

    const actions = await RoomActionQueueModel.find({ roomId: roomId });
    expect(actions).to.have.lengthOf(1);
    expect(actions[0].actionType).to.equal(RoomActionType.UPDATE_ROOM);
  });

  it(`multiple actions can be submitted for the same room`, async () => {
    const actionSentAt1 = new Date();
    const actionSentAt2 = new Date(Date.now() + 1000);

    await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: submitRoomActionMutation,
        variables: {
          roomId: roomId,
          actionType: RoomActionType.SEND_MESSAGE,
          payload: JSON.stringify({ message: "First message" }),
          actionSentAt: actionSentAt1.toISOString(),
        },
      });

    await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: submitRoomActionMutation,
        variables: {
          roomId: roomId,
          actionType: RoomActionType.SEND_MESSAGE,
          payload: JSON.stringify({ message: "Second message" }),
          actionSentAt: actionSentAt2.toISOString(),
        },
      });

    const actions = await RoomActionQueueModel.find({ roomId: roomId });
    expect(actions).to.have.lengthOf(2);
  });

  it(`fails without authentication`, async () => {
    const actionSentAt = new Date();
    const response = await request(app)
      .post("/graphql")
      .send({
        query: submitRoomActionMutation,
        variables: {
          roomId: roomId,
          actionType: RoomActionType.SEND_MESSAGE,
          payload: JSON.stringify({ message: "Hello World" }),
          actionSentAt: actionSentAt.toISOString(),
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body.errors).to.exist;
    expect(response.body.errors[0].message).to.include(
      "Only authenticated users"
    );
  });

  it(`preserves actionSentAt timestamp correctly`, async () => {
    const actionSentAt = new Date("2024-01-15T10:30:00.000Z");
    await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: submitRoomActionMutation,
        variables: {
          roomId: roomId,
          actionType: RoomActionType.SEND_MESSAGE,
          payload: JSON.stringify({ message: "Test" }),
          actionSentAt: actionSentAt.toISOString(),
        },
      });

    const actions = await RoomActionQueueModel.find({ roomId: roomId });
    expect(actions[0].actionSentAt.toISOString()).to.equal(
      actionSentAt.toISOString()
    );
  });
});
