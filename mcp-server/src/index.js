import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { z } from "zod";
import { TOOL_CATALOG, findTool, searchTools } from "./catalog.js";
import { runTextTool } from "./text-tools.js";

const DEFAULT_SITE_URL = "https://too-broke-for-a-custom-domain.pages.dev";
const TEXT_OPERATIONS = [
  "stats", "upper", "lower", "title", "sentence", "clean", "unique",
  "json-format", "json-validate", "csv-json", "json-csv",
  "url-encode", "url-decode", "base64-encode", "base64-decode",
  "percent-of", "percent-change", "unit-convert", "link-make"
];

function textResult(text) {
  return { content: [{ type: "text", text }] };
}

function createFilesFormatServer({ requestInfo } = {}) {
  const SITE_URL = DEFAULT_SITE_URL;
  const server = new McpServer({
    name: "files-format",
    version: "1.0.0"
  });

  server.registerTool(
    "search_tools",
    {
      title: "Search Files Format tools",
      description: "Find a PDF, image, text or data utility by describing the task. This searches tool descriptions only and does not upload or process files.",
      inputSchema: {
        query: z.string().min(1).max(120),
        category: z.enum(["pdf", "images", "text"]).optional()
      }
    },
    async ({ query, category }) => {
      const matches = searchTools(query, category).map((tool) => ({
        name: tool.name,
        slug: tool.slug,
        category: tool.category,
        description: tool.description,
        url: SITE_URL + "/?tool=" + encodeURIComponent(tool.slug) + "#workspace"
      }));
      return textResult(JSON.stringify({ count: matches.length, tools: matches }, null, 2));
    }
  );

  server.registerTool(
    "list_tools",
    {
      title: "List Files Format tools",
      description: "List the 29 available Files Format utilities, optionally filtered by category: pdf, images or text.",
      inputSchema: {
        category: z.enum(["pdf", "images", "text"]).optional()
      }
    },
    async ({ category }) => {
      const tools = TOOL_CATALOG.filter((tool) => !category || tool.category === category);
      return textResult(JSON.stringify({ count: tools.length, tools }, null, 2));
    }
  );

  server.registerTool(
    "get_tool_info",
    {
      title: "Get Files Format tool details",
      description: "Get the purpose, category and direct browser link for a Files Format utility.",
      inputSchema: { slug: z.string().min(1).max(80) }
    },
    async ({ slug }) => {
      const tool = findTool(slug);
      if (!tool) return textResult("No Files Format tool exists with slug: " + slug);

      const processing = tool.operation === "qr-tool"
        ? "QR image generation runs locally in the visitor's browser. The MCP server can return a prefilled page link but does not render or store QR images."
        : tool.category === "pdf" || tool.category === "images"
          ? "This file task runs locally in the visitor's browser. The MCP server does not receive the file."
          : "The website version runs locally in the browser. The MCP server also has a separate text/data action for client-supplied text.";

      return textResult(JSON.stringify({
        ...tool,
        url: SITE_URL + "/?tool=" + encodeURIComponent(tool.slug) + "#workspace",
        processing
      }, null, 2));
    }
  );

  server.registerTool(
    "open_tool_in_browser",
    {
      title: "Open a Files Format tool",
      description: "Return the direct Files Format page for a tool. PDF and image inputs are selected and processed in the browser, not uploaded to this server.",
      inputSchema: { slug: z.string().min(1).max(80) }
    },
    async ({ slug }) => {
      const tool = findTool(slug);
      if (!tool) return textResult("No Files Format tool exists with slug: " + slug);
      return textResult("Open " + tool.name + " in Files Format: " +
        SITE_URL + "/?tool=" + encodeURIComponent(tool.slug) + "#workspace");
    }
  );

  server.registerTool(
    "run_text_tool",
    {
      title: "Run a Files Format text or data tool",
      description: "Run one supported text/data transformation on text explicitly supplied by the AI client. Supports statistics, case conversion, line cleanup, JSON/CSV conversion, URL/Base64, percentage calculations, unit conversion and safe HTTP/HTTPS link markup. Each input field is limited to 32,000 characters. Text is sent to this remote Worker for processing; do not send confidential content. PDF and image files are not accepted.",
      inputSchema: {
        operation: z.enum(TEXT_OPERATIONS),
        input: z.string().max(32_000),
        extra: z.string().max(32_000).optional(),
        category: z.enum(["length", "weight", "time", "temperature"]).optional(),
        from: z.string().max(12).optional(),
        to: z.string().max(12).optional()
      }
    },
    async ({ operation, input, extra, category, from, to }) => {
      try {
        return textResult(runTextTool(operation, input, extra ?? "", { category, from, to }));
      } catch (error) {
        return {
          ...textResult(error instanceof Error ? error.message : "The text operation failed."),
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "generate_qr_code",
    {
      title: "Prepare a QR code in Files Format",
      description: "Create a direct link to the Files Format QR generator with short text or a URL prefilled. The QR graphic itself is generated in the visitor's browser and can be downloaded as PNG or SVG; this MCP server does not render or store images.",
      inputSchema: {
        text: z.string().min(1).max(1000)
      }
    },
    async ({ text }) => {
      const byteLength = new TextEncoder().encode(text).length;
      if (byteLength > 1000) {
        return { ...textResult("QR content must be 1,000 UTF-8 bytes or fewer."), isError: true };
      }
      const pageUrl = new URL(SITE_URL + "/");
      pageUrl.searchParams.set("tool", "qr-tool");
      pageUrl.hash = "workspace&share=" + encodeURIComponent(text);
      return textResult(JSON.stringify({
        message: "Open the prefilled QR Tool in Files Format, complete the security check, create the seven-day share link, and download its QR code.",
        url: pageUrl.href,
        textBytes: byteLength,
        processing: "The payload is in the URL fragment; the visitor explicitly starts the temporary upload after completing the security check."
      }, null, 2));
    }
  );

  return server;
}

// Each request gets a new, stateless MCP server instance.
const mcpHandler = createMcpHandler(createFilesFormatServer);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/health" && request.method === "GET") {
      return Response.json({
        service: "Files Format MCP",
        status: "ok",
        endpoint: "/mcp",
        mcpTools: 6,
        catalogueTools: TOOL_CATALOG.length,
        site: url.origin
      }, { headers: { "Cache-Control": "no-store" } });
    }

    if (url.pathname !== "/mcp") {
      return env.ASSETS.fetch(request);
    }

    if (!["GET", "POST", "OPTIONS"].includes(request.method)) {
      return new Response("Method not allowed", {
        status: 405,
        headers: { Allow: "GET, POST, OPTIONS" }
      });
    }

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 128_000) {
      return new Response("Request too large. Text arguments are limited to 32,000 characters.", { status: 413 });
    }

    return mcpHandler(request, env, ctx);
  }
};
