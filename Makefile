.PHONY: all build run test

all: build run

build:
	docker build -t twain/backend .

run:
	-pkill docker-compose
	docker-compose up

run_background:
	-pkill docker-compose
	docker-compose up -d

stop:
	docker-compose down

format:
	npx prettier --write --arrow-parens always --single-quote --trailing-comma all --no-bracket-spacing "src/**/*.js"
	npx prettier --write --arrow-parens always --single-quote --trailing-comma all --no-bracket-spacing "test/**/*.js"

# Currently not working yet
test:
	docker exec -i -t `docker ps -q --filter status=running --filter ancestor=twain/backend:latest` /bin/bash -c "npm run test"



