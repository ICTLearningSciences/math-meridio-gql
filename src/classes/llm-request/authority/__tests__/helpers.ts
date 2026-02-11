/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
/// <reference types="jest" />
import { Player, PlayerDocument } from "../../../../schemas/models/Player";
import {
  LoginService,
  EducationalRole,
} from "../../../../schemas/models/Player";
import { GameData } from "../../../../schemas/models/Room";
import {
  Checking,
  ConditionalActivityStep,
  DiscussionStageStepType,
  DiscussionStageStep,
  DiscussionStage,
  SystemMessageStageStep,
  RequestUserInputStageStep,
  PromptStageStep,
  NumericOperations,
  LogicStepConditional,
} from "../../../../schemas/models/DiscussionStage/types";
import { DiscussionCurrentStage } from "../../../../schemas/models/DiscussionStage/types";
import { UserRole } from "../../../../schemas/types/types";
import { PromptOutputTypes } from "../../../../classes/llm-request/types";
import * as crypto from "node:crypto";

export function createMockPlayer(id: string, name: string): PlayerDocument {
  return {
    _id: id,
    name,
    googleId: id,
    description: "",
    avatar: [],
    email: `${id}@example.com`,
    userRole: UserRole.USER,
    loginService: LoginService.GOOGLE,
    lastLoginAt: new Date(),
    educationalRole: EducationalRole.STUDENT,
    clientId: id,
  } as any as PlayerDocument;
}

export function createBaseGameData(): GameData {
  return {
    persistTruthGlobalStateData: [],
    chat: [],
    players: [
      createMockPlayer("player1", "Player 1")._id,
      createMockPlayer("player2", "Player 2")._id,
    ],
    gameId: "basketball",
    playerStateData: [
      {
        player: "player1",
        animation: "",
        gameStateData: [],
      },
      {
        player: "player2",
        animation: "",
        gameStateData: [],
      },
    ],
    globalStateData: {
      curStageId: "stage1",
      roomOwnerId: "test-room-owner-id",
      discussionDataStringified: "",
      curStepId: "step1",
      gameStateData: [],
    },
  };
}

// Builder for SystemMessageStageStep
export function createSystemMessageStep(
  stepId: string,
  options: Partial<SystemMessageStageStep> = {}
): SystemMessageStageStep {
  return {
    stepId,
    stepType: DiscussionStageStepType.SYSTEM_MESSAGE,
    message: options.message || "System message",
    lastStep: options.lastStep || false,
    jumpToStepId: options.jumpToStepId || "",
  };
}

// Builder for RequestUserInputStageStep
export function createRequestUserInputStep(
  stepId: string,
  options: Partial<RequestUserInputStageStep> = {}
): RequestUserInputStageStep {
  return {
    stepId,
    stepType: DiscussionStageStepType.REQUEST_USER_INPUT,
    message: options.message || "Enter your response",
    saveResponseVariableName: options.saveResponseVariableName || "",
    disableFreeInput: options.disableFreeInput || false,
    predefinedResponses: options.predefinedResponses || [],
    requireAllUserInputs: options.requireAllUserInputs || false,
    lastStep: options.lastStep || false,
    jumpToStepId: options.jumpToStepId || "",
  };
}

// Builder for PromptStageStep
export function createPromptStep(
  stepId: string,
  options: Partial<PromptStageStep> = {}
): PromptStageStep {
  return {
    stepId,
    stepType: DiscussionStageStepType.PROMPT,
    promptText: options.promptText || "Prompt text",
    responseFormat: options.responseFormat || "text",
    includeChatLogContext: options.includeChatLogContext || false,
    outputDataType: options.outputDataType || PromptOutputTypes.TEXT,
    customSystemRole: options.customSystemRole || "",
    lastStep: options.lastStep || false,
    jumpToStepId: options.jumpToStepId || "",
    jsonResponseData: options.jsonResponseData || "",
  };
}

// Builder for ConditionalActivityStep
export function createConditionalStep(
  stepId: string,
  conditionals: LogicStepConditional[],
  options: Partial<ConditionalActivityStep> = {}
): ConditionalActivityStep {
  return {
    stepId,
    stepType: DiscussionStageStepType.CONDITIONAL,
    conditionals,
    lastStep: options.lastStep || false,
    jumpToStepId: options.jumpToStepId || "",
  };
}

// Helper to create a conditional
export function createConditional(
  stateDataKey: string,
  checking: Checking,
  operation: NumericOperations,
  expectedValue: string,
  targetStepId: string
): LogicStepConditional {
  return {
    stateDataKey,
    checking,
    operation,
    expectedValue,
    targetStepId,
  };
}

// Helper to create a mock stage with flows
export function createMockDiscussionStage(
  flows: { name: string; steps: DiscussionStageStep[] }[]
): DiscussionStage {
  return {
    _id: crypto.randomUUID(),
    title: "Test Stage",
    description: "Test Description",
    stageType: "discussion",
    clientId: crypto.randomUUID(),
    flowsList: flows.map((flow) => ({
      clientId: flow.name,
      name: flow.name,
      steps: flow.steps,
    })),
  };
}

// Helper to create a mock DiscussionCurrentStage
export function createMockCurrentStage(
  stage: DiscussionStage,
  nextStage?: DiscussionStage
): DiscussionCurrentStage {
  const tempNextStage =
    nextStage ||
    createMockDiscussionStage([
      { name: "Next Flow", steps: [createSystemMessageStep("step-1")] },
    ]);
  return {
    id: "stage-id",
    stage,
    getNextStage: jest.fn(() => tempNextStage),
  };
}
