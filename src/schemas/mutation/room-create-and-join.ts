/*

*/

import { GraphQLString, GraphQLBoolean } from "graphql";
import RoomModel, { Room, RoomType } from "../models/Room";
import PlayerModel from "../models/Player";

export const createAndJoinRoom = {
  type: RoomType,
  args: {
    playerId: { type: GraphQLString },
    gameId: { type: GraphQLString },
    gameName: { type: GraphQLString },
  },
  resolve: async (
    _root: any,
    args: {
      playerId: string;
      gameId: string;
      gameName: string;
      deletedRoom: boolean;
    }
  ): Promise<Room> => {
    const rooms = await RoomModel.find({
      "gameData.gameId": args.gameId,
      deletedRoom: false,
    });
    const player = await PlayerModel.findOne({ clientId: args.playerId });
    if (!player) throw new Error("Invalid player");
    return await RoomModel.create({
      name: `${args.gameName} Solution Space ${rooms.length + 1}`,
      gameData: {
        gameId: args.gameId,
        players: [args.playerId],
        chat: [],
        globalStateData: {
          curStageId: "",
          curStepId: "",
          gameStateData: [],
        },
        playerStateData: [
          {
            player: args.playerId,
            animation: "",
            gameStateData: [],
          },
        ],
      },
      deletedRoom: false,
    });
  },
};

export default createAndJoinRoom;
