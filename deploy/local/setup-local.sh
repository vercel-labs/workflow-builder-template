#!/bin/bash
set -e

echo "Setting up local development environment for KeeperHub..."

# Check prerequisites
check_prerequisites() {
    local missing_deps=0

    command -v minikube >/dev/null 2>&1 || { echo "minikube is required but not installed - brew install minikube" >&2; missing_deps=1; }
    command -v kubectl >/dev/null 2>&1 || { echo "kubectl is required but not installed - brew install kubectl" >&2; missing_deps=1; }
    command -v helm >/dev/null 2>&1 || { echo "helm is required but not installed - brew install helm" >&2; missing_deps=1; }
    command -v docker >/dev/null 2>&1 || { echo "docker is required but not installed" >&2; missing_deps=1; }

    if [ $missing_deps -eq 1 ]; then
        echo "Please install missing dependencies and try again"
        exit 1
    fi
}

# Start minikube
start_minikube() {
    echo "Starting minikube..."

    # Check if minikube is already running
    if minikube status | grep -q "Running"; then
        echo "Minikube is already running"
        return 0
    else
        echo "Creating a new minikube cluster..."
    fi

    export KUBECONFIG=~/.kube/config
    minikube start \
        --addons=ingress,ingress-dns,dashboard,metrics-server \
        --cni=flannel \
        --install-addons=true \
        --kubernetes-version=stable \
        --driver=docker \
        --extra-config=apiserver.service-node-port-range=1-65535 \
        --embed-certs \
        --cpus=no-limit --memory=no-limit

    # Wait for minikube to be ready
    echo "Waiting for minikube to be ready..."
    kubectl wait --for=condition=Ready nodes --all --timeout=300s
    echo "Minikube is ready"
}

# Apply Kubernetes resources
apply_resources() {
    echo "Applying Kubernetes resources..."
    kubectl apply -f deploy/local/kubernetes-resources.yaml
}

# Setup SSL certificates using mkcert
setup_ssl() {
    echo "Setting up SSL certificates with mkcert..."

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
    echo "Setting up PostgreSQL..."

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
    echo "Creating keeperhub database..."

    # Wait a bit more for PostgreSQL to be fully ready
    sleep 5

    # Create the keeperhub database
    kubectl exec -n local postgresql-0 -- psql -U postgres -c "CREATE DATABASE keeperhub;" 2>/dev/null || echo "Database keeperhub already exists"
    kubectl exec -n local postgresql-0 -- psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE keeperhub TO local;" 2>/dev/null || true

    echo "Database keeperhub created successfully"
}

# Main setup process
main() {
    check_prerequisites
    start_minikube
    apply_resources
    setup_ssl
    setup_database
    create_keeperhub_db

    echo ""
    echo "Local environment setup complete!"
    echo ""
    echo "Next steps:"
    echo "  1. Run 'minikube tunnel' in another terminal"
    echo "  2. Add to /etc/hosts: $(minikube ip) workflow.keeperhub.local"
    echo "  3. Run 'make deploy-to-local-kubernetes' to deploy KeeperHub"
    echo ""
    echo "KeeperHub will be available at: https://workflow.keeperhub.local/"
}

main
