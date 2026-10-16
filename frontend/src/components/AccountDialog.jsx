import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { DataState } from './DataState.jsx';

export function AccountDialog({ session, onClose }) {
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const dialog = useRef(null);
  const request = useRef(null);

  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => {
      request.current?.abort();
      element.close();
    };
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const controller = new AbortController();
    request.current = controller;
    setError('');
    setPending(true);
    try {
      await session.signIn({ username: form.get('username'), password: form.get('password') }, controller.signal);
      onClose();
    } catch (failure) {
      if (!controller.signal.aborted) {
        setError(failure.message);
        setPending(false);
      }
    }
  };

  return (
    <dialog ref={dialog} className="account-dialog game-panel" onCancel={onClose} aria-labelledby="account-title">
      <button className="account-close text-button" onClick={onClose} aria-label="Tutup akun"><X size={20} /></button>
      <span className="eyebrow">AKUN PENANTANG</span>
      <h2 id="account-title">{session.token ? 'Akunmu' : 'Masuk ke festival'}</h2>
      {session.token ? (
        <>
          <DataState resource={session.account}>
            <p>{session.account.data?.display_name || session.account.data?.username}</p>
            <p>Kelas {session.account.data?.school_grade}</p>
          </DataState>
          <button className="secondary-button wide" onClick={() => { session.signOut(); onClose(); }}>Keluar</button>
        </>
      ) : (
        <form onSubmit={submit}>
          <label>Nama pengguna<input name="username" autoComplete="username" required autoFocus disabled={pending} /></label>
          <label>Kata sandi<input name="password" type="password" autoComplete="current-password" required disabled={pending} /></label>
          {error && <p className="data-error" role="alert">{error}</p>}
          <button className="primary-button wide" disabled={pending}>{pending ? 'Memeriksa akun…' : 'Masuk'}</button>
        </form>
      )}
    </dialog>
  );
}
