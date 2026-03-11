/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import createApp, { appStart, appStop } from "../../../src/app";
import { expect } from "chai";
import { Express } from "express";
import mongoUnit from "mongo-unit";
import request from "supertest";
import { player1Id } from "../../fixtures/mongodb/data";
import { assertSuccessfullGqlResponse, createUser } from "../../helpers";
import mongoose from "mongoose";
const { ObjectId } = mongoose.Types;
import RoomModel, { Room } from "../../../src/schemas/models/Room";
import {
  PlayerComputedState,
  PromptRoles,
  UserRole,
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
import { TEST_END_OF_PHASE_REFLECTION_CLIENT_ID } from "../../../src/authoritative-server/games/unit-test-end-of-phase";
import { getSimulationViewedKey } from "../../../src/authoritative-server/authority/helpers/helpers";
import GamePhaseReflectionsModel from "../../../src/schemas/models/GamePhaseReflections";
import sinon from "sinon";
import * as llmRequest from "../../../src/authoritative-server/llm-request/llm-request";
import { AiServicesResponseTypes } from "../../../src/authoritative-server/llm-request/ai-services/ai-service-types";
import { SenderType } from "../../../src/authoritative-server/llm-request/types";
import { WAIT_FOR_SIMULATION_STAGE_CLIENT_ID } from "../../../src/authoritative-server/games/game-helpers";
import { RequireInputType } from "../../../src/schemas/models/DiscussionStage/objects";
import DiscussionStageModel from "../../../src/schemas/models/DiscussionStage/DiscussionStage";
import {
  createNewGameRoom,
  joinGameRoom,
  pingRoomProcess,
  sendMessageToGameRoom,
  leaveGameRoom,
  reportPlayerAway,
  clearAwayStatus,
  pausePlayer,
  unpausePlayer,
  submitGamePhaseReflection,
  submitReadyToContinue,
  viewGameRoomSimulation,
} from "./helpers/game_room_controllers";

describe.only("full room lifecycle", () => {
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
    const createNewGameRoomResponse = await createNewGameRoom(
      app,
      "unit-test",
      userToken
    );
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
    // Check that the rooms curGameState is set correctly.
    expect(newRoom?.gameData.curGameState.curState).to.equal(
      RequireInputType.SINGLE_RESPONSE_REQUIRED
    );
    expect(newRoom?.gameData.curGameState.playersLeftToRespond).to.deep.equal(
      []
    );

    // 3. Send a message to the room, should add the message to the chat log
    const sendMessageToGameRoomResponse = await sendMessageToGameRoom(
      app,
      newRoomId,
      "Jonny Appleseed",
      "session1",
      userToken
    );
    expect(sendMessageToGameRoomResponse.status).to.equal(200);
    expect(sendMessageToGameRoomResponse.body.data.sendMessageToGameRoom).to
      .exist;

    // Should have added the message to the chat log
    let updatedRoom = (await RoomModel.findById(newRoomId))?.toObject();
    expect(updatedRoom?.gameData.chat).to.have.length(3);
    expect(updatedRoom?.gameData.chat[2].message).to.equal("Jonny Appleseed");

    // Send a ping to the process endpoint to process the complete request user input step and continue processing the steps up to the next request user input step (which will be the prompt step).
    const pingGameRoomProcessResponse = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      userToken
    );
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
    const sendMessageForPrompt = await sendMessageToGameRoom(
      app,
      newRoomId,
      "My Prompt Input",
      "session1",
      userToken
    );
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

    const pingGameRoomToProcessConditional = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      userToken
    );

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

    console.log(JSON.stringify(globalGameStateData, null, 2));
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
    const sendMessageToConditional = await sendMessageToGameRoom(
      app,
      newRoomId,
      "1",
      "session1",
      userToken
    );
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

    const pingGameRoomToProcessConditionalStage = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      userToken
    );
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

    const sendNameMessageAgain = await sendMessageToGameRoom(
      app,
      newRoomId,
      "Jane Doe",
      "session1",
      userToken
    );
    expect(sendNameMessageAgain.status).to.equal(200);
    expect(sendNameMessageAgain.body.data.sendMessageToGameRoom).to.exist;

    const roomAfterNameMessage = await RoomModel.findById(newRoomId);
    expect(roomAfterNameMessage?.gameData.chat[15].message).to.equal(
      "Jane Doe"
    );
    expect(roomAfterNameMessage?.gameData.chat[15].senderId).to.equal(
      player1Id
    );

    const pingGameToProcessRequestUserInputStageAgain = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      userToken
    );
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
    const createNewGameRoomResponse = await createNewGameRoom(
      app,
      "unit-test-multiple-users",
      ownerStudentToken
    );
    expect(createNewGameRoomResponse.status).to.equal(200);
    expect(createNewGameRoomResponse.body.data.createNewGameRoom).to.exist;
    const newRoomId = createNewGameRoomResponse.body.data.createNewGameRoom._id;

    // ENSURE the room is in the correct state after creation
    let currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.curGameState.curState).to.equal(
      RequireInputType.ALL_USER_RESPONSES_REQUIRED_FREE_FOR_ALL
    );
    expect(
      currentRoom?.gameData.curGameState.playersLeftToRespond
    ).to.deep.equal([ownerStudentId]);

    // 3: add studentTwo and leavingStudent to the room with joinGameRoomMutation's
    const joinStudentTwoResponse = await joinGameRoom(
      app,
      newRoomId,
      studentTwoToken
    );
    expect(joinStudentTwoResponse.status).to.equal(200);
    expect(joinStudentTwoResponse.body.data.joinGameRoom).to.exist;

    const joinLeavingStudentResponse = await joinGameRoom(
      app,
      newRoomId,
      leavingStudentToken
    );
    expect(joinLeavingStudentResponse.status).to.equal(200);
    expect(joinLeavingStudentResponse.body.data.joinGameRoom).to.exist;

    // ENSURE all three students are in the room.
    currentRoom = await RoomModel.findById(newRoomId);
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
    const firstPingResponse = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      ownerStudentToken
    );
    expect(firstPingResponse.status).to.equal(200);

    // ENSURE the room now expects responses from all three students
    currentRoom = await RoomModel.findById(newRoomId);
    expect(
      currentRoom?.gameData.curGameState.playersLeftToRespond
    ).to.deep.equal([ownerStudentId, studentTwoId, leavingStudentId]);

    // ENSURE still on first request user input stage and step
    expect(currentRoom?.gameData.globalStateData.curStageId).to.equal(
      REQUIRE_ALL_USER_INPUTS_DISCUSSION_CLIENT_ID
    );
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("2");

    // 5: ownerStudent send message + ping room process
    const ownerMessageResponse = await sendMessageToGameRoom(
      app,
      newRoomId,
      "Owner's first input",
      "session1",
      ownerStudentToken
    );
    expect(ownerMessageResponse.status).to.equal(200);

    const pingAfterOwnerMessage = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      ownerStudentToken
    );
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

    // ENSURE the room now expects responses from the two remaining students
    expect(
      currentRoom?.gameData.curGameState.playersLeftToRespond
    ).to.deep.equal([studentTwoId, leavingStudentId]);

    // 6: studentTwo send message + ping room process
    const studentTwoMessageResponse = await sendMessageToGameRoom(
      app,
      newRoomId,
      "Student Two's first input",
      "session2",
      studentTwoToken
    );
    expect(studentTwoMessageResponse.status).to.equal(200);

    const pingAfterStudentTwoMessage = await pingRoomProcess(
      app,
      newRoomId,
      "session2",
      studentTwoToken
    );
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

    // ENSURE the room now expects response from the last student
    expect(
      currentRoom?.gameData.curGameState.playersLeftToRespond
    ).to.deep.equal([leavingStudentId]);

    // 7: leavingStudent send message + ping room process
    const leavingStudentMessageResponse = await sendMessageToGameRoom(
      app,
      newRoomId,
      "Leaving Student's first input",
      "session3",
      leavingStudentToken
    );
    expect(leavingStudentMessageResponse.status).to.equal(200);

    const pingAfterLeavingStudentMessage = await pingRoomProcess(
      app,
      newRoomId,
      "session3",
      leavingStudentToken
    );
    expect(pingAfterLeavingStudentMessage.status).to.equal(200);

    // ENSURE now on stage and step: "test-require-all-user-inputs-discussion-client-id" and "4"
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.globalStateData.curStageId).to.equal(
      REQUIRE_ALL_USER_INPUTS_DISCUSSION_CLIENT_ID
    );
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("4");

    // ENSURE the room once against expects response from all students from this new stage
    expect(
      currentRoom?.gameData.curGameState.playersLeftToRespond
    ).to.deep.equal([ownerStudentId, studentTwoId, leavingStudentId]);

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
    const ownerSecondMessageResponse = await sendMessageToGameRoom(
      app,
      newRoomId,
      "Owner's second input",
      "session1",
      ownerStudentToken
    );
    expect(ownerSecondMessageResponse.status).to.equal(200);

    const pingAfterOwnerSecondMessage = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      ownerStudentToken
    );
    expect(pingAfterOwnerSecondMessage.status).to.equal(200);

    const studentTwoSecondMessageResponse = await sendMessageToGameRoom(
      app,
      newRoomId,
      "Student Two's second input",
      "session2",
      studentTwoToken
    );
    expect(studentTwoSecondMessageResponse.status).to.equal(200);

    const pingAfterStudentTwoSecondMessage = await pingRoomProcess(
      app,
      newRoomId,
      "session2",
      studentTwoToken
    );
    expect(pingAfterStudentTwoSecondMessage.status).to.equal(200);

    // ENSURE on same stage and step
    currentRoom = await RoomModel.findById(newRoomId);

    expect(currentRoom?.gameData.globalStateData.curStageId).to.equal(
      REQUIRE_ALL_USER_INPUTS_DISCUSSION_CLIENT_ID
    );
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("4");

    // ENSURE the room expects a response from just the leave room studnet (last studnet)
    expect(
      currentRoom?.gameData.curGameState.playersLeftToRespond
    ).to.deep.equal([leavingStudentId]);

    // 9: leavingStudent leaves room with leaveGameRoomMutation
    const leaveRoomResponse = await leaveGameRoom(
      app,
      newRoomId,
      leavingStudentToken
    );
    expect(leaveRoomResponse.status).to.equal(200);
    expect(leaveRoomResponse.body.data.leaveGameRoom).to.exist;

    const pingForLeaveRoom = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      ownerStudentToken
    );
    expect(pingForLeaveRoom.status).to.equal(200);
    // ENSURE we have now moved on to the next request user input stage
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.players).to.have.length(2);
    expect(currentRoom?.gameData.players).to.not.include(leavingStudentId);
    expect(currentRoom?.gameData.globalStateData.curStageId).to.equal(
      REQUIRE_ALL_USER_INPUTS_DISCUSSION_CLIENT_ID
    );
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("2");

    // ENSURE the room expects a response from remaining students
    expect(
      currentRoom?.gameData.curGameState.playersLeftToRespond
    ).to.deep.equal([ownerStudentId, studentTwoId]);

    // 10: sendMessage from ownerStudent
    const ownerThirdMessageResponse = await sendMessageToGameRoom(
      app,
      newRoomId,
      "Owner's third input",
      "session1",
      ownerStudentToken
    );
    expect(ownerThirdMessageResponse.status).to.equal(200);

    // 11: add lateStudent to room with joinGameRoomMutation
    const joinLateStudentResponse = await joinGameRoom(
      app,
      newRoomId,
      lateStudentToken
    );
    expect(joinLateStudentResponse.status).to.equal(200);
    expect(joinLateStudentResponse.body.data.joinGameRoom).to.exist;

    // ENSURE lateStudent is now in the room
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.players).to.have.length(3);
    expect(currentRoom?.gameData.players).to.include(lateStudentId);

    // 12: sendMessage from studentTwo
    const studentTwoThirdMessageResponse = await sendMessageToGameRoom(
      app,
      newRoomId,
      "Student Two's third input",
      "session2",
      studentTwoToken
    );
    expect(studentTwoThirdMessageResponse.status).to.equal(200);

    const pingAfterStudentTwoThirdMessage = await pingRoomProcess(
      app,
      newRoomId,
      "session2",
      studentTwoToken
    );
    expect(pingAfterStudentTwoThirdMessage.status).to.equal(200);

    // ENSURE we are still on the same stage because now we also need lateStudent's message
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.globalStateData.curStageId).to.equal(
      REQUIRE_ALL_USER_INPUTS_DISCUSSION_CLIENT_ID
    );
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("2");

    // ENSURE the room expects a response from the late student (last student response needed)
    expect(
      currentRoom?.gameData.curGameState.playersLeftToRespond
    ).to.deep.equal([lateStudentId]);

    // 13: sendMessage from lateStudent
    const lateStudentMessageResponse = await sendMessageToGameRoom(
      app,
      newRoomId,
      "Late Student's first input",
      "session4",
      lateStudentToken
    );
    expect(lateStudentMessageResponse.status).to.equal(200);

    const pingAfterLateStudentMessage = await pingRoomProcess(
      app,
      newRoomId,
      "session4",
      lateStudentToken
    );
    expect(pingAfterLateStudentMessage.status).to.equal(200);

    // ENSURE moved on to next step and stage
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.globalStateData.curStageId).to.equal(
      REQUIRE_ALL_USER_INPUTS_DISCUSSION_CLIENT_ID
    );
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("4");

    // ENSURE the room expects a response from all students
    expect(
      currentRoom?.gameData.curGameState.playersLeftToRespond
    ).to.deep.equal([ownerStudentId, studentTwoId, lateStudentId]);
  });

  it("player statuses enforced and set correctly", async () => {
    // 1: create 4 new students to track
    const ownerStudentId = new ObjectId().toString();
    const studentTwoId = new ObjectId().toString();
    const instructorId = new ObjectId().toString();

    await createUser(ownerStudentId, UserRole.USER, EducationalRole.STUDENT);
    await createUser(studentTwoId, UserRole.USER, EducationalRole.STUDENT);
    await createUser(instructorId, UserRole.USER, EducationalRole.INSTRUCTOR);

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
    const instructorToken = await getToken(
      instructorId,
      UserRole.USER,
      EducationalRole.INSTRUCTOR
    );

    // 2: create a room with createNewGameRoomMutation for gameId "unit-test-multiple-users"
    const createNewGameRoomResponse = await createNewGameRoom(
      app,
      "unit-test-multiple-users",
      ownerStudentToken
    );
    expect(createNewGameRoomResponse.status).to.equal(200);
    expect(createNewGameRoomResponse.body.data.createNewGameRoom).to.exist;
    const newRoomId = createNewGameRoomResponse.body.data.createNewGameRoom._id;

    // ENSURE the room is in the correct state after creation
    let currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.curGameState.curState).to.equal(
      RequireInputType.ALL_USER_RESPONSES_REQUIRED_FREE_FOR_ALL
    );
    expect(
      currentRoom?.gameData.curGameState.playersLeftToRespond
    ).to.deep.equal([ownerStudentId]);

    // ENSURE starting at correct stage and step
    expect(currentRoom?.gameData.globalStateData.curStageId).to.equal(
      REQUIRE_ALL_USER_INPUTS_DISCUSSION_CLIENT_ID
    );
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("2");

    // 3: add studentTwo to the room with joinGameRoomMutation
    const joinStudentTwoResponse = await joinGameRoom(
      app,
      newRoomId,
      studentTwoToken
    );
    expect(joinStudentTwoResponse.status).to.equal(200);
    expect(joinStudentTwoResponse.body.data.joinGameRoom).to.exist;

    // ENSURE that both users have their statuses initialized
    currentRoom = await RoomModel.findById(newRoomId);
    expect(
      currentRoom?.gameData.playersStatusRecord[ownerStudentId].computedState
    ).to.equal(PlayerComputedState.ACTIVE);
    expect(
      currentRoom?.gameData.playersStatusRecord[studentTwoId].computedState
    ).to.equal(PlayerComputedState.ACTIVE);

    // 4: ping the room from the owner student
    const pingRoomResponse = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      ownerStudentToken
    );
    expect(pingRoomResponse.status).to.equal(200);

    // ENSURE the owners heartbeat is > studentTwo's heartbeat, but both are active.
    currentRoom = await RoomModel.findById(newRoomId);
    expect(
      currentRoom?.gameData.playersStatusRecord[ownerStudentId].computedState
    ).to.equal(PlayerComputedState.ACTIVE);
    expect(
      currentRoom?.gameData.playersStatusRecord[studentTwoId].computedState
    ).to.equal(PlayerComputedState.ACTIVE);
    expect(
      currentRoom?.gameData.playersStatusRecord[ownerStudentId].lastHeartbeatAt
    ).to.be.greaterThan(
      currentRoom?.gameData.playersStatusRecord[studentTwoId].lastHeartbeatAt ||
        new Date(0)
    );

    // 5. set the studentTwo as away + ping
    const reportStudentTwoAwayResponse = await reportPlayerAway(
      app,
      newRoomId,
      studentTwoId,
      ownerStudentToken
    );
    expect(reportStudentTwoAwayResponse.status).to.equal(200);
    expect(reportStudentTwoAwayResponse.body.data.reportPlayerAway).to.exist;

    const pingAfterReportStudentTwoAway = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      ownerStudentToken
    );
    expect(pingAfterReportStudentTwoAway.status).to.equal(200);

    // ENSURE studentTwo's computed state is set as REPORTED_AWAY_BY_OTHER_PLAYER and isAway is set to true
    currentRoom = await RoomModel.findById(newRoomId);
    expect(
      currentRoom?.gameData.playersStatusRecord[studentTwoId].computedState
    ).to.equal(PlayerComputedState.REPORTED_AWAY_BY_OTHER_PLAYER);
    expect(
      currentRoom?.gameData.playersStatusRecord[studentTwoId].reportedAwayStatus
        .isAway
    ).to.be.true;

    // 6. send owner message + ping
    const ownerMessageResponse = await sendMessageToGameRoom(
      app,
      newRoomId,
      "Owner's first input",
      "session1",
      ownerStudentToken
    );
    expect(ownerMessageResponse.status).to.equal(200);

    const pingAfterOwnerMessage = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      ownerStudentToken
    );
    expect(pingAfterOwnerMessage.status).to.equal(200);

    // ENSURE has moved on to next require user input step since studentTwo is away, ignores requiring their message.
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("4");

    // 7. studentTwo clears their away status + ping
    const clearStudentTwoAwayStatusResponse = await clearAwayStatus(
      app,
      newRoomId,
      studentTwoId,
      ownerStudentToken
    );
    expect(clearStudentTwoAwayStatusResponse.status).to.equal(200);

    const pingAfterClearStudentTwoAwayStatus = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      ownerStudentToken
    );
    expect(pingAfterClearStudentTwoAwayStatus.status).to.equal(200);

    // ENSURE studentTwo isAway is false and is set to ACTIVE
    currentRoom = await RoomModel.findById(newRoomId);
    expect(
      currentRoom?.gameData.playersStatusRecord[studentTwoId].computedState
    ).to.equal(PlayerComputedState.ACTIVE);
    expect(
      currentRoom?.gameData.playersStatusRecord[studentTwoId].reportedAwayStatus
        .isAway
    ).to.be.false;

    // 8. send owner message + ping
    const ownerSecondMessageResponse = await sendMessageToGameRoom(
      app,
      newRoomId,
      "Owner's second input",
      "session1",
      ownerStudentToken
    );
    expect(ownerSecondMessageResponse.status).to.equal(200);

    const pingAfterOwnerSecondMessage = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      ownerStudentToken
    );
    expect(pingAfterOwnerSecondMessage.status).to.equal(200);

    // ENSURE still on same require user input step since studentTwo is back.
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("4");

    // 9. instructor pauses studentTwo + ping
    const pauseStudentTwoResponse = await pausePlayer(
      app,
      newRoomId,
      studentTwoId,
      instructorToken
    );
    expect(pauseStudentTwoResponse.status).to.equal(200);

    const pingAfterPauseStudentTwo = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      instructorToken
    );
    expect(pingAfterPauseStudentTwo.status).to.equal(200);

    // ENSURE has moved on to next require user input step since studentTwo is paused, ignores requiring their message.
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("2");

    // 10. instructor unpauses studentTwo + ping
    const unpauseStudentTwoResponse = await unpausePlayer(
      app,
      newRoomId,
      studentTwoId,
      instructorToken
    );
    expect(unpauseStudentTwoResponse.status).to.equal(200);

    const pingAfterUnpauseStudentTwo = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      instructorToken
    );
    expect(pingAfterUnpauseStudentTwo.status).to.equal(200);

    // ENSURE studentTwo is computedState is set to ACTIVE
    currentRoom = await RoomModel.findById(newRoomId);
    expect(
      currentRoom?.gameData.playersStatusRecord[studentTwoId].computedState
    ).to.equal(PlayerComputedState.ACTIVE);

    // 11. owner sends message + ping
    const ownerThirdMessageResponse = await sendMessageToGameRoom(
      app,
      newRoomId,
      "Owner's third input",
      "session1",
      ownerStudentToken
    );
    expect(ownerThirdMessageResponse.status).to.equal(200);

    const pingAfterOwnerThirdMessage = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      ownerStudentToken
    );
    expect(pingAfterOwnerThirdMessage.status).to.equal(200);

    // ENSURE still on same require user input step since studentTwo is unpaused.
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("2");

    // 12. studentTwo sends a message + ping
    const studentTwoThirdMessageResponse = await sendMessageToGameRoom(
      app,
      newRoomId,
      "Student Two's third input",
      "session2",
      studentTwoToken
    );
    expect(studentTwoThirdMessageResponse.status).to.equal(200);

    const pingAfterStudentTwoThirdMessage = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      studentTwoToken
    );
    expect(pingAfterStudentTwoThirdMessage.status).to.equal(200);

    // ENSURE moves on to next require user input step
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("4");

    // 13. manually set the heartbeat of studentTwo to 30 seconds ago + ping
    await RoomModel.updateOne(
      { _id: newRoomId },
      {
        $set: {
          [`gameData.playersStatusRecord.${studentTwoId}.lastHeartbeatAt`]:
            new Date(Date.now() - 30000),
        },
      },
      { new: true }
    );

    const pingAfterStudentTwoHeartbeatSet = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      ownerStudentToken
    );
    expect(pingAfterStudentTwoHeartbeatSet.status).to.equal(200);

    // ENSURE studentTwo is computedState is set to INACTIVE
    currentRoom = await RoomModel.findById(newRoomId);
    expect(
      currentRoom?.gameData.playersStatusRecord[studentTwoId].computedState
    ).to.equal(PlayerComputedState.INACTIVE);

    // 14. owner sends message + ping
    const ownerFourthMessageResponse = await sendMessageToGameRoom(
      app,
      newRoomId,
      "Owner's fourth input",
      "session1",
      ownerStudentToken
    );
    expect(ownerFourthMessageResponse.status).to.equal(200);

    const pingAfterOwnerFourthMessage = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      ownerStudentToken
    );
    expect(pingAfterOwnerFourthMessage.status).to.equal(200);

    // ENSURE moved on to next request user input step since studentTwo is INACTIVE
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("2");

    // 15. owner sends message + ping FROM STUDENT TWO
    const ownerFifthMessageResponse = await sendMessageToGameRoom(
      app,
      newRoomId,
      "Owner's fifth input",
      "session1",
      ownerStudentToken
    );
    expect(ownerFifthMessageResponse.status).to.equal(200);

    const pingFromStudentTwo = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      studentTwoToken
    );
    expect(pingFromStudentTwo.status).to.equal(200);

    // ENSURE we have NOT moved on since studentTwo has pinged, they should now be active again.
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("2");
    expect(
      currentRoom?.gameData.playersStatusRecord[studentTwoId].computedState
    ).to.equal(PlayerComputedState.ACTIVE);
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
    const createNewGameRoomResponse = await createNewGameRoom(
      app,
      "unit-test",
      userToken
    );
    expect(createNewGameRoomResponse.status).to.equal(200);
    expect(createNewGameRoomResponse.body.data.createNewGameRoom).to.exist;

    const sendMessageResponse = await sendMessageToGameRoom(
      app,
      createNewGameRoomResponse.body.data.createNewGameRoom._id,
      "Test message",
      "session1",
      userToken
    );
    expect(sendMessageResponse.status).to.equal(200);
    expect(sendMessageResponse.body.data.sendMessageToGameRoom).to.exist;

    const processedFirstRequestUserInputStepResponse = await pingRoomProcess(
      app,
      createNewGameRoomResponse.body.data.createNewGameRoom._id,
      "session1",
      userToken
    );
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
    const sendMessageForPromptResponse = await sendMessageToGameRoom(
      app,
      createNewGameRoomResponse.body.data.createNewGameRoom._id,
      "Test message",
      "session1",
      userToken
    );
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
      pingRoomProcess(
        app,
        createNewGameRoomResponse.body.data.createNewGameRoom._id,
        "session1",
        userToken
      ),
      pingRoomProcess(
        app,
        createNewGameRoomResponse.body.data.createNewGameRoom._id,
        "session1",
        userToken
      ),
      pingRoomProcess(
        app,
        createNewGameRoomResponse.body.data.createNewGameRoom._id,
        "session1",
        userToken
      ),
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
    const createRoomResponse = await createNewGameRoom(
      app,
      "unit-test-simulation",
      studentAccessToken
    );
    expect(createRoomResponse.status).to.equal(200);
    expect(createRoomResponse.body.data.createNewGameRoom).to.exist;

    // ENSURE the room is in the correct state after creation
    let currentRoom = await RoomModel.findById(
      createRoomResponse.body.data.createNewGameRoom._id
    );
    expect(currentRoom?.gameData.curGameState.curState).to.equal(
      RequireInputType.ALL_USER_RESPONSES_REQUIRED_FREE_FOR_ALL
    );
    expect(
      currentRoom?.gameData.curGameState.playersLeftToRespond
    ).to.deep.equal([studentUserId]);

    const roomId = createRoomResponse.body.data.createNewGameRoom._id;

    // 2. Join the room.
    const joinRoomResponse = await joinGameRoom(
      app,
      roomId,
      studentAccessToken
    );
    expect(joinRoomResponse.status).to.equal(200);
    expect(joinRoomResponse.body.data.joinGameRoom).to.exist;

    // ENSURE room is in TEST_SIMULATION_DISCUSSION_CLIENT_ID stage and step "1"
    currentRoom = await RoomModel.findById(roomId);
    expect(currentRoom?.gameData.globalStateData.curStageId).to.equal(
      TEST_SIMULATION_DISCUSSION_CLIENT_ID
    );
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("1");

    // 3. send user message + call room process
    const sendMessageResponse = await sendMessageToGameRoom(
      app,
      roomId,
      "User input for simulation",
      "session1",
      studentAccessToken
    );
    expect(sendMessageResponse.status).to.equal(200);

    const pingResponse = await pingRoomProcess(
      app,
      roomId,
      "session1",
      studentAccessToken
    );
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

    // ENSURE the room game state is set to WAITING_FOR_SIMULATION
    expect(currentRoom?.gameData.curGameState.curState).to.equal(
      "WAITING_FOR_SIMULATION"
    );

    // 4. call viewGameRoomSimulationMutation for user in room + call room process
    const viewSimulationResponse = await viewGameRoomSimulation(
      app,
      roomId,
      studentAccessToken
    );
    expect(viewSimulationResponse.status).to.equal(200);

    console.log("pinging room process");

    const pingAfterSimulationResponse = await pingRoomProcess(
      app,
      roomId,
      "session1",
      studentAccessToken
    );
    expect(pingAfterSimulationResponse.status).to.equal(200);
    expect(pingAfterSimulationResponse.body.data.pingGameRoomProcess).to.exist;

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

    // ENSURE the room game state is set to ALL_USER_RESPONSES_REQUIRED_FREE_FOR_ALL
    expect(currentRoom?.gameData.curGameState.curState).to.equal(
      RequireInputType.ALL_USER_RESPONSES_REQUIRED_FREE_FOR_ALL
    );
    expect(
      currentRoom?.gameData.curGameState.playersLeftToRespond
    ).to.deep.equal([studentUserId]);
  });

  it("end of phase reflection room lifecycle", async () => {
    // 1. Create new room for gameId: unit-test-end-of-phase
    const ownerStudentId = new ObjectId().toString();
    const studentTwoId = new ObjectId().toString();

    await createUser(ownerStudentId, UserRole.USER, EducationalRole.STUDENT);
    await createUser(studentTwoId, UserRole.USER, EducationalRole.STUDENT);

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

    const createNewGameRoomResponse = await createNewGameRoom(
      app,
      "unit-test-end-of-phase",
      ownerStudentToken
    );
    expect(createNewGameRoomResponse.status).to.equal(200);
    expect(createNewGameRoomResponse.body.data.createNewGameRoom).to.exist;
    const newRoomId = createNewGameRoomResponse.body.data.createNewGameRoom._id;

    // ENSURE phaseProgression is set correctly
    let currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.phaseProgression.phasesStarted).to.deep.equal([
      "0",
    ]);
    expect(
      currentRoom?.gameData.phaseProgression.phasesCompleted
    ).to.deep.equal([]);
    expect(currentRoom?.gameData.phaseProgression.curPhaseTitle).to.equal(
      "Start of Phase"
    );
    expect(currentRoom?.gameData.phaseProgression.curPhaseStepId).to.equal("0");

    // ENSURE at request user input step
    expect(currentRoom?.gameData.globalStateData.curStageId).to.equal(
      TEST_END_OF_PHASE_REFLECTION_CLIENT_ID
    );
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("1");
    expect(currentRoom?.gameData.curGameState.curState).to.equal(
      RequireInputType.SINGLE_RESPONSE_REQUIRED
    );
    expect(currentRoom?.gameData.chat).to.have.length(1);
    expect(currentRoom?.gameData.chat[0].message).to.equal(
      "Ready for reflection?"
    );

    // 2. send message from owner + ping
    const sendMessageResponse = await sendMessageToGameRoom(
      app,
      newRoomId,
      "Yes, ready!",
      "session1",
      ownerStudentToken
    );
    expect(sendMessageResponse.status).to.equal(200);
    expect(sendMessageResponse.body.data.sendMessageToGameRoom).to.exist;

    const pingAfterFirstMessage = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      ownerStudentToken
    );
    expect(pingAfterFirstMessage.status).to.equal(200);

    // ENSURE the room is now at the END_OF_PHASE_REFLECTION stage with roundNumber 1
    // ENSURE curGameState data is all set correctly (roundNumber 1, etc.)
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.curGameState.curState).to.equal(
      "END_OF_PHASE_REFLECTION"
    );
    expect(currentRoom?.gameData.curGameState.curRoundNumber).to.equal(1);
    expect([
      "What did you think of the activity?",
      "What did you like about the activity?",
    ]).to.include(currentRoom?.gameData.curGameState.selectedQuestion);
    expect(
      currentRoom?.gameData.curGameState.playersLeftToRespond
    ).to.deep.equal([ownerStudentId]);
    expect(currentRoom?.gameData.curGameState.endOfPhaseStep).to.exist;
    expect(currentRoom?.gameData.curGameState.endOfPhaseStep?.stepId).to.equal(
      "2"
    );
    expect(
      currentRoom?.gameData.curGameState.endOfPhaseStep
        ?.skipReflectionCollection
    ).to.be.false;
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("2");

    // ENSURE phaseProgression is set correctly
    expect(currentRoom?.gameData.phaseProgression.curPhaseTitle).to.equal(
      "Start of Phase"
    );
    expect(currentRoom?.gameData.phaseProgression.phasesStarted).to.deep.equal([
      "0",
    ]);
    expect(
      currentRoom?.gameData.phaseProgression.phasesCompleted
    ).to.deep.equal(["0"]);
    expect(
      currentRoom?.gameData.phaseProgression.startingPhaseStepsOrdered
    ).to.deep.equal(["0"]);

    // 3. submit phase reflection from owner + ping process
    const submitReflectionResponse = await submitGamePhaseReflection(
      app,
      newRoomId,
      "This was a great activity!",
      ownerStudentToken
    );
    expect(submitReflectionResponse.status).to.equal(200);
    expect(submitReflectionResponse.body.data.submitGamePhaseReflection).to
      .exist;

    const pingAfterFirstReflection = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      ownerStudentToken
    );
    expect(pingAfterFirstReflection.status).to.equal(200);

    // 3.5 We should now be in the WAITING_FOR_STUDENT_READY_TO_CONTINUE state
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.curGameState.curState).to.equal(
      "WAITING_FOR_STUDENT_READY_TO_CONTINUE"
    );
    expect(currentRoom?.gameData.curGameState.studentReadyToContinue).to.be
      .false;
    expect(currentRoom?.gameData.curGameState.studentReflections).to.deep.equal(
      {
        [ownerStudentId]: "This was a great activity!",
      }
    );
    expect(
      currentRoom?.gameData.phaseProgression.phasesCompleted
    ).to.deep.equal(["0"]);

    // ENSURE the owners reflection is set correctly in the curGameState
    expect(currentRoom?.gameData.curGameState.studentReflections).to.deep.equal(
      {
        [ownerStudentId]: "This was a great activity!",
      }
    );

    // 3.75 a student submits that they are ready to continue
    const submitReadyToContinueResponse = await submitReadyToContinue(
      app,
      newRoomId,
      "session1",
      ownerStudentToken
    );
    expect(submitReadyToContinueResponse.status).to.equal(200);
    expect(submitReadyToContinueResponse.body.data.submitReadyToContinue).to
      .exist;

    // 3.75 ping process
    const pingAfterSubmitReadyToContinue = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      ownerStudentToken
    );
    expect(pingAfterSubmitReadyToContinue.status).to.equal(200);

    // ENSURE we are now back at the request user input step.
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("1");
    expect(currentRoom?.gameData.curGameState.curState).to.equal(
      RequireInputType.SINGLE_RESPONSE_REQUIRED
    );

    // ENSURE GamePhaseReflection document is created and has proper data.
    let gamePhaseReflection = await GamePhaseReflectionsModel.findOne({
      roomId: newRoomId,
      stepId: "2",
      roundNumber: 1,
    });
    expect(gamePhaseReflection).to.exist;
    expect([
      "What did you think of the activity?",
      "What did you like about the activity?",
    ]).to.include(gamePhaseReflection?.question);
    expect(gamePhaseReflection?.reflections[ownerStudentId]).to.equal(
      "This was a great activity!"
    );

    // 4. studentTwo joins room
    const joinStudentTwoResponse = await joinGameRoom(
      app,
      newRoomId,
      studentTwoToken
    );
    expect(joinStudentTwoResponse.status).to.equal(200);
    expect(joinStudentTwoResponse.body.data.joinGameRoom).to.exist;

    // ENSURE studentTwo is now in the room
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.players).to.have.length(2);
    expect(currentRoom?.gameData.players).to.include(studentTwoId);

    // 5. owner send message + ping (SINGLE_RESPONSE_REQUIRED so will complete phase)
    const sendSecondMessageResponse = await sendMessageToGameRoom(
      app,
      newRoomId,
      "Ready for round 2!",
      "session1",
      ownerStudentToken
    );
    expect(sendSecondMessageResponse.status).to.equal(200);

    const pingAfterSecondMessage = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      ownerStudentToken
    );
    expect(pingAfterSecondMessage.status).to.equal(200);

    // ENSURE the room is now at the END_OF_PHASE_REFLECTION stage
    // ENSURE curGameState data is all set correctly (roundNumber 2, etc.)
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.curGameState.curState).to.equal(
      "END_OF_PHASE_REFLECTION"
    );
    expect(currentRoom?.gameData.curGameState.curRoundNumber).to.equal(2);
    expect([
      "What did you think of the activity?",
      "What did you like about the activity?",
    ]).to.include(currentRoom?.gameData.curGameState.selectedQuestion);
    expect(
      currentRoom?.gameData.curGameState.playersLeftToRespond
    ).to.deep.equal([ownerStudentId, studentTwoId]);
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("2");

    // 6. owner submits reflection + ping room
    const submitSecondReflectionOwner = await submitGamePhaseReflection(
      app,
      newRoomId,
      "Round 2 was even better!",
      ownerStudentToken
    );
    expect(submitSecondReflectionOwner.status).to.equal(200);

    const pingAfterOwnerSecondReflection = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      ownerStudentToken
    );
    expect(pingAfterOwnerSecondReflection.status).to.equal(200);

    // ENSURE the room is still at the END_OF_PHASE_REFLECTION stage with roundNumber 2
    // ENSURE the room has the studentTwo as the only player id in curGameState.playersLeftToRespond
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.curGameState.curState).to.equal(
      "END_OF_PHASE_REFLECTION"
    );
    expect(currentRoom?.gameData.curGameState.curRoundNumber).to.equal(2);
    expect(
      currentRoom?.gameData.curGameState.playersLeftToRespond
    ).to.deep.equal([studentTwoId]);
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("2");
    expect(currentRoom?.gameData.curGameState.studentReflections).to.deep.equal(
      {
        [ownerStudentId]: "Round 2 was even better!",
      }
    );

    // ENSURE owners studentReflection is set correctly
    expect(currentRoom?.gameData.curGameState.studentReflections).to.deep.equal(
      {
        [ownerStudentId]: "Round 2 was even better!",
      }
    );

    // ENSURE GamePhaseReflection document has room owners reflection and is roundNumber 2
    gamePhaseReflection = await GamePhaseReflectionsModel.findOne({
      roomId: newRoomId,
      stepId: "2",
      roundNumber: 2,
    });
    expect(gamePhaseReflection).to.exist;
    expect(gamePhaseReflection?.reflections[ownerStudentId]).to.equal(
      "Round 2 was even better!"
    );

    // 7. studentTwo submits reflection + ping room
    const submitSecondReflectionStudentTwo = await submitGamePhaseReflection(
      app,
      newRoomId,
      "I learned a lot in round 2!",
      studentTwoToken
    );
    expect(submitSecondReflectionStudentTwo.status).to.equal(200);

    const pingAfterStudentTwoSecondReflection = await pingRoomProcess(
      app,
      newRoomId,
      "session2",
      studentTwoToken
    );
    expect(pingAfterStudentTwoSecondReflection.status).to.equal(200);

    // ESNURE the studentReflections are set correctly
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.curGameState.studentReflections).to.deep.equal(
      {
        [ownerStudentId]: "Round 2 was even better!",
        [studentTwoId]: "I learned a lot in round 2!",
      }
    );

    // ENSURE GamePhaseReflection document has both owner and studentTwo reflections
    gamePhaseReflection = await GamePhaseReflectionsModel.findOne({
      roomId: newRoomId,
      stepId: "2",
      roundNumber: 2,
    });
    expect(gamePhaseReflection).to.exist;
    expect(gamePhaseReflection?.reflections[ownerStudentId]).to.equal(
      "Round 2 was even better!"
    );
    expect(gamePhaseReflection?.reflections[studentTwoId]).to.equal(
      "I learned a lot in round 2!"
    );

    // 7.5 we should now be in the WAITING_FOR_STUDENT_READY_TO_CONTINUE state
    expect(currentRoom?.gameData.curGameState.curState).to.equal(
      "WAITING_FOR_STUDENT_READY_TO_CONTINUE"
    );
    expect(currentRoom?.gameData.curGameState.studentReadyToContinue).to.be
      .false;

    // 7.75 a student submits that they are ready to continue
    let submitStudentTwoReadyToContinueResponse = await submitReadyToContinue(
      app,
      newRoomId,
      "session2",
      studentTwoToken
    );
    expect(submitStudentTwoReadyToContinueResponse.status).to.equal(200);
    expect(
      submitStudentTwoReadyToContinueResponse.body.data.submitReadyToContinue
    ).to.exist;

    // 7.75 ping process
    let pingAfterStudentTwoSubmitReadyToContinue = await pingRoomProcess(
      app,
      newRoomId,
      "session2",
      studentTwoToken
    );
    expect(pingAfterStudentTwoSubmitReadyToContinue.status).to.equal(200);

    // ENSURE we are now back at the request user input step.
    currentRoom = await RoomModel.findById(newRoomId);

    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("1");
    expect(currentRoom?.gameData.curGameState.curState).to.equal(
      RequireInputType.SINGLE_RESPONSE_REQUIRED
    );

    // ENSURE GamePhaseReflection document for roundNumber 2 now has both owner and studentTwo
    gamePhaseReflection = await GamePhaseReflectionsModel.findOne({
      roomId: newRoomId,
      stepId: "2",
      roundNumber: 2,
    });
    expect(gamePhaseReflection).to.exist;
    expect(gamePhaseReflection?.reflections[ownerStudentId]).to.equal(
      "Round 2 was even better!"
    );
    expect(gamePhaseReflection?.reflections[studentTwoId]).to.equal(
      "I learned a lot in round 2!"
    );

    // 8. send message from owner + ping
    const sendThirdMessageResponse = await sendMessageToGameRoom(
      app,
      newRoomId,
      "Ready for round 3!",
      "session1",
      ownerStudentToken
    );
    expect(sendThirdMessageResponse.status).to.equal(200);

    const pingAfterThirdMessage = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      ownerStudentToken
    );
    expect(pingAfterThirdMessage.status).to.equal(200);

    // ENSURE the room is now at the END_OF_PHASE_REFLECTION stage
    // ENSURE curGameState data is all set correctly (roundNumber 3, etc.)
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.curGameState.curState).to.equal(
      "END_OF_PHASE_REFLECTION"
    );
    expect(currentRoom?.gameData.curGameState.curRoundNumber).to.equal(3);
    expect(
      currentRoom?.gameData.curGameState.playersLeftToRespond
    ).to.deep.equal([ownerStudentId, studentTwoId]);
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("2");

    // 9. owner submits their reflection + ping room
    const submitThirdReflectionOwner = await submitGamePhaseReflection(
      app,
      newRoomId,
      "Round 3 is my favorite!",
      ownerStudentToken
    );
    expect(submitThirdReflectionOwner.status).to.equal(200);

    const pingAfterOwnerThirdReflection = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      ownerStudentToken
    );
    expect(pingAfterOwnerThirdReflection.status).to.equal(200);

    // ENSURE the room is still at the END_OF_PHASE_REFLECTION stage with roundNumber 3
    // ENSURE the room has the studentTwo as the only player id in curGameState.playersLeftToRespond
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.curGameState.curState).to.equal(
      "END_OF_PHASE_REFLECTION"
    );
    expect(currentRoom?.gameData.curGameState.curRoundNumber).to.equal(3);
    expect(
      currentRoom?.gameData.curGameState.playersLeftToRespond
    ).to.deep.equal([studentTwoId]);

    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("2");

    // ENSURE GamePhaseReflection document has room owners reflection and is roundNumber 3
    gamePhaseReflection = await GamePhaseReflectionsModel.findOne({
      roomId: newRoomId,
      stepId: "2",
      roundNumber: 3,
    });
    expect(gamePhaseReflection).to.exist;
    expect(gamePhaseReflection?.reflections[ownerStudentId]).to.equal(
      "Round 3 is my favorite!"
    );

    // 10. studentTwo leaves the room + ping
    const leaveRoomResponse = await leaveGameRoom(
      app,
      newRoomId,
      studentTwoToken
    );
    expect(leaveRoomResponse.status).to.equal(200);
    expect(leaveRoomResponse.body.data.leaveGameRoom).to.exist;

    const pingAfterStudentTwoLeaves = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      ownerStudentToken
    );
    expect(pingAfterStudentTwoLeaves.status).to.equal(200);

    // 10.5 we should now be in the WAITING_FOR_STUDENT_READY_TO_CONTINUE state
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.curGameState.curState).to.equal(
      "WAITING_FOR_STUDENT_READY_TO_CONTINUE"
    );
    expect(currentRoom?.gameData.curGameState.studentReadyToContinue).to.be
      .false;

    // 10.75 a student submits that they are ready to continue
    let submitOwnerReadyToContinueResponse = await submitReadyToContinue(
      app,
      newRoomId,
      "session1",
      ownerStudentToken
    );
    expect(submitOwnerReadyToContinueResponse.status).to.equal(200);
    expect(submitOwnerReadyToContinueResponse.body.data.submitReadyToContinue)
      .to.exist;

    // 10.75 ping process
    pingAfterStudentTwoSubmitReadyToContinue = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      ownerStudentToken
    );
    expect(pingAfterStudentTwoSubmitReadyToContinue.status).to.equal(200);

    // ENSURE we are now back at the request user input step because without student two, all people have provided input
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.players).to.have.length(1);
    expect(currentRoom?.gameData.players).to.not.include(studentTwoId);

    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("1");
    expect(currentRoom?.gameData.curGameState.curState).to.equal(
      RequireInputType.SINGLE_RESPONSE_REQUIRED
    );

    // ENSURE GamePhaseReflection document for roundNumber 3 now has owner's reflection
    // (studentTwo left before submitting their reflection for round 3)
    gamePhaseReflection = await GamePhaseReflectionsModel.findOne({
      roomId: newRoomId,
      stepId: "2",
      roundNumber: 3,
    });
    expect(gamePhaseReflection).to.exist;
    expect(gamePhaseReflection?.reflections[ownerStudentId]).to.equal(
      "Round 3 is my favorite!"
    );
    // StudentTwo didn't submit a reflection for round 3, so it shouldn't exist
    expect(gamePhaseReflection?.reflections[studentTwoId]).to.be.undefined;
  });

  it("end of phase is properly skipped if skipReflectionCollection is true", async () => {
    // 0. Update reflection step to have skipReflectionCollection step to true
    await DiscussionStageModel.updateOne(
      { clientId: TEST_END_OF_PHASE_REFLECTION_CLIENT_ID },
      {
        $set: {
          "flowsList.0.steps.2.skipReflectionCollection": true,
        },
      }
    );

    // 1. Create new room for gameId: unit-test-end-of-phase
    const ownerStudentId = new ObjectId().toString();

    await createUser(ownerStudentId, UserRole.USER, EducationalRole.STUDENT);

    const ownerStudentToken = await getToken(
      ownerStudentId,
      UserRole.USER,
      EducationalRole.STUDENT
    );

    const createNewGameRoomResponse = await createNewGameRoom(
      app,
      "unit-test-end-of-phase",
      ownerStudentToken
    );
    expect(createNewGameRoomResponse.status).to.equal(200);
    const newRoomId = createNewGameRoomResponse.body.data.createNewGameRoom._id;

    // ENSURE at request user input step
    let currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.globalStateData.curStageId).to.equal(
      TEST_END_OF_PHASE_REFLECTION_CLIENT_ID
    );
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("1");
    expect(currentRoom?.gameData.curGameState.curState).to.equal(
      RequireInputType.SINGLE_RESPONSE_REQUIRED
    );
    expect(currentRoom?.gameData.chat).to.have.length(1);
    expect(currentRoom?.gameData.chat[0].message).to.equal(
      "Ready for reflection?"
    );

    // 2. send message from owner + ping
    const sendMessageResponse = await sendMessageToGameRoom(
      app,
      newRoomId,
      "Yes, ready!",
      "session1",
      ownerStudentToken
    );
    expect(sendMessageResponse.status).to.equal(200);
    expect(sendMessageResponse.body.data.sendMessageToGameRoom).to.exist;

    const pingAfterFirstMessage = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      ownerStudentToken
    );
    expect(pingAfterFirstMessage.status).to.equal(200);

    // ENSURE the room is back to the request user input step, but added messages
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("1");
    expect(currentRoom?.gameData.curGameState.curState).to.equal(
      RequireInputType.SINGLE_RESPONSE_REQUIRED
    );
    expect(currentRoom?.gameData.chat).to.have.length(5);
    const allMessages = currentRoom?.gameData.chat.map((msg) => msg.message);
    expect(allMessages).to.include("Ready for reflection?");
    expect(allMessages).to.include("Yes, ready!");
    expect(allMessages).to.include("Thank you for participating!");
    expect(allMessages).to.include("Ready for reflection?");
  });

  it("end of phase reflections with 2 users at start of room", async () => {
    // 1. Create new room for gameId: unit-test-end-of-phase
    const ownerStudentId = new ObjectId().toString();
    const studentTwoId = new ObjectId().toString();

    await createUser(ownerStudentId, UserRole.USER, EducationalRole.STUDENT);
    await createUser(studentTwoId, UserRole.USER, EducationalRole.STUDENT);

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

    const createNewGameRoomResponse = await createNewGameRoom(
      app,
      "unit-test-end-of-phase",
      ownerStudentToken
    );
    expect(createNewGameRoomResponse.status).to.equal(200);
    expect(createNewGameRoomResponse.body.data.createNewGameRoom).to.exist;
    const newRoomId = createNewGameRoomResponse.body.data.createNewGameRoom._id;

    // ENSURE phaseProgression is set correctly
    let currentRoom = await RoomModel.findById(newRoomId);

    // 2. studentTwo joins room
    const joinStudentTwoResponse = await joinGameRoom(
      app,
      newRoomId,
      studentTwoToken
    );
    expect(joinStudentTwoResponse.status).to.equal(200);
    expect(joinStudentTwoResponse.body.data.joinGameRoom).to.exist;

    // ENSURE studentTwo is now in the room
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.players).to.have.length(2);
    expect(currentRoom?.gameData.players).to.include(studentTwoId);

    // 3. owner send message + ping (SINGLE_RESPONSE_REQUIRED so will complete user input phase)
    const sendSecondMessageResponse = await sendMessageToGameRoom(
      app,
      newRoomId,
      "Ready for round 2!",
      "session1",
      ownerStudentToken
    );
    expect(sendSecondMessageResponse.status).to.equal(200);

    const pingAfterSecondMessage = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      ownerStudentToken
    );
    expect(pingAfterSecondMessage.status).to.equal(200);

    // ENSURE the room is now at the END_OF_PHASE_REFLECTION stage
    // ENSURE curGameState data is all set correctly (roundNumber 2, etc.)
    currentRoom = await RoomModel.findById(newRoomId).lean();
    expect(currentRoom?.gameData.curGameState.curState).to.equal(
      "END_OF_PHASE_REFLECTION"
    );
    expect(currentRoom?.gameData.curGameState.curRoundNumber).to.equal(1);
    expect(
      currentRoom?.gameData.phaseProgression.learningObjectives
    ).to.deep.include.members([
      {
        title: "Test Learning Objective",
        criteria: "Test Learning Objective Criteria",
        variableName: "test_learning_objective",
      },
    ]);

    // 4. owner submits reflection + ping room
    const submitSecondReflectionOwner = await submitGamePhaseReflection(
      app,
      newRoomId,
      "Round 2 was even better!",
      ownerStudentToken
    );
    expect(submitSecondReflectionOwner.status).to.equal(200);

    const pingAfterOwnerSecondReflection = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      ownerStudentToken
    );
    expect(pingAfterOwnerSecondReflection.status).to.equal(200);

    // ENSURE the room is still at the END_OF_PHASE_REFLECTION stage with roundNumber 2
    // ENSURE the room has the studentTwo as the only player id in curGameState.playersLeftToRespond
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.curGameState.curState).to.equal(
      "END_OF_PHASE_REFLECTION"
    );
    expect(currentRoom?.gameData.curGameState.curRoundNumber).to.equal(1);
    expect(
      currentRoom?.gameData.curGameState.playersLeftToRespond
    ).to.deep.equal([studentTwoId]);
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("2");
    expect(currentRoom?.gameData.curGameState.studentReflections).to.deep.equal(
      {
        [ownerStudentId]: "Round 2 was even better!",
      }
    );

    // ENSURE GamePhaseReflection document has room owners reflection and is roundNumber 2
    let gamePhaseReflection = await GamePhaseReflectionsModel.findOne({
      roomId: newRoomId,
      stepId: "2",
      roundNumber: 1,
    });
    expect(gamePhaseReflection).to.exist;
    expect(gamePhaseReflection?.reflections[ownerStudentId]).to.equal(
      "Round 2 was even better!"
    );

    // 5. studentTwo submits reflection + ping room
    const submitSecondReflectionStudentTwo = await submitGamePhaseReflection(
      app,
      newRoomId,
      "I learned a lot in round 2!",
      studentTwoToken
    );
    expect(submitSecondReflectionStudentTwo.status).to.equal(200);

    const pingAfterStudentTwoSecondReflection = await pingRoomProcess(
      app,
      newRoomId,
      "session2",
      studentTwoToken
    );
    expect(pingAfterStudentTwoSecondReflection.status).to.equal(200);

    // ESNURE the studentReflections are set correctly
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.curGameState.studentReflections).to.deep.equal(
      {
        [ownerStudentId]: "Round 2 was even better!",
        [studentTwoId]: "I learned a lot in round 2!",
      }
    );

    // ENSURE GamePhaseReflection document has both owner and studentTwo reflections
    gamePhaseReflection = await GamePhaseReflectionsModel.findOne({
      roomId: newRoomId,
      stepId: "2",
      roundNumber: 1,
    });
    expect(gamePhaseReflection).to.exist;
    expect(gamePhaseReflection?.reflections[ownerStudentId]).to.equal(
      "Round 2 was even better!"
    );
    expect(gamePhaseReflection?.reflections[studentTwoId]).to.equal(
      "I learned a lot in round 2!"
    );

    // 6. we should now be in the WAITING_FOR_STUDENT_READY_TO_CONTINUE state
    expect(currentRoom?.gameData.curGameState.curState).to.equal(
      "WAITING_FOR_STUDENT_READY_TO_CONTINUE"
    );
    expect(currentRoom?.gameData.curGameState.studentReadyToContinue).to.be
      .false;

    // 7. a student submits that they are ready to continue
    let submitStudentTwoReadyToContinueResponse = await submitReadyToContinue(
      app,
      newRoomId,
      "session2",
      studentTwoToken
    );
    expect(submitStudentTwoReadyToContinueResponse.status).to.equal(200);
    expect(
      submitStudentTwoReadyToContinueResponse.body.data.submitReadyToContinue
    ).to.exist;

    // 8. ping process
    let pingAfterStudentTwoSubmitReadyToContinue = await pingRoomProcess(
      app,
      newRoomId,
      "session2",
      studentTwoToken
    );
    expect(pingAfterStudentTwoSubmitReadyToContinue.status).to.equal(200);

    // ENSURE we are now back at the request user input step.
    currentRoom = await RoomModel.findById(newRoomId);

    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("1");
    expect(currentRoom?.gameData.curGameState.curState).to.equal(
      RequireInputType.SINGLE_RESPONSE_REQUIRED
    );

    // ENSURE GamePhaseReflection document for roundNumber 2 now has both owner and studentTwo
    gamePhaseReflection = await GamePhaseReflectionsModel.findOne({
      roomId: newRoomId,
      stepId: "2",
      roundNumber: 1,
    });
    expect(gamePhaseReflection).to.exist;
    expect(gamePhaseReflection?.reflections[ownerStudentId]).to.equal(
      "Round 2 was even better!"
    );
    expect(gamePhaseReflection?.reflections[studentTwoId]).to.equal(
      "I learned a lot in round 2!"
    );

    // 9. send message from owner + ping
    const sendThirdMessageResponse = await sendMessageToGameRoom(
      app,
      newRoomId,
      "Ready for round 3!",
      "session1",
      ownerStudentToken
    );
    expect(sendThirdMessageResponse.status).to.equal(200);

    const pingAfterThirdMessage = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      ownerStudentToken
    );
    expect(pingAfterThirdMessage.status).to.equal(200);

    // ENSURE the room is now at the END_OF_PHASE_REFLECTION stage
    // ENSURE curGameState data is all set correctly (roundNumber 3, etc.)
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.curGameState.curState).to.equal(
      "END_OF_PHASE_REFLECTION"
    );
    expect(currentRoom?.gameData.curGameState.curRoundNumber).to.equal(2);
    expect(
      currentRoom?.gameData.curGameState.playersLeftToRespond
    ).to.deep.equal([ownerStudentId, studentTwoId]);
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("2");

    // 10. owner submits their reflection + ping room
    const submitThirdReflectionOwner = await submitGamePhaseReflection(
      app,
      newRoomId,
      "Round 3 is my favorite!",
      ownerStudentToken
    );
    expect(submitThirdReflectionOwner.status).to.equal(200);

    const pingAfterOwnerThirdReflection = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      ownerStudentToken
    );
    expect(pingAfterOwnerThirdReflection.status).to.equal(200);

    // ENSURE the room is still at the END_OF_PHASE_REFLECTION stage with roundNumber 3
    // ENSURE the room has the studentTwo as the only player id in curGameState.playersLeftToRespond
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.curGameState.curState).to.equal(
      "END_OF_PHASE_REFLECTION"
    );
    expect(currentRoom?.gameData.curGameState.curRoundNumber).to.equal(2);
    expect(
      currentRoom?.gameData.curGameState.playersLeftToRespond
    ).to.deep.equal([studentTwoId]);

    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("2");

    // ENSURE GamePhaseReflection document has room owners reflection and is roundNumber 2
    gamePhaseReflection = await GamePhaseReflectionsModel.findOne({
      roomId: newRoomId,
      stepId: "2",
      roundNumber: 2,
    });
    expect(gamePhaseReflection).to.exist;
    expect(gamePhaseReflection?.reflections[ownerStudentId]).to.equal(
      "Round 3 is my favorite!"
    );

    // 11. studentTwo leaves the room + ping
    const leaveRoomResponse = await leaveGameRoom(
      app,
      newRoomId,
      studentTwoToken
    );
    expect(leaveRoomResponse.status).to.equal(200);
    expect(leaveRoomResponse.body.data.leaveGameRoom).to.exist;

    const pingAfterStudentTwoLeaves = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      ownerStudentToken
    );
    expect(pingAfterStudentTwoLeaves.status).to.equal(200);

    // 10.5 we should now be in the WAITING_FOR_STUDENT_READY_TO_CONTINUE state
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.curGameState.curState).to.equal(
      "WAITING_FOR_STUDENT_READY_TO_CONTINUE"
    );
    expect(currentRoom?.gameData.curGameState.studentReadyToContinue).to.be
      .false;

    // 10.75 a student submits that they are ready to continue
    let submitOwnerReadyToContinueResponse = await submitReadyToContinue(
      app,
      newRoomId,
      "session1",
      ownerStudentToken
    );
    expect(submitOwnerReadyToContinueResponse.status).to.equal(200);
    expect(submitOwnerReadyToContinueResponse.body.data.submitReadyToContinue)
      .to.exist;

    // 10.75 ping process
    pingAfterStudentTwoSubmitReadyToContinue = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      ownerStudentToken
    );
    expect(pingAfterStudentTwoSubmitReadyToContinue.status).to.equal(200);

    // ENSURE we are now back at the request user input step because without student two, all people have provided input
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.players).to.have.length(1);
    expect(currentRoom?.gameData.players).to.not.include(studentTwoId);

    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("1");
    expect(currentRoom?.gameData.curGameState.curState).to.equal(
      RequireInputType.SINGLE_RESPONSE_REQUIRED
    );

    // ENSURE GamePhaseReflection document for roundNumber 3 now has owner's reflection
    // (studentTwo left before submitting their reflection for round 3)
    gamePhaseReflection = await GamePhaseReflectionsModel.findOne({
      roomId: newRoomId,
      stepId: "2",
      roundNumber: 2,
    });
    expect(gamePhaseReflection).to.exist;
    expect(gamePhaseReflection?.reflections[ownerStudentId]).to.equal(
      "Round 3 is my favorite!"
    );
    // StudentTwo didn't submit a reflection for round 3, so it shouldn't exist
    expect(gamePhaseReflection?.reflections[studentTwoId]).to.be.undefined;
  });

  it("multiple prompt room with group and individual prompt processes", async () => {
    // 1. Create a room for game "unit-test-multiple-prompt", add two students, ping process
    const ownerStudentId = new ObjectId().toString();
    const studentTwoId = new ObjectId().toString();

    await createUser(ownerStudentId, UserRole.USER, EducationalRole.STUDENT);
    await createUser(studentTwoId, UserRole.USER, EducationalRole.STUDENT);

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

    const createNewGameRoomResponse = await createNewGameRoom(
      app,
      "unit-test-multiple-prompt",
      ownerStudentToken
    );
    expect(createNewGameRoomResponse.status).to.equal(200);
    expect(createNewGameRoomResponse.body.data.createNewGameRoom).to.exist;
    const newRoomId = createNewGameRoomResponse.body.data.createNewGameRoom._id;

    // Add studentTwo to the room
    const joinStudentTwoResponse = await joinGameRoom(
      app,
      newRoomId,
      studentTwoToken
    );
    expect(joinStudentTwoResponse.status).to.equal(200);
    expect(joinStudentTwoResponse.body.data.joinGameRoom).to.exist;

    // Ping to ensure room is initialized
    const initialPingResponse = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      ownerStudentToken
    );
    expect(initialPingResponse.status).to.equal(200);

    // ENSURE we are at the first request user input step
    let currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("1");
    expect(currentRoom?.gameData.chat[0].message).to.equal(
      "What is your single user message?"
    );

    // GROUP prompt portion
    // Setup llm mock to respond with group_prompt_response json data
    syncLlmRequestStub.onFirstCall().resolves({
      answer: JSON.stringify({
        group_prompt_response: "Mocked group response for all users",
      }),
    } as AiServicesResponseTypes);

    // 2. Send messages from both users (ALL_USER_RESPONSES_REQUIRED_FREE_FOR_ALL)
    const ownerFirstMessageResponse = await sendMessageToGameRoom(
      app,
      newRoomId,
      "Owner's first input",
      "session1",
      ownerStudentToken
    );
    expect(ownerFirstMessageResponse.status).to.equal(200);

    const studentTwoFirstMessageResponse = await sendMessageToGameRoom(
      app,
      newRoomId,
      "Student Two's first input",
      "session2",
      studentTwoToken
    );
    expect(studentTwoFirstMessageResponse.status).to.equal(200);

    // Ping to process the GROUP prompt
    const pingAfterFirstMessages = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      ownerStudentToken
    );
    expect(pingAfterFirstMessages.status).to.equal(200);

    // ENSURE we are now at the second request user input step (stepId 3)
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("3");
    expect(
      currentRoom?.gameData.chat.find(
        (c: any) => c.message === "Provide the single user response."
      )
    ).to.exist;

    // ENSURE the prompt request was called ONCE, should contain both users messages in the prompt text with format "Name: Message"
    expect(syncLlmRequestStub.callCount).to.equal(1);
    const firstCallArgs = syncLlmRequestStub.getCall(0).args[0];
    expect(firstCallArgs.prompts).to.exist;
    expect(firstCallArgs.prompts.length).to.be.greaterThan(0);

    // The prompt text should contain both users' inputs formatted with their names
    const groupPromptText = firstCallArgs.prompts.find((p: any) =>
      p.promptText.includes("Here are each students responses")
    )?.promptText;
    expect(groupPromptText).to.exist;
    expect(groupPromptText).to.include("Owner's first input");
    expect(groupPromptText).to.include("Student Two's first input");

    // ENSURE the global state data has the group_prompt_response field set
    expect(
      currentRoom?.gameData.globalStateData.gameStateData.group_prompt_response
    ).to.equal("Mocked group response for all users");

    // INDIVIDUALLY prompt portion
    // Setup the llm mock so that there are 2 distinct llm responses
    syncLlmRequestStub.reset();

    // Configure stub to return different responses based on the prompt text
    syncLlmRequestStub.callsFake((request: any) => {
      const promptText = request.prompts.find((p: any) =>
        p.promptText.includes("Process the single user second response")
      )?.promptText;

      if (promptText?.includes("Owner's second input")) {
        return Promise.resolve({
          answer: JSON.stringify({
            individually_prompt_response: "Owner's individual response",
          }),
        } as AiServicesResponseTypes);
      } else if (promptText?.includes("Student Two's second input")) {
        return Promise.resolve({
          answer: JSON.stringify({
            individually_prompt_response: "Student Two's individual response",
          }),
        } as AiServicesResponseTypes);
      }

      // Default fallback
      return Promise.resolve({
        answer: JSON.stringify({
          individually_prompt_response: "Default individual response",
        }),
      } as AiServicesResponseTypes);
    });

    // 3. Send a message from both students
    const ownerSecondMessageResponse = await sendMessageToGameRoom(
      app,
      newRoomId,
      "Owner's second input",
      "session1",
      ownerStudentToken
    );
    expect(ownerSecondMessageResponse.status).to.equal(200);

    const studentTwoSecondMessageResponse = await sendMessageToGameRoom(
      app,
      newRoomId,
      "Student Two's second input",
      "session2",
      studentTwoToken
    );
    expect(studentTwoSecondMessageResponse.status).to.equal(200);

    // Ping to process the INDIVIDUALLY prompts
    const pingAfterSecondMessages = await pingRoomProcess(
      app,
      newRoomId,
      "session1",
      ownerStudentToken
    );
    expect(pingAfterSecondMessages.status).to.equal(200);

    // ENSURE we are now back at the first request user input step
    currentRoom = await RoomModel.findById(newRoomId);
    expect(currentRoom?.gameData.globalStateData.curStepId).to.equal("1");

    // ENSURE the prompt request was called twice (once per user)
    expect(syncLlmRequestStub.callCount).to.equal(2);

    // ENSURE each call had one of the users messages
    const secondCallArgs = syncLlmRequestStub.getCall(0).args[0];
    const thirdCallArgs = syncLlmRequestStub.getCall(1).args[0];

    const secondCallPromptText = secondCallArgs.prompts.find((p: any) =>
      p.promptText.includes("Process the single user second response")
    )?.promptText;
    const thirdCallPromptText = thirdCallArgs.prompts.find((p: any) =>
      p.promptText.includes("Process the single user second response")
    )?.promptText;

    // One should have owner's message, the other should have student two's message
    const hasOwnerMessage =
      secondCallPromptText?.includes("Owner's second input") ||
      thirdCallPromptText?.includes("Owner's second input");
    const hasStudentTwoMessage =
      secondCallPromptText?.includes("Student Two's second input") ||
      thirdCallPromptText?.includes("Student Two's second input");

    expect(hasOwnerMessage).to.be.true;
    expect(hasStudentTwoMessage).to.be.true;

    // ENSURE each user has their distinct llm response in their player state data
    expect(
      currentRoom?.gameData.playersGameStateData[ownerStudentId]
        .individually_prompt_response
    ).to.equal("Owner's individual response");
    expect(
      currentRoom?.gameData.playersGameStateData[studentTwoId]
        .individually_prompt_response
    ).to.equal("Student Two's individual response");
  });
});
