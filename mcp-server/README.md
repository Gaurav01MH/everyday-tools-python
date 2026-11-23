# Files Format MCP server

A stateless remote Model Context Protocol server for Files Format, built with the official MCP TypeScript server SDK v2 and Cloudflare's Agents MCP handler.

## Tools exposed

- `search_tools` — search the 27-tool catalogue.
- `list_tools` — list tools by category.
- `get_tool_info` — read a tool's description and direct browser link.
- `open_tool_in_browser` — return a link that opens the selected website tool.
- `run_text_tool` — run supported text/data operations on text explicitly supplied by the AI client.

The catalogue is imported from the website's single source of truth at `web/src/lib/tool-catalog.js`; it is not maintained as a second hard-coded list.

## File handling and privacy

PDF and image processing deliberately stays in the browser app. The MCP server does not accept file uploads, file URLs or file storage requests. Text sent to `run_text_tool` is processed by the Worker; the code does not save input to a database or file store. Cloudflare still receives the network request and may process standard request metadata under its service terms. Do not pass confidential content unless you accept that transfer.

The server is stateless, has no account access, no credentials and no write/delete actions. There is no application database.

## Free endpoint

Cloudflare's Workers Free plan includes a free `workers.dev` hostname. The Worker name in `wrangler.jsonc` is `files-format-mcp`. After deployment, the endpoint has this form:

`https://files-format-mcp.<your-workers-dev-subdomain>.workers.dev/mcp`

The health check uses the same hostname followed by `/health`. No paid custom domain is required. Cloudflare assigns the account subdomain; it cannot be pre-guessed or reserved by committing code.

## Deploy from a local terminal

Requirements: Node.js 22.12 or newer and a Cloudflare account.

```bash
cd mcp-server
npm install
npx wrangler login
npm test
npm run dev
```

The local MCP endpoint is `http://localhost:8787/mcp`. You can test it with MCP Inspector:

```bash
npx @modelcontextprotocol/inspector@latest
```

When ready to publish:

```bash
npm run deploy
```

Wrangler will prompt you to authenticate if you have not already. It then publishes to the `workers.dev` subdomain enabled in your Cloudflare account.

## Deploy through Cloudflare Git integration

1. Create or sign in to a Cloudflare account.
2. Open **Workers & Pages** and connect this GitHub repository.
3. Set the root directory to `mcp-server`.
4. Keep the Worker name `files-format-mcp`.
5. Use `npm install` as the install command and `npm run deploy` as the deploy command.
6. Deploy and copy the assigned `workers.dev` URL.

## Free-tier constraints

Cloudflare Workers Free currently includes 100,000 requests per day and 10 ms CPU time per invocation. Text inputs are therefore limited to 32,000 characters per field. PDF and image tasks remain local in the web app. Check Cloudflare's current limits before relying on the service for higher-volume use.

## Local tests

Run `npm test` from this directory. The tests check all 27 catalogue entries against the website and validate the text/data operations.
