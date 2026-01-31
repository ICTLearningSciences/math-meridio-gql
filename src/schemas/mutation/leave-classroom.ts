/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { GraphQLObjectType, GraphQLString } from "graphql";
import { EducationalRole } from "../models/Player";
import ClassModel from "../models/classes/Class";
import ClassMembershipModel, {
  ClassMembership,
  ClassMembershipStatus,
  ClassMembershipType,
} from "../models/classes/ClassMembership";
import RoomModel from "../models/Room";

export const leaveClassroom = {
  type: ClassMembershipType,
  args: {
    classId: { type: GraphQLString },
  },
  resolve: async (
    _root: GraphQLObjectType,
    args: {
      classId: string;
    },
    context: {
      userId: string;
      userEducationalRole: EducationalRole;
    }
  ): Promise<ClassMembership> => {
    try {
      const userId = context.userId;
      const { classId } = args;

      // Get classroom document
      const classroom = await ClassModel.findById(classId);
      if (!classroom) {
        throw new Error("Classroom not found");
      }

      // Fetch ClassMembership by userId and classId
      const classMembership = await ClassMembershipModel.findOne({
        classId: classId,
        userId: userId,
      });

      if (!classMembership) {
        throw new Error("Class membership not found");
      }

      if (classMembership.status === ClassMembershipStatus.REMOVED) {
        throw new Error("Student is already removed from this classroom");
      }

      if (classMembership.status === ClassMembershipStatus.BLOCKED) {
        throw new Error("Student is blocked from this classroom");
      }

      // Set ClassMembership status to REMOVED
      classMembership.status = ClassMembershipStatus.REMOVED;
      await classMembership.save();

      // Remove student from any rooms within the class
      await RoomModel.updateMany(
        {
          classId: classId,
          "gameData.players": userId,
        },
        {
          $pull: { "gameData.players": userId },
        }
      );

      return classMembership;
    } catch (error) {
      throw new Error(error);
    }
  },
};

export default leaveClassroom;
