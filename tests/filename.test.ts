import { describe, expect, it } from 'vitest';
import { parseSequenceNumber, naturalCompare, sortFilesBySequence } from '@utils/filename';

function createFile(name: string) {
  return { name, type: 'image/png' } as File;
}

describe('parseSequenceNumber', () => {
  it('parses trailing numbers', () => {
    expect(parseSequenceNumber('page_001.png')).toBe(1);
    expect(parseSequenceNumber('foo-12.png')).toBe(12);
  });

  it('falls back to leading numbers', () => {
    expect(parseSequenceNumber('001_cover.png')).toBe(1);
  });

  it('returns null when not found', () => {
    expect(parseSequenceNumber('cover-final.png')).toBeNull();
  });
});

describe('naturalCompare', () => {
  it('orders alpha numeric strings naturally', () => {
    expect(['file2', 'file10', 'file1'].sort(naturalCompare)).toEqual(['file1', 'file2', 'file10']);
  });
});

describe('sortFilesBySequence', () => {
  it('sorts files using numeric suffix and prefix', () => {
    const files = [createFile('foo_10.png'), createFile('foo_2.png'), createFile('foo_1.png')];
    const sorted = sortFilesBySequence(files).map((file) => file.name);
    expect(sorted).toEqual(['foo_1.png', 'foo_2.png', 'foo_10.png']);
  });

  it('falls back to natural order when no numbers', () => {
    const files = [createFile('b.png'), createFile('a.png'), createFile('aa.png')];
    const sorted = sortFilesBySequence(files).map((file) => file.name);
    expect(sorted).toEqual(['a.png', 'aa.png', 'b.png']);
  });
});
