/*

*/
/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { GraphQLNonNull } from "graphql";
import * as dotenv from "dotenv";

import BuiltStageModel, {
  DiscussionStageInputType,
  DiscussionStageType,
} from "../../models/DiscussionStage/DiscussionStage";
import { DiscussionStage } from "../../models/DiscussionStage/types";
import { idOrNew } from "../../../helpers";
import { Request } from "express";
dotenv.config();

export const addOrUpdateDiscussionStage = {
  type: DiscussionStageType,
  args: {
    stage: { type: GraphQLNonNull(DiscussionStageInputType) },
  },
  async resolve(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _: any,
    args: {
      stage: DiscussionStage;
    },
    context: {
      req: Request;
    }
  ) {
    if (
      context.req.headers["Authorization"] !==
      `bearer ${process.env.GQL_SECRET}`
    ) {
      throw new Error("Unauthorized");
    }
    try {
      const id = idOrNew(args.stage._id);
      delete args.stage._id;
      const updatedStage = await BuiltStageModel.findOneAndUpdate(
        {
          _id: id,
        },
        {
          ...args.stage,
        },
        {
          new: true,
          upsert: true,
        }
      );
      return updatedStage;
    } catch (e) {
      console.log(e);
      throw new Error(String(e));
    }
  },
};
export default addOrUpdateDiscussionStage;
