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

# Open shell to the postgres instance
p_shell:
	docker-compose exec postgres psql -U postgres twain

#CAUTION: WILL DELETE ALL DATA
reset_db: 
	docker-compose exec postgres psql -U postgres twain -c "DROP TABLE users, tasks, events;"



