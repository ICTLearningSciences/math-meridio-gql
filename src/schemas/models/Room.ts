/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import mongoose, { Schema, Document, Model } from "mongoose";
import {
  GraphQLBoolean,
  GraphQLString,
  GraphQLObjectType,
  GraphQLList,
  GraphQLID,
  GraphQLInputObjectType,
} from "graphql";
import {
  PaginatedResolveResult,
  PaginateOptions,
  PaginateQuery,
  pluginPagination,
} from "./Paginatation";
import PlayerModel, { PlayerType } from "./Player";
import GraphQLScalarType from "../types/anything-scalar-type";
import { Class } from "./classes/Class";
import { DiscussionStageStepType } from "./DiscussionStage/types";

/** mongoose */

export interface ChatMessage {
  messageId: string;
  message: string;
  sender: string;
  senderId: string;
  senderName: string;
  displayType: string;
  disableUserInput: boolean;
  mcqChoices: string[];
  sessionId: string;
  isPromptResponse: boolean;
  fromStepId?: string;
}

export interface ChatMessageDocument extends Document, ChatMessage {}

export interface GameStateData {
  key: string;
  value: any; // eslint-disable-line  @typescript-eslint/no-explicit-any
}

export interface GameStateDataDocument extends GameStateData, Document {}

export interface GlobalStateData {
  curStageId: string;
  curStepId: string;
  roomOwnerId: string;
  discussionDataStringified: string;
  gameStateData: GameStateData[];
}

export interface GlobalStateDataDocument extends GlobalStateData, Document {}

export interface PlayerStateData {
  player: string;
  animation: string;
  gameStateData: GameStateData[];
}

export interface PlayerStateDataDocument extends PlayerStateData, Document {}

export interface GameData {
  gameId: string;
  players: string[];
  chat: ChatMessage[];
  globalStateData: GlobalStateData;
  persistTruthGlobalStateData: string[];
  playerStateData: PlayerStateData[];
}

export interface GameDataDocument extends GameData, Document {}

export interface Room {
  classId?: Class["_id"];
  name: string;
  gameData: GameData;
  deletedRoom: boolean;
}

export interface RoomDocument extends Room, Document {}

export interface RoomModel extends Model<RoomDocument> {
  paginate(
    query?: PaginateQuery<RoomDocument>,
    options?: PaginateOptions
  ): Promise<PaginatedResolveResult<RoomDocument>>;
}

export const ChatMessageSchema = new Schema<ChatMessage>(
  {
    messageId: { type: String },
    message: { type: String },
    sender: { type: String },
    senderId: { type: String },
    senderName: { type: String },
    sessionId: { type: String },
    displayType: { type: String },
    disableUserInput: { type: Boolean },
    mcqChoices: [{ type: String }],
    isPromptResponse: { type: Boolean },
    fromStepId: { type: String },
  },
  { timestamps: true, collation: { locale: "en", strength: 2 } }
);

export const GameStateSchema = new Schema<GameStateData>(
  {
    key: { type: String },
    value: { type: Schema.Types.Mixed },
  },
  { timestamps: true, collation: { locale: "en", strength: 2 } }
);

export const GlobalStateSchema = new Schema<GlobalStateDataDocument>(
  {
    curStageId: { type: String },
    curStepId: { type: String },
    roomOwnerId: { type: String },
    discussionDataStringified: { type: String, default: "{}" },
    gameStateData: [{ type: GameStateSchema }],
  },
  { timestamps: true, collation: { locale: "en", strength: 2 } }
);

export const PlayerStateSchema = new Schema<PlayerStateDataDocument>(
  {
    player: { type: String },
    animation: { type: String },
    gameStateData: [{ type: GameStateSchema }],
  },
  { timestamps: true, collation: { locale: "en", strength: 2 } }
);

export const GameSchema = new Schema<GameDataDocument>(
  {
    gameId: { type: String },
    players: [{ type: String }],
    chat: [{ type: ChatMessageSchema }],
    globalStateData: { type: GlobalStateSchema },
    persistTruthGlobalStateData: [{ type: String }],
    playerStateData: [{ type: PlayerStateSchema }],
  },
  { timestamps: true, collation: { locale: "en", strength: 2 } }
);

export const RoomSchema = new Schema<RoomDocument, RoomModel>(
  {
    classId: { type: Schema.Types.ObjectId, ref: "Class" },
    name: { type: String },
    gameData: { type: GameSchema },
    deletedRoom: { type: Boolean },
  },
  { timestamps: true, collation: { locale: "en", strength: 2 } }
);

RoomSchema.index({ _id: -1 });
pluginPagination(RoomSchema);

export default mongoose.model<RoomDocument, RoomModel>("Room", RoomSchema);

/** gql */

