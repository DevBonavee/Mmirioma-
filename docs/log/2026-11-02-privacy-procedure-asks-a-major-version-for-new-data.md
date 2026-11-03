# 2026-11-02: The privacy procedure asks for a major version when new data is collected

- **Area:** process
- **Author:** chidimmamogbo (+ Claude Code)
- **Symptom:** the agreed #332 contract says the notice becomes version 3.1 for the
  new record of acceptance. `docs/process/privacy-retention.md`, "Changing the
  notice", says a clarification takes a minor version and "3.0 when what is
  collected or shared changes", which points to 4.0. The same procedure asks to tell
  customers before a change that adds new data takes effect, where possible.
- **Cause:** the agent recommended 3.1 before reading the procedure, and the owner
  and the contract reviewer accepted it.
- **Fix / workaround:** the owner chose a major version, which became 7.0 after #339,
  #346 and #340 took 4.0, 5.0 and 6.0, and the #332 build PR says so for the reviewer. Customers still need telling before it takes effect, where possible;
  that step is the owner's.
- **Status:** resolved
- **Refs:** #332, `docs/api/auth.md`, `docs/process/privacy-retention.md`
