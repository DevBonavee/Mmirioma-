"""Production deployment files stay safe and in step with the code (#282).

These are plain-text checks over ``compose.production.yaml``, the Caddyfile,
``.env.production.example`` and ``deploy/*.sh``. They need no Docker and no
database, so they run in CI on every pull request. The runbook is
``docs/deployment/hostinger.md``.
"""

import os
import re
import subprocess
from pathlib import Path

import pytest

from app.core.config import Settings

ROOT = Path(__file__).resolve().parents[2]
COMPOSE = (ROOT / "compose.production.yaml").read_text(encoding="utf-8")
CADDYFILE = (ROOT / "deploy" / "Caddyfile").read_text(encoding="utf-8")
ENV_EXAMPLE = (ROOT / ".env.production.example").read_text(encoding="utf-8")
DEPLOY = ROOT / "deploy"

#: Names the env template may hold that the backend does not read: Docker
#: Compose build and substitution values, and the backup script's settings.
NOT_BACKEND_SETTINGS = {
    "SITE_DOMAIN",
    "POSTGRES_PASSWORD",
    "VITE_SUPPORT_PHONE",
    "VITE_SUPPORT_WHATSAPP",
    "VITE_CONTACT_FORM_ENABLED",
    "BACKUP_DIR",
    "BACKUP_KEEP_DAYS",
    "BACKUP_RCLONE_REMOTE",
    "OSRM_DATA_DIR",
}
#: The compose file sets these itself, so the file's values never apply.
FORCED_BY_COMPOSE = {"APP_ENV", "APP_DEBUG", "SMS_PROVIDER", "DATABASE_URL", "FRONTEND_URL"}


def _run(command: list[str], **kwargs: object) -> subprocess.CompletedProcess[str]:
    """Run one of the repository's own commands (fixed arguments, no user input)."""
    return subprocess.run(command, text=True, **kwargs)  # type: ignore[call-overload]  # noqa: S603


def _template_names(*, active_only: bool) -> set[str]:
    """Variable names in the template, as ``NAME=`` or ``# NAME=`` lines."""
    pattern = r"^NAME=" if active_only else r"^#?\s?NAME="
    names = set()
    for line in ENV_EXAMPLE.splitlines():
        match = re.match(pattern.replace("NAME", r"([A-Z][A-Z0-9_]*)"), line)
        if match:
            names.add(match.group(1))
    return names


def _clean_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in {n.upper() for n in Settings.model_fields} | {"DATABASE_URL"}:
        monkeypatch.delenv(name, raising=False)


class TestEnvTemplate:
    def test_every_name_is_a_backend_setting_or_a_known_compose_value(self) -> None:
        backend = {name.upper() for name in Settings.model_fields}
        unknown = _template_names(active_only=False) - backend - NOT_BACKEND_SETTINGS
        assert not unknown, f"Not supported by the code: {sorted(unknown)}"

    def test_does_not_set_what_compose_forces(self) -> None:
        assert not (_template_names(active_only=True) & FORCED_BY_COMPOSE)

    def test_holds_only_placeholders_for_secrets(self) -> None:
        for name in ("POSTGRES_PASSWORD", "SESSION_SECRET", "TERMII_API_KEY"):
            line = next(ln for ln in ENV_EXAMPLE.splitlines() if ln.startswith(f"{name}="))
            assert re.fullmatch(rf"{name}=<[a-z0-9-]+>", line), f"{name} must be a <placeholder>"

    def test_filled_in_template_starts_in_production(self, monkeypatch: pytest.MonkeyPatch) -> None:
        _clean_env(monkeypatch)
        values: dict[str, str] = {}
        for line in ENV_EXAMPLE.splitlines():
            if re.match(r"^[A-Z][A-Z0-9_]*=", line):
                name, _, value = line.partition("=")
                values[name] = value
        settings = Settings(
            _env_file=None,  # type: ignore[call-arg]
            database_url="postgresql+asyncpg://mmirioma:pw@db:5432/mmirioma",
            app_env="production",
            frontend_url=f"https://{values['SITE_DOMAIN']}",
            sms_provider="termii",
            session_secret="s" * 48,  # type: ignore[arg-type]
            termii_api_key="k",  # type: ignore[arg-type]
            termii_sender_id="MmiriOma",
            termii_channel=values["TERMII_CHANNEL"],  # type: ignore[arg-type]
        )
        assert settings.is_production
        assert settings.cookie_secure is True


