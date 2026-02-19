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
const { ObjectId } = mongoose.Types;

const fetchInstructorDataHydrationQuery = `
  query FetchInstructorDataHydration {
    fetchInstructorDataHydration {
        classes {
            _id
            name
            teacherId
            archivedAt
        }
        rooms {
            _id
            name
            classId
        }
        students {
            _id
            name
            email
        }
        classMemberships {
            classId
            userId
            status
        }
        gameList {
            id
            name
        }
    }
  }
`;

describe("fetch instructor data hydration", () => {
  let app: Express;

  let instructorUserId: string;
  let instructorAccessToken: string;
  let otherInstructorUserId: string;
  let otherInstructorAccessToken: string;
  let student1UserId: string;
  let student2UserId: string;
  let studentAccessToken: string;
  let class1Id: string;
  let class2Id: string;
  let otherInstructorClassId: string;
  let room1Id: string;
  let room2Id: string;
  let room3Id: string;

  beforeEach(async () => {
    await mongoUnit.load(require("test/fixtures/mongodb/data-default.js"));
    app = await createApp();
    await appStart();

    instructorUserId = new ObjectId().toString();
    otherInstructorUserId = new ObjectId().toString();
    student1UserId = new ObjectId().toString();
    student2UserId = new ObjectId().toString();
    class1Id = new ObjectId().toString();
    class2Id = new ObjectId().toString();
    otherInstructorClassId = new ObjectId().toString();
    room1Id = new ObjectId().toString();
    room2Id = new ObjectId().toString();
    room3Id = new ObjectId().toString();

    await createUser(student1UserId, UserRole.USER, EducationalRole.STUDENT);
    await createUser(student2UserId, UserRole.USER, EducationalRole.STUDENT);
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

    // Create classrooms for main instructor
    await createClassroom(class1Id, instructorUserId);
    await createClassroom(class2Id, instructorUserId);
    // Create classroom for other instructor (should not be included)
    await createClassroom(otherInstructorClassId, otherInstructorUserId);

    // Create memberships
    await createClassMembership(
      class1Id,
      student1UserId,
      ClassMembershipStatus.MEMBER
    );
    await createClassMembership(
      class1Id,
      student2UserId,
      ClassMembershipStatus.MEMBER
    );
    await createClassMembership(
      class2Id,
      student1UserId,
      ClassMembershipStatus.MEMBER
    );

    // Create rooms
    await createRoom(room1Id, class1Id, [student1UserId, instructorUserId]);
    await createRoom(room2Id, class1Id, [student2UserId]);
    await createRoom(room3Id, class2Id, [student1UserId]);

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
      student1UserId,
      UserRole.USER,
      EducationalRole.STUDENT
    );
  });

  afterEach(async () => {
    await appStop();
    await mongoUnit.drop();
  });

  it(`instructor can fetch all their classroom data`, async () => {
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${instructorAccessToken}`)
      .send({
        query: fetchInstructorDataHydrationQuery,
      });
    expect(response.status).to.equal(200);
    expect(response.body.data.fetchInstructorDataHydration).to.exist;

    // Check classes
    expect(
      response.body.data.fetchInstructorDataHydration.classes
    ).to.have.lengthOf(2);
    const classIds =
      response.body.data.fetchInstructorDataHydration.classes.map(
        (c: any) => c._id
      );
    expect(classIds).to.include(class1Id);
    expect(classIds).to.include(class2Id);
    expect(classIds).to.not.include(otherInstructorClassId);

    // Check rooms
    expect(
      response.body.data.fetchInstructorDataHydration.rooms
    ).to.have.lengthOf(3);
    const roomIds = response.body.data.fetchInstructorDataHydration.rooms.map(
      (r: any) => r._id
    );
    expect(roomIds).to.include(room1Id);
    expect(roomIds).to.include(room2Id);
    expect(roomIds).to.include(room3Id);

    // Check students
    expect(
      response.body.data.fetchInstructorDataHydration.students
    ).to.have.lengthOf(2);
    const studentIds =
      response.body.data.fetchInstructorDataHydration.students.map(
        (s: any) => s._id
      );
    expect(studentIds).to.include(student1UserId);
    expect(studentIds).to.include(student2UserId);

    // Check classMemberships
    expect(
      response.body.data.fetchInstructorDataHydration.classMemberships
    ).to.have.lengthOf(3);

    // Check gameList
    expect(
      response.body.data.fetchInstructorDataHydration.gameList
    ).to.have.lengthOf(2);
    const gameIds =
      response.body.data.fetchInstructorDataHydration.gameList.map(
        (g: any) => g.id
      );
    expect(gameIds).to.include("basketball");
    expect(gameIds).to.include("concert-ticket-sales");
  });

  it(`includes archived classes in results`, async () => {
    // Archive class2
    const ClassModel = (
      await import("../../../src/schemas/models/classes/Class")
    ).default;
    await ClassModel.findByIdAndUpdate(class2Id, {
      archivedAt: new Date(),
    });

    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${instructorAccessToken}`)
      .send({
        query: fetchInstructorDataHydrationQuery,
      });

    expect(response.status).to.equal(200);
    expect(
      response.body.data.fetchInstructorDataHydration.classes
    ).to.have.lengthOf(2);

    const archivedClass =
      response.body.data.fetchInstructorDataHydration.classes.find(
        (c: any) => c._id === class2Id
      );
    expect(archivedClass).to.exist;
    expect(archivedClass.archivedAt).to.exist;
  });

  it(`fails if user is not an instructor`, async () => {
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${studentAccessToken}`)
      .send({
        query: fetchInstructorDataHydrationQuery,
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "Error: User is not an instructor"
    );
  });

  it(`returns only data for the requesting instructor`, async () => {
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${otherInstructorAccessToken}`)
      .send({
        query: fetchInstructorDataHydrationQuery,
      });

    expect(response.status).to.equal(200);
    expect(response.body.data.fetchInstructorDataHydration).to.exist;

    // Should only have the other instructor's class
    expect(
      response.body.data.fetchInstructorDataHydration.classes
    ).to.have.lengthOf(1);
    expect(
      response.body.data.fetchInstructorDataHydration.classes[0]._id
    ).to.equal(otherInstructorClassId);

    // Should have no rooms (no rooms created for other instructor's class)
    expect(
      response.body.data.fetchInstructorDataHydration.rooms
    ).to.have.lengthOf(0);

    // Should have no students (no memberships for other instructor's class)
    expect(
      response.body.data.fetchInstructorDataHydration.students
    ).to.have.lengthOf(0);

    // Should have no classMemberships
    expect(
      response.body.data.fetchInstructorDataHydration.classMemberships
    ).to.have.lengthOf(0);
  });
});
