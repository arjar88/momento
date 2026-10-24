import { createContext, use, useMemo, useState, type ReactNode } from 'react';

type SelectedAlbumValue = {
  albumId: string | null;
  setAlbumId: (id: string) => void;
};

const SelectedAlbumContext = createContext<SelectedAlbumValue | null>(null);

export function SelectedAlbumProvider({ children }: { children: ReactNode }) {
  const [albumId, setAlbumId] = useState<string | null>(null);
  const value = useMemo(() => ({ albumId, setAlbumId }), [albumId]);
  return <SelectedAlbumContext value={value}>{children}</SelectedAlbumContext>;
}

export function useSelectedAlbum() {
  const value = use(SelectedAlbumContext);
  if (!value) throw new Error('useSelectedAlbum must be used inside SelectedAlbumProvider');
  return value;
}
