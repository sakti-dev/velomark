#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────────
# Velomark publish script
# Publishes npm packages in dependency order.
# Skips packages whose version is already published.
# ──────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}▸${NC} $*"; }
warn()  { echo -e "${YELLOW}▸${NC} $*"; }
error() { echo -e "${RED}✖${NC} $*"; exit 1; }

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ── Helpers ─────────────────────────────────────────────────

npm_version_exists() {
  local pkg="$1" version="$2"
  npm view "$pkg" version 2>/dev/null | grep -q "^${version}$"
}

read_json_field() {
  local file="$1" field="$2"
  node -e "console.log(require('$file').$field)"
}

# ── Package list (publish order: core first) ───────────────

PACKAGE_DIRS=("core" "code" "math" "mermaid")

# ── Pre-flight checks ──────────────────────────────────────

info "Checking prerequisites..."

command -v npm &>/dev/null || error "npm not found."
command -v vp &>/dev/null  || error "vp not found."

if [[ -n "$(git -C "$REPO_ROOT" status --porcelain)" ]]; then
  error "Working tree is not clean. Commit or stash changes first."
fi

info "Prerequisites OK."

# ── Read versions and check registry ────────────────────────

declare -A PKG_NAMES
declare -A PKG_VERSIONS
declare -A SHOULD_PUBLISH

for dir in "${PACKAGE_DIRS[@]}"; do
  manifest="$REPO_ROOT/packages/$dir/package.json"
  name=$(read_json_field "$manifest" name)
  version=$(read_json_field "$manifest" version)
  PKG_NAMES["$dir"]="$name"
  PKG_VERSIONS["$dir"]="$version"

  if npm_version_exists "$name" "$version"; then
    warn "$name@$version already published — skipping."
    SHOULD_PUBLISH["$dir"]=false
  else
    SHOULD_PUBLISH["$dir"]=true
  fi
done

# Check if anything needs publishing
ANY=false
for dir in "${PACKAGE_DIRS[@]}"; do
  [[ "${SHOULD_PUBLISH[$dir]}" == true ]] && ANY=true && break
done

if [[ "$ANY" == false ]]; then
  info "Nothing to publish. All versions already exist."
  exit 0
fi

# Check npm login
npm whoami &>/dev/null || error "Not logged in to npm. Run 'npm login' first."

# ── Summary ─────────────────────────────────────────────────

echo ""
info "Versions:"
for dir in "${PACKAGE_DIRS[@]}"; do
  name="${PKG_NAMES[$dir]}"
  version="${PKG_VERSIONS[$dir]}"
  if [[ "${SHOULD_PUBLISH[$dir]}" == true ]]; then
    info "  $name@$version → publish"
  else
    info "  $name@$version → skip"
  fi
done

echo ""
read -rp "Proceed? [y/N] " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  info "Aborted."
  exit 0
fi

# ── Run checks ──────────────────────────────────────────────

info "Running vp check..."
cd "$REPO_ROOT"
vp check

info "Running tests..."
vp run -r test

info "Running build..."
vp run -r build

info "Checks passed."

# ── Publish ─────────────────────────────────────────────────

for dir in "${PACKAGE_DIRS[@]}"; do
  [[ "${SHOULD_PUBLISH[$dir]}" == false ]] && continue

  name="${PKG_NAMES[$dir]}"
  version="${PKG_VERSIONS[$dir]}"

  info "Publishing $name@$version to npm..."
  cd "$REPO_ROOT/packages/$dir"
  npm publish --ignore-scripts
  info "$name published."
done

# ── Done ────────────────────────────────────────────────────

echo ""
info "Published:"
for dir in "${PACKAGE_DIRS[@]}"; do
  [[ "${SHOULD_PUBLISH[$dir]}" == true ]] && \
    info "  ${PKG_NAMES[$dir]}@${PKG_VERSIONS[$dir]} → npm"
done

info "Skipped:"
for dir in "${PACKAGE_DIRS[@]}"; do
  [[ "${SHOULD_PUBLISH[$dir]}" == false ]] && \
    info "  ${PKG_NAMES[$dir]}@${PKG_VERSIONS[$dir]} (already published)"
done

echo ""
info "Done."
