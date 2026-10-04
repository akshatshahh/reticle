/**
 * Cross-realm type tests.
 *
 * `instanceof` compares against ONE realm's constructor. An element inside a same-origin `<iframe>`
 * lives in that document's realm, so `frameButton instanceof HTMLElement` — evaluated with the top
 * window's `HTMLElement` — is FALSE for a perfectly ordinary button.
 *
 * That is not theoretical. Once `query` learned to descend into same-origin frames, it returned the
 * frame's button correctly and `act` then rejected the ref with "is not an HTMLElement": found, and
 * unusable. A find you cannot act on is worse than a miss, because it reads as a product bug in the
 * app rather than in the tool.
 *
 * These resolve the constructor from the NODE's own document instead, so an element is measured
 * against its own realm. Same-realm nodes behave exactly as `instanceof` did.
 */

interface Realm {
  readonly [name: string]: unknown;
}

/** The constructor named `name` in the realm that owns `node`, or undefined if there isn't one. */
function ctorIn(node: unknown, name: string): unknown {
  if (null === node || typeof node !== 'object') return undefined;
  // A Document owns itself; every other node reports an ownerDocument.
  const doc = (node as Node).ownerDocument ?? (node as Node);
  const view: unknown = (doc as Document).defaultView;
  if (null === view || view === undefined) return undefined;
  return (view as unknown as Realm)[name];
}

/**
 * `node instanceof <name>`, evaluated in the node's own realm.
 *
 * Falls back to the ambient constructor when the node has no view — a detached document, or a jsdom
 * fragment — so behaviour outside a browser is unchanged.
 */
function isIn<T>(node: unknown, name: string, ambient: unknown, tag?: string): node is T {
  const ctor = ctorIn(node, name) ?? ambient;
  if ('function' === typeof ctor && node instanceof (ctor as new () => unknown)) return true;
  // Cross-realm fallback (#1323): in isolated contexts (e.g., leased browser
  // tabs), the node's realm constructors can be unreachable, so instanceof
  // fails for genuine elements. The tagName is set by the DOM implementation
  // itself and is realm-independent.
  if (undefined !== tag && 'object' === typeof node && null !== node) {
    const el = node as Element;
    return 1 === el.nodeType /* Node.ELEMENT_NODE */ && el.tagName === tag;
  }
  return false;
}

export const isElement = (n: unknown): n is Element =>
  isIn<Element>(n, 'Element', 'undefined' === typeof Element ? undefined : Element);

export const isImage = (n: unknown): n is HTMLImageElement =>
  isIn<HTMLImageElement>(
    n,
    'HTMLImageElement',
    'undefined' === typeof HTMLImageElement ? undefined : HTMLImageElement,
    'IMG',
  );

export const isHtmlElement = (n: unknown): n is HTMLElement =>
  isIn<HTMLElement>(n, 'HTMLElement', 'undefined' === typeof HTMLElement ? undefined : HTMLElement);

export const isSvgElement = (n: unknown): n is SVGElement =>
  isIn<SVGElement>(n, 'SVGElement', 'undefined' === typeof SVGElement ? undefined : SVGElement);

/** What an action can drive: any HTML element, or an SVG shape (a chart slice, a map region, an icon). */
export type ActionTarget = HTMLElement | SVGElement;

/** Namespace URIs are realm-independent, unlike instanceof checks. */
const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

export const isActionTarget = (n: unknown): n is ActionTarget => {
  if (isHtmlElement(n) || isSvgElement(n)) return true;
  // Fallback for cross-realm edge cases: in isolated contexts (e.g., leased
  // browser tabs), the instanceof check can fail for genuine HTML/SVG
  // elements when the node's realm constructors are unreachable from the
  // adapter's realm. The namespace URI is set by the DOM implementation
  // itself, so it identifies HTML/SVG elements regardless of realm.
  // See https://github.com/reticlehq/reticle/issues/1323
  if (
    typeof n === 'object' &&
    n !== null &&
    (n as Node).nodeType === 1 /* Node.ELEMENT_NODE */
  ) {
    const ns = (n as Element).namespaceURI;
    return ns === HTML_NAMESPACE || ns === SVG_NAMESPACE;
  }
  return false;
};

export const isInput = (n: unknown): n is HTMLInputElement =>
  isIn<HTMLInputElement>(
    n,
    'HTMLInputElement',
    'undefined' === typeof HTMLInputElement ? undefined : HTMLInputElement,
    'INPUT',
  );

export const isTextArea = (n: unknown): n is HTMLTextAreaElement =>
  isIn<HTMLTextAreaElement>(
    n,
    'HTMLTextAreaElement',
    'undefined' === typeof HTMLTextAreaElement ? undefined : HTMLTextAreaElement,
    'TEXTAREA',
  );

export const isSelect = (n: unknown): n is HTMLSelectElement =>
  isIn<HTMLSelectElement>(
    n,
    'HTMLSelectElement',
    'undefined' === typeof HTMLSelectElement ? undefined : HTMLSelectElement,
    'SELECT',
  );

export const isButton = (n: unknown): n is HTMLButtonElement =>
  isIn<HTMLButtonElement>(
    n,
    'HTMLButtonElement',
    'undefined' === typeof HTMLButtonElement ? undefined : HTMLButtonElement,
    'BUTTON',
  );

export const isMeter = (n: unknown): n is HTMLMeterElement =>
  isIn<HTMLMeterElement>(
    n,
    'HTMLMeterElement',
    'undefined' === typeof HTMLMeterElement ? undefined : HTMLMeterElement,
    'METER',
  );

export const isOutput = (n: unknown): n is HTMLOutputElement =>
  isIn<HTMLOutputElement>(
    n,
    'HTMLOutputElement',
    'undefined' === typeof HTMLOutputElement ? undefined : HTMLOutputElement,
    'OUTPUT',
  );

export const isProgress = (n: unknown): n is HTMLProgressElement =>
  isIn<HTMLProgressElement>(
    n,
    'HTMLProgressElement',
    'undefined' === typeof HTMLProgressElement ? undefined : HTMLProgressElement,
    'PROGRESS',
  );

export const isForm = (n: unknown): n is HTMLFormElement =>
  isIn<HTMLFormElement>(
    n,
    'HTMLFormElement',
    'undefined' === typeof HTMLFormElement ? undefined : HTMLFormElement,
    'FORM',
  );

export const isFrame = (n: unknown): n is HTMLIFrameElement =>
  isIn<HTMLIFrameElement>(
    n,
    'HTMLIFrameElement',
    'undefined' === typeof HTMLIFrameElement ? undefined : HTMLIFrameElement,
    'IFRAME',
  );

/**
 * The prototype whose native value setter drives `el` — React and friends install their own accessor
 * on the instance, so a value write has to go through the prototype's. It must come from the
 * ELEMENT's realm for the same reason as above.
 */
export function valuePrototypeOf(el: Element): object | undefined {
  const name = isTextArea(el) ? 'HTMLTextAreaElement' : 'HTMLInputElement';
  const ctor = ctorIn(el, name);
  if (typeof ctor !== 'function') return undefined;
  const proto: unknown = (ctor as { prototype?: unknown }).prototype;
  return 'object' === typeof proto && proto !== null ? proto : undefined;
}
