import { describe, expect, it, beforeEach } from 'vitest';
import { isActionTarget, isElement, isHtmlElement, isInput, isFrame, valuePrototypeOf } from './realm.js';

/**
 * The bug these guard: `instanceof` compares against ONE realm's constructor, so an element inside a
 * same-origin iframe failed every type test in the codebase. Measured symptoms: `query` found the
 * frame's button and `act` then rejected it as "not an HTMLElement", and the DOM observer skipped the
 * frame's mutations entirely because `record.target instanceof Element` was false.
 *
 * jsdom gives a real second realm through an iframe's contentWindow, so this is the actual condition,
 * not a mock of it.
 */
function frameRealm(): Document {
  const frame = document.createElement('iframe');
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (null === doc) throw new Error('jsdom did not provide a frame document');
  return doc;
}

describe('cross-realm type tests', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('accepts elements from the top realm exactly like instanceof', () => {
    const button = document.createElement('button');
    expect(isElement(button)).toBe(true);
    expect(isHtmlElement(button)).toBe(true);
    expect(isInput(button)).toBe(false);
    expect(isInput(document.createElement('input'))).toBe(true);
    expect(isFrame(document.createElement('iframe'))).toBe(true);
  });

  it('accepts an element from a FRAME realm, where instanceof says no', () => {
    const doc = frameRealm();
    const button = doc.createElement('button');
    // The precondition — if this ever becomes true, the helpers are no longer needed.
    expect(button instanceof HTMLElement).toBe(false);
    expect(isElement(button)).toBe(true);
    expect(isHtmlElement(button)).toBe(true);
  });

  it('discriminates subtypes inside a frame realm', () => {
    const doc = frameRealm();
    expect(isInput(doc.createElement('input'))).toBe(true);
    expect(isInput(doc.createElement('button'))).toBe(false);
  });

  it('rejects non-nodes without throwing', () => {
    for (const value of [null, undefined, 'button', 7, {}]) {
      expect(isElement(value)).toBe(false);
      expect(isHtmlElement(value)).toBe(false);
    }
  });

  it('resolves the value-setter prototype from the element own realm', () => {
    const doc = frameRealm();
    const input = doc.createElement('input');
    const proto = valuePrototypeOf(input);
    expect(proto).toBeDefined();
    // The frame's prototype, NOT the top realm's — writing through the wrong one misses React's
    // instance accessor and the value never lands.
    // Identity compared as a boolean: asserting on the prototype OBJECT makes the matcher walk a
    // jsdom prototype with `this`-bound getters and throw before it can compare anything.
    expect(proto === HTMLInputElement.prototype).toBe(false);
    expect(Object.getPrototypeOf(input) === proto).toBe(true);
  });

  it('uses the textarea prototype for a textarea', () => {
    const area = document.createElement('textarea');
    expect(valuePrototypeOf(area) === HTMLTextAreaElement.prototype).toBe(true);
  });
});

describe('isActionTarget cross-realm fallback (#1323)', () => {
  /**
   * Simulates the isolated-lease condition: a genuine HTML/SVG element whose
   * realm constructors are unreachable, so `instanceof HTMLElement` fails.
   * The namespace URI is realm-independent, so the fallback must accept it.
   */
  function leaseLikeElement(namespaceURI: string | null): unknown {
    return {
      nodeType: 1, // Node.ELEMENT_NODE
      namespaceURI,
      ownerDocument: null,
    };
  }

  it('accepts an HTML element when instanceof fails (lease condition)', () => {
    const el = leaseLikeElement('http://www.w3.org/1999/xhtml');
    // Precondition: the instanceof path really does fail for this shape.
    expect(isHtmlElement(el)).toBe(false);
    expect(isActionTarget(el)).toBe(true);
  });

  it('accepts an SVG element when instanceof fails (lease condition)', () => {
    const el = leaseLikeElement('http://www.w3.org/2000/svg');
    expect(isActionTarget(el)).toBe(true);
  });

  it('rejects non-HTML/SVG namespaces even when instanceof fails', () => {
    // MathML elements are Elements but not actionable targets.
    expect(isActionTarget(leaseLikeElement('http://www.w3.org/1998/Math/MathML'))).toBe(false);
    expect(isActionTarget(leaseLikeElement(null))).toBe(false);
  });

  it('rejects non-elements', () => {
    for (const value of [null, undefined, 'button', 7, { nodeType: 3 }]) {
      expect(isActionTarget(value)).toBe(false);
    }
  });

  it('still accepts real elements via the instanceof fast path', () => {
    expect(isActionTarget(document.createElement('button'))).toBe(true);
    expect(isActionTarget(document.createElementNS('http://www.w3.org/2000/svg', 'rect'))).toBe(true);
  });
});
