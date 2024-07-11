/*

*/

import mongoose, { Schema, Document, Model } from "mongoose";
import { GraphQLString, GraphQLObjectType, GraphQLID } from "graphql";
import {
  PaginatedResolveResult,
  PaginateOptions,
  PaginateQuery,
  pluginPagination,
} from "./Paginatation";

export interface Player extends Document {
  clientId: string;
  name: string;
  avatar: string;
  description: string;
}

export const PlayerType = new GraphQLObjectType({
  name: "PlayerType",
  fields: () => ({
    _id: { type: GraphQLID },
    clientId: { type: GraphQLString },
    name: { type: GraphQLString },
    avatar: { type: GraphQLString },
    description: { type: GraphQLString },
  }),
});

export const PlayerSchema = new Schema<Player, PlayerModel>(
  {
    clientId: { type: String, unique: true },
    name: { type: String },
    avatar: { type: String },
    description: { type: String },
  },
  { timestamps: true, collation: { locale: "en", strength: 2 } }
);

export interface PlayerModel extends Model<Player> {
  paginate(
    query?: PaginateQuery<Player>,
    options?: PaginateOptions
  ): Promise<PaginatedResolveResult<Player>>;
}

PlayerSchema.index({ _id: -1 });
pluginPagination(PlayerSchema);

export default mongoose.model<Player, PlayerModel>("Player", PlayerSchema);
