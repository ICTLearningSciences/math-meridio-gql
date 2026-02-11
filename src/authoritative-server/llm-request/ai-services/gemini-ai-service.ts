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
import {
  FunctionCall,
  GenerateContentCandidate,
  PromptFeedback,
  StartChatParams,
  UsageMetadata,
} from "@google/generative-ai";
import {
  AiResponseType,
  AiJobStatusType,
  AiStepData,
  AiServiceStepDataTypes,
} from "./ai-service-types";
import { OpenAiServiceResponse } from "./open-ai-service";

export interface GeminiChatCompletionRequest {
  startChatParams: StartChatParams;
  model: string;
  requestText: string;
}

export interface GeminiJsonResponse {
  text: string;
  functionCalls?: FunctionCall[];
  candidates?: GenerateContentCandidate[];
  promptFeedback?: PromptFeedback;
  usageMetadata?: UsageMetadata;
}

export type GeminiReqType = GeminiChatCompletionRequest;
export type GeminiResType = GeminiJsonResponse;

export type GeminiStepDataType = AiStepData<GeminiReqType, GeminiResType>;
export type GeminiServiceResponse = AiResponseType<GeminiStepDataType>;

export interface GeminiChatCompletionRequest {
  startChatParams: StartChatParams;
  model: string;
  requestText: string;
}

export type GeminiAiServiceJobStatusResponseType =
  AiJobStatusType<OpenAiServiceResponse>;

export function isGeminiData(
  stepData: AiServiceStepDataTypes
): stepData is GeminiStepDataType {
  return "text" in stepData.aiServiceResponse;
}
