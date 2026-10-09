import { useEffect, useState } from 'react';

import { buildDemoState } from '@/domain/demo';
import { useHaptics } from '@/hooks/useHaptics';
import { useStore } from '@/store';
import { confirm, notify } from '@/utils/confirm';
import { formatDateTime } from '@/utils/format';
import { backupFileName, backupSummary, mergeImportedSettings, parseBackup, serializeBackup } from './logic/backup';
import { pickBackupFile, saveBackupFile } from './transfer';

export type DataTask = 'export' | 'import' | null;

function errorText(e: unknown): string {
  return e instanceof Error && e.message ? e.message : 'Something went wrong. Please try again.';
}

/** Export / import / sample data / reset flows, with a transient status line. */
export function useDataActions() {
  const replaceAll = useStore((s) => s.replaceAll);
  const resetAll = useStore((s) => s.resetAll);
  const haptic = useHaptics();
  const [busy, setBusy] = useState<DataTask>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 6000);
    return () => clearTimeout(t);
  }, [status]);

  const exportData = async () => {
    if (busy) return;
    setBusy('export');
    try {
      const now = Date.now();
      const json = serializeBackup(useStore.getState().exportData(), now);
      const res = await saveBackupFile(backupFileName(now), json);
      if (res.status === 'saved') {
        haptic('success');
        setStatus(res.detail);
      }
    } catch (e) {
      haptic('error');
      notify('Export failed', errorText(e));
    } finally {
      setBusy(null);
    }
  };

  /** Validate a backup's text, confirm, then replace everything. */
  const importText = async (text: string) => {
    const res = parseBackup(text);
    if (!res.ok) {
      haptic('error');
      notify('Can’t import this file', res.error);
      return;
    }
    const when = res.exportedAt != null ? ` from ${formatDateTime(res.exportedAt)}` : '';
    const ok = await confirm({
      title: 'Replace all current data?',
      message: `This backup${when} contains ${backupSummary(res.data)}. Everything currently in Quit will be replaced; app lock and haptics stay as set on this device. This can’t be undone.`,
      confirmLabel: 'Replace',
      destructive: true,
    });
    if (!ok) return;
    // Read settings now (not before the picker/dialog) so nothing changed meanwhile is lost.
    replaceAll({ ...res.data, settings: mergeImportedSettings(res.data.settings, useStore.getState().settings) });
    haptic('success');
    setStatus(`Imported ${backupSummary(res.data)}`);
  };

  const runImport = async (read: () => Promise<string | null>) => {
    setBusy('import');
    try {
      const text = await read();
      if (text != null) await importText(text);
    } catch (e) {
      haptic('error');
      notify('Import failed', errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const importData = async () => {
    if (busy) return;
    await runImport(() =>
      pickBackupFile({
        // Web: the picker gave up waiting but the file arrived after all — import it now.
        onLateFile: (text) => void runImport(async () => text),
        onLateError: (e) => {
          haptic('error');
          notify('Import failed', errorText(e));
        },
      }),
    );
  };

  const loadSampleData = async () => {
    const ok = await confirm({
      title: 'Load sample data?',
      message: 'Your habits, journal and history will be replaced with example data so you can explore Quit. Your settings are kept.',
      confirmLabel: 'Load sample data',
      destructive: true,
    });
    if (!ok) return;
    const current = useStore.getState().settings;
    const demo = buildDemoState(Date.now());
    replaceAll({ ...demo, settings: { ...current, onboardingCompleted: true } });
    haptic('success');
    setStatus(`Loaded ${backupSummary(demo)}`);
  };

  const resetData = async () => {
    const first = await confirm({
      title: 'Reset all data?',
      message: 'This permanently deletes every habit, relapse, journal entry and setting on this device.',
      confirmLabel: 'Reset',
      destructive: true,
    });
    if (!first) return;
    const second = await confirm({
      title: 'Are you absolutely sure?',
      message: 'Consider exporting a backup first. This can’t be undone.',
      confirmLabel: 'Delete everything',
      destructive: true,
    });
    if (!second) return;
    haptic('heavy');
    // Onboarding is shown automatically once `onboardingCompleted` flips back to false.
    resetAll();
  };

  return { busy, status, exportData, importData, loadSampleData, resetData };
}
