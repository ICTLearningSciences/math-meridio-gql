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

export enum RequireInputType {
  SINGLE_RESPONSE_REQUIRED = "SINGLE_RESPONSE_REQUIRED",
  ALL_USER_RESPONSES_REQUIRED_FREE_FOR_ALL = "ALL_USER_RESPONSES_REQUIRED_FREE_FOR_ALL",
  ALL_USER_RESPONSES_REQUIRED_IN_ORDER = "ALL_REQUIRED_IN_ORDER",
}

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
    requireInputType: { type: GraphQLString },
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
    requireInputType: { type: GraphQLString },
  }),
});

export const SingleConditionalType = new GraphQLObjectType({
  name: "SingleConditionalType",
  fields: () => ({
    stateDataKey: { type: GraphQLString },
    checking: { type: GraphQLString },
    operation: { type: GraphQLString },
    expectedValue: { type: GraphQLString },
  }),
});

export const SingleConditionalTypeInput = new GraphQLInputObjectType({
  name: "SingleConditionalTypeInput",
  fields: () => ({
    stateDataKey: { type: GraphQLString },
    checking: { type: GraphQLString },
    operation: { type: GraphQLString },
    expectedValue: { type: GraphQLString },
  }),
});

export const ConditionalActivityStepType = new GraphQLObjectType({
  name: "ConditionalActivityStepType",
  fields: () => ({
    stepId: { type: GraphQLString },
    jumpToStepId: { type: GraphQLString },
    lastStep: { type: GraphQLBoolean },
    stepType: {
      type: GraphQLString,
      value: DiscussionStageStepType.CONDITIONAL,
    },
    targetStepId: { type: GraphQLString },
    conditionalsToMeet: { type: GraphQLList(SingleConditionalType) },
  }),
});

export const ConditionalActivityStepTypeInput = new GraphQLInputObjectType({
  name: "ConditionalActivityStepTypeInput",
  fields: () => ({
    stepId: { type: GraphQLString },
    jumpToStepId: { type: GraphQLString },
    stepType: {
      type: GraphQLString,
      value: DiscussionStageStepType.CONDITIONAL,
    },
    targetStepId: { type: GraphQLString },
    conditionalsToMeet: { type: GraphQLList(SingleConditionalTypeInput) },
  }),
});

export const IncludeMessageContextType = new GraphQLObjectType({
  name: "IncludeMessageContextType",
  fields: () => ({
    type: { type: GraphQLString, enum: IncludeMessagesContextTypeEnum },
    stepIds: { type: GraphQLList(GraphQLString) },
    // numRecentMessages: { type: GraphQLInt },
    includeMessagesFromOtherUsers: { type: GraphQLBoolean },
  }),
});

export const PromptConfigurationType = new GraphQLObjectType({
  name: "PromptConfigurationType",
  fields: () => ({
    processPromptAs: { type: GraphQLString },
    promptText: { type: GraphQLString },
    responseFormat: { type: GraphQLString },
    includeChatLogContext: { type: GraphQLBoolean },
    analyzeLearningObjectives: { type: GraphQLBoolean },
    includeMessageContext: { type: IncludeMessageContextType },
    outputDataType: { type: GraphQLString },
    jsonResponseData: { type: GraphQLString },
    customSystemRole: { type: GraphQLString },
  }),
});

export const PromptStageStepType = new GraphQLObjectType({
  name: "PromptStageStepType",
  fields: () => ({
    stepId: { type: GraphQLString },
    jumpToStepId: { type: GraphQLString },
    lastStep: { type: GraphQLBoolean },
    stepType: { type: GraphQLString, value: DiscussionStageStepType.PROMPT },
    prompts: { type: GraphQLList(PromptConfigurationType) },
  }),
});

export const IncludeMessageContextTypeInput = new GraphQLInputObjectType({
  name: "IncludeMessageContextTypeInput",
  fields: () => ({
    type: { type: GraphQLString, enum: IncludeMessagesContextTypeEnum },
    stepIds: { type: GraphQLList(GraphQLString) },
    // numRecentMessages: { type: GraphQLInt },
    includeMessagesFromOtherUsers: { type: GraphQLBoolean },
  }),
});

export const PromptConfigurationTypeInput = new GraphQLInputObjectType({
  name: "PromptConfigurationTypeInput",
  fields: () => ({
    processPromptAs: { type: GraphQLString },
    promptText: { type: GraphQLString },
    responseFormat: { type: GraphQLString },
    includeChatLogContext: { type: GraphQLBoolean },
    analyzeLearningObjectives: { type: GraphQLBoolean },
    includeMessageContext: { type: IncludeMessageContextTypeInput },
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
    prompts: { type: GraphQLList(PromptConfigurationTypeInput) },
  }),
});

export const EndOfPhaseReflectionStepType = new GraphQLObjectType({
  name: "EndOfPhaseReflectionStepType",
  fields: () => ({
    stepId: { type: GraphQLString },
    lastStep: { type: GraphQLBoolean },
    stepType: {
      type: GraphQLString,
      value: DiscussionStageStepType.END_OF_PHASE_REFLECTION,
    },
    parentStartOfPhaseStepId: { type: GraphQLString },
    skipReflectionCollection: { type: GraphQLBoolean },
    message: { type: GraphQLString },
    questions: { type: GraphQLList(GraphQLString) },
  }),
});

export const LearningObjectiveType = new GraphQLObjectType({
  name: "LearningObjectiveType",
  fields: () => ({
    variableName: { type: GraphQLString },
    title: { type: GraphQLString },
    criteria: { type: GraphQLString },
  }),
});

