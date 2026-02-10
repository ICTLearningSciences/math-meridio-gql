/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import { GraphQLString, GraphQLObjectType } from "graphql";
import ClassModel from "../models/classes/Class";
import RoomModel, { Room, RoomType } from "../models/Room";
import PlayerModel from "../models/Player";

export const createNewRoom = {
  type: RoomType,
  args: {
    gameId: { type: GraphQLString },
    gameName: { type: GraphQLString },
    classId: { type: GraphQLString },
  },
  resolve: async (
    _root: GraphQLObjectType,
    args: {
      gameId: string;
      gameName: string;
      classId?: string;
    },
    context: { userId: string }
  ): Promise<Room> => {
    const rooms = await RoomModel.find({
      "gameData.gameId": args.gameId,
      deletedRoom: false,
    });
    const player = await PlayerModel.findOne({ _id: context.userId });
    if (!player) throw new Error("Unauthorized");
    if (args.classId) {
      const classRoom = await ClassModel.findOne({ _id: args.classId });
      if (!classRoom) throw new Error("Invalid class");
    }
    return await RoomModel.create({
      name: `${args.gameName} Solution Space ${rooms.length + 1}`,
      ...(args.classId ? { classId: args.classId } : {}),
      gameData: {
        gameId: args.gameId,
        players: [],
        chat: [],
        persistTruthGlobalStateData: [],
        playerStateData: [],
        globalStateData: {
          curStageId: "",
          curStepId: "",
          roomOwnerId: context.userId,
          discussionDataStringified: "",
          gameStateData: [],
        },
      },
      deletedRoom: false,
    });
  },
};

export default createNewRoom;