class TestCompose:
    def test_only_caddy_publishes_ports_and_only_web_ports(self) -> None:
        assert COMPOSE.count("\n    ports:") == 1
        caddy = COMPOSE.split("\n  caddy:")[1].split("\nnetworks:")[0]
        assert "\n    ports:" in caddy
        published = set(re.findall(r'^\s+- "(\d+:\d+(?:/udp)?)"$', caddy, flags=re.M))
        assert published == {"80:80", "443:443", "443:443/udp"}

    def test_database_is_private_and_pinned(self) -> None:
        assert "image: postgis/postgis:16-3.4" in COMPOSE
        assert re.search(r"data:\n\s+internal: true", COMPOSE)
        db = COMPOSE.split("\n  db:")[1].split("\n  api:")[0]
        assert "networks: [data]" in db
        assert "ports" not in db

    def test_long_running_services_restart_and_report_health(self) -> None:
        assert COMPOSE.count("restart: unless-stopped") == 4  # db, api, osrm, caddy
        assert COMPOSE.count("healthcheck:") == 4
        assert "caddy:2.10-alpine" in COMPOSE
        assert ":latest" not in COMPOSE.replace("${APP_VERSION:-latest}", "")

    def test_development_behaviour_is_forced_off(self) -> None:
        api = COMPOSE.split("\n  api:")[1].split("\n  migrate:")[0]
        assert "APP_ENV: production" in api
        assert 'APP_DEBUG: "false"' in api
        assert "SMS_PROVIDER: termii" in api
        assert "mock" not in COMPOSE.lower()

    def test_api_never_migrates_on_start(self) -> None:
        api = COMPOSE.split("\n  api:")[1].split("\n  migrate:")[0]
        assert "alembic" not in api
        assert "start.sh" not in api
        assert "uvicorn" in api

    def test_proxy_headers_are_trusted_from_the_edge_network_only(self) -> None:
        assert "--forwarded-allow-ips\n      - 172.28.0.0/24" in COMPOSE
        assert "subnet: 172.28.0.0/24" in COMPOSE
        assert "'*'" not in COMPOSE
        assert '- --workers\n      - "1"' in COMPOSE  # in-memory rate limits

    def test_logs_are_rotated(self) -> None:
        assert 'max-size: "10m"' in COMPOSE
        assert COMPOSE.count("logging: *logging") == 5  # db, api, migrate, osrm, caddy


class TestCaddyfile:
    def test_www_redirects_to_the_main_domain(self) -> None:
        assert re.search(
            r"www\.\{\$SITE_DOMAIN\} \{\s+redir https://\{\$SITE_DOMAIN\}\{uri\} permanent",
            CADDYFILE,
        )

    def test_main_domain_goes_to_the_api_which_serves_the_app(self) -> None:
        assert "reverse_proxy api:8000" in CADDYFILE
        assert "encode" in CADDYFILE


class TestImage:
    def test_build_pins_mocks_off(self) -> None:
        dockerfile = (ROOT / "backend" / "Dockerfile").read_text(encoding="utf-8")
        assert "ENV VITE_USE_MOCKS=false" in dockerfile

    def test_contact_form_is_off_unless_the_env_file_turns_it_on(self) -> None:
        # The form waits for four conditions (docs/design/contact.md, #344), so
        # both the image and compose default it off, and the template leaves it
        # commented out.
        dockerfile = (ROOT / "backend" / "Dockerfile").read_text(encoding="utf-8")
        assert "ARG VITE_CONTACT_FORM_ENABLED=false" in dockerfile
        api = COMPOSE.split("\n  api:")[1].split("\n  migrate:")[0]
        assert "VITE_CONTACT_FORM_ENABLED: ${VITE_CONTACT_FORM_ENABLED:-false}" in api
        assert "VITE_CONTACT_FORM_ENABLED" not in _template_names(active_only=True)

    def test_env_file_and_backups_are_not_tracked(self) -> None:
        def ignored(name: str) -> bool:
            result = _run(
                ["git", "check-ignore", "-q", name], cwd=ROOT, check=False, capture_output=True
            )
            return result.returncode == 0

        if not (ROOT / ".git").exists():
            pytest.skip("not a git checkout")
        assert ignored(".env.production")
        assert not ignored(".env.production.example")


