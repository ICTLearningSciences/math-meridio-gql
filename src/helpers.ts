/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import Ajv from "ajv";
const ajv = new Ajv();
import * as dotenv from "dotenv";
import { Request } from "express";
import mongoose from "mongoose";
dotenv.config();
import jwt from "jsonwebtoken";
import { PlayerComputedState } from "./schemas/types/types";
import { PlayerStatusData } from "./schemas/types/types";
import { Class } from "./schemas/models/classes/Class";
import { getGameById } from "./authoritative-server/games/game-helpers";
import {
  DiscussionStage,
  DiscussionStageStepType,
  isDiscussionStage,
  RequestUserInputStageStep,
  StartOfPhaseStep,
} from "./schemas/models/DiscussionStage/types";
import { AbstractGameData } from "./authoritative-server/llm-request/types";
import StudentSubmissionLogModel, {
  StudentSubmissionLog,
} from "./schemas/models/StudentSubmissionLog";
import { ChatMessage, Room } from "./schemas/models/Room";
import {
  LearningObjective,
  LearningObjectiveDocument,
} from "./schemas/models/LearningObjective";

const queryPayloadSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    query: {
      type: "string",
      maxLength: 2000,
    },
    variables: {
      type: "null",
    },
  },
};

// eslint-disable-next-line   @typescript-eslint/no-explicit-any
export function verifyQueryPayload(req: any, res: any) {
  validateJson(req, res, queryPayloadSchema);
}

// eslint-disable-next-line   @typescript-eslint/no-explicit-any
export function validateJson(req: any, res: any, schema: any) {
  const body = req.body;
  if (!body) {
    return res.status(400).send({ error: "Expected Body" });
  }
  const validate = ajv.compile(schema);
  const valid = validate(body);
  if (!valid) {
    console.log(validate.errors);
    throw new Error(`invalid request`);
  }
}

// check if id is a valid ObjectID:
//  - if valid, return it
//  - if invalid, create a valid object id
export function idOrNew(id: string): string {
  if (!Boolean(id)) {
    return `${new mongoose.Types.ObjectId()}`;
  }
  return isId(id) ? id : `${new mongoose.Types.ObjectId()}`;
}

export function isId(id: string): boolean {
  return Boolean(id.match(/^[0-9a-fA-F]{24}$/));
}

export interface JwtData {
  userId: string;
  userRole: string;
  userEducationalRole: string;
  userEmail: string;
}

export async function getDataFromRequest(
  req: Request
): Promise<JwtData | undefined> {
  try {
    const splitAuthHeader = req.headers.authorization?.split(" ");
    if (
      splitAuthHeader.length === 2 &&
      splitAuthHeader[0].toLowerCase() === "bearer"
    ) {
      const token = req.headers.authorization?.split(" ")[1];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const decodedJwt: any = jwt.verify(token, process.env.JWT_SECRET);
      return {
        userId: decodedJwt.id,
        userRole: decodedJwt.userRole,
        userEducationalRole: decodedJwt.educationalRole,
        userEmail: decodedJwt.email,
      };
    }
    return undefined;
  } catch (err) {
    return undefined;
  }
}

export const PLAYER_INACTIVE_THRESHOLD_MS = 30000;

export function getPlayerComputedState(
  playerStatus: PlayerStatusData
): PlayerComputedState {
  if (playerStatus.lastHeartbeatAt === undefined) {
    return PlayerComputedState.NEVER_ACCESSED_ACTIVITY;
  }
  if (playerStatus.pausedByAdmin) {
    return PlayerComputedState.PAUSED_BY_ADMIN;
  }
  if (playerStatus.reportedAwayStatus.isAway) {
    if (playerStatus.reportedAwayStatus.reportedBy === "STUDENT") {
      return PlayerComputedState.REPORTED_AWAY_BY_OTHER_PLAYER;
    } else if (
      playerStatus.reportedAwayStatus.reportedBy === "FRONTEND_SYSTEM"
    ) {
      return PlayerComputedState.REPORTED_AWAY_BY_FRONTEND_DETECTION;
    }
  }
  const now = new Date();
  const timeSinceLastHeartbeat =
    now.getTime() - playerStatus.lastHeartbeatAt.getTime();
  if (timeSinceLastHeartbeat > PLAYER_INACTIVE_THRESHOLD_MS) {
    return PlayerComputedState.INACTIVE;
  }
  return PlayerComputedState.ACTIVE;
}

export function canModifyClassroom(userId: string, classroom: Class): boolean {
  return (
    classroom.teacherId === userId ||
    classroom.sharedWithInstructorIds.includes(userId)
  );
}

export function getAllStartingPhasesFromGame(
  game: AbstractGameData
): StartOfPhaseStep[] {
  try {
    const allDiscussionStages: DiscussionStage[] = game.stageList
      .map((s) => s.stage)
      .filter((s) => isDiscussionStage(s)) as any[];
    const allDiscussionSteps = allDiscussionStages
      .flatMap((stage) => stage.flowsList)
      .flatMap((flowItem) => flowItem.steps);
    const allStartOfPhaseSteps: StartOfPhaseStep[] = allDiscussionSteps.filter(
      (step) => step.stepType === DiscussionStageStepType.START_OF_PHASE
    ) as StartOfPhaseStep[];
    return allStartOfPhaseSteps;
  } catch (error) {
    console.error("error", error);
    return [];
  }
}

