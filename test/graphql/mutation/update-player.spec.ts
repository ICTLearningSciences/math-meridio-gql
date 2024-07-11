/*

*/
/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved. 
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import createApp, { appStart, appStop } from "../../../src/app";
import { expect } from "chai";
import e, { Express } from "express";
import mongoUnit from "mongo-unit";
import request from "supertest";

describe("update or create player", () => {
  let app: Express;

  beforeEach(async () => {
    await mongoUnit.load(require("test/fixtures/mongodb/data-default.js"));
    app = await createApp();
    await appStart();
  });

  afterEach(async () => {
    await appStop();
    await mongoUnit.drop();
  });

  it(`can update existing player`, async () => {
    const updateResponse = await request(app)
      .post("/graphql")
      .send({
        query: `
        mutation UpdatePlayer($player: PlayerInput!) {
          updatePlayer(player: $player) {
            clientId
            name
            avatar
            description
          }
        }`,
        variables: {
          player: {
            clientId: "1",
            name: "Jenny Appleseed",
            avatar: "woman_apple_head",
            description: "I want an avatar with an apple for a head",
          },
        },
      });
    expect(updateResponse.status).to.equal(200);
    expect(updateResponse.body.data.updatePlayer).to.eql({
      clientId: "1",
      name: "Jenny Appleseed",
      avatar: "woman_apple_head",
      description: "I want an avatar with an apple for a head",
    });

    const fetchResponse = await request(app)
      .post("/graphql")
      .send({
        query: `query {
        fetchPlayers {
          edges {
            node {
              clientId
              name
              description
              avatar
            }
          }
        }
      }`,
      });
    expect(fetchResponse.status).to.equal(200);
    expect(fetchResponse.body.data.fetchPlayers.edges).to.eql([
      {
        node: {
          clientId: "1",
          name: "Jenny Appleseed",
          avatar: "woman_apple_head",
          description: "I want an avatar with an apple for a head",
        },
      },
    ]);
  });

  it(`can create new player`, async () => {
    const updateResponse = await request(app)
      .post("/graphql")
      .send({
        query: `
        mutation UpdatePlayer($player: PlayerInput!) {
          updatePlayer(player: $player) {
            clientId
            name
            avatar
            description
          }
        }`,
        variables: {
          player: {
            clientId: "2",
            name: "Jenny Appleseed",
            avatar: "woman_apple_head",
            description: "I want an avatar with an apple for a head",
          },
        },
      });
    expect(updateResponse.status).to.equal(200);
    expect(updateResponse.body.data.updatePlayer).to.eql({
      clientId: "2",
      name: "Jenny Appleseed",
      avatar: "woman_apple_head",
      description: "I want an avatar with an apple for a head",
    });

    const fetchResponse = await request(app)
      .post("/graphql")
      .send({
        query: `query {
        fetchPlayers {
          edges {
            node {
              clientId
              name
              description
              avatar
            }
          }
        }
      }`,
      });
    expect(fetchResponse.status).to.equal(200);
    expect(fetchResponse.body.data.fetchPlayers.edges).to.eql([
      {
        node: {
          clientId: "2",
          name: "Jenny Appleseed",
          avatar: "woman_apple_head",
          description: "I want an avatar with an apple for a head",
        },
      },
      {
        node: {
          clientId: "1",
          name: "Jonny Appleseed",
          avatar: "man_apple_head",
          description: "I want an avatar with an apple for a head",
        },
      },
    ]);
  });
});
