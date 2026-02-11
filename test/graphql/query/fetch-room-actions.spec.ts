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

describe("fetch room actions", () => {
  let app: Express;

  let userId1: string;
  let userId2: string;
  let roomId1: string;
  let roomId2: string;
  let accessToken: string;

  beforeEach(async () => {
    await mongoUnit.load(require("test/fixtures/mongodb/data-default.js"));
    app = await createApp();
    await appStart();

    userId1 = new ObjectId().toString();
    userId2 = new ObjectId().toString();
    roomId1 = new ObjectId().toString();
    roomId2 = new ObjectId().toString();

    await createUser(userId1, UserRole.USER, EducationalRole.STUDENT);
    await createUser(userId2, UserRole.USER, EducationalRole.STUDENT);
    await createRoom(roomId1, undefined, [userId1]);
    await createRoom(roomId2, undefined, [userId2]);

    accessToken = await getToken(
      userId1,
      UserRole.USER,
      EducationalRole.STUDENT
    );
  });

  afterEach(async () => {
    await appStop();
    await mongoUnit.drop();
  });

  it(`can fetch by roomId and unprocessed status`, async () => {
    const now = new Date();
    await RoomActionQueueModel.create([
      {
        roomId: roomId1,
        playerId: userId1,
        actionType: "SEND_MESSAGE",
        payload: JSON.stringify({ message: "Room1 unprocessed" }),
        actionSentAt: now,
        processedAt: null,
      },
      {
        roomId: roomId1,
        playerId: userId1,
        actionType: "SEND_MESSAGE",
        payload: JSON.stringify({ message: "Room1 processed" }),
        actionSentAt: now,
        processedAt: new Date(),
      },
      {
        roomId: roomId2,
        playerId: userId2,
        actionType: "SEND_MESSAGE",
        payload: JSON.stringify({ message: "Room2 unprocessed" }),
        actionSentAt: now,
        processedAt: null,
      },
    ]);

    const filter = encodeURI(
      JSON.stringify({ roomId: roomId1, processedAt: null })
    );
    const response = await request(app)
      .post("/graphql")
      .send({
        query: `query FetchRoomActions($filter: String!, $limit: Int) {
          fetchRoomActions(filter: $filter, limit: $limit) {
            edges {
              node {
                _id
                roomId
                playerId
                actionType
                payload
                processedAt
              }
            }
          }
        }`,
        variables: {
          filter: filter,
          limit: 100,
        },
      });
    expect(response.status).to.equal(200);
    expect(response.body.data.fetchRoomActions.edges).to.have.lengthOf(1);
    expect(response.body.data.fetchRoomActions.edges[0].node.roomId).to.equal(
      roomId1
    );
    expect(response.body.data.fetchRoomActions.edges[0].node._id).to.exist;
    expect(response.body.data.fetchRoomActions.edges[0].node.payload).to.equal(
      JSON.stringify({ message: "Room1 unprocessed" })
    );
    expect(response.body.data.fetchRoomActions.edges[0].node.processedAt).to.be
      .null;
  });

  it(`returns multiple room actions in order`, async () => {
    const now = new Date();
    await RoomActionQueueModel.create([
      {
        roomId: roomId1,
        playerId: userId1,
        actionType: "JOIN_ROOM",
        payload: JSON.stringify({ action: "join" }),
        actionSentAt: new Date(now.getTime() - 2000),
        processedAt: null,
      },
      {
        roomId: roomId1,
        playerId: userId1,
        actionType: "SEND_MESSAGE",
        payload: JSON.stringify({ message: "First message" }),
        actionSentAt: new Date(now.getTime() - 1000),
        processedAt: null,
      },
      {
        roomId: roomId1,
        playerId: userId1,
        actionType: "SEND_MESSAGE",
        payload: JSON.stringify({ message: "Second message" }),
        actionSentAt: now,
        processedAt: null,
      },
    ]);

    const filter = encodeURI(JSON.stringify({ roomId: roomId1 }));
    const response = await request(app)
      .post("/graphql")
      .send({
        query: `query {
          fetchRoomActions(filter: "${filter}") {
            edges {
              node {
                actionType
                payload
                actionSentAt
              }
            }
          }
        }`,
      });

    expect(response.status).to.equal(200);
    expect(response.body.data.fetchRoomActions.edges).to.have.lengthOf(3);
  });

  it(`returns empty list when no actions match filter`, async () => {
    await RoomActionQueueModel.create({
      roomId: roomId1,
      playerId: userId1,
      actionType: "SEND_MESSAGE",
      payload: JSON.stringify({ message: "Test" }),
      actionSentAt: new Date(),
      processedAt: null,
    });

    const nonExistentRoomId = new ObjectId().toString();
    const filter = encodeURI(JSON.stringify({ roomId: nonExistentRoomId }));
    const response = await request(app)
      .post("/graphql")
      .send({
        query: `query {
          fetchRoomActions(filter: "${filter}") {
            edges {
              node {
                roomId
              }
            }
          }
        }`,
      });

    expect(response.status).to.equal(200);
    expect(response.body.data.fetchRoomActions.edges).to.have.lengthOf(0);
  });
});
