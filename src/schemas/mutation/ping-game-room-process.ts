/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { GraphQLObjectType, GraphQLString } from "graphql";
import { RoomDocument, RoomPhase, RoomType } from "../models/Room";
import RoomModel from "../../schemas/models/Room";
import {
  isDiscussionStage as _isDiscussionStage,
  EndOfPhaseReflectionStep,
  RequestUserInputStageStep,
} from "../../schemas/models/DiscussionStage/types";
import { DiscussionStageStepType } from "../../schemas/models/DiscussionStage/types";
import {
  acquireProcessingLock,
  updateRoomPlayerStatusedRecord,
} from "../../authoritative-server/authority/helpers/helpers";
import {
  requestUserInputStageStatus as _isRequestUserInputStepComplete,
  isSimulationStageComplete as _isSimulationStageComplete,
  endOfPhaseReflectionStepStatus as _endOfPhaseReflectionStepStatus,
  transitionToEndOfPhaseReflectionState,
} from "../../authoritative-server/authority/step-process-pure-functions";
import { processStepsUntilNextStallingPhase } from "../../authoritative-server/authority/step-process-pure-functions";
import { AiServiceNames } from "../../authoritative-server/llm-request/types";
import DiscussionStageModel from "../../schemas/models/DiscussionStage/DiscussionStage";
import GamePhaseReflectionsModel from "../../schemas/models/GamePhaseReflections";
import { getCurStageAndStep } from "../../authoritative-server/authority/user-action-pure-functions";
import { WAIT_FOR_SIMULATION_STAGE_CLIENT_ID } from "../../authoritative-server/games/game-helpers";
import { PlayerComputedState } from "../../schemas/types/types";
import { EducationalRole } from "../../schemas/models/Player";
import { updatePlayersHeartbeat } from "../../authoritative-server/authority/step-process-pure-functions";
import { getStartingPhasesInOrderForGame } from "../../helpers";
import PlayerModel from "../../schemas/models/Player";

