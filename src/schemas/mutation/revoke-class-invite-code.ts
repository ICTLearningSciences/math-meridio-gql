/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { GraphQLObjectType, GraphQLString } from "graphql";
import { EducationalRole } from "../models/Player";
import ClassModel, { Class, ClassType } from "../models/classes/Class";

export const revokeClassInviteCode = {
  type: ClassType,
  args: {
    classId: { type: GraphQLString },
    classroomCode: { type: GraphQLString },
  },
  resolve: async (
    _root: GraphQLObjectType,
    args: {
      classId: string;
      classroomCode: string;
    },
    context: {
      userId: string;
      userEducationalRole: EducationalRole;
    }
  ): Promise<Class> => {
    try {
      const userId = context.userId;
      const { classId, classroomCode } = args;

      // Get classroom document
      const classroom = await ClassModel.findById(classId);
      if (!classroom) {
        throw new Error("Classroom not found");
      }

      // Ensure requesting userId is the teacherId of the classroom document
      if (classroom.teacherId !== userId) {
        throw new Error("User is not the teacher of this classroom");
      }

      // Find the invite code
      const inviteCodeIndex = classroom.inviteCodes.findIndex(
        (code) => code.code === classroomCode
      );

      if (inviteCodeIndex === -1) {
        throw new Error("Invite code not found");
      }

      // Hard delete invite code from class inviteCode list
      classroom.inviteCodes.splice(inviteCodeIndex, 1);
      const updatedClassroom = await classroom.save();

      return updatedClassroom;
    } catch (error) {
      throw new Error(error);
    }
  },
};

export default revokeClassInviteCode;
