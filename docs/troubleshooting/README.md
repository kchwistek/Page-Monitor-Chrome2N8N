# Troubleshooting Documentation

This directory contains detailed troubleshooting documentation for issues encountered during development and maintenance of the Page Monitor to n8n Chrome Extension.

## Purpose

Each troubleshooting document follows the Kepner-Tregoe methodology to ensure systematic problem-solving and provides a record of:
- How issues were identified and resolved
- What approaches were tried
- What worked and what didn't
- Lessons learned for future reference

## Naming Convention

Troubleshooting documents should be named using the format:
```
YYYY-MM-DD-issue-description.md
```

Examples:
- `2025-01-20-content-extraction-fails-on-dynamic-pages.md`
- `2025-01-21-webhook-timeout-errors.md`
- `2025-01-22-monitoring-stops-after-tab-navigation.md`

## Template

Use the following template when creating a new troubleshooting document:

```markdown
# Issue: [Brief Description]

## Date
YYYY-MM-DD

## Problem Description
[Detailed description of the problem]

## Symptoms

### IS (What is happening)
- [Actual behavior observed]
- [Where it occurs]
- [When it occurs]
- [Frequency/extent]

### IS NOT (What should happen)
- [Expected behavior]
- [Where it should work]
- [When it should work]

## Environment
- Chrome Version: 
- Extension Version:
- Operating System:
- Affected Pages/Components:
- Specific URLs (if applicable):

## Troubleshooting Steps

### Step 1: Initial Investigation
- [What was checked first]
- [Results]

### Step 2: Hypothesis Testing
- **Hypothesis 1**: [Description]
  - Test: [What was tested]
  - Result: [Outcome]
  
- **Hypothesis 2**: [Description]
  - Test: [What was tested]
  - Result: [Outcome]

### Step 3: Root Cause Analysis
- [Distinctions identified]
- [What changed recently]
- [Unique characteristics of failing scenario]

## Evidence
- Error messages:
  ```
  [Paste error messages here]
  ```
- Console logs:
  ```
  [Paste relevant logs here]
  ```
- Screenshots: [Link or description]
- Network requests: [If applicable]

## Root Cause
[Final identified root cause with explanation]

## Resolution
[How the issue was fixed]

### Code Changes
- Files modified:
  - `path/to/file.js` - [Brief description of change]
  
### Testing
- [How the fix was verified]
- [Test cases run]

## Prevention
- [How to prevent this issue in the future]
- [Any monitoring or checks added]

## Related Issues
- [Links to related troubleshooting docs or issues]
```

## Best Practices

1. **Be Thorough**: Document all steps taken, even if they didn't lead to the solution
2. **Be Specific**: Include exact error messages, code snippets, and environment details
3. **Be Honest**: Document what didn't work as well as what did
4. **Be Timely**: Create the document while troubleshooting, not after
5. **Update**: If new information is discovered, update the document

## Review Process

Before closing an issue:
- [ ] Troubleshooting document is complete
- [ ] Root cause is clearly identified
- [ ] Resolution is documented
- [ ] Code changes are minimal and focused
- [ ] Fix is tested and verified
