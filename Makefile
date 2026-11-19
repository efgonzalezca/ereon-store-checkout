COMPOSE_DEV := docker compose --env-file backend/.env -f docker-compose.yml -f docker-compose.dev.yml
SVC         := backend

.PHONY: help dev down status logs build test coverage

help:
	@echo ""
	@echo "Stack (requires backend/.env, copy it from backend/.env.example):"
	@echo "  make dev                - up --build"
	@echo "  make down               - down"
	@echo "  make status             - ps"
	@echo "  make logs               - logs -f"
	@echo "  make build              - rebuild backend"
	@echo ""
	@echo "Backend (NestJS + Jest):"
	@echo "  make test               - jest (run once)"
	@echo "  make coverage           - jest --coverage (term + coverage/)"

dev:
	$(COMPOSE_DEV) up --build

down:
	$(COMPOSE_DEV) down

status:
	$(COMPOSE_DEV) ps

logs:
	$(COMPOSE_DEV) logs -f

build:
	$(COMPOSE_DEV) build $(SVC)

test:
	$(COMPOSE_DEV) exec $(SVC) npm test

coverage:
	$(COMPOSE_DEV) exec $(SVC) npm run test:cov
