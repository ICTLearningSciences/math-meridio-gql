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
import { getToken, createUser, createClassroom } from "../../helpers";
import { UserRole } from "../../../src/schemas/types/types";
import { EducationalRole } from "../../../src/schemas/models/Player";
import ClassMembershipModel from "../../../src/schemas/models/classes/ClassMembership";
const { ObjectId } = mongoose.Types;

const createClassMembershipQuery = `
  mutation CreateClassMembership($classId: String!, $userEmail: String!) {
    createClassMembership(classId: $classId, userEmail: $userEmail) {
      classId
      userId
      userEmail
      status
    }
  }
`;

describe("create a class membership", () => {
  let app: Express;

  let instructorUserId: string;
  let studentUserId: string;
  let instructorAccessToken: string;
  let studentAccessToken: string;
  let classId: string;

  beforeEach(async () => {
    await mongoUnit.load(require("test/fixtures/mongodb/data-default.js"));
    app = await createApp();
    await appStart();

    instructorUserId = new ObjectId().toString();
    studentUserId = new ObjectId().toString();
    classId = new ObjectId().toString();

    await createUser(
      studentUserId,
      UserRole.USER,
      EducationalRole.STUDENT,
      "student@example.com"
    );
    await createUser(
      instructorUserId,
      UserRole.USER,
      EducationalRole.INSTRUCTOR,
      "instructor@example.com"
    );

    await createClassroom(classId, instructorUserId);

    instructorAccessToken = await getToken(
      instructorUserId,
      UserRole.USER,
      EducationalRole.INSTRUCTOR,
      undefined,
      "instructor@example.com"
    );

    studentAccessToken = await getToken(
      studentUserId,
      UserRole.USER,
      EducationalRole.STUDENT,
      undefined,
      "student@example.com"
    );
  });

  afterEach(async () => {
    await appStop();
    await mongoUnit.drop();
  });

  it(`can createClassMembership for an existing user, has userId in the created document`, async () => {
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${instructorAccessToken}`)
      .send({
        query: createClassMembershipQuery,
        variables: {
          classId: classId,
          userEmail: "student@example.com",
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body.data.createClassMembership).to.have.property(
      "userId",
      studentUserId
    );

    // Verify in database
    const membership = await ClassMembershipModel.findOne({
      classId: classId,
      userEmail: "student@example.com",
    });

    expect(membership).to.not.be.null;
    expect(membership?.userId).to.equal(studentUserId);
  });

  it(`can createClassMembership for a user that does not exist yet, no userId in the created document`, async () => {
    const newUserEmail = "newstudent@example.com";

    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${instructorAccessToken}`)
      .send({
        query: createClassMembershipQuery,
        variables: {
          classId: classId,
          userEmail: newUserEmail,
        },
      });

    expect(response.status).to.equal(200);
    expect(
      response.body.data.createClassMembership.userId === null ||
        response.body.data.createClassMembership.userId === undefined
    ).to.be.true;

    // Verify in database
    const membership = await ClassMembershipModel.findOne({
      classId: classId,
      userEmail: newUserEmail,
    });

    expect(membership).to.not.be.null;
    expect(membership?.userId).to.be.undefined;
  });
});
