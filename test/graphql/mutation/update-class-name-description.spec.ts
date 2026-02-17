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
import ClassModel from "../../../src/schemas/models/classes/Class";
const { ObjectId } = mongoose.Types;

const updateClassNameDescriptionQuery = `
  mutation UpdateClassNameDescription($classId: String!, $name: String!, $description: String!) {
    updateClassNameDescription(classId: $classId, name: $name, description: $description) {
        _id
        name
        description
        teacherId
    }
  }
`;

describe("update class name and description", () => {
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

  it(`instructor can update their classroom name and description`, async () => {
    const newName = "Updated Classroom Name";
    const newDescription = "This is the updated description for the classroom";

    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${instructorAccessToken}`)
      .send({
        query: updateClassNameDescriptionQuery,
        variables: {
          classId: classId,
          name: newName,
          description: newDescription,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body.data.updateClassNameDescription).to.have.property(
      "_id"
    );
    expect(response.body.data.updateClassNameDescription.name).to.equal(
      newName
    );
    expect(response.body.data.updateClassNameDescription.description).to.equal(
      newDescription
    );

    // Verify in database
    const classroom = await ClassModel.findById(classId);
    expect(classroom?.name).to.equal(newName);
    expect(classroom?.description).to.equal(newDescription);
  });

  it(`updates both name and description together`, async () => {
    // First, set initial values
    await ClassModel.findByIdAndUpdate(classId, {
      name: "Original Name",
      description: "Original Description",
    });

    const newName = "Brand New Name";
    const newDescription = "Brand New Description";

    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${instructorAccessToken}`)
      .send({
        query: updateClassNameDescriptionQuery,
        variables: {
          classId: classId,
          name: newName,
          description: newDescription,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body.data.updateClassNameDescription.name).to.equal(
      newName
    );
    expect(response.body.data.updateClassNameDescription.description).to.equal(
      newDescription
    );

    // Verify both fields were updated
    const classroom = await ClassModel.findById(classId);
    expect(classroom?.name).to.equal(newName);
    expect(classroom?.description).to.equal(newDescription);
  });

  it(`fails if classroom does not exist`, async () => {
    const nonExistentClassId = new ObjectId().toString();

    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${instructorAccessToken}`)
      .send({
        query: updateClassNameDescriptionQuery,
        variables: {
          classId: nonExistentClassId,
          name: "New Name",
          description: "New Description",
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
        query: updateClassNameDescriptionQuery,
        variables: {
          classId: classId,
          name: "Hacked Name",
          description: "Hacked Description",
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "Error: User is not the teacher of this classroom"
    );

    // Verify classroom was not updated
    const classroom = await ClassModel.findById(classId);
    expect(classroom?.name).to.not.equal("Hacked Name");
    expect(classroom?.description).to.not.equal("Hacked Description");
  });

  it(`fails if a student tries to update a classroom`, async () => {
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${studentAccessToken}`)
      .send({
        query: updateClassNameDescriptionQuery,
        variables: {
          classId: classId,
          name: "Student Updated Name",
          description: "Student Updated Description",
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "Error: User is not the teacher of this classroom"
    );

    // Verify classroom was not updated
    const classroom = await ClassModel.findById(classId);
    expect(classroom?.name).to.not.equal("Student Updated Name");
    expect(classroom?.description).to.not.equal("Student Updated Description");
  });
});
