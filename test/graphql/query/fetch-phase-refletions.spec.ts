/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import createApp, { appStart, appStop } from "../../../src/app";
import { expect } from "chai";
import e, { Express } from "express";
import mongoUnit from "mongo-unit";
import request from "supertest";
import GamePhaseReflectionsModel from "../../../src/schemas/models/GamePhaseReflections";
import mongoose from "mongoose";
const { ObjectId } = mongoose.Types;
import { UserRole } from "../../../src/schemas/types/types";
import { EducationalRole } from "../../../src/schemas/models/Player";
import { createUser, createRoom, getToken } from "../../helpers";

export const fetchPhaseRefletionsQuery = `
  query FetchGamePhaseReflections {
    fetchGamePhaseReflections {
      gameId
      phaseName
      endOfPhaseStepId
      roundNumber
      reflections
    }
  }
`;

describe("fetch players", () => {
  let app: Express;

  let roomId: string;
  let userId: string;
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

  it(`can fetch game phase reflections`, async () => {
    await GamePhaseReflectionsModel.create({
      roomId: roomId,
      stepId: "2",
      roundNumber: 1,
      reflections: {
        [userId]: "Test reflection",
      },
    });
    const response = await request(app).post("/graphql").send({
      query: fetchPhaseRefletionsQuery,
    });
    expect(response.status).to.equal(200);
    console.log(JSON.stringify(response.body, null, 2));
    expect(
      response.body.data.fetchGamePhaseReflections
    ).to.deep.include.members([
      {
        gameId: roomId,
        phaseName: "End of Phase Reflection",
        endOfPhaseStepId: "2",
        roundNumber: 1,
        reflections: {
          [userId]: "Test reflection",
        },
      },
    ]);
  });
});
