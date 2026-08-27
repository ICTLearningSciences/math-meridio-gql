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
import { SimulationStage } from "../llm-request/types";

const introductionDiscussionStage = "61d32b8f-267e-44d4-935f-39cd7b34ea50";
const collectStrategyDiscussionStage = "4da1b36a-9a7d-46ba-883f-83da30eb8534";
const understandingEquationDiscussionStage =
  "9798325c-96ae-48d8-9616-b69d9df3a571";
const selectStrategyDiscussionStage = "42a3b28d-68da-40af-8590-94e196d1501d";
const determineBestStrategyDiscussionStage =
  "fd529294-a3ee-45df-b8cf-61e22632366e";
const finishedDiscussionStage = "1d93e1aa-fd9b-4712-97cd-03ec1a6cb941";

export const UNDERSTANDS_ALGORITHM_KEY = "understands_algorithm";
export const UNDERSTANDS_MULTIPLICATION_KEY = "understands_multiplication";
export const UNDERSTANDS_ADDITION_KEY = "understands_addition";
export const UNDERSTANDS_CONVERSION_RATE_KEY = "understands_conversion_rate";
export const UNDERSTANDS_VIDEO_PRICES_KEY = "understands_video_revenue";
export const BEST_STRATEGY_FOUND_KEY = "best_strategy_found";

export const SHORT_DANCE_PERCENT_KEY = "dance_shorts_count";
export const SHORT_DANCE_PRICE = 10;
export const SHORT_DANCE_CONVERSION_RATE = 200000;

export const LONG_DANCE_PERCENT_KEY = "music_videos_count";
export const LONG_DANCE_PRICE = 100;
export const LONG_DANCE_CONVERSION_RATE = 16000;

export const INSTRUCTIONAL_PERCENT_KEY = "tech_videos_count";
export const INSTRUCTIONAL_TICKET_PRICE = 250;
export const INSTRUCTIONAL_CONVERSION_RATE = 8000;

export const TOTAL_NUMBER_OF_VIDEOS = 100;

export class SocialMediaInfluencerStateHandler extends AbstractGameData {
  id = "social-media-influencer";
  name = "Social Media Influencer";
  stageList: CurrentStage<IStage>[] = [];
  persistTruthGlobalStateData = [
    UNDERSTANDS_MULTIPLICATION_KEY,
    UNDERSTANDS_ADDITION_KEY,
    UNDERSTANDS_CONVERSION_RATE_KEY,
    UNDERSTANDS_VIDEO_PRICES_KEY,
    BEST_STRATEGY_FOUND_KEY,
  ];

  constructor(discussionStages: DiscussionStage[], skipStages?: boolean) {
    super();
    if (skipStages) {
      return;
    }
    const introDiscussionStage = discussionStages.find(
      (s) => s.clientId === introductionDiscussionStage
    );
    const collectStrategyStage = discussionStages.find(
      (s) => s.clientId === collectStrategyDiscussionStage
    );
    const understandingEquationStage = discussionStages.find(
      (s) => s.clientId === understandingEquationDiscussionStage
    );
    const selectStrategyStage = discussionStages.find(
      (s) => s.clientId === selectStrategyDiscussionStage
    );
    const determineBestStrategyStage = discussionStages.find(
      (s) => s.clientId === determineBestStrategyDiscussionStage
    );
    const finishedStage = discussionStages.find(
      (s) => s.clientId === finishedDiscussionStage
    );

    if (
      !introDiscussionStage ||
      !collectStrategyStage ||
      !understandingEquationStage ||
      !selectStrategyStage ||
      !determineBestStrategyStage ||
      !finishedStage
    ) {
      throw new Error("missing stage");
    }
    const simulationStage = {
      _id: "wait-for-simulation",
      clientId: "wait-for-simulation",
      stageType: "simulation",
    } as SimulationStage;
    const stageList: CurrentStage<IStage>[] = [
      {
        id: "intro-discussion",
        stage: introDiscussionStage,
        getNextStage: () => {
          return collectStrategyStage;
        },
      },
      {
        id: "collect-strategy",
        stage: collectStrategyStage,
        getNextStage: () => {
          return understandingEquationStage;
        },
      },
      {
        id: "understanding-equation",
        stage: understandingEquationStage,
        getNextStage: () => {
          return selectStrategyStage;
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
          return determineBestStrategyStage;
        },
      },
      {
        id: "determine-best-strategy",
        stage: determineBestStrategyStage,
        getNextStage: () => {
          return finishedStage;
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
