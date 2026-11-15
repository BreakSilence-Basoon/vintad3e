"""Run a pinned Gitleaks CLI without forwarding findings to public logs."""

import argparse
import subprocess
import sys

EXPECTED_VERSION = "8.30.1"


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
        target = ["git", "--staged"] if args.mode == "staged" else ["dir", "."]
        result = subprocess.run(
            [args.binary, *target, "--no-banner", "--log-level", "error", "--redact=100", "--ignore-gitleaks-allow", "--exit-code", "1"],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=120,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        print("Secret scanner could not complete; check it privately.", file=sys.stderr)
        return 2
    if result.returncode:
        print("Secret scan did not pass; review it privately before publication.", file=sys.stderr)
        return 1
    print("Secret scan passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
