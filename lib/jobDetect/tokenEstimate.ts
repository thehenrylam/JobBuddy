export const TOKEN_MAX = 128_000;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
