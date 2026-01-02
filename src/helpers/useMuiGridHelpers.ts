import React, { useLayoutEffect } from 'react';

const useMuiGridHelpers = (
  emailRowHeight: number,
  setPageSize: (size: number) => void
) => {
  const refGrid = React.useRef<HTMLDivElement>(null);
  const debounceHandle = React.useRef<number | null>(null);
  const DEBOUNCE_MS = 150;

  useLayoutEffect(() => {
    const node = refGrid.current;
    if (!node) return;

    const updatePageSizeAndHeight = () => {

      const gridAreaIncludingHeader = node.querySelector('.MuiDataGrid-main');
      if (!gridAreaIncludingHeader) return;

      const gridColumnHeaders = node.querySelector('.MuiDataGrid-topContainer');
      if (!gridColumnHeaders) return;

      const availableHeight = gridAreaIncludingHeader.clientHeight - gridColumnHeaders.clientHeight;

      const rowCount = Math.max(10, Math.floor(availableHeight / emailRowHeight));
      setPageSize(rowCount);
      // console.log('resize observed for grid, new rowCount:', rowCount);
    };

    const scheduleUpdate = () => {
      if (debounceHandle.current !== null) window.clearTimeout(debounceHandle.current);
      debounceHandle.current = window.setTimeout(() => {
        debounceHandle.current = null;
        updatePageSizeAndHeight();
      }, DEBOUNCE_MS);
    };

    // Run once after mount to populate rows (not debounced)
    requestAnimationFrame(updatePageSizeAndHeight);

    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(node);
    return () => {
      observer.disconnect();
      if (debounceHandle.current !== null) {
        window.clearTimeout(debounceHandle.current);
        debounceHandle.current = null;
      }
    };

  }, [emailRowHeight, setPageSize]);

  return refGrid;
};

export default useMuiGridHelpers;