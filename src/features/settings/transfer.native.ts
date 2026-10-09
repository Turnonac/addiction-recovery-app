import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { withSystemPrompt } from '@/features/lock/systemPrompt';
import type { PickOptions, SaveResult } from './transfer';

export type { PickOptions, SaveResult } from './transfer';

/** Write the backup to the cache directory and open the system share sheet. */
export async function saveBackupFile(fileName: string, json: string): Promise<SaveResult> {
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(json);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing isn’t available on this device.');
  }
  // The share sheet is a separate activity on Android (app goes to background):
  // mark it so the app lock doesn't re-lock or cover it mid-export.
  await withSystemPrompt(() =>
    Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      UTI: 'public.json',
      dialogTitle: 'Export Quit backup',
    }),
  );
  return { status: 'saved', detail: `Exported ${fileName}` };
}

/**
 * Pick a backup with the system document picker. Resolves its text, or null when
 * cancelled. The picker reports late selections itself, so `options` is unused here.
 */
export async function pickBackupFile(_options?: PickOptions): Promise<string | null> {
  // Same as the share sheet: the picker must not trigger the app lock.
  const result = await withSystemPrompt(() =>
    DocumentPicker.getDocumentAsync({
      // Android file managers often report .json as octet-stream; the parser validates anyway.
      type: Platform.OS === 'ios' ? 'application/json' : '*/*',
      copyToCacheDirectory: true,
      multiple: false,
    }),
  );
  if (result.canceled || !result.assets?.length) return null;
  return new File(result.assets[0].uri).text();
}
