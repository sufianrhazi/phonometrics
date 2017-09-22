all:
	mkdir -p build/tsc/
	mkdir -p build/bundle/
	s/compile
	s/bundle

.PHONY: all
