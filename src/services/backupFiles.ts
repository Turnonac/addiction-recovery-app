import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { BackupFileV2 } from '@/domain/types';

export type BackupReadErrorCode = 'unreadable' | 'invalid-json';

/**
 * Largest file read as a backup. Ten years of days is a few hundred KB, so
 * anything bigger is the wrong file; refusing it avoids loading it into memory.
 */
export const MAX_BACKUP_BYTES = 5_000_000;

/**
 * Types offered in the picker. Backups are JSON; some file providers label
 * .json files as plain text or a generic binary. Not every type: on Android
 * the picker copies the chosen file on the main thread, so picking a large
 * video by mistake could freeze the app. (iOS maps octet-stream to any data
 * file, but copies out of process; the size check below covers both.)
 */
export const BACKUP_PICKER_TYPES = ['application/json', 'text/plain', 'application/octet-stream'];

/** Thrown by `pickBackupFile` when a picked file cannot be read or is not JSON. */
export class BackupReadError extends Error {
  readonly code: BackupReadErrorCode;

  constructor(code: BackupReadErrorCode, cause?: unknown) {
    super(
      code === 'unreadable' ? 'The selected file could not be read.' : 'The selected file is not valid JSON.',
      { cause },
    );
    // Keep `instanceof` working even if the class is transpiled to ES5.
    Object.setPrototypeOf(this, BackupReadError.prototype);
    this.name = 'BackupReadError';
    this.code = code;
  }
}

export function isBackupReadError(error: unknown): error is BackupReadError {
  return (
    error instanceof BackupReadError ||
    (typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'BackupReadError')
  );
}

function safeFileName(fileName: string): string {
  const base = fileName.replace(/[\\/:]/g, '-').trim() || 'daily-backup';
  return base.toLowerCase().endsWith('.json') ? base : `${base}.json`;
}

/**
 * Writes the backup to the cache directory and opens the share sheet.
 * Resolves true once the sheet closes (the OS does not say whether it was saved),
 * false if sharing is unavailable or anything fails.
 */
export async function shareBackupFile(file: BackupFileV2, fileName: string): Promise<boolean> {
  try {
    if (!(await Sharing.isAvailableAsync())) return false;
    const target = new File(Paths.cache, safeFileName(fileName));
    target.create({ overwrite: true });
    await target.write(JSON.stringify(file, null, 2));
    await Sharing.shareAsync(target.uri, {
      mimeType: 'application/json',
      UTI: 'public.json',
      dialogTitle: 'Save backup',
    });
    return true;
  } catch {
    return false;
  }
}

/** On iOS `/private/var/...` and `/var/...` are the same place; the picker may report either. */
function withoutPrivatePrefix(uri: string): string {
  return uri.replace(/^file:\/\/\/private\/var\//, 'file:///var/');
}

/**
 * True only for a copy inside our own sandbox: our cache directory (Android's picker
 * copy), or on iOS tmp/<bundle-id>-Inbox, where the system puts the picked copy.
 */
function isOwnCopy(uri: string): boolean {
  const target = withoutPrivatePrefix(uri);
  if (target.startsWith(withoutPrivatePrefix(Paths.cache.uri))) return true;
  if (Platform.OS !== 'ios') return false;
  // tmp/ sits next to Documents/ in the app container.
  const documents = withoutPrivatePrefix(Paths.document.uri);
  if (!documents.endsWith('/Documents/')) return false;
  const tmp = `${documents.slice(0, -'Documents/'.length)}tmp/`;
  return target.startsWith(tmp) && /^[^/]+-Inbox\/./.test(target.slice(tmp.length));
}

/** Deletes the copy the picker handed us. Never touches the user's original file. */
function removePickedCopy(uri: string): void {
  try {
    if (!isOwnCopy(uri)) return;
    const copy = new File(uri);
    if (copy.exists) copy.delete();
  } catch {
    // Best effort; the OS clears the cache and tmp eventually.
  }
}

/**
 * Lets the user pick a backup file and returns its parsed JSON (still unvalidated;
 * pass it to `parseBackup`). Resolves null if the user cancels.
 * @throws BackupReadError if the file cannot be read, is too large, or is not JSON.
 */
export async function pickBackupFile(): Promise<unknown | null> {
  let result: DocumentPicker.DocumentPickerResult;
  try {
    result = await DocumentPicker.getDocumentAsync({
      type: BACKUP_PICKER_TYPES,
      // iOS already hands over a copy in tmp/<bundle-id>-Inbox; a cache copy would be a second one.
      // Android needs the cache copy (otherwise it returns a content:// URI).
      copyToCacheDirectory: Platform.OS !== 'ios',
      multiple: false,
    });
  } catch (error) {
    throw new BackupReadError('unreadable', error);
  }
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;

  let text: string;
  try {
    const file = new File(asset.uri);
    // Android reports the provider's size, which can be 0 or too small; trust the larger.
    const size = Math.max(asset.size ?? 0, file.size);
    if (size > MAX_BACKUP_BYTES) {
      throw new RangeError(`File too large for a backup: ${size} bytes`);
    }
    text = await file.text();
  } catch (error) {
    throw new BackupReadError('unreadable', error);
  } finally {
    removePickedCopy(asset.uri);
  }

  try {
    return JSON.parse(text.replace(/^\uFEFF/, '')) as unknown;
  } catch (error) {
    throw new BackupReadError('invalid-json', error);
  }
}
