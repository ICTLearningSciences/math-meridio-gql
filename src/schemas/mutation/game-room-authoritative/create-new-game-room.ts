/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import { GraphQLString, GraphQLObjectType } from "graphql";
import ClassModel from "../../models/classes/Class";
import RoomModel, { Room, RoomPhase, RoomType } from "../../models/Room";
import PlayerModel from "../../models/Player";
import {
  addPlayerToRoomAtomically,
  addPlayerToRoomNonAtomically,
} from "../../../authoritative-server/authority/step-process-pure-functions";
import { getGameById } from "../../../authoritative-server/games/game-helpers";
import DiscussionStageModel from "../../models/DiscussionStage/DiscussionStage";
import {
  DiscussionStage,
  DiscussionStageStepType,
  isDiscussionStage,
} from "../../models/DiscussionStage/types";
import { getFirstStepId } from "../../../authoritative-server/authority/helpers/helpers";
import {
  processCurStep,
  processStepsUntilNextStallingPhase,
} from "../../../authoritative-server/authority/step-process-pure-functions";
import { AiServiceNames } from "../../../authoritative-server/llm-request/types";
import mongoose from "mongoose";
import { getCurStageAndStep } from "../../../authoritative-server/authority/user-action-pure-functions";
import { RequireInputType } from "../../../schemas/models/DiscussionStage/objects";

/**
 * Initializes the new game room with the first stage and step.
 */
export function initializeGroupGameRoomWithoutGameId(
  userId: string,
  groupId: number,
  usersInGroup: string[],
  classId: string
): Room {
  let room: Room = {
    _id: new mongoose.Types.ObjectId().toString(),
    name: `Group #${groupId} Solution Space`,
    ...(classId ? { classId } : {}),
    phase: RoomPhase.NO_ACTIVE_PROCESSING,
    versionNumber: 1,
    gameData: {
      gameId: "",
      players: [],
      playersStatusRecord: {},
      chat: [],
      curGameState: {
        curState: RequireInputType.SINGLE_RESPONSE_REQUIRED,
        playersLeftToRespond: [],
        studentReadyToContinue: false,
      },
      persistTruthGlobalStateData: [],
      playersGameStateData: {},
      mathStandardsCompleted: {},
      phaseProgression: {
        phasesStarted: [],
        phasesCompleted: [],
        curPhaseTitle: "",
        curPhaseStepId: "",
        startingPhaseStepsOrdered: [],
      },
      globalStateData: {
        curStageId: "",
        curStepId: "",
        roomOwnerId: userId,
        discussionData: {},
        gameStateData: {},
      },
    },
    deletedRoom: false,
  };
  for (const userId of usersInGroup) {
    room = addPlayerToRoomNonAtomically(room, userId);
  }
  return room;
}

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
    _id: new mongoose.Types.ObjectId().toString(),
    name: `${game.name} Solution Space ${numExistingGameRooms + 1}`,
    ...(classId ? { classId } : {}),
    phase: RoomPhase.NO_ACTIVE_PROCESSING,
    versionNumber: 1,
    gameData: {
      gameId: gameId,
      players: [],
      playersStatusRecord: {},
      chat: [],
      curGameState: {
        curState: RequireInputType.SINGLE_RESPONSE_REQUIRED,
        playersLeftToRespond: [],
        studentReadyToContinue: false,
      },
      persistTruthGlobalStateData: game.persistTruthGlobalStateData,
      playersGameStateData: {},
      mathStandardsCompleted: {},
      phaseProgression: {
        phasesStarted: [],
        phasesCompleted: [],
        curPhaseTitle: "",
        curPhaseStepId: "",
        startingPhaseStepsOrdered: [],
      },
      globalStateData: {
        curStageId: firstStage.stage.clientId,
        curStepId: firstStepId,
        roomOwnerId: userId,
        discussionData: {},
        gameStateData: {},
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
    const _newRoom: Room = initializeGameRoom(
      context.userId,
      args.gameId,
      args.classId || "",
      discussionStages,
      rooms.length
    );
    const newRoom: Room = await (await RoomModel.create(_newRoom)).toObject();
    const roomWithPlayerAdded: Room = await addPlayerToRoomAtomically(
      newRoom,
      player
    );

    // Process the first step.
    const roomWithFirstStepProcessed: Room = await processCurStep(
      roomWithPlayerAdded,
      discussionStages,
      {
        serviceName: AiServiceNames.OPEN_AI,
        model: "gpt-4o-mini",
      },
      context.userId,
      args.sessionId
    );

    const curStageAndStep = getCurStageAndStep(
      roomWithFirstStepProcessed.gameData,
      discussionStages
    );
    if (
      isDiscussionStage(curStageAndStep.curStage) &&
      curStageAndStep.curStep?.stepType !==
        DiscussionStageStepType.REQUEST_USER_INPUT
    ) {
      // Now process all other steps until we reach a request user input step or simulation stage or end of phase reflection step.
      const roomWithProcessedSteps: Room =
        await processStepsUntilNextStallingPhase(
          roomWithFirstStepProcessed,
          discussionStages,
          {
            serviceName: AiServiceNames.OPEN_AI,
            model: "gpt-4o-mini",
          },
          context.userId,
          args.sessionId
        );
      return await RoomModel.findOneAndUpdate(
        { _id: roomWithProcessedSteps._id },
        { $set: { gameData: roomWithProcessedSteps.gameData } },
        { new: true }
      );
    }
    return await RoomModel.findOneAndUpdate(
      { _id: roomWithFirstStepProcessed._id },
      { $set: { gameData: roomWithFirstStepProcessed.gameData } },
      { new: true }
    );
  },
};

export default createNewGameRoom;
