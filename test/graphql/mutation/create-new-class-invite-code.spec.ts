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
const { ObjectId } = mongoose.Types;

const createNewClassInviteCodeQuery = `
  mutation CreateNewClassInviteCode($classId: String!, $validUntil: Date!, $numUses: Int!) {
    createNewClassInviteCode(classId: $classId, validUntil: $validUntil, numUses: $numUses) {
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

describe("create a new class invite code", () => {
  let app: Express;

  let instructorUserId: string;
  let instructorAccessToken: string;
  let otherInstructorUserId: string;
  let otherInstructorAccessToken: string;
  let studentAccessToken: string;
  let studentUserId: string;
  let classId: string;

  beforeEach(async () => {
    await mongoUnit.load(require("test/fixtures/mongodb/data-default.js"));
    app = await createApp();
    await appStart();

    instructorUserId = new ObjectId().toString();
    otherInstructorUserId = new ObjectId().toString();
    studentUserId = new ObjectId().toString();
    classId = new ObjectId().toString();

    await createUser(studentUserId, UserRole.USER, EducationalRole.STUDENT);
    await createUser(
      instructorUserId,
      UserRole.USER,
      EducationalRole.INSTRUCTOR
    );
    await createUser(
      otherInstructorUserId,
      UserRole.USER,
      EducationalRole.INSTRUCTOR
    );
    await createClassroom(classId, instructorUserId);

    instructorAccessToken = await getToken(
      instructorUserId,
      UserRole.USER,
      EducationalRole.INSTRUCTOR
    );
    otherInstructorAccessToken = await getToken(
      otherInstructorUserId,
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

  it(`instructor can create a new invite code for their classroom`, async () => {
    const numUses = 10;
    const validUntil = new Date(Date.now() + 86400000); // 24 hours from now
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${instructorAccessToken}`)
      .send({
        query: createNewClassInviteCodeQuery,
        variables: {
          classId: classId,
          validUntil: validUntil,
          numUses: numUses,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body.data.createNewClassInviteCode).to.have.property("_id");
    expect(
      response.body.data.createNewClassInviteCode.inviteCodes
    ).to.have.lengthOf(1);
    expect(
      response.body.data.createNewClassInviteCode.inviteCodes[0]
    ).to.have.property("code");
    expect(
      response.body.data.createNewClassInviteCode.inviteCodes[0].validUntil
    ).to.equal(validUntil.toISOString());
    expect(
      response.body.data.createNewClassInviteCode.inviteCodes[0].maxUses
    ).to.equal(numUses);
    expect(
      response.body.data.createNewClassInviteCode.inviteCodes[0].uses
    ).to.equal(0);
  });

  it(`fails if classroom does not exist`, async () => {
    const nonExistentClassId = new ObjectId().toString();
    const validUntil = new Date(Date.now() + 86400000);
    const numUses = 10;

    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${instructorAccessToken}`)
      .send({
        query: createNewClassInviteCodeQuery,
        variables: {
          classId: nonExistentClassId,
          validUntil: validUntil,
          numUses: numUses,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "Error: Classroom not found"
    );
  });

  it(`fails if requesting user is not the teacher of the classroom`, async () => {
    const validUntil = new Date(Date.now() + 86400000);
    const numUses = 10;

    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${otherInstructorAccessToken}`)
      .send({
        query: createNewClassInviteCodeQuery,
        variables: {
          classId: classId,
          validUntil: validUntil,
          numUses: numUses,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "Error: User is not the teacher of this classroom"
    );
  });

  it(`fails if requesting user is a student`, async () => {
    const validUntil = new Date(Date.now() + 86400000);
    const numUses = 10;

    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${studentAccessToken}`)
      .send({
        query: createNewClassInviteCodeQuery,
        variables: {
          classId: classId,
          validUntil: validUntil,
          numUses: numUses,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "Error: User is not the teacher of this classroom"
    );
  });
});
