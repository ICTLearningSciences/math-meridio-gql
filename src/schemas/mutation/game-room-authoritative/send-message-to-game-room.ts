/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import { GraphQLString, GraphQLObjectType, GraphQLID } from "graphql";
import ClassModel from "../../models/classes/Class";
import RoomModel, { Room, RoomType } from "../../models/Room";
import PlayerModel, { EducationalRole } from "../../models/Player";
import { getCurStageAndStep } from "../../../authoritative-server/authority/user-action-pure-functions";
import DiscussionStageModel from "../../models/DiscussionStage/DiscussionStage";
import {
  DiscussionStageStepType,
  isDiscussionStage,
  RequestUserInputStageStep,
} from "../../models/DiscussionStage/types";
import { buildUserMessage } from "../../../authoritative-server/authority/state-modifier-helpers";
import { updateNumWordsSentInPhases } from "../../../authoritative-server/authority/step-process-pure-functions";
import { initializeStudentSubmissionLog } from "../../../helpers";
import LearningObjectiveModel from "../../models/LearningObjective";

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
    const __room = await RoomModel.findOne({
      _id: args.roomId,
      deletedRoom: false,
    });
    if (!__room) throw new Error("Failed to find room");
    const myClass = await ClassModel.findOne({
      _id: __room.classId,
    });
    if (myClass?.archivedAt) {
      throw new Error("Classroom has been archived");
    }

    let room = await updateNumWordsSentInPhases(
      __room.toObject(),
      context.userId,
      args.message
    );
    const player = await PlayerModel.findOne({ _id: context.userId });
    if (!player) throw new Error("Unauthorized User");
    if (!room.gameData.players.includes(context.userId)) {
      if (player.educationalRole === EducationalRole.STUDENT) {
        throw new Error("User is not a player in the room");
      } else {
        const myClass = await ClassModel.findOne({
          _id: room.classId,
          $or: [
            { teacherId: context.userId },
            { sharedWithInstructorIds: context.userId },
          ],
        });
        if (!myClass) {
          throw new Error("User is not a teacher in the room");
        }
      }
    }
    const _discussionStages = await DiscussionStageModel.find();
    const discussionStages = _discussionStages.map((stage) => stage.toObject());
    const stageAndStep = getCurStageAndStep(room.gameData, discussionStages);

    const learningObjectives = await LearningObjectiveModel.find({});

    const shouldUpdateDiscussionData =
      isDiscussionStage(stageAndStep.curStage) &&
      stageAndStep.curStep?.stepType ===
        DiscussionStageStepType.REQUEST_USER_INPUT &&
      stageAndStep.curStep.saveResponseVariableName;

    try {
      if (room.gameData.phaseProgression.curPhaseStepId) {
        await initializeStudentSubmissionLog(
          context.userId,
          args.message,
          room,
          discussionStages,
          learningObjectives
        );
      }
    } catch (error) {
      console.error("Error initializing student submission log", error);
    }

    const phases = room.gameData?.phaseProgression?.phasesStarted || [];
    const phaseId = phases.length > 0 ? phases[phases.length - 1] : "";

    const updatedRoom = await RoomModel.findOneAndUpdate(
      { _id: args.roomId },
      {
        $inc: {
          versionNumber: 1,
        },
        $push: {
          "gameData.chat": buildUserMessage(
            args.message,
            context.userId,
            player.name,
            args.sessionId,
            phaseId
          ),
        },
        ...(shouldUpdateDiscussionData
          ? {
              $set: {
                [`gameData.globalStateData.discussionData.${
                  (stageAndStep.curStep as RequestUserInputStageStep)
                    .saveResponseVariableName
                }`]: args.message,
                [`gameData.playersGameStateData.${context.userId}.${
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

    return room;
  },
};

export default sendMessageToGameRoom;
