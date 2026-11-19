COMPOSE_DEV := docker compose --env-file backend/.env -f docker-compose.yml -f docker-compose.dev.yml
SVC         := backend
FE_SVC      := frontend

.PHONY: help dev down status logs build test coverage test-frontend coverage-frontend migrate upgrade downgrade seed

help:
	@echo ""
	@echo "Stack (requires backend/.env and frontend/.env, copy them from .env.example):"
	@echo "  make dev                - up --build (renews node_modules volume)"
	@echo "  make down               - down"
	@echo "  make status             - ps"
	@echo "  make logs               - logs -f"
	@echo "  make build              - rebuild backend"
	@echo ""
	@echo "Backend (NestJS + Jest):"
	@echo "  make test               - jest (run once)"
	@echo "  make coverage           - jest --coverage (term + coverage/)"
	@echo ""
	@echo "Migrations (TypeORM):"
	@echo "  make migrate m=\"Name\"   - generate migration + run"
	@echo "  make upgrade            - run pending migrations"
	@echo "  make downgrade          - revert last migration"
	@echo ""
	@echo "Demo data:"
	@echo "  make seed               - populate database with dummy products"
	@echo ""
	@echo "Frontend (React + Jest):"
	@echo "  make test-frontend      - jest (run once)"
	@echo "  make coverage-frontend  - jest --coverage (term + coverage/)"

dev:
	$(COMPOSE_DEV) up --build --renew-anon-volumes

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

migrate:
ifndef m
	$(error usage: make migrate m="CreateProductsTable")
endif
	$(COMPOSE_DEV) exec $(SVC) npm run migration:generate -- src/database/migrations/$(m)
	$(COMPOSE_DEV) exec $(SVC) npm run migration:run

upgrade:
	$(COMPOSE_DEV) exec $(SVC) npm run migration:run

downgrade:
	$(COMPOSE_DEV) exec $(SVC) npm run migration:revert

seed:
	$(COMPOSE_DEV) exec $(SVC) npm run seed

test-frontend:
	$(COMPOSE_DEV) exec $(FE_SVC) npm test -- --watchAll=false

coverage-frontend:
	$(COMPOSE_DEV) exec $(FE_SVC) npm run test:cov
