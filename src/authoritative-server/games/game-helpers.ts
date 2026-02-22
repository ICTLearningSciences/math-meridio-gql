/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { AbstractGameData } from "../../authoritative-server/llm-request/types";
import { BasketballStateHandler } from "./basketball-game";
import { DiscussionStage } from "../../schemas/models/DiscussionStage/types";
import { ConcertTicketSalesStateHandler } from "./concert-ticket-game";
import { UnitTestGame } from "./unit-test-game";
import { UnitTestMultipleUsersGame } from "./unit-test-multiple-users-game";
import { UnitTestSimulationGame } from "./unit-test-simulation-game";
import { UnitTestEndOfPhaseReflectionGame } from "./unit-test-end-of-phase";

export const WAIT_FOR_SIMULATION_STAGE_CLIENT_ID = "wait-for-simulation";

export function getGameById(
  gameId: string,
  discussionStages: DiscussionStage[]
): AbstractGameData {
  switch (gameId) {
    case "basketball":
      return new BasketballStateHandler(discussionStages);
    case "concert-ticket-sales":
      return new ConcertTicketSalesStateHandler(discussionStages);
    case "unit-test":
      return new UnitTestGame(discussionStages);
    case "unit-test-multiple-users":
      return new UnitTestMultipleUsersGame(discussionStages);
    case "unit-test-simulation":
      return new UnitTestSimulationGame(discussionStages);
    case "unit-test-end-of-phase":
      return new UnitTestEndOfPhaseReflectionGame(discussionStages);
    default:
      throw new Error(`Game not found: ${gameId}`);
  }
}