export function getStartingPhasesInOrderForGame(
  gameId: string,
  discussionStages: DiscussionStage[]
): string[] {
  const game = getGameById(gameId, discussionStages);
  const allDiscussionStages: DiscussionStage[] = game.stageList
    .map((s) => s.stage)
    .filter((s) => isDiscussionStage(s)) as any[];
  const allDiscussionSteps = allDiscussionStages
    .flatMap((stage) => stage.flowsList)
    .flatMap((flowItem) => flowItem.steps);
  const allStartOfPhaseSteps = allDiscussionSteps.filter(
    (step) => step.stepType === DiscussionStageStepType.START_OF_PHASE
  );
  return allStartOfPhaseSteps.map((step) => step.stepId);
}

export function getAllStartingPhasesFromAllDiscussionStages(
  discussionStages: DiscussionStage[]
): StartOfPhaseStep[] {
  const allStartingPhases = discussionStages
    .flatMap((stage) => stage.flowsList)
    .flatMap((flowItem) => flowItem.steps)
    .filter((step) => step.stepType === DiscussionStageStepType.START_OF_PHASE);
  return allStartingPhases as StartOfPhaseStep[];
}

export function findStartingPhaseStepByPhaseStepId(
  phaseStepId: string,
  discussionStages: DiscussionStage[]
): StartOfPhaseStep | null {
  const allStartingPhases =
    getAllStartingPhasesFromAllDiscussionStages(discussionStages);
  const startingPhaseStep = allStartingPhases.find(
    (step) => step.stepId === phaseStepId
  );
  return startingPhaseStep || null;
}

export function findRequestUserInputStepByStepId(
  stepId: string,
  discussionStages: DiscussionStage[]
): RequestUserInputStageStep | null {
  const allRequestUserInputSteps = discussionStages
    .flatMap((stage) => stage.flowsList)
    .flatMap((flowItem) => flowItem.steps)
    .filter(
      (step) => step.stepType === DiscussionStageStepType.REQUEST_USER_INPUT
    ) as RequestUserInputStageStep[];
  const requestUserInputStep = allRequestUserInputSteps.find(
    (step) => step.stepId === stepId
  );
  return requestUserInputStep || null;
}

export async function initializeStudentSubmissionLog(
  senderStudentId: string,
  message: string,
  room: Room,
  _discussionStages: DiscussionStage[],
  allLearningObjectives: LearningObjectiveDocument[]
): Promise<StudentSubmissionLog | null> {
  const game = getGameById(room.gameData.gameId, _discussionStages);
  const discussionStages = game.stageList
    .map((s) => s.stage)
    .filter((s) => isDiscussionStage(s)) as DiscussionStage[];
  const allLearningObjectivesMap = allLearningObjectives.reduce(
    (acc, objective) => {
      acc[objective._id] = objective;
      return acc;
    },
    {} as Record<string, LearningObjective>
  );
  const userId = senderStudentId;
  const roomId = room._id;
  const roundNumber = room.gameData.curGameState.curRoundNumber;
  const phaseStepId = room.gameData.phaseProgression.curPhaseStepId;

  const startingPhaseStep = findStartingPhaseStepByPhaseStepId(
    phaseStepId,
    discussionStages
  );
  if (!startingPhaseStep) {
    console.error(
      "Starting phase step not found when trying to initialize student submission log"
    );
    return null;
  }

  const phaseLearningObjectives = startingPhaseStep.learningObjectives
    .map((objectiveId) => allLearningObjectivesMap[objectiveId])
    .filter((objective) => objective !== undefined);
  // We know we are currently in a request user input step, so we can get the request user input step id from the global state data
  const requestUserInputStepId = room.gameData.globalStateData.curStepId;

  const chatLogCopy: ChatMessage[] = JSON.parse(
    JSON.stringify(room.gameData.chat)
  );
  const mostRecentRequestUserInputMessage = chatLogCopy
    .reverse()
    .find(
      (msg: ChatMessage) =>
        msg.fromStepType === DiscussionStageStepType.REQUEST_USER_INPUT
    );
  const requestUserInputStep = findRequestUserInputStepByStepId(
    requestUserInputStepId,
    discussionStages
  );
  if (!requestUserInputStep) {
    console.error(
      "Request user input step not found when trying to initialize student submission log"
    );
    return null;
  }

  const systemMessage = mostRecentRequestUserInputMessage?.message;
  const studentResponse = message;
  const expectedLearningObjectives: LearningObjective[] =
    requestUserInputStep.learningObjectives
      .map((objectiveId) => allLearningObjectivesMap[objectiveId])
      .filter((objective) => objective !== undefined);
  const submissionData = {
    userId,
    roomId,
    roundNumber: roundNumber || 0,
    phaseStepId,
    phaseLearningObjectives,
    requestUserInputStepId,
    systemMessage,
    studentResponse,
    expectedLearningObjectives,
    studentCoveredLearningObjectives: [] as string[],
  };
  console.log("submission data", JSON.stringify(submissionData, null, 2));
  return StudentSubmissionLogModel.create(submissionData);
}
