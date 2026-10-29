import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as DocumentPicker from 'expo-document-picker';

import {
  BACKUP_PICKER_TYPES,
  isBackupReadError,
  MAX_BACKUP_BYTES,
  pickBackupFile,
} from '@/services/backupFiles';

const CACHE = 'file:///cache/';

const mockFiles: Record<string, { text: string; size: number }> = {};
const mockReads: string[] = [];
const mockDeleted: string[] = [];

jest.mock('expo-file-system', () => ({
  Paths: { cache: { uri: 'file:///cache/' } },
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
function picked(name: string, text: string, reportedSize: number | null = text.length) {
  const uri = `${CACHE}${name}`;
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
  it('reads and parses a picked JSON file, then removes the cache copy', async () => {
    const uri = picked('daily-backup.json', '﻿{"format":"walkinlight-backup"}');
    await expect(pickBackupFile()).resolves.toEqual({ format: 'walkinlight-backup' });
    expect(mockDeleted).toEqual([uri]);
  });

  it('only offers JSON-like types, not every file', async () => {
    getDocumentAsync.mockResolvedValueOnce({ canceled: true, assets: null });
    await expect(pickBackupFile()).resolves.toBeNull();
    const options = getDocumentAsync.mock.calls[0][0];
    expect(options?.type).toEqual(BACKUP_PICKER_TYPES);
    expect(BACKUP_PICKER_TYPES).not.toContain('*/*');
  });

  it('refuses a file larger than a backup could be, without reading it', async () => {
    const uri = picked('video.json', '{}', MAX_BACKUP_BYTES + 1);
    const error = await pickBackupFile().catch((e: unknown) => e);
    expect(isBackupReadError(error) && error.code).toBe('unreadable');
    expect(mockReads).toEqual([]);
    expect(mockDeleted).toEqual([uri]);
  });

  it('checks the file itself when the picker reports no size', async () => {
    const uri = picked('big.json', 'x'.repeat(16), null);
    mockFiles[uri].size = MAX_BACKUP_BYTES + 1;
    const error = await pickBackupFile().catch((e: unknown) => e);
    expect(isBackupReadError(error) && error.code).toBe('unreadable');
    expect(mockReads).toEqual([]);
  });

  it('reports a file that is not JSON', async () => {
    picked('notes.txt', 'hello');
    const error = await pickBackupFile().catch((e: unknown) => e);
    expect(isBackupReadError(error) && error.code).toBe('invalid-json');
  });
});
