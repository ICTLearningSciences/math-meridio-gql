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

export const TEST_LEARNING_OBJECTIVES_DISCUSSION_CLIENT_ID =
  "test-analyze-learning-objectives-discussion-client-id";

export class UnitTestLearningObjectivesGame extends AbstractGameData {
  id = "unit-test-analyze-learning-objectives";
  name = "Unit Test Analyze Learning Objectives";
  stageList: CurrentStage<IStage>[] = [];
  persistTruthGlobalStateData: string[] = [];
  mathStandardsCompletedRequirements: MathStandardsCompletionRequirements = {};

  constructor(discussionStages: DiscussionStage[]) {
    super();
    const analyzeLearningObjectivesDiscussionStage = discussionStages.find(
      (s) => s.clientId === TEST_LEARNING_OBJECTIVES_DISCUSSION_CLIENT_ID
    );

    if (!analyzeLearningObjectivesDiscussionStage) {
      throw new Error("missing discussion stage");
    }
    const stageList: CurrentStage<IStage>[] = [
      {
        id: "analyze-learning-objectives-discussion",
        stage: analyzeLearningObjectivesDiscussionStage,
        getNextStage: () => {
          return analyzeLearningObjectivesDiscussionStage;
        },
      },
    ];
    this.stageList = stageList;
  }
}
