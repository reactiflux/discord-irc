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
	$(JSHINT) .

jscs:
	$(JSCS) .

test:
	$(ISTANBUL) cover $(MOCHA) $(TESTS)
	$(ISTANBUL) report cobertura

server:
	@supervisor index

.PHONY: server install test jshint jscs production
