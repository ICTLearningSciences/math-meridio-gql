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
import {
  getToken,
  createUser,
  createClassroom,
  createClassMembership,
  createRoom,
} from "../../helpers";
import { UserRole } from "../../../src/schemas/types/types";
import { EducationalRole } from "../../../src/schemas/models/Player";
import { ClassMembershipStatus } from "../../../src/schemas/models/classes/ClassMembership";
import RoomModel from "../../../src/schemas/models/Room";
const { ObjectId } = mongoose.Types;

const setNeedsHelpInGameRoomQuery = `
  mutation SetNeedsHelpInGameRoom($roomId: String!, $needsHelp: Boolean!) {
    setNeedsHelpInGameRoom(roomId: $roomId, needsHelp: $needsHelp) {
        _id
        name
        classId
        gameData {
            playersStatusRecord
        }
    }
  }
`;

describe("set needs help in game room", () => {
  let app: Express;

  let instructorUserId: string;
  let instructorAccessToken: string;
  let studentUserId: string;
  let studentAccessToken: string;
  let classId: string;
  let room1Id: string;

  beforeEach(async () => {
    await mongoUnit.load(require("test/fixtures/mongodb/data-default.js"));
    app = await createApp();
    await appStart();

    studentUserId = new ObjectId().toString();
    instructorUserId = new ObjectId().toString();
    classId = new ObjectId().toString();
    room1Id = new ObjectId().toString();

    await createUser(studentUserId, UserRole.USER, EducationalRole.STUDENT);
    await createUser(
      instructorUserId,
      UserRole.USER,
      EducationalRole.INSTRUCTOR
    );
    // Create rooms with the student in them
    await createRoom(room1Id, classId, [studentUserId]);

    studentAccessToken = await getToken(
      studentUserId,
      UserRole.USER,
      EducationalRole.STUDENT
    );
    instructorAccessToken = await getToken(
      instructorUserId,
      UserRole.USER,
      EducationalRole.INSTRUCTOR
    );
  });

  afterEach(async () => {
    await appStop();
    await mongoUnit.drop();
  });

  it(`student can set needs help in game room`, async () => {
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${studentAccessToken}`)
      .send({
        query: setNeedsHelpInGameRoomQuery,
        variables: {
          roomId: room1Id,
          needsHelp: true,
        },
      });
    expect(response.status).to.equal(200);
    expect(
      response.body.data.setNeedsHelpInGameRoom.gameData.playersStatusRecord[
        studentUserId
      ]
    ).to.have.property("needsHelpInRoom", true);
  });
});
