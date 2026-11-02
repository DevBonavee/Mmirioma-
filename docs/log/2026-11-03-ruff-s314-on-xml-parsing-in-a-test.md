# 2026-11-03: Ruff S314 flagged XML parsing in a test, and a raw-text check matched a comment

- **Area:** backend
- **Author:** Bonvee120 + agent
- **Symptom:** `ruff check .` failed on the new `backend/tests/test_seo_files.py`
  with `S314 Using `xml` to parse untrusted data is known to be vulnerable to XML
  attacks; use `defusedxml` equivalents` at both `ElementTree.fromstring(...)`
  calls. Separately, a test that checked the sitemap had no `lastmod` with
  `assert "lastmod" not in <file text>` failed, because the file's own comment says
  "No lastmod: nothing here knows when a page last changed."
- **Cause:** the S314 rule cannot tell that the XML here is the repository's own
  `sitemap.xml` (or the server handing the same file back). `defusedxml` is a new
  dependency, which needs approval. The `lastmod` check searched the raw text,
  which includes the comment.
- **Fix / workaround:** each call carries `# noqa: S314` and a comment saying the
  input is our own file, not untrusted. The `lastmod` test parses the file and
  looks for a `<lastmod>` element instead of searching the text. If a test ever
  parses XML from outside the repository, ask about `defusedxml` first.
- **Status:** resolved
- **Refs:** #331; `backend/tests/test_seo_files.py`.
