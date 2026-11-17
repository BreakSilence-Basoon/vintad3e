"""Run a pinned Gitleaks CLI without forwarding findings to public logs."""

import argparse
import os
from pathlib import Path, PurePosixPath
import stat
import subprocess
import sys
import tempfile

EXPECTED_VERSION = "8.30.1"


def git(root, *args):
    return subprocess.run(["git", *args], cwd=root, stdin=subprocess.DEVNULL,
                          stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                          timeout=120, check=True).stdout


def index_entries(root):
    """Return precisely the index entries; fail closed on conflicts/submodules."""
    entries = []
    for entry in git(root, "ls-files", "--stage", "-z").split(b"\0"):
        if not entry:
            continue
        metadata, raw_path = entry.split(b"\t", 1)
        mode, oid, stage = metadata.split(b" ")
        name = os.fsdecode(raw_path)
        parts = PurePosixPath(name).parts
        if (stage != b"0" or mode not in (b"100644", b"100755", b"120000") or
                not parts or any(p in (".", "..", ".git") for p in parts) or
                name.startswith("/") or "\\" in name or ":" in name):
            raise ValueError("Unsupported Git index entry")
        entries.append((name, oid.decode("ascii")))
    return entries


def put(root, name, content):
    target = root.joinpath(*PurePosixPath(name).parts)
    target.parent.mkdir(parents=True, exist_ok=True)
    # Reject collisions on case-insensitive hosts rather than silently dropping a file.
    with target.open("xb") as output:
        output.write(content)


def snapshots(root, index_dir, working_dir):
    """Scan both staged bytes and current versions of indexed files."""
    entries = index_entries(root)
    for name, oid in entries:
        put(index_dir, name, git(root, "cat-file", "blob", oid))
        source = root.joinpath(*PurePosixPath(name).parts)
        if not source.parent.resolve().is_relative_to(root):
            raise ValueError("Unsafe tracked parent")
        try:
            info = source.lstat()
        except FileNotFoundError:
            continue  # A staged blob already covers an unstaged deletion.
        # Do not follow a tracked symlink into another checkout or private data.
        if stat.S_ISLNK(info.st_mode):
            content = os.fsencode(os.readlink(source))
        else:
            if not stat.S_ISREG(info.st_mode) or not source.resolve().is_relative_to(root):
                raise ValueError("Unsafe tracked path")
            content = source.read_bytes()
        put(working_dir, name, content)
    if index_entries(root) != entries:
        raise ValueError("Git index changed during scan")
    return entries


def scanner(binary, *target):
    return subprocess.run([binary, *target, "--no-banner", "--log-level", "error", "--redact=100",
                           "--ignore-gitleaks-allow", "--exit-code", "1"], stdin=subprocess.DEVNULL,
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=120, check=False).returncode


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--binary", default="gitleaks")
    parser.add_argument("mode", choices=("staged", "files"))
    args = parser.parse_args(argv)
    try:
        version = subprocess.run(
            [args.binary, "version"],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            timeout=15,
            check=False,
        )
        if version.returncode or version.stdout.strip() != EXPECTED_VERSION:
            print("Secret scanner version is unavailable or unexpected.", file=sys.stderr)
            return 2
        if args.mode == "staged":
            result = scanner(args.binary, "git", "--staged")
        else:
            root = Path(os.fsdecode(git(None, "rev-parse", "--show-toplevel").strip())).resolve(strict=True)
            with tempfile.TemporaryDirectory(prefix="public-secret-scan-") as temp:
                index_dir = Path(temp) / "index"
                working_dir = Path(temp) / "working"
                index_dir.mkdir()
                working_dir.mkdir()
                entries = snapshots(root, index_dir, working_dir)
                result = scanner(args.binary, "dir", str(index_dir))
                if not result:
                    result = scanner(args.binary, "dir", str(working_dir))
                if index_entries(root) != entries:
                    raise ValueError("Git index changed during scan")
    except (OSError, subprocess.SubprocessError, ValueError):
        print("Secret scanner could not complete; check it privately.", file=sys.stderr)
        return 2
    if result:
        print("Secret scan did not pass; review it privately before publication.", file=sys.stderr)
        return 1
    print("Secret scan passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
