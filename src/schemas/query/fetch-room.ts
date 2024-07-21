/*

*/

import { GraphQLID } from "graphql";
import RoomModel, { Room, RoomType } from "../models/Room";

export const fetchRoom = {
  type: RoomType,
  args: {
    roomId: { type: GraphQLID },
  },
  resolve: async (_root: any, args: { roomId: string }): Promise<Room> => {
    return await RoomModel.findOne({ _id: args.roomId });
  },
};

export default fetchRoom;
