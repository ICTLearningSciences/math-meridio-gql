/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import {
  GraphQLID,
  GraphQLString,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLObjectType,
} from "graphql";
import RoomModel, { GameData, Room, RoomType } from "../models/Room";
import GraphQLScalarType from "../types/anything-scalar-type";

const GameStateDataInputType = new GraphQLInputObjectType({
  name: "GameStateDataInput",
  fields: () => ({
    key: { type: GraphQLString },
    value: { type: GraphQLScalarType },
  }),
});

const GlobalStateDataInputType = new GraphQLInputObjectType({
  name: "GlobalStateDataInput",
  fields: () => ({
    curStageId: { type: GraphQLString },
    curStepId: { type: GraphQLString },
    gameStateData: { type: new GraphQLList(GameStateDataInputType) },
  }),
});

const PlayerStateDataInputType = new GraphQLInputObjectType({
  name: "PlayerStateDataInput",
  fields: () => ({
    player: { type: GraphQLString },
    animation: { type: GraphQLString },
    gameStateData: { type: new GraphQLList(GameStateDataInputType) },
  }),
});

const GameDataInputType = new GraphQLInputObjectType({
  name: "GameDataInput",
  fields: () => ({
    globalStateData: { type: GlobalStateDataInputType },
    playerStateData: { type: new GraphQLList(PlayerStateDataInputType) },
  }),
});

export const updateRoom = {
  type: RoomType,
  args: {
    roomId: { type: GraphQLID },
    gameData: { type: GameDataInputType },
  },
  resolve: async (
    _root: GraphQLObjectType,
    args: {
      roomId: string;
      gameData: GameData;
    }
  ): Promise<Room> => {
    const room = await RoomModel.findOne({
      _id: args.roomId,
      deletedRoom: false,
    });
    if (!room) throw new Error("Invalid room");

    if (args.gameData.globalStateData?.curStageId) {
      room.gameData.globalStateData.curStageId =
        args.gameData.globalStateData.curStageId;
    }
    if (args.gameData.globalStateData?.curStepId) {
      room.gameData.globalStateData.curStepId =
        args.gameData.globalStateData.curStepId;
    }
    for (const dataUpdate of args.gameData.globalStateData?.gameStateData ||
      []) {
      const item = room.gameData.globalStateData.gameStateData.find(
        (d) => d.key === dataUpdate.key
      );
      if (item) {
        item.value = dataUpdate.value;
      } else {
        room.gameData.globalStateData.gameStateData.push(dataUpdate);
      }
    }
    for (const playerUpdate of args.gameData.playerStateData || []) {
      const player = room.gameData.playerStateData.find(
        (p) => p.player === playerUpdate.player
      );
      if (player) {
        player.animation = playerUpdate.animation || player.animation;
        for (const dataUpdate of playerUpdate.gameStateData || []) {
          const item = player.gameStateData.find(
            (d) => d.key === dataUpdate.key
          );
          if (item) {
            item.value = dataUpdate.value;
          } else {
            player.gameStateData.push(dataUpdate);
          }
        }
      } else {
        room.gameData.playerStateData.push(playerUpdate);
      }
    }
    return room.save();
  },
};

export default updateRoom;
