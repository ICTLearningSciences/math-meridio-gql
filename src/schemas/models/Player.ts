/*

*/

import mongoose, { Schema, Document, Model } from "mongoose";
import {
  GraphQLString,
  GraphQLList,
  GraphQLObjectType,
  GraphQLID,
} from "graphql";
import {
  PaginatedResolveResult,
  PaginateOptions,
  PaginateQuery,
  pluginPagination,
} from "./Paginatation";

/** mongoose */

export interface Avatar extends Document {
  type: string;
  id: string;
  description: string;
}

export interface Player extends Document {
  clientId: string;
  name: string;
  description: string;
  avatar: Avatar[];
  chatAvatar: Avatar[];
}

export const AvatarSchema = new Schema<Avatar>(
  {
    type: { type: String },
    id: { type: String },
    description: { type: String },
  },
  { timestamps: true, collation: { locale: "en", strength: 2 } }
);

export const PlayerSchema = new Schema<Player, PlayerModel>(
  {
    clientId: { type: String, unique: true },
    name: { type: String },
    description: { type: String },
    avatar: { type: [AvatarSchema] },
    chatAvatar: { type: [AvatarSchema] },
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

/** gql */

export const AvatarType = new GraphQLObjectType({
  name: "AvatarType",
  fields: () => ({
    type: { type: GraphQLString },
    id: { type: GraphQLString },
    description: { type: GraphQLString },
  }),
});

export const PlayerType = new GraphQLObjectType({
  name: "PlayerType",
  fields: () => ({
    _id: { type: GraphQLID },
    clientId: { type: GraphQLString },
    name: { type: GraphQLString },
    description: { type: GraphQLString },
    avatar: { type: new GraphQLList(AvatarType) },
    chatAvatar: { type: new GraphQLList(AvatarType) },
  }),
});
