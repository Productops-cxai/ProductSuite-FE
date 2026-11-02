import { useCallback, useEffect, useMemo, useState } from "react";

/** Offset/limit pager — resets to 0 when `resetKey` changes. */
export function useOffsetPagination(pageSize = 10, resetKey?: string | number) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    setOffset(0);
  }, [resetKey, pageSize]);

  const goPrev = useCallback(() => {
    setOffset((o) => Math.max(0, o - pageSize));
  }, [pageSize]);

  const goNext = useCallback(() => {
    setOffset((o) => o + pageSize);
  }, [pageSize]);

  return { offset, setOffset, pageSize, goPrev, goNext };
}

/** 1-based page pager — resets to 1 when `resetKey` changes. */
export function usePagePagination(pageSize = 10, resetKey?: string | number) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [resetKey, pageSize]);

  const goPrev = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  const goNext = useCallback(() => {
    setPage((p) => p + 1);
  }, []);

  return { page, setPage, pageSize, goPrev, goNext };
}

/** Client-side slice over an already-loaded list. */
export function useClientPagedList<T>(items: T[], pageSize = 10, resetKey?: string | number) {
  const { offset, pageSize: size, goPrev, goNext } = useOffsetPagination(pageSize, resetKey);
  const pageItems = useMemo(
    () => items.slice(offset, offset + size),
    [items, offset, size],
  );
  return {
    pageItems,
    total: items.length,
    offset,
    pageSize: size,
    goPrev,
    goNext,
  };
}
