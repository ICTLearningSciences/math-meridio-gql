/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import mongoose from "mongoose";
import { DiscussionStageStepType } from "../../../src/schemas/models/DiscussionStage/types";
import { RequireInputType } from "../../../src/schemas/models/DiscussionStage/objects";
const { ObjectId } = mongoose.Types;

const player1Id = "5f748650f4b3f1b9f1f1f1f1";
const room1Id = "5f748650f4b3f2b2f1f1f1f2";
const room3Id = "5f748650f4b3f2b2f1f1f1f4";
module.exports = {
  players: [
    {
      _id: new ObjectId(player1Id),
      googleId: "googleId1",
      name: "Jonny Appleseed",
      description: "I want an avatar with an apple for a head",
      avatar: [{ id: "man_apple_head" }],
    },
  ],

  rooms: [
    {
      _id: new ObjectId(room1Id),
      name: "Basketball Room 1",
      gameData: {
        gameId: "basketball",
        players: [player1Id],
        chat: [],
        globalStateData: {
          curStageId: "Stage 1",
          curStepId: "Step 1",
          roomOwnerId: player1Id,
          discussionData: {},
          gameStateData: {
            "Global variable 1": "Global variable 1 value",
          },
        },
        playersGameStateData: {
          [player1Id]: {
            "Player variable 1": "Player variable 1 value",
          },
        },
      },
      deletedRoom: false,
    },

    {
      _id: new ObjectId("5f748650f4b3f1b9f2f3f4f5"),
      name: "Basketball Room 1 Marked as Deleted",
      gameData: {
        gameId: "basketball",
        players: [player1Id],
        chat: [],
        globalStateData: {
          curStageId: "Stage 1",
          curStepId: "Step 1",
          roomOwnerId: player1Id,
          discussionData: {},
          gameStateData: {
            "Global variable 1": "Global variable 1 value",
          },
        },
        playersGameStateData: {
          [player1Id]: {
            "Player variable 1": "Player variable 1 value",
          },
        },
      },
      deletedRoom: true,
    },

    {
      _id: new ObjectId(room3Id),
      name: "Basketball Room 3",
      gameData: {
        gameId: "basketball",
        players: [],
        chat: [],
        globalStateData: {
          curStageId: "Stage 1",
          curStepId: "Step 1",
          roomOwnerId: player1Id,
          discussionData: {},
          gameStateData: {},
        },
        playersGameStateData: {},
      },
      deletedRoom: false,
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
              saveResponseVariableName: "user_input_name",
              disableFreeInput: false,
              predefinedResponses: [],
              requireAllUserInputs: false,
            },
            {
              stepId: "3",
              stepType: DiscussionStageStepType.SYSTEM_MESSAGE,
              message: "Hello, {{user_input_name}}!",
            },
            {
              stepId: "4",
              stepType: DiscussionStageStepType.PROMPT,
              promptText: "Please generate a nickname for {{user_input_name}}",
              responseFormat: "",
              jsonResponseData: "stringified_json_response_data",
              includeChatLogContext: true,
              outputDataType: "JSON",
              customSystemRole: "user",
            },
            {
              stepId: "5",
              stepType: DiscussionStageStepType.CONDITIONAL,
              jumpToStepId: "6",
              conditionals: [
                {
                  stateDataKey: "nickname",
                  checking: "is",
                  operation: "equal",
                  expectedValue: "John",
                  targetStepId: "6",
                },
              ],
            },
            {
              stepId: "6",
              stepType: DiscussionStageStepType.SYSTEM_MESSAGE,
              message:
                "Thank you for participating in the test activity, {{nickname}}!",
              jumpToStepId: "1",
            },
          ],
        },
      ],
    },

    {
      _id: new ObjectId("5ffdf1231ee2c62320b49e30"),
      clientId: "test-request-user-input-discussion-client-id",
      title: "Test Request User Input Discussion",
      stageType: "discussion",
      description: "",
      flowsList: [
        {
          clientId: new ObjectId("5ffdf1231ee2c22322b49e5f"),
          name: "Test Request User Input Flow",
          steps: [
            {
              stepId: "1",
              stepType: DiscussionStageStepType.SYSTEM_MESSAGE,
              message: "Welcome to the request user input discussion",
              lastStep: false,
            },
            {
              stepId: "2",
              stepType: DiscussionStageStepType.REQUEST_USER_INPUT,
              message: "What is your name?",
              saveResponseVariableName: "name",
              disableFreeInput: false,
              predefinedResponses: [],
              requireInputType: RequireInputType.SINGLE_RESPONSE_REQUIRED,
              lastStep: false,
            },
            {
              stepId: "3",
              stepType: DiscussionStageStepType.SYSTEM_MESSAGE,
              message: "Hello, {{name}}!",
              lastStep: true,
            },
          ],
        },
      ],
    },
    {
      _id: new ObjectId("5ffdf1231ee2c22320b49e30"),
      clientId: "test-prompt-discussion-client-id",
      title: "Test Prompt Discussion",
      stageType: "discussion",
      description: "",
      flowsList: [
        {
          clientId: new ObjectId("5ffdf1231ee2c62322b49e5f"),
          name: "Test Prompt Flow",
          steps: [
            {
              stepId: "1",
              stepType: DiscussionStageStepType.SYSTEM_MESSAGE,
              message: "Welcome to the prompt discussion",
              lastStep: false,
            },
            {
              lastStep: false,
              stepId: "2",
              stepType: "REQUEST_USER_INPUT",
              jumpToStepId: null,
              message: "What is your prompt?",
              saveResponseVariableName: "user_input_prompt",
              disableFreeInput: false,
              requireInputType: RequireInputType.SINGLE_RESPONSE_REQUIRED,
              predefinedResponses: [],
            },
            {
              lastStep: false,
              stepId: "3",
              stepType: "PROMPT",
              jumpToStepId: "",
              promptText: "Process the users prompt: {{user_input_prompt}}",
              responseFormat: "",
              includeChatLogContext: false,
              outputDataType: "JSON",
              jsonResponseData: JSON.stringify([
                {
                  clientId: "1",
                  name: "prompt_response",
                  type: "string",
                  isRequired: true,
                  additionalInfo: "Your response to the question",
                },
              ]),
              customSystemRole: "",
            },
            {
              lastStep: true,
              stepId: "4",
              stepType: "SYSTEM_MESSAGE",
              jumpToStepId: "",
              message: "{{prompt_response}}",
            },
          ],
        },
      ],
    },
    {
      _id: new ObjectId("5ffdf1231ee2c22320b69e30"),
      clientId: "test-conditional-discussion-client-id",
      title: "Test Conditional Discussion",
      stageType: "discussion",
      description: "",
      flowsList: [
        {
          clientId: new ObjectId("5ffdf1231ee2c62122b49e5f"),
          name: "Test Conditional Flow",
          steps: [
            {
              stepId: "1",
              stepType: DiscussionStageStepType.SYSTEM_MESSAGE,
              message: "Welcome to the conditional discussion",
              lastStep: false,
            },
            {
              lastStep: false,
              stepId: "2",
              stepType: DiscussionStageStepType.REQUEST_USER_INPUT,
              jumpToStepId: null,
              message: "Please enter number 1 or 2",
              saveResponseVariableName: "user_input_number",
              disableFreeInput: false,
              requireInputType: RequireInputType.SINGLE_RESPONSE_REQUIRED,
              predefinedResponses: [],
            },
            {
              stepId: "3",
              stepType: DiscussionStageStepType.CONDITIONAL,
              lastStep: false,
              jumpToStepId: "",
              conditionals: [
                {
                  stateDataKey: "user_input_number",
                  checking: "VALUE",
                  operation: "==",
                  expectedValue: "1",
                  targetStepId: "4",
                },
                {
                  stateDataKey: "user_input_number",
                  checking: "VALUE",
                  operation: "==",
                  expectedValue: "2",
                  targetStepId: "5",
                },
              ],
            },
            {
              stepId: "4",
              stepType: DiscussionStageStepType.SYSTEM_MESSAGE,
              message: "You entered number 1",
              jumpToStepId: "6",
              lastStep: false,
            },
            {
              stepId: "5",
              stepType: DiscussionStageStepType.SYSTEM_MESSAGE,
              message: "You entered number 2",
              lastStep: false,
            },
            {
              stepId: "6",
              stepType: DiscussionStageStepType.SYSTEM_MESSAGE,
              message: "Thank you for playing!",
              lastStep: true,
            },
          ],
        },
      ],
    },

    {
      _id: new ObjectId("5ffdf1231ee2b62320b49e30"),
      clientId: "test-require-all-user-inputs-discussion-client-id",
      title: "Test Require All User Inputs Discussion",
      stageType: "discussion",
      description: "",
      flowsList: [
        {
          clientId: new ObjectId("5ffdf2231ee2c22322b49e5f"),
          name: "Test Request User Input Flow",
          steps: [
            {
              stepId: "1",
              stepType: DiscussionStageStepType.SYSTEM_MESSAGE,
              message: "Hello, everyone!",
              lastStep: false,
            },
            {
              stepId: "2",
              stepType: DiscussionStageStepType.REQUEST_USER_INPUT,
              message: "What are your names?",
              saveResponseVariableName: "input_name",
              disableFreeInput: false,
              predefinedResponses: [],
              requireInputType:
                RequireInputType.ALL_USER_RESPONSES_REQUIRED_FREE_FOR_ALL,
              lastStep: false,
            },
            {
              stepId: "3",
              stepType: DiscussionStageStepType.SYSTEM_MESSAGE,
              message: "Nice to meet you all!",
              lastStep: false,
            },
            {
              stepId: "4",
              stepType: DiscussionStageStepType.REQUEST_USER_INPUT,
              message: "Where did you grow up?",
              saveResponseVariableName: "input_location",
              disableFreeInput: false,
              predefinedResponses: [],
              requireInputType:
                RequireInputType.ALL_USER_RESPONSES_REQUIRED_FREE_FOR_ALL,
              lastStep: false,
            },
            {
              stepId: "5",
              stepType: DiscussionStageStepType.SYSTEM_MESSAGE,
              message: "That's cool!",
              lastStep: true,
            },
          ],
        },
      ],
    },

    {
      _id: new ObjectId("5ffdf1231ee2b62320a49e30"),
      clientId: "test-simulation-discussion-client-id",
      title: "Test Simulation Discussion",
      stageType: "discussion",
      description: "",
      flowsList: [
        {
          clientId: new ObjectId("5ffdf2221ee2c22322b49e5f"),
          name: "Test Request User Input Flow",
          steps: [
            {
              stepId: "1",
              stepType: DiscussionStageStepType.REQUEST_USER_INPUT,
              message: "Ready for the simulation?",
              saveResponseVariableName: "input_name",
              disableFreeInput: false,
              predefinedResponses: [],
              requireInputType:
                RequireInputType.ALL_USER_RESPONSES_REQUIRED_FREE_FOR_ALL,
              lastStep: true,
            },
          ],
        },
      ],
    },

    {
      _id: new ObjectId("5ffdf1231ee2b62320a49e31"),
      clientId: "test-end-of-phase-reflection-discussion-client-id",
      title: "Test End of Phase Reflection Discussion",
      stageType: "discussion",
      description: "",
      flowsList: [
        {
          clientId: new ObjectId("5ffdf2221ee2c22322b49e6f"),
          name: "Test End of Phase Reflection Flow",
          steps: [
            {
              stepId: "1",
              stepType: DiscussionStageStepType.REQUEST_USER_INPUT,
              message: "Ready for reflection?",
              saveResponseVariableName: "input_name",
              disableFreeInput: false,
              predefinedResponses: [],
              requireInputType:
                RequireInputType.ALL_USER_RESPONSES_REQUIRED_FREE_FOR_ALL,
              lastStep: false,
            },
            {
              stepId: "2",
              stepType: DiscussionStageStepType.END_OF_PHASE_REFLECTION,
              phaseTitle: "End of Phase Reflection",
              message: "Thank you for participating!",
              question: "What did you think of the activity?",
              lastStep: false,
            },
            {
              stepId: "3",
              stepType: DiscussionStageStepType.SYSTEM_MESSAGE,
              message: "Thank you for participating!",
              lastStep: false,
              jumpToStepId: "1",
            },
          ],
        },
      ],
    },
  ],
};
