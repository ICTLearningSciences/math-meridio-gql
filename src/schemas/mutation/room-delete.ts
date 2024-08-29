/*

*/

import { GraphQLID } from "graphql";
import RoomModel from "../models/Room";
import { Room, RoomType } from "../models/Room";

export const deleteRoom = {
  type: RoomType,
  args: {
    roomId: { type: GraphQLID },
  },
  resolve: async (_root: any, args: { roomId: string }): Promise<Room> => {
    const room = await RoomModel.findOne({
      _id: args.roomId,
      deletedRoom: false,
    });
    if (!room) throw new Error("Invalid room");

    return await RoomModel.findOneAndUpdate(
      {
        _id: args.roomId,
      },
      {
        $set: {
          deletedRoom: true,
        },
      },
      { new: true }
    );
  },
};

export default deleteRoom;
