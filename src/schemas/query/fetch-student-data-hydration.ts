/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { GraphQLObjectType, GraphQLList } from "graphql";
import { EducationalRole, PlayerType } from "../models/Player";
import ClassModel, { Class, ClassType } from "../models/classes/Class";
import ClassMembershipModel, {
  ClassMembership,
  ClassMembershipStatus,
  ClassMembershipType,
} from "../models/classes/ClassMembership";
import RoomModel, { Room, RoomType } from "../models/Room";
import PlayerModel, { Player } from "../models/Player";
import { BasketballStateHandler } from "../../authoritative-server/games/basketball-game";
import { ConcertTicketSalesStateHandler } from "../../authoritative-server/games/concert-ticket-game";
import { StaticGame } from "./fetch-games-list";
import { GameType } from "./fetch-games-list";
import ClassEventModel, {
  ClassEvent,
  ClassEventType,
} from "../models/ClassEvent";

const StudentDataHydrationType = new GraphQLObjectType({
  name: "StudentDataHydration",
  fields: () => ({
    classes: { type: new GraphQLList(ClassType) },
    rooms: { type: new GraphQLList(RoomType) },
    students: { type: new GraphQLList(PlayerType) },
    classMemberships: { type: new GraphQLList(ClassMembershipType) },
    gameList: { type: new GraphQLList(GameType) },
    events: { type: new GraphQLList(ClassEventType) },
  }),
});

interface StudentDataHydration {
  classes: Class[];
  rooms: Room[];
  students: Player[];
  classMemberships: ClassMembership[];
  gameList: StaticGame[];
  events: ClassEvent[];
}

export default {
  type: StudentDataHydrationType,
  resolve: async (
    _root: GraphQLObjectType,
    _args: Record<string, never>,
    context: {
      userId: string;
      userEducationalRole: EducationalRole;
    }
  ): Promise<StudentDataHydration> => {
    try {
      const userId = context.userId;

      // Fetch all classMemberships where the student is a MEMBER
      const studentMemberships = await ClassMembershipModel.find({
        userId: userId,
        status: ClassMembershipStatus.MEMBER,
      });

      const classIds = studentMemberships.map((cm) => cm.classId);

      // Fetch all classes the student is a member of
      const classes = await ClassModel.find({
        _id: { $in: classIds },
      });

      // Fetch all rooms created within the classes
      const rooms = await RoomModel.find({
        classId: { $in: classIds },
      });

      // Fetch all classMemberships that belong to the classes
      const classMemberships = await ClassMembershipModel.find({
        classId: { $in: classIds },
      });

      // Fetch all students for classMemberships (excluding the current user)
      const studentIds = classMemberships
        .map((cm) => cm.userId)
        .filter((id) => `${id}` !== `${userId}`);
      const students = await PlayerModel.find({
        _id: { $in: studentIds },
      });

      const basketBallGame = new BasketballStateHandler([], true);
      const concertTicketSalesGame = new ConcertTicketSalesStateHandler(
        [],
        true
      );
      const games = [basketBallGame, concertTicketSalesGame];
      const gameList = games.map((game) => ({
        id: game.id,
        name: game.name,
      }));

      const events = await ClassEventModel.find({
        userId: userId,
      });

      return {
        classes,
        rooms,
        students,
        classMemberships,
        gameList,
        events,
      };
    } catch (error) {
      throw new Error(error);
    }
  },
};
