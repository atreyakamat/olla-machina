.PHONY: build clean

build:
	cd cli/go && go build -o ../../ollama-fit main.go

clean:
	rm -f ollama-fit