SCRIPTS = [
    "prod.sh",
    "production-backup.sh",
    "production-migrate.sh",
    "osrm-build.sh",
    "osrm-measure.sh",
]


class TestScripts:
    @pytest.mark.parametrize("name", SCRIPTS)
    def test_is_valid_bash_and_executable(self, name: str) -> None:
        path = DEPLOY / name
        assert os.access(path, os.X_OK), f"chmod +x deploy/{name}"
        _run(["bash", "-n", str(path)], check=True)

    def test_prod_wrapper_needs_an_env_file(self, tmp_path: Path) -> None:
        result = _run(
            [str(DEPLOY / "prod.sh"), "config"],
            env={**os.environ, "PROD_ENV_FILE": str(tmp_path / "missing")},
            capture_output=True,
            check=False,
        )
        assert result.returncode == 1
        assert "Missing" in result.stderr

    def test_migrate_rejects_unknown_options_before_touching_anything(self) -> None:
        result = _run(
            [str(DEPLOY / "production-migrate.sh"), "--force"],
            capture_output=True,
            check=False,
        )
        assert result.returncode == 2
        assert "Unknown option" in result.stderr

    def test_migrate_stops_when_the_pending_sql_cannot_be_rendered(self, tmp_path: Path) -> None:
        # A fake `docker` first on PATH stands in for compose (#320): the
        # database has a revision, and `alembic upgrade <rev>:head --sql`
        # fails. The script must stop, not report "Nothing pending".
        fake = tmp_path / "bin" / "docker"
        fake.parent.mkdir()
        fake.write_text(
            "#!/usr/bin/env bash\n"
            'case "$*" in\n'
            '  *" up -d --wait db"*) exit 0 ;;\n'
            '  *" migrate current"*) echo "0021 (head)" ;;\n'
            '  *" migrate heads"*) echo "0022 (head)" ;;\n'
            '  *" migrate upgrade 0021:head --sql"*)'
            ' echo "offline mode cannot run this migration" >&2; exit 1 ;;\n'
            '  *) echo "unexpected: $*" >&2; exit 99 ;;\n'
            "esac\n",
            encoding="utf-8",
        )
        fake.chmod(0o755)
        env_file = tmp_path / "env"
        env_file.write_text("SITE_DOMAIN=example.test\n", encoding="utf-8")
        result = _run(
            [str(DEPLOY / "production-migrate.sh"), "--check"],
            env={
                **os.environ,
                "PATH": f"{fake.parent}{os.pathsep}{os.environ['PATH']}",
                "PROD_ENV_FILE": str(env_file),
            },
            capture_output=True,
            check=False,
        )
        assert result.returncode == 1
        assert "Nothing pending" not in result.stdout
        assert "Could not render the pending migrations" in result.stderr
        # Alembic's own error is shown, not swallowed.
        assert "offline mode cannot run this migration" in result.stderr

    def test_backup_needs_a_database_password(self, tmp_path: Path) -> None:
        env_file = tmp_path / "env"
        env_file.write_text("SITE_DOMAIN=example.test\n", encoding="utf-8")
        result = _run(
            [str(DEPLOY / "production-backup.sh")],
            env={**os.environ, "PROD_ENV_FILE": str(env_file)},
            capture_output=True,
            check=False,
        )
        assert result.returncode == 1
        assert "POSTGRES_PASSWORD" in result.stderr


OSRM = COMPOSE.split("\n  osrm:")[1].split("\n  caddy:")[0]


