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
import DateType from "../types/date";

export enum NotificationType {
  NONE = "",
  JOIN = "JOIN",
  LEAVE = "LEAVE",
  REPORT = "REPORT",
  REQUEST_HELP = "REQUEST_HELP",
}

export interface NotificationEvent extends Document {
  classId: string;
  roomId: string;
  userId: string;
  event: string;
  eventAt: Date;
  dismissedAt: Date;
  eventType: NotificationType;
}

export interface NotificationEventModel extends Model<NotificationEvent> {
  paginate(
    query?: PaginateQuery<NotificationEvent>,
    options?: PaginateOptions
  ): Promise<PaginatedResolveResult<NotificationEvent>>;
}

export const NotificationEventSchema = new Schema<
  NotificationEvent,
  NotificationEventModel
>(
  {
    classId: { type: String },
    roomId: { type: String },
    userId: { type: String, required: true },
    event: { type: String, required: true },
    eventAt: { type: Date },
    dismissedAt: { type: Date },
    eventType: {
      type: String,
      enum: Object.values(NotificationType),
      default: NotificationType.NONE,
    },
  },
  { timestamps: true, collation: { locale: "en", strength: 2 } }
);

pluginPagination(NotificationEventSchema);

export const NotificationEventType = new GraphQLObjectType({
  name: "NotificationEventType",
  fields: () => ({
    classId: { type: GraphQLString },
    roomId: { type: GraphQLString },
    userId: { type: GraphQLString },
    event: { type: GraphQLString },
    eventAt: { type: DateType },
    dismissedAt: { type: DateType },
    eventType: { type: GraphQLString },
  }),
});

export default mongoose.model<NotificationEvent, NotificationEventModel>(
  "NotificationEvent",
  NotificationEventSchema
);
