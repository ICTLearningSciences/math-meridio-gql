/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { GraphQLNonNull, GraphQLObjectType, GraphQLString } from "graphql";
import { GameStateData, RoomDocument, RoomType } from "../models/Room";
import RoomModel from "../../schemas/models/Room";
import PlayerModel from "../../schemas/models/Player";
import GraphQLJson from "graphql-type-json";

export const updatePlayerGameStateData = {
  type: RoomType,
  args: {
    roomId: { type: GraphQLString },
    playerId: { type: GraphQLString },
    newPlayerGameStateData: { type: new GraphQLNonNull(GraphQLJson) },
  },
  resolve: async (
    _root: GraphQLObjectType,
    args: {
      roomId: string;
      playerId: string;
      newPlayerGameStateData: GameStateData;
    },
    context: {
      userId: string;
    }
  ): Promise<RoomDocument> => {
    try {
      const userId = context.userId;
      const { roomId, playerId, newPlayerGameStateData } = args;

      const player = await PlayerModel.findOne({ _id: userId });
      if (!player) {
        throw new Error("User Not Found");
      }

      const room = await RoomModel.findOne({ _id: roomId, deletedRoom: false });
      if (!room) {
        throw new Error("Room not found");
      }

      const setUpdateFields: GameStateData = {};
      for (const [key, value] of Object.entries(newPlayerGameStateData)) {
        setUpdateFields[`gameData.playersGameStateData.${playerId}.${key}`] =
          value;
      }

      if (Object.keys(setUpdateFields).length === 0) {
        return room;
      }
      return await RoomModel.findOneAndUpdate(
        { _id: roomId },
        {
          $set: setUpdateFields,
        },
        { new: true }
      );
    } catch (error) {
      throw new Error(error);
    }
  },
};

export default updatePlayerGameStateData;
