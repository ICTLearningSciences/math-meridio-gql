/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLBoolean,
  GraphQLList,
  GraphQLInputObjectType,
} from "graphql";
import { Schema } from "mongoose";
import { DiscussionStageStepType } from "./types";

export const StageBuilderStepType = new GraphQLObjectType({
  name: "StageBuilderStepType",
  fields: () => ({
    stepId: { type: GraphQLString },
    stepType: { type: GraphQLString },
    jumpToStepId: { type: GraphQLString },
  }),
});

export const StageBuilderStepTypeInput = new GraphQLInputObjectType({
  name: "StageBuilderStepTypeInput",
  fields: () => ({
    stepId: { type: GraphQLString },
    stepType: { type: GraphQLString },
    jumpToStepId: { type: GraphQLString },
  }),
});

export const SystemMessageStageStepType = new GraphQLObjectType({
  name: "SystemMessageStageStepType",
  fields: () => ({
    stepId: { type: GraphQLString },
    jumpToStepId: { type: GraphQLString },
    lastStep: { type: GraphQLBoolean },
    stepType: {
      type: GraphQLString,
      value: DiscussionStageStepType.SYSTEM_MESSAGE,
    },
    message: { type: GraphQLString },
  }),
});

export const SystemMessageStageStepTypeInput = new GraphQLInputObjectType({
  name: "SystemMessageStageStepTypeInput",
  fields: () => ({
    stepId: { type: GraphQLString },
    jumpToStepId: { type: GraphQLString },
    lastStep: { type: GraphQLBoolean },
    stepType: {
      type: GraphQLString,
      value: DiscussionStageStepType.SYSTEM_MESSAGE,
    },
    message: { type: GraphQLString },
  }),
});

export const PredefinedResponseType = new GraphQLObjectType({
  name: "PredefinedResponseType",
  fields: () => ({
    clientId: { type: GraphQLString },
    message: { type: GraphQLString },
    isArray: { type: GraphQLBoolean },
    jumpToStepId: { type: GraphQLString },
    responseWeight: { type: GraphQLString },
  }),
});

export const PredefinedResponseSchema = new Schema({
  clientId: { type: String },
  message: { type: String },
  isArray: { type: Boolean },
  jumpToStepId: { type: String, require: false },
  responseWeight: { type: String, default: "0" },
});

export const PredefinedResponseTypeInput = new GraphQLInputObjectType({
  name: "PredefinedResponseTypeInput",
  fields: () => ({
    clientId: { type: GraphQLString },
    message: { type: GraphQLString },
    isArray: { type: GraphQLBoolean },
    jumpToStepId: { type: GraphQLString },
    responseWeight: { type: GraphQLString },
  }),
});

export const RequestUserInputStageStepType = new GraphQLObjectType({
  name: "RequestUserInputStageStepType",
  fields: () => ({
    stepId: { type: GraphQLString },
    jumpToStepId: { type: GraphQLString },
    lastStep: { type: GraphQLBoolean },
    stepType: {
      type: GraphQLString,
      value: DiscussionStageStepType.REQUEST_USER_INPUT,
    },
    message: { type: GraphQLString },
    saveResponseVariableName: { type: GraphQLString },
    disableFreeInput: { type: GraphQLBoolean },
    predefinedResponses: { type: GraphQLList(PredefinedResponseType) },
  }),
});

export const RequestUserInputStageStepTypeInput = new GraphQLInputObjectType({
  name: "RequestUserInputStageStepTypeInput",
  fields: () => ({
    stepId: { type: GraphQLString },
    jumpToStepId: { type: GraphQLString },
    lastStep: { type: GraphQLBoolean },
    stepType: {
      type: GraphQLString,
      value: DiscussionStageStepType.REQUEST_USER_INPUT,
    },
    message: { type: GraphQLString },
    saveResponseVariableName: { type: GraphQLString },
    disableFreeInput: { type: GraphQLBoolean },
    predefinedResponses: { type: GraphQLList(PredefinedResponseTypeInput) },
  }),
});

export const PromptStageStepType = new GraphQLObjectType({
  name: "PromptStageStepType",
  fields: () => ({
    stepId: { type: GraphQLString },
    jumpToStepId: { type: GraphQLString },
    lastStep: { type: GraphQLBoolean },
    stepType: { type: GraphQLString, value: DiscussionStageStepType.PROMPT },
    promptText: { type: GraphQLString },
    responseFormat: { type: GraphQLString },
    includeChatLogContext: { type: GraphQLBoolean },
    outputDataType: { type: GraphQLString },
    jsonResponseData: { type: GraphQLString },
    customSystemRole: { type: GraphQLString },
  }),
});

export const PromptStageStepTypeInput = new GraphQLInputObjectType({
  name: "PromptStageStepTypeInput",
  fields: () => ({
    stepId: { type: GraphQLString },
    lastStep: { type: GraphQLBoolean },
    jumpToStepId: { type: GraphQLString },
    stepType: { type: GraphQLString, value: DiscussionStageStepType.PROMPT },
    promptText: { type: GraphQLString },
    responseFormat: { type: GraphQLString },
    includeChatLogContext: { type: GraphQLBoolean },
    outputDataType: { type: GraphQLString },
    jsonResponseData: { type: GraphQLString },
    customSystemRole: { type: GraphQLString },
  }),
});

// schemas

const StageBuilderStepSchema = new Schema(
  {
    stepId: { type: String },
    stepType: { type: String },
    jumpToStepId: { type: String },
    lastStep: { type: Boolean, default: false },
    // other common fields...
  },
  { timestamps: true, discriminatorKey: "stepType" } // Use stepType as the discriminator key
);

export const SystemMessageStageStepSchema = new Schema({
  ...StageBuilderStepSchema.obj,
  stepType: { type: String, default: DiscussionStageStepType.SYSTEM_MESSAGE },
  message: { type: String },
});

export const RequestUserInputStageStepSchema = new Schema({
  ...StageBuilderStepSchema.obj,
  stepType: {
    type: String,
    default: DiscussionStageStepType.REQUEST_USER_INPUT,
  },
  message: { type: String },
  saveResponseVariableName: { type: String },
  disableFreeInput: { type: Boolean },
  predefinedResponses: [PredefinedResponseSchema],
});

export const PromptStageStepSchema = new Schema({
  ...StageBuilderStepSchema.obj,
  stepType: { type: String, default: DiscussionStageStepType.PROMPT },
  promptText: { type: String },
  responseFormat: { type: String },
  includeChatLogContext: { type: Boolean },
  outputDataType: { type: String },
  jsonResponseData: { type: String },
  customSystemRole: { type: String },
});

// union the 3 step schemas
export const StageBuilderStepUnionSchema = new Schema({
  ...SystemMessageStageStepSchema.obj,
  ...RequestUserInputStageStepSchema.obj,
  ...PromptStageStepSchema.obj,
});
