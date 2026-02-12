/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import { GraphQLString, GraphQLObjectType, GraphQLID } from "graphql";
import RoomModel, { Room, RoomType } from "../../models/Room";
import PlayerModel from "../../models/Player";
import { getCurStageAndStep } from "../../../authoritative-server/authority/user-action-pure-functions";
import DiscussionStageModel from "../../models/DiscussionStage/DiscussionStage";
import {
  DiscussionStageStepType,
  RequestUserInputStageStep,
} from "../../models/DiscussionStage/types";
import {
  isRequestUserInputStepComplete,
  processStepsUntilNextRequestUserInputStep,
} from "../../../authoritative-server/authority/step-process-pure-functions";
import { AiServiceNames } from "../../../authoritative-server/llm-request/types";
import { buildUserMessage } from "authoritative-server/authority/state-modifier-helpers";

export const sendMessageToGameRoom = {
  type: RoomType,
  args: {
    roomId: { type: GraphQLID },
    sessionId: { type: GraphQLString },
    message: { type: GraphQLString },
  },
  resolve: async (
    _root: GraphQLObjectType,
    args: {
      roomId: string;
      sessionId: string;
      message: string;
    },
    context: { userId: string }
  ): Promise<Room> => {
    const _room = await RoomModel.findOne({
      _id: args.roomId,
      deletedRoom: false,
    });
    if (!_room) throw new Error("Failed to find room");
    const player = await PlayerModel.findOne({ _id: context.userId });
    if (!player) throw new Error("Unauthorized User");
    if (!_room.gameData.players.includes(context.userId)) {
      throw new Error("User is not a player in the room");
    }
    const _discussionStages = await DiscussionStageModel.find();
    const discussionStages = _discussionStages.map((stage) => stage.toObject());
    let room = _room.toObject();
    const stageAndStep = getCurStageAndStep(room.gameData, discussionStages);

    const shouldUpdateDiscussionData =
      stageAndStep.curStep.stepType ===
        DiscussionStageStepType.REQUEST_USER_INPUT &&
      stageAndStep.curStep.saveResponseVariableName;

    const updatedRoom = await RoomModel.findOneAndUpdate(
      { _id: args.roomId },
      {
        $push: {
          "gameData.chat": buildUserMessage(
            args.message,
            context.userId,
            player.name,
            args.sessionId
          ),
        },
        ...(shouldUpdateDiscussionData
          ? {
              $set: {
                [`gameData.globalStateData.discussionData.${
                  (stageAndStep.curStep as RequestUserInputStageStep)
                    .saveResponseVariableName
                }`]: args.message,
              },
            }
          : {}),
      },
      { new: true }
    );
    room = updatedRoom.toObject();

    if (
      stageAndStep.curStep.stepType ===
      DiscussionStageStepType.REQUEST_USER_INPUT
    ) {
      console.log("we are in a request user input step");
      // check if we are ready to move on from an input step and continue processing.
      if (isRequestUserInputStepComplete(room.gameData, stageAndStep.curStep)) {
        console.log(
          "we are ready to move on from an input step and continue processing."
        );
        room.gameData = await processStepsUntilNextRequestUserInputStep(
          room.gameData,
          discussionStages,
          {
            serviceName: AiServiceNames.OPEN_AI,
            model: "gpt-4o-mini",
          },
          context.userId,
          args.sessionId
        );
      } else {
        console.log("we are not ready to move on from an input step");
      }
    }

    return await RoomModel.findOneAndUpdate(
      { _id: args.roomId },
      { $set: { gameData: room.gameData } },
      { new: true }
    );
  },
};

export default sendMessageToGameRoom;
