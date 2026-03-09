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
  GraphQLInt,
  GraphQLNonNull,
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
import {
  EndOfPhaseReflectionStepSchema,
  EndOfPhaseReflectionStepType,
  RequireInputType,
} from "./DiscussionStage/objects";
import { EndOfPhaseReflectionStep } from "./DiscussionStage/types";
import { PlayerStatusRecord } from "../../schemas/types/types";
import { getPlayerComputedState } from "../../helpers";
import { getGameById } from "../../authoritative-server/games/game-helpers";

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
  fromStepId?: string;
}

export interface ChatMessageDocument extends Document, ChatMessage {}

export type GameStateData = Record<string, any>;
export type DiscussionData = Record<string, any>;

export interface GlobalStateData {
  curStageId: string;
  curStepId: string;
  roomOwnerId: string;
  discussionData: DiscussionData;
  gameStateData: GameStateData;
}

export interface GlobalStateDataDocument extends GlobalStateData, Document {}

export interface PhaseProgression {
  phasesStarted: string[];
  phasesCompleted: string[];
  curPhaseTitle: string;
  curPhaseStepId: string;
  startingPhaseStepsOrdered: string[];
}

export interface CurGameState {
  curState:
    | RequireInputType
    | "WAITING_FOR_SIMULATION"
    | "END_OF_PHASE_REFLECTION"
    | "WAITING_FOR_STUDENT_READY_TO_CONTINUE";
  playersLeftToRespond: string[];
  studentReadyToContinue: boolean;
  curRoundNumber?: number;
  endOfPhaseStep?: EndOfPhaseReflectionStep;
  selectedQuestion?: string;
  studentReflections?: Record<string, string>; // keyed by player ID
}
export interface CurGameStateDocument extends CurGameState, Document {}
export interface GameData {
  gameId: string;
  players: string[];

  curGameState: CurGameState;
  chat: ChatMessage[];
  globalStateData: GlobalStateData;
  persistTruthGlobalStateData: string[];
  playersStatusRecord: PlayerStatusRecord; // keyed by player ID
  playersGameStateData: Record<string, GameStateData>; // keyed by player ID
  mathStandardsCompleted: Record<string, boolean>; // keyed by standard name
  phaseProgression: PhaseProgression;
}

export interface GameDataDocument extends GameData, Document {}

export enum RoomPhase {
  PROCESSING = "PROCESSING",
  NO_ACTIVE_PROCESSING = "NO_ACTIVE_PROCESSING",
}

export interface Room {
  _id: string;
  classId?: Class["_id"];
  name: string;
  gameData: GameData;
  phase: RoomPhase;
  versionNumber: number;
  deletedRoom: boolean;
}

export interface RoomDocument extends Omit<Room, "_id">, Document {}

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
    fromStepId: { type: String },
  },
  { timestamps: true, collation: { locale: "en", strength: 2 } }
);

export const PhaseProgressionSchema = new Schema<PhaseProgression>(
  {
    phasesStarted: [{ type: String }],
    phasesCompleted: [{ type: String }],
    curPhaseTitle: { type: String },
    curPhaseStepId: { type: String },
    startingPhaseStepsOrdered: [{ type: String }],
  },
  { collation: { locale: "en", strength: 2 } }
);

export const CurGameStateSchema = new Schema<CurGameStateDocument>(
  {
    curState: { type: String },
    playersLeftToRespond: [{ type: String }],
    studentReadyToContinue: { type: Boolean },
    curRoundNumber: { type: Number },
    endOfPhaseStep: { type: EndOfPhaseReflectionStepSchema },
    selectedQuestion: { type: String },
    studentReflections: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collation: { locale: "en", strength: 2 } }
);
export const GlobalStateSchema = new Schema<GlobalStateDataDocument>(
  {
    curStageId: { type: String },
    curStepId: { type: String },
    roomOwnerId: { type: String },
    discussionData: { type: Schema.Types.Mixed, default: {} },
    gameStateData: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    collation: { locale: "en", strength: 2 },
    minimize: false, // Preserve empty objects in Mixed fields
  }
);

export const GameSchema = new Schema<GameDataDocument>(
  {
    gameId: { type: String },
    players: [{ type: String }], // keyed by player Id
    mathStandardsCompleted: { type: Schema.Types.Mixed, default: {} },
    phaseProgression: {
      type: PhaseProgressionSchema,
      default: {
        phasesStarted: [],
        phasesCompleted: [],
        curPhaseTitle: "",
        curPhaseStepId: "",
        startingPhaseStepsOrdered: [],
      },
    },
    chat: [{ type: ChatMessageSchema }],
    curGameState: {
      type: CurGameStateSchema,
      default: {
        curState: RequireInputType.SINGLE_RESPONSE_REQUIRED,
        playersLeftToRespond: [],
        studentReadyToContinue: false,
        curRoundNumber: 0,
        endOfPhaseStep: undefined,
        studentReflections: {},
      },
    },
    globalStateData: { type: GlobalStateSchema },
    persistTruthGlobalStateData: [{ type: String }],
    playersStatusRecord: { type: Schema.Types.Mixed, default: {} },
    playersGameStateData: { type: Schema.Types.Mixed, default: {} }, // keyed by player Id
  },
  {
    timestamps: true,
    collation: { locale: "en", strength: 2 },
    minimize: false, // Preserve empty objects in Mixed fields
  }
);

