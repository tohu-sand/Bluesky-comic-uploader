import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '@stores/appStore';
import { Button } from '@components/ui/Button';
import { filterImageFiles, toComicImages, releaseComicImages } from '@modules/ingest/intake';
import { ThumbnailService } from '@modules/ingest/thumbnailService';

export function IngestStep() {
  const { images, actions } = useAppStore();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const serviceRef = useRef<ThumbnailService | null>(null);
  if (!serviceRef.current) {
    serviceRef.current = new ThumbnailService();
  }

  useEffect(() => () => {
    serviceRef.current?.dispose();
  }, []);

  const handleFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setBusy(true);
    setMessage(null);
    try {
      const cleanFiles = filterImageFiles(files);
      if (cleanFiles.length === 0) {
        setMessage('画像ファイルが見つかりませんでした。対応形式: png, jpg, webp');
        setBusy(false);
        return;
      }
      const newImages = toComicImages(cleanFiles);
      const service = serviceRef.current;
      if (!service) {
        throw new Error('Thumbnail service not available');
      }

      await Promise.all(
        newImages.map(async (image) => {
          try {
            const response = await service.generate(image, { maxWidth: 512, maxHeight: 512, quality: 0.7 });
            if (response.thumbnail) {
              image.thumbnailUrl = URL.createObjectURL(response.thumbnail);
            }
            image.width = response.width;
            image.height = response.height;
            if (response.metrics) {
              image.averageLuminance = response.metrics.averageLuminance;
              image.transparentPixelRatio = response.metrics.transparentPixelRatio;
              image.blankCandidate = response.metrics.isLikelyBlank;
            }
          } catch (error) {
            console.warn('Thumbnail generation failed', error);
          }
        })
      );

      if (images.length > 0) {
        releaseComicImages(images);
      }
      actions.setImages(newImages);
      actions.setStep('preview');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }, [actions, images]);

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = await extractFilesFromDataTransfer(event.dataTransfer);
    void handleFiles(files);
  };

  const handleBrowse = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    void handleFiles(files);
  };

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-50">画像を取り込む</h2>
        <p className="text-sm text-slate-400">
          CLIP STUDIO PAINT（クリスタ）でPNG出力したフォルダ/ファイルをドラッグ＆ドロップ、またはフォルダを選択してください。ファイル名の連番（例: コミック_出力_001.png）を元に並べ替えます。
        </p>
      </header>

      {/* biome-ignore lint/a11y/useSemanticElements: drop zone needs div for drag events */}
      <div
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
        }}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        className="flex min-h-[220px] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/40 p-10 text-center focus:outline-none focus:ring-2 focus:ring-sky-500"
      >
        <p className="text-sm text-slate-300">
          ここにファイルまたはフォルダをドロップ
        </p>
        <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()} disabled={busy}>
          ファイルを選択
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleBrowse}
          // directory pickers
          // @ts-expect-error - webkitdirectory is non-standard but widely supported
          webkitdirectory="true"
        />
        {busy && <p className="text-xs text-sky-300">解析中...</p>}
      </div>

      {message && <p className="text-sm text-rose-400">{message}</p>}

      {images.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            取り込み済み: {images.length}枚。次へ進んでプレビューを確認してください。
          </p>
          <Button onClick={() => actions.setStep('preview')} disabled={busy}>
            プレビューへ進む
          </Button>
        </div>
      )}
    </section>
  );
}

async function extractFilesFromDataTransfer(dataTransfer: DataTransfer): Promise<File[]> {
  const items = Array.from(dataTransfer.items);
  if (items.length === 0) {
    return Array.from(dataTransfer.files);
  }
  const allFiles: File[] = [];
  await Promise.all(
    items.map(async (item) => {
      if (item.kind !== 'file') return;
      const entry = item.webkitGetAsEntry?.();
      if (!entry) {
        const file = item.getAsFile();
        if (file) allFiles.push(file);
        return;
      }
      const files = await traverseEntry(entry);
      allFiles.push(...files);
    })
  );
  return allFiles;
}

async function traverseEntry(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    return new Promise((resolve) => {
      (entry as FileSystemFileEntry).file((file) => resolve([file]));
    });
  }
  if (entry.isDirectory) {
    const directoryReader = (entry as FileSystemDirectoryEntry).createReader();
    const entries: FileSystemEntry[] = await new Promise((resolve, reject) => {
      directoryReader.readEntries((results) => resolve(Array.from(results)), reject);
    });
    const nested = await Promise.all(entries.map(traverseEntry));
    return nested.flat();
  }
  return [];
}
