/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { GraphQLObjectType, GraphQLString } from "graphql";
import { Room, RoomType } from "../models/Room";
import RoomModel from "../models/Room";
import PlayerModel from "../models/Player";
import { addPlayerToRoomAtomically } from "../../authoritative-server/authority/step-process-pure-functions";
import { PlayerComputedState } from "../types/types";

export const joinGameRoom = {
  type: RoomType,
  args: {
    roomId: { type: GraphQLString },
  },
  resolve: async (
    _root: GraphQLObjectType,
    args: {
      roomId: string;
    },
    context: {
      userId: string;
    }
  ): Promise<Room> => {
    try {
      const userId = context.userId;
      const { roomId } = args;

      const player = await PlayerModel.findOne({ _id: userId });
      if (!player) {
        throw new Error("User Not Found");
      }

      const room = await RoomModel.findOne({ _id: roomId, deletedRoom: false });
      if (!room) {
        throw new Error("Room not found");
      }

      if (room.gameData.players.includes(player._id)) {
        console.log("Player already in room");
        return room;
      }
      const now = new Date();
      console.log("setting join game room heartbeat to now", now);

      if (!room.gameData.playersStatusRecord[player._id]) {
        room.gameData.playersStatusRecord[player._id] = {
          lastHeartbeatAt: now,
          reportedAwayStatus: {
            isAway: false,
          },
          pausedByAdmin: false,
          computedState: PlayerComputedState.ACTIVE,
          phaseMetrics: {},
          needsHelpInRoom: false,
        };
      } else {
        room.gameData.playersStatusRecord[player._id].lastHeartbeatAt = now;
      }

      return await addPlayerToRoomAtomically(room, player);
    } catch (error) {
      throw new Error(error);
    }
  },
};

export default joinGameRoom;
