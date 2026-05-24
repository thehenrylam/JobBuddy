import { callLLM } from './llm';

export async function llmWebpageCategorize(signal?: AbortSignal): Promise<void> {
  const pageContent = document.body.innerText;

  const result = await callLLM({
    prompt: 'Categorize the following webpage. Identify whether it is a job posting. If it is, extract the job title, company, and location.',
    data: pageContent,
    signal,
  });

  console.log('llmWebpageCategorize result:', result);
}
