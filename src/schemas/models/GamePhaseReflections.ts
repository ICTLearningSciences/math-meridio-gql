/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import mongoose, { Schema, Document, Model } from "mongoose";
import { GraphQLString, GraphQLObjectType, GraphQLInt } from "graphql";
import GraphQLScalarType from "../types/anything-scalar-type";
import {
  PaginatedResolveResult,
  PaginateOptions,
  PaginateQuery,
  pluginPagination,
} from "./Paginatation";

export interface GamePhaseReflections extends Document {
  roomId: string;
  stepId: string;
  question: string;
  roundNumber: number;
  reflections: Record<string, string>; // keyed by player ID
}

export interface GamePhaseReflectionsModel extends Model<GamePhaseReflections> {
  paginate(
    query?: PaginateQuery<GamePhaseReflections>,
    options?: PaginateOptions
  ): Promise<PaginatedResolveResult<GamePhaseReflections>>;
}

export const GamePhaseReflectionsSchema = new Schema<
  GamePhaseReflections,
  GamePhaseReflectionsModel
>(
  {
    roomId: { type: String, required: true },
    stepId: { type: String, required: true },
    question: { type: String, required: true },
    roundNumber: { type: Number, required: true },
    reflections: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true, collation: { locale: "en", strength: 2 } }
);

pluginPagination(GamePhaseReflectionsSchema);

export const GamePhaseReflectionsType = new GraphQLObjectType({
  name: "GamePhaseReflectionsType",
  fields: () => ({
    roomId: { type: GraphQLString },
    stepId: { type: GraphQLString },
    question: { type: GraphQLString },
    roundNumber: { type: GraphQLInt },
    reflections: { type: GraphQLScalarType },
  }),
});

export default mongoose.model<GamePhaseReflections, GamePhaseReflectionsModel>(
  "GamePhaseReflections",
  GamePhaseReflectionsSchema
);
