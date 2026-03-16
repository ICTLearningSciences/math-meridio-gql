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
import { GraphQLObjectType, GraphQLString, GraphQLInt } from "graphql";
import { EducationalRole } from "../models/Player";
import ClassModel, {
  Class,
  ClassType,
  InviteCode,
} from "../models/classes/Class";
import DateType from "../types/date";
import { canModifyClassroom } from "../../helpers";

export function generateInviteCode(): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

export const createNewClassInviteCode = {
  type: ClassType,
  args: {
    classId: { type: GraphQLString },
    validUntil: { type: DateType },
    numUses: { type: GraphQLInt },
  },
  resolve: async (
    _root: GraphQLObjectType,
    args: {
      classId: string;
      validUntil: Date;
      numUses: number;
    },
    context: {
      userId: string;
      userEducationalRole: EducationalRole;
    }
  ): Promise<Class> => {
    try {
      const userId = context.userId;
      const { classId, validUntil, numUses } = args;

      // Get classroom document
      const classroom = await ClassModel.findById(classId);
      if (!classroom) {
        throw new Error("Classroom not found");
      }

      // Ensure requesting userId is the teacherId or sharedWithInstructorIds of the classroom document
      if (!canModifyClassroom(userId, classroom)) {
        throw new Error("User is not the teacher of this classroom");
      }

      // Create invite code for class using params
      const inviteCode: InviteCode = {
        code: generateInviteCode(),
        validUntil: validUntil,
        maxUses: numUses,
        uses: 0,
      };

      // Add new invite code to class
      classroom.inviteCodes.push(inviteCode);
      const updatedClassroom = await classroom.save();

      return updatedClassroom;
    } catch (error) {
      throw new Error(error);
    }
  },
};

export default createNewClassInviteCode;
