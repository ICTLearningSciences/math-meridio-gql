/*

*/

import mongoose from "mongoose";
import { DiscussionStageStepType } from "../../../src/schemas/models/DiscussionStage/types";
const { ObjectId } = mongoose.Types;

module.exports = {
  rooms: [
    {
      _id: new ObjectId("5f748650f4b3f1b9f1f1f1f1"),
      users: ["5f748650f4b3f1b9f1f1f1f2", "5f748650f4b3f1b9f1f1f1f3"],
    },
  ],
  discussionstages: [
    {
      _id: new ObjectId("5ffdf1231ee2c62320b49e2f"),
      title: "Test AI Response Data",
      stageType: "discussion",
      description: "",
      flowsList: [
        {
          clientId: new ObjectId("5ffdf1231ee2c62322b49e9f"),
          name: "Test Flow",
          steps: [
            {
              stepId: "1",
              stepType: DiscussionStageStepType.SYSTEM_MESSAGE,
              message: "Welcome to the test discussion",
            },
            {
              stepId: "2",
              stepType: DiscussionStageStepType.REQUEST_USER_INPUT,
              message: "What is your name?",
              saveResponseVariableName: "name",
              disableFreeInput: false,
              predefinedResponses: [],
            },
            {
              stepId: "3",
              stepType: DiscussionStageStepType.SYSTEM_MESSAGE,
              message: "Hello, {{name}}!",
            },
            {
              stepId: "4",
              stepType: DiscussionStageStepType.PROMPT,
              promptText: "Please generate a nickname for {{name}}",
              responseFormat: "",
              jsonResponseData: "stringified_json_response_data",
              includeChatLogContext: true,
              outputDataType: "JSON",
              customSystemRole: "user",
            },
            {
              stepId: "5",
              stepType: DiscussionStageStepType.SYSTEM_MESSAGE,
              message:
                "Thank you for participating in the test activity, {{nickname}}!",
              jumpToStepId: "1",
            },
          ],
        },
      ],
    },
  ],
};
