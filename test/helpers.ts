/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import path from "path";
import requireEnv from "../src/utils/require-env";
import { UserRole } from "../src/schemas/types/types";
import jwt from "jsonwebtoken";
import PlayerModel, { EducationalRole } from "../src/schemas/models/Player";
import ClassModel, { InviteCode } from "../src/schemas/models/classes/Class";
import ClassMembershipModel, {
  ClassMembershipStatus,
} from "../src/schemas/models/classes/ClassMembership";
import RoomModel from "../src/schemas/models/Room";

export function fixturePath(p: string): string {
  return path.join(__dirname, "fixtures", p);
}

export interface GqlBody {
  query: string;
  variables?: Record<string, any>;
}

// duration of access token in seconds before it expires
export function accessTokenDuration(): number {
  return process.env.ACCESS_TOKEN_LENGTH
    ? parseInt(process.env.ACCESS_TOKEN_LENGTH)
    : 60 * 60 * 24 * 90;
}

export async function getToken(
  userId: string,
  userRole: UserRole,
  educationalRole: EducationalRole,
  expiresIn?: number
): Promise<string> {
  if (!expiresIn) {
    expiresIn = accessTokenDuration();
  }
  const expirationDate = new Date(Date.now() + expiresIn * 1000);
  const accessToken = jwt.sign(
    {
      id: userId,
      expirationDate,
      userRole: userRole,
      educationalRole: educationalRole,
    },
    requireEnv("JWT_SECRET"),
    { expiresIn: expirationDate.getTime() - new Date().getTime() }
  );
  return accessToken;
}

export function createUser(
  userId: string,
  userRole: UserRole,
  educationalRole: EducationalRole
) {
  return PlayerModel.create({
    _id: userId,
    googleId: userId,
    name: "User",
    email: "user@example.com",
    userRole: userRole,
    educationalRole: educationalRole,
  });
}

export function createClassroom(classroomId: string, teacherId: string) {
  return ClassModel.create({
    _id: classroomId,
    name: "New Class",
    teacherId: teacherId,
    inviteCodes: [],
    createdAt: Date.now(),
    archivedAt: null,
  });
}

export function addInviteCodeToClassroom(
  classroomId: string,
  inviteCode: InviteCode
) {
  return ClassModel.findByIdAndUpdate(classroomId, {
    $push: { inviteCodes: inviteCode },
  });
}

export function createClassMembership(
  classId: string,
  userId: string,
  status: ClassMembershipStatus,
  groupId?: number
) {
  return ClassMembershipModel.create({
    classId,
    userId,
    groupId,
    status,
  });
}

export function updateClassMembershipStatus(
  classId: string,
  userId: string,
  status: ClassMembershipStatus
) {
  return ClassMembershipModel.findOneAndUpdate(
    { classId, userId },
    {
      $set: { status },
    }
  );
}

export function createRoom(
  roomId: string,
  classId: string | undefined,
  players: string[],
  name: string = "Test Room"
) {
  return RoomModel.create({
    _id: roomId,
    ...(classId ? { classId } : {}),
    name,
    gameData: {
      gameId: roomId,
      players,
      chat: [],
      globalStateData: {
        curStageId: "",
        curStepId: "",
        roomOwnerId: players[0] || "",
        discussionData: {},
        gameStateData: {},
      },
      persistTruthGlobalStateData: [],
      playersGameStateData: {},
    },
    deletedRoom: false,
  });
}
