/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import createApp, { appStart, appStop } from "../../../src/app";
import { expect } from "chai";
import e, { Express } from "express";
import mongoUnit from "mongo-unit";
import request from "supertest";
import { player1Id } from "../../fixtures/mongodb/data";
import { createUser } from "../../helpers";
import mongoose from "mongoose";
const { ObjectId } = mongoose.Types;
import RoomModel, { Room } from "../../../src/schemas/models/Room";
import {
  createNewGameRoomMutation,
  fullRoomData,
  joinGameRoomMutation,
  leaveGameRoomMutation,
  pingGameRoomProcessMutation,
  PromptRoles,
  sendMessageToGameRoomMutation,
  UserRole,
  viewGameRoomSimulationMutation,
} from "../../../src/schemas/types/types";
import { getToken } from "../../helpers";
import { EducationalRole } from "../../../src/schemas/models/Player";
import {
  CONDITIONAL_DISCUSSION_CLIENT_ID,
  PROMPT_DISCUSSION_CLIENT_ID,
  REQUEST_USER_INPUT_DISCUSSION_CLIENT_ID,
} from "../../../src/authoritative-server/games/unit-test-game";
import { REQUIRE_ALL_USER_INPUTS_DISCUSSION_CLIENT_ID } from "../../../src/authoritative-server/games/unit-test-multiple-users-game";
import { TEST_SIMULATION_DISCUSSION_CLIENT_ID } from "../../../src/authoritative-server/games/unit-test-simulation-game";
import { getSimulationViewedKey } from "../../../src/authoritative-server/authority/helpers/helpers";
import sinon from "sinon";
import * as llmRequest from "../../../src/authoritative-server/llm-request/llm-request";
import { AiServicesResponseTypes } from "../../../src/authoritative-server/llm-request/ai-services/ai-service-types";
import { SenderType } from "../../../src/authoritative-server/llm-request/types";
import { WAIT_FOR_SIMULATION_STAGE_CLIENT_ID } from "../../../src/authoritative-server/games/game-helpers";

