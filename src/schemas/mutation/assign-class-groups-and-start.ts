/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { GraphQLList, GraphQLObjectType, GraphQLString } from "graphql";
import { EducationalRole } from "../models/Player";
import ClassModel, { Class, ClassType } from "../models/classes/Class";
import ClassMembershipModel, {
  ClassMembership,
  ClassMembershipInputType,
} from "../models/classes/ClassMembership";

export const assignClassGroupsAndStart = {
  type: ClassType,
  args: {
    classId: { type: GraphQLString },
    groups: { type: new GraphQLList(ClassMembershipInputType) },
  },
  resolve: async (
    _root: GraphQLObjectType,
    args: {
      classId: string;
      groups: ClassMembership[];
    },
    context: {
      userId: string;
      userEducationalRole: EducationalRole;
    }
  ): Promise<Class> => {
    try {
      const userId = context.userId;
      const { classId, groups } = args;

      // Get classroom document
      const classroom = await ClassModel.findById(classId);
      if (!classroom) {
        throw new Error("Classroom not found");
      }

      // Ensure the user is the owner of the classroom
      if (classroom.teacherId !== userId) {
        throw new Error("User is not the teacher of this classroom");
      }

      // Ensure the class has not already started
      if (classroom.startedAt !== undefined) {
        throw new Error("Classroom is already in session");
      }

      // Update group assignments
      const classMemberships = await ClassMembershipModel.find({
        classId: classId,
        userId: { $in: groups.map((g) => g.userId) },
      });
      for (const member of classMemberships) {
        const updatedMember = groups.find(
          (g) => `${g.userId}` === `${member.userId}`
        );
        if (updatedMember) {
          member.groupId = updatedMember.groupId;
          member.save();
        }
      }

      // Update start date
      classroom.startedAt = new Date();
      const updatedClassroom = await classroom.save();

      // Return updated classroom
      return updatedClassroom;
    } catch (error) {
      throw new Error(error);
    }
  },
};

export default assignClassGroupsAndStart;
