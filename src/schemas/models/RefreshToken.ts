/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import mongoose, { Document, Model, Schema } from "mongoose";
import { PlayerDocument } from "./Player";

export interface RefreshToken extends Document {
  user: PlayerDocument["_id"];
  token: string;
  expires: Date;
  created: Date;
  createdByIp: string;
  revoked: Date;
  revokedByIp: string;
  replacedByToken: string;
  isExpired: boolean;
  isActive: boolean;
}

export const RefreshTokenSchema = new Schema<RefreshToken, RefreshTokenModel>({
  user: { type: Schema.Types.ObjectId, ref: "Player" },
  token: { type: String },
  expires: { type: Date },
  created: { type: Date, default: Date.now },
  createdByIp: { type: String },
  revoked: { type: Date },
  revokedByIp: { type: String },
  replacedByToken: { type: String },
});

RefreshTokenSchema.virtual("isExpired").get(function () {
  return Date.now() >= this.expires.getTime();
});

RefreshTokenSchema.virtual("isActive").get(function () {
  return !this.revoked && !this.isExpired;
});

RefreshTokenSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
});

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface RefreshTokenModel extends Model<RefreshToken> {}

export default mongoose.model<RefreshToken, RefreshTokenModel>(
  "RefreshToken",
  RefreshTokenSchema
);
