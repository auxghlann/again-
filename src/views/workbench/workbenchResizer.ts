/**
 * Bento Grid Resizer Subsystem
 * Manages pointer-captured column and row splitting with localStorage persistence.
 */

export interface SplitPercentages {
  splitX: number;
  splitY: number;
}

export function getStoredSplitPercentages(): SplitPercentages {
  let splitX = parseFloat(localStorage.getItem('again_bento_split_x') || '45');
  let splitY = parseFloat(localStorage.getItem('again_bento_split_y') || '58');

  // Clamp initial values to safe bounds
  splitX = Math.min(Math.max(isNaN(splitX) ? 45 : splitX, 22), 75);
  splitY = Math.min(Math.max(isNaN(splitY) ? 58 : splitY, 25), 80);

  return { splitX, splitY };
}

export function setupBentoResizers(container: HTMLElement): void {
  const colResizer = container.querySelector('#bento-col-resizer') as HTMLElement | null;
  const rowResizer = container.querySelector('#bento-row-resizer') as HTMLElement | null;
  const leftCard = container.querySelector('#bento-left') as HTMLElement | null;
  const editorCard = container.querySelector('#bento-editor-card') as HTMLElement | null;
  const workspace = container.querySelector('#bento-workspace') as HTMLElement | null;
  const rightCol = container.querySelector('#bento-right') as HTMLElement | null;

  let isDraggingCol = false;
  let isDraggingRow = false;
  let currentSplitX = 45;
  let currentSplitY = 58;

  // Column (Horizontal) Resizer
  if (colResizer && leftCard && workspace) {
    colResizer.addEventListener('pointerdown', (e: PointerEvent) => {
      isDraggingCol = true;
      colResizer.setPointerCapture(e.pointerId);
      document.body.classList.add('cursor-col-resize', 'select-none');
    });

    colResizer.addEventListener('pointermove', (e: PointerEvent) => {
      if (!isDraggingCol) return;
      const rect = workspace.getBoundingClientRect();
      const percent = Math.min(Math.max(((e.clientX - rect.left) / rect.width) * 100, 20), 75);
      leftCard.style.width = `${percent}%`;
      currentSplitX = percent;
    });

    const onPointerUpCol = (e: PointerEvent) => {
      if (!isDraggingCol) return;
      isDraggingCol = false;
      try {
        colResizer.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      document.body.classList.remove('cursor-col-resize', 'select-none');
      localStorage.setItem('again_bento_split_x', currentSplitX.toFixed(1));
    };

    colResizer.addEventListener('pointerup', onPointerUpCol);
    colResizer.addEventListener('pointercancel', onPointerUpCol);
  }

  // Row (Vertical) Resizer inside Right Column
  if (rowResizer && editorCard && rightCol) {
    rowResizer.addEventListener('pointerdown', (e: PointerEvent) => {
      isDraggingRow = true;
      rowResizer.setPointerCapture(e.pointerId);
      document.body.classList.add('cursor-row-resize', 'select-none');
    });

    rowResizer.addEventListener('pointermove', (e: PointerEvent) => {
      if (!isDraggingRow) return;
      const rect = rightCol.getBoundingClientRect();
      const percent = Math.min(Math.max(((e.clientY - rect.top) / rect.height) * 100, 20), 80);
      editorCard.style.height = `${percent}%`;
      currentSplitY = percent;
    });

    const onPointerUpRow = (e: PointerEvent) => {
      if (!isDraggingRow) return;
      isDraggingRow = false;
      try {
        rowResizer.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      document.body.classList.remove('cursor-row-resize', 'select-none');
      localStorage.setItem('again_bento_split_y', currentSplitY.toFixed(1));
    };

    rowResizer.addEventListener('pointerup', onPointerUpRow);
    rowResizer.addEventListener('pointercancel', onPointerUpRow);
  }
}
