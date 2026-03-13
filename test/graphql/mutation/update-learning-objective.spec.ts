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

import LearningObjectiveModel, {
  LearningObjective,
} from "../../../src/schemas/models/LearningObjective";

describe("update learning objective", () => {
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

  it(`can update a learning objective`, async () => {
    const learningObjective1 = await LearningObjectiveModel.create({
      variableName: "test_learning_objective_update",
      title: "Test Learning Objective Update",
      criteria: "Test Learning Objective Update Criteria",
    });
    const learningObjective1Id = learningObjective1._id.toString();
    const response1 = await request(app)
      .post("/graphql")
      .send({
        query: `
        mutation UpdateLearningObjective($learningObjectiveId: String!, $learningObjective: LearningObjectiveTypeInput!) {
          updateLearningObjective(learningObjectiveId: $learningObjectiveId, learningObjective: $learningObjective) {
            _id
            variableName
            title
            criteria
          }
        }`,
        variables: {
          learningObjectiveId: learningObjective1Id,
          learningObjective: {
            variableName: "test_learning_objective_update_2",
            title: "Test Learning Objective Update 2",
            criteria: "Test Learning Objective Update 2 Criteria",
          },
        },
      });
    expect(response1.status).to.equal(200);
    expect(response1.body.data.updateLearningObjective).to.exist;
    expect(response1.body.data.updateLearningObjective._id).to.exist;
    expect(response1.body.data.updateLearningObjective.variableName).to.equal(
      "test_learning_objective_update_2"
    );
    expect(response1.body.data.updateLearningObjective.title).to.equal(
      "Test Learning Objective Update 2"
    );
    expect(response1.body.data.updateLearningObjective.criteria).to.equal(
      "Test Learning Objective Update 2 Criteria"
    );

    const learningObjectiveAfterUpdate = await LearningObjectiveModel.findById(
      learningObjective1Id
    );
    expect(learningObjectiveAfterUpdate?.variableName).to.equal(
      "test_learning_objective_update_2"
    );
    expect(learningObjectiveAfterUpdate?.title).to.equal(
      "Test Learning Objective Update 2"
    );
    expect(learningObjectiveAfterUpdate?.criteria).to.equal(
      "Test Learning Objective Update 2 Criteria"
    );
  });
});
