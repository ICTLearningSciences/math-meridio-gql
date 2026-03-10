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
import { canModifyClassroom } from "../../helpers";

export const removeStudentFromClass = {
  type: ClassMembershipType,
  args: {
    studentId: { type: GraphQLString },
    classId: { type: GraphQLString },
  },
  resolve: async (
    _root: GraphQLObjectType,
    args: {
      studentId: string;
      classId: string;
    },
    context: {
      userId: string;
      userEducationalRole: EducationalRole;
    }
  ): Promise<ClassMembership> => {
    try {
      const userId = context.userId;
      const { studentId, classId } = args;

      // Get classroom document
      const classroom = await ClassModel.findById(classId);
      if (!classroom) {
        throw new Error("Classroom not found");
      }

      // Ensure requesting userId owns the classroom
      if (!canModifyClassroom(userId, classroom)) {
        throw new Error("User is not the teacher of this classroom");
      }

      // Fetch ClassMembership by studentId and classId
      const classMembership = await ClassMembershipModel.findOne({
        classId: classId,
        userId: studentId,
      });

      if (!classMembership) {
        throw new Error("Class membership not found");
      }

      // Set ClassMembership for student to REMOVED
      classMembership.status = ClassMembershipStatus.REMOVED;
      await classMembership.save();

      // Remove students from any rooms that belong to the class
      // Fetch these rooms by querying rooms where studentId is in the players list AND room.classId === classId
      await RoomModel.updateMany(
        {
          classId: classId,
          "gameData.players": studentId,
        },
        {
          $pull: { "gameData.players": studentId },
        }
      );

      return classMembership;
    } catch (error) {
      throw new Error(error);
    }
  },
};

export default removeStudentFromClass;
