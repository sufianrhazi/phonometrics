all:
	mkdir -p build/tsc/
	mkdir -p build/bundle/
	tsc -p .
	node_modules/.bin/browserify build/tsc/main.js -o build/bundle/main.js

.PHONY: all
