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
import { getToken, createUser, createRoom } from "../../helpers";
import { UserRole } from "../../../src/schemas/types/types";
import { EducationalRole } from "../../../src/schemas/models/Player";
const { ObjectId } = mongoose.Types;
import GamePhaseReflectionsModel from "../../../src/schemas/models/GamePhaseReflections";
import RoomModel from "../../../src/schemas/models/Room";

const submitGamePhaseReflectionMutation = `
  mutation SubmitGamePhaseReflection($roomId: ID!, $reflection: String!) {
    submitGamePhaseReflection(roomId: $roomId, reflection: $reflection) {
      roomId
      stepId
      roundNumber
      question
      reflections
    }
  }
`;

describe("submit game phase reflection", () => {
  let app: Express;

  let userId: string;
  let roomId: string;
  let accessToken: string;

  beforeEach(async () => {
    await mongoUnit.load(require("test/fixtures/mongodb/data-default.js"));
    app = await createApp();
    await appStart();

    userId = new ObjectId().toString();
    roomId = new ObjectId().toString();

    await createUser(userId, UserRole.USER, EducationalRole.STUDENT);
    await createRoom(roomId, undefined, [userId]);

    accessToken = await getToken(
      userId,
      UserRole.USER,
      EducationalRole.STUDENT
    );
  });

  afterEach(async () => {
    await appStop();
    await mongoUnit.drop();
  });

  it(`submits game phase reflection when authenticated`, async () => {
    // Initialize reflection record
    await GamePhaseReflectionsModel.create({
      roomId: roomId,
      stepId: "step1",
      roundNumber: 1,
      question: "Test question",
      reflections: {},
    });
    // Room needs to be in reflection phase
    await RoomModel.updateOne(
      {
        _id: roomId,
      },
      {
        $set: {
          "gameData.curGameState.curState": "END_OF_PHASE_REFLECTION",
          "gameData.globalStateData.curStepId": "step1",
          "gameData.curGameState.curRoundNumber": 1,
        },
      }
    );

    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        query: submitGamePhaseReflectionMutation,
        variables: {
          roomId: roomId,
          reflection: "Test reflection",
        },
      });
    expect(response.status).to.equal(200);
    expect(response.body.data.submitGamePhaseReflection).to.exist;
    expect(response.body.data.submitGamePhaseReflection.roomId).to.equal(
      roomId
    );
    expect(response.body.data.submitGamePhaseReflection.stepId).to.equal(
      "step1"
    );
    expect(response.body.data.submitGamePhaseReflection.roundNumber).to.equal(
      1
    );
    expect(response.body.data.submitGamePhaseReflection.question).to.equal(
      "Test question"
    );
    expect(response.body.data.submitGamePhaseReflection.reflections).to.exist;
    expect(
      response.body.data.submitGamePhaseReflection.reflections[userId]
    ).to.equal("Test reflection");
  });
});
