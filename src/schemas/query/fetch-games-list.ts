/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import { GraphQLList, GraphQLString, GraphQLObjectType } from "graphql";
import { BasketballStateHandler } from "../../authoritative-server/games/basketball-game";
import { ConcertTicketSalesStateHandler } from "../../authoritative-server/games/concert-ticket-game";

export const GameType = new GraphQLObjectType({
  name: "GameType",
  fields: {
    id: { type: GraphQLString },
    name: { type: GraphQLString },
  },
});

export interface StaticGame {
  id: string;
  name: string;
}

export const fetchGamesList = {
  type: new GraphQLList(GameType),
  resolve: async (_root: GraphQLObjectType): Promise<StaticGame[]> => {
    const basketBallGame = new BasketballStateHandler([], true);
    const concertTicketSalesGame = new ConcertTicketSalesStateHandler([], true);
    const games = [basketBallGame, concertTicketSalesGame];
    return games.map((game) => ({
      id: game.id,
      name: game.name,
    }));
  },
};

export default fetchGamesList;
