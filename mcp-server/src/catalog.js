import { TOOL_CATALOG as SITE_TOOL_CATALOG } from "../../web/src/lib/tool-catalog.js";

export const TOOL_CATALOG = SITE_TOOL_CATALOG.map((tool) => ({
  slug: tool.slug,
  category: tool.mode,
  name: tool.name,
  title: tool.title,
  description: tool.description,
  operation: tool.operation
}));

export function findTool(slug) {
  return TOOL_CATALOG.find((tool) => tool.slug === slug) ?? null;
}

export function searchTools(query, category) {
  const needle = String(query ?? "").trim().toLocaleLowerCase();
  return TOOL_CATALOG.filter((tool) => {
    const categoryMatches = !category || tool.category === category;
    const searchable = [tool.slug, tool.name, tool.title, tool.description, tool.operation]
      .join(" ")
      .toLocaleLowerCase();
    return categoryMatches && (!needle || searchable.includes(needle));
  });
}