export const RoomSchema = new Schema<RoomDocument, RoomModel>(
  {
    classId: { type: Schema.Types.ObjectId, ref: "Class" },
    name: { type: String },
    gameData: { type: GameSchema },
    phase: {
      type: String,
      enum: RoomPhase,
      default: RoomPhase.NO_ACTIVE_PROCESSING,
    },
    deletedRoom: { type: Boolean },
    versionNumber: { type: Number, default: 1 },
  },
  {
    timestamps: true,
    collation: { locale: "en", strength: 2 },
    minimize: false, // Preserve empty objects in Mixed fields
  }
);

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
    fromStepId: { type: GraphQLString },
  }),
});

export const GlobalStateDataType = new GraphQLObjectType({
  name: "GlobalStateDataType",
  fields: () => ({
    curStageId: { type: GraphQLString },
    curStepId: { type: GraphQLString },
    roomOwnerId: { type: GraphQLString },
    discussionData: { type: GraphQLScalarType },
    gameStateData: { type: GraphQLScalarType },
  }),
});

// gamePhases:
// WAITING_FOR_SINGLE_PLAYERS_INPUT
//  - no extra data
//  - Set when: request user input step started without requireAllUsersInput
// WAITING_FOR_ALL_PLAYERS_INPUT_FREE_FOR_ALL
//  - list of players we are waiting for a response from
//  - Set when: request user input step started with requireAllUsersInput

// WAITING_FOR_ALL_PLAYERS_IN_ORDER
//  - next player we need a response from
//  - Set when:
//      - on create room
//      - on ping process
//      - When: request user input step started with requireAllUsersInput and requireAllUsersInput is ALL_REQUIRED_IN_ORDER
// PROCESSING_REQUEST
//  - no extra data
// WAITING_FOR_SIMULATION
// COLLECTING_PHASE_REFLECTION
//  - playersLeftToRespond (reflect)
//  - studentReflections (just for frontend display)
//  - roundNumber (how many times this phase has been run)

export const PhaseProgressionType = new GraphQLObjectType({
  name: "PhaseProgressionType",
  fields: () => ({
    phasesStarted: { type: new GraphQLList(GraphQLString) },
    phasesCompleted: { type: new GraphQLList(GraphQLString) },
    curPhaseStepId: { type: GraphQLString },
    curPhaseTitle: { type: GraphQLString },
    startingPhaseStepsOrdered: { type: new GraphQLList(GraphQLString) },
  }),
});

export const CurGameStateType = new GraphQLObjectType({
  name: "CurGameStateType",
  fields: () => ({
    curState: { type: GraphQLNonNull(GraphQLString) },
    playersLeftToRespond: { type: new GraphQLList(GraphQLString) },
    studentReadyToContinue: { type: GraphQLBoolean },
    curRoundNumber: { type: GraphQLInt },
    endOfPhaseStep: { type: EndOfPhaseReflectionStepType },
    selectedQuestion: { type: GraphQLString },
    studentReflections: { type: GraphQLScalarType },
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
    playersStatusRecord: {
      type: GraphQLScalarType,
      resolve: function (game: GameDataDocument) {
        return Object.entries(game.playersStatusRecord).reduce(
          (acc, [playerEmail, playerStatus]) => {
            acc[playerEmail] = {
              ...playerStatus,
              computedState: getPlayerComputedState(playerStatus),
            };
            return acc;
          },
          {} as PlayerStatusRecord
        );
      },
    }, // keyed by player email
    curGameState: { type: CurGameStateType },
    chat: { type: new GraphQLList(ChatMessageType) },
    persistTruthGlobalStateData: { type: new GraphQLList(GraphQLString) },
    phaseProgression: { type: PhaseProgressionType },
    mathStandardsCompleted: {
      type: GraphQLScalarType,
      resolve: function (gameData: GameDataDocument) {
        if (!gameData.gameId) {
          return {};
        }
        const game = getGameById(gameData.gameId, [], true);
        return Object.entries(game.mathStandardsCompletedRequirements).reduce(
          (acc, [standardName, requiredKeyValuePairs]) => {
            acc[standardName] = Object.entries(requiredKeyValuePairs).every(
              ([key, value]) => {
                return gameData.globalStateData.gameStateData[key] === value;
              }
            );
            return acc;
          },
          {} as Record<string, boolean>
        );
      },
    },
    globalStateData: { type: GlobalStateDataType },
    playersGameStateData: { type: GraphQLScalarType }, // keyed by player ID
  }),
});

export const RoomType = new GraphQLObjectType({
  name: "RoomType",
  fields: () => ({
    _id: { type: GraphQLID },
    classId: { type: GraphQLID },
    name: { type: GraphQLString },
    gameData: { type: GameDataType },
    phase: { type: GraphQLString },
    deletedRoom: { type: GraphQLBoolean },
    versionNumber: { type: GraphQLInt },
  }),
});
