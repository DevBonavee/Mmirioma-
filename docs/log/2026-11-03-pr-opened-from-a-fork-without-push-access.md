# 2026-11-03: design and contract PRs closed because they came from a fork

- **Area:** GitHub
- **Author:** Daveoski + agent
- **Symptom:** PR #360 (design for #345) and PR #361 (contract for #340) were closed unmerged with the comment "Pushed from a wrong repo". Both had `isCrossRepository: true` and head repository `Daveoski/mmirioma`, not `mmiri-oma/mmirioma`. CI had passed on #361, and reviewers had been requested.
- **Cause:** The Daveoski account is an organization `member` with no write access to the repository: `gh api repos/mmiri-oma/mmirioma --jq .permissions` prints `"push":false`. When `gh pr create` cannot push to the base repository it pushes the branch to the user's fork and opens the PR from there. CLAUDE.md requires every branch on `origin`.
- **Fix / workaround:** @nnamdi-security, an organization owner, granted the account write access on 2026-11-03 (`"push":true`). The contract branch `feat/340-delivery-location-contract` was recreated from an up-to-date `development` by cherry-picking its commit (`c6a7aa4`, fetched with `git fetch origin pull/361/head`), to be pushed to `origin` as a new PR. The #345 design (PR #360) needs the same before its review. Before opening any PR, check that the permission line above prints `"push":true`.
- **Status:** resolved
- **Refs:** #340, #345, PR #360, PR #361, CLAUDE.md "Team workflow".
