import { createSearchController } from './app/search-controller.js';
import { createDetailsDialog } from './ui/country-details.js';
import { el } from './ui/dom.js';
import { renderState } from './ui/render-state.js';

function mountApp(root: HTMLElement): void {
  const input = el('input', {
    className: 'search__input',
    attrs: {
      type: 'search',
      id: 'search',
      placeholder: 'Start typing a country name, e.g. Spain',
      autocomplete: 'off',
      spellcheck: 'false',
    },
  });
  const output = el('section', { className: 'output', attrs: { 'aria-live': 'polite' } });
  const details = createDetailsDialog();

  const controller = createSearchController({
    onChange: (state) => {
      renderState(output, state, {
        onRetry: () => {
          controller.retry();
        },
        onOpenCountry: details.open,
      });
    },
  });

  input.addEventListener('input', () => {
    controller.setQuery(input.value);
  });

  root.append(
    el('main', { className: 'app' }, [
      el('h1', { className: 'app__title', text: 'Country Search' }),
      el('label', { className: 'search', attrs: { for: 'search' } }, [
        el('span', { className: 'visually-hidden', text: 'Country name' }),
        input,
      ]),
      output,
    ]),
    details.element,
  );
  input.focus();
}

mountApp(document.body);
