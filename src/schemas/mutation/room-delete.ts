/*

*/

import { GraphQLID } from "graphql";
import RoomModel from "../models/Room";
import {Room, RoomType} from "../models/Room";

export const deleteRoom = {
  type: RoomType,
  args: {
    roomId: { type: GraphQLID },
  },
  resolve: async (_root: any, args: { roomId: string }): Promise<Room> => {
    console.log(`Looking for ${args.roomId}`)

    const room = await RoomModel.findOne({ _id: args.roomId});
    if (!room) throw new Error("Invalid room");
    // await RoomModel.deleteOne({
    //   _id: args.roomId,
    // });
    //return true;

    return await RoomModel.findOneAndUpdate(
      {
        _id: args.roomId,
      },
      {
        $set: {
          deletedRoom:true
        },
      },
      { new: true }
    );

  },
};

export default deleteRoom;
