/** Minimal helpers for building DOM trees without HTML strings (and thus without escaping bugs). */

export type Child = Node | string | number;

/**
 * Creates an element with attributes and children.
 *
 * @example el("td", { class: "text-end" }, "42")
 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Readonly<Record<string, string>> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
  element.append(...children.map(toNode));
  return element;
}

/** Creates a document fragment from the children. */
export function fragment(...children: Child[]): DocumentFragment {
  const result = document.createDocumentFragment();
  result.append(...children.map(toNode));
  return result;
}

/** Returns the element with the given id or throws if the page markup is broken. */
export function byId<T extends HTMLElement>(id: string, type: new () => T): T {
  const element = document.getElementById(id);
  if (!(element instanceof type)) {
    throw new Error(`Missing element #${id} of type ${type.name}`);
  }
  return element;
}

function toNode(child: Child): Node {
  return child instanceof Node ? child : document.createTextNode(String(child));
}
