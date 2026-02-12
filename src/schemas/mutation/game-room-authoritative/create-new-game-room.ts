/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import { GraphQLString, GraphQLObjectType } from "graphql";
import ClassModel from "../../models/classes/Class";
import RoomModel, { Room, RoomPhase, RoomType } from "../../models/Room";
import PlayerModel from "../../models/Player";
import { addPlayerToRoom } from "../../../authoritative-server/authority/user-action-pure-functions";
import { getGameById } from "../../../authoritative-server/games/game-helpers";
import DiscussionStageModel from "../../models/DiscussionStage/DiscussionStage";
import { DiscussionStage } from "../../models/DiscussionStage/types";
import { getFirstStepId } from "../../../authoritative-server/authority/helpers/helpers";
import {
  processCurStep,
  processStepsUntilNextRequestUserInputStep,
} from "../../../authoritative-server/authority/step-process-pure-functions";
import { AiServiceNames } from "../../../authoritative-server/llm-request/types";

/**
 * Initializes the new game room with the first stage and step.
 */
export function initializeGameRoom(
  userId: string,
  gameId: string,
  classId: string,
  discussionStages: DiscussionStage[],
  numExistingGameRooms: number
): Room {
  const game = getGameById(gameId, discussionStages);
  const firstStage = game.stageList[0];
  const firstStepId = getFirstStepId(firstStage.stage);
  return {
    name: `${game.name} Solution Space ${numExistingGameRooms + 1}`,
    ...(classId ? { classId } : {}),
    phase: RoomPhase.NO_ACTIVE_PROCESSING,
    versionNumber: 1,
    gameData: {
      gameId: gameId,
      players: [],
      chat: [],
      persistTruthGlobalStateData: game.persistTruthGlobalStateData,
      playerStateData: [],
      globalStateData: {
        curStageId: firstStage.stage.clientId,
        curStepId: firstStepId,
        roomOwnerId: userId,
        discussionData: {},
        gameStateData: [],
      },
    },
    deletedRoom: false,
  };
}

export const createNewGameRoom = {
  type: RoomType,
  args: {
    gameId: { type: GraphQLString },
    classId: { type: GraphQLString },
    sessionId: { type: GraphQLString },
  },
  resolve: async (
    _root: GraphQLObjectType,
    args: {
      gameId: string;
      classId?: string;
      sessionId: string;
    },
    context: { userId: string }
  ): Promise<Room> => {
    const rooms = await RoomModel.find({
      "gameData.gameId": args.gameId,
      deletedRoom: false,
    });
    const player = await PlayerModel.findOne({ _id: context.userId });
    if (!player) throw new Error("Unauthorized");
    if (args.classId) {
      const classRoom = await ClassModel.findOne({ _id: args.classId });
      if (!classRoom) throw new Error("Invalid class");
    }
    const _discussionStages = await DiscussionStageModel.find();
    const discussionStages = _discussionStages.map((stage) => stage.toObject());
    const newRoom: Room = initializeGameRoom(
      context.userId,
      args.gameId,
      args.classId || "",
      discussionStages,
      rooms.length
    );

    newRoom.gameData = addPlayerToRoom(newRoom.gameData, player);

    newRoom.gameData = await processCurStep(
      newRoom.gameData,
      discussionStages,
      {
        serviceName: AiServiceNames.OPEN_AI,
        model: "gpt-4o-mini",
      },
      context.userId,
      args.sessionId
    );

    // TODO: start processing steps up to request user input step.
    newRoom.gameData = await processStepsUntilNextRequestUserInputStep(
      newRoom.gameData,
      discussionStages,
      {
        serviceName: AiServiceNames.OPEN_AI,
        model: "gpt-4o-mini",
      },
      context.userId,
      args.sessionId
    );

    return await RoomModel.create(newRoom);
  },
};

export default createNewGameRoom;
