"""Index/working-tree coverage tests with disposable synthetic repositories."""
import os
from pathlib import Path
import secrets
import string
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from scripts import gitleaks_check as check


class SnapshotTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="public-scan-test-")
        self.root = Path(self.temp.name).resolve()
        self.repo = self.root / "repo"
        self.repo.mkdir()
        self.git("init", "-q")
        (self.repo / ".gitignore").write_text(".next/\n*.log\n", encoding="utf-8")
        (self.repo / "tracked.txt").write_text("initial", encoding="utf-8")
        self.git("add", ".gitignore", "tracked.txt")
        self.git("-c", "user.name=Example", "-c", "user.email=example@example.invalid", "commit", "-qm", "initial")

    def tearDown(self):
        if self.root.parent != Path(tempfile.gettempdir()).resolve() or not self.root.name.startswith("public-scan-test-"):
            raise RuntimeError("Unexpected temporary test directory")
        self.temp.cleanup()

    def git(self, *args):
        subprocess.run(["git", *args], cwd=self.repo, check=True, stdout=subprocess.DEVNULL,
                       stderr=subprocess.DEVNULL, timeout=30)

    def take(self):
        index = self.root / "index"
        work = self.root / "work"
        index.mkdir()
        work.mkdir()
        check.snapshots(self.repo, index, work)
        return index, work

    def test_index_and_working_tree_are_both_preserved(self):
        (self.repo / "tracked.txt").write_text("staged", encoding="utf-8")
        self.git("add", "tracked.txt")
        (self.repo / "tracked.txt").write_text("later edit", encoding="utf-8")
        (self.repo / "new.txt").write_text("staged new", encoding="utf-8")
        self.git("add", "new.txt")
        (self.repo / "untracked.txt").write_text("not staged", encoding="utf-8")
        (self.repo / ".next").mkdir()
        (self.repo / ".next" / "build.log").write_text("ignored build", encoding="utf-8")
        index, work = self.take()
        self.assertEqual((index / "tracked.txt").read_text(), "staged")
        self.assertEqual((work / "tracked.txt").read_text(), "later edit")
        self.assertEqual((index / "new.txt").read_text(), "staged new")
        self.assertFalse((index / "untracked.txt").exists())
        self.assertFalse((work / ".next").exists())

    def test_tracked_file_remains_scanned_even_when_ignored(self):
        (self.repo / "kept.log").write_text("indexed despite ignore", encoding="utf-8")
        self.git("add", "-f", "kept.log")
        index, work = self.take()
        self.assertEqual((index / "kept.log").read_text(), "indexed despite ignore")
        self.assertEqual((work / "kept.log").read_text(), "indexed despite ignore")

    def test_unstaged_deletion_keeps_index_copy(self):
        (self.repo / "tracked.txt").unlink()
        index, work = self.take()
        self.assertEqual((index / "tracked.txt").read_text(), "initial")
        self.assertFalse((work / "tracked.txt").exists())

    def test_conflicting_entries_fail_closed(self):
        with patch.object(check, "git", return_value=b"100644 abc 1\tfile\0"):
            with self.assertRaises(ValueError):
                check.index_entries(self.repo)

    def test_real_scanner_detects_index_and_working_tree(self):
        binary = os.environ.get("GITLEAKS_BINARY")
        if not binary:
            self.skipTest("GITLEAKS_BINARY not provided")
        # Synthetic string assembled at runtime, never written to the public checkout.
        candidate = "gh" + "p_" + "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(36))
        (self.repo / "tracked.txt").write_text(candidate, encoding="utf-8")
        self.git("add", "tracked.txt")
        (self.repo / "tracked.txt").write_text("clean work", encoding="utf-8")
        index, work = self.take()
        self.assertNotEqual(check.scanner(binary, "dir", str(index)), 0)
        self.assertEqual(check.scanner(binary, "dir", str(work)), 0)

    def test_real_scanner_detects_unstaged_tracked_content_not_ignored_build(self):
        binary = os.environ.get("GITLEAKS_BINARY")
        if not binary:
            self.skipTest("GITLEAKS_BINARY not provided")
        candidate = "gh" + "p_" + "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(36))
        (self.repo / "tracked.txt").write_text(candidate, encoding="utf-8")
        (self.repo / ".next").mkdir()
        (self.repo / ".next" / "build.log").write_text(candidate, encoding="utf-8")
        index, work = self.take()
        self.assertEqual(check.scanner(binary, "dir", str(index)), 0)
        self.assertNotEqual(check.scanner(binary, "dir", str(work)), 0)
        self.assertNotEqual(check.scanner(binary, "dir", str(self.repo / ".next")), 0)

    def test_tracked_symlink_is_not_followed(self):
        outside = self.root / "private.txt"
        outside.write_text("outside content", encoding="utf-8")
        link = self.repo / "link.txt"
        try:
            link.symlink_to(outside)
        except (OSError, NotImplementedError):
            self.skipTest("symlinks unavailable")
        self.git("add", "link.txt")
        index, work = self.take()
        self.assertNotIn("outside content", (index / "link.txt").read_text())
        self.assertNotIn("outside content", (work / "link.txt").read_text())


if __name__ == "__main__":
    unittest.main()
