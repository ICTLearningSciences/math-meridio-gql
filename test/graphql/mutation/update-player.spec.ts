/*

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
        mutation AddOrUpdatePlayer($player: PlayerInput!) {
          addOrUpdatePlayer(player: $player) {
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
    expect(updateResponse.body.data.addOrUpdatePlayer).to.eql({
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
        mutation AddOrUpdatePlayer($player: PlayerInput!) {
          addOrUpdatePlayer(player: $player) {
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
    expect(updateResponse.body.data.addOrUpdatePlayer).to.eql({
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
