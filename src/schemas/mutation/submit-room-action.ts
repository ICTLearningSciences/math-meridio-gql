/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import { GraphQLString, GraphQLObjectType, GraphQLBoolean } from "graphql";
import RoomActionQueueModel from "../models/RoomActionQueue";
import { DateType } from "../../schemas/types/date";

export const submitRoomAction = {
  type: GraphQLBoolean,
  args: {
    roomId: { type: GraphQLString },
    actionType: { type: GraphQLString },
    payload: { type: GraphQLString },
    actionSentAt: { type: DateType },
  },
  resolve: async (
    _root: GraphQLObjectType,
    args: {
      roomId: string;
      actionType: string;
      payload: string;
      actionSentAt: Date;
    },
    context: { userId: string }
  ): Promise<boolean> => {
    if (!context.userId) throw new Error("Only authenticated users");

    await RoomActionQueueModel.create({
      roomId: args.roomId,
      playerId: context.userId,
      actionType: args.actionType,
      payload: args.payload,
      actionSentAt: args.actionSentAt,
    });
    return true;
  },
};

export default submitRoomAction;
