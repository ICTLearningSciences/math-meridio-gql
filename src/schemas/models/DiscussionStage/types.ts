/*

*/
/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

export interface IStage {
  stageType: "discussion" | "simulation";
}

export interface FlowItem {
  clientId: string;
  name: string;
  steps: (
    | SystemMessageStageStep
    | RequestUserInputStageStep
    | PromptStageStep
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

export enum DiscussionStageStepType {
  SYSTEM_MESSAGE = "SYSTEM_MESSAGE",
  REQUEST_USER_INPUT = "REQUEST_USER_INPUT",
  PROMPT = "PROMPT",
}

export interface StageBuilderStep {
  stepId: string;
  stepType: DiscussionStageStepType;
  jumpToStepId?: string;
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
}

//Prompt
export enum JsonResponseDataType {
  STRING = "string",
  OBJECT = "object",
  ARRAY = "array",
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
