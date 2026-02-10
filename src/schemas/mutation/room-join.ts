/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import { GraphQLID, GraphQLString, GraphQLObjectType } from "graphql";
import RoomModel, { Room, RoomType } from "../models/Room";
import PlayerModel from "../models/Player";
import ClassMembershipModel, {
  ClassMembershipStatus,
} from "../models/classes/ClassMembership";

export const joinRoom = {
  type: RoomType,
  args: {
    playerId: { type: GraphQLString },
    roomId: { type: GraphQLID },
  },
  resolve: async (
    _root: GraphQLObjectType,
    args: {
      playerId: string;
      roomId: string;
    }
  ): Promise<Room> => {
    const room = await RoomModel.findOne({
      _id: args.roomId,
      deletedRoom: false,
    });
    if (!room) throw new Error("Invalid room");
    const player = await PlayerModel.findOne({ _id: args.playerId });
    if (!player) throw new Error("Invalid player");
    if (room.gameData.players.includes(args.playerId))
      throw new Error("Already in room");

    // If room has a class, ensure the student is a MEMBER of the class
    if (room.classId) {
      const classMembership = await ClassMembershipModel.findOne({
        classId: room.classId,
        userId: args.playerId,
      });

      if (
        !classMembership ||
        classMembership.status !== ClassMembershipStatus.MEMBER
      ) {
        throw new Error("User is not a member of this class");
      }
    }

    return await RoomModel.findOneAndUpdate(
      {
        _id: args.roomId,
        deletedRoom: false,
      },
      {
        $push: {
          "gameData.players": args.playerId,
          "gameData.playerStateData": {
            player: args.playerId,
            animation: "",
            gameStateData: room.gameData.globalStateData.gameStateData,
          },
        },
      },
      { new: true }
    );
  },
};

export default joinRoom;
