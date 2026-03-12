/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { AbstractGameData } from "../llm-request/types";

import {
  CurrentStage,
  DiscussionStage,
  IStage,
} from "../../schemas/models/DiscussionStage/types";

export const TEST_INCLUDE_MESSAGE_CONTEXT_DISCUSSION_CLIENT_ID =
  "test-include-message-context-discussion-client-id";

export class UnitTestChatContextGame extends AbstractGameData {
  id = "unit-test-chat-context";
  name = "Unit Test Chat Context";
  stageList: CurrentStage<IStage>[] = [];
  persistTruthGlobalStateData: string[] = [];

  constructor(discussionStages: DiscussionStage[]) {
    super();
    const includeMessageContextDiscussionStage = discussionStages.find(
      (s) => s.clientId === TEST_INCLUDE_MESSAGE_CONTEXT_DISCUSSION_CLIENT_ID
    );

    if (!includeMessageContextDiscussionStage) {
      throw new Error("missing discussion stage");
    }
    const stageList: CurrentStage<IStage>[] = [
      {
        id: "include-message-context-discussion",
        stage: includeMessageContextDiscussionStage,
        getNextStage: () => {
          return includeMessageContextDiscussionStage;
        },
      },
    ];
    this.stageList = stageList;
  }
}
