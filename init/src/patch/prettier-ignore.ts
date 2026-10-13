/**
 * Keep Reticle's local state out of the project's Prettier check.
 *
 * `reticle init` runs in the user's project, and every drive writes JSON under `.reticle/`
 * (impact.json, runs/, intent/). A project's `prettier --check .` fails on those files —
 * not just for missing trailing newlines, but because Prettier's JSON formatting differs from
 * `JSON.stringify` (e.g. short arrays stay on one line). The nested `.reticle/.gitignore` does
 * not help: Prettier only reads the ignore file of the directory it runs from.
 *
 * So when the project uses Prettier, `init` adds `.reticle/` to the project's `.prettierignore`.
 * This is the root-cause fix: it covers every file Reticle writes, present and future,
 * regardless of how each one is serialized.
 *
 * Idempotent: re-running `init` never duplicates the entry. Never removes anything the user
 * had — it only appends the one line when it is absent.
 */

export const PRETTIERIGNORE_PATH = '.prettierignore';

/** The entry `init` manages in the project's `.prettierignore`. */
export const RETICLE_IGNORE_ENTRY = '.reticle/';

/** Filenames that indicate the project uses Prettier. */
const PRETTIER_CONFIG_FILES = new Set([
  '.prettierrc',
  '.prettierrc.json',
  '.prettierrc.yml',
  '.prettierrc.yaml',
  '.prettierrc.json5',
  '.prettierrc.js',
  '.prettierrc.cjs',
  '.prettierrc.mjs',
  '.prettierrc.ts',
  'prettier.config.js',
  'prettier.config.cjs',
  'prettier.config.mjs',
  'prettier.config.ts',
]);

/**
 * True when the project uses Prettier: a Prettier config file exists at the root,
 * or package.json declares a "prettier" key.
 */
export function hasPrettierConfig(
  rootFiles: ReadonlySet<string>,
  packageJsonSource: string | null,
): boolean {
  for (const name of rootFiles) {
    if (PRETTIER_CONFIG_FILES.has(name)) return true;
  }
  if (packageJsonSource !== null) {
    try {
      const pkg: unknown = JSON.parse(packageJsonSource);
      if (
        'object' === typeof pkg &&
        pkg !== null &&
        'prettier' in pkg &&
        (pkg as Record<string, unknown>).prettier !== undefined
      ) {
        return true;
      }
    } catch {
      // An unparseable package.json is not our problem here; other steps report it.
    }
  }
  return false;
}

/**
 * True when the `.prettierignore` content already excludes `.reticle/`.
 *
 * Matches the entry with or without trailing slash, ignoring comments and blank lines —
 * a user who wrote `.reticle` by hand has already solved this; we must not add a duplicate.
 */
export function ignoresReticle(content: string): boolean {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => '' !== line && !line.startsWith('#'))
    .some((line) => '.reticle/' === line || '.reticle' === line);
}

const MANAGED_HEADER =
  "# Added by `reticle init`: Reticle's local state (.reticle/) must not break `prettier --check`.";

/**
 * The `.prettierignore` content after `init` ensures `.reticle/` is excluded.
 *
 * - No existing file: create one with the managed header and the entry.
 * - Existing file without the entry: append the entry (keeping a single blank line separator).
 * - Existing file with the entry: returned unchanged (caller treats this as ALREADY).
 */
export function withReticleIgnored(existing: string | null): string {
  if (null === existing) {
    return `${MANAGED_HEADER}\n${RETICLE_IGNORE_ENTRY}\n`;
  }
  if (ignoresReticle(existing)) return existing;
  const trimmed = existing.replace(/\n+$/, '');
  return `${trimmed}\n\n${MANAGED_HEADER}\n${RETICLE_IGNORE_ENTRY}\n`;
}
