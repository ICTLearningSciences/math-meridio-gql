/*

*/
import createApp, { appStart, appStop } from "../../../src/app";
import { expect } from "chai";
import e, { Express } from "express";
import mongoUnit from "mongo-unit";
import request from "supertest";

describe("fetch player", () => {
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

  it(`can fetch existing player`, async () => {
    const response = await request(app)
      .post("/graphql")
      .send({
        query: `
        query FetchPlayer($id: String!) {
          fetchPlayer(id: $id) {
            clientId
            name
            avatar
            description
          }
        }`,
        variables: {
          id: "1",
        },
      });
    expect(response.status).to.equal(200);
    expect(response.body.data.fetchPlayer).to.eql({
      clientId: "1",
      name: "Jonny Appleseed",
      avatar: "man_apple_head",
      description: "I want an avatar with an apple for a head",
    });
  });

  it(`cannot fetch non-existing player`, async () => {
    const response = await request(app)
      .post("/graphql")
      .send({
        query: `
        query FetchPlayer($id: String!) {
          fetchPlayer(id: $id) {
            clientId
            name
            avatar
            description
          }
        }`,
        variables: {
          id: "2",
        },
      });
    expect(response.status).to.equal(200);
    expect(response.body.data.fetchPlayer).to.eql(null);
  });
});
