/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { GraphQLString, GraphQLObjectType } from "graphql";
import { CookieOptions, Response } from "express";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { PlayerDocument, PlayerType } from "../models/Player";
import DateType from "./date";
import RefreshTokenSchema from "../models/RefreshToken";
import requireEnv from "../../utils/require-env";

export interface UserAccessToken {
  user: PlayerDocument;
  accessToken: string;
  expirationDate: Date;
}

// duration of access token in seconds before it expires
export function accessTokenDuration(): number {
  return process.env.ACCESS_TOKEN_LENGTH
    ? parseInt(process.env.ACCESS_TOKEN_LENGTH)
    : 60 * 60 * 24 * 90;
}

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export async function getRefreshedAccessToken(
  token: string,
  res: Response
): Promise<UserAccessToken> {
  const refreshToken = await getRefreshToken(token);
  const { user } = refreshToken;

  // replace old refresh token with a new one and save
  const newRefreshToken = await generateRefreshToken(user);
  await newRefreshToken.save();
  setTokenCookie(res, newRefreshToken.token);

  refreshToken.revoked = new Date(Date.now());
  refreshToken.replacedByToken = newRefreshToken.token;
  await refreshToken.save();

  // generate new jwt
  return generateJwtToken(user);
}

export async function revokeToken(token: string): Promise<void> {
  const refreshToken = await getRefreshToken(token);

  // revoke token and save
  refreshToken.revoked = new Date(Date.now());
  await refreshToken.save();
}

async function getRefreshToken(token: string) {
  const refreshToken = await RefreshTokenSchema.findOne({ token }).populate(
    "user"
  );
  if (!refreshToken || !refreshToken.isActive) {
    throw "invalid token";
  }
  return refreshToken;
}

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export function setTokenCookie(res: Response, token: string): any {
  const domain = requireEnv("DOMAIN");
  // create http only cookie with refresh token that expires in 90 days
  const validDays = process.env["ACCESS_TOKEN_VALIDITY_DAYS"]
    ? parseInt(process.env["ACCESS_TOKEN_VALIDITY_DAYS"])
    : 90;
  // https://www.npmjs.com/package/cookies#cookiesset-name--value---options--
  const cookieOptions: CookieOptions = {
    httpOnly: true,
    expires: new Date(Date.now() + validDays * 24 * 60 * 60 * 1000),
    // api endpoints are on another subdomain so need to allow all subdomains:
    domain: domain,
    sameSite: "strict" as CookieOptions["sameSite"],
    secure: true,
  };
  res.cookie(process.env.REFRESH_TOKEN_NAME, token, cookieOptions);
}

function randomTokenString() {
  return randomBytes(40).toString("hex");
}

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export function generateRefreshToken(user: PlayerDocument): any {
  // create a refresh token that expires in 90 days
  const validDays = process.env["ACCESS_TOKEN_VALIDITY_DAYS"]
    ? parseInt(process.env["ACCESS_TOKEN_VALIDITY_DAYS"])
    : 90;
  return new RefreshTokenSchema({
    user: user.id,
    token: randomTokenString(),
    expires: new Date(Date.now() + validDays * 24 * 60 * 60 * 1000),
  }).save();
}

export function generateJwtToken(user: PlayerDocument): UserAccessToken {
  const expiresIn = 1440 * 60; // 24 hour expiry
  const expirationDate = new Date(Date.now() + expiresIn * 1000);
  const accessToken = jwt.sign(
    {
      id: user._id,
      userRole: user.userRole,
      educationalRole: user.educationalRole,
      expirationDate,
    },
    process.env.JWT_SECRET,
    { expiresIn }
  );
  return {
    user,
    accessToken,
    expirationDate,
  };
}

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export function decodeAccessToken(token: string): any {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error(error);
  }
}

export const UserAccessTokenType = new GraphQLObjectType({
  name: "UserAccessToken",
  fields: {
    user: { type: PlayerType },
    accessToken: { type: GraphQLString },
    expirationDate: { type: DateType },
  },
});

export default UserAccessTokenType;
