/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import {
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLList,
  GraphQLInt,
} from "graphql";
import PlayerModel, { Player, PlayerType } from "../models/Player";

const AvatarInputType = new GraphQLInputObjectType({
  name: "AvatarInput",
  fields: () => ({
    type: { type: GraphQLString },
    id: { type: GraphQLString },
    description: { type: GraphQLString },
    variant: { type: GraphQLInt },
    variants: { type: new GraphQLList(GraphQLString) },
  }),
});

const PlayerInputType = new GraphQLInputObjectType({
  name: "PlayerInput",
  fields: () => ({
    clientId: { type: GraphQLString },
    name: { type: GraphQLString },
    description: { type: GraphQLString },
    avatar: { type: new GraphQLList(AvatarInputType) },
  }),
});

export const addOrUpdatePlayer = {
  type: PlayerType,
  args: {
    player: { type: new GraphQLNonNull(PlayerInputType) },
  },
  resolve: async (
    _root: GraphQLObjectType,
    args: { player: Player }
  ): Promise<Player> => {
    return await PlayerModel.findOneAndUpdate(
      {
        clientId: args.player.clientId,
      },
      {
        $set: args.player,
      },
      {
        new: true,
        upsert: true,
      }
    );
  },
};

export default addOrUpdatePlayer;
