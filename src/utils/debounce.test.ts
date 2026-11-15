import { debounce } from './debounce.js';

const DELAY = 300;

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not call fn synchronously', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, DELAY);

    debounced();

    expect(fn).not.toHaveBeenCalled();
  });

  it('does not call fn before the delay has passed', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, DELAY);

    debounced();
    vi.advanceTimersByTime(DELAY - 1);

    expect(fn).not.toHaveBeenCalled();
  });

  it('calls fn exactly once after the delay', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, DELAY);

    debounced();
    vi.advanceTimersByTime(DELAY);

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

  it('calls fn again for calls separated by more than the delay', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, DELAY);

    debounced('fr');
    vi.advanceTimersByTime(DELAY);
    debounced('france');
    vi.advanceTimersByTime(DELAY);

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(1, 'fr');
    expect(fn).toHaveBeenNthCalledWith(2, 'france');
  });

  it('passes all arguments through unchanged', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, DELAY);
    const payload = { query: 'peru' };

    debounced(payload, 42);
    vi.advanceTimersByTime(DELAY);

    expect(fn).toHaveBeenCalledWith(payload, 42);
  });

  it('cancel() drops the pending call', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, DELAY);

    debounced();
    debounced.cancel();
    vi.advanceTimersByTime(DELAY * 2);

    expect(fn).not.toHaveBeenCalled();
  });

  it('keeps working after cancel()', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, DELAY);

    debounced('a');
    debounced.cancel();
    debounced('b');
    vi.advanceTimersByTime(DELAY);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('b');
  });

  it('keeps separate timers for separate debounced functions', () => {
    const first = vi.fn();
    const second = vi.fn();
    const debouncedFirst = debounce(first, DELAY);
    const debouncedSecond = debounce(second, DELAY);

    debouncedFirst();
    vi.advanceTimersByTime(DELAY - 1);
    debouncedSecond();
    vi.advanceTimersByTime(1);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });
});
