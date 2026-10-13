/**
 * Detecting whether a project uses Prettier — config file or package.json "prettier" key.
 */

import { describe, expect, it } from 'vitest';
import { hasPrettierConfig } from './prettier-config.js';

describe('detecting Prettier usage', () => {
  it('finds a .prettierrc config file', () => {
    expect(hasPrettierConfig(new Set(['.prettierrc', 'package.json']), null)).toBe(true);
  });

  it('finds a prettier.config.js file', () => {
    expect(hasPrettierConfig(new Set(['prettier.config.js']), null)).toBe(true);
  });

  it('finds the "prettier" key in package.json', () => {
    expect(
      hasPrettierConfig(new Set(['package.json']), JSON.stringify({ prettier: { semi: false } })),
    ).toBe(true);
  });

  it('is false when nothing indicates Prettier', () => {
    expect(hasPrettierConfig(new Set(['package.json', 'tsconfig.json']), null)).toBe(false);
    expect(hasPrettierConfig(new Set(['package.json']), JSON.stringify({ scripts: {} }))).toBe(
      false,
    );
  });

  it('does not crash on an unparseable package.json', () => {
    expect(hasPrettierConfig(new Set(['package.json']), '{not json')).toBe(false);
  });
});
