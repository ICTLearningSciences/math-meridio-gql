/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import {
  CurrentStage,
  IStage,
} from "../../schemas/models/DiscussionStage/types";
export enum PromptOutputTypes {
  TEXT = "TEXT",
  JSON = "JSON",
}

export interface TargetAiModelServiceType {
  serviceName: string;
  model: string;
}

export enum PromptRoles {
  SYSTEM = "system",
  USER = "user",
  ASSISSANT = "assistant",
}

export interface PromptConfiguration {
  promptText: string;
  promptRole?: PromptRoles;
}

export interface GenericLlmRequest {
  prompts: PromptConfiguration[];
  targetAiServiceModel: TargetAiModelServiceType;
  outputDataType: PromptOutputTypes;
  systemRole?: string;
  responseFormat?: string;
}

export enum JobStatus {
  QUEUED = "QUEUED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETE = "COMPLETE",
  FAILED = "FAILED",
}

export enum LoadStatus {
  NONE = 0,
  IN_PROGRESS = 1,
  DONE = 2,
  FAILED = 3,
  NOT_LOGGED_IN = 4,
}

export interface LoadingState {
  status: LoadStatus;
  error?: string;
  startedAt?: string;
  endedAt?: string;
  failedAt?: string;
}

export enum AiServiceNames {
  AZURE = "AZURE_OPEN_AI",
  OPEN_AI = "OPEN_AI",
  CAMO_GPT = "CAMO_GPT",
  ASK_SAGE = "ASK_SAGE",
  GEMINI = "GEMINI",
  ANTHROPIC = "ANTHROPIC",
}

export interface ServiceModelInfo {
  name: string;
  maxTokens: number;
  supportsWebSearch: boolean;
  onlyAdminUse?: boolean;
  disabled?: boolean;
}

export type AiServiceModelConfigs = {
  serviceName: AiServiceNames;
  modelList: ServiceModelInfo[];
};

export interface Connection<T> {
  edges: Edge<T>[];
  pageInfo: PageInfo;
}

export interface Edge<T> {
  cursor: string;
  node: T;
}

export interface PageInfo {
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  startCursor: string;
  endCursor: string;
}

export enum RoomActionType {
  SEND_MESSAGE = "SEND_MESSAGE",
  LEAVE_ROOM = "LEAVE_ROOM",
  JOIN_ROOM = "JOIN_ROOM",
  UPDATE_ROOM = "UPDATE_ROOM",
  VIEW_SIMULATION = "VIEW_SIMULATION",
}

export enum MessageDisplayType {
  TEXT = "TEXT",
  PENDING_MESSAGE = "PENDING_MESSAGE",
}

export enum SenderType {
  PLAYER = "PLAYER",
  SYSTEM = "SYSTEM",
}

export enum JsonResponseDataType {
  STRING = "string",
  OBJECT = "object",
  ARRAY = "array",
}

export interface JsonResponseData {
  clientId: string;
  name: string;
  type: JsonResponseDataType;
  isRequired: boolean;
  additionalInfo?: string;
  subData?: JsonResponseData[];
}
export abstract class AbstractGameData {
  abstract id: string;
  abstract name: string;
  abstract stageList: CurrentStage<IStage>[];
  abstract persistTruthGlobalStateData: string[];
}

export interface SimulationStage extends IStage {
  _id: string;
  stageType: "simulation";
}
