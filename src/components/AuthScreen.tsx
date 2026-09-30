import { useState, type FormEvent } from 'react';
import { useAuth } from '../api/AuthContext';

export default function AuthScreen({ notice }: { notice?: string }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (mode === 'register' && password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    setBusy(true);
    try {
      if (mode === 'login') await login(email.trim(), password);
      else await register(email.trim(), password, fullName.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo continuar.');
      setBusy(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
  };

  return (
    <div className="auth-page">
      <section className="card auth-card">
        <div className="brand auth-brand">
          <span className="brand-mark">✅</span>
          <span>Planificación diaria</span>
        </div>
        <h1>{mode === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'}</h1>
        {notice && <p className="hint warn">{notice}</p>}

        <form className="form" onSubmit={submit}>
          {mode === 'register' && (
            <label className="field">
              <span>Nombre</span>
              <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" required />
            </label>
          )}
          <label className="field">
            <span>Email</span>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              autoFocus
            />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={mode === 'register' ? 8 : undefined}
              maxLength={72}
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? 'Un momento…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        <p className="muted small auth-switch">
          {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
          <button type="button" className="link" onClick={switchMode}>
            {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
          </button>
        </p>
      </section>
    </div>
  );
}
