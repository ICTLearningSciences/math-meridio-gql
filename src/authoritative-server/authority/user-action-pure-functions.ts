/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import { getGameById } from "../../authoritative-server/games/game-helpers";
import {
  DiscussionStage,
  DiscussionStageStep,
  isDiscussionStage,
} from "../../schemas/models/DiscussionStage/types";
import { GameData } from "../../schemas/models/Room";
import { SimulationStage } from "../../authoritative-server/llm-request/types";

export function getCurStageAndStep(
  gameData: GameData,
  discussionStages: DiscussionStage[]
): {
  curStage: DiscussionStage | SimulationStage;
  curStep?: DiscussionStageStep;
} {
  const game = getGameById(gameData.gameId, discussionStages);
  const curStage = game.stageList.find(
    (stage) => stage.stage.clientId === gameData.globalStateData.curStageId
  );
  if (!curStage) {
    throw new Error("No stage found");
  }
  const stage = curStage.stage;
  if (isDiscussionStage(stage)) {
    const curFlow = stage.flowsList.find((flow) =>
      flow.steps.find(
        (step) => step.stepId === gameData.globalStateData.curStepId
      )
    );
    if (!curFlow) {
      throw new Error("No flow found");
    }
    const curStep = curFlow.steps.find(
      (step) => step.stepId === gameData.globalStateData.curStepId
    );
    if (!curStep) {
      throw new Error("No step found in flow");
    }
    return {
      curStage: stage,
      curStep,
    };
  } else {
    return {
      curStage: stage as SimulationStage,
    };
  }
}
