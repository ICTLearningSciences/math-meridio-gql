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

import createApp, { appStart, appStop } from "../../../src/app";
import { expect } from "chai";
import { Express } from "express";
import mongoUnit from "mongo-unit";
import request from "supertest";
import {
  GoogleAuthFunc,
  GoogleResponse,
  overrideGoogleAuthFunc,
  restoreGoogleAuthFunc,
} from "../../../src/schemas/mutation/login-google";
import PlayerModel from "../../../src/schemas/models/Player";
import ClassMembershipModel from "../../../src/schemas/models/classes/ClassMembership";

describe("login with google", () => {
  let app: Express;
  let googleAuthFunc: GoogleAuthFunc = (accessToken: string) => {
    return Promise.reject("override me");
  };

  function googleAuthFuncOverride(
    accessToken: string
  ): Promise<GoogleResponse> {
    return googleAuthFunc(accessToken);
  }

  beforeEach(async () => {
    overrideGoogleAuthFunc(googleAuthFuncOverride);
    await mongoUnit.load(require("test/fixtures/mongodb/data-default.js"));
    app = await createApp();
    await appStart();
  });

  afterEach(async () => {
    restoreGoogleAuthFunc();
    await appStop();
    await mongoUnit.drop();
  });

  it(`returns an error if no accessToken`, async () => {
    const response = await request(app)
      .post("/graphql")
      .send({
        query: `mutation {
        loginGoogle {
          user {
            name
            email
          }
          accessToken
          expirationDate
        }
      }`,
      });
    expect(response.status).to.equal(400);
  });

  it(`creates a new user for new google login`, async () => {
    googleAuthFunc = (accessToken: string) =>
      Promise.resolve<GoogleResponse>({
        id: "someid",
        name: "somename",
        email: "x@y.com",
        given_name: "somegivenname",
      });
    const response = await request(app)
      .post("/graphql")
      .send({
        query: `mutation {
        loginGoogle(accessToken: "anything") {
          user {
            name
            email
          }
          accessToken
          expirationDate
        }
      }`,
      });
    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "data.loginGoogle.user.name",
      "somename"
    );
    expect(response.body).to.have.deep.nested.property(
      "data.loginGoogle.user.email",
      "x@y.com"
    );
  });

  it(`gets existing user`, async () => {
    googleAuthFunc = (accessToken: string) =>
      Promise.resolve<GoogleResponse>({
        id: "123",
        name: "somename",
        email: "x@y.com",
        given_name: "somegivenname",
      });
    const response = await request(app)
      .post("/graphql")
      .send({
        query: `mutation {
        loginGoogle(accessToken: "anything") {
          user {
            name
            email
          }
          accessToken
          expirationDate
        }
      }`,
      });
    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "data.loginGoogle.user.name",
      "somename"
    );
    expect(response.body).to.have.deep.nested.property(
      "data.loginGoogle.user.email",
      "x@y.com"
    );
  });

  it("sets the users lastLoginAt to true", async () => {
    googleAuthFunc = (accessToken: string) =>
      Promise.resolve<GoogleResponse>({
        id: "123",
        name: "somename",
        email: "x@y.com",
        given_name: "somegivenname",
      });
    const response = await request(app)
      .post("/graphql")
      .send({
        query: `mutation {
        loginGoogle(accessToken: "anything") {
          user {
            name
            email
            lastLoginAt
          }
          accessToken
          expirationDate
        }
      }`,
      });
    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "data.loginGoogle.user.lastLoginAt"
    );
    const user = await PlayerModel.findOne({
      email: "x@y.com",
    });
    expect(user?.lastLoginAt).to.be.an.instanceOf(Date);
  });

  it("updates userId field for pre-existing class memberships for the user", async () => {
    const preExistingClassMembership = await ClassMembershipModel.create({
      userEmail: "x@y.com",
    });
    expect(preExistingClassMembership).to.exist;
    expect(preExistingClassMembership?.userEmail).to.equal("x@y.com");
    expect(preExistingClassMembership?.userId).to.be.undefined;
    googleAuthFunc = (accessToken: string) =>
      Promise.resolve<GoogleResponse>({
        id: "123",
        name: "somename",
        email: "x@y.com",
        given_name: "somegivenname",
      });
    const response = await request(app)
      .post("/graphql")
      .send({
        query: `mutation {
        loginGoogle(accessToken: "anything") {
          user {
            _id
            name
            email
          }
          accessToken
          expirationDate
        }
      }`,
      });
    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "data.loginGoogle.user.name",
      "somename"
    );
    expect(response.body).to.have.deep.nested.property(
      "data.loginGoogle.user.email",
      "x@y.com"
    );
    const updatedClassMembership = await ClassMembershipModel.findOne({
      userEmail: "x@y.com",
    });
    expect(updatedClassMembership?.userId).to.equal(
      response.body.data.loginGoogle.user._id
    );
    expect(updatedClassMembership?.userEmail).to.equal("x@y.com");
  });
});
