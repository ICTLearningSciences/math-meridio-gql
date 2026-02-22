/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import { RequireInputType } from "./objects";

export interface IStage {
  stageType: "discussion" | "simulation";
  clientId: string;
}

export function isDiscussionStage(stage: IStage): stage is DiscussionStage {
  return stage.stageType === "discussion";
}

export interface FlowItem {
  clientId: string;
  name: string;
  steps: (
    | SystemMessageStageStep
    | RequestUserInputStageStep
    | PromptStageStep
    | ConditionalActivityStep
    | EndOfPhaseReflectionStep
  )[];
}

export interface DiscussionStage extends IStage {
  _id: string;
  clientId: string;
  stageType: "discussion";
  title: string;
  description: string;
  flowsList: FlowItem[];
}

export type DiscussionStageStep =
  | SystemMessageStageStep
  | RequestUserInputStageStep
  | PromptStageStep
  | ConditionalActivityStep
  | EndOfPhaseReflectionStep;

export enum DiscussionStageStepType {
  SYSTEM_MESSAGE = "SYSTEM_MESSAGE",
  REQUEST_USER_INPUT = "REQUEST_USER_INPUT",
  PROMPT = "PROMPT",
  CONDITIONAL = "CONDITIONAL",
  END_OF_PHASE_REFLECTION = "END_OF_PHASE_REFLECTION",
  NONE = "NONE",
}

export interface StageBuilderStep {
  stepId: string;
  stepType: DiscussionStageStepType;
  jumpToStepId?: string;
  lastStep: boolean;
}

export interface SystemMessageStageStep extends StageBuilderStep {
  stepType: DiscussionStageStepType.SYSTEM_MESSAGE;
  message: string;
}

// RequestUserInput
export interface PredefinedResponse {
  clientId: string;
  message: string;
  isArray?: boolean;
  jumpToStepId?: string;
  responseWeight?: string;
}

export interface RequestUserInputStageStep extends StageBuilderStep {
  stepType: DiscussionStageStepType.REQUEST_USER_INPUT;
  message: string;
  saveResponseVariableName: string;
  disableFreeInput: boolean;
  predefinedResponses: PredefinedResponse[];
  requireInputType: RequireInputType;
}

export interface PromptStageStep extends StageBuilderStep {
  stepType: DiscussionStageStepType.PROMPT;
  promptText: string;
  responseFormat: string;
  includeChatLogContext: boolean;
  outputDataType: string;
  jsonResponseData?: string;
  customSystemRole: string;
}
// LogicOperation
export enum NumericOperations {
  GREATER_THAN = ">",
  LESS_THAN = "<",
  EQUALS = "==",
  NOT_EQUALS = "!=",
  GREATER_THAN_EQUALS = ">=",
  LESS_THAN_EQUALS = "<=",
}

export enum Checking {
  // array or string
  LENGTH = "LENGTH",
  // string, boolean, number
  VALUE = "VALUE",
  // array or string
  CONTAINS = "CONTAINS",
}

export interface LogicStepConditional {
  stateDataKey: string;
  checking: Checking;
  operation: NumericOperations;
  expectedValue: string;
  targetStepId: string;
}

export interface ConditionalActivityStep extends StageBuilderStep {
  stepType: DiscussionStageStepType.CONDITIONAL;
  conditionals: LogicStepConditional[];
}

export interface EndOfPhaseReflectionStep extends StageBuilderStep {
  stepType: DiscussionStageStepType.END_OF_PHASE_REFLECTION;
  phaseTitle: string;
  message: string;
  questions: string[];
}

export type CollectedDiscussionData = Record<
  string,
  string | number | boolean | string[]
>;

export interface CurrentStage<T extends IStage> {
  id: string;
  stage: T;
  action?: () => void;
  beforeStart?: () => void;
  getNextStage: (collectedData: CollectedDiscussionData) => IStage;
}

export type DiscussionCurrentStage = CurrentStage<DiscussionStage>;
