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

export const REQUIRE_ALL_USER_INPUTS_DISCUSSION_CLIENT_ID =
  "test-require-all-user-inputs-discussion-client-id";

export class UnitTestMultipleUsersGame extends AbstractGameData {
  id = "unit-test-multiple-users";
  name = "Unit Test Multiple Users";
  stageList: CurrentStage<IStage>[] = [];
  persistTruthGlobalStateData: string[] = [];

  constructor(discussionStages: DiscussionStage[]) {
    super();
    const requireAllUserInputsDiscussionStage = discussionStages.find(
      (s) => s.clientId === REQUIRE_ALL_USER_INPUTS_DISCUSSION_CLIENT_ID
    );

    if (!requireAllUserInputsDiscussionStage) {
      throw new Error("missing discussion stage");
    }
    const stageList: CurrentStage<IStage>[] = [
      {
        id: "require-all-user-inputs-discussion",
        stage: requireAllUserInputsDiscussionStage,
        getNextStage: () => {
          return requireAllUserInputsDiscussionStage;
        },
      },
    ];
    this.stageList = stageList;
  }
}
