# Release Baseline Checklist

## Purpose

This checklist prepares a reviewed, immutable local release baseline without implying permission to deploy, publish, or push it anywhere. Creating the initial commit/tag remains an owner decision.

## Automated preflight

Run:

```powershell
npm run verify:release-preflight
```

It performs only read-only Git operations and verifies:

- `.env`, dependencies, compiled output, coverage, logs, and `work/` scratch files are ignored;
- the proposed baseline contains no known Cloudflare credential/account value, common private-key marker, or AWS access-key shape;
- Cloudflare values in both environment templates are placeholders;
- Word documents and temporary Word lock files are excluded; maintained documentation is Markdown-only;
- browser-facing source/build output contains no server-only environment-variable names or local environment file;
- no files are staged when the preflight runs.

## Owner review before the initial commit

1. Review `git add --dry-run --all` and confirm every proposed file belongs to the product or its operational evidence.
2. Review the complete worktree diff after staging; because this repository has no existing baseline, treat every line as new.
3. Confirm `.env` remains ignored and no real credential appears in staged content.
4. Run `npm run verify:staging`, `npm run verify:production-compose`, `npm run verify:backup-restore`, and `npm run verify:load:100` as appropriate for the release evidence.
5. Record a local initial commit with a descriptive message only after explicit owner approval.
6. Create an immutable local annotated tag only after reviewing the commit ID and final checks.
7. Do not push, publish images, deploy, or expose the service without separate explicit approval.

## Suggested identifiers

- Initial commit message: `chore: establish Stream launch-candidate baseline`
- Local annotated tag: `stream-launch-candidate-0.1.0`

These names are suggestions, not authorization to create them.
