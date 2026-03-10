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
  addInviteCodeToClassroom,
  createClassMembership,
} from "../../helpers";
import { UserRole } from "../../../src/schemas/types/types";
import { EducationalRole } from "../../../src/schemas/models/Player";
import ClassModel from "../../../src/schemas/models/classes/Class";
import { ClassMembershipStatus } from "../../../src/schemas/models/classes/ClassMembership";
const { ObjectId } = mongoose.Types;

const joinClassroomQuery = `
  mutation JoinClassroom($inviteCode: String!) {
    joinClassroom(inviteCode: $inviteCode) {
        classMembership {
            classId
            userId
            userEmail 
            status
        }
        classroom {
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
  }
`;

describe("join a classroom", () => {
  let app: Express;

  let instructorUserId: string;
  let studentUserId: string;
  let studentAccessToken: string;
  let classId: string;
  let testInviteCode: string;

  beforeEach(async () => {
    await mongoUnit.load(require("test/fixtures/mongodb/data-default.js"));
    app = await createApp();
    await appStart();

    instructorUserId = new ObjectId().toString();
    studentUserId = new ObjectId().toString();
    classId = new ObjectId().toString();
    testInviteCode = "TESTCODE";

    await createUser(studentUserId, UserRole.USER, EducationalRole.STUDENT);
    await createUser(
      instructorUserId,
      UserRole.USER,
      EducationalRole.INSTRUCTOR
    );

    await createClassroom(classId, instructorUserId);

    await addInviteCodeToClassroom(classId, {
      code: testInviteCode,
      validUntil: Date.now() + 86400000,
      maxUses: 10,
      uses: 0,
    } as any);

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

  it(`student can join a classroom with valid invite code`, async () => {
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${studentAccessToken}`)
      .send({
        query: joinClassroomQuery,
        variables: {
          inviteCode: testInviteCode,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body.data.joinClassroom).to.have.property(
      "classMembership"
    );
    expect(response.body.data.joinClassroom).to.have.property("classroom");
    expect(response.body.data.joinClassroom.classMembership.status).to.equal(
      ClassMembershipStatus.MEMBER
    );
    expect(response.body.data.joinClassroom.classMembership.userEmail).to.equal(
      "student@example.com"
    );
    expect(response.body.data.joinClassroom.classMembership.userId).to.equal(
      studentUserId
    );
    expect(response.body.data.joinClassroom.classroom._id).to.equal(classId);
  });

  it(`increments uses count when student joins successfully`, async () => {
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${studentAccessToken}`)
      .send({
        query: joinClassroomQuery,
        variables: {
          inviteCode: testInviteCode,
        },
      });

    expect(response.status).to.equal(200);
    const inviteCodeData =
      response.body.data.joinClassroom.classroom.inviteCodes.find(
        (code: any) => code.code === testInviteCode
      );
    expect(inviteCodeData.uses).to.equal(1);

    // Verify in database
    const classroom = await ClassModel.findById(classId);
    const dbInviteCode = classroom?.inviteCodes.find(
      (code) => code.code === testInviteCode
    );
    expect(dbInviteCode?.uses).to.equal(1);
  });

  it(`fails if invite code does not exist`, async () => {
    const nonExistentCode = "FAKECODE";

    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${studentAccessToken}`)
      .send({
        query: joinClassroomQuery,
        variables: {
          inviteCode: nonExistentCode,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "Error: Classroom not found"
    );
  });

  it(`fails if classroom is archived`, async () => {
    // Archive the classroom
    await ClassModel.findByIdAndUpdate(classId, {
      archivedAt: Date.now(),
    });

    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${studentAccessToken}`)
      .send({
        query: joinClassroomQuery,
        variables: {
          inviteCode: testInviteCode,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "Error: Classroom is no longer active"
    );
  });

  it(`fails if user is blocked`, async () => {
    // Create a blocked membership
    await createClassMembership(
      classId,
      studentUserId,
      ClassMembershipStatus.BLOCKED
    );

    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${studentAccessToken}`)
      .send({
        query: joinClassroomQuery,
        variables: {
          inviteCode: testInviteCode,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "Error: User is blocked from this classroom"
    );
  });

  it(`student who left can rejoin the classroom`, async () => {
    // Create a removed membership
    await createClassMembership(
      classId,
      studentUserId,
      ClassMembershipStatus.REMOVED
    );

    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${studentAccessToken}`)
      .send({
        query: joinClassroomQuery,
        variables: {
          inviteCode: testInviteCode,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body.data.joinClassroom).to.have.property(
      "classMembership"
    );
    expect(response.body.data.joinClassroom.classMembership.status).to.equal(
      ClassMembershipStatus.MEMBER
    );
  });

  it(`fails if invite code has expired`, async () => {
    const expiredCode = "EXPIRED";
    // Add an expired invite code (validUntil in the past)
    await addInviteCodeToClassroom(classId, {
      code: expiredCode,
      validUntil: Date.now() - 86400000, // 24 hours ago
      maxUses: 10,
      uses: 0,
    } as any);

    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${studentAccessToken}`)
      .send({
        query: joinClassroomQuery,
        variables: {
          inviteCode: expiredCode,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "Error: Invite code has expired"
    );
  });

  it(`fails if invite code has reached maximum uses`, async () => {
    const maxedOutCode = "MAXEDOUT";
    // Add an invite code that has reached max uses
    await addInviteCodeToClassroom(classId, {
      code: maxedOutCode,
      validUntil: Date.now() + 86400000,
      maxUses: 5,
      uses: 5, // uses equals maxUses
    } as any);

    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${studentAccessToken}`)
      .send({
        query: joinClassroomQuery,
        variables: {
          inviteCode: maxedOutCode,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "Error: Invite code has reached maximum uses"
    );
  });
});
