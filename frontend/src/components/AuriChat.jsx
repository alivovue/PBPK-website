import { useEffect, useRef, useState } from 'react';
import { Bot, Plus, Send, Trash2, X } from 'lucide-react';
import { request } from '../api/client.js';
import { routes } from '../api/routes.js';
import { useApi } from '../hooks/useApi.js';
import { DataState, SignInPrompt } from './DataState.jsx';

function ChatThread({ initialConversationId, context, session, onCreated, onUpdated, onRemoved }) {
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [updated, setUpdated] = useState(null);
  const [draft, setDraft] = useState(context.prompt || '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const controller = useRef(null);
  const bottom = useRef(null);
  const history = useApi(conversationId ? routes.ai.conversation(conversationId) : null, {
    token: session.token, onUnauthorized: session.signOut,
  });
  const data = updated || history.data;
  const messages = data?.messages || [];

  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'nearest' }); }, [messages.length, pending]);

  const send = async (event) => {
    event.preventDefault();
    if (pending || !draft.trim()) return;
    const active = new AbortController();
    controller.current = active;
    setPending(true);
    setError('');
    try {
      let id = conversationId;
      if (!id) {
        const conversation = await request(routes.ai.conversations, {
          token: session.token, signal: active.signal, method: 'POST',
          body: { ...(context.lessonId ? { lesson_id: context.lessonId } : {}),
            ...(context.topicId ? { topic_id: context.topicId } : {}) },
        });
        id = conversation.id;
        setConversationId(id);
        onCreated(conversation);
      }
      const result = await request(routes.ai.messages(id), {
        token: session.token, signal: active.signal, method: 'POST', body: { message: draft.trim() },
      });
      setUpdated(result);
      setDraft('');
      onUpdated();
    } catch (failure) {
      if (!active.signal.aborted) {
        if (failure.status === 401) session.signOut();
        setError(failure.message);
      }
    } finally {
      if (!active.signal.aborted) setPending(false);
    }
  };

  const remove = async () => {
    if (pending || !conversationId) return;
    const active = new AbortController();
    controller.current = active;
    setPending(true);
    setError('');
    try {
      await request(routes.ai.conversation(conversationId), {
        token: session.token, signal: active.signal, method: 'DELETE',
      });
      onRemoved();
    } catch (failure) {
      if (!active.signal.aborted) {
        if (failure.status === 401) session.signOut();
        setError(failure.message);
      }
    } finally {
      if (!active.signal.aborted) setPending(false);
    }
  };

  return (
    <>
      {(context.label || data?.conversation.topic_id) && <p className="auri-context">Materi: {data?.conversation.title || context.label}</p>}
      <div className="auri-messages" role="log" aria-label="Pesan AURI" aria-live="polite">
        {conversationId && !updated && <DataState resource={history}><span /></DataState>}
        {messages.length === 0 && !history.loading && <p className="auri-empty">Tanyakan bagian materi yang ingin kamu pahami. Jawaban AURI menyertakan sumber yang ditemukan.</p>}
        {data?.has_older_messages && <p className="auri-empty">Menampilkan 100 pesan terbaru.</p>}
        {messages.map(message => (
          <article className={`auri-message auri-message-${message.role}`} key={message.id}>
            <strong>{message.role === 'user' ? 'Kamu' : 'AURI'}</strong>
            <p>{message.text}</p>
            {message.sources.map((source, index) => (
              <details className="auri-source" key={index}>
                <summary>Sumber: {source.title || `Modul · halaman ${source.page}`}</summary>
                <blockquote>{source.text}</blockquote>
              </details>
            ))}
          </article>
        ))}
        {pending && <p className="auri-empty" role="status">AURI sedang memproses…</p>}
        <div ref={bottom} />
      </div>
      <form className="auri-compose" onSubmit={send}>
        {error && <p className="account-feedback data-error" role="alert">{error}</p>}
        <label htmlFor="auri-message">Pesan untuk AURI</label>
        <textarea id="auri-message" value={draft} onChange={event => setDraft(event.target.value)}
          maxLength={1000} rows={3} required autoFocus disabled={pending} placeholder="Tulis pertanyaanmu…" />
        <div>
          <small>{draft.length}/1000</small>
          {conversationId && <button type="button" className="text-button" onClick={remove} disabled={pending} aria-label="Hapus percakapan"><Trash2 size={16} /></button>}
          <button className="primary-button" disabled={pending || !draft.trim() || (!updated && (history.loading || Boolean(history.error)))}><Send size={15} /> Kirim</button>
        </div>
      </form>
    </>
  );
}

export function AuriChat({ open, onClose, session, onSignIn, context = {} }) {
  const [selection, setSelection] = useState({ id: null, revision: 0, context });
  const conversations = useApi(open && session.token ? routes.ai.conversations : null, {
    token: session.token, onUnauthorized: session.signOut,
  });
  const status = useApi(open ? routes.ai.status : null);
  const select = (id, nextContext = {}) => setSelection(previous => ({ id, context: nextContext, revision: previous.revision + 1 }));

  if (!open) return null;
  return (
    <section id="auri-chat" className="auri-chat game-panel" role="dialog" aria-label="Percakapan AURI" onKeyDown={event => { if (event.key === 'Escape') onClose(); }}>
      <header className="auri-chat-header">
        <Bot size={25} /><div><h2>AURI</h2><span>Teman belajar Grand Convergence</span></div>
        <button className="text-button" onClick={onClose} aria-label="Tutup bantuan"><X size={20} /></button>
      </header>
      <div className="auri-availability">
        {status.loading ? <p role="status">Memeriksa AURI…</p> : status.error ? (
          <><p role="alert">{status.error.message}</p><button className="text-button" onClick={status.retry}>Coba lagi</button></>
        ) : <>
          <p role="status">{status.data?.message}</p>
          {!status.data?.ready && <button className="text-button" onClick={status.retry}>Periksa lagi</button>}
        </>}
      </div>
      {session.token ? <>
        <div className="auri-conversations">
          <label htmlFor="auri-conversation">Riwayat percakapan</label>
          <div>
            <select id="auri-conversation" value={selection.id || ''} onChange={event => select(event.target.value || null)}>
              <option value="">Percakapan baru</option>
              {selection.id && !conversations.data?.some(item => item.id === selection.id) && <option value={selection.id}>Percakapan saat ini</option>}
              {conversations.data?.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
            <button className="secondary-button" onClick={() => select(null)} aria-label="Percakapan baru"><Plus size={17} /></button>
          </div>
          {conversations.error && <DataState resource={conversations} />}
        </div>
        <ChatThread key={selection.revision} initialConversationId={selection.id} context={selection.context} session={session}
          onCreated={conversation => { setSelection(previous => ({ ...previous, id: conversation.id })); conversations.retry(); }}
          onUpdated={conversations.retry} onRemoved={() => { select(null); conversations.retry(); }} />
      </> : <SignInPrompt onSignIn={onSignIn} />}
    </section>
  );
}
