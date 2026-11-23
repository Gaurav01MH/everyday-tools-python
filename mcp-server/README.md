# Files Format — free website + MCP server

A stateless remote Model Context Protocol server for Files Format. Cloudflare Workers serves the website and MCP endpoint from **one free `workers.dev` hostname**.

## Tools exposed

- `search_tools`, `list_tools`, `get_tool_info` and `open_tool_in_browser` for the 27 website utilities.
- `run_text_tool` for supported text/data operations on text explicitly supplied by the AI client.

The catalogue is imported from the website's single source of truth at `web/src/lib/tool-catalog.js`.

## Privacy and file handling

PDF and image processing stays in the browser. The MCP server does not accept files, file URLs or file-storage actions. Text sent to `run_text_tool` is processed by the Worker; the code does not persist it in a database or file store. Cloudflare receives the network request and may process request metadata under its service terms. Do not send confidential content unless you accept that transfer.

The server is stateless, has no account access, no credentials, no database and no write/delete actions.

## Free hostname

Cloudflare Workers Free includes a `workers.dev` hostname. After deployment, the same Worker serves:

- Website: `https://files-format-mcp.<your-workers-dev-subdomain>.workers.dev/`
- MCP endpoint: `https://files-format-mcp.<your-workers-dev-subdomain>.workers.dev/mcp`
- Health: `https://files-format-mcp.<your-workers-dev-subdomain>.workers.dev/health`

No paid custom domain is required. Cloudflare assigns the account subdomain. GitHub Pages remains available as a fallback.

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

6. Keep the Worker name `files-format-mcp`.
7. After first deploy, set build environment variables `PUBLIC_SITE_ORIGIN` to the assigned origin (for example `https://files-format-mcp.your-subdomain.workers.dev`) and `PUBLIC_BASE_PATH` to `/`, then redeploy. This aligns canonical URLs and the sitemap with the new hostname.

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

Cloudflare Workers Free currently includes 100,000 requests/day and 10 ms CPU per invocation. Remote text fields are limited to 32,000 characters. PDF/image tasks remain browser-local; confirm current Cloudflare limits if you expect higher traffic.
