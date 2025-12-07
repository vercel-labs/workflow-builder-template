.DEFAULT_GOAL := help
.PHONY: help install dev build type-check lint fix deploy-to-local-kubernetes setup-local-kubernetes status logs restart teardown db-create db-migrate db-studio

# Development
install:
	pnpm install

dev:
	pnpm dev

build:
	pnpm build

type-check:
	pnpm type-check

lint:
	pnpm lint

fix:
	pnpm fix

# Local Kubernetes Deployment
setup-local-kubernetes:
	chmod +x ./deploy/local/setup-local.sh
	./deploy/local/setup-local.sh

deploy-to-local-kubernetes:
	chmod +x ./deploy/local/deploy.sh
	./deploy/local/deploy.sh

deploy-to-local-kubernetes-skip-build:
	chmod +x ./deploy/local/deploy.sh
	./deploy/local/deploy.sh --skip-build

status:
	@echo "=== Pods ==="
	@kubectl get pods -n local -l app.kubernetes.io/instance=keeperhub
	@echo ""
	@echo "=== Services ==="
	@kubectl get svc -n local -l app.kubernetes.io/instance=keeperhub
	@echo ""
	@echo "=== Ingress ==="
	@kubectl get ingress -n local | grep keeperhub || true

logs:
	kubectl logs -n local -l app.kubernetes.io/instance=keeperhub -f

restart:
	kubectl rollout restart deployment/keeperhub-common -n local

teardown:
	helm uninstall keeperhub -n local || true
	kubectl delete ingress keeperhub-ingress -n local || true

# Database Operations
db-create:
	@echo "Creating keeperhub database..."
	kubectl exec -n local postgresql-0 -- bash -c 'PGPASSWORD=local psql -U postgres -c "CREATE DATABASE keeperhub;"' 2>/dev/null || echo "Database keeperhub already exists"
	kubectl exec -n local postgresql-0 -- bash -c 'PGPASSWORD=local psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE keeperhub TO local;"'

db-migrate:
	@echo "Running database migrations..."
	@echo "Note: For local dev, migrations should run on app startup"
	@echo "For manual migration, exec into the pod: kubectl exec -it -n local <pod-name> -- pnpm db:push"

db-studio:
	@echo "Starting Drizzle Studio..."
	pnpm db:studio

# Help
help:
	@echo "KeeperHub Development Commands"
	@echo ""
	@echo "Usage: make <target>"
	@echo ""
	@echo "Targets:"
	@echo ""
	@echo "  Development:"
	@echo "    install                    - Install dependencies"
	@echo "    dev                        - Start development server"
	@echo "    build                      - Build for production"
	@echo "    type-check                 - Run TypeScript type checking"
	@echo "    lint                       - Run linter"
	@echo "    fix                        - Fix linting issues"
	@echo ""
	@echo "  Local Kubernetes:"
	@echo "    setup-local-kubernetes     - Setup minikube with all infrastructure"
	@echo "    deploy-to-local-kubernetes - Build and deploy to minikube"
	@echo "    deploy-to-local-kubernetes-skip-build - Deploy without rebuilding"
	@echo "    status                     - Show pods and services status"
	@echo "    logs                       - Follow keeperhub pod logs"
	@echo "    restart                    - Restart keeperhub deployment"
	@echo "    teardown                   - Delete keeperhub resources from cluster"
	@echo ""
	@echo "  Database:"
	@echo "    db-create                  - Create keeperhub database in PostgreSQL"
	@echo "    db-migrate                 - Info about running database migrations"
	@echo "    db-studio                  - Open Drizzle Studio"
