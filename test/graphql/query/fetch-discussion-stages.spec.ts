/*

*/
/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import createApp, { appStart, appStop } from "app";
import { expect } from "chai";
import { Express } from "express";
import { describe } from "mocha";
import mongoUnit from "mongo-unit";
import request from "supertest";
import { DiscussionStageStepType } from "../../../src/schemas/models/DiscussionStage/types";

export const fullDiscussionStageQueryData = `
                      _id
                      clientId
                      title
                      stageType
                      description
                      flowsList{
                        clientId
                        name
                        steps{
                          ... on SystemMessageStageStepType {
                              stepId
                              stepType
                              jumpToStepId
                              message
                          }

                          ... on RequestUserInputStageStepType {
                              stepId
                              stepType
                              jumpToStepId
                              message
                              saveResponseVariableName
                              disableFreeInput
                              predefinedResponses{
                                  clientId
                                  message
                                  isArray
                                  jumpToStepId
                                  responseWeight
                              }
                          }

                          ... on PromptStageStepType{
                              stepId
                              stepType
                              jumpToStepId
                              promptText
                              responseFormat
                              includeChatLogContext
                              outputDataType
                              jsonResponseData
                              customSystemRole
                          }
                      }
                      }
`;

describe("fetch discussion stages", () => {
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

  it(`can fetch discussion stages`, async () => {
    const response = await request(app)
      .post("/graphql")
      .send({
        query: `query FetchDiscussionStages{
                    fetchDiscussionStages { 
                        ${fullDiscussionStageQueryData}
                    }
        }`,
        variables: {
          limit: 1,
        },
      });
    expect(response.status).to.equal(200);
    expect(response.body.data.fetchDiscussionStages.length).to.equal(1);
    expect(response.body.data.fetchDiscussionStages[0].title).to.equal(
      "Test AI Response Data"
    );
    expect(response.body.data.fetchDiscussionStages[0].stageType).to.equal(
      "discussion"
    );
    expect(
      response.body.data.fetchDiscussionStages[0].flowsList.length
    ).to.equal(1);
    expect(
      response.body.data.fetchDiscussionStages[0].flowsList[0].steps.length
    ).to.equal(5);
    expect(
      response.body.data.fetchDiscussionStages[0].flowsList[0].steps[0].stepType
    ).to.equal(DiscussionStageStepType.SYSTEM_MESSAGE);
  });
});