export const StartOfPhaseStepType = new GraphQLObjectType({
  name: "StartOfPhaseStepType",
  fields: () => ({
    stepId: { type: GraphQLString },
    stepType: {
      type: GraphQLString,
      value: DiscussionStageStepType.START_OF_PHASE,
    },
    phaseTitle: { type: GraphQLString },
    learningObjectives: { type: GraphQLList(LearningObjectiveType) },
    lastStep: { type: GraphQLBoolean },
  }),
});

export const LearningObjectiveTypeInput = new GraphQLInputObjectType({
  name: "LearningObjectiveTypeInput",
  fields: () => ({
    variableName: { type: GraphQLString },
    title: { type: GraphQLString },
    criteria: { type: GraphQLString },
  }),
});

export const StartOfPhaseStepTypeInput = new GraphQLInputObjectType({
  name: "StartOfPhaseStepTypeInput",
  fields: () => ({
    stepId: { type: GraphQLString },
    stepType: {
      type: GraphQLString,
      value: DiscussionStageStepType.START_OF_PHASE,
    },
    phaseTitle: { type: GraphQLString },
    lastStep: { type: GraphQLBoolean },
    learningObjectives: { type: GraphQLList(LearningObjectiveTypeInput) },
  }),
});

export const EndOfPhaseReflectionStepTypeInput = new GraphQLInputObjectType({
  name: "EndOfPhaseReflectionStepTypeInput",
  fields: () => ({
    stepId: { type: GraphQLString },
    parentStartOfPhaseStepId: { type: GraphQLString },
    lastStep: { type: GraphQLBoolean },
    stepType: {
      type: GraphQLString,
      value: DiscussionStageStepType.END_OF_PHASE_REFLECTION,
    },
    skipReflectionCollection: { type: GraphQLBoolean },
    message: { type: GraphQLString },
    questions: { type: GraphQLList(GraphQLString) },
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
  requireInputType: {
    type: GraphQLString,
    default: RequireInputType.ALL_USER_RESPONSES_REQUIRED_FREE_FOR_ALL,
  },
});

export const SingleConditionalSchema = new Schema({
  stateDataKey: { type: String },
  checking: { type: String },
  operation: { type: String },
  expectedValue: { type: String },
});

export const LogicOperationActivityStepSchema = new Schema({
  ...StageBuilderStepSchema.obj,
  stepType: { type: String, default: DiscussionStageStepType.CONDITIONAL },
  targetStepId: { type: String },
  conditionalsToMeet: [SingleConditionalSchema],
});

export enum ProcessPromptAs {
  GROUP = "GROUP",
  INDIVIDUALLY = "INDIVIDUALLY",
}

export enum IncludeMessagesContextTypeEnum {
  NONE = "NONE",
  ALL_MESSAGES = "ALL_MESSAGES",
  // NUM_RECENT_MESSAGES = "NUM_RECENT_MESSAGES",
  FROM_INPUT_STEPS = "FROM_INPUT_STEPS",
}

export const IncludeMessageContextSchema = new Schema({
  type: { type: String, enum: IncludeMessagesContextTypeEnum },
  stepIds: { type: [String], default: [] },
  // numRecentMessages: { type: Number, default: 10 },
  includeMessagesFromOtherUsers: { type: Boolean, default: false },
});

export const PromptConfigurationSchema = new Schema({
  processPromptAs: { type: String, default: ProcessPromptAs.INDIVIDUALLY },
  promptText: { type: String },
  analyzeLearningObjectives: { type: Boolean },
  includeMessageContext: {
    type: IncludeMessageContextSchema,
    default: {
      type: IncludeMessagesContextTypeEnum.NONE,
      stepIds: [],
      includeMessagesFromOtherUsers: false,
    },
  },
  responseFormat: { type: String },
  includeChatLogContext: { type: Boolean },
  outputDataType: { type: String },
  jsonResponseData: { type: String },
  customSystemRole: { type: String },
});

export const PromptStageStepSchema = new Schema({
  ...StageBuilderStepSchema.obj,
  stepType: { type: String, default: DiscussionStageStepType.PROMPT },
  prompts: [PromptConfigurationSchema],
});

export const LearningObjectiveSchema = new Schema(
  {
    variableName: { type: String },
    title: { type: String },
    criteria: { type: String },
  },
  { _id: false }
);

export const StartOfPhaseStepSchema = new Schema({
  ...StageBuilderStepSchema.obj,
  stepType: { type: String, default: DiscussionStageStepType.START_OF_PHASE },
  phaseTitle: { type: String },
  learningObjectives: [LearningObjectiveSchema],
});

export const EndOfPhaseReflectionStepSchema = new Schema({
  ...StageBuilderStepSchema.obj,
  parentStartOfPhaseStepId: { type: String },
  stepType: {
    type: String,
    default: DiscussionStageStepType.END_OF_PHASE_REFLECTION,
  },
  phaseTitle: { type: String },
  skipReflectionCollection: { type: Boolean },
  message: { type: String },
  questions: { type: [String] },
});

// union the 3 step schemas
export const StageBuilderStepUnionSchema = new Schema({
  ...SystemMessageStageStepSchema.obj,
  ...RequestUserInputStageStepSchema.obj,
  ...PromptStageStepSchema.obj,
  ...LogicOperationActivityStepSchema.obj,
  ...StartOfPhaseStepSchema.obj,
  ...EndOfPhaseReflectionStepSchema.obj,
});
