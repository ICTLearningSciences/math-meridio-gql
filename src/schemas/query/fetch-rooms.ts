/*

*/

import { GraphQLList, GraphQLString } from "graphql";
import RoomModel, { Room, RoomType } from "../models/Room";

export const fetchRooms = {
  type: new GraphQLList(RoomType),
  args: {
    game: { type: GraphQLString },
  },
  resolve: async (_root: any, args: { game: string }): Promise<Room[]> => {
    if (args.game) {
      return await RoomModel.find({ "gameData.gameId": args.game });
    }
    return await RoomModel.find({});
  },
};

export default fetchRooms;
