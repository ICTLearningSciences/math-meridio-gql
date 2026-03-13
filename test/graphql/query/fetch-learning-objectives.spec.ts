/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import createApp, { appStart, appStop } from "app";
import { expect } from "chai";
import { Express } from "express";
import { describe } from "mocha";
import mongoUnit from "mongo-unit";
import request from "supertest";

describe("fetch learning objectives", () => {
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

  it(`can fetch learning objectives`, async () => {
    const response = await request(app)
      .post("/graphql")
      .send({
        query: `query FetchLearningObjectives{
                    fetchLearningObjectives { 
                        edges{
                            node{
                                _id
                                variableName
                                title
                                criteria
                            }
                        }
                    }
        }`,
      });
    expect(response.status).to.equal(200);
    expect(response.body.data.fetchLearningObjectives.edges.length).to.equal(3);
    const allLearningObjectives =
      response.body.data.fetchLearningObjectives.edges.map(
        (edge: any) => edge.node
      );

    expect(allLearningObjectives).to.deep.include.members([
      {
        _id: "5ffdf1231ee2b62321a49e31",
        variableName: "test_learning_objective",
        title: "Test Learning Objective",
        criteria: "Test Learning Objective Criteria",
      },
      {
        _id: "5ffdf1231ee2b62321a49e32",
        variableName: "test_learning_objective_1",
        title: "Test Learning Objective 1",
        criteria: "Test Learning Objective 1 Criteria",
      },
      {
        _id: "5ffdf1231ee2b62321a49e34",
        variableName: "test_learning_objective_2",
        title: "Test Learning Objective 2",
        criteria: "Test Learning Objective 2 Criteria",
      },
    ]);
  });
});
