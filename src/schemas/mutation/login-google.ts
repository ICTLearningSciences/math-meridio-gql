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
import axios from "axios";
import { GraphQLString, GraphQLObjectType, GraphQLNonNull } from "graphql";
import PlayerModel, {
  EducationalRole,
  LoginService,
  Player,
} from "../models/Player";
import {
  UserAccessTokenType,
  UserAccessToken,
  generateJwtToken,
  setTokenCookie,
  generateRefreshToken,
} from "../../schemas/types/user-access-token";

export interface GoogleResponse {
  id: string;
  name: string;
  email: string;
  given_name: string;
}

export interface GoogleAuthFunc {
  (accessToken: string): Promise<GoogleResponse>;
}

let _googleAuthFuncOverride: GoogleAuthFunc;

export function overrideGoogleAuthFunc(f: GoogleAuthFunc): void {
  _googleAuthFuncOverride = f;
}

export function restoreGoogleAuthFunc(): void {
  _googleAuthFuncOverride = undefined;
}

export async function authGoogle(accessToken: string): Promise<GoogleResponse> {
  if (_googleAuthFuncOverride) {
    return _googleAuthFuncOverride(accessToken);
  }
  const res = await axios.get<GoogleResponse>(
    `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${accessToken}`
  );
  return res.data;
}

export enum LoginType {
  SIGN_IN = "SIGN_IN",
  SIGN_UP = "SIGN_UP",
}

function validateInstructorLogin(
  googleResponse: GoogleResponse,
  existingUser?: Player
) {
  const instructorEmails = process.env.INSTRUCTOR_EMAILS.split(",");
  if (instructorEmails.includes(googleResponse.email)) {
    return true;
  }
  if (existingUser.educationalRole === EducationalRole.INSTRUCTOR) {
    return true;
  }
  throw new Error("User is not an instructor");
}

export const loginGoogle = {
  type: UserAccessTokenType,
  args: {
    accessToken: { type: GraphQLNonNull(GraphQLString) },
    educationalLoginRole: { type: GraphQLString },
  },
  resolve: async (
    _root: GraphQLObjectType,
    args: {
      accessToken: string;
      educationalLoginRole?: EducationalRole;
    },
    context: any // eslint-disable-line  @typescript-eslint/no-explicit-any
  ): Promise<UserAccessToken> => {
    try {
      const googleResponse = await authGoogle(args.accessToken);

      const existingUser = await PlayerModel.findOne({
        googleId: googleResponse.id,
      });
      let isInstructor = false;
      if (args.educationalLoginRole === EducationalRole.INSTRUCTOR) {
        isInstructor = validateInstructorLogin(googleResponse, existingUser);
      }
      const user = await PlayerModel.findOneAndUpdate(
        {
          googleId: googleResponse.id,
        },
        {
          $set: {
            googleId: googleResponse.id,
            name: googleResponse.name,
            email: googleResponse.email,
            lastLoginAt: new Date(),
            loginService: LoginService.GOOGLE,
            ...(isInstructor
              ? { educationalRole: EducationalRole.INSTRUCTOR }
              : {}),
          },
        },
        {
          new: true,
          upsert: true,
        }
      );
      // authentication successful so generate jwt and refresh tokens
      const jwtToken = await generateJwtToken(user);
      const refreshToken = await generateRefreshToken(user);
      setTokenCookie(context.res, refreshToken.token);
      return jwtToken;
    } catch (error) {
      throw new Error(error);
    }
  },
};

export default loginGoogle;
