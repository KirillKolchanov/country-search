import type { SearchState } from '../app/search-controller.js';
import type { Country } from '../domain/country.js';
import { renderCountryCard } from './country-card.js';
import { el } from './dom.js';

export interface StateHandlers {
  onRetry: () => void;
  onOpenCountry: (country: Country) => void;
}

function renderLoading(): HTMLElement {
  return el('div', { className: 'status status--loading', attrs: { role: 'status' } }, [
    el('span', { className: 'spinner', attrs: { 'aria-hidden': 'true' } }),
    el('span', { text: 'Searching…' }),
  ]);
}

function renderEmpty(query: string): HTMLElement {
  return el('div', { className: 'status status--empty', attrs: { role: 'status' } }, [
    el('span', { className: 'status__icon', text: '🔍', attrs: { 'aria-hidden': 'true' } }),
    el('span', { text: `Nothing found for “${query}”. Try another name.` }),
  ]);
}

function renderError(message: string, onRetry: () => void): HTMLElement {
  const retryButton = el('button', {
    className: 'button',
    text: 'Retry',
    attrs: { type: 'button' },
  });
  retryButton.addEventListener('click', onRetry);

  return el('div', { className: 'status status--error', attrs: { role: 'alert' } }, [
    el('span', { text: message }),
    retryButton,
  ]);
}

function renderResults(countries: Country[], onOpen: (country: Country) => void): HTMLElement {
  return el(
    'ul',
    { className: 'cards' },
    countries.map((country) => renderCountryCard(country, onOpen)),
  );
}

/** Replaces the content of `container` with the view of `state`. */
export function renderState(
  container: HTMLElement,
  state: SearchState,
  handlers: StateHandlers,
): void {
  switch (state.status) {
    case 'idle':
      container.replaceChildren();
      return;
    case 'loading':
      container.replaceChildren(renderLoading());
      return;
    case 'empty':
      container.replaceChildren(renderEmpty(state.query));
      return;
    case 'error':
      container.replaceChildren(renderError(state.message, handlers.onRetry));
      return;
    case 'results':
      container.replaceChildren(renderResults(state.countries, handlers.onOpenCountry));
      return;
  }
}
