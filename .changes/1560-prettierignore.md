### Fixed

- **`reticle init` adds `.reticle/` to the project's `.prettierignore` when the project uses Prettier.** After a drive, `prettier --check .` failed on the JSON files Reticle writes under `.reticle/` — the nested `.reticle/.gitignore` does not help, because Prettier only reads the ignore file of the directory it runs from. `init` now excludes the directory outright, so a project's formatter check stays green. Closes [#1560](https://github.com/reticlehq/reticle/issues/1560).
