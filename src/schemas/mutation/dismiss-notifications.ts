/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { GraphQLObjectType, GraphQLList } from "graphql";
import { EducationalRole } from "../models/Player";
import ClassModel from "../models/classes/Class";
import RoomModel from "../models/Room";
import NotificationEventModel, {
  NotificationEvent,
  NotificationEventType,
} from "../models/NotificationEvent";

export const dismissNotifications = {
  type: new GraphQLList(NotificationEventType),
  resolve: async (
    _root: GraphQLObjectType,
    _: any, // eslint-disable-line  @typescript-eslint/no-explicit-any
    context: {
      userId: string;
      userEducationalRole: EducationalRole;
    }
  ): Promise<NotificationEvent[]> => {
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
      const roomIds = rooms.map((r) => `${r._id}`);

      await NotificationEventModel.updateMany(
        {
          $or: [{ classId: { $in: classIds } }, { roomId: { $in: roomIds } }],
        },
        {
          $set: {
            dismissedAt: new Date(),
          },
        },
        { upsert: true }
      );
      return await NotificationEventModel.find({
        $or: [{ classId: { $in: classIds } }, { roomId: { $in: roomIds } }],
      });
    } catch (error) {
      throw new Error(error);
    }
  },
};

export default dismissNotifications;
