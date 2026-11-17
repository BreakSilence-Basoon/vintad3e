# Secret scanning before publication

Install the official Gitleaks CLI version 8.30.1 and put it on your PATH. Verify
the release archive against its SHA-256 before extracting it. The official Linux
x64 archive has SHA-256
`551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb`;
the Windows x64 ZIP has SHA-256
`d29144deff3a68aa93ced33dddf84b7fdc26070add4aa0f4513094c8332afc4e`.
Get these archives only from the [official release](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1).

Install pre-commit in your own checkout, then enable its pre-commit hook:

```sh
python -m pip install pre-commit==4.3.0
pre-commit install --hook-type pre-commit
```

Before publishing, run both checks from a checkout containing only the reviewed
public candidate:

```sh
python scripts/gitleaks_check.py staged
python scripts/gitleaks_check.py files
```

The staged check examines the Git changes currently staged for commit. The files
check scans both the complete Git index and the current working-tree contents of
indexed files. It includes staged new files, tracked files even if ignored, and
both versions when a file has further unstaged edits. It excludes files absent
from the Git index, such as ignored build outputs and untracked files. A file is
not protected by this check until it is staged; stage intended files and run both
checks again before publishing. Resolve merge conflicts before scanning. Do not
run either check over a private source tree. Review a failed scan privately before pushing.
The commands intentionally suppress scanner details in logs; for diagnosis, use
the CLI locally in a private environment and avoid exposing its output.
Inline Gitleaks allow comments do not suppress findings in these commands.

CI repeats the files check only after changes reach GitHub, so it cannot prevent
the initial publication of a secret. Local hooks require installation and can be
skipped. Neither check covers every secret, all Git history, personal information,
company-specific information, or asset rights. A low-entropy synthetic comment
was not detected in independent testing. A pass is not permission to publish.
