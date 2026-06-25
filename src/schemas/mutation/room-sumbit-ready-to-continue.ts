/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import { GraphQLBoolean, GraphQLObjectType, GraphQLString } from "graphql";
import RoomModel from "../models/Room";
import ClassModel from "../models/classes/Class";

export const submitReadyToContinue = {
  type: GraphQLBoolean,
  args: {
    roomId: { type: GraphQLString },
  },
  resolve: async (
    _root: GraphQLObjectType,
    args: { roomId: string },
    context: { userId: string }
  ): Promise<boolean> => {
    if (!context.userId) throw new Error("Unauthorized");
    const room = await RoomModel.findOne({
      _id: args.roomId,
      deletedRoom: false,
    });
    if (!room) {
      throw new Error("Room not found");
    }

    if (!room.gameData.players.includes(context.userId)) {
      const classRoom = await ClassModel.findOne({ _id: room.classId });
      if (classRoom?.teacherId !== context.userId) {
        throw new Error("User is not a player in the room");
      }
      const studentReflections: Record<string, string> = {};
      for (const player of room.gameData.players) {
        studentReflections[player] = room.gameData.curGameState
          .studentReflections
          ? room.gameData.curGameState.studentReflections[player] || ""
          : "";
      }
      await RoomModel.findOneAndUpdate(
        { _id: args.roomId, deletedRoom: false },
        {
          $set: {
            "gameData.curGameState.curState":
              "WAITING_FOR_STUDENT_READY_TO_CONTINUE",
            "gameData.curGameState.studentReadyToContinue": true,
            "gameData.curGameState.playersLeftToRespond": [],
            "gameData.curGameState.studentReflections": studentReflections,
          },
        },
        { new: true }
      );
      return true;
    }

    if (
      room.gameData.curGameState.curState !==
      "WAITING_FOR_STUDENT_READY_TO_CONTINUE"
    )
      throw new Error(
        "Room is not in the WAITING_FOR_STUDENT_READY_TO_CONTINUE state"
      );
    await RoomModel.findOneAndUpdate(
      { _id: args.roomId, deletedRoom: false },
      {
        $set: {
          "gameData.curGameState.studentReadyToContinue": true,
        },
      },
      { new: true }
    );
    return true;
  },
};

export default submitReadyToContinue;
