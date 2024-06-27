
.PHONY: format
format: node_modules/prettier
	npm run license:fix && npm run format

.PHONY: pretty
pretty: node_modules/prettier
	npm run format

.PHONY: test-all
test-all: test-license test-format test-lint test-types test

.PHONY: test-format
test-format: node_modules/prettier
	npm run test:format

.PHONY: test-license
test-license: node_modules/license-check-and-add
	npm run test:license

.PHONY: test-lint
test-lint: node_modules/eslint
	npm run test:lint

.PHONY: test-types
test-types: node_modules/typescript
	npm run test:types

.PHONY: test
test: node_modules/mocha
	export APP_DISABLE_AUTO_START=true \
	&& export ENV=test \
	&& export NODE_PATH=$(shell pwd)/src \
	&& npm test

node_modules/prettier:
	npm ci