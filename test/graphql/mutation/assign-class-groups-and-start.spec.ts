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
} from "../../helpers";
import {
  fullClassroomData,
  fullRoomData,
  UserRole,
} from "../../../src/schemas/types/types";
import {
  EducationalRole,
  PlayerDocument,
} from "../../../src/schemas/models/Player";
import ClassModel from "../../../src/schemas/models/classes/Class";
import ClassMembershipModel, {
  ClassMembershipStatus,
} from "../../../src/schemas/models/classes/ClassMembership";
const { ObjectId } = mongoose.Types;

const assignClassGroupsAndStartQuery = `
  mutation AssignClassGroupsAndStart($classId: String!, $groups: [ClassMembershipInputType]!) {
    assignClassGroupsAndStart(classId: $classId, groups: $groups) {
        updatedClassroom {
          ${fullClassroomData}
        }
        createdRooms {
          ${fullRoomData}
        }
    }
  }
`;

describe("assign class groups and start", () => {
  let app: Express;

  let instructorUserId: string;
  let instructorAccessToken: string;
  let otherInstructorUserId: string;
  let otherInstructorAccessToken: string;
  let studentUserId: string;
  let otherStudentUserId: string;
  let studentAccessToken: string;
  let classId: string;

  beforeEach(async () => {
    await mongoUnit.load(require("test/fixtures/mongodb/data-default.js"));
    app = await createApp();
    await appStart();

    instructorUserId = new ObjectId().toString();
    otherInstructorUserId = new ObjectId().toString();
    studentUserId = new ObjectId().toString();
    otherStudentUserId = new ObjectId().toString();
    classId = new ObjectId().toString();

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
    await createUser(
      otherInstructorUserId,
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

  it(`instructor can assign groups and start their class`, async () => {
    const date = new Date();
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${instructorAccessToken}`)
      .send({
        query: assignClassGroupsAndStartQuery,
        variables: {
          classId: classId,
          groups: [
            {
              userId: studentUserId,
              groupId: 1,
            },
            {
              userId: otherStudentUserId,
              groupId: 1,
            },
          ],
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body.data.assignClassGroupsAndStart).to.have.property(
      "updatedClassroom"
    );
    expect(response.body.data.assignClassGroupsAndStart).to.have.property(
      "createdRooms"
    );
    expect(
      new Date(
        response.body.data.assignClassGroupsAndStart.updatedClassroom.startedAt
      ) > date
    ).to.equal(true);
    expect(
      response.body.data.assignClassGroupsAndStart.createdRooms
    ).to.have.length(1);

    expect(response.body.data.assignClassGroupsAndStart.createdRooms[0])
      .to.have.property("name")
      .to.equal("Group #1 Solution Space");

    expect(
      response.body.data.assignClassGroupsAndStart.createdRooms[0].gameData
        .players
    ).to.have.length(2);
    const studentOneExists =
      response.body.data.assignClassGroupsAndStart.createdRooms[0].gameData.players.some(
        (player: PlayerDocument) => player._id === studentUserId
      );
    const studentTwoExists =
      response.body.data.assignClassGroupsAndStart.createdRooms[0].gameData.players.some(
        (player: PlayerDocument) => player._id === otherStudentUserId
      );
    expect(studentOneExists).to.equal(true);
    expect(studentTwoExists).to.equal(true);

    const studentOneStatusRecord =
      response.body.data.assignClassGroupsAndStart.createdRooms[0].gameData
        .playersStatusRecord[studentUserId];
    const studentTwoStatusRecord =
      response.body.data.assignClassGroupsAndStart.createdRooms[0].gameData
        .playersStatusRecord[otherStudentUserId];
    expect(studentOneStatusRecord).to.have.property("lastHeartbeatAt");
    expect(studentTwoStatusRecord).to.have.property("lastHeartbeatAt");
    expect(studentOneStatusRecord).to.have.property("reportedAwayStatus");
    expect(studentTwoStatusRecord).to.have.property("reportedAwayStatus");
    expect(studentOneStatusRecord).to.have.property("pausedByAdmin");
    expect(studentTwoStatusRecord).to.have.property("pausedByAdmin");

    // Verify in database
    const classroom = await ClassModel.findById(classId);
    expect(classroom?.startedAt).to.not.equal(undefined);
    const classMembership = await ClassMembershipModel.findOne({
      classId: classId,
      userId: studentUserId,
    });
    expect(classMembership?.groupId).to.equal(1);
  });

  it(`instructor can start their class without assigning groups`, async () => {
    const date = new Date();
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${instructorAccessToken}`)
      .send({
        query: assignClassGroupsAndStartQuery,
        variables: {
          classId: classId,
          groups: [],
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body.data.assignClassGroupsAndStart).to.have.property(
      "updatedClassroom"
    );
    expect(response.body.data.assignClassGroupsAndStart).to.have.property(
      "createdRooms"
    );
    expect(
      new Date(
        response.body.data.assignClassGroupsAndStart.updatedClassroom.startedAt
      ) > date
    ).to.equal(true);
    expect(
      response.body.data.assignClassGroupsAndStart.createdRooms
    ).to.have.length(0);

    // Verify in database
    const classroom = await ClassModel.findById(classId);
    expect(classroom?.startedAt).to.not.equal(undefined);
    const classMembership = await ClassMembershipModel.findOne({
      classId: classId,
      userId: studentUserId,
    });
    expect(classMembership?.groupId).to.equal(0);
  });

  it(`fails if classroom does not exist`, async () => {
    const nonExistentClassId = new ObjectId().toString();

    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${instructorAccessToken}`)
      .send({
        query: assignClassGroupsAndStartQuery,
        variables: {
          classId: nonExistentClassId,
          groups: [],
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "Error: Classroom not found"
    );
  });

  it(`fails if requesting user is not the teacher of the classroom`, async () => {
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${otherInstructorAccessToken}`)
      .send({
        query: assignClassGroupsAndStartQuery,
        variables: {
          classId: classId,
          groups: [],
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "Error: User is not the teacher of this classroom"
    );

    // Verify classroom was not updated
    const classroom = await ClassModel.findById(classId);
    expect(classroom?.startedAt).to.equal(undefined);
  });

  it(`fails if a student tries to update a classroom`, async () => {
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${studentAccessToken}`)
      .send({
        query: assignClassGroupsAndStartQuery,
        variables: {
          classId: classId,
          groups: [],
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "Error: User is not the teacher of this classroom"
    );

    // Verify classroom was not updated
    const classroom = await ClassModel.findById(classId);
    expect(classroom?.startedAt).to.equal(undefined);
  });
});
