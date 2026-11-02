import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  RotateCcw, 
  ArrowUpRight, 
  AlertCircle,
  Bot,
  Square,
  Copy,
  Check
} from 'lucide-react';
import api from '../../api/client';
import { useTour } from '../../tour';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggested_tab?: string | null;
}

interface AssistantChatWidgetProps {
  onNavigateTab: (tab: string) => void;
}

const SUGGESTION_CHIPS = [
  "How much did I spend this month?",
  "Which budgets am I close to exceeding?",
  "How are my savings goals progressing?",
  "Show my recent transactions"
];

const STORAGE_KEY = 'fintrack_assistant_messages';

export const AssistantChatWidget: React.FC<AssistantChatWidgetProps> = ({ onNavigateTab }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (m: any) => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant')
      );
    } catch {
      return [];
    }
  });
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const handleCopyMessage = async (id: string, text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedMessageId(id);
      setTimeout(() => {
        setCopiedMessageId((prev) => (prev === id ? null : prev));
      }, 2000);
    } catch (err) {
      console.error("Failed to copy message:", err);
    }
  };

  const { isTourActive } = useTour();

  // Close drawer when tour is active so the Ask AI button can be highlighted
  useEffect(() => {
    if (isTourActive) {
      setIsOpen(false);
    }
  }, [isTourActive]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync messages with sessionStorage (persists across refreshes, clears on tab close / logout)
  useEffect(() => {
    try {
      if (messages.length > 0) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.error("Failed to sync chat messages to sessionStorage:", e);
    }
  }, [messages]);

  // Click outside to close drawer & Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    // Use mousedown to capture outside click before other click events
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    setErrorText(null);
    setInputValue('');

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: text
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Send at most the last 10 messages to keep latency low, context clean, and stay well within limits
      const recentMessages = newMessages.slice(-10);
      const payload = {
        messages: recentMessages.map(m => ({
          role: m.role,
          content: typeof m.content === 'string' ? m.content : String(m.content || '')
        }))
      };

      const res = await api.post<{ reply: string; suggested_tab?: string | null }>(
        '/user/assistant/chat',
        payload,
        { signal: controller.signal }
      );

      const assistantMsg: ChatMessage = {
        id: `asst_${Date.now()}`,
        role: 'assistant',
        content: typeof res.data.reply === 'string' ? res.data.reply : String(res.data.reply || ''),
        suggested_tab: typeof res.data.suggested_tab === 'string' ? res.data.suggested_tab : null
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        // User voluntarily stopped generation
        return;
      }
      console.error("AI assistant request error:", err);

      let errorMsg = "The assistant is busy or having trouble retrieving data. Please try again.";

      if (err.response?.status === 429) {
        errorMsg = "FinTrack Assistant is receiving many requests right now. Please wait a moment and try again.";
      } else {
        const detail = err.response?.data?.detail;
        if (typeof detail === 'string') {
          errorMsg = detail;
        } else if (Array.isArray(detail)) {
          const parsed = detail
            .map((d: any) => d.msg || (typeof d === 'string' ? d : ''))
            .filter(Boolean);
          if (parsed.length > 0) {
            errorMsg = parsed.join('; ');
          }
        } else if (detail && typeof detail === 'object') {
          errorMsg = detail.message || JSON.stringify(detail);
        } else if (err.message && typeof err.message === 'string') {
          errorMsg = err.message;
        }
      }

      setErrorText(errorMsg);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      abortControllerRef.current = null;

      const canceledMsg: ChatMessage = {
        id: `asst_cancel_${Date.now()}`,
        role: 'assistant',
        content: '⏹ Response generation was stopped by user.'
      };
      setMessages(prev => [...prev, canceledMsg]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    sessionStorage.removeItem(STORAGE_KEY);
    setErrorText(null);
    setInputValue('');
  };

  return (
    <>
      {/* 1. Floating Chat Action Button (Bottom Right) */}
      {!isOpen && (
        <button
          onClick={() => {
            if (isTourActive) return;
            setIsOpen(true);
          }}
          aria-label="Open FinTrack AI Assistant"
          data-tour="ai-assistant-btn"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 18px',
            backgroundColor: 'var(--accent)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '999px',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            transform: 'scale(1)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <Sparkles size={18} />
          <span>Ask AI</span>
        </button>
      )}

      {/* 2. Slide-out Chat Panel Drawer */}
      {isOpen && (
        <div
          ref={drawerRef}
          role="dialog"
          aria-label="FinTrack AI Assistant"
          data-tour="ai-assistant-btn"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '440px',
            maxWidth: 'calc(100vw - 32px)',
            height: '630px',
            maxHeight: 'calc(100vh - 48px)',
            backgroundColor: 'var(--card)',
            borderRadius: '16px',
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.25), 0 0 0 1px var(--border)',
            zIndex: 1100,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'slideUpFade 0.2s ease-out'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--border)',
              backgroundColor: 'var(--navbar-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--light-accent)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bot size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--main-text)' }}>
                  FinTrack Assistant
                </div>
                <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 500 }}>
                  ● Read-Only AI Helper
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={handleNewChat}
                title="Start new conversation"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--secondary-text)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--main-text)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--secondary-text)')}
              >
                <RotateCcw size={14} />
                <span>New</span>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close chat"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--secondary-text)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--main-text)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--secondary-text)')}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              backgroundColor: 'var(--bg)',
            }}
          >
            {/* Empty State with Greeting & Suggestion Chips */}
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 8px 12px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--light-accent)',
                    color: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                  }}
                >
                  <Sparkles size={22} />
                </div>
                <h4 style={{ margin: '0 0 6px', fontSize: '15px', color: 'var(--main-text)', fontWeight: 600 }}>
                  Ask about your money
                </h4>
                <p style={{ margin: '0 0 20px', fontSize: '12.5px', color: 'var(--secondary-text)', lineHeight: 1.4 }}>
                  I analyze your real FinTrack income, expenses, budgets, and goals in plain language.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {SUGGESTION_CHIPS.map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(chip)}
                      style={{
                        textAlign: 'left',
                        padding: '10px 14px',
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        color: 'var(--main-text)',
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Conversation Bubbles */}
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '11px 15px',
                    borderRadius: m.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    backgroundColor: m.role === 'user' ? 'var(--accent)' : 'var(--card)',
                    color: m.role === 'user' ? '#FFFFFF' : 'var(--main-text)',
                    fontSize: '13px',
                    lineHeight: '1.45',
                    boxShadow: 'var(--shadow-sm)',
                    border: m.role === 'user' ? 'none' : '1px solid var(--border)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {typeof m.content === 'string' ? m.content : String(m.content ?? '')}
                </div>

                {/* Message Action Bar (ChatGPT / Claude style) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '4px',
                    padding: m.role === 'user' ? '0 4px 0 0' : '0 0 0 4px',
                  }}
                >
                  <button
                    onClick={() => handleCopyMessage(m.id, m.content)}
                    title={copiedMessageId === m.id ? "Copied to clipboard!" : "Copy message"}
                    aria-label={copiedMessageId === m.id ? "Copied" : "Copy message"}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: copiedMessageId === m.id ? 'var(--accent)' : 'var(--secondary-text)',
                      cursor: 'pointer',
                      padding: '3px 6px',
                      borderRadius: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: 500,
                      transition: 'all 0.15s ease',
                      opacity: copiedMessageId === m.id ? 1 : 0.75,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '1';
                      if (copiedMessageId !== m.id) {
                        e.currentTarget.style.color = 'var(--main-text)';
                        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (copiedMessageId !== m.id) {
                        e.currentTarget.style.opacity = '0.75';
                        e.currentTarget.style.color = 'var(--secondary-text)';
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    {copiedMessageId === m.id ? (
                      <>
                        <Check size={12} strokeWidth={2.5} style={{ color: 'var(--accent)' }} />
                        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Copied</span>
                      </>
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>

                  {/* Optional Navigation Button Chip */}
                  {m.role === 'assistant' && typeof m.suggested_tab === 'string' && m.suggested_tab.trim() !== '' && (
                    <button
                      onClick={() => onNavigateTab(m.suggested_tab!)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: 'var(--light-accent)',
                        color: 'var(--accent)',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'opacity 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                    >
                      <span>Open {m.suggested_tab.charAt(0).toUpperCase() + m.suggested_tab.slice(1)}</span>
                      <ArrowUpRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'center', padding: '6px 10px' }}>
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '14px 14px 14px 2px',
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>Checking your data</span>
                  <span className="dot-flashing" style={{ display: 'inline-block', width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--accent)', margin: '0 2px' }} />
                  <span className="dot-flashing" style={{ display: 'inline-block', width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--accent)', margin: '0 2px' }} />
                  <span className="dot-flashing" style={{ display: 'inline-block', width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--accent)', margin: '0 2px' }} />
                </div>
              </div>
            )}

            {/* Inline Error Message with Retry */}
            {errorText && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--light-danger)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: 'var(--danger)',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{String(errorText)}</span>
                <button
                  onClick={() => handleSendMessage(messages[messages.length - 1]?.content)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--danger)',
                    fontWeight: 700,
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: 0,
                  }}
                >
                  Retry
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input & Footer */}
          <div
            style={{
              padding: '10px 14px 12px',
              borderTop: '1px solid var(--border)',
              backgroundColor: 'var(--navbar-bg)',
            }}
          >
            {/* ChatGPT / Claude style Floating Stop Pill */}
            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                <button
                  onClick={handleStopGeneration}
                  title="Stop generating reply"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 14px',
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '999px',
                    color: 'var(--secondary-text)',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--danger)';
                    e.currentTarget.style.color = 'var(--danger)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.color = 'var(--secondary-text)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <Square size={10} fill="currentColor" />
                  <span>Stop generating</span>
                </button>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'var(--input-bg)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '4px 6px 4px 12px',
              }}
            >
              <input
                ref={inputRef}
                type="text"
                maxLength={500}
                placeholder={isLoading ? "Generating response..." : "Ask about your expenses, budgets..."}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--main-text)',
                  fontSize: '13px',
                }}
              />
              {isLoading ? (
                <button
                  onClick={handleStopGeneration}
                  title="Stop generating"
                  aria-label="Stop generating"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'var(--primary)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--danger)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary)')}
                >
                  <Square size={12} fill="currentColor" />
                </button>
              ) : (
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim()}
                  aria-label="Send message"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: inputValue.trim() ? 'var(--accent)' : 'transparent',
                    color: inputValue.trim() ? '#FFFFFF' : 'var(--secondary-text)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: inputValue.trim() ? 'pointer' : 'default',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Send size={15} />
                </button>
              )}
            </div>

            {/* Disclaimer */}
            <div
              style={{
                marginTop: '8px',
                textAlign: 'center',
                fontSize: '10.5px',
                color: 'var(--secondary-text)',
              }}
            >
              Answers based on your FinTrack entries. Not financial advice.
            </div>
          </div>
        </div>
      )}
    </>
  );
};
