import { useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../api/AuthContext';
import { useParallaxVars } from '../lib/motion';
import Backdrop from './Backdrop';
import { AppleIcon, CalendarCheckIcon, EyeIcon, EyeOffIcon, ListChecksIcon, Logo, WalletIcon } from './Icons';

const FEATURES = [
  { icon: <CalendarCheckIcon />, text: 'Disciplinas diarias con semáforo de avance' },
  { icon: <ListChecksIcon />, text: 'Pendientes con prioridad y fecha límite' },
  { icon: <WalletIcon />, text: 'Finanzas: cuentas, movimientos y tasas' },
  { icon: <AppleIcon />, text: 'Nutrición: diario, macros y progreso corporal' },
];

/** Marcas de ejemplo de la tarjeta decorativa (7 días × 4 disciplinas). */
const DEMO_WEEK = [1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0];

export default function AuthScreen({ notice }: { notice?: string }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  useParallaxVars(heroRef);

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
      <Backdrop />

      <aside ref={heroRef} className="auth-hero">
        <div className="auth-hero-art" aria-hidden="true">
          <div className="banner-layer banner-stars" />
          <div className="banner-layer banner-sun">
            <span className="sun-ring ring-3" />
            <span className="sun-ring ring-2" />
            <span className="sun-ring ring-1" />
            <span className="sun-disc" />
          </div>

          <div className="float-card float-ring">
            <svg viewBox="0 0 80 80" width="72" height="72">
              <circle cx="40" cy="40" r="30" className="float-ring-track" />
              <circle cx="40" cy="40" r="30" className="float-ring-value" transform="rotate(-90 40 40)" />
            </svg>
            <div>
              <strong>80%</strong>
              <span>Hoy · 4 de 5</span>
            </div>
          </div>

          <div className="float-card float-week">
            <span>Semana actual</span>
            <div className="float-week-grid">
              {DEMO_WEEK.map((on, i) => (
                <i key={i} className={on ? 'on' : ''} />
              ))}
            </div>
          </div>

          <div className="float-card float-macros">
            <span>Macros de hoy</span>
            <i style={{ width: '82%' }} className="m-kcal" />
            <i style={{ width: '64%' }} className="m-protein" />
            <i style={{ width: '48%' }} className="m-fat" />
          </div>
        </div>

        <div className="auth-hero-copy">
          <div className="brand">
            <Logo size={36} />
            <span>Planificación diaria</span>
          </div>
          <p className="auth-headline">Tu día, en orden. Tu progreso, a la vista.</p>
          <ul className="auth-features">
            {FEATURES.map((f) => (
              <li key={f.text}>
                {f.icon}
                <span>{f.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="auth-side">
        <section className="card auth-card">
          <div key={mode} className="auth-title">
            <h1>{mode === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'}</h1>
            <p className="muted">
              {mode === 'login' ? 'Continúa donde lo dejaste.' : 'Empieza a planificar tu día en un minuto.'}
            </p>
          </div>
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
            <div className="field">
              <label htmlFor="auth-password">Contraseña</label>
              <div className="input-affix">
                <input
                  id="auth-password"
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  minLength={mode === 'register' ? 8 : undefined}
                  maxLength={72}
                  required
                />
                <button
                  type="button"
                  className="affix-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {mode === 'register' && <span className="hint">Mínimo 8 caracteres.</span>}
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="btn primary" disabled={busy}>
              {busy && <span className="spinner" aria-hidden="true" />}
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
      </main>
    </div>
  );
}