export const ChatMessageType = new GraphQLObjectType({
  name: "ChatMessageType",
  fields: () => ({
    _id: { type: GraphQLID },
    messageId: { type: GraphQLString },
    message: { type: GraphQLString },
    sender: { type: GraphQLString },
    senderId: { type: GraphQLString },
    senderName: { type: GraphQLString },
    displayType: { type: GraphQLString },
    disableUserInput: { type: GraphQLBoolean },
    mcqChoices: { type: new GraphQLList(GraphQLString) },
    sessionId: { type: GraphQLString },
    isPromptResponse: { type: GraphQLBoolean },
    fromStepId: { type: GraphQLString },
  }),
});

export const GameStateDataType = new GraphQLObjectType({
  name: "GameStateDataType",
  fields: () => ({
    key: { type: GraphQLString },
    value: { type: GraphQLScalarType },
  }),
});

export const GlobalStateDataType = new GraphQLObjectType({
  name: "GlobalStateDataType",
  fields: () => ({
    curStageId: { type: GraphQLString },
    curStepId: { type: GraphQLString },
    roomOwnerId: { type: GraphQLString },
    discussionDataStringified: { type: GraphQLString },
    gameStateData: { type: new GraphQLList(GameStateDataType) },
  }),
});

export const PlayerStateDataType = new GraphQLObjectType({
  name: "PlayerStateDataType",
  fields: () => ({
    player: { type: GraphQLString },
    animation: { type: GraphQLString },
    gameStateData: { type: new GraphQLList(GameStateDataType) },
  }),
});

export const GameDataType = new GraphQLObjectType({
  name: "GameDataType",
  fields: () => ({
    gameId: { type: GraphQLString },
    players: {
      type: new GraphQLList(PlayerType),
      resolve: function (game: GameDataDocument) {
        return PlayerModel.find({ _id: { $in: game.players } });
      },
    },
    chat: { type: new GraphQLList(ChatMessageType) },
    persistTruthGlobalStateData: { type: new GraphQLList(GraphQLString) },
    globalStateData: { type: GlobalStateDataType },
    playerStateData: { type: new GraphQLList(PlayerStateDataType) },
  }),
});

export const RoomType = new GraphQLObjectType({
  name: "RoomType",
  fields: () => ({
    _id: { type: GraphQLID },
    classId: { type: GraphQLID },
    name: { type: GraphQLString },
    gameData: { type: GameDataType },
    deletedRoom: { type: GraphQLBoolean },
  }),
});

export const GameStateDataInputType = new GraphQLInputObjectType({
  name: "GameStateDataInputType",
  fields: () => ({
    key: { type: GraphQLString },
    value: { type: GraphQLScalarType },
  }),
});

export const GlobalStateDataInputType = new GraphQLInputObjectType({
  name: "GlobalStateDataInputType",
  fields: () => ({
    curStageId: { type: GraphQLString },
    curStepId: { type: GraphQLString },
    roomOwnerId: { type: GraphQLString },
    discussionDataStringified: { type: GraphQLString },
    gameStateData: { type: new GraphQLList(GameStateDataInputType) },
  }),
});

export const PlayerStateDataInputType = new GraphQLInputObjectType({
  name: "PlayerStateDataInputType",
  fields: () => ({
    player: { type: GraphQLString },
    animation: { type: GraphQLString },
    gameStateData: { type: new GraphQLList(GameStateDataInputType) },
  }),
});

export const ChatMessageInputType = new GraphQLInputObjectType({
  name: "ChatMessageInput",
  fields: () => ({
    messageId: { type: GraphQLString },
    message: { type: GraphQLString },
    sender: { type: GraphQLString },
    senderId: { type: GraphQLString },
    senderName: { type: GraphQLString },
    isPromptResponse: { type: GraphQLBoolean },
    fromStepId: { type: GraphQLString },
    sessionId: { type: GraphQLString },
    displayType: { type: GraphQLString },
    disableUserInput: { type: GraphQLBoolean },
    mcqChoices: { type: new GraphQLList(GraphQLString) },
  }),
});

export const GameDataInputType = new GraphQLInputObjectType({
  name: "GameDataInputType",
  fields: () => ({
    gameId: { type: GraphQLString },
    players: { type: new GraphQLList(GraphQLString) },
    chat: { type: new GraphQLList(ChatMessageInputType) },
    persistTruthGlobalStateData: { type: new GraphQLList(GraphQLString) },
    globalStateData: { type: GlobalStateDataInputType },
    playerStateData: { type: new GraphQLList(PlayerStateDataInputType) },
  }),
});

export const RoomDataInputType = new GraphQLInputObjectType({
  name: "RoomDataInputType",
  fields: () => ({
    classId: { type: GraphQLString },
    name: { type: GraphQLString },
    gameData: { type: GameDataInputType },
    deletedRoom: { type: GraphQLBoolean },
  }),
});
