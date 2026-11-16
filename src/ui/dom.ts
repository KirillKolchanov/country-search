interface ElementOptions {
  className?: string;
  text?: string;
  attrs?: Record<string, string>;
}

/** Small `createElement` wrapper: text goes through `textContent`, never through HTML. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  { className, text, attrs = {} }: ElementOptions = {},
  children: Node[] = [],
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, value);
  element.append(...children);
  return element;
}

const numberFormat = new Intl.NumberFormat('en-US');

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}
