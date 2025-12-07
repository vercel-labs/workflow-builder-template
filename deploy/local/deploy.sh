#!/bin/bash
set -e

# Default values
DRY_RUN=false
SKIP_BUILD=false
SKIP_RESOURCE_CHECK=false
MIN_MEMORY_GB=4
MIN_CPU_CORES=2

# Track timing
SCRIPT_START_TIME=$(date +%s)
declare -A BUILD_TIMES

# Parse command line arguments
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --dry-run             Show what would be built/deployed without doing it"
    echo "  --skip-build          Skip Docker build, only deploy with existing image"
    echo "  --skip-resource-check Skip the system resource validation"
    echo "  --help                Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                          # Build and deploy"
    echo "  $0 --skip-build             # Deploy only (use existing image)"
    echo "  $0 --dry-run                # Show what would happen"
}

for arg in "$@"; do
    case $arg in
    --dry-run)
        DRY_RUN=true
        ;;
    --skip-build)
        SKIP_BUILD=true
        ;;
    --skip-resource-check)
        SKIP_RESOURCE_CHECK=true
        ;;
    --help)
        show_help
        exit 0
        ;;
    *)
        echo "Unknown option: $arg"
        show_help
        exit 1
        ;;
    esac
done

# Cleanup function for error handling
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        echo ""
        echo "==================================="
        echo "Deployment failed with exit code: $exit_code"
        echo "==================================="
        show_timing_summary
    fi
}
trap cleanup EXIT

# Function to check system resources
check_resources() {
    if [ "$SKIP_RESOURCE_CHECK" = true ]; then
        echo "Skipping resource check (--skip-resource-check)"
        return 0
    fi

    echo ""
    echo "==================================="
    echo "Checking system resources..."
    echo "==================================="
    echo ""

    local warnings=0

    # Check available memory
    local total_mem_kb=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    local avail_mem_kb=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
    local total_mem_gb=$((total_mem_kb / 1024 / 1024))
    local avail_mem_gb=$((avail_mem_kb / 1024 / 1024))

    echo "Memory: ${avail_mem_gb}GB available / ${total_mem_gb}GB total"

    if [ "$avail_mem_gb" -lt "$MIN_MEMORY_GB" ]; then
        echo "  Warning: Less than ${MIN_MEMORY_GB}GB available memory"
        warnings=$((warnings + 1))
    else
        echo "  OK"
    fi

    # Check Docker daemon
    if ! docker info &>/dev/null; then
        echo "Docker daemon is not running"
        exit 1
    else
        echo "Docker daemon: OK"
    fi

    # Check Minikube status
    if ! minikube status &>/dev/null; then
        echo "Minikube is not running"
        echo "  Start with: minikube start --driver=docker --memory=8192 --cpus=4"
        exit 1
    else
        echo "Minikube: OK"
    fi

    if [ $warnings -gt 0 ]; then
        echo ""
        echo "Found $warnings warning(s). Proceeding anyway..."
        sleep 2
    else
        echo ""
        echo "All resource checks passed!"
    fi
}

# Function to format duration
format_duration() {
    local seconds=$1
    if [ "$seconds" -lt 60 ]; then
        echo "${seconds}s"
    elif [ "$seconds" -lt 3600 ]; then
        local mins=$((seconds / 60))
        local secs=$((seconds % 60))
        echo "${mins}m ${secs}s"
    else
        local hours=$((seconds / 3600))
        local mins=$(((seconds % 3600) / 60))
        echo "${hours}h ${mins}m"
    fi
}

# Function to show timing summary
show_timing_summary() {
    local end_time=$(date +%s)
    local total_duration=$((end_time - SCRIPT_START_TIME))

    echo ""
    echo "==================================="
    echo "Timing Summary"
    echo "==================================="

    for service in "${!BUILD_TIMES[@]}"; do
        echo "  ${service}: $(format_duration ${BUILD_TIMES[$service]})"
    done

    echo "  Total: $(format_duration $total_duration)"
}

IMAGE_TAG=$(date +%Y-%m-%d-%H-%M-%S)

# Show configuration
echo ""
echo "==================================="
echo "KeeperHub Local Kubernetes Deployment"
echo "==================================="
echo "Image tag: $IMAGE_TAG"
echo "Working directory: $(pwd)"
echo "Dry run: ${DRY_RUN}"
echo "Skip build: ${SKIP_BUILD}"
echo "==================================="
echo ""

# Check resources before starting
if [ "$DRY_RUN" = false ]; then
    check_resources
fi

