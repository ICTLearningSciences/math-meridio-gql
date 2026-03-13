/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import mongoose, { Schema, Document, Model } from "mongoose";
import {
  GraphQLString,
  GraphQLObjectType,
  GraphQLInt,
  GraphQLList,
} from "graphql";
import {
  PaginatedResolveResult,
  PaginateOptions,
  PaginateQuery,
  pluginPagination,
} from "./Paginatation";
import {
  LearningObjective,
  LearningObjectiveSchema,
  LearningObjectiveType,
} from "./LearningObjective";

export interface StudentSubmissionLog extends Document {
  userId: string;
  roomId: string;
  roundNumber: number;

  phaseStepId: string;
  phaseLearningObjectives: LearningObjective[];

  requestUserInputStepId: string;
  systemMessage: string;
  studentResponse: string;
  expectedLearningObjectives: LearningObjective[];
  // titles of the learning objectives that the student covered
  studentCoveredLearningObjectives: string[];
}

export interface StudentSubmissionLogModel extends Model<StudentSubmissionLog> {
  paginate(
    query?: PaginateQuery<StudentSubmissionLog>,
    options?: PaginateOptions
  ): Promise<PaginatedResolveResult<StudentSubmissionLog>>;
}

export const StudentSubmissionLogSchema = new Schema<
  StudentSubmissionLog,
  StudentSubmissionLogModel
>(
  {
    userId: { type: String, required: true },
    roomId: { type: String, required: true },
    roundNumber: { type: Number, required: true },
    phaseStepId: { type: String, required: true },
    phaseLearningObjectives: {
      type: [LearningObjectiveSchema],
      required: false,
      default: [],
    },
    requestUserInputStepId: { type: String, required: true },
    systemMessage: { type: String, required: true },
    studentResponse: { type: String, required: true },
    expectedLearningObjectives: {
      type: [LearningObjectiveSchema],
      required: false,
      default: [],
    },
    studentCoveredLearningObjectives: {
      type: [String],
      required: false,
      default: [],
    },
  },
  {
    timestamps: true,
    collation: { locale: "en", strength: 2 },
    minimize: false,
  }
);

pluginPagination(StudentSubmissionLogSchema);

export const StudentSubmissionLogType = new GraphQLObjectType({
  name: "StudentSubmissionLogType",
  fields: () => ({
    userId: { type: GraphQLString },
    roomId: { type: GraphQLString },
    roundNumber: { type: GraphQLInt },
    phaseStepId: { type: GraphQLString },
    phaseLearningObjectives: { type: new GraphQLList(LearningObjectiveType) },
    requestUserInputStepId: { type: GraphQLString },
    systemMessage: { type: GraphQLString },
    studentResponse: { type: GraphQLString },
    expectedLearningObjectives: {
      type: new GraphQLList(LearningObjectiveType),
    },
    studentCoveredLearningObjectives: { type: new GraphQLList(GraphQLString) },
  }),
});

export default mongoose.model<StudentSubmissionLog, StudentSubmissionLogModel>(
  "StudentSubmissionLog",
  StudentSubmissionLogSchema
);
