# Files Format — free website + MCP server

A stateless remote Model Context Protocol server for Files Format. Cloudflare Workers serves the website and MCP endpoint from **one free `workers.dev` hostname**.

## Tools exposed

- `search_tools`, `list_tools`, `get_tool_info` and `open_tool_in_browser` for the website utilities.
- `run_text_tool` for supported text/data operations, including safe HTTP/HTTPS link markup.
- `generate_qr_code` to return a link that opens the browser QR generator with content prefilled; the QR image itself is generated locally in the browser.

The catalogue is imported from the website's single source of truth at `web/src/lib/tool-catalog.js`.

## Privacy and file handling

PDF and image processing stays in the browser. The MCP server does not accept files, file URLs or file-storage actions. Text sent to `run_text_tool` is processed by the Worker; the code does not persist it in a database or file store. Cloudflare receives the network request and may process request metadata under its service terms. Do not send confidential content unless you accept that transfer.

The server is stateless, has no account access, no credentials, no database and no write/delete actions.

## Free hostname

The Worker is configured with the free hostname slug:

`files-format-too-broke-for-a-custom-domain`

After deployment, Cloudflare combines that slug with the `workers.dev` account subdomain selected in your Cloudflare account. The final hostname will look like:

- Website: `https://files-format-too-broke-for-a-custom-domain.<your-account-subdomain>.workers.dev/`
- MCP endpoint: `https://files-format-too-broke-for-a-custom-domain.<your-account-subdomain>.workers.dev/mcp`
- Health: `https://files-format-too-broke-for-a-custom-domain.<your-account-subdomain>.workers.dev/health`

This uses a free platform-provided hostname; it does not require buying or connecting a custom domain. The account subdomain is selected separately in Cloudflare. GitHub Pages remains available as a fallback until the Worker is deployed.

## Deploy through Cloudflare Git integration

1. Create or sign in to Cloudflare.
2. Open **Workers & Pages → Create application → GitHub** and connect this repository.
3. Set the repository root directory to the repository root, not `mcp-server`.
4. Build command:

   ```bash
   npm --prefix web install --no-audit --no-fund && PUBLIC_BASE_PATH=/ npm --prefix web run build && npm --prefix mcp-server install --no-audit --no-fund
   ```

5. Deploy command:

   ```bash
   cd mcp-server && npx wrangler deploy
   ```

6. Keep the Worker name `files-format-too-broke-for-a-custom-domain`.
7. Deploy and copy the assigned `workers.dev` hostname. In the Cloudflare build environment variables, set `PUBLIC_SITE_ORIGIN` to that exact origin (for example, `https://files-format-too-broke-for-a-custom-domain.<your-account-subdomain>.workers.dev`) and `PUBLIC_BASE_PATH` to `/`, then redeploy. This aligns canonical URLs and the sitemap with the new hostname.

Wrangler serves static assets from `../web/dist`; the script runs first only for `/mcp*` and `/health`.

## Local development

```bash
cd web
npm install
PUBLIC_BASE_PATH=/ npm run build
cd ../mcp-server
npm install
npx wrangler login
npm test
npm run dev
```

The website is at `http://localhost:8787/`; MCP is at `http://localhost:8787/mcp`. Publish with `npm run deploy`.

## Free-tier constraints

The deployment uses the Cloudflare Workers Free plan. Review Cloudflare's current limits and terms before relying on it for high traffic or production workloads.
