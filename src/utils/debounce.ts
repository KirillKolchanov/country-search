export interface Debounced<Args extends unknown[]> {
  (...args: Args): void;
  /** Drops a pending call, if any. */
  cancel: () => void;
}

/**
 * Delays `fn` until `delay` ms have passed since the last call.
 * Every new call restarts the timer; only the latest arguments are used.
 */
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delay: number,
): Debounced<Args> {
  let timerId: ReturnType<typeof setTimeout> | undefined;

  const cancel = (): void => {
    if (timerId !== undefined) {
      clearTimeout(timerId);
      timerId = undefined;
    }
  };

  const debounced = (...args: Args): void => {
    cancel();
    timerId = setTimeout(() => {
      timerId = undefined;
      fn(...args);
    }, delay);
  };

  return Object.assign(debounced, { cancel });
}
