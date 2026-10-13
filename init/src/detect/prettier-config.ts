/**
 * Detecting whether a project uses Prettier.
 *
 * Lives in `detect/` (not `patch/`) because `patch/` already imports from `detect/` —
 * the reverse import would create a `detect <-> patch` cycle that
 * `directory-reach.test.ts` forbids. Detection belongs here anyway.
 */

/** Filenames that indicate the project uses Prettier. */
export const PRETTIER_CONFIG_FILES = new Set([
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
