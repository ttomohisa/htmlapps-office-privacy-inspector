# Third-Party Notices

Office Privacy Inspector v1.0.0 bundles no third-party runtime library code.

ZIP package inspection and decompression use browser-native APIs (`FileReader`, `Blob`, `DecompressionStream`, `DOMParser`, and related Web Platform APIs). System fonts are used directly.

The repository retains Browser Kitty template build scripts and GitHub Actions workflow references. Those workflows reference their respective GitHub-maintained actions under the terms published by those projects.

If a future release adds a dependency to `dependencies.json`, record its exact version, license, homepage, required redistribution notices, and matching lock entry here.


## Test-only tooling

The Node regression suite uses jsdom 26.1.0 (MIT, https://github.com/jsdom/jsdom), with exact transitive versions and integrity hashes in `tests/package-lock.json`. Dependency license notices are provided in the installed test packages. These packages are development tooling only and are not included in either standalone HTML artifact. Runtime dependencies remain unchanged.
