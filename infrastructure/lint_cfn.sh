#!/bin/bash

echo "Running cfn-lint on changed CloudFormation templates..."

# Get list of staged .yaml files in the infrastructure/ directory
CFN_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep '^infrastructure/.*\.yaml$')

if [ -z "$CFN_FILES" ]; then
  echo "No CloudFormation templates to lint."
  exit 0
fi

ERRORS_FOUND=0
for file in $CFN_FILES; do
  echo "Linting $file..."
  # -i ignores info-level messages, -w ignores warning-level messages
  # --force-include ensures it checks even if not a standard CFN file name
  if ! cfn-lint -i -w "$file"; then
    echo "cfn-lint found issues in $file"
    ERRORS_FOUND=1
  fi
done

if [ "$ERRORS_FOUND" -ne 0 ]; then
  echo ""
  echo "❌ cfn-lint found errors. Commit aborted."
  echo "Please fix the CloudFormation templates and try again."
  exit 1
else
  echo "✅ cfn-lint passed for all changed templates."
  exit 0
fi
