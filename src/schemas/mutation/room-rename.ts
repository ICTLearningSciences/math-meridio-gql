/*

*/

import { GraphQLID, GraphQLString } from "graphql";
import RoomModel, { Room, RoomType } from "../models/Room";

export const renameRoom = {
  type: RoomType,
  args: {
    name: { type: GraphQLString },
    roomId: { type: GraphQLID },
  },
  resolve: async (
    _root: any,
    args: { name: string; roomId: string }
  ): Promise<Room> => {
    const room = await RoomModel.findOne({
      _id: args.roomId,
      deletedRoom: false,
    });
    if (!room) throw new Error("Invalid room");
    return await RoomModel.findOneAndUpdate(
      {
        _id: args.roomId,
        deletedRoom: false,
      },
      {
        $set: {
          name: args.name,
        },
      },
      { new: true }
    );
  },
};

export default renameRoom;
