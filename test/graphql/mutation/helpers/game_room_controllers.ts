/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { Express } from "express";
import request from "supertest";
import {
  submitReadyToContinueMutation,
  pingGameRoomProcessMutation,
  reportPlayerAwayMutation,
  joinGameRoomMutation,
  sendMessageToGameRoomMutation,
  viewGameRoomSimulationMutation,
  clearAwayStatusMutation,
  setPlayerPauseStatusMutation,
  submitGamePhaseReflectionMutation,
  leaveGameRoomMutation,
  createNewGameRoomMutation,
} from "../../../../src/schemas/types/types";
export async function submitReadyToContinue(
  app: Express,
  roomId: string,
  sessionId: string,
  token: string
) {
  const response = await request(app)
    .post("/graphql")
    .set("Authorization", `Bearer ${token}`)
    .send({
      query: submitReadyToContinueMutation,
      variables: { roomId, sessionId },
    });
  return response;
}

export async function pingRoomProcess(
  app: Express,
  roomId: string,
  sessionId: string,
  token: string
) {
  const response = await request(app)
    .post("/graphql")
    .set("Authorization", `Bearer ${token}`)
    .send({
      query: pingGameRoomProcessMutation,
      variables: { roomId, sessionId },
    });
  return response;
}

export async function reportPlayerAway(
  app: Express,
  roomId: string,
  playerId: string,
  reporterToken: string
) {
  const response = await request(app)
    .post("/graphql")
    .set("Authorization", `Bearer ${reporterToken}`)
    .send({
      query: reportPlayerAwayMutation,
      variables: { roomId, playerId },
    });
  return response;
}

export async function joinGameRoom(
  app: Express,
  roomId: string,
  playerToken: string
) {
  const response = await request(app)
    .post("/graphql")
    .set("Authorization", `Bearer ${playerToken}`)
    .send({ query: joinGameRoomMutation, variables: { roomId } });
  return response;
}

export async function sendMessageToGameRoom(
  app: Express,
  roomId: string,
  message: string,
  sessionId: string,
  token: string
) {
  const response = await request(app)
    .post("/graphql")
    .set("Authorization", `Bearer ${token}`)
    .send({
      query: sendMessageToGameRoomMutation,
      variables: { roomId, message, sessionId },
    });
  return response;
}

export async function viewGameRoomSimulation(
  app: Express,
  roomId: string,
  studentToken: string
) {
  const response = await request(app)
    .post("/graphql")
    .set("Authorization", `Bearer ${studentToken}`)
    .send({ query: viewGameRoomSimulationMutation, variables: { roomId } });
  return response;
}

export async function clearAwayStatus(
  app: Express,
  roomId: string,
  playerId: string,
  instructorToken: string
) {
  const response = await request(app)
    .post("/graphql")
    .set("Authorization", `Bearer ${instructorToken}`)
    .send({
      query: clearAwayStatusMutation,
      variables: { roomId, playerId },
    });
  return response;
}

export async function pausePlayer(
  app: Express,
  roomId: string,
  playerId: string,
  instructorToken: string
) {
  const response = await request(app)
    .post("/graphql")
    .set("Authorization", `Bearer ${instructorToken}`)
    .send({
      query: setPlayerPauseStatusMutation,
      variables: { roomId, playerId, isPaused: true },
    });
  return response;
}

export async function unpausePlayer(
  app: Express,
  roomId: string,
  playerId: string,
  instructorToken: string
) {
  const response = await request(app)
    .post("/graphql")
    .set("Authorization", `Bearer ${instructorToken}`)
    .send({
      query: setPlayerPauseStatusMutation,
      variables: { roomId, playerId, isPaused: false },
    });
  return response;
}

export async function submitGamePhaseReflection(
  app: Express,
  roomId: string,
  reflection: string,
  token: string
) {
  const response = await request(app)
    .post("/graphql")
    .set("Authorization", `Bearer ${token}`)
    .send({
      query: submitGamePhaseReflectionMutation,
      variables: { roomId, reflection },
    });
  return response;
}

export async function leaveGameRoom(
  app: Express,
  roomId: string,
  playerToken: string
) {
  const response = await request(app)
    .post("/graphql")
    .set("Authorization", `Bearer ${playerToken}`)
    .send({ query: leaveGameRoomMutation, variables: { roomId } });
  return response;
}

export async function createNewGameRoom(
  app: Express,
  gameId: string,
  playerToken: string
) {
  const response = await request(app)
    .post("/graphql")
    .set("Authorization", `Bearer ${playerToken}`)
    .send({ query: createNewGameRoomMutation, variables: { gameId } });
  return response;
}
