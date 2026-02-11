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
  ResponseCreateParamsNonStreaming,
  Response,
} from "openai/resources/responses/responses";
import {
  AiResponseType,
  AiJobStatusType,
  AiStepData,
  AiServiceStepDataTypes,
} from "./ai-service-types";

// The typing for params sent to open ai and the response received
export type OpenAiReqType = ResponseCreateParamsNonStreaming;
export type OpenAiResType = Response;

// The data sent to/received from the AI service, unprocessed
export type OpenAiStepDataType = AiStepData<OpenAiReqType, OpenAiResType>;

// The data received from our API, processed
export type OpenAiServiceResponse = AiResponseType<OpenAiStepDataType>;

export type OpenAiServiceJobStatusResponseType =
  AiJobStatusType<OpenAiServiceResponse>;

export function isOpenAiData(
  stepData: AiServiceStepDataTypes
): stepData is OpenAiStepDataType {
  return "output_text" in stepData.aiServiceResponse;
}
