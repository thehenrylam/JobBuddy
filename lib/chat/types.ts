export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatThread {
  postId: string;
  messages: ChatMessage[];
  lastModified: number;
}
