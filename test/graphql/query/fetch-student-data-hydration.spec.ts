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

const fetchStudentDataHydrationQuery = `
  query FetchStudentDataHydration {
    fetchStudentDataHydration {
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

describe("fetch student data hydration", () => {
  let app: Express;

  let instructorUserId: string;
  let student1UserId: string;
  let student1AccessToken: string;
  let student2UserId: string;
  let student3UserId: string;
  let class1Id: string;
  let class2Id: string;
  let class3Id: string;
  let room1Id: string;
  let room2Id: string;
  let room3Id: string;

  beforeEach(async () => {
    await mongoUnit.load(require("test/fixtures/mongodb/data-default.js"));
    app = await createApp();
    await appStart();

    instructorUserId = new ObjectId().toString();
    student1UserId = new ObjectId().toString();
    student2UserId = new ObjectId().toString();
    student3UserId = new ObjectId().toString();
    class1Id = new ObjectId().toString();
    class2Id = new ObjectId().toString();
    class3Id = new ObjectId().toString();
    room1Id = new ObjectId().toString();
    room2Id = new ObjectId().toString();
    room3Id = new ObjectId().toString();

    await createUser(
      instructorUserId,
      UserRole.USER,
      EducationalRole.INSTRUCTOR
    );
    await createUser(student1UserId, UserRole.USER, EducationalRole.STUDENT);
    await createUser(student2UserId, UserRole.USER, EducationalRole.STUDENT);
    await createUser(student3UserId, UserRole.USER, EducationalRole.STUDENT);

    // Create classrooms
    await createClassroom(class1Id, instructorUserId);
    await createClassroom(class2Id, instructorUserId);
    await createClassroom(class3Id, instructorUserId);

    // Create memberships
    // student1 is MEMBER of class1 and class2
    await createClassMembership(
      class1Id,
      student1UserId,
      ClassMembershipStatus.MEMBER
    );
    await createClassMembership(
      class2Id,
      student1UserId,
      ClassMembershipStatus.MEMBER
    );
    // student1 is REMOVED from class3 (should not be included)
    await createClassMembership(
      class3Id,
      student1UserId,
      ClassMembershipStatus.REMOVED
    );

    // student2 is MEMBER of class1
    await createClassMembership(
      class1Id,
      student2UserId,
      ClassMembershipStatus.MEMBER
    );
    // student2 is BLOCKED from class2
    await createClassMembership(
      class2Id,
      student2UserId,
      ClassMembershipStatus.BLOCKED
    );

    // student3 is MEMBER of class2
    await createClassMembership(
      class2Id,
      student3UserId,
      ClassMembershipStatus.MEMBER
    );

    // Create rooms
    await createRoom(room1Id, class1Id, [student1UserId, student2UserId]);
    await createRoom(room2Id, class2Id, [student1UserId]);
    await createRoom(room3Id, class3Id, []); // class3 (student1 is removed)

    student1AccessToken = await getToken(
      student1UserId,
      UserRole.USER,
      EducationalRole.STUDENT
    );
  });

  afterEach(async () => {
    await appStop();
    await mongoUnit.drop();
  });

  it(`student can fetch all their classroom data`, async () => {
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${student1AccessToken}`)
      .send({
        query: fetchStudentDataHydrationQuery,
      });

    expect(response.status).to.equal(200);
    expect(response.body.data.fetchStudentDataHydration).to.exist;

    // Check classes - should only include class1 and class2 (where student1 is MEMBER)
    expect(
      response.body.data.fetchStudentDataHydration.classes
    ).to.have.lengthOf(2);
    const classIds = response.body.data.fetchStudentDataHydration.classes.map(
      (c: any) => c._id
    );
    expect(classIds).to.include(class1Id);
    expect(classIds).to.include(class2Id);
    expect(classIds).to.not.include(class3Id); // Not a member

    // Check rooms - should only include rooms from class1 and class2
    expect(response.body.data.fetchStudentDataHydration.rooms).to.have.lengthOf(
      2
    );
    const roomIds = response.body.data.fetchStudentDataHydration.rooms.map(
      (r: any) => r._id
    );
    expect(roomIds).to.include(room1Id);
    expect(roomIds).to.include(room2Id);
    expect(roomIds).to.not.include(room3Id); // class3 room

    // Check students - should include student2 and student3 (but not student1 itself)
    expect(
      response.body.data.fetchStudentDataHydration.students
    ).to.have.lengthOf(2);
    const studentIds =
      response.body.data.fetchStudentDataHydration.students.map(
        (s: any) => s._id
      );
    expect(studentIds).to.include(student2UserId);
    expect(studentIds).to.include(student3UserId);
    expect(studentIds).to.not.include(student1UserId); // Excludes self

    // Check classMemberships - should include all memberships from class1 and class2
    expect(
      response.body.data.fetchStudentDataHydration.classMemberships.length
    ).to.be.greaterThan(0);
    const memberships =
      response.body.data.fetchStudentDataHydration.classMemberships;
    const class1Memberships = memberships.filter(
      (cm: any) => cm.classId === class1Id
    );
    const class2Memberships = memberships.filter(
      (cm: any) => cm.classId === class2Id
    );
    expect(class1Memberships).to.have.lengthOf(2); // student1, student2
    expect(class2Memberships).to.have.lengthOf(3); // student1, student2 (blocked), student3

    // Check gameList
    expect(
      response.body.data.fetchStudentDataHydration.gameList
    ).to.have.lengthOf(2);
    const gameIds = response.body.data.fetchStudentDataHydration.gameList.map(
      (g: any) => g.id
    );
    expect(gameIds).to.include("basketball");
    expect(gameIds).to.include("concert-ticket-sales");
  });

  it(`excludes classes where student is not a MEMBER`, async () => {
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${student1AccessToken}`)
      .send({
        query: fetchStudentDataHydrationQuery,
      });

    expect(response.status).to.equal(200);

    // Should not include class3 where student1 is REMOVED
    const classIds = response.body.data.fetchStudentDataHydration.classes.map(
      (c: any) => c._id
    );
    expect(classIds).to.not.include(class3Id);

    // Should not include room3 which belongs to class3
    const roomIds = response.body.data.fetchStudentDataHydration.rooms.map(
      (r: any) => r._id
    );
    expect(roomIds).to.not.include(room3Id);
  });

  it(`returns empty arrays if student is not a member of any class`, async () => {
    const newStudentUserId = new ObjectId().toString();
    await createUser(newStudentUserId, UserRole.USER, EducationalRole.STUDENT);
    const newStudentAccessToken = await getToken(
      newStudentUserId,
      UserRole.USER,
      EducationalRole.STUDENT
    );

    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${newStudentAccessToken}`)
      .send({
        query: fetchStudentDataHydrationQuery,
      });

    expect(response.status).to.equal(200);
    expect(
      response.body.data.fetchStudentDataHydration.classes
    ).to.have.lengthOf(0);
    expect(response.body.data.fetchStudentDataHydration.rooms).to.have.lengthOf(
      0
    );
    expect(
      response.body.data.fetchStudentDataHydration.students
    ).to.have.lengthOf(0);
    expect(
      response.body.data.fetchStudentDataHydration.classMemberships
    ).to.have.lengthOf(0);
  });

  it(`includes all students from the classes (with any status)`, async () => {
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${student1AccessToken}`)
      .send({
        query: fetchStudentDataHydrationQuery,
      });

    expect(response.status).to.equal(200);

    // Check that blocked student2 is included in the students list
    const studentIds =
      response.body.data.fetchStudentDataHydration.students.map(
        (s: any) => s._id
      );
    expect(studentIds).to.include(student2UserId); // Even though blocked in class2

    // Check that student2's blocked membership is included
    const memberships =
      response.body.data.fetchStudentDataHydration.classMemberships;
    const student2BlockedMembership = memberships.find(
      (cm: any) =>
        cm.userId === student2UserId &&
        cm.classId === class2Id &&
        cm.status === ClassMembershipStatus.BLOCKED
    );
    expect(student2BlockedMembership).to.exist;
  });
});
