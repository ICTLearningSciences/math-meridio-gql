/*

*/

import {
  GraphQLID,
  GraphQLString,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLBoolean,
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
    _root: any,
    args: {
      roomId: string;
      msg: ChatMessage;
    }
  ): Promise<Room> => {
    const room = await RoomModel.findOne({ _id: args.roomId });
    if (!room) throw new Error("Invalid room");
    return await RoomModel.findOneAndUpdate(
      {
        _id: args.roomId,
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
