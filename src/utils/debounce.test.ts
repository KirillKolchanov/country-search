import { debounce } from './debounce.js';

const DELAY = 300;

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls fn once, only after the delay', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, DELAY);

    debounced();
    vi.advanceTimersByTime(DELAY - 1);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('resets the timer on every new call', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, DELAY);

    debounced();
    vi.advanceTimersByTime(DELAY - 1);
    debounced();
    vi.advanceTimersByTime(DELAY - 1);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('collapses a burst of calls into one call with the latest arguments', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, DELAY);

    debounced('s');
    debounced('sp');
    debounced('spain');
    vi.advanceTimersByTime(DELAY);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('spain');
  });

  it('cancel() drops the pending call', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, DELAY);

    debounced();
    debounced.cancel();
    vi.advanceTimersByTime(DELAY);

    expect(fn).not.toHaveBeenCalled();
  });
});
