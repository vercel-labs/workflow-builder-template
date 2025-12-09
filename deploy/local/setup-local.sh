#!/bin/bash
set -e

# Resource requirements (match deploy.sh)
MIN_MEMORY_GB=4
MIN_CPU_CORES=2

# Parse arguments
CHECK_ONLY=false
for arg in "$@"; do
    case $arg in
        --check)
            CHECK_ONLY=true
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --check   Quick check if environment is ready for deploy"
            echo "  --help    Show this help message"
            echo ""
            echo "Without options, runs full setup (minikube, SSL, PostgreSQL, etc.)"
            exit 0
            ;;
        *)
            echo "Unknown option: $arg"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Quick check function - verifies environment is ready for deploy
quick_check() {
    echo ""
    echo "==================================="
    echo "Checking local environment..."
    echo "==================================="
    echo ""

    local errors=0

    # Check prerequisites
    command -v minikube >/dev/null 2>&1 || { echo "✗ minikube not installed"; errors=$((errors + 1)); }
    command -v kubectl >/dev/null 2>&1 || { echo "✗ kubectl not installed"; errors=$((errors + 1)); }
    command -v helm >/dev/null 2>&1 || { echo "✗ helm not installed"; errors=$((errors + 1)); }
    command -v docker >/dev/null 2>&1 || { echo "✗ docker not installed"; errors=$((errors + 1)); }

    # Check Docker daemon
    if ! docker info &>/dev/null; then
        echo "✗ Docker daemon is not running"
        errors=$((errors + 1))
    else
        echo "✓ Docker daemon running"
    fi

    # Check Minikube
    if ! minikube status 2>/dev/null | grep -q "Running"; then
        echo "✗ Minikube is not running"
        errors=$((errors + 1))
    else
        echo "✓ Minikube running"
    fi

    # Check local namespace
    if ! kubectl get namespace local &>/dev/null; then
        echo "✗ Namespace 'local' does not exist"
        errors=$((errors + 1))
    else
        echo "✓ Namespace 'local' exists"
    fi

    # Check ingress controller
    if ! kubectl get pods -n ingress-nginx -l app.kubernetes.io/component=controller 2>/dev/null | grep -q "Running"; then
        echo "✗ Ingress controller not ready"
        errors=$((errors + 1))
    else
        echo "✓ Ingress controller ready"
    fi

    # Check PostgreSQL
    if ! kubectl get pods -n local -l app.kubernetes.io/name=postgresql 2>/dev/null | grep -q "Running"; then
        echo "✗ PostgreSQL not running"
        errors=$((errors + 1))
    else
        echo "✓ PostgreSQL running"
    fi

    # Check cert-manager (optional, warn only)
    if ! kubectl get pods -n local -l app.kubernetes.io/instance=cert-manager 2>/dev/null | grep -q "Running"; then
        echo "⚠ cert-manager not running (HTTPS may not work)"
    else
        echo "✓ cert-manager running"
    fi

    echo ""

    if [ $errors -gt 0 ]; then
        echo "==================================="
        echo "Environment NOT ready ($errors issue(s) found)"
        echo "==================================="
        echo ""
        echo "Run 'make setup-local-kubernetes' to set up the environment"
        exit 1
    else
        echo "==================================="
        echo "Environment ready for deployment!"
        echo "==================================="
        exit 0
    fi
}

# If --check flag, run quick check and exit
if [ "$CHECK_ONLY" = true ]; then
    quick_check
fi

echo "Setting up local development environment for KeeperHub..."

# Check prerequisites
check_prerequisites() {
    local missing_deps=0

    echo ""
    echo "==================================="
    echo "Checking prerequisites..."
    echo "==================================="
    echo ""

    command -v minikube >/dev/null 2>&1 || { echo "✗ minikube is required but not installed - brew install minikube" >&2; missing_deps=1; }
    command -v kubectl >/dev/null 2>&1 || { echo "✗ kubectl is required but not installed - brew install kubectl" >&2; missing_deps=1; }
    command -v helm >/dev/null 2>&1 || { echo "✗ helm is required but not installed - brew install helm" >&2; missing_deps=1; }
    command -v docker >/dev/null 2>&1 || { echo "✗ docker is required but not installed" >&2; missing_deps=1; }

    if [ $missing_deps -eq 1 ]; then
        echo ""
        echo "Please install missing dependencies and try again"
        exit 1
    fi

    echo "✓ All prerequisites installed"
}

