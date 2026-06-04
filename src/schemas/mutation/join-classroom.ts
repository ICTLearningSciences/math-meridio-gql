/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { GraphQLObjectType, GraphQLString } from "graphql";
import PlayerModel, { EducationalRole } from "../models/Player";
import ClassModel, { Class, ClassType } from "../models/classes/Class";
import NotificationEventModel, {
  NotificationType,
} from "../models/NotificationEvent";
import ClassMembershipModel, {
  ClassMembership,
  ClassMembershipStatus,
  ClassMembershipType,
} from "../models/classes/ClassMembership";

const JoinClassroomResponseType = new GraphQLObjectType({
  name: "JoinClassroomResponse",
  fields: () => ({
    classMembership: { type: ClassMembershipType },
    classroom: { type: ClassType },
  }),
});

interface JoinClassroomResponse {
  classMembership: ClassMembership;
  classroom: Class;
}

export const joinClassroom = {
  type: JoinClassroomResponseType,
  args: {
    inviteCode: { type: GraphQLString },
  },
  resolve: async (
    _root: GraphQLObjectType,
    args: {
      inviteCode: string;
    },
    context: {
      userId: string;
      userEducationalRole: EducationalRole;
    }
  ): Promise<JoinClassroomResponse> => {
    try {
      const userId = context.userId;
      const inviteCode = args.inviteCode.toUpperCase();

      // Fetch classroom by inviteCode
      const classroom = await ClassModel.findOne({
        "inviteCodes.code": inviteCode,
      });

      if (!classroom) {
        throw new Error("Classroom not found");
      }

      // Find the specific invite code
      const inviteCodeData = classroom.inviteCodes.find(
        (code) => code.code === inviteCode
      );

      if (!inviteCodeData) {
        throw new Error("Invite code not found");
      }

      // Validate invite code validUntil has not passed
      if (inviteCodeData.validUntil && inviteCodeData.validUntil < new Date()) {
        throw new Error("Invite code has expired");
      }

      // Validate uses has not exceeded maxUses
      if (
        inviteCodeData.maxUses !== undefined &&
        inviteCodeData.uses >= inviteCodeData.maxUses
      ) {
        throw new Error("Invite code has reached maximum uses");
      }

      // Ensure classroom is not archived
      if (classroom.archivedAt) {
        throw new Error("Classroom is no longer active");
      }

      // Fetch ClassMembership document by requester userId and classroomId
      let classMembership = await ClassMembershipModel.findOne({
        classId: classroom._id,
        userId: userId,
      });

      if (!classMembership) {
        // Create document for student/classroom with status set to MEMBER
        classMembership = await ClassMembershipModel.create({
          classId: classroom._id,
          userId: userId,
          status: ClassMembershipStatus.MEMBER,
        });
      } else {
        // Ensure student is not BLOCKED
        if (classMembership.status === ClassMembershipStatus.BLOCKED) {
          throw new Error("User is blocked from this classroom");
        }

        // Set status to MEMBER
        classMembership.status = ClassMembershipStatus.MEMBER;
        await classMembership.save();
      }

      // Increment the uses field for the invite code
      inviteCodeData.uses += 1;
      await classroom.save();

      const player = await PlayerModel.findById(userId);
      await NotificationEventModel.create({
        classId: classroom._id,
        userId: userId,
        event: `${player?.name || "Player"} joined classroom ${
          classroom?.name
        }`,
        eventType: NotificationType.JOIN,
        eventAt: new Date(),
      });

      // Return created/updated ClassMembership document and class document
      return {
        classMembership,
        classroom,
      };
    } catch (error) {
      throw new Error(error);
    }
  },
};

export default joinClassroom;
