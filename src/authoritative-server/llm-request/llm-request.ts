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
import Validator, { Schema } from "jsonschema";
import { GenericLlmRequest, JobStatus } from "./types";
import { execHttp, extractErrorMessageFromError } from "./http-exec-helpers";
import {
  AiServicesJobStatusResponseTypes,
  AiServicesResponseTypes,
} from "./ai-services/ai-service-types";
import requireEnv from "../../utils/require-env";

export const LLM_API_ENDPOINT = requireEnv("LLM_API_ENDPOINT");
export const ABE_SECRET_HEADER_NAME = requireEnv("ABE_SECRET_HEADER_NAME");
export const ABE_SECRET_HEADER_VALUE = requireEnv("ABE_SECRET_HEADER_VALUE");
type OpenAiJobId = string;
export async function asyncLlmRequest(
  llmRequest: GenericLlmRequest
): Promise<OpenAiJobId> {
  const res = await execHttp<OpenAiJobId>(
    "POST",
    `${LLM_API_ENDPOINT}/generic_llm_request/?api-version=2025-03-01-preview`,
    {
      dataPath: ["response", "jobId"],
      axiosConfig: {
        data: {
          llmRequest,
        },
        headers: {
          [ABE_SECRET_HEADER_NAME]: ABE_SECRET_HEADER_VALUE,
        },
      },
    }
  );
  console.log("res from start request");
  console.log(res);
  return res;
}

export async function asyncLlmRequestStatus(
  jobId: string
): Promise<AiServicesJobStatusResponseTypes> {
  let res: AiServicesJobStatusResponseTypes;
  do {
    try {
      res = await execHttp<AiServicesJobStatusResponseTypes>(
        "POST",
        `${LLM_API_ENDPOINT}/generic_llm_request_status/?jobId=${jobId}&api-version=2025-03-01-preview`,
        {
          dataPath: ["response"],
          axiosConfig: {
            headers: {
              [ABE_SECRET_HEADER_NAME]: ABE_SECRET_HEADER_VALUE,
            },
          },
        }
      );
      console.log("res from status request");
      console.log(res);
    } catch (e) {
      console.error(
        "Error during job status polling:",
        extractErrorMessageFromError(e)
      );
      throw e;
    }

    // Wait 2 seconds before polling again if the job is still in progress.
    if (res.jobStatus === "IN_PROGRESS") {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  } while (res.jobStatus === "IN_PROGRESS");

  return res;
}

export async function syncLlmRequest(
  llmRequest: GenericLlmRequest
): Promise<AiServicesResponseTypes> {
  const openAiJobId = await asyncLlmRequest(llmRequest);
  const pollFunction = () => {
    return asyncLlmRequestStatus(openAiJobId);
  };
  const res = await pollUntilTrue<AiServicesJobStatusResponseTypes>(
    pollFunction,
    (res: AiServicesJobStatusResponseTypes) => {
      if (res.jobStatus === JobStatus.FAILED) {
        throw new Error(`LLM request failed: ${res.apiError}`);
      }
      return res.jobStatus === JobStatus.COMPLETE;
    },
    1000,
    180 * 1000
  );
  return res.aiServiceResponse;
}

export function pollUntilTrue<T>(
  pollFunction: () => Promise<T>,
  endPollCondition: (res: T) => boolean,
  interval: number,
  timeout = 0
) {
  const startTime = Date.now();

  const pollEndpoint = async (): Promise<T> => {
    const data: T = await pollFunction();
    if (endPollCondition(data)) {
      return data;
    }

    if (timeout && Date.now() - startTime > timeout) {
      throw new Error("Polling timed out");
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
    return pollEndpoint();
  };

  return pollEndpoint();
}

export async function jsonLlmRequest<T>(
  llmRequest: GenericLlmRequest,
  jsonSchema: Schema
): Promise<T> {
  const res = await syncLlmRequest(llmRequest);
  const v = new Validator.Validator();
  const resJson: T = JSON.parse(res.answer);
  const validationResult = v.validate(resJson, jsonSchema);
  if (validationResult.errors.length > 0) {
    throw new Error(
      `Response does not match expected schema: ${JSON.stringify(
        validationResult.errors
      )}`
    );
  }
  return resJson;
}
