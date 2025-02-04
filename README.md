# Math Meridio GQL

Project Requirements:

- [Make](https://askubuntu.com/questions/161104/how-do-i-install-make)
- [nvm](https://github.com/nvm-sh/nvm) (to manage node versions)
- node version 18.13
    - `nvm install 18.13`
    - `nvm use 18.13`
    - verify using `$ node --version`

## Local Development

Required: Create a `.env` file at the root of the project and fill with the required values.

1. Start the local server:
```
$ npm ci
$ make develop
```

2. Visit graphql playground: http://localhost:3000/offline/graphql

## Pushing code changes

- Before pushing your changes to github, run `make format` and `make test-all` to confirm all tests pass.
- ALWAYS push your changes to a separate branch and open a PR when your changes are ready to be reviewed.
- Request a review from a team member.
- Once the PR is approved, merge into main.