class TestOsrm:
    """The routing service (#384, docs/architecture/maps.md option R1)."""

    def test_is_pinned_optional_and_private(self) -> None:
        assert "image: ghcr.io/project-osrm/osrm-backend:v6.0.0" in OSRM
        assert ":latest" not in OSRM
        # Not started by a plain "up -d": only on purpose, after the measurement passes.
        assert "profiles: [routing]" in OSRM
        # Internal network only, nothing published; nothing else depends on it yet.
        assert "networks: [data]" in OSRM
        assert "ports" not in OSRM
        api = COMPOSE.split("\n  api:")[1].split("\n  migrate:")[0]
        assert "osrm" not in api

    def test_is_limited_and_locked_down(self) -> None:
        # 1.5 GiB is the pass line in maps.md; above it the container is killed.
        assert "mem_limit: 1536m" in OSRM
        assert 'user: "65534:65534"' in OSRM
        assert "read_only: true" in OSRM
        assert "cap_drop: [ALL]" in OSRM
        assert "no-new-privileges:true" in OSRM
        assert re.search(r"- \$\{OSRM_DATA_DIR:-\./osrm-data\}:/data:ro", OSRM)

    def test_serves_the_files_the_build_script_makes(self) -> None:
        build = (DEPLOY / "osrm-build.sh").read_text(encoding="utf-8")
        # The same algorithm and file name on both sides, or the server cannot start.
        assert "--algorithm\n      - mld" in OSRM
        assert "/data/nigeria-latest.osrm" in OSRM
        for step in ("osrm-extract -p /opt/car.lua", "osrm-partition", "osrm-customize"):
            assert step in build
        assert 'name="nigeria-latest"' in build
        # The script reads the image from the compose file, so the versions cannot drift.
        assert re.search(r"ghcr\.io/project-osrm/osrm-backend:[A-Za-z0-9._-]*", COMPOSE)

    def test_health_check_fails_when_the_map_does_not_cover_enugu(self) -> None:
        # OSRM answers "Ok" for any point on Earth, snapping it to the nearest road in
        # its data, so the check must read the snap distance ("distance", in metres).
        assert "/nearest/v1/driving/7.5095852,6.4586357" in OSRM
        assert '"distance":[0-9.]*' in OSRM
        assert "$2 < 1000" in OSRM

    def test_routing_files_are_not_tracked(self) -> None:
        if not (ROOT / ".git").exists():
            pytest.skip("not a git checkout")
        result = _run(
            ["git", "check-ignore", "-q", "osrm-data/nigeria-latest.osrm"],
            cwd=ROOT,
            check=False,
            capture_output=True,
        )
        assert result.returncode == 0


def _fake_bin(tmp_path: Path, docker_script: str) -> dict[str, str]:
    """A PATH with a fake `docker` and `free` first, so the scripts run without Docker."""
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    docker = bin_dir / "docker"
    docker.write_text(docker_script, encoding="utf-8")
    docker.chmod(0o755)
    free = bin_dir / "free"
    free.write_text(
        "#!/usr/bin/env bash\n"
        'echo "              total        used        free      shared  buff/cache   available"\n'
        'echo "Mem:           3900        2000         500          10        1400        1800"\n'
        'echo "Swap:          2047         100        1947"\n',
        encoding="utf-8",
    )
    free.chmod(0o755)
    env_file = tmp_path / "env"
    env_file.write_text("SITE_DOMAIN=example.test\n", encoding="utf-8")
    return {
        **os.environ,
        "PATH": f"{bin_dir}{os.pathsep}{os.environ['PATH']}",
        "PROD_ENV_FILE": str(env_file),
    }


