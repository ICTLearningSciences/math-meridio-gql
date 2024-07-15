/*

*/

import {
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLList,
} from "graphql";
import PlayerModel, { Player, PlayerType } from "../models/Player";

const AvatarInputType = new GraphQLInputObjectType({
  name: "AvatarInput",
  fields: () => ({
    type: { type: GraphQLString },
    id: { type: GraphQLString },
    description: { type: GraphQLString },
  }),
});

const PlayerInputType = new GraphQLInputObjectType({
  name: "PlayerInput",
  fields: () => ({
    clientId: { type: GraphQLString },
    name: { type: GraphQLString },
    description: { type: GraphQLString },
    avatar: { type: new GraphQLList(AvatarInputType) },
    chatAvatar: { type: new GraphQLList(AvatarInputType) },
  }),
});

export const addOrUpdatePlayer = {
  type: PlayerType,
  args: {
    player: { type: new GraphQLNonNull(PlayerInputType) },
  },
  resolve: async (_root: any, args: { player: Player }): Promise<Player> => {
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
