#!/usr/bin/env bash
set -eo pipefail

# ─────────────────────────────────────────────
# Colors
# ─────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

ok()   { echo -e "${GREEN}✔${RESET}  $*"; }
info() { echo -e "${CYAN}→${RESET}  $*"; }
warn() { echo -e "${YELLOW}⚠${RESET}  $*"; }
fail() { echo -e "${RED}✘${RESET}  $*" >&2; }
header() { echo -e "\n${BOLD}$*${RESET}"; }

# ─────────────────────────────────────────────
# Header
# ─────────────────────────────────────────────
echo -e "${BOLD}"
echo "╔══════════════════════════════════════════╗"
echo "║      Chorus Interview — Setup Script     ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${RESET}"

ERRORS=0

# ─────────────────────────────────────────────
# 1. nvm + Node
# ─────────────────────────────────────────────
header "1. Node.js"

if [ -f "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck source=/dev/null
  source "$HOME/.nvm/nvm.sh"
elif command -v brew &>/dev/null && [ -f "$(brew --prefix nvm)/nvm.sh" ]; then
  # shellcheck source=/dev/null
  source "$(brew --prefix nvm)/nvm.sh"
fi

if ! command -v nvm &>/dev/null; then
  fail "nvm not found. Install it: https://github.com/nvm-sh/nvm#installing-and-updating"
  fail "Then re-run this script."
  ERRORS=$((ERRORS + 1))
else
  info "nvm found — installing/switching to Node LTS..."
  if [ "$(type -t nvm)" = "function" ]; then
    nvm install --lts
    nvm use --lts
  else
    nvm install lts
    nvm use lts
  fi
  ok "Node $(node --version)"
fi

# ─────────────────────────────────────────────
# 2. pnpm
# ─────────────────────────────────────────────
header "2. pnpm"

REQUIRED_PNPM="10.33.2"

if ! command -v pnpm &>/dev/null; then
  info "pnpm not found — installing via corepack..."
  corepack enable
  corepack prepare "pnpm@${REQUIRED_PNPM}" --activate
fi

CURRENT_PNPM=$(pnpm --version 2>/dev/null || echo "0")
if [ "$CURRENT_PNPM" != "$REQUIRED_PNPM" ]; then
  info "Activating pnpm ${REQUIRED_PNPM} via corepack..."
  corepack enable
  corepack prepare "pnpm@${REQUIRED_PNPM}" --activate
fi

ok "pnpm $(pnpm --version)"

# ─────────────────────────────────────────────
# 3. Docker Desktop + Kubernetes
# ─────────────────────────────────────────────
header "3. Docker Desktop + Kubernetes"

if ! command -v docker &>/dev/null; then
  fail "Docker not found. Install Docker Desktop: https://www.docker.com/products/docker-desktop/"
  ERRORS=$((ERRORS + 1))
else
  if ! docker info &>/dev/null; then
    fail "Docker daemon is not running. Please start Docker Desktop."
    ERRORS=$((ERRORS + 1))
  else
    ok "Docker $(docker --version | awk '{print $3}' | tr -d ',')"

    if ! kubectl config get-contexts docker-desktop &>/dev/null 2>&1; then
      warn "Kubernetes context 'docker-desktop' not found."
      warn "Enable Kubernetes in Docker Desktop: Settings → Kubernetes → Enable Kubernetes"
      ERRORS=$((ERRORS + 1))
    else
      if ! kubectl cluster-info --context docker-desktop &>/dev/null 2>&1; then
        fail "Kubernetes is not reachable. Make sure it is running in Docker Desktop."
        ERRORS=$((ERRORS + 1))
      else
        ok "Kubernetes (docker-desktop) is running"
      fi
    fi
  fi
fi

# ─────────────────────────────────────────────
# 4. Tilt
# ─────────────────────────────────────────────
header "4. Tilt"

if ! command -v tilt &>/dev/null; then
  fail "Tilt not found. Install it: https://docs.tilt.dev/install.html"
  fail "  macOS:  brew install tilt"
  fail "  Linux:  curl -fsSL https://raw.githubusercontent.com/tilt-dev/tilt/master/scripts/install.sh | bash"
  ERRORS=$((ERRORS + 1))
else
  ok "Tilt $(tilt version 2>/dev/null | head -1)"
fi

# ─────────────────────────────────────────────
# Bail if prerequisites are missing
# ─────────────────────────────────────────────
if [ "$ERRORS" -gt 0 ]; then
  echo ""
  fail "${ERRORS} prerequisite(s) missing. Fix the issues above and re-run:"
  echo -e "    ${CYAN}bash scripts/setup.sh${RESET}"
  exit 1
fi

# ─────────────────────────────────────────────
# 5. Install dependencies
# ─────────────────────────────────────────────
header "5. Installing dependencies"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

info "Running pnpm install..."
pnpm install
ok "Dependencies installed"

# ─────────────────────────────────────────────
# Done
# ─────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}✔ All set!${RESET}"
echo ""
echo -e "Start the dev environment:"
echo -e "    ${CYAN}tilt up${RESET}"
echo ""
echo -e "Services:"
echo -e "    Frontend  →  ${CYAN}http://localhost:4200${RESET}"
echo -e "    Backend   →  ${CYAN}http://localhost:3000/api${RESET}"
echo -e "    Postgres  →  ${CYAN}localhost:5432${RESET}  (admin/admin, db: pokemon)"
echo ""
echo -e "Stop everything:"
echo -e "    ${CYAN}tilt down${RESET}"
echo ""