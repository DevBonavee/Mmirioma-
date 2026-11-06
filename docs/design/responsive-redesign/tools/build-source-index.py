"""Index existing route and layout evidence for the documentation-only audit."""

import hashlib
import json
import re
import subprocess
from pathlib import Path

PACK = Path(__file__).resolve().parents[1]
ROOT = PACK.parents[2]


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8-sig")


def import_path(source: Path, specifier: str) -> str:
    if not specifier.startswith("."):
        return specifier
    target = (source.parent / specifier).resolve()
    for candidate in [target, target.with_suffix(".tsx"), target.with_suffix(".ts")]:
        if candidate.is_file():
            return rel(candidate)
    return rel(target)


routes = []
for area in ["customer", "partner"]:
    source = ROOT / f"frontend/src/features/{area}/routes.tsx"
    base = ""
    for number, line in enumerate(read(source).splitlines(), 1):
        path_match = re.search(r"path: '([^']+)'", line)
        if area == "partner" and path_match and path_match[1] in ["/partner/rider", "/partner/driver"]:
            base = path_match[1]
        if not path_match and "index: true" not in line:
            continue
        route = path_match[1] if path_match else base
        if not route.startswith("/"):
            route = base + "/" + route
        module = re.search(r"import\('([^']+)'\)", line)
        component = re.search(r"Component: m\.(\w+)|<m\.(\w+)", line)
        if not module:
            component = re.search(r"element: <(\w+)", line)
        name = next((v for v in component.groups() if v), "") if component else ""
        if not module and not name:
            name = "PartnerArea" if route in ["/partner/rider", "/partner/driver"] else "Layout route"
        flag = ""
        if route == "/points":
            flag = "POINTS_ENABLED=false; redirects to /home"
        if "/earnings" in route:
            flag = "PARTNER_PAY_ENABLED=false; redirects to vehicle home"
        entry = {
            "route": route,
            "area": "customer" if area == "customer" else ("rider" if base in route and base.endswith("rider") else "driver" if "/partner/driver" in route else "partner-shared"),
            "component": name,
            "component_file": import_path(source, module[1]) if module else "",
            "route_file": rel(source),
            "line": number,
            "flag": flag,
            "handoff_comment": line.split("//", 1)[1].strip() if "//" in line else "",
        }
        existing = next((r for r in routes if r["route"] == route), None)
        if existing and "index: true" in line:
            entry["layout_component"] = existing["component"]
            routes[routes.index(existing)] = entry
        elif existing and flag and not module:
            # The false branch is the actual route with current MVP flags.
            entry["disabled_component"] = existing["component"]
            routes[routes.index(existing)] = entry
        elif existing is None:
            routes.append(entry)

source_files = []
for folder in ["features/customer", "features/partner", "features/auth", "components", "styles", "lib/api"]:
    for source in sorted((ROOT / "frontend/src" / folder).rglob("*")):
        if source.suffix not in [".tsx", ".ts", ".css"] or ".test." in source.name:
            continue
        content = read(source)
        imports = [import_path(source, m[1]) for m in re.finditer(r"from\s+['\"]([^'\"]+)['\"]", content)]
        constraints = []
        for number, line in enumerate(content.splitlines(), 1):
            if re.search(r"max-w-|min-w-|w-\[|h-\[|h-dvh|h-screen|fixed|absolute|overflow-|grid-cols-|\b(?:md|xl|lg):|max-width|min-width|@media|width: 'phone'", line):
                constraints.append({"line": number, "text": line.strip()[:700]})
        source_files.append({
            "path": rel(source),
            "sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
            "imports": sorted(set(imports)),
            "exports": re.findall(r"export\s+(?:async\s+)?function\s+(\w+)|export\s+const\s+(\w+)", content),
            "jsx_components": sorted(set(re.findall(r"<([A-Z][A-Za-z0-9]+)", content))),
            "constraints": constraints,
        })

document_paths = [ROOT / "CLAUDE.md", ROOT / "MmiriOma_MVP_PRD.md", ROOT / "MmiriOma_MVP_SRS.md"]
for folder in ["docs/design", "docs/architecture", "docs/api", "docs/features"]:
    document_paths += [p for p in (ROOT / folder).rglob("*.md") if PACK not in p.parents]
documents = []
for source in sorted(set(document_paths)):
    content = read(source)
    documents.append({
        "path": rel(source),
        "sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "lines": len(content.splitlines()),
        "headings": [{"line": n, "text": line} for n, line in enumerate(content.splitlines(), 1) if line.startswith("#")],
        "status_mentions": [{"line": n, "text": line[:350]} for n, line in enumerate(content.splitlines(), 1) if re.search(r"Status:|Status\*\*:|Reviewed by|supersed|replaces|360px phone only|centred phone-width", line, re.I)],
        "design_links": sorted(set(re.findall(r"https://claude\.ai/[^\s)>]+", content))),
    })

result = {
    "audit_date": "2026-11-04",
    "commit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
    "routes": routes,
    "sources": source_files,
    "documents": documents,
    "local_handoff_directory_exists": (ROOT / "design/MmiriOma-design-handoff").is_dir(),
}
(PACK / "source-index.json").write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(json.dumps({"routes": len(routes), "source_files": len(source_files), "documents": len(documents), "local_handoff_exists": result["local_handoff_directory_exists"]}))
