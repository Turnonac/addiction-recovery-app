import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';

import {
  BACKUP_PICKER_TYPES,
  isBackupReadError,
  MAX_BACKUP_BYTES,
  pickBackupFile,
} from '@/services/backupFiles';

const CACHE = 'file:///cache/';
/** iOS app container, as `Paths.document` reports it (no `/private`). */
const APP = 'file:///var/mobile/Containers/Data/Application/APP-ID/';
/** Where iOS puts the picked copy; the picker reports it with `/private`. */
const INBOX = 'file:///private/var/mobile/Containers/Data/Application/APP-ID/tmp/org.example.app-Inbox/';

const mockFiles: Record<string, { text: string; size: number }> = {};
const mockReads: string[] = [];
const mockDeleted: string[] = [];

jest.mock('expo-file-system', () => ({
  Paths: {
    cache: { uri: 'file:///cache/' },
    document: { uri: 'file:///var/mobile/Containers/Data/Application/APP-ID/Documents/' },
  },
  File: class {
    uri: string;
    constructor(uri: string) {
      this.uri = uri;
    }
    get exists() {
      return this.uri in mockFiles;
    }
    get size() {
      return mockFiles[this.uri]?.size ?? 0;
    }
    async text() {
      mockReads.push(this.uri);
      return mockFiles[this.uri].text;
    }
    delete() {
      mockDeleted.push(this.uri);
      delete mockFiles[this.uri];
    }
  },
}));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({}));

const getDocumentAsync = DocumentPicker.getDocumentAsync as jest.MockedFunction<
  typeof DocumentPicker.getDocumentAsync
>;

/** `reportedSize` is what the picker says (null: not reported); default the text length. */
function picked(uri: string, text: string, reportedSize: number | null = text.length) {
  const name = decodeURIComponent(uri.slice(uri.lastIndexOf('/') + 1));
  mockFiles[uri] = { text, size: text.length };
  getDocumentAsync.mockResolvedValueOnce({
    canceled: false,
    assets: [
      { uri, name, size: reportedSize ?? undefined, mimeType: 'application/json', lastModified: 0 },
    ],
  } as DocumentPicker.DocumentPickerResult);
  return uri;
}

beforeEach(() => {
  jest.clearAllMocks();
  for (const key of Object.keys(mockFiles)) delete mockFiles[key];
  mockReads.length = 0;
  mockDeleted.length = 0;
});

describe('pickBackupFile', () => {
  it('only offers JSON-like types, not every file', async () => {
    getDocumentAsync.mockResolvedValueOnce({ canceled: true, assets: null });
    await expect(pickBackupFile()).resolves.toBeNull();
    const options = getDocumentAsync.mock.calls[0][0];
    expect(options?.type).toEqual(BACKUP_PICKER_TYPES);
    expect(BACKUP_PICKER_TYPES).not.toContain('*/*');
  });

  it('refuses a file larger than a backup could be, without reading it', async () => {
    const uri = picked(`${CACHE}video.json`, '{}', MAX_BACKUP_BYTES + 1);
    const error = await pickBackupFile().catch((e: unknown) => e);
    expect(isBackupReadError(error) && error.code).toBe('unreadable');
    expect(mockReads).toEqual([]);
    expect(mockDeleted).toEqual([uri]);
  });

  it('checks the file itself when the picker reports no size', async () => {
    const uri = picked(`${CACHE}big.json`, 'x'.repeat(16), null);
    mockFiles[uri].size = MAX_BACKUP_BYTES + 1;
    const error = await pickBackupFile().catch((e: unknown) => e);
    expect(isBackupReadError(error) && error.code).toBe('unreadable');
    expect(mockReads).toEqual([]);
  });

  it('reports a file that is not JSON', async () => {
    picked(`${CACHE}notes.txt`, 'hello');
    const error = await pickBackupFile().catch((e: unknown) => e);
    expect(isBackupReadError(error) && error.code).toBe('invalid-json');
  });
});

describe('pickBackupFile on Android', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'android');
  });

  it('reads and parses a picked JSON file, then removes the cache copy', async () => {
    const uri = picked(`${CACHE}daily-backup.json`, '﻿{"format":"walkinlight-backup"}');
    await expect(pickBackupFile()).resolves.toEqual({ format: 'walkinlight-backup' });
    expect(getDocumentAsync.mock.calls[0][0]?.copyToCacheDirectory).toBe(true);
    expect(mockDeleted).toEqual([uri]);
  });

  it('never deletes a file outside the cache', async () => {
    const uri = picked('content://com.android.providers.downloads.documents/document/42', '{}');
    await expect(pickBackupFile()).resolves.toEqual({});
    expect(mockDeleted).toEqual([]);
    expect(mockFiles[uri]).toBeDefined();
  });
});

describe('pickBackupFile on iOS', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'ios');
  });

  it('reads the system copy in tmp/<bundle-id>-Inbox (no second cache copy), then removes it', async () => {
    const uri = picked(`${INBOX}daily%20backup.json`, '{"format":"walkinlight-backup"}');
    await expect(pickBackupFile()).resolves.toEqual({ format: 'walkinlight-backup' });
    expect(getDocumentAsync.mock.calls[0][0]?.copyToCacheDirectory).toBe(false);
    expect(mockReads).toEqual([uri]);
    expect(mockDeleted).toEqual([uri]);
  });

  it('removes the Inbox copy when the reported path has no /private prefix', async () => {
    const uri = picked(`${APP}tmp/org.example.app-Inbox/daily-backup.json`, '{}');
    await expect(pickBackupFile()).resolves.toEqual({});
    expect(mockDeleted).toEqual([uri]);
  });

  it('removes the Inbox copy even when it is refused', async () => {
    const uri = picked(`${INBOX}video.json`, '{}', MAX_BACKUP_BYTES + 1);
    await expect(pickBackupFile()).rejects.toThrow();
    expect(mockDeleted).toEqual([uri]);
  });

  it.each([
    ['iCloud Drive', 'file:///private/var/mobile/Library/Mobile%20Documents/com~apple~CloudDocs/backup.json'],
    ['another app', 'file:///private/var/mobile/Containers/Data/Application/OTHER-ID/tmp/x-Inbox/backup.json'],
    ['our tmp, outside an Inbox', `${APP}tmp/daily-backup.json`],
    ['our documents', `${APP}Documents/daily-backup.json`],
  ])('never deletes a file in %s', async (_where, uri) => {
    picked(uri, '{}');
    await expect(pickBackupFile()).resolves.toEqual({});
    expect(mockDeleted).toEqual([]);
    expect(mockFiles[uri]).toBeDefined();
  });
});
