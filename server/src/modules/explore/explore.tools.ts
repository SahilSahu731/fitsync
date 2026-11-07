/** Calculator content shares the existing resource store. Reserved tags keep it
 * separate from articles without changing the deployed database constraint. */
export const TOOL_TAG = "fitsync:tool";
export const TOOL_TAG_FILTER = '{"fitsync:tool"}';
type StoredResource = { id?: string; updated_at?: string; slug: string; title: string; summary: string; cover_url: string | null; featured_rank: number | null; published: boolean; tags?: string[]; body?: { heading: string; paragraphs: string[] }[] };
type ToolContent = { slug: string; title: string; summary: string; cover_url: string | null; featured_rank: number | null; published: boolean; calculator_key: string; explanation: string; example: string };
export function storeTool(tool: ToolContent) {
  const { calculator_key, explanation, example, ...common } = tool;
  return { ...common, kind: "guide", duration_minutes: 1, tags: [TOOL_TAG, `calculator:${calculator_key}`], steps: [], body: [
    { heading: "How it works", paragraphs: [explanation] },
    { heading: "Worked example", paragraphs: [example] },
  ] };
}
export function readTool(row: StoredResource) {
  const { tags, body, ...common } = row;
  return { ...common, calculator_key: tags?.find(tag => tag.startsWith("calculator:"))?.slice(11) ?? "", explanation: body?.[0]?.paragraphs.join("\n\n") ?? "", example: body?.[1]?.paragraphs.join("\n\n") ?? "" };
}
