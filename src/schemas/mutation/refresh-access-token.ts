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
import { GraphQLObjectType } from "graphql";
import UserAccessTokenType, {
  UserAccessToken,
  getRefreshedAccessToken,
} from "../../schemas/types/user-access-token";

export const refreshAccessToken = {
  type: UserAccessTokenType,
  args: {},
  resolve: async (
    _root: GraphQLObjectType,
    args: any, // eslint-disable-line  @typescript-eslint/no-explicit-any
    context: any // eslint-disable-line  @typescript-eslint/no-explicit-any
  ): Promise<UserAccessToken> => {
    try {
      const cookieHeader: string = context.req.headers.cookie;
      if (!cookieHeader) {
        throw new Error("no cookie header");
      }
      const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
      const refreshTokenName = process.env.REFRESH_TOKEN_NAME || "refreshToken";
      const refreshTokenCookie = cookies.find((cookie) =>
        cookie.startsWith(`${refreshTokenName}=`)
      );
      if (!refreshTokenCookie) {
        throw new Error("no refresh token cookie");
      }
      const refreshToken = refreshTokenCookie.split("=")[1];
      const newToken = getRefreshedAccessToken(refreshToken, context.res);

      return newToken;
    } catch (error) {
      throw new Error(error);
    }
  },
};

export default refreshAccessToken;
