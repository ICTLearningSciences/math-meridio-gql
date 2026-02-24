/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import {
  AbstractGameData,
  MathStandardsCompletionRequirements,
} from "../llm-request/types";

import {
  CurrentStage,
  DiscussionStage,
  IStage,
} from "../../schemas/models/DiscussionStage/types";

export const REQUEST_USER_INPUT_DISCUSSION_CLIENT_ID =
  "test-request-user-input-discussion-client-id";
export const PROMPT_DISCUSSION_CLIENT_ID = "test-prompt-discussion-client-id";
export const CONDITIONAL_DISCUSSION_CLIENT_ID =
  "test-conditional-discussion-client-id";

export const TEST_PERSIST_TRUTH_VARIABLE_KEY_1 =
  "test_persist_truth_variable_1";
export const TEST_PERSIST_TRUTH_VARIABLE_KEY_2 =
  "test_persist_truth_variable_2";

export class UnitTestGame extends AbstractGameData {
  id = "unit-test";
  name = "Unit Test";
  stageList: CurrentStage<IStage>[] = [];
  persistTruthGlobalStateData = [
    TEST_PERSIST_TRUTH_VARIABLE_KEY_1,
    TEST_PERSIST_TRUTH_VARIABLE_KEY_2,
  ];
  mathStandardsCompletedRequirements: MathStandardsCompletionRequirements = {};

  constructor(discussionStages: DiscussionStage[]) {
    super();
    const requestUserInputDiscussionStage = discussionStages.find(
      (s) => s.clientId === REQUEST_USER_INPUT_DISCUSSION_CLIENT_ID
    );
    const promptDiscussionStage = discussionStages.find(
      (s) => s.clientId === PROMPT_DISCUSSION_CLIENT_ID
    );

    const conditionalDiscussionStage = discussionStages.find(
      (s) => s.clientId === CONDITIONAL_DISCUSSION_CLIENT_ID
    );

    if (
      !requestUserInputDiscussionStage ||
      !promptDiscussionStage ||
      !conditionalDiscussionStage
    ) {
      throw new Error("missing discussion stage");
    }
    const stageList: CurrentStage<IStage>[] = [
      {
        id: "request-user-input-discussion",
        stage: requestUserInputDiscussionStage,
        getNextStage: () => {
          return promptDiscussionStage;
        },
      },
      {
        id: "prompt-discussion",
        stage: promptDiscussionStage,
        getNextStage: () => {
          return conditionalDiscussionStage;
        },
      },
      {
        id: "conditional-discussion",
        stage: conditionalDiscussionStage,
        getNextStage: () => {
          return requestUserInputDiscussionStage;
        },
      },
    ];
    this.stageList = stageList;
  }
}
