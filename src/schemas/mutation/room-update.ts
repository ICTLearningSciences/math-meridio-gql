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
import RoomModel, {
  GameData,
  GameStateData,
  Room,
  RoomType,
} from "../models/Room";
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
    roomOwnerId: { type: GraphQLString },
    discussionDataStringified: { type: GraphQLString },
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
    persistTruthGlobalStateData: { type: new GraphQLList(GraphQLString) },
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

    if (args.gameData.globalStateData?.roomOwnerId) {
      room.gameData.globalStateData.roomOwnerId =
        args.gameData.globalStateData.roomOwnerId;
    }

    if (args.gameData.globalStateData?.curStageId) {
      room.gameData.globalStateData.curStageId =
        args.gameData.globalStateData.curStageId;
    }
    if (args.gameData.globalStateData?.curStepId) {
      room.gameData.globalStateData.curStepId =
        args.gameData.globalStateData.curStepId;
    }

    if (args.gameData.globalStateData?.discussionDataStringified) {
      room.gameData.globalStateData.discussionDataStringified =
        args.gameData.globalStateData.discussionDataStringified;
    }

    for (const dataUpdate of args.gameData.globalStateData?.gameStateData ||
      []) {
      const existingItem = room.gameData.globalStateData.gameStateData.find(
        (d) => d.key === dataUpdate.key
      );
      if (existingItem) {
        if (
          room.gameData.persistTruthGlobalStateData.includes(dataUpdate.key) &&
          existingItem.value === "true"
        ) {
          // Keep the current value if it's "true"
          continue;
        } else {
          // Otherwise, update the value
          existingItem.value = dataUpdate.value;
        }
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
          const existingItem = player.gameStateData.find(
            (d) => d.key === dataUpdate.key
          );
          if (existingItem) {
            if (
              room.gameData.persistTruthGlobalStateData.includes(
                dataUpdate.key
              ) &&
              existingItem.value === "true"
            ) {
              // Keep the current value if it's "true"
              continue;
            } else {
              // Otherwise, update the value
              existingItem.value = dataUpdate.value;
            }
          } else {
            player.gameStateData.push(dataUpdate);
          }
        }
      } else {
        room.gameData.playerStateData.push(playerUpdate);
      }
    }

    // Update all players with the new truth values
    for (const truthKey of room.gameData.persistTruthGlobalStateData) {
      const truthItem = room.gameData.globalStateData.gameStateData.find(
        (d) => d.key === truthKey && d.value === "true"
      );
      if (truthItem) {
        for (const player of room.gameData.playerStateData) {
          const playerItem = player.gameStateData.find(
            (d) => d.key === truthKey
          );
          if (playerItem) {
            playerItem.value = truthItem.value;
          } else {
            player.gameStateData.push({
              key: truthKey,
              value: truthItem.value,
            } as GameStateData);
          }
        }
      }
    }

    // Ensure that any global keys not present in any user's gameStateData
    // are added to each user's gameStateData to maintain consistency.
    for (const globalData of room.gameData.globalStateData.gameStateData) {
      for (const player of room.gameData.playerStateData) {
        const playerItem = player.gameStateData.find(
          (d) => d.key === globalData.key
        );
        if (!playerItem) {
          player.gameStateData.push({
            key: globalData.key,
            value: globalData.value,
          } as GameStateData);
        }
      }
    }

    return room.save();
  },
};

export default updateRoom;
