import React, {
  useState, useEffect, useRef, useCallback,
  forwardRef, useImperativeHandle,
} from 'react';
import { getChatThread, appendMessage, purgeOldThreads } from '../../services/chatHistory';
import { callLLMChat } from '../../services/llm';
import { getResumeFile, getUserPromptFile } from '../../services/aboutUser';
import { getSavedPosts } from '../../services/savedPosts';
import { extractText } from '../../services/fileExtract';
import type { ChatMessage } from '../../lib/chat/types';
import type { FitAnalysis } from '../../lib/jobPost/types';

export interface ChatPanelHandle {
  injectFitResult(postId: string, analysis: FitAnalysis): Promise<void>;
}

const QUICK_REPLIES: { label: string; text: string }[] = [
  { label: 'Provide Resume Feedback', text: 'List 10 improvements for my resume for this role' },
  { label: 'Interview Q/A Guidance', text: 'Guide me through on 3 most difficult interview questions for this role' },
  { label: 'Draft Cover Letter', text: 'Draft a cover letter for this role' },
];

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatFitAnalysis(analysis: FitAnalysis): string {
  const parts = [
    `**Resume Score:** ${analysis.score}`,
    '',
    `**Comment:** ${analysis.comment}`,
  ];
  if (analysis.alert.length > 0) {
    parts.push('', `**⚠ Alerts:**`);
    analysis.alert.forEach((a) => parts.push(`• ${a}`));
  }
  return parts.join('\n');
}

function renderContent(content: string): React.ReactNode {
  const lines = content.split('\n');
  return lines.map((line, i) => {
    const boldLine = line.replace(/\*\*(.*?)\*\*/g, (_, t) => `<strong>${t}</strong>`);
    return (
      <span key={i}>
        {i > 0 && <br />}
        <span dangerouslySetInnerHTML={{ __html: boldLine }} />
      </span>
    );
  });
}

function ChevronIcon({ up }: { up: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={2.5} stroke="currentColor" width={12} height={12}
      style={{ transform: up ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={2} stroke="currentColor" width={14} height={14}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.8} stroke="currentColor" width={15} height={15}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.8} stroke="currentColor" width={13} height={13}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
    </svg>
  );
}

