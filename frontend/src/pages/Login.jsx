import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Button, Input, Field } from '../components/ui';
import Logo from '../components/Logo';

export default function Login() {
  const { user, login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Logo className="h-24 w-24 rounded-2xl p-2" />
          <h1 className="text-xl font-extrabold">HIKER Shoes Factory</h1>
          <p className="microlabel">ERP Login</p>
        </div>
        <div className="rounded-2xl border border-borderc bg-card p-6 shadow-card">
          <form onSubmit={submit}>
            {mode === 'register' && (
              <Field label="Full name">
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Your name" />
              </Field>
            )}
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="you@factory.pk" />
            </Field>
            <Field label="Password">
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required placeholder="••••••" />
            </Field>
            {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</div>}
            <Button type="submit" className="w-full justify-center" disabled={busy}>
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </form>
          <button
            className="mt-3 w-full rounded-xl border border-borderc px-4 py-2 text-sm font-semibold text-mutedfg hover:bg-muted"
            disabled
            title="Needs Google OAuth credentials — ask in chat to connect them"
          >
            Continue with Google (not configured)
          </button>
          <div className="mt-4 text-center text-xs text-mutedfg">
            {mode === 'login' ? (
              <>New user? <button className="font-semibold text-accent" onClick={() => setMode('register')}>Create an account</button></>
            ) : (
              <>Already registered? <button className="font-semibold text-accent" onClick={() => setMode('login')}>Sign in</button></>
            )}
          </div>
          <div className="mt-4 rounded-lg bg-muted px-3 py-2 text-center text-[11px] text-mutedfg">
            Demo account: <span className="num">admin@hiker.pk / admin123</span>
          </div>
        </div>
      </div>
    </div>
  );
}
