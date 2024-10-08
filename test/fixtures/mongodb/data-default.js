/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import mongoose from "mongoose";
import { DiscussionStageStepType } from "../../../src/schemas/models/DiscussionStage/types";
const { ObjectId } = mongoose.Types;

module.exports = {
  players: [
    {
      _id: new ObjectId("5f748650f4b3f1b9f1f1f1f1"),
      clientId: "Player 1",
      name: "Jonny Appleseed",
      description: "I want an avatar with an apple for a head",
      avatar: [{ id: "man_apple_head" }],
    },
  ],

  rooms: [
    {
      _id: new ObjectId("5f748650f4b3f1b9f1f1f1f1"),
      name: "Basketball Room 1",
      gameData: {
        gameId: "basketball",
        players: ["Player 1"],
        chat: [],
        globalStateData: {
          curStageId: "Stage 1",
          curStepId: "Step 1",
          gameStateData: [
            {
              key: "Global variable 1",
              value: "Global variable 1 value",
            },
          ],
        },
        playerStateData: [
          {
            player: "Player 1",
            animation: "",
            gameStateData: [
              {
                key: "Player variable 1",
                value: "Player variable 1 value",
              },
            ],
          },
        ],
      },
      deletedRoom: false,
    },

    {
      _id: new ObjectId("5f748650f4b3f1b9f2f3f4f5"),
      name: "Basketball Room 1 Marked as Deleted",
      gameData: {
        gameId: "basketball",
        players: ["Player 1"],
        chat: [],
        globalStateData: {
          curStageId: "Stage 1",
          curStepId: "Step 1",
          gameStateData: [
            {
              key: "Global variable 1",
              value: "Global variable 1 value",
            },
          ],
        },
        playerStateData: [
          {
            player: "Player 1",
            animation: "",
            gameStateData: [
              {
                key: "Player variable 1",
                value: "Player variable 1 value",
              },
            ],
          },
        ],
      },
      deletedRoom: true,
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
