# Files Format MCP connector

This is the optional remote Model Context Protocol server for Files Format. The public website is intended to use the free Cloudflare Pages hostname:

https://too-broke-for-a-custom-domain.pages.dev/

The MCP Worker is a separate deployment. Its configured project name is too-broke-for-a-custom-domain-mcp; Cloudflare assigns the account-specific part of its workers.dev hostname.

## Tools exposed

- search_tools, list_tools, get_tool_info and open_tool_in_browser discover and link to the 29 website tools.
- run_text_tool runs supported text/data operations on text explicitly supplied by the AI client.
- generate_qr_code returns a link to QR Tool with text in the URL fragment. The visitor opens the Pages site, completes Turnstile and creates the temporary share URL; QR Tool generates a QR for that URL.

The tool catalogue is imported from the website's single source of truth at web/src/lib/tool-catalog.js.

## Privacy

The MCP service does not accept file bytes, file URLs or R2 storage actions. It cannot bypass the Pages site's Turnstile check. Link Tool and QR Tool upload only when the visitor explicitly starts the share action in the website. Pasted text sent to run_text_tool is processed by the Worker; do not send confidential material.

## Deploy the website first

Follow web/DEPLOY-CLOUDFLARE.md to create the Pages project, claim the too-broke-for-a-custom-domain.pages.dev hostname, bind R2, configure Turnstile and set the seven-day lifecycle rule.

## Deploy the MCP Worker

1. Sign in to the same Cloudflare account.
2. Create a Workers project from this Git repository, using the repository root as the root directory.
3. Use this build command:

   npm --prefix web install --no-audit --no-fund && PUBLIC_BASE_PATH=/ PUBLIC_SITE_ORIGIN=https://too-broke-for-a-custom-domain.pages.dev npm --prefix web run build && npm --prefix mcp-server install --no-audit --no-fund

4. Use this deploy command:

   cd mcp-server && npx wrangler deploy

5. Keep the Worker name too-broke-for-a-custom-domain-mcp.

The Worker has a free workers.dev hostname. It can serve a static mirror of the site and the MCP protocol at /mcp; the preferred website address remains the separate Pages hostname.

## Local development

From the repository root:

   npm --prefix web install
   PUBLIC_BASE_PATH=/ PUBLIC_SITE_ORIGIN=https://too-broke-for-a-custom-domain.pages.dev npm --prefix web run build
   npm --prefix mcp-server install
   npm --prefix mcp-server test
   cd mcp-server
   npx wrangler dev

## Service limits

The Pages share tools cap each upload at 10 MB, 300 active objects and 3 GB active storage. Links expire after seven days; R2 lifecycle cleanup removes the objects. Cloudflare free allowances are finite and may change; usage above free allowances may be billed.
