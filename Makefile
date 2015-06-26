BIN = node_modules/.bin
MOCHA = $(BIN)/_mocha
ISTANBUL = $(BIN)/istanbul
JSHINT = $(BIN)/jshint
JSCS = $(BIN)/jscs

TESTS = $(shell find test -name "*.test.js")

install: node_modules

node_modules: package.json
	@npm install

jshint:
	$(JSHINT) --exclude-path .gitignore .

jscs:
	$(JSCS) .

make cover:
	NODE_ENV="test" $(ISTANBUL) cover $(MOCHA) $(TESTS)
	$(ISTANBUL) report cobertura

make lint: jshint jscs

test: jshint jscs cover

server:
	@supervisor index

.PHONY: server install cover test jshint jscs lint production