# Check system resources (match deploy.sh)
check_resources() {
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
        echo "  ✓ OK"
    fi

    # Check Docker daemon
    if ! docker info &>/dev/null; then
        echo "✗ Docker daemon is not running"
        exit 1
    else
        echo "Docker daemon: ✓ OK"
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

# Start minikube
start_minikube() {
    echo ""
    echo "==================================="
    echo "Starting minikube..."
    echo "==================================="
    echo ""

    # Check if minikube is already running
    if minikube status 2>/dev/null | grep -q "Running"; then
        echo "Minikube is already running"
        # Ensure ingress addon is enabled
        if ! minikube addons list | grep -q "ingress.*enabled"; then
            echo "Enabling ingress addon..."
            minikube addons enable ingress
            echo "Waiting for ingress controller to be ready..."
            kubectl wait --for=condition=Ready pods -l app.kubernetes.io/component=controller -n ingress-nginx --timeout=120s
        fi
        return 0
    fi

    # Check if minikube exists but is stopped
    if minikube status 2>/dev/null | grep -q "Stopped"; then
        echo "Minikube exists but is stopped. Starting..."
        minikube start
        kubectl wait --for=condition=Ready nodes --all --timeout=300s
        echo "Minikube is ready"
        return 0
    fi

    echo "Creating a new minikube cluster..."

    export KUBECONFIG=~/.kube/config
    minikube start \
        --driver=docker \
        --memory=${MIN_MEMORY_GB}g \
        --cpus=${MIN_CPU_CORES} \
        --addons=ingress \
        --kubernetes-version=stable \
        --install-addons=true

    # Wait for minikube to be ready
    echo "Waiting for minikube to be ready..."
    kubectl wait --for=condition=Ready nodes --all --timeout=300s

    # Wait for ingress controller to be ready
    echo "Waiting for ingress controller to be ready..."
    kubectl wait --for=condition=Ready pods -l app.kubernetes.io/component=controller -n ingress-nginx --timeout=120s

    echo "Minikube is ready"
}

# Apply Kubernetes resources
apply_resources() {
    echo ""
    echo "==================================="
    echo "Applying Kubernetes resources..."
    echo "==================================="
    echo ""

    kubectl apply -f deploy/local/kubernetes-resources.yaml
    echo "✓ Kubernetes resources applied"
}

# Setup SSL certificates using mkcert
setup_ssl() {
    echo ""
    echo "==================================="
    echo "Setting up SSL certificates..."
    echo "==================================="
    echo ""

    # Check if mkcert is installed
    if ! command -v mkcert &> /dev/null; then
        echo "mkcert is not installed"
        echo ""
        echo "Please install mkcert first:"
        echo ""
        echo "  Linux:"
        echo "    sudo apt install libnss3-tools"
        echo "    curl -JLO 'https://dl.filippo.io/mkcert/latest?for=linux/amd64'"
        echo "    chmod +x mkcert-v*-linux-amd64"
        echo "    sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert"
        echo ""
        echo "  Mac:"
        echo "    brew install mkcert"
        echo ""
        echo "After installing, run this script again."
        exit 1
    fi

    # Install mkcert's local CA if not already installed
    CA_ROOT=$(mkcert -CAROOT)
    if [ ! -f "$CA_ROOT/rootCA.pem" ]; then
        echo "Installing mkcert local CA (this will be trusted by your browser)..."
        echo "You may be prompted for your password to install the CA certificate."
        mkcert -install
        echo "mkcert CA installed successfully!"
    else
        echo "mkcert local CA is already installed at: $CA_ROOT"
    fi

    # Add and update cert-manager helm repo
    helm repo add jetstack https://charts.jetstack.io
    helm repo update

    # Install cert-manager
    helm upgrade --install cert-manager jetstack/cert-manager \
        --namespace local \
        --set crds.enabled=true \
        --wait

    # Wait for cert-manager to be ready
    echo "Waiting for cert-manager pods to be ready..."
    kubectl wait --for=condition=Ready pods -l app.kubernetes.io/instance=cert-manager -n local --timeout=60s

    # Get mkcert CA certificate and key
    CA_ROOT=$(mkcert -CAROOT)
    CA_CERT="$CA_ROOT/rootCA.pem"
    CA_KEY="$CA_ROOT/rootCA-key.pem"

    if [ ! -f "$CA_CERT" ] || [ ! -f "$CA_KEY" ]; then
        echo "Error: mkcert CA files not found"
        echo "Expected CA certificate at: $CA_CERT"
        echo "Expected CA key at: $CA_KEY"
        exit 1
    fi

    # Create Kubernetes secret with mkcert CA certificate and key
    echo "Creating Kubernetes secret with mkcert CA..."
    kubectl create secret generic mkcert-ca \
        --from-file=tls.crt="$CA_CERT" \
        --from-file=tls.key="$CA_KEY" \
        --namespace=local \
        --dry-run=client -o yaml | kubectl apply -f -

    # Create a CA Issuer for cert-manager using mkcert CA
    echo "Creating Issuer with mkcert CA..."
    cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: mkcert-ca-issuer
  namespace: local
spec:
  ca:
    secretName: mkcert-ca
EOF

    # Wait a moment for the Issuer to be ready
    echo "Waiting for Issuer to be ready..."
    sleep 3

    # Delete existing certificate if it exists
    echo "Setting up Certificate resource for *.keeperhub.local..."
    kubectl delete certificate keeperhub-dev-cert -n local --ignore-not-found=true
    sleep 2

    # Create wildcard certificate for *.keeperhub.local
    cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: keeperhub-dev-cert
  namespace: local
spec:
  secretName: keeperhub-dev-cert
  commonName: "*.keeperhub.local"
  dnsNames:
    - "*.keeperhub.local"
    - "keeperhub.local"
  issuerRef:
    name: mkcert-ca-issuer
    kind: Issuer
EOF

    echo ""
    echo "Certificate setup complete!"
    echo ""
    echo "The certificate is signed by mkcert's local CA, which your browser already trusts."
    echo "No manual certificate import needed - browsers will accept it automatically!"
}

# Setup Database
setup_database() {
    echo ""
    echo "==================================="
    echo "Setting up PostgreSQL..."
    echo "==================================="
    echo ""

    # Add Bitnami repo
    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm repo update

    # Install PostgreSQL
    echo "Installing PostgreSQL..."
    helm upgrade --install -n local postgresql \
        oci://registry-1.docker.io/bitnamicharts/postgresql \
        --set auth.username=local \
        --set auth.password=local \
        --set auth.database=local \
        --set auth.postgresPassword=local \
        --set image.registry=docker.io \
        --set image.repository=bitnamilegacy/postgresql \
        --set image.tag=17.6.0-debian-12-r4

    # Wait for PostgreSQL to be ready
    echo "Waiting for PostgreSQL to be ready..."
    kubectl wait --for=condition=Ready pods -l app.kubernetes.io/name=postgresql -n local --timeout=120s
}

# Create keeperhub database
create_keeperhub_db() {
    echo ""
    echo "==================================="
    echo "Creating keeperhub database..."
    echo "==================================="
    echo ""

    # Wait a bit more for PostgreSQL to be fully ready
    sleep 5

    # Create the keeperhub database
    kubectl exec -n local postgresql-0 -- bash -c 'PGPASSWORD=local psql -U postgres -c "CREATE DATABASE keeperhub;"' 2>/dev/null || echo "Database keeperhub already exists"
    kubectl exec -n local postgresql-0 -- bash -c 'PGPASSWORD=local psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE keeperhub TO local;"' 2>/dev/null || true

    # Grant schema permissions for migrations
    kubectl exec -n local postgresql-0 -- bash -c 'PGPASSWORD=local psql -U postgres -d keeperhub -c "GRANT ALL ON SCHEMA public TO local; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO local;"' 2>/dev/null || true

    echo "Database keeperhub created successfully"
}

# Main setup process
main() {
    check_prerequisites
    check_resources
    start_minikube
    apply_resources
    setup_ssl
    setup_database
    create_keeperhub_db

    echo ""
    echo "==================================="
    echo "Local environment setup complete!"
    echo "==================================="
    echo ""
    echo "Next steps:"
    echo "  1. Run 'minikube tunnel' in another terminal"
    echo "  2. Add to /etc/hosts: $(minikube ip) workflow.keeperhub.local"
    echo "  3. Run 'make deploy-to-local-kubernetes' to deploy KeeperHub"
    echo ""
    echo "KeeperHub will be available at: https://workflow.keeperhub.local/"
}

main
