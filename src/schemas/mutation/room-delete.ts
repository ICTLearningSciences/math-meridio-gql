/*

*/

import { GraphQLID, GraphQLBoolean } from "graphql";
import RoomModel from "../models/Room";

export const deleteRoom = {
  type: GraphQLBoolean,
  args: {
    roomId: { type: GraphQLID },
  },
  resolve: async (_root: any, args: { roomId: string }): Promise<boolean> => {
    const room = await RoomModel.findOne({ _id: args.roomId });
    if (!room) throw new Error("Invalid room");
    await RoomModel.deleteOne({
      _id: args.roomId,
    });
    return true;
  },
};

export default deleteRoom;
