# CLAUDE.md Compliance Checker Agent

## Purpose
**MANDATORY final validation step for EVERY task.** Ensures all changes comply with project standards defined in CLAUDE.md and maintains documentation consistency.

## Critical Importance
This agent acts as a quality gate and MUST be run as the final step before any task is considered complete. No work is finished until this agent passes.

## Scope
- All modified files in the repository
- CLAUDE.md adherence
- Cross-file consistency
- Documentation standards
- Project conventions

## Validation Checks

### 1. CLAUDE.md Adherence
- [ ] All file references in CLAUDE.md are accurate and exist
- [ ] New files are documented in appropriate CLAUDE.md sections
- [ ] File descriptions match actual content
- [ ] No contradictions between CLAUDE.md and actual files

### 2. Documentation Structure
- [ ] Markdown formatting is consistent
- [ ] Heading hierarchy is logical (no skipped levels)
- [ ] File paths use correct relative/absolute format
- [ ] All links are valid and functional

### 3. Business Canvas Integrity
- [ ] Files in `business-canvas/` follow established patterns
- [ ] No duplicate information across files
- [ ] All business model components are complete
- [ ] Financial information is consistent

### 4. Use Case Specifications
- [ ] Keeper specs follow standard template
- [ ] All required sections are present
- [ ] Configuration examples are valid
- [ ] Limitations and capabilities are clearly stated

### 5. Technical Accuracy
- [ ] No outdated technology references
- [ ] Version information is current
- [ ] Integration points are correctly documented
- [ ] Security considerations are addressed

### 6. Consistency Rules
- [ ] Terminology is consistent (e.g., "Keeper" vs "keeper")
- [ ] Product names are correct (Sky Protocol, not MakerDAO)
- [ ] Company names are accurate (Para, not Capsule)
- [ ] Chain references are standardized (EVM chains, not Ethereum-only)

## Output Format

```markdown
# CLAUDE.md Compliance Report

## Status: [PASS ✅ | FAIL ❌]

## Critical Violations (BLOCKING)
- [None] or
- [ ] Violation 1 [File:Line] - Description and fix required
- [ ] Violation 2 [File:Line] - Description and fix required

## Warnings (Should Fix)
- [None] or
- ⚠️ Warning 1 [File:Line] - Description and recommendation
- ⚠️ Warning 2 [File:Line] - Description and recommendation

## Suggestions (Optional)
- [None] or
- 💡 Suggestion 1 - Enhancement opportunity
- 💡 Suggestion 2 - Enhancement opportunity

## Files Validated
- [List of all files checked]

## Summary
- Total files checked: [number]
- Critical violations: [number]
- Warnings: [number]
- Suggestions: [number]

## Action Required
[If FAIL] You MUST fix all critical violations and re-run this agent before proceeding.
[If PASS] All quality gates passed. Task is complete.
```

## Blocking Conditions

The agent returns **FAIL** status if ANY of these are true:

1. **Broken References**
   - CLAUDE.md references non-existent files
   - Dead links in documentation
   - Incorrect file paths

2. **Missing Documentation**
   - New keeper added without use-case spec
   - New business canvas component without CLAUDE.md entry
   - Modified files not reflected in documentation

3. **Factual Errors**
   - Outdated product names
   - Incorrect technical specifications
   - Contradictory information across files

4. **Structural Violations**
   - Malformed markdown that breaks rendering
   - Missing required sections in specs
   - Inconsistent file organization

5. **Security Concerns**
   - Exposed credentials or sensitive data
   - Insecure configuration examples
   - Missing security warnings where needed

## Usage

### When to Run (MANDATORY)
- ✅ After completing ANY task
- ✅ Before marking work as done
- ✅ After updates to CLAUDE.md
- ✅ After adding/modifying keeper specifications
- ✅ After business canvas changes
- ✅ Before git commits
- ✅ Before pull requests

### When NOT to Run
- ❌ Never - this agent ALWAYS runs at task completion

## Integration with Workflow

```
Task Start
    ↓
Work Implementation
    ↓
Other Agent Checks (if applicable)
    ↓
Fix Issues from Other Agents
    ↓
[MANDATORY] Run claude-md-compliance-checker ← YOU ARE HERE
    ↓
    ├─ PASS ✅ → Task Complete
    ↓
    └─ FAIL ❌ → Fix Issues → Re-run Checker → Must PASS to continue
```

## Example Invocation

When you complete a task, always finish with:

```
I've completed the requested changes. Now running the mandatory compliance check...

[Invoke Task tool with subagent_type='claude-code-guide' referencing this agent]

[After results]
- If PASS: "All quality gates passed ✅. Task is complete."
- If FAIL: "Compliance check found issues that must be fixed. Addressing now..."
```

## Agent Behavior

This agent should:
1. Read CLAUDE.md completely
2. Identify all files mentioned or implied
3. Read all modified files in current task
4. Cross-reference content
5. Validate against all checks above
6. Return clear, actionable report
7. Mark as FAIL if any blocking conditions exist
8. Provide specific file:line references for all issues

## Success Criteria

The task is only complete when:
1. This agent has been run
2. Status returned is PASS ✅
3. All critical violations are resolved
4. Agent has been re-run after fixes (if needed)
