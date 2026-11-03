"""``robots.txt`` and ``sitemap.xml`` for search engines (#331, docs/features/seo.md).

Reads the real files in ``frontend/public`` and serves them through the same
``mount_frontend`` that serves the production build, so these tests fail when a
private path is missing from ``robots.txt``, when the sitemap lists one, or when
the server would answer with the app's ``index.html`` instead of the file.
"""

import xml.etree.ElementTree as ElementTree
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import create_app

PUBLIC = Path(__file__).resolve().parents[2] / "frontend" / "public"
SITE = "https://mmiriomadelivery.com"
INDEX = "<!doctype html><title>the app</title>"

#: Staff, partner and API paths: the three #331 names, never to be crawled or listed.
PRIVATE = ("/admin", "/partner", "/api")
#: The customer app and sign-in pages. A prefix covers its sub-paths (`/order` covers `/orders`).
APP_AND_ACCOUNT = (
    "/order",
    "/home",
    "/menu",
    "/addresses",
    "/notifications",
    "/profile",
    "/settings",
    "/points",
    "/support",
    "/verify-phone",
    "/signin",
    "/signup",
    "/forgot-password",
)
PUBLIC_PAGES = ("/", "/faq", "/terms", "/privacy")


def robots_rules() -> tuple[list[str], list[str], list[str]]:
    """Return ``(allow, disallow, sitemaps)`` from the real ``robots.txt``."""
    allow: list[str] = []
    disallow: list[str] = []
    sitemaps: list[str] = []
    for raw in (PUBLIC / "robots.txt").read_text(encoding="utf-8").splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line or ":" not in line:
            continue
        key, value = (part.strip() for part in line.split(":", 1))
        {"allow": allow, "disallow": disallow, "sitemap": sitemaps}.get(key.lower(), []).append(
            value
        )
    return allow, disallow, sitemaps


def sitemap_paths() -> list[str]:
    """Return the path of every ``<loc>`` in the real ``sitemap.xml``, after checking its origin."""
    # Our own file from the repository, not untrusted input.
    root = ElementTree.fromstring(  # noqa: S314
        (PUBLIC / "sitemap.xml").read_text(encoding="utf-8")
    )
    namespace = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    locations = [loc.text or "" for loc in root.findall("sm:url/sm:loc", namespace)]
    for location in locations:
        assert location.startswith(f"{SITE}/"), f"{location} is not an absolute production URL"
    return [location.removeprefix(SITE) for location in locations]


def blocked(path: str, disallow: list[str]) -> bool:
    """Whether ``robots.txt`` asks crawlers to skip ``path`` (prefix match, ``$`` ends a rule)."""
    for rule in disallow:
        if rule.endswith("$") and path == rule[:-1]:
            return True
        if not rule.endswith("$") and rule and path.startswith(rule):
            return True
    return False


# --- robots.txt ---------------------------------------------------------------------


@pytest.mark.parametrize("path", PRIVATE)
def test_robots_keeps_crawlers_out_of_admin_partner_and_api(path: str) -> None:
    _, disallow, _ = robots_rules()
    assert path in disallow, f"robots.txt must disallow {path}"


@pytest.mark.parametrize("path", APP_AND_ACCOUNT)
def test_robots_keeps_crawlers_out_of_the_customer_app_and_account_pages(path: str) -> None:
    _, disallow, _ = robots_rules()
    assert path in disallow, f"robots.txt must disallow {path}"


def test_robots_blocks_the_orders_pages_through_the_order_prefix() -> None:
    _, disallow, _ = robots_rules()
    assert blocked("/orders", disallow)
    assert blocked("/orders/MO-1/receipt", disallow)
    assert blocked("/order/review", disallow)


@pytest.mark.parametrize("path", PUBLIC_PAGES)
def test_robots_leaves_the_public_pages_open(path: str) -> None:
    allow, disallow, _ = robots_rules()
    assert "/" in allow
    assert not blocked(path, disallow), f"robots.txt blocks the public page {path}"


def test_robots_leaves_the_files_a_crawler_needs_open() -> None:
    _, disallow, _ = robots_rules()
    for path in (
        "/sitemap.xml",
        "/marketing/hero-scene.jpg",
        "/apple-touch-icon.png",
        "/assets/index-AbC.js",
    ):
        assert not blocked(path, disallow), f"robots.txt blocks {path}"


def test_robots_blocks_the_installed_app_start_address_only_as_a_bare_app() -> None:
    _, disallow, _ = robots_rules()
    assert blocked("/app", disallow)
    assert blocked("/app/anything", disallow)
    assert not blocked("/apple-touch-icon.png", disallow)


def test_robots_points_to_the_production_sitemap() -> None:
    _, _, sitemaps = robots_rules()
    assert sitemaps == [f"{SITE}/sitemap.xml"]


# --- sitemap.xml --------------------------------------------------------------------


def test_sitemap_lists_the_public_pages() -> None:
    assert sorted(sitemap_paths()) == sorted(PUBLIC_PAGES)


def test_sitemap_lists_no_private_or_blocked_path() -> None:
    _, disallow, _ = robots_rules()
    for path in sitemap_paths():
        assert not path.startswith(PRIVATE), f"sitemap.xml lists the private path {path}"
        assert not blocked(path, disallow), f"sitemap.xml lists {path}, which robots.txt blocks"


def test_sitemap_has_no_page_that_does_not_exist_yet() -> None:
    # /about and /contact are added when those pages are built.
    assert "/about" not in sitemap_paths()
    assert "/contact" not in sitemap_paths()


def test_sitemap_has_no_lastmod_it_cannot_vouch_for() -> None:
    # Our own file from the repository, not untrusted input.
    root = ElementTree.fromstring(  # noqa: S314
        (PUBLIC / "sitemap.xml").read_text(encoding="utf-8")
    )
    assert root.findall(".//{http://www.sitemaps.org/schemas/sitemap/0.9}lastmod") == []


# --- served by the production server ------------------------------------------------


@pytest.fixture
def served(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    """A build folder holding the real files next to an ``index.html``, served as in production."""
    build = tmp_path / "dist"
    (build / "assets").mkdir(parents=True)
    (build / "index.html").write_text(INDEX, encoding="utf-8")
    for name in ("robots.txt", "sitemap.xml"):
        (build / name).write_bytes((PUBLIC / name).read_bytes())
    monkeypatch.setenv("FRONTEND_DIST_DIR", str(build))
    get_settings.cache_clear()
    with TestClient(create_app()) as client:
        yield client
    get_settings.cache_clear()


def test_the_server_sends_robots_txt_as_a_file_not_the_app_page(served: TestClient) -> None:
    response = served.get("/robots.txt")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/plain")
    assert response.text == (PUBLIC / "robots.txt").read_text(encoding="utf-8")
    assert response.text != INDEX
    assert "User-agent: *" in response.text


def test_the_server_sends_sitemap_xml_as_xml_not_the_app_page(served: TestClient) -> None:
    response = served.get("/sitemap.xml")
    assert response.status_code == 200
    assert "xml" in response.headers["content-type"]
    assert response.text != INDEX
    # The body is our own file, served back; it is not untrusted input.
    assert ElementTree.fromstring(response.text).tag.endswith("urlset")  # noqa: S314


def test_both_files_are_revalidated_on_every_load(served: TestClient) -> None:
    for path in ("/robots.txt", "/sitemap.xml"):
        assert served.get(path).headers["cache-control"] == "no-cache"


def test_a_crawler_can_ask_for_the_files_with_head(served: TestClient) -> None:
    assert served.head("/robots.txt").status_code == 200
    assert served.head("/sitemap.xml").status_code == 200