export const pingGameRoomProcess = {
  type: RoomType,
  args: {
    roomId: { type: GraphQLString },
    sessionId: { type: GraphQLString },
  },
  resolve: async (
    _root: GraphQLObjectType,
    args: {
      roomId: string;
      sessionId: string;
    },
    context: {
      userId: string;
      userEducationalRole: EducationalRole;
    }
  ): Promise<RoomDocument> => {
    try {
      const { roomId, sessionId } = args;
      let room: RoomDocument | null = await updatePlayersHeartbeat(
        roomId,
        context.userId
      );
      if (room.gameData.players.length === 0) {
        return room;
      }
      room = await updateRoomPlayerStatusedRecord(
        room,
        context.userId,
        RoomModel
      );
      const activePlayers = Object.entries(
        room.gameData.playersStatusRecord
      ).filter(
        ([_, playerStatus]) =>
          playerStatus.computedState === PlayerComputedState.ACTIVE
      );
      if (activePlayers.length === 0) {
        return room;
      }

      const activePlayerDocuments = (
        await PlayerModel.find({
          _id: { $in: activePlayers.map(([playerId, _]) => playerId) },
        })
      ).map((player) => player.toObject());

      if (!room.gameData.gameId) {
        return room;
      }

      const _discussionStages = await DiscussionStageModel.find();
      const discussionStages = _discussionStages.map((stage) =>
        stage.toObject()
      );

      if (
        !room.gameData.phaseProgression.startingPhaseStepsOrdered.length &&
        room.gameData.gameId
      ) {
        const startingPhases = getStartingPhasesInOrderForGame(
          room.gameData.gameId,
          discussionStages
        );
        room = await RoomModel.findOneAndUpdate(
          { _id: args.roomId },
          {
            $set: {
              "gameData.phaseProgression.startingPhaseStepsOrdered":
                startingPhases,
            },
          },
          { new: true }
        );
        if (!room) throw new Error("invalid room");
      }

      let stageAndStep = getCurStageAndStep(room.gameData, discussionStages);
      let _stepRoundGamePhaseReflections =
        await GamePhaseReflectionsModel.findOne({
          roomId: roomId,
          stepId: stageAndStep.curStep?.stepId,
          roundNumber: room.gameData.curGameState.curRoundNumber,
        });
      let stepRoundGamePhaseReflections =
        _stepRoundGamePhaseReflections?.toObject();
      if (!stepRoundGamePhaseReflections)
        throw new Error("invalid game phase reflections");
      let isDiscussionStage = _isDiscussionStage(stageAndStep.curStage);
      let isRequestUserInputStep =
        isDiscussionStage &&
        stageAndStep.curStep?.stepType ===
          DiscussionStageStepType.REQUEST_USER_INPUT;
      let requestUserInputStageStatus = isRequestUserInputStep
        ? _isRequestUserInputStepComplete(
            room.gameData,
            stageAndStep.curStep as RequestUserInputStageStep
          )
        : undefined;
      let isSimulationStage =
        stageAndStep.curStage.clientId === WAIT_FOR_SIMULATION_STAGE_CLIENT_ID;
      let isSimulationStageComplete =
        isSimulationStage && _isSimulationStageComplete(room.gameData);
      let roomIsProcessing = room.phase === RoomPhase.PROCESSING;

      let isEndOfPhaseReflectionStep =
        isDiscussionStage &&
        stageAndStep.curStep?.stepType ===
          DiscussionStageStepType.END_OF_PHASE_REFLECTION &&
        room.gameData.curGameState.curState === "END_OF_PHASE_REFLECTION";
      let endOfPhaseReflectionStepStatus = isEndOfPhaseReflectionStep
        ? _endOfPhaseReflectionStepStatus(room, stepRoundGamePhaseReflections)
        : undefined;

      const isWaitingForEndOfPhaseReflectionReadyUp =
        isDiscussionStage &&
        stageAndStep.curStep?.stepType ===
          DiscussionStageStepType.END_OF_PHASE_REFLECTION &&
        room.gameData.curGameState.curState ===
          "WAITING_FOR_STUDENT_READY_TO_CONTINUE";
      const isEndOfPhaseReflectionReadyUpComplete = Boolean(
        room.gameData.curGameState.studentReadyToContinue
      );

      const isCompleteRequestUserInputStep =
        isDiscussionStage &&
        isRequestUserInputStep &&
        requestUserInputStageStatus?.isComplete;
      const isCompleteSimulationStage =
        isSimulationStage && isSimulationStageComplete;
      const isCompleteEndOfPhaseReflectionStep =
        isEndOfPhaseReflectionStep &&
        endOfPhaseReflectionStepStatus?.isComplete;
      const isCompleteEndOfPhaseReflectionReadyUp =
        isWaitingForEndOfPhaseReflectionReadyUp &&
        isEndOfPhaseReflectionReadyUpComplete;

      // Transition from end of phase reflection step to waiting for student ready to continue
      if (isCompleteEndOfPhaseReflectionStep) {
        room = await RoomModel.findOneAndUpdate(
          { _id: args.roomId },
          {
            $set: {
              "gameData.curGameState.curState":
                "WAITING_FOR_STUDENT_READY_TO_CONTINUE",
              "gameData.curGameState.studentReadyToContinue": false,
              "gameData.curGameState.studentReflections":
                endOfPhaseReflectionStepStatus?.studentReflections,
            },
          },
          { new: true }
        );
      } else if (
        (isCompleteRequestUserInputStep ||
          isCompleteSimulationStage ||
          isCompleteEndOfPhaseReflectionReadyUp) &&
        !roomIsProcessing
      ) {
        const lockResult = await acquireProcessingLock(
          args.roomId,
          room.versionNumber,
          RoomModel
        );
        if (!lockResult.success) {
          return lockResult.room || room;
        }
        room = lockResult.room;
        if (!room) throw new Error("invalid room");
        // check if we are ready to move on from the current step and continue processing.
        room = await processStepsUntilNextStallingPhase(
          room,
          discussionStages,
          {
            serviceName: AiServiceNames.OPEN_AI,
            model: "gpt-4o-mini",
          },
          room.gameData.globalStateData.roomOwnerId,
          sessionId,
          activePlayerDocuments
        );
        room = await RoomModel.findOneAndUpdate(
          { _id: args.roomId },
          {
            $set: {
              gameData: room.gameData,
              phase: RoomPhase.NO_ACTIVE_PROCESSING,
            },
            $inc: {
              versionNumber: 1,
            },
          },
          { new: true }
        );
      }

      if (!room) throw new Error("invalid room");
      // After some processing occurred, re-check the rooms state and see if we need to update the rooms curGameState
      stageAndStep = getCurStageAndStep(room.gameData, discussionStages);
      isDiscussionStage = _isDiscussionStage(stageAndStep.curStage);
      isRequestUserInputStep =
        isDiscussionStage &&
        stageAndStep.curStep?.stepType ===
          DiscussionStageStepType.REQUEST_USER_INPUT;
      requestUserInputStageStatus = isRequestUserInputStep
        ? _isRequestUserInputStepComplete(
            room.gameData,
            stageAndStep.curStep as RequestUserInputStageStep
          )
        : undefined;
      isSimulationStage =
        stageAndStep.curStage.clientId === WAIT_FOR_SIMULATION_STAGE_CLIENT_ID;
      isSimulationStageComplete =
        isSimulationStage && _isSimulationStageComplete(room.gameData);
      roomIsProcessing = room.phase === RoomPhase.PROCESSING;

      isEndOfPhaseReflectionStep =
        isDiscussionStage &&
        stageAndStep.curStep?.stepType ===
          DiscussionStageStepType.END_OF_PHASE_REFLECTION;
      _stepRoundGamePhaseReflections = await GamePhaseReflectionsModel.findOne({
        roomId: roomId,
        stepId: stageAndStep.curStep?.stepId,
        roundNumber: room.gameData.curGameState.curRoundNumber,
      });
      stepRoundGamePhaseReflections =
        _stepRoundGamePhaseReflections?.toObject();
      if (!stepRoundGamePhaseReflections)
        throw new Error("invalid game phase reflection");
      endOfPhaseReflectionStepStatus = isEndOfPhaseReflectionStep
        ? _endOfPhaseReflectionStepStatus(room, stepRoundGamePhaseReflections)
        : undefined;

      // if we are now in a request user input step and it is not complete, check the status of the request user input step.
      if (isRequestUserInputStep && !requestUserInputStageStatus?.isComplete) {
        const newGameState = (stageAndStep.curStep as RequestUserInputStageStep)
          .requireInputType;

        room = await RoomModel.findOneAndUpdate(
          { _id: args.roomId },
          {
            $set: {
              "gameData.curGameState": {
                curState: newGameState,
                playersLeftToRespond:
                  requestUserInputStageStatus?.playersLeftToRespond || [],
              },
            },
          },
          { new: true }
        );
      }

      if (!room) throw new Error("invalid room");
      // if we are now in a game phase reflection state and it is not complete, check and update the status of the request user input step
      if (
        isEndOfPhaseReflectionStep &&
        !endOfPhaseReflectionStepStatus?.isComplete &&
        room?.gameData.curGameState.curState !==
          "WAITING_FOR_STUDENT_READY_TO_CONTINUE"
      ) {
        if (
          room?.gameData.curGameState.curState !== "END_OF_PHASE_REFLECTION"
        ) {
          const numStepGamePhaseReflections =
            await GamePhaseReflectionsModel.countDocuments({
              roomId: roomId,
              stepId: stageAndStep.curStep?.stepId,
            });
          room = await transitionToEndOfPhaseReflectionState(
            room,
            stageAndStep.curStep as EndOfPhaseReflectionStep,
            numStepGamePhaseReflections
          );
        } else {
          // We are in an incomplete end of phase reflection step, so we need to apply the endOfPhaseReflectionStepStatus to the room.
          room = await RoomModel.findOneAndUpdate(
            { _id: args.roomId },
            {
              $set: {
                "gameData.curGameState.curState": "END_OF_PHASE_REFLECTION",
                "gameData.curGameState.playersLeftToRespond":
                  endOfPhaseReflectionStepStatus?.playersLeftToRespond,
                "gameData.curGameState.studentReflections":
                  endOfPhaseReflectionStepStatus?.studentReflections,
              },
            },
            { new: true }
          );
        }
      }
      if (!room) throw new Error("invalid room");
      return room;
    } catch (error) {
      console.error("Error pinging game room: ", error);
      throw error;
    }
  },
};

export default pingGameRoomProcess;
