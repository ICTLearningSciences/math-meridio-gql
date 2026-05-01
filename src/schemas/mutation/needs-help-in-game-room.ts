/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import { GraphQLBoolean, GraphQLObjectType, GraphQLString } from "graphql";
import RoomModel from "../models/Room";
import { Room, RoomType } from "../models/Room";
import NotificationEventModel, {
  NotificationType,
} from "../models/NotificationEvent";
import PlayerModel from "../models/Player";

export const setNeedsHelpInGameRoom = {
  type: RoomType,
  args: {
    roomId: { type: GraphQLString },
    needsHelp: { type: GraphQLBoolean },
  },
  resolve: async (
    _root: GraphQLObjectType,
    args: { roomId: string; needsHelp: boolean },
    context: { userId: string }
  ): Promise<Room> => {
    const player = await PlayerModel.findOne({ _id: context.userId });
    const room = await RoomModel.findOne({
      _id: args.roomId,
      deletedRoom: false,
    });
    await NotificationEventModel.create({
      roomId: args.roomId,
      userId: context.userId,
      event: `${player?.name || "Player"} in room ${room?.name} has ${
        args.needsHelp ? "requested help" : "cancelled their help request"
      }`,
      eventType: NotificationType.REQUEST_HELP,
      eventAt: new Date(),
    });

    return await RoomModel.findOneAndUpdate(
      {
        _id: args.roomId,
      },
      {
        $set: {
          [`gameData.playersStatusRecord.${context.userId}.needsHelpInRoom`]:
            args.needsHelp,
        },
      },
      { new: true }
    );
  },
};

export default setNeedsHelpInGameRoom;
