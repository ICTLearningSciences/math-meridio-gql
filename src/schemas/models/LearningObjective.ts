/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import {
  GraphQLInputObjectType,
  GraphQLObjectType,
  GraphQLString,
  GraphQLID,
} from "graphql";
import mongoose, { Document, Model, Schema } from "mongoose";
import {
  PaginatedResolveResult,
  PaginateOptions,
  PaginateQuery,
  pluginPagination,
} from "./Paginatation";

export interface LearningObjective {
  variableName: string;
  title: string;
  criteria: string;
}

export interface LearningObjectiveDocument
  extends LearningObjective,
    Document {}

export const LearningObjectiveTypeInput = new GraphQLInputObjectType({
  name: "LearningObjectiveTypeInput",
  fields: () => ({
    variableName: { type: GraphQLString },
    title: { type: GraphQLString },
    criteria: { type: GraphQLString },
  }),
});

export const LearningObjectiveType = new GraphQLObjectType({
  name: "LearningObjectiveType",
  fields: () => ({
    _id: { type: GraphQLID },
    variableName: { type: GraphQLString },
    title: { type: GraphQLString },
    criteria: { type: GraphQLString },
  }),
});

export const LearningObjectiveSchema = new Schema({
  variableName: { type: String },
  title: { type: String },
  criteria: { type: String },
});

pluginPagination(LearningObjectiveSchema);

export interface LearningObjectiveModel
  extends Model<LearningObjectiveDocument> {
  paginate(
    query?: PaginateQuery<LearningObjectiveDocument>,
    options?: PaginateOptions
  ): Promise<PaginatedResolveResult<LearningObjectiveDocument>>;
}

export default mongoose.model<
  LearningObjectiveDocument,
  LearningObjectiveModel
>("LearningObjective", LearningObjectiveSchema);
