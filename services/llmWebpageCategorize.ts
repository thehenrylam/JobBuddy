import { callLLM } from './llm';

export async function llmWebpageCategorize(
  { signal, text }: { signal?: AbortSignal; text?: string } = {},
): Promise<void> {
  const pageContent = text ?? document.body.innerText;

  const result = await callLLM({
    prompt: 'Categorize the following webpage. Identify whether it is a job posting. If it is, extract the job title, company, and location.',
    data: pageContent,
    signal,
  });

  console.log('llmWebpageCategorize result:', result);
}
