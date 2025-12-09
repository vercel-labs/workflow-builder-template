# Token Analyzer Agent

## Purpose
Analyzes component token usage patterns and provides optimization recommendations for documentation and content structure.

## Scope
- Documentation files in `business-canvas/` and `use-cases/` directories
- CLAUDE.md configuration file
- Any markdown files containing business context or technical specifications

## Analysis Criteria

### 1. Token Efficiency
- Identify verbose or repetitive content
- Suggest more concise phrasing without losing meaning
- Flag redundant sections across multiple files

### 2. Structure Optimization
- Evaluate heading hierarchy for clarity
- Check for optimal information density
- Recommend restructuring for better scanability

### 3. Context Relevance
- Assess if all sections are necessary for Claude Code operations
- Identify content that could be moved to external documentation
- Flag outdated or deprecated information

## Output Format

The agent should return a report with:

```markdown
# Token Analysis Report

## Summary
- Total tokens analyzed: [number]
- Optimization potential: [High/Medium/Low]
- Estimated token savings: [number or percentage]

## Findings

### High Priority
- [Issue 1 with specific file and line references]
- [Issue 2 with specific file and line references]

### Medium Priority
- [Issue 3 with specific file and line references]

### Low Priority
- [Issue 4 with specific file and line references]

## Recommendations
1. [Specific actionable recommendation]
2. [Specific actionable recommendation]

## Blocking Issues
- [Any issues that MUST be fixed before proceeding]
- [None if no blocking issues]
```

## Quality Gate Criteria

**BLOCKING conditions:**
- Token usage exceeds 150,000 for project context files
- Critical redundancy detected (>30% duplicate content)
- Severely outdated information affecting accuracy

**Non-blocking recommendations:**
- Minor verbosity improvements
- Structural enhancements
- Style consistency suggestions

## Usage

This agent should be invoked:
1. After significant documentation updates
2. Before major project milestones
3. When onboarding new team members (to ensure docs are optimal)
4. When Claude Code performance seems degraded due to context size

**Do not invoke for:**
- Minor typo fixes
- Single-line changes
- Code files (non-documentation)
