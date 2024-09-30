/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import mongoose, { Schema, Document, Model } from "mongoose";
import {
  GraphQLString,
  GraphQLList,
  GraphQLObjectType,
  GraphQLID,
  GraphQLInt,
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
  variant: number;
  variants: string[];
}

export interface Player extends Document {
  clientId: string;
  name: string;
  description: string;
  avatar: Avatar[];
}

export const AvatarSchema = new Schema<Avatar>(
  {
    type: { type: String },
    id: { type: String },
    description: { type: String },
    variant: { type: Number },
    variants: { type: [String] },
  },
  { timestamps: true, collation: { locale: "en", strength: 2 } }
);

export const PlayerSchema = new Schema<Player, PlayerModel>(
  {
    clientId: { type: String, unique: true },
    name: { type: String },
    description: { type: String },
    avatar: { type: [AvatarSchema] },
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
    variant: { type: GraphQLInt },
    variants: { type: new GraphQLList(GraphQLString) },
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
  }),
});
