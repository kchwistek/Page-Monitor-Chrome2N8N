#!/bin/bash
#
# Setup script for git hooks
# This script sets up git hooks for the project
#

set -e

echo "🔧 Setting up git hooks..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}⚠️  Warning: Not in a git repository${NC}"
    echo "   Initializing git repository..."
    git init
fi

# Create .git/hooks directory if it doesn't exist
mkdir -p .git/hooks

# Install/update pre-commit hook
echo "📝 Installing/updating pre-commit hook..."
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Pre-commit hook - see scripts/hooks/pre-commit for source
EOF
cat scripts/hooks/pre-commit >> .git/hooks/pre-commit 2>/dev/null || {
    echo "   Error: Could not read scripts/hooks/pre-commit"
    exit 1
}
chmod +x .git/hooks/pre-commit
echo -e "${GREEN}✅ Pre-commit hook installed${NC}"

# Install/update pre-push hook
echo "📝 Installing/updating pre-push hook..."
cat > .git/hooks/pre-push << 'EOF'
#!/bin/bash
# Pre-push hook - see scripts/hooks/pre-push for source
EOF
cat scripts/hooks/pre-push >> .git/hooks/pre-push 2>/dev/null || {
    echo "   Error: Could not read scripts/hooks/pre-push"
    exit 1
}
chmod +x .git/hooks/pre-push
echo -e "${GREEN}✅ Pre-push hook installed${NC}"

echo ""
echo -e "${GREEN}✅ Git hooks setup complete!${NC}"
echo ""
echo "Hooks installed:"
echo "  - pre-commit: Validates manifest and checks code quality"
echo "  - pre-push: Runs tests before pushing"
echo ""
echo "To bypass hooks (not recommended):"
echo "  git commit --no-verify"
echo "  git push --no-verify"

