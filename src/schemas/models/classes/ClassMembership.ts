/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import mongoose, { Schema, Document, Model } from "mongoose";
import {
  GraphQLString,
  GraphQLObjectType,
  GraphQLID,
  GraphQLInt,
  GraphQLInputObjectType,
} from "graphql";
import {
  PaginatedResolveResult,
  PaginateOptions,
  PaginateQuery,
  pluginPagination,
} from "../Paginatation";
import { Class } from "./Class";
import { PlayerDocument } from "../Player";

export enum ClassMembershipStatus {
  MEMBER = "Member",
  REMOVED = "Removed",
  BLOCKED = "Blocked",
  NONE = "None",
}

export interface ClassMembership extends Document {
  classId: Class["_id"];
  userId: PlayerDocument["_id"];
  groupId: number;
  status: ClassMembershipStatus;
}

export const ClassMembershipSchema = new Schema<
  ClassMembership,
  ClassMembershipModel
>(
  {
    classId: { type: Schema.Types.ObjectId, ref: "Class" },
    userId: { type: Schema.Types.ObjectId, ref: "Player" },
    groupId: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ClassMembershipStatus,
      default: ClassMembershipStatus.NONE,
    },
  },
  { timestamps: true, collation: { locale: "en", strength: 2 } }
);

export interface ClassMembershipModel extends Model<ClassMembership> {
  paginate(
    query?: PaginateQuery<ClassMembership>,
    options?: PaginateOptions
  ): Promise<PaginatedResolveResult<ClassMembership>>;
}

pluginPagination(ClassMembershipSchema);

export default mongoose.model<ClassMembership, ClassMembershipModel>(
  "ClassMembership",
  ClassMembershipSchema
);

/** gql */
export const ClassMembershipType = new GraphQLObjectType({
  name: "ClassMembershipType",
  fields: () => ({
    classId: { type: GraphQLID },
    userId: { type: GraphQLID },
    groupId: { type: GraphQLInt },
    status: { type: GraphQLString, enum: ClassMembershipStatus },
  }),
});

export const ClassMembershipInputType = new GraphQLInputObjectType({
  name: "ClassMembershipInputType",
  fields: () => ({
    classId: { type: GraphQLID },
    userId: { type: GraphQLID },
    groupId: { type: GraphQLInt },
    status: { type: GraphQLString, enum: ClassMembershipStatus },
  }),
});
