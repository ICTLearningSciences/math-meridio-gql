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

describe("create new learning objective", () => {
  let app: Express;

  beforeEach(async () => {
    await mongoUnit.load(require("test/fixtures/mongodb/data-default.js"));
    app = await createApp();
    await appStart();
  });

  afterEach(async () => {
    await appStop();
    await mongoUnit.drop();
  });

  it(`can create a new learning objective`, async () => {
    const response1 = await request(app)
      .post("/graphql")
      .send({
        query: `
        mutation CreateNewLearningObjective($learningObjective: LearningObjectiveTypeInput!) {
          createNewLearningObjective(learningObjective: $learningObjective) {
            _id
            variableName
            title
            criteria
          }
        }`,
        variables: {
          learningObjective: {
            variableName: "test_learning_objective",
            title: "Test Learning Objective",
            criteria: "Test Learning Objective Criteria",
          },
        },
      });
    expect(response1.status).to.equal(200);
    expect(response1.body.data.createNewLearningObjective).to.exist;
    expect(response1.body.data.createNewLearningObjective._id).to.exist;
    expect(
      response1.body.data.createNewLearningObjective.variableName
    ).to.equal("test_learning_objective");
    expect(response1.body.data.createNewLearningObjective.title).to.equal(
      "Test Learning Objective"
    );
    expect(response1.body.data.createNewLearningObjective.criteria).to.equal(
      "Test Learning Objective Criteria"
    );
  });
});
