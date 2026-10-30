import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';

import {
  BACKUP_PICKER_TYPES,
  deleteBackupCopies,
  isBackupReadError,
  MAX_BACKUP_BYTES,
  pickBackupFile,
} from '@/services/backupFiles';

const CACHE = 'file:///cache/';
/** iOS app container, as `Paths.document` reports it (no `/private`). */
const APP = 'file:///var/mobile/Containers/Data/Application/APP-ID/';
/** Where iOS puts the picked copy; the picker reports it with `/private`. */
const INBOX = 'file:///private/var/mobile/Containers/Data/Application/APP-ID/tmp/org.example.app-Inbox/';

/** A small file system: files by uri (`locked`: delete() throws); folders are implied by paths. */
const mockFiles: Record<string, { text: string; size: number; locked?: boolean }> = {};
const mockReads: string[] = [];
const mockDeleted: string[] = [];
/** Makes every Directory.list() throw. */
const mockList: { error: Error | null } = { error: null };

jest.mock('expo-file-system', () => {
  type MockPart = string | { uri: string };
  const join = (parts: MockPart[]) =>
    parts
      .map((part) => (typeof part === 'string' ? part : part.uri))
      .reduce((a, b) => (a.endsWith('/') ? a + b : `${a}/${b}`));
  const baseName = (uri: string) => {
    const path = uri.replace(/\/$/, '');
    return path.slice(path.lastIndexOf('/') + 1);
  };
  class File {
    uri: string;
    constructor(...parts: MockPart[]) {
      this.uri = join(parts);
    }
    get name() {
      return baseName(this.uri);
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
      if (mockFiles[this.uri]?.locked) throw new Error('busy');
      mockDeleted.push(this.uri);
      delete mockFiles[this.uri];
    }
  }
  class Directory {
    uri: string;
    constructor(...parts: MockPart[]) {
      const uri = join(parts);
      this.uri = uri.endsWith('/') ? uri : `${uri}/`;
    }
    get name() {
      return baseName(this.uri);
    }
    get exists() {
      return Object.keys(mockFiles).some((uri) => uri.startsWith(this.uri));
    }
    list() {
      if (mockList.error) throw mockList.error;
      if (!this.exists) throw new Error('No such directory');
      const children = new Map<string, File | Directory>();
      for (const uri of Object.keys(mockFiles)) {
        if (!uri.startsWith(this.uri)) continue;
        const rest = uri.slice(this.uri.length);
        const slash = rest.indexOf('/');
        if (slash === -1) children.set(rest, new File(uri));
        else children.set(rest.slice(0, slash), new Directory(this.uri + rest.slice(0, slash + 1)));
      }
      return [...children.values()];
    }
    delete() {
      if (!this.exists) throw new Error('No such directory');
      mockDeleted.push(this.uri);
      for (const uri of Object.keys(mockFiles)) {
        if (uri.startsWith(this.uri)) delete mockFiles[uri];
      }
    }
  }
  return {
    Paths: {
      cache: new Directory('file:///cache/'),
      document: new Directory('file:///var/mobile/Containers/Data/Application/APP-ID/Documents/'),
    },
    Directory,
    File,
  };
});
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
  mockList.error = null;
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

  it.each([
    ['too small', 16],
    ['0', 0],
  ])('checks the file itself when the picker reports a size that is %s', async (_what, reported) => {
    const uri = picked(`${CACHE}big.json`, 'x'.repeat(16), reported);
    mockFiles[uri].size = MAX_BACKUP_BYTES + 1;
    const error = await pickBackupFile().catch((e: unknown) => e);
    expect(isBackupReadError(error) && error.code).toBe('unreadable');
    expect(mockReads).toEqual([]);
    expect(mockDeleted).toEqual([uri]);
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
    const uri = picked(`${CACHE}daily-backup.json`, '﻿{"format":"light2life-backup"}');
    await expect(pickBackupFile()).resolves.toEqual({ format: 'light2life-backup' });
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
    const uri = picked(`${INBOX}daily%20backup.json`, '{"format":"light2life-backup"}');
    await expect(pickBackupFile()).resolves.toEqual({ format: 'light2life-backup' });
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

describe('deleteBackupCopies', () => {
  const add = (...uris: string[]) => {
    for (const uri of uris) mockFiles[uri] = { text: '{}', size: 2 };
  };

  it('deletes the export copies and the picker folder in the cache, and nothing else', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const exports = ['daily-backup-2026-10-29.json', 'daily-backup-2026-09-01.json', 'daily-backup.json'];
    add(...exports.map((name) => `${CACHE}${name}`));
    add(`${CACHE}DocumentPicker/3f2a.json`, `${CACHE}DocumentPicker/9b1c.json`);
    const kept = [
      `${CACHE}photo.jpg`,
      `${CACHE}notes.json`,
      `${CACHE}daily-backup-2026-10-29.json.tmp`,
      `${CACHE}daily-backup-folder.json/inside.json`,
      `${CACHE}Other/daily-backup-2026-10-01.json`,
    ];
    add(...kept);

    expect(deleteBackupCopies()).toBe(true);

    expect([...mockDeleted].sort()).toEqual(
      [...exports.map((name) => `${CACHE}${name}`), `${CACHE}DocumentPicker/`].sort(),
    );
    expect(Object.keys(mockFiles).sort()).toEqual([...kept].sort());
  });

  it('on iOS also deletes the picker copies in tmp/<bundle-id>-Inbox', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    add(`${APP}tmp/org.example.app-Inbox/daily-backup.json`, `${APP}tmp/org.example.app-Inbox/old.json`);
    const kept = [`${APP}tmp/other/file.json`, `${APP}tmp/Inbox-notes.json`, `${APP}Documents/daily-backup.json`];
    add(...kept);

    expect(deleteBackupCopies()).toBe(true);

    expect(mockDeleted).toEqual([`${APP}tmp/org.example.app-Inbox/`]);
    expect(Object.keys(mockFiles).sort()).toEqual([...kept].sort());
  });

  it('leaves tmp alone on Android', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    add(`${APP}tmp/org.example.app-Inbox/daily-backup.json`);
    expect(deleteBackupCopies()).toBe(true);
    expect(mockDeleted).toEqual([]);
  });

  it('keeps going past a copy it cannot delete, and says one is left', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    mockFiles[`${CACHE}daily-backup-2026-10-28.json`] = { text: '{}', size: 2, locked: true };
    add(`${CACHE}daily-backup-2026-10-29.json`, `${APP}tmp/org.example.app-Inbox/daily-backup.json`);
    expect(deleteBackupCopies()).toBe(false);
    expect(mockDeleted).toEqual([`${CACHE}daily-backup-2026-10-29.json`, `${APP}tmp/org.example.app-Inbox/`]);
  });

  it('says a copy may be left when a folder exists but cannot be listed, and never throws', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    add(`${CACHE}daily-backup-2026-10-29.json`);
    mockList.error = new Error('unreadable');
    expect(deleteBackupCopies()).toBe(false);
    expect(mockFiles[`${CACHE}daily-backup-2026-10-29.json`]).toBeDefined();
  });

  it('counts missing folders as nothing left (no tmp, empty cache)', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    expect(deleteBackupCopies()).toBe(true);
    expect(mockDeleted).toEqual([]);
  });
});
