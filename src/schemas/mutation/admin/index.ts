/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { GraphQLObjectType } from "graphql";
import PlayerModel, { EducationalRole } from "../../models/Player";
import updatePlayerRole from "./update-player-role";
import { UserRole } from "../../types/types";

export const Admin: GraphQLObjectType = new GraphQLObjectType({
  name: "AdminMutation",
  fields: {
    updatePlayerRole,
  },
});

export const admin = {
  type: Admin,
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
  resolve: async (_: GraphQLObjectType, _args: any, context: any) => {
    if (!context.userId) {
      throw new Error("Only authorized users");
    }
    const user = await PlayerModel.findById(context.userId);
    if (
      !user ||
      user.userRole !== UserRole.ADMIN ||
      user.educationalRole !== EducationalRole.INSTRUCTOR
    ) {
      throw new Error("Only admin users");
    }
    return context;
  },
};

export default admin;
