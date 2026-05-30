export function extractJsonBlock(raw: string): unknown {
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = match ? match[1].trim() : raw.trim();
  try {
    return JSON.parse(jsonStr);
  } catch {
    throw new Error(`Failed to parse JSON from LLM response: ${jsonStr.slice(0, 80)}`);
  }
}
