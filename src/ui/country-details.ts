import type { Country } from '../domain/country.js';
import { el, formatNumber } from './dom.js';

const listOrDash = (items: string[]): string => (items.length > 0 ? items.join(', ') : '—');

function renderRow(label: string, value: string): HTMLElement[] {
  return [el('dt', { text: label }), el('dd', { text: value })];
}

function renderContent(country: Country, onClose: () => void): HTMLElement {
  const closeButton = el('button', {
    className: 'details__close',
    text: '×',
    attrs: { type: 'button', 'aria-label': 'Close' },
  });
  closeButton.addEventListener('click', onClose);

  const flag = country.flag.imageUrl
    ? el('img', {
        className: 'details__flag',
        attrs: { src: country.flag.imageUrl, alt: country.flag.alt },
      })
    : el('span', { className: 'details__flag', text: country.flag.emoji });

  return el('article', { className: 'details' }, [
    closeButton,
    flag,
    el('h2', { className: 'details__title', text: country.name }),
    el('p', { className: 'details__description', text: country.description }),
    el('dl', { className: 'details__facts' }, [
      ...renderRow('Capital', country.capital ?? '—'),
      ...renderRow(
        'Region',
        [country.region, country.subregion].filter(Boolean).join(' · ') || '—',
      ),
      ...renderRow('Population', formatNumber(country.population)),
      ...renderRow('Area', country.area === null ? '—' : `${formatNumber(country.area)} km²`),
      ...renderRow('Borders', listOrDash(country.borders)),
      ...renderRow('Languages', listOrDash(country.languages)),
      ...renderRow('Currencies', listOrDash(country.currencies)),
    ]),
  ]);
}

/** Modal with country details, built on the native `<dialog>`. */
export function createDetailsDialog(): {
  element: HTMLDialogElement;
  open: (country: Country) => void;
} {
  const dialog = el('dialog', { className: 'details-dialog' });
  const close = (): void => {
    dialog.close();
  };

  // Click on the backdrop (outside the content) closes the dialog.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) close();
  });

  return {
    element: dialog,
    open: (country) => {
      dialog.replaceChildren(renderContent(country, close));
      dialog.showModal();
    },
  };
}
