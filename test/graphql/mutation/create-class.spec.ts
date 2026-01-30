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
import { nonExistentId, player1Id } from "../../fixtures/mongodb/data";
import mongoose from "mongoose";
import { getToken, createUser, createClassroom } from "../../helpers";
import { UserRole } from "../../../src/schemas/types/types";
import { EducationalRole } from "../../../src/schemas/models/Player";
const { ObjectId } = mongoose.Types;

const createClassroomQuery = `
  mutation CreateClassroom {
    createClassroom {
        _id
        name
        teacherId
        inviteCodes {
            code
            validUntil
            maxUses
            uses
        }
    }
  }
`;

describe("create a new classroom", () => {
  let app: Express;

  let instructorUserId: string;
  let instructorAccessToken: string;
  let studentAccessToken: string;
  let studentUserId: string;
  let classId: string;

  beforeEach(async () => {
    await mongoUnit.load(require("test/fixtures/mongodb/data-default.js"));
    app = await createApp();
    await appStart();

    instructorUserId = new ObjectId().toString();
    studentUserId = new ObjectId().toString();
    classId = new ObjectId().toString();

    await createUser(studentUserId, UserRole.USER, EducationalRole.STUDENT);
    await createUser(
      instructorUserId,
      UserRole.USER,
      EducationalRole.INSTRUCTOR
    );
    instructorAccessToken = await getToken(
      instructorUserId,
      UserRole.USER,
      EducationalRole.INSTRUCTOR
    );
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

  it(`instructor can create a new classroom`, async () => {
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${instructorAccessToken}`)
      .send({
        query: createClassroomQuery,
      });
    console.log(JSON.stringify(response.body, null, 2));
    expect(response.status).to.equal(200);
    expect(response.body.data.createClassroom).to.have.property("_id");
    expect(response.body.data.createClassroom.teacherId).to.equal(
      instructorUserId
    );
  });

  it(`fails if requesting user is not an instructor`, async () => {
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${studentAccessToken}`)
      .send({
        query: createClassroomQuery,
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "Error: User is not an instructor"
    );
  });
});
