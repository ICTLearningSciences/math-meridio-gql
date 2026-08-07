/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { GraphQLObjectType, GraphQLList } from "graphql";
import PlayerModel, {
  EducationalRole,
  Player,
  PlayerType,
} from "../models/Player";
import ClassModel, { Class, ClassType } from "../models/classes/Class";
import ClassMembershipModel, {
  ClassMembership,
  ClassMembershipType,
} from "../models/classes/ClassMembership";
import RoomModel, { RoomDocument, RoomType } from "../models/Room";
import NotificationEventModel, {
  NotificationEvent,
  NotificationEventType,
} from "../models/NotificationEvent";
import GamePhaseReflectionsModel, {
  GamePhaseReflections,
  GamePhaseReflectionsType,
} from "../models/GamePhaseReflections";
import { ConcertTicketSalesStateHandler } from "../../authoritative-server/games/concert-ticket-game";
import { BasketballStateHandler } from "../../authoritative-server/games/basketball-game";
import { GameType, StaticGame } from "./fetch-games-list";

const InstructorDataHydrationType = new GraphQLObjectType({
  name: "InstructorDataHydration",
  fields: () => ({
    classes: { type: new GraphQLList(ClassType) },
    rooms: { type: new GraphQLList(RoomType) },
    students: { type: new GraphQLList(PlayerType) },
    classMemberships: { type: new GraphQLList(ClassMembershipType) },
    phaseReflections: { type: new GraphQLList(GamePhaseReflectionsType) },
    gameList: { type: new GraphQLList(GameType) },
    notifications: { type: new GraphQLList(NotificationEventType) },
  }),
});

interface InstructorDataHydration {
  classes: Class[];
  rooms: RoomDocument[];
  students: Player[];
  classMemberships: ClassMembership[];
  phaseReflections: GamePhaseReflections[];
  gameList: StaticGame[];
  notifications: NotificationEvent[];
}

export default {
  type: InstructorDataHydrationType,
  resolve: async (
    _root: GraphQLObjectType,
    _args: Record<string, never>,
    context: {
      userId: string;
      userEducationalRole: EducationalRole;
    }
  ): Promise<InstructorDataHydration> => {
    try {
      const userId = context.userId;
      const userEducationalRole = context.userEducationalRole;

      // Ensure user is an instructor
      if (userEducationalRole !== EducationalRole.INSTRUCTOR) {
        throw new Error("User is not an instructor");
      }

      // Fetch all classes owned by this instructor (archived or not)
      const classes = await ClassModel.find({
        $or: [{ teacherId: userId }, { sharedWithInstructorIds: userId }],
      });
      const classIds = classes.map((c) => c._id);

      // Fetch all rooms created within the classes
      const rooms = await RoomModel.find({
        classId: { $in: classIds },
      });

      // Fetch all classMemberships that belong to the classes
      const classMemberships = await ClassMembershipModel.find({
        classId: { $in: classIds },
      });

      // Fetch all students for classMemberships
      const studentIds = classMemberships.map((cm) => cm.userId);
      const students = await PlayerModel.find({
        _id: { $in: studentIds },
      });

      // Fetch all game phase reflections for rooms
      const roomIds = rooms.map((r) => `${r._id}`);
      const phaseReflections = await GamePhaseReflectionsModel.find({
        roomId: { $in: roomIds },
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

      const notifications = await NotificationEventModel.find({
        $or: [{ classId: { $in: classIds } }, { roomId: { $in: roomIds } }],
      });

      return {
        classes,
        rooms,
        students,
        classMemberships,
        phaseReflections,
        gameList,
        notifications,
      };
    } catch (error) {
      throw new Error(error);
    }
  },
};