#: A fake `docker` for the measure script. The numbers come from the environment.
FAKE_MEASURE_DOCKER = r"""#!/usr/bin/env bash
case "$*" in
  *" ps -q osrm"*) echo "${FAKE_OSRM_ID-osrmid}" ;;
  *" ps -q api"*) echo "apiid" ;;
  "stats --no-stream"*) echo "${FAKE_MEM:-900MiB} / 1.5GiB" ;;
  "exec osrmid cat /sys/fs/cgroup/memory.peak") echo 1073741824 ;;
  "inspect -f {{.State.Health.Status}} osrmid") echo "${FAKE_OSRM_HEALTH:-healthy}" ;;
  "inspect -f {{.State.OOMKilled}} osrmid") echo false ;;
  "inspect -f {{.RestartCount}} osrmid") echo 0 ;;
  "inspect -f {{.State.Health.Status}} apiid") echo "${FAKE_API_HEALTH:-healthy}" ;;
  *"health/ready"*) echo 200 ;;
  *" exec -T api python"*)
    echo "ROUTE Ok 3010 300 12 20"; echo "TABLE Ok 3"; echo "LOAD 5 1.2 3.4 0" ;;
  *) echo "unexpected: $*" >&2; exit 99 ;;
esac
"""


class TestOsrmMeasure:
    def _run(self, tmp_path: Path, **extra: str) -> subprocess.CompletedProcess[str]:
        env = _fake_bin(tmp_path, FAKE_MEASURE_DOCKER)
        env.update(extra)
        return _run(
            [str(DEPLOY / "osrm-measure.sh"), "--requests", "5"],
            env=env,
            capture_output=True,
            check=False,
        )

    def test_passes_under_the_line_with_everything_healthy(self, tmp_path: Path) -> None:
        result = self._run(tmp_path, FAKE_MEM="900MiB")
        assert result.returncode == 0, result.stderr + result.stdout
        assert "verdict:                   PASS" in result.stdout
        assert "900 MiB before, 900 MiB after 5 requests" in result.stdout
        assert "route from the API:        3010 m" in result.stdout
        assert "snap distances:            12 m and 20 m" in result.stdout

    def test_fails_over_the_line_and_says_what_to_do(self, tmp_path: Path) -> None:
        result = self._run(tmp_path, FAKE_MEM="1.6GiB")  # 1638 MiB, over 1536
        assert result.returncode == 1
        assert "verdict:                   FAIL" in result.stdout
        assert "OSRM uses 1638 MiB, not under 1536 MiB" in result.stdout
        assert "Do not deploy OSRM" in result.stdout
        assert "zone rates" in result.stdout

    def test_reads_gib_figures_as_mib(self, tmp_path: Path) -> None:
        result = self._run(tmp_path, FAKE_MEM="1.2GiB")  # 1229 MiB, under the line
        assert result.returncode == 0, result.stdout
        assert "1229 MiB before" in result.stdout

    def test_fails_when_the_enugu_map_is_not_loaded(self, tmp_path: Path) -> None:
        result = self._run(tmp_path, FAKE_OSRM_HEALTH="unhealthy")
        assert result.returncode == 1
        assert "OSRM health is unhealthy (is the Enugu map loaded?)" in result.stdout

    def test_fails_when_the_api_is_not_healthy(self, tmp_path: Path) -> None:
        result = self._run(tmp_path, FAKE_API_HEALTH="unhealthy")
        assert result.returncode == 1
        assert "the API is not healthy" in result.stdout

    def test_stops_when_osrm_is_not_running(self, tmp_path: Path) -> None:
        result = self._run(tmp_path, FAKE_OSRM_ID="")
        assert result.returncode == 1
        assert "OSRM is not running" in result.stderr

    @pytest.mark.parametrize(
        "args", [["--force"], ["--from", "abc"], ["--requests", "0"], ["--to"]]
    )
    def test_rejects_bad_arguments_before_touching_docker(self, args: list[str]) -> None:
        result = _run(
            [str(DEPLOY / "osrm-measure.sh"), *args],
            capture_output=True,
            check=False,
        )
        assert result.returncode == 2


#: A fake `docker` for the build script: it logs each command and makes the files the
#: real OSRM tools would write into the mounted folder.
FAKE_BUILD_DOCKER = r"""#!/usr/bin/env bash
echo "$*" >> "$FAKE_LOG"
for arg in "$@"; do case "$arg" in *:/data) vol="${arg%:/data}" ;; esac; done
case "$*" in
  *"osrm-extract"*) touch "$vol/nigeria-latest.osrm" "$vol/nigeria-latest.osrm.fileIndex" ;;
  *"osrm-partition"*) touch "$vol/nigeria-latest.osrm.partition" ;;
  *"osrm-customize"*) touch "$vol/nigeria-latest.osrm.cell_metrics" ;;
  *"--version"*) echo "v6.0.0" ;;
esac
"""


