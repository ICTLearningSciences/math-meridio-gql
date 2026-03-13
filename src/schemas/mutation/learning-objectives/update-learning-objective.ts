/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import LearningObjectiveModel, {
  LearningObjective,
  LearningObjectiveType,
  LearningObjectiveTypeInput,
} from "../../../schemas/models/LearningObjective";
import { GraphQLObjectType, GraphQLNonNull, GraphQLString } from "graphql";

export const updateLearningObjective = {
  type: LearningObjectiveType,
  args: {
    learningObjectiveId: { type: GraphQLString },
    learningObjective: { type: new GraphQLNonNull(LearningObjectiveTypeInput) },
  },
  resolve: async (
    _root: GraphQLObjectType,
    args: { learningObjectiveId: string; learningObjective: LearningObjective }
  ): Promise<LearningObjective> => {
    return await LearningObjectiveModel.findOneAndUpdate(
      { _id: args.learningObjectiveId },
      { $set: args.learningObjective },
      { new: true }
    );
  },
};

export default updateLearningObjective;
