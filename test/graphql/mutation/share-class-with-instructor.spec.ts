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
import { room1Id, room2Id } from "../../fixtures/mongodb/data";
import {
  shareClassroomWithInstructorMutation,
  UserRole,
} from "../../../src/schemas/types/types";
import mongoose from "mongoose";
import { EducationalRole } from "../../../src/schemas/models/Player";
import { createClassroom, createUser, getToken } from "../../helpers";
const { ObjectId } = mongoose.Types;

describe("share classroom with instructor", () => {
  let app: Express;

  let classId1: string;
  let instructor1Id: string;
  let instructor2Id: string;
  let instructor1AccessToken: string;
  beforeEach(async () => {
    await mongoUnit.load(require("test/fixtures/mongodb/data-default.js"));
    app = await createApp();
    await appStart();

    classId1 = new ObjectId().toString();
    instructor1Id = new ObjectId().toString();
    instructor1AccessToken = await getToken(
      instructor1Id,
      UserRole.USER,
      EducationalRole.INSTRUCTOR
    );
    instructor2Id = new ObjectId().toString();

    await createUser(instructor1Id, UserRole.USER, EducationalRole.INSTRUCTOR);
    await createUser(instructor2Id, UserRole.USER, EducationalRole.INSTRUCTOR);

    await createClassroom(classId1, instructor1Id);
  });

  afterEach(async () => {
    await appStop();
    await mongoUnit.drop();
  });

  it(`can share an existing classroom with an instructor`, async () => {
    const response1 = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${instructor1AccessToken}`)
      .send({
        query: shareClassroomWithInstructorMutation,
        variables: {
          classId: classId1,
          instructorId: instructor2Id,
        },
      });
    expect(response1.status).to.equal(200);
    expect(response1.body.data.shareClassroomWithInstructor.teacherId).to.eql(
      instructor1Id
    );
    expect(
      response1.body.data.shareClassroomWithInstructor.sharedWithInstructorIds
    ).to.eql([instructor2Id]);
  });
});
