import type { Country } from '../domain/country.js';
import { el, formatNumber } from './dom.js';

function renderFlag(country: Country): HTMLElement {
  if (country.flag.imageUrl) {
    return el('img', {
      className: 'card__flag',
      attrs: { src: country.flag.imageUrl, alt: country.flag.alt, loading: 'lazy' },
    });
  }
  return el('span', { className: 'card__flag card__flag--emoji', text: country.flag.emoji });
}

// A <button> may contain only phrasing content, so the card is built from spans.
function renderFact(label: string, value: string): HTMLElement {
  return el('span', { className: 'fact' }, [
    el('span', { className: 'fact__label', text: `${label}:` }),
    el('span', { text: value }),
  ]);
}

export function renderCountryCard(
  country: Country,
  onOpen: (country: Country) => void,
): HTMLElement {
  const card = el('button', { className: 'card', attrs: { type: 'button' } }, [
    renderFlag(country),
    el('span', { className: 'card__title', text: country.name }),
    el('span', { className: 'card__facts' }, [
      renderFact('Capital', country.capital ?? '—'),
      renderFact('Region', country.region ?? '—'),
      renderFact('Population', formatNumber(country.population)),
    ]),
  ]);
  card.addEventListener('click', () => {
    onOpen(country);
  });
  return el('li', {}, [card]);
}
