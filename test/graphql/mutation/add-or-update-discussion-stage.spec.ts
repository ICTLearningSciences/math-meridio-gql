/*

*/
/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import createApp, { appStart, appStop } from "../../../src/app";
import { expect } from "chai";
import { Express } from "express";
import { describe } from "mocha";
import mongoUnit from "mongo-unit";
import request from "supertest";
import {
  DiscussionStage,
  DiscussionStageStepType,
  FlowItem,
} from "../../../src/schemas/models/DiscussionStage/types";
import DiscussionStageModel from "../../../src/schemas/models/DiscussionStage/DiscussionStage";
import { fullDiscussionStageQueryData } from "../query/fetch-discussion-stages.spec";

describe("update discussion stage", () => {
  let app: Express;

  beforeEach(async () => {
    await mongoUnit.load(require("../../fixtures/mongodb/data-default.js"));
    app = await createApp();
    await appStart();
  });

  afterEach(async () => {
    await appStop();
    await mongoUnit.drop();
  });

  it("fails if no authorization passed", async () => {
    const stagesPre = await DiscussionStageModel.find();
    expect(stagesPre.length).to.equal(1);
    const flowsListData: FlowItem[] = [
      {
        clientId: "67890",
        name: "flow 1",
        steps: [
          {
            stepId: "123",
            jumpToStepId: "456",
            stepType: DiscussionStageStepType.SYSTEM_MESSAGE,
            message: "message 1",
            lastStep: false,
          },
          {
            stepId: "456",
            jumpToStepId: "789",
            stepType: DiscussionStageStepType.REQUEST_USER_INPUT,
            message: "message 2",
            saveResponseVariableName: "save response variable name 1",
            disableFreeInput: true,
            predefinedResponses: [
              {
                clientId: "123",
                message: "message 1",
                isArray: false,
                jumpToStepId: "jump to step id 1",
                responseWeight: "1",
              },
            ],
            lastStep: false,
          },
          {
            stepId: "789",
            stepType: DiscussionStageStepType.PROMPT,
            promptText: "prompt 1",
            jumpToStepId: "123",
            jsonResponseData: "stringified_json_response_data",
            responseFormat: "response format 1",
            includeChatLogContext: true,
            outputDataType: "JSON",
            customSystemRole: "custom system role 1",
            lastStep: true,
          },
        ],
      },
    ];
    const discussionStage: DiscussionStage = {
      _id: "5ffdf1231ee2c62320b49e5f",
      clientId: "123",
      stageType: "discussion",
      title: "title 1",
      description: "description 1",
      flowsList: flowsListData,
    };
    const response = await request(app)
      .post("/graphql")
      .send({
        query: `mutation AddOrUpdateDiscussionStage($stage: DiscussionStageInputType!) {
          addOrUpdateDiscussionStage(stage: $stage) {
              ${fullDiscussionStageQueryData}
              }
         }`,
        variables: {
          stage: discussionStage,
        },
      });
    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "Unauthorized"
    );
  });

  it("fails if incorrect passed", async () => {
    const stagesPre = await DiscussionStageModel.find();
    expect(stagesPre.length).to.equal(1);
    const flowsListData: FlowItem[] = [
      {
        clientId: "67890",
        name: "flow 1",
        steps: [
          {
            stepId: "123",
            jumpToStepId: "456",
            stepType: DiscussionStageStepType.SYSTEM_MESSAGE,
            message: "message 1",
            lastStep: false,
          },
          {
            stepId: "456",
            jumpToStepId: "789",
            stepType: DiscussionStageStepType.REQUEST_USER_INPUT,
            message: "message 2",
            saveResponseVariableName: "save response variable name 1",
            disableFreeInput: true,
            predefinedResponses: [
              {
                clientId: "123",
                message: "message 1",
                isArray: false,
                jumpToStepId: "jump to step id 1",
                responseWeight: "1",
              },
            ],
            lastStep: false,
          },
          {
            stepId: "789",
            stepType: DiscussionStageStepType.PROMPT,
            promptText: "prompt 1",
            jumpToStepId: "123",
            jsonResponseData: "stringified_json_response_data",
            responseFormat: "response format 1",
            includeChatLogContext: true,
            outputDataType: "JSON",
            customSystemRole: "custom system role 1",
            lastStep: true,
          },
        ],
      },
    ];
    const discussionStage: DiscussionStage = {
      _id: "5ffdf1231ee2c62320b49e5f",
      clientId: "123",
      stageType: "discussion",
      title: "title 1",
      description: "description 1",
      flowsList: flowsListData,
    };
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `bearer wronggqlsecret`)
      .send({
        query: `mutation AddOrUpdateDiscussionStage($stage: DiscussionStageInputType!) {
          addOrUpdateDiscussionStage(stage: $stage) {
              ${fullDiscussionStageQueryData}
              }
         }`,
        variables: {
          stage: discussionStage,
        },
      });
    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "Unauthorized"
    );
  });

  it("can create new discussion stage", async () => {
    const stagesPre = await DiscussionStageModel.find();
    expect(stagesPre.length).to.equal(1);
    const flowsListData: FlowItem[] = [
      {
        clientId: "67890",
        name: "flow 1",
        steps: [
          {
            stepId: "123",
            jumpToStepId: "456",
            stepType: DiscussionStageStepType.SYSTEM_MESSAGE,
            message: "message 1",
            lastStep: false,
          },
          {
            stepId: "456",
            jumpToStepId: "789",
            stepType: DiscussionStageStepType.REQUEST_USER_INPUT,
            message: "message 2",
            saveResponseVariableName: "save response variable name 1",
            disableFreeInput: true,
            predefinedResponses: [
              {
                clientId: "123",
                message: "message 1",
                isArray: false,
                jumpToStepId: "jump to step id 1",
                responseWeight: "1",
              },
            ],
            lastStep: false,
          },
          {
            stepId: "789",
            stepType: DiscussionStageStepType.PROMPT,
            promptText: "prompt 1",
            jumpToStepId: "123",
            jsonResponseData: "stringified_json_response_data",
            responseFormat: "response format 1",
            includeChatLogContext: true,
            outputDataType: "JSON",
            customSystemRole: "custom system role 1",
            lastStep: true,
          },
        ],
      },
    ];
    const discussionStage: DiscussionStage = {
      _id: "5ffdf1231ee2c62320b49e5f",
      clientId: "123",
      stageType: "discussion",
      title: "title 1",
      description: "description 1",
      flowsList: flowsListData,
    };
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `bearer fakegqlsecret`)
      .send({
        query: `mutation AddOrUpdateDiscussionStage($stage: DiscussionStageInputType!) {
          addOrUpdateDiscussionStage(stage: $stage) {
              ${fullDiscussionStageQueryData}
              }
         }`,
        variables: {
          stage: discussionStage,
        },
      });
    expect(response.body.data.addOrUpdateDiscussionStage).to.eql(
      discussionStage
    );
    const stagesPost = await DiscussionStageModel.find();
    expect(stagesPost.length).to.equal(2);
    const savedStage = stagesPost.find(
      (a) => a.clientId === discussionStage.clientId
    );
    if (!savedStage) {
      throw new Error("saved stage not found");
    }

    const response2 = await request(app)
      .post("/graphql")
      .send({
        query: `query FetchDiscussionStages{
          fetchDiscussionStages { 
              ${fullDiscussionStageQueryData}
                  }
        }`,
        variables: {
          limit: 2,
        },
      });
    expect(response2.status).to.equal(200);
    const fetchedStage = response2.body.data.fetchDiscussionStages.find(
      (a: any) => a.clientId === discussionStage.clientId
    );
    expect(fetchedStage).to.eql(discussionStage);
  });

  it(`can update existing discussion stage`, async () => {
    const flowsListData: FlowItem[] = [
      {
        clientId: "5ffdf1231ee2c62320a49e1f",
        name: "flow 1",
        steps: [
          {
            stepId: "123",
            stepType: DiscussionStageStepType.SYSTEM_MESSAGE,
            message: "message 1",
            lastStep: false,
          },
          {
            stepId: "456",
            stepType: DiscussionStageStepType.SYSTEM_MESSAGE,
            message: "message 2",
            lastStep: false,
          },
          {
            stepId: "789",
            stepType: DiscussionStageStepType.SYSTEM_MESSAGE,
            message: "prompt 1",
            lastStep: true,
          },
        ],
      },
    ];
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `bearer fakegqlsecret`)
      .send({
        query: `mutation AddOrUpdateDiscussionStage($stage: DiscussionStageInputType!) {
          addOrUpdateDiscussionStage(stage: $stage) {
                        flowsList{
                        clientId
                        name
                          steps{
                            ... on SystemMessageStageStepType {
                                lastStep
                                stepId
                                stepType
                                message
                            }

                            ... on RequestUserInputStageStepType {
                                lastStep
                                stepId
                                stepType
                                message
                            }

                            ... on PromptStageStepType{
                                lastStep
                                stepId
                                stepType
                                promptText
                            }
                        }
                        }
              }
         }`,
        variables: {
          stage: {
            _id: "5ffdf1231ee2c62320b49e1f",
            flowsList: flowsListData,
          },
        },
      });
    expect(response.status).to.equal(200);
    expect(response.body.data.addOrUpdateDiscussionStage).to.eql({
      flowsList: flowsListData,
    });
  });

  it("can update subfield of existing discussion stage", async () => {
    const preUpdate: DiscussionStage | null =
      await DiscussionStageModel.findOne({
        _id: "5ffdf1231ee2c62320b49e2f",
      });
    expect(preUpdate).to.not.be.null;
    expect(preUpdate!.flowsList[0].steps.length).to.equal(5);
    expect(preUpdate!.description).to.not.equal("new description");

    const updateDiscussionStage: Partial<DiscussionStage> = {
      _id: "5ffdf1231ee2c62320b49e2f",
      description: "new description",
    };
    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `bearer fakegqlsecret`)
      .send({
        query: `mutation AddOrUpdateDiscussionStage($stage: DiscussionStageInputType!) {
        addOrUpdateDiscussionStage(stage: $stage) {
            ${fullDiscussionStageQueryData}
            }
       }`,
        variables: {
          stage: updateDiscussionStage,
        },
      });
    expect(response.status).to.equal(200);
    const postUpdate = await DiscussionStageModel.findOne({
      _id: "5ffdf1231ee2c62320b49e2f",
    });
    expect(postUpdate).to.not.be.null;
    expect(postUpdate!.description).to.equal("new description");
    expect(preUpdate!.flowsList[0].steps.length).to.equal(5);
  });
});
