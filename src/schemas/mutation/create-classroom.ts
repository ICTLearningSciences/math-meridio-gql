/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { GraphQLObjectType } from "graphql";
import { EducationalRole } from "../models/Player";
import ClassModel, { Class, ClassType } from "../models/classes/Class";

export const createClassroom = {
  type: ClassType,
  args: {},
  resolve: async (
    _root: GraphQLObjectType,
    _: any, // eslint-disable-line  @typescript-eslint/no-explicit-any
    context: {
      userId: string;
      userEducationalRole: EducationalRole;
    }
  ): Promise<Class> => {
    try {
      const userId = context.userId;
      const userEducationalRole = context.userEducationalRole;
      if (userEducationalRole !== EducationalRole.INSTRUCTOR) {
        throw new Error("User is not an instructor");
      }
      const newClass = await ClassModel.create({
        name: "New Class",
        teacherId: userId,
      });
      return newClass;
    } catch (error) {
      throw new Error(error);
    }
  },
};

export default createClassroom;
