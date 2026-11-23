# Third-party notices

Files Format uses the following direct JavaScript dependencies. Their license texts are distributed with their respective packages; this summary does not replace those texts.

| Dependency | Version | License | Purpose |
|---|---:|---|---|
| pdf-lib | 1.17.1 | MIT | Create and modify PDF documents |
| pdfjs-dist | 6.5.438 | Apache-2.0 | Render PDF pages in the browser |
| JSZip | 3.10.2 | MIT OR GPL-3.0-or-later | Create ZIP downloads |
| Vite | 8.3.8 | MIT | Development server and static build |
| Playwright Test | 1.65.1 | Apache-2.0 | Browser end-to-end tests |
| axe-core | 4.14.1 | MPL-2.0 | Automated accessibility checks |

PDF.js support assets (CMaps, ICC profiles, image decoders, standard fonts and WASM files) are copied from the pinned `pdfjs-dist` package into the build. Its upstream `LICENSE` file and the license/notice files present in its asset directories are retained under `pdfjs/`.

This list covers direct dependencies only. npm also installs transitive dependencies, which retain their own licenses. The npm dependency tree should be reviewed before making a separate redistributable or commercial distribution. Versions above are pinned in `web/package.json`.

Official package repositories and license information:

- pdf-lib: https://github.com/Hopding/pdf-lib
- PDF.js: https://github.com/mozilla/pdf.js
- JSZip: https://github.com/Stuk/jszip
- Vite: https://github.com/vitejs/vite
- Playwright: https://github.com/microsoft/playwright
- axe-core: https://github.com/dequelabs/axe-core
