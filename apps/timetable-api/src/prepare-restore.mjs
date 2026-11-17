import { prepareRestoredDatabase } from '@vintad3e/timetable-store/prepare-restore';

try {
  const result = await prepareRestoredDatabase(process.env.VINTAD3E_BACKUP_FILE, process.env.VINTAD3E_PREPARED_RESTORE_FILE);
  console.log('Prepared a new offline copy with staff disabled and service startup blocked. Verify an administrator before recovery.');
  if (result.cleanupIncomplete) console.error('A .vintad3e-restore-* staging folder may remain; inspect it securely.');
} catch {
  console.error('Restore preparation failed. Existing files were not overwritten; inspect the protected destination folder for .vintad3e-restore-* or .vintad3e-copy-* staging folders.');
  process.exitCode = 1;
}
