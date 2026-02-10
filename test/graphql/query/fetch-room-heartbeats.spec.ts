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
import { createUser, createRoom } from "../../helpers";
import { UserRole } from "../../../src/schemas/types/types";
import { EducationalRole } from "../../../src/schemas/models/Player";
import RoomHeartBeatModel from "../../../src/schemas/models/RoomHeartBeat";
const { ObjectId } = mongoose.Types;

describe("fetch room heartbeats", () => {
  let app: Express;

  let userId1: string;
  let userId2: string;
  let roomId1: string;
  let roomId2: string;

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
  });

  afterEach(async () => {
    await appStop();
    await mongoUnit.drop();
  });

  it(`fetches existing room heartbeats`, async () => {
    await RoomHeartBeatModel.create({
      roomId: roomId1,
      userId: userId1,
      lastHeartBeatAt: new Date(),
    });

    const response = await request(app)
      .post("/graphql")
      .send({
        query: `query {
          fetchRoomHeartbeats {
            edges {
              node {
                roomId
                userId
                lastHeartBeatAt
              }
            }
          }
        }`,
      });

    expect(response.status).to.equal(200);
    expect(response.body.data.fetchRoomHeartbeats.edges).to.have.lengthOf(1);
    expect(
      response.body.data.fetchRoomHeartbeats.edges[0].node.roomId
    ).to.equal(roomId1);
    expect(
      response.body.data.fetchRoomHeartbeats.edges[0].node.userId
    ).to.equal(userId1);
    expect(response.body.data.fetchRoomHeartbeats.edges[0].node.lastHeartBeatAt)
      .to.exist;
  });

  it(`can filter heartbeats by roomId`, async () => {
    await RoomHeartBeatModel.create([
      {
        roomId: roomId1,
        userId: userId1,
        lastHeartBeatAt: new Date(),
      },
      {
        roomId: roomId2,
        userId: userId2,
        lastHeartBeatAt: new Date(),
      },
    ]);

    const filter = encodeURI(JSON.stringify({ roomId: roomId1 }));
    const response = await request(app)
      .post("/graphql")
      .send({
        query: `query FetchRoomHeartbeats($filter: String!) {
          fetchRoomHeartbeats(filter: $filter) {
            edges {
              node {
                roomId
                userId
              }
            }
          }
        }`,
        variables: {
          filter: filter,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body.data.fetchRoomHeartbeats.edges).to.have.lengthOf(1);
    expect(
      response.body.data.fetchRoomHeartbeats.edges[0].node.roomId
    ).to.equal(roomId1);
  });
});
