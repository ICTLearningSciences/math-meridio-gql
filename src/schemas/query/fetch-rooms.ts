/*

*/

import { GraphQLList, GraphQLString, GraphQLBoolean } from "graphql";
import RoomModel, { Room, RoomType } from "../models/Room";

export const fetchRooms = {
  type: new GraphQLList(RoomType),
  args: {
    game: { type: GraphQLString },
    deletedRoom: { type: GraphQLBoolean },
  },
  resolve: async (
    _root: any,
    args: { game: string; deletedRoom: boolean }
  ): Promise<Room[]> => {
    if (args.game) {
      return await RoomModel.find({
        "gameData.gameId": args.game,
        deletedRoom: false,
      });
    }
    return await RoomModel.find({ deletedRoom: false });
  },
};

export default fetchRooms;
