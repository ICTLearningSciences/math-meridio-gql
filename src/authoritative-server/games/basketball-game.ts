/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import {
  CurrentStage,
  DiscussionStage,
  IStage,
} from "../../schemas/models/DiscussionStage/types";
import {
  AbstractGameData,
  MathStandardsCompletionRequirements,
  SimulationStage,
} from "../llm-request/types";
import { WAIT_FOR_SIMULATION_STAGE_CLIENT_ID } from "./game-helpers";

const introductionDiscussionStage = "de0b94b9-1fc2-4ea1-995e-21a75670c16d";
const collectVariablesDiscussionStage = "86587083-9279-4c27-8470-836f992670fc";
const explainConceptsDiscussionStage = "909a0d5a-345d-4f6e-8d9c-2e7f6cfa4714";
const keyConceptsConvoDiscussionStage = "5421ef02-3cca-4281-a832-69ce040ed848";
const selectStrategyDiscussionStage = "3095c6cd-d377-4660-aa4d-e79409592210";
const discussNewStrategyDiscussionStage =
  "9265f1ef-2a2e-4a14-b98f-5bbf6fd879d8";
const discussBestStrategyDiscussionStage =
  "e11d3273-e0e8-4b15-a5f0-3b80e5665e01";
const finishedDiscussionStage = "bdf123b5-1fd1-4de9-bc4e-74a53623475a";

export class BasketballStateHandler extends AbstractGameData {
  id = "basketball";
  name = "Basketball";
  stageList: CurrentStage<IStage>[] = [];

  persistTruthGlobalStateData = [
    "Points per outside shot",
    "Points per inside shot",
    "Points per mid shot",
    "understands_algorithm",
    "understands_multiplication",
    "understands_addition",
    "understands_success_shots",
    "understands_shot_points",
    "best_strategy_found",
  ];

  mathStandardsCompletedRequirements: MathStandardsCompletionRequirements = {
    "Understands Addition": {
      understands_addition: true,
    },
    "Understands Multiplication": {
      understands_multiplication: true,
    },
    "Understands Success Shots": {
      understands_success_shots: true,
    },
    "Understands Shot Points": {
      understands_shot_points: true,
    },
    "Understands Algorithm": {
      understands_algorithm: true,
    },
  };

  constructor(discussionStages: DiscussionStage[], skipStages?: boolean) {
    super();
    if (skipStages) {
      return;
    }
    const introDiscussionStage = discussionStages.find(
      (s) => s.clientId === introductionDiscussionStage
    );
    const collectVariablesStage = discussionStages.find(
      (s) => s.clientId === collectVariablesDiscussionStage
    );
    const explainConceptsStage = discussionStages.find(
      (s) => s.clientId === explainConceptsDiscussionStage
    );
    const keyConceptsConvoStage = discussionStages.find(
      (s) => s.clientId === keyConceptsConvoDiscussionStage
    );
    const selectStrategyStage = discussionStages.find(
      (s) => s.clientId === selectStrategyDiscussionStage
    );
    const discussNewStrategyStage = discussionStages.find(
      (s) => s.clientId === discussNewStrategyDiscussionStage
    );
    const discussBestStrategyStage = discussionStages.find(
      (s) => s.clientId === discussBestStrategyDiscussionStage
    );
    const finishedStage = discussionStages.find(
      (s) => s.clientId === finishedDiscussionStage
    );

    if (
      !introDiscussionStage ||
      !collectVariablesStage ||
      !explainConceptsStage ||
      !keyConceptsConvoStage ||
      !selectStrategyStage ||
      !discussNewStrategyStage ||
      !discussBestStrategyStage ||
      !finishedStage
    ) {
      throw new Error("missing stage");
    }

    const simulationStage = {
      _id: WAIT_FOR_SIMULATION_STAGE_CLIENT_ID,
      clientId: WAIT_FOR_SIMULATION_STAGE_CLIENT_ID,
      stageType: "simulation",
    } as SimulationStage;

    const stageList: CurrentStage<IStage>[] = [
      {
        id: "intro-discussion",
        stage: introDiscussionStage,
        getNextStage: () => {
          return collectVariablesStage;
        },
      },
      {
        id: "collect-variables",
        stage: collectVariablesStage,
        getNextStage: () => {
          return explainConceptsStage;
        },
      },
      {
        id: "explain-concepts",
        stage: explainConceptsStage,
        getNextStage: (data) => {
          if (data["understands_algorithm"] !== "true") {
            return keyConceptsConvoStage;
          } else {
            return selectStrategyStage;
          }
        },
      },
      {
        id: "key-concepts-convo",
        stage: keyConceptsConvoStage,
        beforeStart: () => {
          // this.discussionStageHandler.exitEarlyCondition = (
          //   data: CollectedDiscussionData
          // ) => {
          //   return data['understands_algorithm'] === 'true';
          // };
          console.log(
            "WARNING: beforeStart called, doing nothing, used to exit early if player didn't understand algorithm"
          );
        },
        getNextStage: (data) => {
          // this.discussionStageHandler.exitEarlyCondition = undefined;
          if (data["understands_algorithm"] !== "true") {
            return keyConceptsConvoStage;
          } else {
            return selectStrategyStage;
          }
        },
      },
      {
        id: "select-strategy",
        stage: selectStrategyStage,
        getNextStage: () => {
          return simulationStage;
        },
      },
      {
        id: "wait-for-simulation",
        stage: simulationStage,
        getNextStage: () => {
          return discussNewStrategyStage;
        },
      },
      {
        id: "discuss-new-strategy",
        stage: discussNewStrategyStage,
        getNextStage: (data) => {
          if (data["best_strategy_found"] === "false") {
            return discussBestStrategyStage;
          } else {
            return finishedStage;
          }
        },
      },
      {
        id: "discuss-best-strategy",
        stage: discussBestStrategyStage,
        getNextStage: (data) => {
          if (data["best_strategy_found"] === "false") {
            return discussBestStrategyStage;
          } else {
            return finishedStage;
          }
        },
      },
      {
        id: "finished",
        stage: finishedStage,
        getNextStage: () => {
          return introDiscussionStage;
        },
      },
    ];
    this.stageList = stageList;
  }
}
