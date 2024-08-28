/*

*/

import { GraphQLID, GraphQLString } from "graphql";
import RoomModel, { Room, RoomType } from "../models/Room";
import PlayerModel from "../models/Player";

export const joinRoom = {
  type: RoomType,
  args: {
    playerId: { type: GraphQLString },
    roomId: { type: GraphQLID },
  },
  resolve: async (
    _root: any,
    args: {
      playerId: string;
      roomId: string;
    }
  ): Promise<Room> => {
    const room = await RoomModel.findOne({ _id: args.roomId, deletedRoom: false});
    if (!room) throw new Error("Invalid room");
    const player = await PlayerModel.findOne({ clientId: args.playerId });
    if (!player) throw new Error("Invalid player");
    if (room.gameData.players.includes(args.playerId))
      throw new Error("Already in room");
    return await RoomModel.findOneAndUpdate(
      {
        _id: args.roomId,
        deletedRoom: false
      },
      {
        $push: {
          "gameData.players": args.playerId,
          "gameData.playerStateData": {
            player: args.playerId,
            animation: "",
            gameStateData: [],
          },
        },
      },
      { new: true }
    );
  },
};

export default joinRoom;
