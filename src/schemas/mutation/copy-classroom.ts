/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { GraphQLObjectType, GraphQLString } from "graphql";
import { EducationalRole } from "../models/Player";
import ClassModel, { InviteCode } from "../models/classes/Class";
import ClassMembershipModel from "../models/classes/ClassMembership";
import RoomModel, { Room } from "../models/Room";
import { generateInviteCode } from "./create-new-class-invite-code";
import {
  AssignClassGroupsAndStartResponse,
  AssignClassGroupsAndStartResponseType,
} from "./assign-class-groups-and-start";
import { initializeGroupGameRoomWithoutGameId } from "./game-room-authoritative/create-new-game-room";

export const copyAndArchiveClassroom = {
  type: AssignClassGroupsAndStartResponseType,
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
  ): Promise<AssignClassGroupsAndStartResponse> => {
    const userId = context.userId;
    const userEducationalRole = context.userEducationalRole;
    if (userEducationalRole !== EducationalRole.INSTRUCTOR) {
      throw new Error("User is not an instructor");
    }
    const classroom = await ClassModel.findById(args.classId);
    if (!classroom || `${classroom.teacherId}` !== `${userId}`) {
      throw new Error("Invalid classroom");
    }
    const oldClassMemberships = await ClassMembershipModel.find({
      classId: classroom._id,
    });
    const oldRooms = await RoomModel.find({ classId: classroom._id });

    // Create default invite code for class:
    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);
    const inviteCode: InviteCode = {
      code: generateInviteCode(),
      validUntil: expirationDate,
      maxUses: 50 - oldClassMemberships.length,
      uses: oldClassMemberships.length,
    };

    // Copy old classroom
    const newClass = await ClassModel.create({
      name: classroom.name,
      description: classroom.description,
      sharedWithInstructorIds: classroom.sharedWithInstructorIds,
      teacherId: userId,
      inviteCodes: [inviteCode],
      startedAt: new Date(),
    });

    await ClassMembershipModel.create(
      oldClassMemberships.map((m) => ({
        classId: newClass._id,
        userId: m.userId,
        groupId: m.groupId,
        status: m.status,
      }))
    );
    const roomsToCreate: Room[] = [];
    for (const r of oldRooms) {
      const groupId = Number.parseInt(
        r.name.replace("Group #", "").replace(" Solution Space", "")
      );
      const gameRoom = initializeGroupGameRoomWithoutGameId(
        userId,
        groupId - 1,
        r.gameData.players,
        newClass._id
      );
      roomsToCreate.push(gameRoom);
    }
    const createdRooms = await RoomModel.create(roomsToCreate);

    // Archive old classroom
    if (!classroom.archivedAt) {
      classroom.archivedAt = new Date();
      await classroom.save();
    }

    return {
      updatedClassroom: newClass,
      createdRooms,
    };
  },
};

export default copyAndArchiveClassroom;
