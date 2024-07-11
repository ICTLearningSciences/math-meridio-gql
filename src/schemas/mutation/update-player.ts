/*

*/

import { GraphQLInputObjectType, GraphQLNonNull, GraphQLString } from "graphql";
import PlayerModel, { Player, PlayerType } from "../models/Player";

const PlayerInputType = new GraphQLInputObjectType({
  name: "PlayerInput",
  fields: () => ({
    clientId: { type: GraphQLString },
    name: { type: GraphQLString },
    description: { type: GraphQLString },
    avatar: { type: GraphQLString },
  }),
});

export const updatePlayer = {
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

export default updatePlayer;
