/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import mongoose, { Model, Schema } from "mongoose";
import {
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLList,
  GraphQLUnionType,
} from "graphql";
import {
  PaginatedResolveResult,
  PaginateOptions,
  PaginateQuery,
  pluginPagination,
} from "../Paginatation";
import {
  StageBuilderStepUnionSchema,
  PromptStageStepType,
  RequestUserInputStageStepType,
  SystemMessageStageStepType,
  PromptStageStepTypeInput,
  RequestUserInputStageStepTypeInput,
  SystemMessageStageStepTypeInput,
  SystemMessageStageStepSchema,
  RequestUserInputStageStepSchema,
  PromptStageStepSchema,
} from "./objects";
import { DiscussionStage, DiscussionStageStepType } from "./types";

// union the different step types
export const StageBuilderStepTypeUnion = new GraphQLUnionType({
  name: "StageBuilderStepTypeUnion",
  types: [
    PromptStageStepType,
    RequestUserInputStageStepType,
    SystemMessageStageStepType,
  ],
  resolveType(value) {
    switch (value.stepType) {
      case DiscussionStageStepType.PROMPT:
        return PromptStageStepType;
      case DiscussionStageStepType.REQUEST_USER_INPUT:
        return RequestUserInputStageStepType;
      case DiscussionStageStepType.SYSTEM_MESSAGE:
        return SystemMessageStageStepType;
      default:
        throw new Error("invalid step type");
    }
  },
});

export const StepsFlowType = new GraphQLObjectType({
  name: "StepsFlowType",
  fields: () => ({
    clientId: { type: GraphQLString },
    steps: { type: GraphQLList(StageBuilderStepTypeUnion) },
    name: { type: GraphQLString },
  }),
});

export const StepsFlowInputType = new GraphQLInputObjectType({
  name: "StepsFlowInputType",
  fields: () => ({
    clientId: { type: GraphQLString },
    steps: { type: GraphQLList(StageBuilderStepTypeInputUnion) },
    name: { type: GraphQLString },
  }),
});

export const StepsFlowSchema = new Schema(
  {
    name: { type: String },
    clientId: { type: String },
    steps: [StageBuilderStepUnionSchema],
  },
  { timestamps: true, collation: { locale: "en", strength: 2 } }
);

export const StageBuilderStepTypeInputUnion = new GraphQLInputObjectType({
  name: "StageBuilderStepTypeInputUnion",
  fields: {
    ...PromptStageStepTypeInput.getFields(),
    ...RequestUserInputStageStepTypeInput.getFields(),
    ...SystemMessageStageStepTypeInput.getFields(),
  },
});

export const DiscussionStageType = new GraphQLObjectType({
  name: "DiscussionStageType",
  fields: () => ({
    _id: { type: GraphQLID },
    clientId: { type: GraphQLString },
    stageType: { type: GraphQLString },
    title: { type: GraphQLString },
    description: { type: GraphQLString },
    flowsList: { type: GraphQLList(StepsFlowType) },
  }),
});

export const DiscussionStageInputType = new GraphQLInputObjectType({
  name: "DiscussionStageInputType",
  fields: () => ({
    _id: { type: GraphQLID },
    stageType: { type: GraphQLString },
    clientId: { type: GraphQLString },
    title: { type: GraphQLString },
    description: { type: GraphQLString },
    flowsList: { type: GraphQLList(StepsFlowInputType) },
  }),
});

export const BuiltStageSchema = new Schema(
  {
    title: { type: String },
    clientId: { type: String },
    stageType: { type: String },
    description: { type: String },
    flowsList: [StepsFlowSchema],
  },
  { timestamps: true, collation: { locale: "en", strength: 2 } }
);

export interface _DiscussionStageModel extends Model<DiscussionStage> {
  paginate(
    query?: PaginateQuery<DiscussionStage>,
    options?: PaginateOptions
  ): Promise<PaginatedResolveResult<DiscussionStage>>;
}

pluginPagination(BuiltStageSchema);

const DiscussionStageModel = mongoose.model<
  DiscussionStage,
  _DiscussionStageModel
>("DiscussionStage", BuiltStageSchema);

DiscussionStageModel.discriminator(
  DiscussionStageStepType.SYSTEM_MESSAGE,
  SystemMessageStageStepSchema
);

DiscussionStageModel.discriminator(
  DiscussionStageStepType.REQUEST_USER_INPUT,
  RequestUserInputStageStepSchema
);

DiscussionStageModel.discriminator("PromptStep", PromptStageStepSchema);

export default DiscussionStageModel;
