/*

*/

import { GraphQLString, GraphQLNonNull } from "graphql";
import PlayerModel, { Player, PlayerType } from "../models/Player";

export const fetchPlayer = {
  type: PlayerType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLString) },
  },
  resolve: async (_root: any, args: { id: string }): Promise<Player> => {
    return await PlayerModel.findOne({ clientId: args.id });
  },
};

export default fetchPlayer;
