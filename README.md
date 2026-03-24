# Math Meridio GQL

Project Requirements:

- [Make](https://askubuntu.com/questions/161104/how-do-i-install-make)
- [nvm](https://github.com/nvm-sh/nvm) (to manage node versions)
- node version 18.13
    - `nvm install 18.13`
    - `nvm use 18.13`
    - verify using `$ node --version`

## Local Unit Tests
- We use various testing frameworks to run unit tests, including mocha, chai, mongo-unit, and supertest.
- You may look at the *.spec.ts files under test/graphql/ for unit test examples.
- Run `make test` to run all unit tests.

## Pushing code changes

- Before pushing your changes to github, run `make format` and `make test-all` to confirm all tests pass.
- ALWAYS push your changes to a separate branch and open a PR when your changes are ready to be reviewed.
- Request a review from a team member.
- Once the PR is approved, merge into main.

## Deploying code changes to dev/qa/prod

- Deploy to dev: Merging your changes into the `main` branch will automatically trigger a deployment to the dev environment.
- Deploy to qa: Merging your changes into the `release` branch will automatically trigger a deployment to the qa environment.
- Deploy to prod: Log into your ABE AWS account. Visit the CodePipeline service. Locate and access math-meridio-gql-release-cicd-pipeline. Locate the "Approve" card. Click Approval and approve the deployment. Note: You must wait for your QA deployment to finish processing before you can deploy those changes to prod.

## Migrating Discussion Stage / Prompt Steps Between Environments

- [Go to Migration Guide](./discussion-stage-migration.md)



Tech Debt:
- [ ] Automate Discussion Stage Step migration.