describe("full room lifecycle", () => {
  let app: Express;
  const syncLlmRequestStub = sinon.stub(llmRequest, "syncLlmRequest");

  beforeEach(async () => {
    await mongoUnit.load(require("test/fixtures/mongodb/data-default.js"));
    app = await createApp();
    await appStart();
  });

  afterEach(async () => {
    syncLlmRequestStub.reset();
    await appStop();
    await mongoUnit.drop();
  });

  it(`single user room lifecycle`, async () => {
    // 1: create new room, should automatically add the requesting user to the room and initialize the game room and process the first steps until the first request user input step.
    const userToken = await getToken(
      player1Id,
      UserRole.USER,
      EducationalRole.STUDENT
    );
    const createNewGameRoomResponse = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        query: createNewGameRoomMutation,
        variables: {
          gameId: "unit-test",
        },
      });
    expect(createNewGameRoomResponse.status).to.equal(200);
    expect(createNewGameRoomResponse.body.data.createNewGameRoom).to.exist;
    const newRoomId = createNewGameRoomResponse.body.data.createNewGameRoom._id;
    const newRoom = await RoomModel.findById(newRoomId);
    expect(newRoom).to.exist;
    expect(newRoom?.gameData.players[0]).to.equal(player1Id);
    expect(newRoom?.gameData.gameId).to.equal("unit-test");
    expect(newRoom?.gameData.globalStateData.curStageId).to.equal(
      REQUEST_USER_INPUT_DISCUSSION_CLIENT_ID
    );
    // 2nd step is the first request user input step, so we expect the current step id to be 2.
    expect(newRoom?.gameData.globalStateData.curStepId).to.equal("2");

    // Check that the chat log has the correct messages.
    expect(newRoom?.gameData.chat).to.have.length(2);
    expect(newRoom?.gameData.chat[0].message).to.equal(
      "Welcome to the request user input discussion"
    );
    expect(newRoom?.gameData.chat[1].message).to.equal("What is your name?");

    // 3. Send a message to the room, should add the message to the chat log
    const sendMessageToGameRoomResponse = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        query: sendMessageToGameRoomMutation,
        variables: {
          roomId: newRoomId,
          message: "Jonny Appleseed",
          sessionId: "session1",
        },
      });
    expect(sendMessageToGameRoomResponse.status).to.equal(200);
    expect(sendMessageToGameRoomResponse.body.data.sendMessageToGameRoom).to
      .exist;

    // Should have added the message to the chat log
    let updatedRoom = (await RoomModel.findById(newRoomId))?.toObject();
    expect(updatedRoom?.gameData.chat).to.have.length(3);
    expect(updatedRoom?.gameData.chat[2].message).to.equal("Jonny Appleseed");

    // Send a ping to the process endpoint to process the complete request user input step and continue processing the steps up to the next request user input step (which will be the prompt step).
    const pingGameRoomProcessResponse = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        query: pingGameRoomProcessMutation,
        variables: {
          roomId: newRoomId,
          sessionId: "session1",
        },
      });
    expect(pingGameRoomProcessResponse.status).to.equal(200);
    updatedRoom = pingGameRoomProcessResponse.body.data.pingGameRoomProcess;
    expect(updatedRoom?.gameData.chat[3].message).to.equal(
      "Hello, Jonny Appleseed!"
    );
    expect(updatedRoom?.gameData.globalStateData.curStageId).to.equal(
      PROMPT_DISCUSSION_CLIENT_ID
    );
    expect(updatedRoom?.gameData.globalStateData.curStepId).to.equal("2");
    expect(updatedRoom?.gameData.chat[4].message).to.equal(
      "Welcome to the prompt discussion"
    );
    expect(updatedRoom?.gameData.chat[5].message).to.equal(
      "What is your prompt?"
    );

    // Send our message to the room for the request user input prompt step.
    const sendMessageForPrompt = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        query: sendMessageToGameRoomMutation,
        variables: {
          roomId: newRoomId,
          message: "My Prompt Input",
          sessionId: "session1",
        },
      });
    expect(sendMessageForPrompt.status).to.equal(200);
    expect(sendMessageForPrompt.body.data.sendMessageToGameRoom).to.exist;

    // ENSURE users message is added to the chat log
    const roomAfterPromptMessage = await RoomModel.findById(newRoomId);
    expect(roomAfterPromptMessage?.gameData.chat[6].message).to.equal(
      "My Prompt Input"
    );
    expect(roomAfterPromptMessage?.gameData.chat[6].senderId).to.equal(
      player1Id
    );
    // Send another ping to the process endpoint to process the complete prompt step and continue processing the steps up to the next request user input step (which will be the conditional stage).
    // Set up the LLM request mock, this will be called when the prompt step is processed.
    syncLlmRequestStub.onFirstCall().resolves({
      answer: JSON.stringify({
        prompt_response: "Mocked analysis of the prompt",
      }),
    } as AiServicesResponseTypes);

    const pingGameRoomToProcessConditional = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        query: pingGameRoomProcessMutation,
        variables: {
          roomId: newRoomId,
          sessionId: "session1",
        },
      });

    // ENSURE promptText sent in request gets updated with {{user_input_prompt}}
    expect(
      syncLlmRequestStub.calledWithMatch({
        prompts: [
          {
            promptText: "Process the users prompt: My Prompt Input",
            promptRole: PromptRoles.SYSTEM as any,
          },
        ],
      })
    ).to.be.true;

    const roomAfterProcessingPrompt: Room | null = await RoomModel.findById(
      newRoomId
    );

    // ENSURE that prompt_response gets added to the global state data.
    const globalGameStateData =
      roomAfterProcessingPrompt?.gameData.globalStateData.gameStateData;
    const promptResponse = globalGameStateData?.["prompt_response"];
    expect(promptResponse).to.equal("Mocked analysis of the prompt");

    // ENSURE that the prompt_response gets sent as a system message
    expect(roomAfterProcessingPrompt?.gameData.chat[7].message).to.equal(
      "Mocked analysis of the prompt"
    );
    expect(roomAfterProcessingPrompt?.gameData.chat[7].sender).to.equal(
      SenderType.SYSTEM
    );

    // Conditional Stage:
    // ENSURE moved on to conditional stage request user input step
    expect(
      roomAfterProcessingPrompt?.gameData.globalStateData.curStageId
    ).to.equal(CONDITIONAL_DISCUSSION_CLIENT_ID);
    expect(
      roomAfterProcessingPrompt?.gameData.globalStateData.curStepId
    ).to.equal("2");
    // ENSURE conditional stage intro messages are sent up to the request user input step.
    expect(roomAfterProcessingPrompt?.gameData.chat[8].message).to.equal(
      "Welcome to the conditional discussion"
    );
    expect(roomAfterProcessingPrompt?.gameData.chat[9].message).to.equal(
      "Please enter number 1 or 2"
    );

    // Send user message to the room, should add the message to the chat log
    const sendMessageToConditional = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        query: sendMessageToGameRoomMutation,
        variables: {
          roomId: newRoomId,
          message: "1",
          sessionId: "session1",
        },
      });
    expect(sendMessageToConditional.status).to.equal(200);
    expect(sendMessageToConditional.body.data.sendMessageToGameRoom).to.exist;

    // ENSURE users message is added to the chat log
    const roomAfterConditional = await RoomModel.findById(newRoomId);
    expect(roomAfterConditional?.gameData.chat[10].message).to.equal("1");
    expect(roomAfterConditional?.gameData.chat[10].senderId).to.equal(
      player1Id
    );

    // ENSURE user_input_number is saved to discussion data
    const dicussionData =
      roomAfterConditional?.gameData.globalStateData.discussionData || {};
    const userInputNumber = dicussionData.user_input_number;
    expect(userInputNumber).to.equal("1");

    // Send another ping to the process endpoint to process the complete conditional step and continue processing the steps up to the next request user input step (which will be BACK to the request user input stage).

    const pingGameRoomToProcessConditionalStage = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        query: pingGameRoomProcessMutation,
        variables: {
          roomId: newRoomId,
          sessionId: "session1",
        },
      });
    const roomAfterProcessingConditional: Room | null =
      await RoomModel.findById(newRoomId);

    // ENSURE that we get the correct response message based on the input number.
    expect(roomAfterProcessingConditional?.gameData.chat[11].message).to.equal(
      "You entered number 1"
    );

    // ENSURE final message is sent
    expect(roomAfterProcessingConditional?.gameData.chat[12].message).to.equal(
      "Thank you for playing!"
    );

    // Now loops back to request user input stage. Test again to ensure that we can do re-runs:
    expect(
      roomAfterProcessingConditional?.gameData.globalStateData.curStageId
    ).to.equal(REQUEST_USER_INPUT_DISCUSSION_CLIENT_ID);
    expect(
      roomAfterProcessingConditional?.gameData.globalStateData.curStepId
    ).to.equal("2");
    expect(roomAfterProcessingConditional?.gameData.chat[13].message).to.equal(
      "Welcome to the request user input discussion"
    );
    expect(roomAfterProcessingConditional?.gameData.chat[14].message).to.equal(
      "What is your name?"
    );
    expect(roomAfterProcessingConditional?.gameData.chat.length).to.equal(15);

    const sendNameMessageAgain = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        query: sendMessageToGameRoomMutation,
        variables: {
          roomId: newRoomId,
          message: "Jane Doe",
          sessionId: "session1",
        },
      });
    expect(sendNameMessageAgain.status).to.equal(200);
    expect(sendNameMessageAgain.body.data.sendMessageToGameRoom).to.exist;

    const roomAfterNameMessage = await RoomModel.findById(newRoomId);
    expect(roomAfterNameMessage?.gameData.chat[15].message).to.equal(
      "Jane Doe"
    );
    expect(roomAfterNameMessage?.gameData.chat[15].senderId).to.equal(
      player1Id
    );

    const pingGameToProcessRequestUserInputStageAgain = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        query: pingGameRoomProcessMutation,
        variables: {
          roomId: newRoomId,
          sessionId: "session1",
        },
      });
    const roomAfterProcessingRequestUserInputStageAgain: Room | null =
      await RoomModel.findById(newRoomId);
    expect(
      roomAfterProcessingRequestUserInputStageAgain?.gameData.chat[16].message
    ).to.equal("Hello, Jane Doe!");
    expect(
      roomAfterProcessingRequestUserInputStageAgain?.gameData.chat[16].sender
    ).to.equal(SenderType.SYSTEM);

    // Then to the prompt stage again:
    expect(
      roomAfterProcessingRequestUserInputStageAgain?.gameData.globalStateData
        .curStageId
    ).to.equal(PROMPT_DISCUSSION_CLIENT_ID);
    expect(
      roomAfterProcessingRequestUserInputStageAgain?.gameData.globalStateData
        .curStepId
    ).to.equal("2");
    expect(
      roomAfterProcessingRequestUserInputStageAgain?.gameData.chat[17].message
    ).to.equal("Welcome to the prompt discussion");
    expect(
      roomAfterProcessingRequestUserInputStageAgain?.gameData.chat[18].message
    ).to.equal("What is your prompt?");
    expect(
      roomAfterProcessingRequestUserInputStageAgain?.gameData.chat.length
    ).to.equal(19);

    // Verify the stub was called
    expect(syncLlmRequestStub.called).to.be.true; // Should be false since we haven't hit a prompt step yet
  });

  it("multiple user room with steps that requireAllUserInputs", async () => {
    // 1: create 4 new students to track
    const ownerStudentId = new ObjectId().toString();
    const studentTwoId = new ObjectId().toString();
    const leavingStudentId = new ObjectId().toString();
    const lateStudentId = new ObjectId().toString();

    await createUser(ownerStudentId, UserRole.USER, EducationalRole.STUDENT);
    await createUser(studentTwoId, UserRole.USER, EducationalRole.STUDENT);
    await createUser(leavingStudentId, UserRole.USER, EducationalRole.STUDENT);
    await createUser(lateStudentId, UserRole.USER, EducationalRole.STUDENT);

    const ownerStudentToken = await getToken(
      ownerStudentId,
      UserRole.USER,
      EducationalRole.STUDENT
    );
    const studentTwoToken = await getToken(
      studentTwoId,
      UserRole.USER,
      EducationalRole.STUDENT
    );
    const leavingStudentToken = await getToken(
      leavingStudentId,
      UserRole.USER,
      EducationalRole.STUDENT
    );
    const lateStudentToken = await getToken(
      lateStudentId,
      UserRole.USER,
      EducationalRole.STUDENT
    );

    // 2: create a room with createNewGameRoomMutation for gameId "unit-test-multiple-users"
    const createNewGameRoomResponse = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${ownerStudentToken}`)
      .send({
        query: createNewGameRoomMutation,
        variables: {
          gameId: "unit-test-multiple-users",
        },
      });
    expect(createNewGameRoomResponse.status).to.equal(200);
    expect(createNewGameRoomResponse.body.data.createNewGameRoom).to.exist;
    const newRoomId = createNewGameRoomResponse.body.data.createNewGameRoom._id;

    // 3: add studentTwo and leavingStudent to the room with joinGameRoomMutation's
    const joinStudentTwoResponse = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${studentTwoToken}`)
      .send({
        query: joinGameRoomMutation,
        variables: {
          roomId: newRoomId,
        },
      });
    expect(joinStudentTwoResponse.status).to.equal(200);
    expect(joinStudentTwoResponse.body.data.joinGameRoom).to.exist;

    const joinLeavingStudentResponse = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${leavingStudentToken}`)
      .send({
        query: joinGameRoomMutation,
        variables: {
          roomId: newRoomId,
        },
      });
    expect(joinLeavingStudentResponse.status).to.equal(200);
    expect(joinLeavingStudentResponse.body.data.joinGameRoom).to.exist;

    // ENSURE all three students are in the room.
    let currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.players).to.have.length(3);
    expect(currentRoom?.gameData.players).to.include(ownerStudentId);
    expect(currentRoom?.gameData.players).to.include(studentTwoId);
    expect(currentRoom?.gameData.players).to.include(leavingStudentId);

    // ENSURE chat log only has up to the first request user input
    expect(currentRoom?.gameData.chat).to.have.length(2);
    expect(currentRoom?.gameData.chat[0].message).to.equal("Hello, everyone!");
    expect(currentRoom?.gameData.chat[1].message).to.equal(
      "What are your names?"
    );

    // ENSURE is on first request user input stage and step
    expect(currentRoom?.gameData.globalStateData.curStageId).to.equal(
      REQUIRE_ALL_USER_INPUTS_DISCUSSION_CLIENT_ID
    );
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("2");

    // 4: ping room process
    const firstPingResponse = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${ownerStudentToken}`)
      .send({
        query: pingGameRoomProcessMutation,
        variables: {
          roomId: newRoomId,
          sessionId: "session1",
        },
      });
    expect(firstPingResponse.status).to.equal(200);

    // ENSURE still on first request user input stage and step
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.globalStateData.curStageId).to.equal(
      REQUIRE_ALL_USER_INPUTS_DISCUSSION_CLIENT_ID
    );
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("2");

    // 5: ownerStudent send message + ping room process
    const ownerMessageResponse = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${ownerStudentToken}`)
      .send({
        query: sendMessageToGameRoomMutation,
        variables: {
          roomId: newRoomId,
          message: "Owner's first input",
          sessionId: "session1",
        },
      });
    expect(ownerMessageResponse.status).to.equal(200);

    const pingAfterOwnerMessage = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${ownerStudentToken}`)
      .send({
        query: pingGameRoomProcessMutation,
        variables: {
          roomId: newRoomId,
          sessionId: "session1",
        },
      });
    expect(pingAfterOwnerMessage.status).to.equal(200);

    // ENSURE message was added to the chat
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.chat[2].message).to.equal(
      "Owner's first input"
    );
    expect(currentRoom?.gameData.chat[2].senderId).to.equal(ownerStudentId);

    // ENSURE on the same stage and step because not all user inputs done
    expect(currentRoom?.gameData.globalStateData.curStageId).to.equal(
      REQUIRE_ALL_USER_INPUTS_DISCUSSION_CLIENT_ID
    );
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("2");

    // 6: studentTwo send message + ping room process
    const studentTwoMessageResponse = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${studentTwoToken}`)
      .send({
        query: sendMessageToGameRoomMutation,
        variables: {
          roomId: newRoomId,
          message: "Student Two's first input",
          sessionId: "session2",
        },
      });
    expect(studentTwoMessageResponse.status).to.equal(200);

    const pingAfterStudentTwoMessage = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${studentTwoToken}`)
      .send({
        query: pingGameRoomProcessMutation,
        variables: {
          roomId: newRoomId,
          sessionId: "session2",
        },
      });
    expect(pingAfterStudentTwoMessage.status).to.equal(200);

    // ENSURE message was added to the chat
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.chat[3].message).to.equal(
      "Student Two's first input"
    );
    expect(currentRoom?.gameData.chat[3].senderId).to.equal(studentTwoId);

    // ENSURE on the same stage and step because not all user inputs done
    expect(currentRoom?.gameData.globalStateData.curStageId).to.equal(
      REQUIRE_ALL_USER_INPUTS_DISCUSSION_CLIENT_ID
    );
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("2");

    // 7: leavingStudent send message + ping room process
    const leavingStudentMessageResponse = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${leavingStudentToken}`)
      .send({
        query: sendMessageToGameRoomMutation,
        variables: {
          roomId: newRoomId,
          message: "Leaving Student's first input",
          sessionId: "session3",
        },
      });
    expect(leavingStudentMessageResponse.status).to.equal(200);

    const pingAfterLeavingStudentMessage = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${leavingStudentToken}`)
      .send({
        query: pingGameRoomProcessMutation,
        variables: {
          roomId: newRoomId,
          sessionId: "session3",
        },
      });
    expect(pingAfterLeavingStudentMessage.status).to.equal(200);

    // ENSURE now on stage and step: "test-require-all-user-inputs-discussion-client-id" and "4"
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.globalStateData.curStageId).to.equal(
      REQUIRE_ALL_USER_INPUTS_DISCUSSION_CLIENT_ID
    );
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("4");

    // ENSURE messages were sent up to this stage
    expect(currentRoom?.gameData.chat[2].message).to.equal(
      "Owner's first input"
    );
    expect(currentRoom?.gameData.chat[3].message).to.equal(
      "Student Two's first input"
    );
    expect(currentRoom?.gameData.chat[4].message).to.equal(
      "Leaving Student's first input"
    );

    // 8: ownerStudent and studentTwo send message + process
    const ownerSecondMessageResponse = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${ownerStudentToken}`)
      .send({
        query: sendMessageToGameRoomMutation,
        variables: {
          roomId: newRoomId,
          message: "Owner's second input",
          sessionId: "session1",
        },
      });
    expect(ownerSecondMessageResponse.status).to.equal(200);

    const pingAfterOwnerSecondMessage = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${ownerStudentToken}`)
      .send({
        query: pingGameRoomProcessMutation,
        variables: {
          roomId: newRoomId,
          sessionId: "session1",
        },
      });
    expect(pingAfterOwnerSecondMessage.status).to.equal(200);

    const studentTwoSecondMessageResponse = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${studentTwoToken}`)
      .send({
        query: sendMessageToGameRoomMutation,
        variables: {
          roomId: newRoomId,
          message: "Student Two's second input",
          sessionId: "session2",
        },
      });
    expect(studentTwoSecondMessageResponse.status).to.equal(200);

    const pingAfterStudentTwoSecondMessage = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${studentTwoToken}`)
      .send({
        query: pingGameRoomProcessMutation,
        variables: {
          roomId: newRoomId,
          sessionId: "session2",
        },
      });
    expect(pingAfterStudentTwoSecondMessage.status).to.equal(200);

    // ENSURE on same stage and step
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.globalStateData.curStageId).to.equal(
      REQUIRE_ALL_USER_INPUTS_DISCUSSION_CLIENT_ID
    );
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("4");

    // 9: leavingStudent leaves room with leaveGameRoomMutation
    const leaveRoomResponse = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${leavingStudentToken}`)
      .send({
        query: leaveGameRoomMutation,
        variables: {
          roomId: newRoomId,
        },
      });
    expect(leaveRoomResponse.status).to.equal(200);
    expect(leaveRoomResponse.body.data.leaveGameRoom).to.exist;

    const pingForLeaveRoom = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${ownerStudentToken}`)
      .send({
        query: pingGameRoomProcessMutation,
        variables: {
          roomId: newRoomId,
          sessionId: "session1",
        },
      });
    expect(pingForLeaveRoom.status).to.equal(200);
    // ENSURE we have now moved on to the next request user input stage
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.players).to.have.length(2);
    expect(currentRoom?.gameData.players).to.not.include(leavingStudentId);
    expect(currentRoom?.gameData.globalStateData.curStageId).to.equal(
      REQUIRE_ALL_USER_INPUTS_DISCUSSION_CLIENT_ID
    );
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("2");

    // 10: sendMessage from ownerStudent
    const ownerThirdMessageResponse = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${ownerStudentToken}`)
      .send({
        query: sendMessageToGameRoomMutation,
        variables: {
          roomId: newRoomId,
          message: "Owner's third input",
          sessionId: "session1",
        },
      });
    expect(ownerThirdMessageResponse.status).to.equal(200);

    // 11: add lateStudent to room with joinGameRoomMutation
    const joinLateStudentResponse = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${lateStudentToken}`)
      .send({
        query: joinGameRoomMutation,
        variables: {
          roomId: newRoomId,
        },
      });
    expect(joinLateStudentResponse.status).to.equal(200);
    expect(joinLateStudentResponse.body.data.joinGameRoom).to.exist;

    // ENSURE lateStudent is now in the room
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.players).to.have.length(3);
    expect(currentRoom?.gameData.players).to.include(lateStudentId);

    // 12: sendMessage from studentTwo
    const studentTwoThirdMessageResponse = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${studentTwoToken}`)
      .send({
        query: sendMessageToGameRoomMutation,
        variables: {
          roomId: newRoomId,
          message: "Student Two's third input",
          sessionId: "session2",
        },
      });
    expect(studentTwoThirdMessageResponse.status).to.equal(200);

    const pingAfterStudentTwoThirdMessage = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${studentTwoToken}`)
      .send({
        query: pingGameRoomProcessMutation,
        variables: {
          roomId: newRoomId,
          sessionId: "session2",
        },
      });
    expect(pingAfterStudentTwoThirdMessage.status).to.equal(200);

    // ENSURE we are still on the same stage because now we also need lateStudent's message
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.globalStateData.curStageId).to.equal(
      REQUIRE_ALL_USER_INPUTS_DISCUSSION_CLIENT_ID
    );
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("2");

    // 13: sendMessage from lateStudent
    const lateStudentMessageResponse = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${lateStudentToken}`)
      .send({
        query: sendMessageToGameRoomMutation,
        variables: {
          roomId: newRoomId,
          message: "Late Student's first input",
          sessionId: "session4",
        },
      });
    expect(lateStudentMessageResponse.status).to.equal(200);

    const pingAfterLateStudentMessage = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${lateStudentToken}`)
      .send({
        query: pingGameRoomProcessMutation,
        variables: {
          roomId: newRoomId,
          sessionId: "session4",
        },
      });
    expect(pingAfterLateStudentMessage.status).to.equal(200);

    // ENSURE moved on to next step and stage
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.globalStateData.curStageId).to.equal(
      REQUIRE_ALL_USER_INPUTS_DISCUSSION_CLIENT_ID
    );
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("4");
  });

  it("process locking handles fast requests", async () => {
    syncLlmRequestStub.onFirstCall().callsFake(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            answer: JSON.stringify({
              prompt_response: "Mocked analysis of the prompt",
            }),
          } as AiServicesResponseTypes);
        }, 1000); // 1 second
      });
    });

    // 1: Setup room to position of request user input --> prompt step
    const userToken = await getToken(
      player1Id,
      UserRole.USER,
      EducationalRole.STUDENT
    );
    const createNewGameRoomResponse = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        query: createNewGameRoomMutation,
        variables: {
          gameId: "unit-test",
        },
      });
    expect(createNewGameRoomResponse.status).to.equal(200);
    expect(createNewGameRoomResponse.body.data.createNewGameRoom).to.exist;

    const sendMessageResponse = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        query: sendMessageToGameRoomMutation,
        variables: {
          roomId: createNewGameRoomResponse.body.data.createNewGameRoom._id,
          message: "Test message",
          sessionId: "session1",
        },
      });
    expect(sendMessageResponse.status).to.equal(200);
    expect(sendMessageResponse.body.data.sendMessageToGameRoom).to.exist;

    const processedFirstRequestUserInputStepResponse = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        query: pingGameRoomProcessMutation,
        variables: {
          roomId: createNewGameRoomResponse.body.data.createNewGameRoom._id,
          sessionId: "session1",
        },
      });
    expect(processedFirstRequestUserInputStepResponse.status).to.equal(200);
    expect(
      processedFirstRequestUserInputStepResponse.body.data.pingGameRoomProcess
    ).to.exist;

    // ENSURE we are at request user input --> prompt step
    const roomAfterProcessedFirstRequestUserInputStep =
      await RoomModel.findById(
        createNewGameRoomResponse.body.data.createNewGameRoom._id
      );
    expect(
      roomAfterProcessedFirstRequestUserInputStep?.gameData.globalStateData
        .curStageId
    ).to.equal(PROMPT_DISCUSSION_CLIENT_ID);
    expect(
      roomAfterProcessedFirstRequestUserInputStep?.gameData.globalStateData
        .curStepId
    ).to.equal("2");

    // Send message to the room for the prompt step
    const sendMessageForPromptResponse = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        query: sendMessageToGameRoomMutation,
        variables: {
          roomId: createNewGameRoomResponse.body.data.createNewGameRoom._id,
          message: "Test message",
          sessionId: "session1",
        },
      });
    expect(sendMessageForPromptResponse.status).to.equal(200);
    expect(sendMessageForPromptResponse.body.data.sendMessageToGameRoom).to
      .exist;

    // ENSURE we are still at prompt step
    const roomAfterProcessedPromptStep = await RoomModel.findById(
      createNewGameRoomResponse.body.data.createNewGameRoom._id
    );
    expect(
      roomAfterProcessedPromptStep?.gameData.globalStateData.curStageId
    ).to.equal(PROMPT_DISCUSSION_CLIENT_ID);
    expect(
      roomAfterProcessedPromptStep?.gameData.globalStateData.curStepId
    ).to.equal("2");

    // Now send 3 pings in parallel to the process endpoint, and make sure things are still stabilized after
    const pingGameRoomProcessResponses = await Promise.all([
      request(app)
        .post("/graphql")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          query: pingGameRoomProcessMutation,
          variables: {
            roomId: createNewGameRoomResponse.body.data.createNewGameRoom._id,
            sessionId: "session1",
          },
        }),
      request(app)
        .post("/graphql")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          query: pingGameRoomProcessMutation,
          variables: {
            roomId: createNewGameRoomResponse.body.data.createNewGameRoom._id,
            sessionId: "session1",
          },
        }),
      request(app)
        .post("/graphql")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          query: pingGameRoomProcessMutation,
          variables: {
            roomId: createNewGameRoomResponse.body.data.createNewGameRoom._id,
            sessionId: "session1",
          },
        }),
    ]);
    expect(
      pingGameRoomProcessResponses.every((response) => response.status === 200)
    ).to.be.true;

    const roomAfterPings = await RoomModel.findById(
      createNewGameRoomResponse.body.data.createNewGameRoom._id
    );
    expect(roomAfterPings?.gameData.globalStateData.curStageId).to.equal(
      CONDITIONAL_DISCUSSION_CLIENT_ID
    );
    expect(roomAfterPings?.gameData.globalStateData.curStepId).to.equal("2");
  });

  it("simulation room lifecycle", async () => {
    const studentUserId = new ObjectId().toString();
    await createUser(studentUserId, UserRole.USER, EducationalRole.STUDENT);
    const studentAccessToken = await getToken(
      studentUserId,
      UserRole.USER,
      EducationalRole.STUDENT
    );

    // 1. Create room for unit-test-simulation game
    const createRoomResponse = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${studentAccessToken}`)
      .send({
        query: createNewGameRoomMutation,
        variables: {
          gameId: "unit-test-simulation",
        },
      });
    expect(createRoomResponse.status).to.equal(200);
    expect(createRoomResponse.body.data.createNewGameRoom).to.exist;
    const roomId = createRoomResponse.body.data.createNewGameRoom._id;

    // 2. Join the room.
    const joinRoomResponse = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${studentAccessToken}`)
      .send({
        query: joinGameRoomMutation,
        variables: {
          roomId: roomId,
        },
      });
    expect(joinRoomResponse.status).to.equal(200);
    expect(joinRoomResponse.body.data.joinGameRoom).to.exist;

    // ENSURE room is in TEST_SIMULATION_DISCUSSION_CLIENT_ID stage and step "1"
    let currentRoom = await RoomModel.findById(roomId);
    expect(currentRoom?.gameData.globalStateData.curStageId).to.equal(
      TEST_SIMULATION_DISCUSSION_CLIENT_ID
    );
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("1");

    // 3. send user message + call room process
    const sendMessageResponse = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${studentAccessToken}`)
      .send({
        query: sendMessageToGameRoomMutation,
        variables: {
          roomId: roomId,
          message: "User input for simulation",
          sessionId: "session1",
        },
      });
    expect(sendMessageResponse.status).to.equal(200);

    const pingResponse = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${studentAccessToken}`)
      .send({
        query: pingGameRoomProcessMutation,
        variables: {
          roomId: roomId,
          sessionId: "session1",
        },
      });
    expect(pingResponse.status).to.equal(200);

    // ENSURE user message got added to room
    currentRoom = await RoomModel.findById(roomId);
    expect(currentRoom?.gameData.chat).to.have.length(2);
    const userMessage = currentRoom?.gameData.chat[1];
    expect(userMessage).to.exist;
    expect(userMessage?.senderId).to.equal(studentUserId);

    // ENSURE room is in stage "wait-for-simulation" stage and step "wait-for-simulation"
    expect(currentRoom?.gameData.globalStateData.curStageId).to.equal(
      "wait-for-simulation"
    );
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal(
      "wait-for-simulation"
    );

    // 4. call viewGameRoomSimulationMutation for user in room + call room process
    const viewSimulationResponse = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${studentAccessToken}`)
      .send({
        query: viewGameRoomSimulationMutation,
        variables: {
          roomId: roomId,
        },
      });
    expect(viewSimulationResponse.status).to.equal(200);

    const pingAfterSimulationResponse = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${studentAccessToken}`)
      .send({
        query: pingGameRoomProcessMutation,
        variables: {
          roomId: roomId,
          sessionId: "session1",
        },
      });
    expect(pingAfterSimulationResponse.status).to.equal(200);

    // ENSURE getSimulationViewedKey in the playersGameStateData exists and is set to "true"
    currentRoom = await RoomModel.findById(roomId);
    const simulationViewedKey = getSimulationViewedKey(
      WAIT_FOR_SIMULATION_STAGE_CLIENT_ID
    );
    expect(
      currentRoom?.gameData.playersGameStateData[studentUserId][
        simulationViewedKey
      ]
    ).to.equal("true");

    // ENSURE we are now back to stage TEST_SIMULATION_DISCUSSION_CLIENT_ID and step "1"
    expect(currentRoom?.gameData.globalStateData.curStageId).to.equal(
      TEST_SIMULATION_DISCUSSION_CLIENT_ID
    );
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("1");
  });
});
