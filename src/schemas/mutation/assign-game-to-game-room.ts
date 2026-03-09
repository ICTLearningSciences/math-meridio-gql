/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { GraphQLObjectType, GraphQLString } from "graphql";
import { EducationalRole } from "../models/Player";
import RoomModel, { Room, RoomType } from "../models/Room";
import DiscussionStageModel from "../models/DiscussionStage/DiscussionStage";
import { getGameById } from "../../authoritative-server/games/game-helpers";
import { getFirstStepId } from "../../authoritative-server/authority/helpers/helpers";
import {
  processCurStep,
  processStepsUntilNextStallingPhase,
} from "../../authoritative-server/authority/step-process-pure-functions";
import { getCurStageAndStep } from "../../authoritative-server/authority/user-action-pure-functions";
import { AiServiceNames } from "../../authoritative-server/llm-request/types";
import {
  DiscussionStageStepType,
  isDiscussionStage,
} from "../models/DiscussionStage/types";
import PlayerModel from "../models/Player";
export const assignGameToGameRoom = {
  type: RoomType,
  args: {
    roomId: { type: GraphQLString },
    gameId: { type: GraphQLString },
  },
  resolve: async (
    _root: GraphQLObjectType,
    args: {
      roomId: string;
      gameId: string;
    },
    context: {
      userId: string;
      userEducationalRole: EducationalRole;
    }
  ): Promise<Room> => {
    try {
      const userId = context.userId;
      const { roomId, gameId } = args;

      const _discussionStages = await DiscussionStageModel.find();
      const discussionStages = _discussionStages.map((stage) =>
        stage.toObject()
      );

      const game = getGameById(gameId, discussionStages);
      const persistTruthGlobalStateData = game.persistTruthGlobalStateData;
      const firstStage = game.stageList[0];
      const firstStepId = getFirstStepId(firstStage.stage);

      // Return updated classroom
      const room = await RoomModel.findByIdAndUpdate(
        roomId,
        {
          $set: {
            [`gameData.gameId`]: gameId,
            [`gameData.persistTruthGlobalStateData`]:
              persistTruthGlobalStateData,
            [`gameData.globalStateData.curStageId`]: firstStage.stage.clientId,
            [`gameData.globalStateData.curStepId`]: firstStepId,
          },
        },
        { new: true }
      );

      if (!room) {
        throw new Error("Room not found");
      }

      const playerDocuments = await PlayerModel.find({
        _id: { $in: room.gameData.players },
      });

      // Process the first step.
      const roomWithFirstStepProcessed = await processCurStep(
        room.toObject(),
        discussionStages,
        {
          serviceName: AiServiceNames.OPEN_AI,
          model: "gpt-4o-mini",
        },
        context.userId,
        "assign-game-to-game-room",
        playerDocuments
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
            "assign-game-to-game-room",
            playerDocuments
          );
        return await RoomModel.findOneAndUpdate(
          { _id: roomWithProcessedSteps._id },
          { $set: { gameData: roomWithProcessedSteps.gameData } },
          { new: true }
        );
      }
    } catch (error) {
      throw new Error(error);
    }
  },
};

export default assignGameToGameRoom;
