import { createContext, use, useMemo, useState, type ReactNode } from 'react';

export type DraftPhoto = {
  localId: string;
  uri: string;
  takenOn: string | null;
  caption: string;
};

export type DraftNotice = {
  future: number;
  wrongDay: number;
  outsideAlbum: number;
  undated: number;
};

type Draft = {
  albumId: string | null;
  lockedDate: string | null;
  photos: DraftPhoto[];
  notice: DraftNotice;
};

type DraftValue = Draft & {
  replaceDraft: (next: Draft) => void;
  updatePhoto: (localId: string, patch: Partial<Pick<DraftPhoto, 'takenOn' | 'caption'>>) => void;
  keepPhotos: (localIds: string[]) => void;
  clearDraft: () => void;
};

const emptyNotice: DraftNotice = { future: 0, wrongDay: 0, outsideAlbum: 0, undated: 0 };

const DraftContext = createContext<DraftValue | null>(null);

export function MemoryDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft>({
    albumId: null,
    lockedDate: null,
    photos: [],
    notice: emptyNotice,
  });

  const value = useMemo<DraftValue>(
    () => ({
      ...draft,
      replaceDraft: setDraft,
      updatePhoto: (localId, patch) => {
        setDraft((current) => ({
          ...current,
          photos: current.photos.map((photo) => (photo.localId === localId ? { ...photo, ...patch } : photo)),
        }));
      },
      keepPhotos: (localIds) => {
        const keep = new Set(localIds);
        setDraft((current) => ({
          ...current,
          photos: current.photos.filter((photo) => keep.has(photo.localId)),
        }));
      },
      clearDraft: () => setDraft({ albumId: null, lockedDate: null, photos: [], notice: emptyNotice }),
    }),
    [draft],
  );

  return <DraftContext value={value}>{children}</DraftContext>;
}

export function useMemoryDraft() {
  const value = use(DraftContext);
  if (!value) throw new Error('useMemoryDraft must be used inside MemoryDraftProvider');
  return value;
}

export { emptyNotice };
