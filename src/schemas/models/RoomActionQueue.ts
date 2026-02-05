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
import { DateType } from "schemas/types/date";

/** mongoose */

export enum RoomActionType {
  SEND_MESSAGE = "SEND_MESSAGE",
  LEAVE_ROOM = "LEAVE_ROOM",
  JOIN_ROOM = "JOIN_ROOM",
  UPDATE_ROOM = "UPDATE_ROOM",
}

export interface RoomActionQueue extends Document {
  roomId: string;
  playerId: string;
  actionType: RoomActionType;
  payload: string;
  actionSentAt: Date;
  processedAt: Date;
}

export interface RoomActionQueueModel extends Model<RoomActionQueue> {
  paginate(
    query?: PaginateQuery<RoomActionQueue>,
    options?: PaginateOptions
  ): Promise<PaginatedResolveResult<RoomActionQueue>>;
}

export const RoomActionQueueSchema = new Schema<
  RoomActionQueue,
  RoomActionQueueModel
>(
  {
    roomId: { type: String, required: true },
    playerId: { type: String, required: true },
    actionType: {
      type: String,
      enum: Object.values(RoomActionType),
      required: true,
    },
    payload: { type: String, required: true },
    actionSentAt: { type: Date, default: Date.now },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true, collation: { locale: "en", strength: 2 } }
);

RoomActionQueueSchema.index({ _id: -1 });
pluginPagination(RoomActionQueueSchema);

export const RoomActionQueueType = new GraphQLObjectType({
  name: "RoomActionQueueType",
  fields: () => ({
    roomId: { type: GraphQLString },
    playerId: { type: GraphQLString },
    actionType: { type: GraphQLString },
    payload: { type: GraphQLString },
    actionSentAt: { type: DateType },
    processedAt: { type: DateType },
  }),
});

export default mongoose.model<RoomActionQueue, RoomActionQueueModel>(
  "RoomActionQueue",
  RoomActionQueueSchema
);
