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
import { createUser, createRoom, getToken } from "../../helpers";
import { UserRole } from "../../../src/schemas/types/types";
import { EducationalRole } from "../../../src/schemas/models/Player";
import RoomActionQueueModel from "../../../src/schemas/models/RoomActionQueue";
const { ObjectId } = mongoose.Types;

const submitProcessedActionsMutation = `
  mutation SubmitProcessedActions($processedActionIds: [String]) {
    submitProcessedActions(processedActionIds: $processedActionIds)
  }
`;

describe("submit processed actions", () => {
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

  it(`updates processedAt field for single action`, async () => {
    const action = await RoomActionQueueModel.create({
      roomId: roomId,
      playerId: userId,
      actionType: "SEND_MESSAGE",
      payload: JSON.stringify({ message: "Test message" }),
      actionSentAt: new Date(),
      processedAt: null,
    });

    expect(action.processedAt).to.be.null;

    const beforeUpdate = new Date();

    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: submitProcessedActionsMutation,
        variables: {
          processedActionIds: [action._id.toString()],
        },
      });

    console.log(JSON.stringify(response.body, null, 2));

    expect(response.status).to.equal(200);
    expect(response.body.data.submitProcessedActions).to.equal(true);

    const updatedAction = await RoomActionQueueModel.findById(action._id);
    expect(updatedAction?.processedAt).to.not.be.null;
    expect(updatedAction?.processedAt).to.be.instanceof(Date);
    expect(updatedAction?.processedAt.getTime()).to.be.at.least(
      beforeUpdate.getTime()
    );
  });

  it(`updates processedAt field for multiple actions`, async () => {
    const action1 = await RoomActionQueueModel.create({
      roomId: roomId,
      playerId: userId,
      actionType: "SEND_MESSAGE",
      payload: JSON.stringify({ message: "First message" }),
      actionSentAt: new Date(),
      processedAt: null,
    });

    const action2 = await RoomActionQueueModel.create({
      roomId: roomId,
      playerId: userId,
      actionType: "SEND_MESSAGE",
      payload: JSON.stringify({ message: "Second message" }),
      actionSentAt: new Date(),
      processedAt: null,
    });

    const action3 = await RoomActionQueueModel.create({
      roomId: roomId,
      playerId: userId,
      actionType: "JOIN_ROOM",
      payload: JSON.stringify({ action: "join" }),
      actionSentAt: new Date(),
      processedAt: null,
    });

    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: submitProcessedActionsMutation,
        variables: {
          processedActionIds: [
            action1._id.toString(),
            action2._id.toString(),
            action3._id.toString(),
          ],
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body.data.submitProcessedActions).to.equal(true);

    const updatedAction1 = await RoomActionQueueModel.findById(action1._id);
    const updatedAction2 = await RoomActionQueueModel.findById(action2._id);
    const updatedAction3 = await RoomActionQueueModel.findById(action3._id);

    expect(updatedAction1?.processedAt).to.not.be.null;
    expect(updatedAction2?.processedAt).to.not.be.null;
    expect(updatedAction3?.processedAt).to.not.be.null;
  });

  it(`only updates specified actions`, async () => {
    const action1 = await RoomActionQueueModel.create({
      roomId: roomId,
      playerId: userId,
      actionType: "SEND_MESSAGE",
      payload: JSON.stringify({ message: "Process this" }),
      actionSentAt: new Date(),
      processedAt: null,
    });

    const action2 = await RoomActionQueueModel.create({
      roomId: roomId,
      playerId: userId,
      actionType: "SEND_MESSAGE",
      payload: JSON.stringify({ message: "Don't process this" }),
      actionSentAt: new Date(),
      processedAt: null,
    });

    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: submitProcessedActionsMutation,
        variables: {
          processedActionIds: [action1._id.toString()],
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body.data.submitProcessedActions).to.equal(true);

    const updatedAction1 = await RoomActionQueueModel.findById(action1._id);
    const updatedAction2 = await RoomActionQueueModel.findById(action2._id);

    expect(updatedAction1?.processedAt).to.not.be.null;
    expect(updatedAction2?.processedAt).to.be.null;
  });

  it(`preserves other fields when updating processedAt`, async () => {
    const actionSentAt = new Date("2024-01-15T10:30:00.000Z");
    const payload = JSON.stringify({ message: "Important message" });

    const action = await RoomActionQueueModel.create({
      roomId: roomId,
      playerId: userId,
      actionType: "UPDATE_ROOM",
      payload: payload,
      actionSentAt: actionSentAt,
      processedAt: null,
    });

    await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: submitProcessedActionsMutation,
        variables: {
          processedActionIds: [action._id.toString()],
        },
      });

    const updatedAction = await RoomActionQueueModel.findById(action._id);
    expect(updatedAction?.roomId).to.equal(roomId);
    expect(updatedAction?.playerId).to.equal(userId);
    expect(updatedAction?.actionType).to.equal("UPDATE_ROOM");
    expect(updatedAction?.payload).to.equal(payload);
    expect(updatedAction?.actionSentAt.toISOString()).to.equal(
      actionSentAt.toISOString()
    );
    expect(updatedAction?.processedAt).to.not.be.null;
  });
});
