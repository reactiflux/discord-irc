BIN = node_modules/.bin
JSHINT = $(BIN)/jshint
JSCS = $(BIN)/jscs

install: node_modules

node_modules: package.json
	@npm install

jshint:
	$(JSHINT) .

jscs:
	$(JSCS) .

server:
	@supervisor index

.PHONY: server install test jshint jscs production