# Build Docker image
if [ "$SKIP_BUILD" = false ]; then
    echo ""
    echo "==================================="
    echo "Phase 1: Building Docker Image"
    echo "==================================="
    echo ""

    if [ "$DRY_RUN" = true ]; then
        echo "[DRY RUN] Would build: docker build . -t keeperhub:$IMAGE_TAG"
    else
        start_time=$(date +%s)
        docker build . -t keeperhub:$IMAGE_TAG
        end_time=$(date +%s)
        BUILD_TIMES["build:keeperhub"]=$((end_time - start_time))
        echo ""
        echo "Built keeperhub:$IMAGE_TAG in $(format_duration ${BUILD_TIMES["build:keeperhub"]})"
    fi

    # Load image into Minikube
    echo ""
    echo "==================================="
    echo "Phase 2: Loading Image into Minikube"
    echo "==================================="
    echo ""

    if [ "$DRY_RUN" = true ]; then
        echo "[DRY RUN] Would load: minikube image load keeperhub:$IMAGE_TAG"
    else
        start_time=$(date +%s)
        minikube image load keeperhub:$IMAGE_TAG
        end_time=$(date +%s)
        BUILD_TIMES["load:keeperhub"]=$((end_time - start_time))
        echo "Loaded keeperhub:$IMAGE_TAG in $(format_duration ${BUILD_TIMES["load:keeperhub"]})"
    fi
else
    # Get the latest image tag from minikube
    echo "Skipping build, using existing image..."
    EXISTING_TAG=$(minikube image list 2>/dev/null | grep "keeperhub:" | head -1 | sed 's/.*keeperhub://' | cut -d' ' -f1)
    if [ -n "$EXISTING_TAG" ]; then
        IMAGE_TAG="$EXISTING_TAG"
        echo "Using existing image: keeperhub:$IMAGE_TAG"
    else
        echo "No existing keeperhub image found in Minikube. Please run without --skip-build first."
        exit 1
    fi
fi

# Process template and deploy
echo ""
echo "==================================="
echo "Phase 3: Deploying with Helm"
echo "==================================="
echo ""

# Generate values file from template
if [ "$DRY_RUN" = true ]; then
    echo "[DRY RUN] Would process template: values-keeperhub.template.yaml -> values-keeperhub.yaml"
else
    sed "s/\${IMAGE_TAG}/$IMAGE_TAG/g" ./deploy/local/values-keeperhub.template.yaml > ./deploy/local/values-keeperhub.yaml
fi

# Add helm repo
if [ "$DRY_RUN" = true ]; then
    echo "[DRY RUN] Would run: helm repo add/update"
else
    helm repo add techops-services https://techops-services.github.io/helm-charts 2>/dev/null || true
    helm repo update
fi

# Deploy with Helm
if [ "$DRY_RUN" = true ]; then
    echo "[DRY RUN] Would deploy: helm upgrade --install keeperhub techops-services/common"
else
    start_time=$(date +%s)

    # Uninstall existing release if it exists (to ensure clean deploy)
    helm uninstall keeperhub -n local --wait 2>/dev/null || true

    helm upgrade --install \
        --timeout 5m0s \
        --atomic \
        -f ./deploy/local/values-keeperhub.yaml \
        --dependency-update \
        -n local \
        --version 0.1.7 \
        keeperhub \
        techops-services/common

    end_time=$(date +%s)
    BUILD_TIMES["deploy:keeperhub"]=$((end_time - start_time))
    echo ""
    echo "Deployed keeperhub in $(format_duration ${BUILD_TIMES["deploy:keeperhub"]})"
fi

# Apply ingress for keeperhub
echo ""
echo "==================================="
echo "Phase 4: Configuring Ingress"
echo "==================================="
echo ""

if [ "$DRY_RUN" = true ]; then
    echo "[DRY RUN] Would apply: keeperhub ingress"
else
    cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: keeperhub-ingress
  namespace: local
  annotations:
    cert-manager.io/issuer: mkcert-ca-issuer
    nginx.ingress.kubernetes.io/enable-cors: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - "*.keeperhub.local"
      secretName: keeperhub-dev-cert
  rules:
    - host: workflow.keeperhub.local
      http:
        paths:
          - pathType: Prefix
            path: /
            backend:
              service:
                name: keeperhub-common
                port:
                  number: 3000
EOF
    echo "Ingress configured for workflow.keeperhub.local"
fi

# Show final summary
echo ""
echo "==================================="
echo "Deployment Complete!"
echo "==================================="

show_timing_summary

echo ""
echo "Access the application:"
echo "  KeeperHub: https://workflow.keeperhub.local/"
echo ""
echo "Make sure:"
echo "  1. 'minikube tunnel' is running in another terminal"
echo "  2. /etc/hosts has: $(minikube ip) workflow.keeperhub.local"
echo ""

# Show pod status
echo "Pod status:"
kubectl get pods -n local -l app.kubernetes.io/instance=keeperhub
