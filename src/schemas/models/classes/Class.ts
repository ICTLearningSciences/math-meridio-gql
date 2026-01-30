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
} from "../Paginatation";
import DateType from "../../types/date";

export interface InviteCode {
  code: string;
  validUntil?: Date;
  maxUses?: number;
  uses: number;
}
export interface Class extends Document {
  name: string;
  teacherId: string; // ref User
  inviteCodes: InviteCode[];
  createdAt: Date;
  archivedAt?: Date;
}

export const InviteCodeSchema = new Schema<InviteCode>(
  {
    code: { type: String },
    validUntil: { type: Date },
    maxUses: { type: Number },
    uses: { type: Number },
  },
  { timestamps: true, collation: { locale: "en", strength: 2 } }
);

export const ClassSchema = new Schema<Class, ClassModel>(
  {
    name: { type: String },
    teacherId: { type: String, ref: "Player" },
    inviteCodes: { type: [InviteCodeSchema], default: [] },
    createdAt: { type: Date },
    archivedAt: { type: Date },
  },
  { timestamps: true, collation: { locale: "en", strength: 2 } }
);

export interface ClassModel extends Model<Class> {
  paginate(
    query?: PaginateQuery<Class>,
    options?: PaginateOptions
  ): Promise<PaginatedResolveResult<Class>>;
}

ClassSchema.index({ _id: -1 });
pluginPagination(ClassSchema);

export default mongoose.model<Class, ClassModel>("Class", ClassSchema);

/** gql */
export const InviteCodeType = new GraphQLObjectType({
  name: "InviteCodeType",
  fields: () => ({
    code: { type: GraphQLString },
    validUntil: { type: DateType },
    maxUses: { type: GraphQLInt },
    uses: { type: GraphQLInt },
  }),
});

export const ClassType = new GraphQLObjectType({
  name: "ClassType",
  fields: () => ({
    _id: { type: GraphQLID },
    name: { type: GraphQLString },
    teacherId: { type: GraphQLString },
    inviteCodes: { type: new GraphQLList(InviteCodeType) },
    createdAt: { type: DateType },
    archivedAt: { type: DateType },
  }),
});
