/*

*/

import mongoose, { Schema, Document, Model } from "mongoose";
import {
  GraphQLString,
  GraphQLObjectType,
  GraphQLList,
  GraphQLID,
} from "graphql";
import {
  PaginatedResolveResult,
  PaginateOptions,
  PaginateQuery,
  pluginPagination,
} from "./Paginatation";

export interface Room extends Document {
  users: string[];
}

export const RoomType = new GraphQLObjectType({
  name: "RoomType",
  fields: () => ({
    _id: { type: GraphQLID },
    users: { type: new GraphQLList(GraphQLString) },
  }),
});

export const RoomSchema = new Schema<Room, RoomModel>(
  {
    users: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true, collation: { locale: "en", strength: 2 } }
);

export interface RoomModel extends Model<Room> {
  paginate(
    query?: PaginateQuery<Room>,
    options?: PaginateOptions
  ): Promise<PaginatedResolveResult<Room>>;
}

RoomSchema.index({ _id: -1 });
pluginPagination(RoomSchema);

export default mongoose.model<Room, RoomModel>("Room", RoomSchema);
