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
  updateClassMembershipStatus,
} from "../../helpers";
import { UserRole } from "../../../src/schemas/types/types";
import { EducationalRole } from "../../../src/schemas/models/Player";
import { ClassMembershipStatus } from "../../../src/schemas/models/classes/ClassMembership";
const { ObjectId } = mongoose.Types;

const unblockStudentFromClassQuery = `
  mutation UnblockStudentFromClass($studentId: String!, $classId: String!) {
    unblockStudentFromClass(studentId: $studentId, classId: $classId) {
        classId
        userId
        status
    }
  }
`;

describe("unblock student from class", () => {
  let app: Express;

  let instructorUserId: string;
  let instructorAccessToken: string;
  let otherInstructorUserId: string;
  let otherInstructorAccessToken: string;
  let studentUserId: string;
  let studentAccessToken: string;
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
    // Create a blocked membership
    await createClassMembership(
      classId,
      studentUserId,
      ClassMembershipStatus.BLOCKED
    );

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

  it(`instructor can unblock a student from their classroom`, async () => {
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${instructorAccessToken}`)
      .send({
        query: unblockStudentFromClassQuery,
        variables: {
          studentId: studentUserId,
          classId: classId,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body.data.unblockStudentFromClass).to.have.property(
      "classId"
    );
    expect(response.body.data.unblockStudentFromClass).to.have.property(
      "userId"
    );
    expect(response.body.data.unblockStudentFromClass.status).to.equal(
      ClassMembershipStatus.NONE
    );
    expect(response.body.data.unblockStudentFromClass.userId).to.equal(
      studentUserId
    );
  });

  it(`fails if classroom does not exist`, async () => {
    const nonExistentClassId = new ObjectId().toString();

    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${instructorAccessToken}`)
      .send({
        query: unblockStudentFromClassQuery,
        variables: {
          studentId: studentUserId,
          classId: nonExistentClassId,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "Error: Classroom not found"
    );
  });

  it(`fails if class membership does not exist`, async () => {
    const nonMemberStudentId = new ObjectId().toString();
    await createUser(
      nonMemberStudentId,
      UserRole.USER,
      EducationalRole.STUDENT
    );

    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${instructorAccessToken}`)
      .send({
        query: unblockStudentFromClassQuery,
        variables: {
          studentId: nonMemberStudentId,
          classId: classId,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "Error: Class membership not found"
    );
  });

  it(`fails if requesting user is not the teacher of the classroom`, async () => {
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${otherInstructorAccessToken}`)
      .send({
        query: unblockStudentFromClassQuery,
        variables: {
          studentId: studentUserId,
          classId: classId,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "Error: User is not the teacher of this classroom"
    );
  });

  it(`fails if a student tries to unblock another student`, async () => {
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${studentAccessToken}`)
      .send({
        query: unblockStudentFromClassQuery,
        variables: {
          studentId: studentUserId,
          classId: classId,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "Error: User is not the teacher of this classroom"
    );
  });

  it(`fails if a student is not blocked from the classroom`, async () => {
    await updateClassMembershipStatus(
      classId,
      studentUserId,
      ClassMembershipStatus.NONE
    );

    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${instructorAccessToken}`)
      .send({
        query: unblockStudentFromClassQuery,
        variables: {
          studentId: studentUserId,
          classId: classId,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "Error: Student is not blocked from this classroom"
    );
  });
});
