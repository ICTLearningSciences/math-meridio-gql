/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import { GraphQLString, GraphQLObjectType } from "graphql";
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
    _root: GraphQLObjectType,
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
