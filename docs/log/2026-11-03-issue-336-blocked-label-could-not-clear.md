# 2026-11-03: The `blocked` label on #336 could never clear by the rule

- **Area:** process
- **Author:** chidimmamogbo (+ Claude Code)
- **Symptom:** #336 stayed labelled `blocked` after its design was approved and #332's
  contract was agreed. The linking plan says to remove the label when the issues on
  "Depends on" close, but #332 cannot close until #336 is ready to merge straight
  after it, so the rule never fired. The agent also offered to start #336 without
  checking the label, although `/work-issue` says an open dependency means stop.
- **Cause:** the "Depends on" line means the contract and the backend, while the agreed
  rollout has the two issues merge back to back.
- **Fix / workaround:** the owner moved #336 to `unblocked`, with a comment giving the
  reason. When two issues must merge together, say so on the "Depends on" line.
- **Status:** resolved
- **Refs:** #332, #336, `docs/process/linking-plan.md`
