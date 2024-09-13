/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import {
  GraphQLID,
  GraphQLString,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLBoolean,
  GraphQLObjectType,
} from "graphql";
import RoomModel, { ChatMessage, Room, RoomType } from "../models/Room";

export const ChatMessageInputType = new GraphQLInputObjectType({
  name: "ChatMessageInput",
  fields: () => ({
    id: { type: GraphQLString },
    message: { type: GraphQLString },
    sender: { type: GraphQLString },
    senderId: { type: GraphQLString },
    senderName: { type: GraphQLString },
    displayType: { type: GraphQLString },
    disableUserInput: { type: GraphQLBoolean },
    mcqChoices: { type: new GraphQLList(GraphQLString) },
  }),
});

export const sendMessage = {
  type: RoomType,
  args: {
    roomId: { type: GraphQLID },
    msg: { type: ChatMessageInputType },
  },
  resolve: async (
    _root: GraphQLObjectType,
    args: {
      roomId: string;
      msg: ChatMessage;
    }
  ): Promise<Room> => {
    const room = await RoomModel.findOne({
      _id: args.roomId,
      deletedRoom: false,
    });
    if (!room) throw new Error("Invalid room");
    return await RoomModel.findOneAndUpdate(
      {
        _id: args.roomId,
        deletedRoom: false,
      },
      {
        $push: {
          "gameData.chat": args.msg,
        },
      },
      { new: true }
    );
  },
};

export default sendMessage;
