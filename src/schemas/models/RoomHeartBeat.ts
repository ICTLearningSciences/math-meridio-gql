/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import mongoose, { Schema, Document, Model } from "mongoose";
import { GraphQLString, GraphQLObjectType } from "graphql";
import {
  PaginatedResolveResult,
  PaginateOptions,
  PaginateQuery,
  pluginPagination,
} from "./Paginatation";
import { DateType } from "../../schemas/types/date";

export interface RoomHeartBeat extends Document {
  roomId: string;
  userId: string;
  lastHeartBeatAt: Date;
}

export interface RoomHeartBeatModel extends Model<RoomHeartBeat> {
  paginate(
    query?: PaginateQuery<RoomHeartBeat>,
    options?: PaginateOptions
  ): Promise<PaginatedResolveResult<RoomHeartBeat>>;
}

export const RoomHeartBeatSchema = new Schema<
  RoomHeartBeat,
  RoomHeartBeatModel
>(
  {
    roomId: { type: String, required: true },
    userId: { type: String, required: true },
    lastHeartBeatAt: { type: Date, required: true },
  },
  { timestamps: true, collation: { locale: "en", strength: 2 } }
);

RoomHeartBeatSchema.index({ _id: -1 });
pluginPagination(RoomHeartBeatSchema);

export const RoomHeartBeatType = new GraphQLObjectType({
  name: "RoomHeartBeatType",
  fields: () => ({
    roomId: { type: GraphQLString },
    userId: { type: GraphQLString },
    lastHeartBeatAt: { type: DateType },
  }),
});

export default mongoose.model<RoomHeartBeat, RoomHeartBeatModel>(
  "RoomHeartBeat",
  RoomHeartBeatSchema
);
