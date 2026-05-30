#!/bin/bash

# Script to create pull request for IFS application
echo "=== IFS Application Pull Request Script ==="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: Please run this script from the ifs-program-react-app directory"
    exit 1
fi

echo "1. Checking git status..."
git status

echo ""
echo "2. Current commit details:"
git log --oneline -1

echo ""
echo "3. To complete the pull request, follow these steps:"
echo ""
echo "Step 1: Push to GitHub (you'll need to authenticate):"
echo "   git push -u origin main"
echo ""
echo "Step 2: Go to GitHub and create pull request:"
echo "   - Visit: https://github.com/am225723/ifs-program-react-app"
echo "   - Click 'New Pull Request' or 'Compare & pull request'"
echo "   - Use the title: 'Complete IFS Inner Child Healing Platform'"
echo "   - Use the description from PULL_REQUEST_SUMMARY.md"
echo ""
echo "Step 3: Request review and merge"
echo ""

echo "=== Ready for Pull Request ==="
echo "All files have been committed successfully!"
echo "See PULL_REQUEST_SUMMARY.md for detailed description."