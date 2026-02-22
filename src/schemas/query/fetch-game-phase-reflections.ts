/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import {
  GraphQLList,
  GraphQLString,
  GraphQLObjectType,
  GraphQLInt,
} from "graphql";
import GamePhaseReflectionsModel from "../models/GamePhaseReflections";
import RoomModel from "../models/Room";
import GraphQLScalarType from "../types/anything-scalar-type";
import DiscussionStageModel from "../../schemas/models/DiscussionStage/DiscussionStage";
import {
  DiscussionStageStepType,
  EndOfPhaseReflectionStep,
} from "../../schemas/models/DiscussionStage/types";
export const FetchGamePhaseReflectionDataType = new GraphQLObjectType({
  name: "FetchGamePhaseReflectionDataType",
  fields: () => ({
    question: { type: GraphQLString },
    roomId: { type: GraphQLString },
    gameId: { type: GraphQLString },
    phaseName: { type: GraphQLString },
    endOfPhaseStepId: { type: GraphQLString },
    roundNumber: { type: GraphQLInt },
    reflections: { type: GraphQLScalarType },
  }),
});

export interface FetchGamePhaseReflectionData {
  question: string;
  roomId: string;
  gameId: string;
  phaseName: string;
  endOfPhaseStepId: string;
  roundNumber: number;
  reflections: Record<string, string>; // keyed by player ID
}

export const fetchGamePhaseReflections = {
  type: new GraphQLList(FetchGamePhaseReflectionDataType),
  args: {},
  resolve: async (
    _root: GraphQLObjectType
  ): Promise<FetchGamePhaseReflectionData[]> => {
    const gamePhaseReflections = await GamePhaseReflectionsModel.find();
    const allRoomIds = gamePhaseReflections.map(
      (gamePhaseReflection) => gamePhaseReflection.roomId
    );
    const rooms = await RoomModel.find({
      _id: { $in: allRoomIds },
      deletedRoom: false,
    });
    const discussionStages = await DiscussionStageModel.find({});
    const allFlowSteps = discussionStages.flatMap((stage) =>
      stage.flowsList.flatMap((flow) => flow.steps)
    );
    const allEndOfPhaseReflectionStages = allFlowSteps.filter(
      (step) =>
        step.stepType === DiscussionStageStepType.END_OF_PHASE_REFLECTION
    );

    const reflections: FetchGamePhaseReflectionData[] =
      gamePhaseReflections.reduce((acc, gamePhaseReflection) => {
        const room = rooms.find(
          (room) => room._id.toString() === gamePhaseReflection.roomId
        );
        if (!room) {
          console.log(
            `Room not found for game phase reflection: ${gamePhaseReflection.roomId}`
          );
          return acc;
        }
        const endOfPhaseReflectionStage = allEndOfPhaseReflectionStages.find(
          (step) => step.stepId === gamePhaseReflection.stepId
        );
        if (!endOfPhaseReflectionStage) {
          console.log(
            `End of phase reflection stage not found for game phase reflection: ${gamePhaseReflection.roomId}`
          );
          return acc;
        }
        acc.push({
          roomId: gamePhaseReflection.roomId,
          gameId: room.gameData.gameId,
          phaseName: (endOfPhaseReflectionStage as EndOfPhaseReflectionStep)
            .phaseTitle,
          question: gamePhaseReflection.question,
          endOfPhaseStepId: gamePhaseReflection.stepId,
          roundNumber: gamePhaseReflection.roundNumber,
          reflections: gamePhaseReflection.reflections || {},
        });
        return acc;
      }, [] as FetchGamePhaseReflectionData[]);
    return reflections;
  },
};

export default fetchGamePhaseReflections;
