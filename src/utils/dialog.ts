import type { MouseEvent } from 'react';

export function closeDialogOnBackdropClick(
  event: MouseEvent<HTMLDialogElement>,
) {
  if (event.target !== event.currentTarget) {
    return;
  }

  const bounds = event.currentTarget.getBoundingClientRect();
  const clickedOutsideDialog =
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom;

  if (clickedOutsideDialog) {
    event.currentTarget.close();
  }
}
