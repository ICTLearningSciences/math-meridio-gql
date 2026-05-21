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
import { UserRole } from "../types/types";
import { DateType } from "../types/date";

/** mongoose */

export enum EducationalRole {
  STUDENT = "STUDENT",
  INSTRUCTOR = "INSTRUCTOR",
}

export enum LoginService {
  GOOGLE = "GOOGLE",
}

export interface Avatar extends Document {
  type: string;
  id: string;
  description: string;
  variant: number;
  variants: string[];
}

export interface Player {
  name: string;
  description: string;
  avatar: Avatar[];
  googleId: string;
  userRole: UserRole;
  lastLoginAt: Date;
  loginService: LoginService;
  educationalRole: EducationalRole;
}

export interface PlayerDocument extends Document, Player {}

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

export const PlayerSchema = new Schema<PlayerDocument, PlayerModel>(
  {
    name: { type: String },
    description: { type: String },
    avatar: { type: [AvatarSchema] },
    googleId: { type: String, unique: true },
    userRole: {
      type: String,
      enum: [UserRole.USER, UserRole.ADMIN],
      default: UserRole.USER,
    },
    lastLoginAt: { type: Date },
    loginService: {
      type: String,
      enum: [LoginService.GOOGLE],
      default: LoginService.GOOGLE,
    },
    educationalRole: {
      type: String,
      enum: [EducationalRole.STUDENT, EducationalRole.INSTRUCTOR],
      default: EducationalRole.STUDENT,
    },
  },
  { timestamps: true, collation: { locale: "en", strength: 2 } }
);

export interface PlayerModel extends Model<PlayerDocument> {
  paginate(
    query?: PaginateQuery<PlayerDocument>,
    options?: PaginateOptions
  ): Promise<PaginatedResolveResult<PlayerDocument>>;
}

pluginPagination(PlayerSchema);

export default mongoose.model<PlayerDocument, PlayerModel>(
  "Player",
  PlayerSchema
);

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
    name: { type: GraphQLString },
    description: { type: GraphQLString },
    avatar: { type: new GraphQLList(AvatarType) },
    googleId: { type: GraphQLString },
    userRole: {
      type: GraphQLString,
      enum: [UserRole.USER, UserRole.ADMIN],
      default: UserRole.USER,
    },
    lastLoginAt: { type: DateType },
    loginService: {
      type: GraphQLString,
      enum: [LoginService.GOOGLE],
      default: LoginService.GOOGLE,
    },
    educationalRole: {
      type: GraphQLString,
      enum: [EducationalRole.STUDENT, EducationalRole.INSTRUCTOR],
      default: EducationalRole.STUDENT,
    },
  }),
});
