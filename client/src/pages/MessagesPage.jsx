import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const API_BASE_URL = 'http://localhost:3000';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function Avatar({ name, size = 'md' }) {
  const sizeClass = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm';
  const initial = name?.charAt(0).toUpperCase() || '?';
  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center border-2 border-[#0f172a] font-bold bg-[#fef08a] text-[#0f172a] shadow-sm`}
      style={{ borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px' }}
    >
      {initial}
    </div>
  );
}

// ─── Inbox Thread Item ────────────────────────────────────────────────────────

function ThreadItem({ thread, isActive, currentUserId, onClick }) {
  const otherName =
    thread.sender_id === currentUserId ? thread.receiver_name : thread.sender_name;
  const otherId =
    thread.sender_id === currentUserId ? thread.receiver_id : thread.sender_id;

  return (
    <button
      type="button"
      onClick={() => onClick(otherId, otherName)}
      className={`brand-surface-interactive flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-150 ${isActive
          ? 'border-2 border-[#0f172a] bg-[#eef9ff] shadow-md'
          : 'border-2 border-transparent hover:bg-[#f3fbff]'
        }`}
    >
      <Avatar name={otherName} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-extrabold text-slate-900">{otherName}</span>
          <span className="shrink-0 text-[10px] font-bold text-slate-400 uppercase">{formatTime(thread.sent_at)}</span>
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-600 font-medium">
          {thread.sender_id === currentUserId ? 'You: ' : ''}
          {thread.content}
        </p>
      </div>
    </button>
  );
}

// ─── Chat Bubble ──────────────────────────────────────────────────────────────

function ChatBubble({ msg, isOwn }) {
  if (msg.message_type === 'System') {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-slate-100 text-slate-500 text-[11px] font-medium px-3 py-1 rounded-full border border-slate-200 uppercase tracking-wider">
          {msg.content}
        </div>
      </div>
    );
  }

  const isFile = msg.message_type === 'File';

  return (
    <div className={`flex items-end gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isOwn && <Avatar name={msg.sender_name} size="sm" />}
      <div
        className={`max-w-[75%] p-4 text-sm leading-relaxed border-2 border-[#0f172a] shadow-md ${isOwn
            ? 'bg-[#fef08a] text-[#0f172a] rotate-[0.5deg]'
            : 'bg-[#e0f2fe] text-[#0f172a] rotate-[-0.5deg]'
          }`}
        style={{ 
          borderRadius: isOwn 
            ? '12px 12px 2px 12px' 
            : '12px 12px 12px 2px',
          boxShadow: '3px 3px 0px rgba(15, 23, 42, 0.15)'
        }}
      >
        {isFile ? (
          <div className="flex items-center gap-3 py-1">
            <div className="bg-white/40 p-2 border border-[#0f172a] rounded shadow-sm">
              <svg className="h-5 w-5 text-[#0f172a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <a href={msg.content} target="_blank" rel="noopener noreferrer" className="font-bold underline break-all text-[#0f172a] hover:opacity-70 transition">
              {msg.content.split('/').pop() || 'Attachment'}
            </a>
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words font-medium">{msg.content}</p>
        )}
        <p className="mt-2 text-[9px] font-black opacity-40 text-right uppercase tracking-widest">
          {formatTime(msg.sent_at)}
        </p>
      </div>
    </div>
  );
}

// ─── Send Icon SVG ────────────────────────────────────────────────────────────

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MessagesPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  // Inbox
  const [threads, setThreads] = useState([]);
  const [inboxLoading, setInboxLoading] = useState(true);

  // Active conversation
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserName, setSelectedUserName] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [convLoading, setConvLoading] = useState(false);

  // Compose
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  // ── Load inbox ──
  const loadInbox = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/messages/inbox/${user.id}`);
      if (!res.ok) throw new Error('Failed to load inbox');
      const data = await res.json();
      setThreads(Array.isArray(data) ? data : []);
    } catch {
      setThreads([]);
    } finally {
      setInboxLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  // ── Auto-select thread from ?with=<userId> query param ──
  useEffect(() => {
    const withId = searchParams.get('with');
    const withName = searchParams.get('name');
    const orderId = searchParams.get('orderId');

    if (withId && threads !== null) {
      // Try to get the name from inbox first, otherwise use query param name
      const existingThread = threads.find(
        (t) =>
          (t.sender_id === Number(withId) || t.receiver_id === Number(withId))
      );
      if (existingThread) {
        const name =
          existingThread.sender_id === user?.id
            ? existingThread.receiver_name
            : existingThread.sender_name;
        selectConversation(Number(withId), name, orderId);
      } else if (withName) {
        selectConversation(Number(withId), withName, orderId);
      } else {
        selectConversation(Number(withId), `User #${withId}`, orderId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, threads]);

  // ── Load conversation ──
  const loadConversation = useCallback(
    async (otherId) => {
      if (!user?.id || !otherId) return;
      setConvLoading(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/messages/conversation/${user.id}/${otherId}`
        );
        if (!res.ok) throw new Error('Failed to load conversation');
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
      } catch {
        setMessages([]);
      } finally {
        setConvLoading(false);
      }
    },
    [user?.id]
  );

  function selectConversation(otherId, otherName, orderId = null) {
    setSelectedUserId(otherId);
    setSelectedUserName(otherName);
    setSelectedOrderId(orderId);
    setSendError(null);
    setDraft('');
    loadConversation(otherId);
  }

  // ── Scroll to bottom on new messages ──
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // ── Send message ──
  const handleSend = async (e) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !selectedUserId) return;

    setSending(true);
    setSendError(null);

    // Optimistic update
    const optimistic = {
      message_id: `tmp-${Date.now()}`,
      sender_id: user.id,
      receiver_id: selectedUserId,
      content,
      sent_at: new Date().toISOString(),
      sender_name: user.username,
      receiver_name: selectedUserName,
      message_type: 'Text',
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: user.id,
          receiver_id: selectedUserId,
          order_id: selectedOrderId ? Number(selectedOrderId) : null,
          content,
          message_type: 'Text',
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to send message');
      }
      // Refresh inbox to update last-message preview
      loadInbox();
      // Reload conversation to get server-confirmed message
      await loadConversation(selectedUserId);
    } catch (err) {
      setSendError(err.message);
      // Remove optimistic message on failure
      setMessages((prev) =>
        prev.filter((m) => m.message_id !== optimistic.message_id)
      );
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  // ── Keyboard: Ctrl/Cmd+Enter or Enter (without Shift) to send ──
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-4rem)] max-w-7xl mx-auto w-full overflow-hidden px-4 py-6 sm:px-6 lg:px-8 gap-4">

      {/* ── Left Panel: Inbox ── */}
      <aside className="brand-surface flex w-full max-w-xs shrink-0 flex-col overflow-hidden">
        {/* Header */}
        <div className="brand-hero flex items-center justify-between rounded-b-none rounded-t-2xl px-4 py-4">
          <h1 className="text-lg font-bold text-slate-900">Messages</h1>
          <span className="text-xs text-slate-500">{threads.length} thread{threads.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Thread list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {inboxLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#2da8ed]" />
            </div>
          ) : threads.length === 0 ? (
            <div className="py-10 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#eef9ff]">
                <svg className="h-6 w-6 text-[#69ccff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-500">No conversations yet</p>
              <p className="mt-1 text-xs text-slate-400">Messages from orders will appear here.</p>
            </div>
          ) : (
            threads.map((thread) => (
              <ThreadItem
                key={thread.message_id}
                thread={thread}
                isActive={
                  selectedUserId !== null &&
                  (thread.sender_id === selectedUserId ||
                    thread.receiver_id === selectedUserId)
                }
                currentUserId={user?.id}
                onClick={selectConversation}
              />
            ))
          )}
        </div>
      </aside>

      {/* ── Right Panel: Conversation ── */}
      <section className="brand-surface flex flex-1 flex-col overflow-hidden min-w-0">
        {!selectedUserId ? (
          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center p-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#def4ff] to-[#fff8d4]">
              <svg className="h-10 w-10 text-[#2da8ed]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Select a conversation</h2>
              <p className="mt-1 text-sm text-slate-500">
                Choose a thread from the inbox, or use "Message" on an order page to start a new chat.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Conversation header */}
            <div className="brand-hero flex items-center justify-between rounded-b-none rounded-t-2xl px-5 py-3.5">
              <div className="flex items-center gap-3">
                <Avatar name={selectedUserName} />
                <div>
                  <p className="font-semibold text-slate-900">{selectedUserName}</p>
                  <p className="text-xs text-slate-500">Direct message</p>
                </div>
              </div>
              {selectedOrderId && (
                <div className="bg-[#fef08a] text-[#0f172a] text-[10px] font-bold px-2 py-1 rounded border-2 border-[#0f172a] rotate-[1deg] shadow-sm">
                  ORDER #{selectedOrderId}
                </div>
              )}
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {convLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#2da8ed]" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#eef9ff]">
                    <svg className="h-7 w-7 text-[#69ccff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-500">No messages yet</p>
                  <p className="mt-1 text-xs text-slate-400">Send the first message to {selectedUserName}.</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <ChatBubble
                    key={msg.message_id}
                    msg={msg}
                    isOwn={msg.sender_id === user?.id}
                  />
                ))
              )}
              <div ref={bottomRef} />
            </div>

            {/* Send error */}
            {sendError && (
              <div className="mx-5 mb-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
                {sendError}
              </div>
            )}

            {/* Compose bar */}
            <form
              onSubmit={handleSend}
              className="flex items-end gap-3 border-t border-[#d4e7f3] bg-white/80 px-4 py-3 backdrop-blur-sm"
            >
              <textarea
                ref={textareaRef}
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${selectedUserName}… (Enter to send)`}
                disabled={sending}
                className="brand-input min-h-[42px] max-h-32 flex-1 resize-none py-2.5 text-sm disabled:opacity-60"
                style={{ fieldSizing: 'content' }}
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="brand-button-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send message"
              >
                <SendIcon />
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
