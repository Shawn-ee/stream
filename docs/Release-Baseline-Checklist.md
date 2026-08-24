# Release Baseline Checklist

## Purpose

This checklist records the reviewed initial release baseline and remains the procedure for future release identifiers. A commit or tag never implies permission to deploy or expose the application.

## Completed baseline record

- Owner approval received: 2026-08-24.
- Repository: `https://github.com/Shawn-ee/stream`.
- Branch: `main`.
- Commit: `8aa41bf688336c1f8a0a8478e69d556d094477b5`.
- Annotated tag: `stream-launch-candidate-0.1.0`.
- Documentation format: Markdown only. Project source was published; `.docx`, `.env`, credentials, generated builds, dependencies, and scratch files were excluded.

## Current application-source candidate

- Owner approval received: 2026-08-24.
- Commit: `e1f64ad73e26792a84a94460afba50e0e16d5db3` on the local `main` branch. This commit is not yet published.
- Additions after the immutable initial tag: fail-fast production-environment validation, isolated random-secret production verification, fresh disposable verification volumes, exact dependency install-script policy, lockfile integrity checks, CycloneDX SBOM generation, a live production-dependency audit command, and a guarded POSIX private-staging operator.
- Release-identifier status: this commit has no immutable release tag. The existing `stream-launch-candidate-0.1.0` tag remains unchanged at the historical baseline and must not be moved.
- Deployment rule: first obtain approval to publish this exact commit, then separately obtain host/deployment approval. Use it for the first approved private staging deployment unless the owner approves a newer exact commit or a new annotated tag.

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

## Review procedure for future release baselines

1. Review `git add --dry-run --all` and confirm every proposed file belongs to the product or its operational evidence.
2. Review the complete worktree diff after staging; because this repository has no existing baseline, treat every line as new.
3. Confirm `.env` remains ignored and no real credential appears in staged content.
4. Run `npm run verify:staging`, `npm run verify:production-compose`, `npm run verify:backup-restore`, and `npm run verify:load:100` as appropriate for the release evidence.
5. Record a release commit with a descriptive message only after explicit owner approval.
6. Create an immutable annotated tag only after reviewing the commit ID and final checks.
7. Do not push, publish images, deploy, or expose the service without separate explicit approval.

## Suggested identifiers

- Initial commit message: `chore: establish Stream launch-candidate baseline`
- Local annotated tag: `stream-launch-candidate-0.1.0`

These names are suggestions, not authorization to create them.