const ChatPanel = forwardRef<ChatPanelHandle, { postId: string | null }>(({ postId }, ref) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [attachment, setAttachment] = useState<{ name: string; content: string } | null>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load thread whenever postId changes
  useEffect(() => {
    setMessages([]);
    setHasUnread(false);
    if (!postId) return;

    purgeOldThreads().catch(console.error);

    getChatThread(postId).then((thread) => {
      setMessages(thread?.messages ?? []);
    }).catch(console.error);
  }, [postId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (isExpanded && historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [messages, isExpanded]);

  // Clear unread dot when expanding
  useEffect(() => {
    if (isExpanded) setHasUnread(false);
  }, [isExpanded]);

  useImperativeHandle(ref, () => ({
    async injectFitResult(targetPostId: string, analysis: FitAnalysis) {
      const content = formatFitAnalysis(analysis);
      const msg: ChatMessage = { role: 'assistant', content, timestamp: Date.now() };
      await appendMessage(targetPostId, msg);
      if (targetPostId === postId) {
        setMessages((prev) => [...prev, msg]);
        if (!isExpanded) setHasUnread(true);
      }
    },
  }));

  const buildSystemPrompt = useCallback(async (): Promise<string> => {
    const [resume, userPrompt, posts] = await Promise.all([
      getResumeFile(),
      getUserPromptFile(),
      getSavedPosts(),
    ]);
    const post = postId ? posts.find((p) => p.id === postId) : null;

    const parts: string[] = [
      'You are a helpful AI to help the user with the job application process. Represent the user\'s best interests and answer any questions the applicant may have. Use the resume as a reference, and the user prompt for further information about who the user is and their preferences.',
    ];
    if (resume?.text) parts.push(`\n=== RESUME ===\n${resume.text}`);
    if (userPrompt?.content) parts.push(`\n=== USER PROMPT ===\n${userPrompt.content}`);
    if (post) parts.push(`\n=== JOB POSTING ===\n${post.post_data}`);
    return parts.join('\n');
  }, [postId]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() && !attachment) return;
    if (isGenerating || !postId) return;

    let content = text.trim();
    if (attachment) {
      content += `\n\n[Attached: ${attachment.name}]\n${attachment.content}`;
    }

    const userMsg: ChatMessage = { role: 'user', content, timestamp: Date.now() };
    await appendMessage(postId, userMsg);
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setAttachment(null);
    setIsGenerating(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const systemPrompt = await buildSystemPrompt();
      const raw = await callLLMChat({
        systemPrompt,
        messages: nextMessages.map(({ role, content: c }) => ({ role, content: c })),
        signal: ctrl.signal,
      });
      const aiMsg: ChatMessage = { role: 'assistant', content: raw.trim(), timestamp: Date.now() };
      await appendMessage(postId, aiMsg);
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const errMsg: ChatMessage = {
        role: 'assistant',
        content: `⚠ Error: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: Date.now(),
      };
      await appendMessage(postId, errMsg);
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      abortRef.current = null;
      setIsGenerating(false);
    }
  }, [attachment, buildSystemPrompt, isGenerating, messages, postId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const content = await extractText(file);
      setAttachment({ name: file.name, content });
    } catch {
      setAttachment({ name: file.name, content: '' });
    }
  };

  const disabled = !postId || isGenerating;

  return (
    <div style={styles.root}>
      {/* Header bar — always visible */}
      <div
        style={styles.header}
        onClick={() => setIsExpanded((v) => !v)}
      >
        <span style={styles.headerLeft}>
          <ChatIcon />
          <span style={styles.headerLabel}>Chat</span>
          {hasUnread && <span style={styles.unreadDot} />}
        </span>
        <ChevronIcon up={isExpanded} />
      </div>

      {isExpanded && (
        <>
          {/* Chat history */}
          <div ref={historyRef} style={styles.history}>
            {!postId ? (
              <p style={styles.emptyHint}>Select a job posting to start chatting</p>
            ) : messages.length === 0 ? (
              <div style={styles.disclaimer}>
                <p style={styles.disclaimerLine}>⚠ Conversations expire after 24 hours</p>
                <p style={styles.disclaimerLine}>🔒 Do not share passwords or sensitive information in this chat</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} style={msg.role === 'assistant' ? styles.bubbleRowAi : styles.bubbleRowUser}>
                  <div style={msg.role === 'assistant' ? styles.bubbleAi : styles.bubbleUser}>
                    <span style={styles.bubbleText}>{renderContent(msg.content)}</span>
                  </div>
                  <span style={msg.role === 'assistant' ? styles.tsAi : styles.tsUser}>
                    {formatTimestamp(msg.timestamp)}
                  </span>
                </div>
              ))
            )}
            {isGenerating && (
              <div style={styles.bubbleRowAi}>
                <div style={{ ...styles.bubbleAi, ...styles.typingBubble }}>
                  <span style={styles.typingDot} /><span style={styles.typingDot} /><span style={styles.typingDot} />
                </div>
              </div>
            )}
          </div>

          {/* Quick replies */}
          <div style={styles.quickRow}>
            {QUICK_REPLIES.map((qr) => (
              <button
                key={qr.label}
                style={styles.quickBtn}
                disabled={disabled}
                onClick={() => sendMessage(qr.text)}
              >
                {qr.label}
              </button>
            ))}
          </div>

          {/* Attachment chip */}
          {attachment && (
            <div style={styles.attachChip}>
              <span style={styles.attachName}>📎 {attachment.name}</span>
              <button style={styles.attachRemove} onClick={() => setAttachment(null)}>✕</button>
            </div>
          )}

          {/* Input row */}
          <div style={styles.inputRow}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <button
              style={styles.clipBtn}
              disabled={disabled}
              onClick={() => fileInputRef.current?.click()}
              title="Attach a file"
            >
              <PaperclipIcon />
            </button>
            <textarea
              style={styles.textarea}
              placeholder={postId ? 'Message…' : 'Select a post first'}
              value={input}
              disabled={disabled}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <button
              style={{
                ...styles.sendBtn,
                opacity: disabled || (!input.trim() && !attachment) ? 0.4 : 1,
              }}
              disabled={disabled || (!input.trim() && !attachment)}
              onClick={() => sendMessage(input)}
              title="Send"
            >
              <SendIcon />
            </button>
          </div>
        </>
      )}
    </div>
  );
});

ChatPanel.displayName = 'ChatPanel';
export default ChatPanel;

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    boxSizing: 'border-box',
    borderBottom: '1px solid #e5e7eb',
    flexShrink: 0,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 10px',
    cursor: 'pointer',
    userSelect: 'none',
    background: '#f8fafc',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    color: '#475569',
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#475569',
    fontFamily: 'sans-serif',
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#2563eb',
    flexShrink: 0,
  },
  history: {
    maxHeight: 280,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: '8px 10px',
    background: '#ffffff',
    userSelect: 'text',
  },
  emptyHint: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'sans-serif',
    textAlign: 'center',
    margin: '12px 0',
  },
  disclaimer: {
    background: '#fefce8',
    border: '1px solid #fde68a',
    borderRadius: 6,
    padding: '8px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  disclaimerLine: {
    fontSize: 10,
    color: '#78350f',
    fontFamily: 'sans-serif',
    margin: 0,
  },
  bubbleRowAi: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 2,
  },
  bubbleRowUser: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 2,
  },
  bubbleAi: {
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '10px 10px 10px 2px',
    padding: '6px 10px',
    maxWidth: '88%',
    color: '#111827',
  },
  bubbleUser: {
    background: '#2563eb',
    borderRadius: '10px 10px 2px 10px',
    padding: '6px 10px',
    maxWidth: '88%',
    color: '#ffffff',
  },
  bubbleText: {
    fontSize: 11,
    fontFamily: 'sans-serif',
    lineHeight: 1.5,
    wordBreak: 'break-word' as const,
  },
  tsAi: {
    fontSize: 9,
    color: '#9ca3af',
    fontFamily: 'sans-serif',
    paddingLeft: 4,
  },
  tsUser: {
    fontSize: 9,
    color: '#9ca3af',
    fontFamily: 'sans-serif',
    paddingRight: 4,
  },
  typingBubble: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '8px 12px',
  },
  typingDot: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: '#93c5fd',
    display: 'inline-block',
    animation: 'jb-typing-dot 1.2s ease-in-out infinite',
  },
  quickRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    padding: '6px 10px 4px',
    borderTop: '1px solid #f1f5f9',
  },
  quickBtn: {
    fontSize: 10,
    fontFamily: 'sans-serif',
    fontWeight: 500,
    color: '#2563eb',
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: 5,
    padding: '4px 8px',
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'filter 0.1s ease',
  },
  attachChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    margin: '0 10px 4px',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 5,
    padding: '3px 8px',
  },
  attachName: {
    fontSize: 10,
    color: '#166534',
    fontFamily: 'sans-serif',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  attachRemove: {
    fontSize: 10,
    color: '#6b7280',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0 2px',
    flexShrink: 0,
  },
  inputRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 5,
    padding: '4px 8px 6px',
    borderTop: '1px solid #f1f5f9',
  },
  clipBtn: {
    width: 26,
    height: 26,
    flexShrink: 0,
    background: 'none',
    border: '1px solid #e5e7eb',
    borderRadius: 5,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6b7280',
    padding: 0,
  },
  textarea: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'sans-serif',
    color: '#374151',
    background: '#f8fafc',
    border: '1px solid #e5e7eb',
    borderRadius: 5,
    padding: '5px 8px',
    resize: 'none' as const,
    outline: 'none',
    lineHeight: 1.4,
    minHeight: 26,
    maxHeight: 80,
    overflowY: 'auto',
    boxSizing: 'border-box' as const,
  },
  sendBtn: {
    width: 26,
    height: 26,
    flexShrink: 0,
    background: '#2563eb',
    border: 'none',
    borderRadius: 5,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    padding: 0,
    transition: 'opacity 0.1s ease',
  },
};
