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
import { SimulationStage } from "../llm-request/types";

const introductionDiscussionStage = "64de5488-c851-41b3-8347-18ffa340c753";
const collectStrategyDiscussionStage = "e20e0247-03a2-485f-b0be-b12ceb2af8b9";
const understandingEquationDiscussionStage =
  "0d8f3055-373f-4726-9392-b3fd1dac8385";
const selectStrategyDiscussionStage = "f289f022-3fa7-42a1-9d3d-0642c3015867";
const determineBestStrategyDiscussionStage =
  "80419d6d-1eca-491e-a648-8db3db951c02";
const finishedDiscussionStage = "d1323982-4f52-491e-b5e0-dbc70250e52b";

export const UNDERSTANDS_ALGORITHM_KEY = "understands_algorithm";
export const UNDERSTANDS_MULTIPLICATION_KEY = "understands_multiplication";
export const UNDERSTANDS_ADDITION_KEY = "understands_addition";
export const UNDERSTANDS_CONVERSION_RATE_KEY = "understands_conversion_rate";
export const UNDERSTANDS_TICKET_PRICES_KEY = "understands_ticket_prices";
export const BEST_STRATEGY_FOUND_KEY = "best_strategy_found";

export const VIP_TICKET_PERCENT_KEY = "vip_ticket_percent";
export const VIP_TICKET_PRICE = 75;
export const VIP_TICKET_CONVERSION_RATE = 0.36;

export const RESERVED_TICKET_PERCENT_KEY = "reserved_ticket_percent";
export const RESERVED_TICKET_PRICE = 50;
export const RESERVED_TICKET_CONVERSION_RATE = 0.4;

export const GENERAL_ADMISSION_TICKET_PERCENT_KEY =
  "general_admission_ticket_percent";
export const GENERAL_ADMISSION_TICKET_PRICE = 45;
export const GENERAL_ADMISSION_TICKET_CONVERSION_RATE = 0.6;

export const TOTAL_NUMBER_OF_TICKETS = 100;

export class ConcertTicketSalesStateHandler extends AbstractGameData {
  id = "concert-ticket-sales";
  name = "Concert Ticket Sales";
  stageList: CurrentStage<IStage>[] = [];
  persistTruthGlobalStateData = [
    UNDERSTANDS_MULTIPLICATION_KEY,
    UNDERSTANDS_ADDITION_KEY,
    UNDERSTANDS_CONVERSION_RATE_KEY,
    UNDERSTANDS_TICKET_PRICES_KEY,
    BEST_STRATEGY_FOUND_KEY,
  ];

  mathStandardsCompletedRequirements: MathStandardsCompletionRequirements = {
    "Understands Addition of Revenue from Multiple Ticket Types": {
      understands_addition: "true",
    },
    "Understands Multiplication to Calculate Revenue from Tickets Sold": {
      understands_multiplication: "true",
    },
    "Understands Rates as Price per Ticket": {
      understands_conversion_rate: "true",
    },
    "Understands How Ticket Price and Quantity Affect Total Revenue": {
      understands_ticket_prices: "true",
    },
    "Understands How to Apply a Multi-Step Formula to Calculate Total Revenue":
      {
        understands_addition: "true",
        understands_multiplication: "true",
        understands_conversion_rate: "true",
        understands_ticket_prices: "true",
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
