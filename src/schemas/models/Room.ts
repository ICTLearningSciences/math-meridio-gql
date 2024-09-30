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
} from "graphql";
import {
  PaginatedResolveResult,
  PaginateOptions,
  PaginateQuery,
  pluginPagination,
} from "./Paginatation";
import PlayerModel, { PlayerType } from "./Player";
import GraphQLScalarType from "../types/anything-scalar-type";

/** mongoose */

export interface ChatMessage extends Document {
  id: string;
  message: string;
  sender: string;
  senderId: string;
  senderName: string;
  displayType: string;
  disableUserInput: boolean;
  mcqChoices: string[];
}

export interface GameStateData extends Document {
  key: string;
  value: any; // eslint-disable-line  @typescript-eslint/no-explicit-any
}

export interface GlobalStateData extends Document {
  curStageId: string;
  curStepId: string;
  gameStateData: GameStateData[];
}

export interface PlayerStateData extends Document {
  player: string;
  animation: string;
  gameStateData: GameStateData[];
}

export interface GameData extends Document {
  gameId: string;
  players: string[];
  chat: ChatMessage[];
  globalStateData: GlobalStateData;
  playerStateData: PlayerStateData[];
}

export interface Room extends Document {
  name: string;
  gameData: GameData;
  deletedRoom: boolean;
}

export interface RoomModel extends Model<Room> {
  paginate(
    query?: PaginateQuery<Room>,
    options?: PaginateOptions
  ): Promise<PaginatedResolveResult<Room>>;
}

export const ChatMessageSchema = new Schema<ChatMessage>(
  {
    id: { type: String },
    message: { type: String },
    sender: { type: String },
    senderId: { type: String },
    senderName: { type: String },
    displayType: { type: String },
    disableUserInput: { type: Boolean },
    mcqChoices: [{ type: String }],
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

export const GlobalStateSchema = new Schema<GlobalStateData>(
  {
    curStageId: { type: String },
    curStepId: { type: String },
    gameStateData: [{ type: GameStateSchema }],
  },
  { timestamps: true, collation: { locale: "en", strength: 2 } }
);

export const PlayerStateSchema = new Schema<PlayerStateData>(
  {
    player: { type: String },
    animation: { type: String },
    gameStateData: [{ type: GameStateSchema }],
  },
  { timestamps: true, collation: { locale: "en", strength: 2 } }
);

export const GameSchema = new Schema<GameData>(
  {
    gameId: { type: String },
    players: [{ type: String }],
    chat: [{ type: ChatMessageSchema }],
    globalStateData: { type: GlobalStateSchema },
    playerStateData: [{ type: PlayerStateSchema }],
  },
  { timestamps: true, collation: { locale: "en", strength: 2 } }
);

export const RoomSchema = new Schema<Room, RoomModel>(
  {
    name: { type: String },
    gameData: { type: GameSchema },
    deletedRoom: { type: Boolean },
  },
  { timestamps: true, collation: { locale: "en", strength: 2 } }
);

RoomSchema.index({ _id: -1 });
pluginPagination(RoomSchema);

export default mongoose.model<Room, RoomModel>("Room", RoomSchema);

/** gql */

export const ChatMessageType = new GraphQLObjectType({
  name: "ChatMessageType",
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
      resolve: function (game: GameData) {
        return PlayerModel.find({ clientId: { $in: game.players } });
      },
    },
    chat: { type: new GraphQLList(ChatMessageType) },
    globalStateData: { type: GlobalStateDataType },
    playerStateData: { type: new GraphQLList(PlayerStateDataType) },
  }),
});

export const RoomType = new GraphQLObjectType({
  name: "RoomType",
  fields: () => ({
    _id: { type: GraphQLID },
    name: { type: GraphQLString },
    gameData: { type: GameDataType },
    deletedRoom: { type: GraphQLBoolean },
  }),
});
