/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import createApp, { appStart, appStop } from "../../../../src/app";
import { expect } from "chai";
import e, { Express } from "express";
import mongoUnit from "mongo-unit";
import request from "supertest";
import mongoose from "mongoose";
import { getToken, createUser } from "../../../helpers";
import { UserRole } from "../../../../src/schemas/types/types";
import { EducationalRole } from "../../../../src/schemas/models/Player";
const { ObjectId } = mongoose.Types;

const UpdatePlayerRoleMutation = `
  mutation UpdatePlayerRole($playerId: String!, $userRole: String, $educationalRole: String) {
    admin {
      updatePlayerRole(playerId: $playerId, userRole: $userRole, educationalRole: $educationalRole) {
        _id
        userRole
        educationalRole
      }
    }
  }
`;

describe("update player roles", () => {
  let app: Express;

  let adminUserId: string;
  let adminAccessToken: string;
  let instructorUserId: string;
  let instructorAccessToken: string;
  let studentAccessToken: string;
  let studentUserId: string;

  beforeEach(async () => {
    await mongoUnit.load(require("test/fixtures/mongodb/data-default.js"));
    app = await createApp();
    await appStart();

    adminUserId = new ObjectId().toString();
    instructorUserId = new ObjectId().toString();
    studentUserId = new ObjectId().toString();

    await createUser(adminUserId, UserRole.ADMIN, EducationalRole.INSTRUCTOR);
    await createUser(studentUserId, UserRole.USER, EducationalRole.STUDENT);
    await createUser(
      instructorUserId,
      UserRole.USER,
      EducationalRole.INSTRUCTOR
    );

    adminAccessToken = await getToken(
      adminUserId,
      UserRole.ADMIN,
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

  it(`admin can edit a student's role`, async () => {
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${adminAccessToken}`)
      .send({
        query: UpdatePlayerRoleMutation,
        variables: {
          playerId: studentUserId,
          educationalRole: EducationalRole.INSTRUCTOR,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body.data.admin.updatePlayerRole).to.have.property("_id");
    expect(response.body.data.admin.updatePlayerRole).to.eql({
      _id: studentUserId,
      userRole: UserRole.USER,
      educationalRole: EducationalRole.INSTRUCTOR,
    });
  });

  it(`admin can edit an instructor's role`, async () => {
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${adminAccessToken}`)
      .send({
        query: UpdatePlayerRoleMutation,
        variables: {
          playerId: instructorUserId,
          educationalRole: EducationalRole.STUDENT,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body.data.admin.updatePlayerRole).to.have.property("_id");
    expect(response.body.data.admin.updatePlayerRole).to.eql({
      _id: instructorUserId,
      userRole: UserRole.USER,
      educationalRole: EducationalRole.STUDENT,
    });
  });

  it(`admin can promote a user`, async () => {
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${adminAccessToken}`)
      .send({
        query: UpdatePlayerRoleMutation,
        variables: {
          playerId: instructorUserId,
          userRole: UserRole.ADMIN,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body.data.admin.updatePlayerRole).to.have.property("_id");
    expect(response.body.data.admin.updatePlayerRole).to.eql({
      _id: instructorUserId,
      userRole: UserRole.ADMIN,
      educationalRole: EducationalRole.INSTRUCTOR,
    });
  });

  it(`fails if requesting user is not an admin`, async () => {
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${instructorAccessToken}`)
      .send({
        query: UpdatePlayerRoleMutation,
        variables: {
          playerId: studentUserId,
          educationalRole: EducationalRole.INSTRUCTOR,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "Only admin users"
    );
  });
});