class TestOsrmBuild:
    def test_rejects_unknown_options_before_touching_anything(self) -> None:
        result = _run([str(DEPLOY / "osrm-build.sh"), "--force"], capture_output=True, check=False)
        assert result.returncode == 2
        assert "Unknown option" in result.stderr

    def test_refuses_on_the_server_unless_told_otherwise(self, tmp_path: Path) -> None:
        # The server has .env.production; building there can starve the API and the database.
        (tmp_path / "deploy").mkdir()
        script = tmp_path / "deploy" / "osrm-build.sh"
        script.write_text((DEPLOY / "osrm-build.sh").read_text(encoding="utf-8"), encoding="utf-8")
        script.chmod(0o755)
        (tmp_path / "compose.production.yaml").write_text(COMPOSE, encoding="utf-8")
        (tmp_path / ".env.production").write_text("SITE_DOMAIN=x\n", encoding="utf-8")
        result = _run([str(script)], capture_output=True, check=False)
        assert result.returncode == 1
        assert "looks like the server" in result.stderr

    def test_runs_the_three_steps_in_order_and_keeps_only_the_routing_files(
        self, tmp_path: Path
    ) -> None:
        env = _fake_bin(tmp_path, FAKE_BUILD_DOCKER)
        log = tmp_path / "docker.log"
        env["FAKE_LOG"] = str(log)
        env.pop("OSRM_BUILD_ON_SERVER", None)
        pbf = tmp_path / "extract.osm.pbf"
        pbf.write_bytes(b"not a real extract")
        out = tmp_path / "out"
        script = DEPLOY / "osrm-build.sh"
        if (ROOT / ".env.production").exists():  # a server checkout: the guard would stop us
            env["OSRM_BUILD_ON_SERVER"] = "1"
        result = _run(
            [str(script), "--pbf", str(pbf), "--out", str(out), "--memory", "6g"],
            env=env,
            capture_output=True,
            check=False,
        )
        assert result.returncode == 0, result.stderr + result.stdout
        commands = log.read_text(encoding="utf-8").splitlines()
        names = ("extract", "partition", "customize")
        steps = [c for c in commands if any(f"osrm-{n} " in c for n in names)]
        order = [next(n for n in names if f"osrm-{n} " in c) for c in steps]
        assert order == ["extract", "partition", "customize"]
        assert all("ghcr.io/project-osrm/osrm-backend:v6.0.0" in c for c in steps)
        assert all("--memory 6g" in c for c in steps)  # the cap reaches every step
        assert "/opt/car.lua" in steps[0]
        assert sorted(p.name for p in out.iterdir() if p.name != "BUILD_INFO.txt") == [
            "nigeria-latest.osrm",
            "nigeria-latest.osrm.cell_metrics",
            "nigeria-latest.osrm.fileIndex",
            "nigeria-latest.osrm.partition",
        ]
        info = (out / "BUILD_INFO.txt").read_text(encoding="utf-8")
        assert "ghcr.io/project-osrm/osrm-backend:v6.0.0" in info
        assert "build memory cap:   6g" in info
        assert not (out / ".work").exists()

    def test_stops_when_the_extract_file_is_missing(self, tmp_path: Path) -> None:
        env = _fake_bin(tmp_path, FAKE_BUILD_DOCKER)
        env["FAKE_LOG"] = str(tmp_path / "docker.log")
        if (ROOT / ".env.production").exists():
            env["OSRM_BUILD_ON_SERVER"] = "1"
        result = _run(
            [
                str(DEPLOY / "osrm-build.sh"),
                "--pbf",
                str(tmp_path / "nope.pbf"),
                "--out",
                str(tmp_path / "o"),
            ],
            env=env,
            capture_output=True,
            check=False,
        )
        assert result.returncode == 1
        assert "No such file" in result.stderr
