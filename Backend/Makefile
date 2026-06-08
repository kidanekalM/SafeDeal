# SafeDeal Monolithic Application Makefile

.PHONY: build run dev test clean docker-build docker-run docker-down help

# Default target
help: ## Show this help message
	@echo "SafeDeal Monolithic Application"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Build the application binary
build: ## Build the application binary
	go build -o bin/app cmd/main.go

# Run the application locally
run: ## Run the application locally
	go run cmd/main.go

# Run the application in development mode with live reload
dev: ## Run the application in development mode
	@echo "Starting development server..."
	@go run cmd/main.go

# Run tests
test: ## Run tests
	go test ./...

# Build Docker image
docker-build: ## Build Docker image
	docker-compose build

# Run the application with Docker Compose
docker-run: ## Run the application with Docker Compose
	docker-compose up --build

# Stop and remove Docker containers
docker-down: ## Stop and remove Docker containers
	docker-compose down

# Clean build artifacts
clean: ## Clean build artifacts
	rm -rf bin/

# Install dependencies
deps: ## Install dependencies
	go mod tidy

# Generate environment file template
env: ## Generate environment file template
	cp .env.example .env
	@echo "Environment file template created at .env. Please update the values."

# Run database migrations (placeholder - actual implementation would depend on migration setup)
migrate: ## Run database migrations (placeholder)
	@echo "Database migrations would run here"