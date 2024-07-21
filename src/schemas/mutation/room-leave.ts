/*

*/

import { GraphQLID, GraphQLString } from "graphql";
import RoomModel, { Room, RoomType } from "../models/Room";
import PlayerModel from "../models/Player";

export const leaveRoom = {
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
    const room = await RoomModel.findOne({ _id: args.roomId });
    if (!room) throw new Error("Invalid room");
    const player = await PlayerModel.findOne({ clientId: args.playerId });
    if (!player) throw new Error("Invalid player");
    if (!room.gameData.players.includes(args.playerId))
      throw new Error("Not in room");
    return await RoomModel.findOneAndUpdate(
      {
        _id: args.roomId,
      },
      {
        $pull: {
          "gameData.players": args.playerId,
          "gameData.playerStateData": {
            player: args.playerId,
          },
        },
      },
      { new: true }
    );
  },
};

export default leaveRoom;
