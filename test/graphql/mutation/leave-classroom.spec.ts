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

const leaveClassroomQuery = `
  mutation LeaveClassroom($classId: String!) {
    leaveClassroom(classId: $classId) {
        classId
        userId
        status
    }
  }
`;

describe("leave classroom", () => {
  let app: Express;

  let instructorUserId: string;
  let studentUserId: string;
  let studentAccessToken: string;
  let otherStudentUserId: string;
  let classId: string;
  let room1Id: string;
  let room2Id: string;
  let otherRoomId: string;

  beforeEach(async () => {
    await mongoUnit.load(require("test/fixtures/mongodb/data-default.js"));
    app = await createApp();
    await appStart();

    instructorUserId = new ObjectId().toString();
    studentUserId = new ObjectId().toString();
    otherStudentUserId = new ObjectId().toString();
    classId = new ObjectId().toString();
    room1Id = new ObjectId().toString();
    room2Id = new ObjectId().toString();
    otherRoomId = new ObjectId().toString();

    await createUser(studentUserId, UserRole.USER, EducationalRole.STUDENT);
    await createUser(
      otherStudentUserId,
      UserRole.USER,
      EducationalRole.STUDENT
    );
    await createUser(
      instructorUserId,
      UserRole.USER,
      EducationalRole.INSTRUCTOR
    );

    await createClassroom(classId, instructorUserId);
    await createClassMembership(
      classId,
      studentUserId,
      ClassMembershipStatus.MEMBER
    );
    await createClassMembership(
      classId,
      otherStudentUserId,
      ClassMembershipStatus.MEMBER
    );

    // Create rooms with the student in them
    await createRoom(room1Id, classId, [studentUserId, instructorUserId]);
    await createRoom(room2Id, classId, [studentUserId, otherStudentUserId]);
    // Create a room in a different class (should not be affected)
    await createRoom(otherRoomId, new ObjectId().toString(), [studentUserId]);

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

  it(`student can leave a classroom`, async () => {
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${studentAccessToken}`)
      .send({
        query: leaveClassroomQuery,
        variables: {
          classId: classId,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body.data.leaveClassroom).to.have.property("classId");
    expect(response.body.data.leaveClassroom).to.have.property("userId");
    expect(response.body.data.leaveClassroom.status).to.equal(
      ClassMembershipStatus.REMOVED
    );
    expect(response.body.data.leaveClassroom.userId).to.equal(studentUserId);
  });

  it(`removes student from all rooms in the class when leaving`, async () => {
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${studentAccessToken}`)
      .send({
        query: leaveClassroomQuery,
        variables: {
          classId: classId,
        },
      });

    expect(response.status).to.equal(200);

    // Check that student is removed from room1 and room2
    const room1 = await RoomModel.findById(room1Id);
    expect(room1?.gameData.players).to.not.include(studentUserId);
    expect(room1?.gameData.players).to.include(instructorUserId);

    const room2 = await RoomModel.findById(room2Id);
    expect(room2?.gameData.players).to.not.include(studentUserId);
    expect(room2?.gameData.players).to.include(otherStudentUserId);

    // Check that student is NOT removed from other room (different class)
    const otherRoom = await RoomModel.findById(otherRoomId);
    expect(otherRoom?.gameData.players).to.include(studentUserId);
  });

  it(`fails if classroom does not exist`, async () => {
    const nonExistentClassId = new ObjectId().toString();

    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${studentAccessToken}`)
      .send({
        query: leaveClassroomQuery,
        variables: {
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
    const nonMemberAccessToken = await getToken(
      nonMemberStudentId,
      UserRole.USER,
      EducationalRole.STUDENT
    );

    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${nonMemberAccessToken}`)
      .send({
        query: leaveClassroomQuery,
        variables: {
          classId: classId,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "Error: Class membership not found"
    );
  });
});
