"""Validate documentation artifacts and source integrity; no app tests or edits."""

import hashlib
import json
import re
import struct
import subprocess
from collections import Counter, defaultdict
from pathlib import Path

PACK = Path(__file__).resolve().parents[1]
ROOT = PACK.parents[2]
errors = []


def require(ok, message):
    if not ok:
        errors.append(message)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(name):
    return json.loads((PACK / name).read_text(encoding="utf-8"))


required = ["README.md", "screen-inventory.md", "layout-audit.md", "component-inventory.md", "design-references.md", "api-dependencies.md"]
for name in required:
    require((PACK / name).is_file() and (PACK / name).stat().st_size > 100, f"Required document absent/empty: {name}")
index = load("source-index.json")
manifest = load("screenshots/manifest.json")
references = load("references/manifest.json")
captures = manifest["captures"]
require(index["commit"] == references["commit"], "Source/reference commit mismatch")
require(index["commit"].startswith(manifest["sourceCommit"]), "Screenshot commit mismatch")
require(not references["missing"], "Reference snapshot sources are missing")

for item in index["sources"] + index["documents"]:
    require(sha(ROOT / item["path"]) == item["sha256"], f"Indexed source changed: {item['path']}")
reference_paths = set()
for item in references["files"]:
    original = ROOT / item["originalPath"]
    copy = PACK / "references" / item["originalPath"]
    reference_paths.add(copy)
    require(original.is_file() and sha(original) == item["originalSha256"], f"Reference original changed: {item['originalPath']}")
    require(copy.is_file() and sha(copy) == item["copySha256"], f"Reference copy changed: {item['originalPath']}")
require(reference_paths | {PACK / "references/manifest.json"} == {p for p in (PACK / "references").rglob("*") if p.is_file()}, "Unindexed reference snapshot files")

dimensions = {390: (390, 844), 768: (768, 1024), 1440: (1440, 1000)}
case_widths = defaultdict(set)
image_paths = set()
for row in captures:
    width = row["viewport"]["width"]
    case_widths[row["id"]].add(width)
    require(row["status"] == "captured", f"Capture unavailable/redirected: {row['id']} {width}")
    require(row["requestedRoute"] == row.get("actualRoute"), f"Wrong captured route: {row['id']} {width}")
    require(not row.get("pageErrors"), f"Browser runtime error: {row['id']} {width}")
    require(not row["measurements"]["loadingVisible"] or row["state"] == "loading", f"Unexpected loader: {row['id']} {width}")
    if "pending-approval" in row["id"]:
        require(not row["measurements"]["dialogs"], f"Approval state obscured by assignment: {row['id']} {width}")
    if row["id"] == "customer-remove-address-dialog":
        require(bool(row["measurements"]["dialogs"]), f"Confirmation dialog missing: {width}")
    for field in ["file", "bottomFile"]:
        if not row.get(field):
            continue
        image = PACK / row[field]
        image_paths.add(image)
        require(image.is_file(), f"Missing PNG: {row[field]}")
        raw = image.read_bytes()
        require(raw[:8] == b"\x89PNG\r\n\x1a\n", f"Invalid PNG signature: {row[field]}")
        require(struct.unpack(">II", raw[16:24]) == dimensions[width], f"Wrong PNG dimensions: {row[field]}")
for ident, values in case_widths.items():
    require(values == set(dimensions), f"Missing requested viewport: {ident}")
require(image_paths == set((PACK / "screenshots").rglob("*.png")), "Orphan/missing screenshot files")

covered_routes = []
uncaptured_routes = []
for route in index["routes"]:
    pattern = re.sub(r":[^/]+", "[^/]+", route["route"])
    matched = [r for r in captures if re.fullmatch(pattern, r["requestedRoute"].split("?")[0])]
    if matched:
        require({r["viewport"]["width"] for r in matched} == set(dimensions), f"Route missing width: {route['route']}")
        covered_routes.append(route["route"])
    else:
        uncaptured_routes.append(route["route"])
        require(bool(route["flag"]) or route["route"] in ["/partner", "/partner/driver/jobs/:reference/pickup"], f"Active route not captured: {route['route']}")

link_count = 0
for document in [PACK / n for n in required] + [PACK / "screenshots/README.md"]:
    for url in re.findall(r"\]\(([^)]+)\)", document.read_text(encoding="utf-8")):
        if re.match(r"[a-z]+:", url) or url.startswith("#"):
            continue
        link_count += 1
        require((document.parent / url.split("#")[0]).exists(), f"Broken audit link in {document.name}: {url}")

# Check known secret-shaped values without echoing any matching content.
secret_patterns = [r"github_pat_[A-Za-z0-9_]{20,}", r"ghp_[A-Za-z0-9]{25,}", r"sk-proj-[A-Za-z0-9_-]{20,}", r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"]
privacy_candidates = []
for file in PACK.rglob("*"):
    if not file.is_file() or file.suffix.lower() not in [".md", ".json", ".ts", ".tsx", ".css", ".html", ".cjs", ".py"]:
        continue
    content = file.read_text(encoding="utf-8-sig")
    if any(re.search(pattern, content) for pattern in secret_patterns):
        privacy_candidates.append(file.relative_to(PACK).as_posix())
require(not privacy_candidates, "Secret-shaped content requires review in: " + ", ".join(privacy_candidates))
require(not any(p.name.startswith(".env") or p.name in ["storage-state.json", "cookies.json"] for p in PACK.rglob("*") if p.is_file()), "Unexpected environment/storage export in pack")

tracked_diff = subprocess.run(["git", "diff", "--exit-code", "HEAD", "--", ".", ":(exclude)docs/design/responsive-redesign"], cwd=ROOT, capture_output=True, text=True)
require(tracked_diff.returncode == 0, "Tracked repository files outside the audit pack differ from HEAD")

report = {
    "status": "passed" if not errors else "failed",
    "sourceCommit": index["commit"],
    "requiredDocuments": len(required),
    "indexedSourceFilesVerified": len(index["sources"]),
    "indexedDocumentsVerified": len(index["documents"]),
    "referenceSnapshotsVerified": len(references["files"]),
    "routePatterns": len(index["routes"]),
    "activeRoutesCaptured": len(covered_routes),
    "redirectRoutesWithoutIndependentScreens": uncaptured_routes,
    "screenStateCases": len(case_widths),
    "viewportRecords": len(captures),
    "captureStatuses": dict(Counter(r["status"] for r in captures)),
    "pngFilesVerified": len(image_paths),
    "auditMarkdownLinksVerified": link_count,
    "documentHorizontalOverflowRecords": sum(r["measurements"]["documentWidth"] > r["viewport"]["width"] for r in captures),
    "horizontalInteractiveOutlierRecords": sum(bool(r["measurements"]["geometryOutliers"]) for r in captures),
    "browserRuntimeErrorRecords": sum(bool(r.get("pageErrors")) for r in captures),
    "trackedFilesOutsidePackUnchanged": tracked_diff.returncode == 0,
    "privacyNote": "Synthetic fixtures, blocked external/API requests, redacted illustrative credential values; regex checks complement source review and are not a universal secret detector.",
    "errors": errors,
}
(PACK / "validation.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
raise SystemExit(1 if errors else 0)
