/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { GraphQLObjectType, GraphQLString } from "graphql";
import { EducationalRole } from "../models/Player";
import {
  ClassMembershipStatus,
  ClassMembershipType,
} from "../models/classes/ClassMembership";
import ClassMembershipModel, {
  ClassMembership,
} from "schemas/models/classes/ClassMembership";
import PlayerModel from "schemas/models/Player";

export const createClassroom = {
  type: ClassMembershipType,
  args: {
    classId: { type: GraphQLString },
    userEmail: { type: GraphQLString },
  },
  resolve: async (
    _root: GraphQLObjectType,
    args: {
      classId: string;
      userEmail: string;
    },
    context: {
      userEducationalRole: EducationalRole;
    }
  ): Promise<ClassMembership> => {
    try {
      const { classId, userEmail } = args;
      const userEducationalRole = context.userEducationalRole;
      if (userEducationalRole !== EducationalRole.INSTRUCTOR) {
        throw new Error("User is not an instructor");
      }
      const existingUser = await PlayerModel.findOne({ email: userEmail });
      const classMembership = await ClassMembershipModel.create({
        classId,
        userEmail,
        status: ClassMembershipStatus.MEMBER,
        userId: existingUser?._id.toString(),
      });
      return classMembership;
    } catch (error) {
      throw new Error(error);
    }
  },
};

export default createClassroom;
