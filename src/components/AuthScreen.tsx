import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../api/AuthContext';
import { EMAIL_ENABLED, authApi, isEmailNotVerified, type AccountType } from '../api/client';
import { EASE_OUT } from '../lib/motion';
import { Button, Card, Field, FormError, Hint, Input, Layer, ParallaxScene, Segmented, SegmentedOption, cn, formClass } from '../ui';
import Backdrop from './Backdrop';
import { AppleIcon, BuildingIcon, CalendarCheckIcon, EyeIcon, EyeOffIcon, ListChecksIcon, Logo, UserIcon, WalletIcon } from './Icons';
import { Stars, Sun } from './Sky';

const FEATURES = [
  { icon: <CalendarCheckIcon />, text: 'Disciplinas diarias con semáforo de avance' },
  { icon: <ListChecksIcon />, text: 'Pendientes con prioridad y fecha límite' },
  { icon: <WalletIcon />, text: 'Finanzas: cuentas, movimientos y tasas' },
  { icon: <AppleIcon />, text: 'Nutrición: diario, macros y progreso corporal' },
];

/** Marcas de ejemplo de la tarjeta decorativa (7 días × 4 disciplinas). */
const DEMO_WEEK = [1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0];

const DEMO_MACROS = [
  { width: '82%', fill: 'bg-macro-kcal' },
  { width: '64%', fill: 'bg-macro-protein' },
  { width: '48%', fill: 'bg-macro-fat' },
];

/** Tarjeta de cristal que flota sobre el panel; `className` la coloca y fija su fase de flotación. */
function FloatCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'animate-float rounded-[18px] border border-white/20 bg-white/10 px-4 py-3.5 text-[13px] text-mist/85 shadow-[0_24px_50px_-20px_rgba(0,0,0,0.55)] backdrop-blur-lg',
        className,
      )}
    >
      {children}
    </div>
  );
}

type Mode = 'login' | 'register' | 'forgot' | 'reset' | 'check-email';

/** Segundos de espera entre reenvíos (la API ignora los que lleguen antes de 60 s). */
const RESEND_COOLDOWN = 60;

const errorText = (err: unknown) => (err instanceof Error ? err.message : 'No se pudo continuar.');

export default function AuthScreen({ notice, resetToken }: { notice?: string; resetToken?: string }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>(resetToken ? 'reset' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('PERSONAL');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  /** El último login falló por correo sin confirmar: se ofrece reenviarlo. */
  const [unverified, setUnverified] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const go = (next: Mode) => {
    setMode(next);
    setError('');
    setInfo('');
    setUnverified(false);
    setPassword('');
    setConfirm('');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setUnverified(false);
    if ((mode === 'register' || mode === 'reset') && password.length < 8)
      return setError('La contraseña debe tener al menos 8 caracteres.');
    if (mode === 'reset' && password !== confirm) return setError('Las contraseñas no coinciden.');
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
        return; // la pantalla se desmonta al entrar
      }
      if (mode === 'register') {
        const res = await register(email.trim(), password, fullName.trim(), accountType);
        if (res.signedIn) return; // sin verificación de correo: la pantalla se desmonta al entrar
        setEmail(res.email);
        go('check-email');
        setCooldown(RESEND_COOLDOWN);
      } else if (mode === 'forgot') {
        await authApi.forgotPassword(email.trim());
        setInfo('Si hay una cuenta con ese correo, te enviamos un enlace para elegir una contraseña nueva. Revisa también la carpeta de spam.');
        setCooldown(RESEND_COOLDOWN);
      } else if (mode === 'reset' && resetToken) {
        await authApi.resetPassword(resetToken, password);
        go('login');
        setInfo('Contraseña actualizada. Ya puedes iniciar sesión.');
      }
    } catch (err) {
      setUnverified(isEmailNotVerified(err));
      setError(errorText(err));
    }
    setBusy(false);
  };

  const resend = async () => {
    setError('');
    setBusy(true);
    try {
      await authApi.resendVerification(email.trim());
      go('check-email');
      setInfo('Te enviamos un enlace nuevo. Los anteriores ya no sirven.');
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      setError(errorText(err));
    }
    setBusy(false);
  };

  const COPY: Record<Mode, { title: string; subtitle: string }> = {
    login: { title: 'Inicia sesión', subtitle: 'Continúa donde lo dejaste.' },
    register: { title: 'Crea tu cuenta', subtitle: 'Empieza a planificar tu día en un minuto.' },
    forgot: { title: 'Recupera tu acceso', subtitle: 'Te enviaremos un enlace para elegir una contraseña nueva.' },
    reset: { title: 'Elige una contraseña nueva', subtitle: 'Al guardarla se cerrarán tus sesiones abiertas en otros dispositivos.' },
    'check-email': { title: 'Revisa tu correo', subtitle: `Te enviamos un enlace a ${email} para activar tu cuenta.` },
  };

  const passwordToggle = (
    <button
      type="button"
      className="absolute top-1/2 right-[3px] grid h-[34px] w-9 -translate-y-1/2 place-items-center rounded-lg text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
      onClick={() => setShowPassword(!showPassword)}
      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      aria-pressed={showPassword}
    >
      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  );

  const resendLabel = cooldown > 0 ? `Reenviar en ${cooldown} s` : 'Reenviar correo de confirmación';
  const linkButton = 'font-semibold text-accent-text hover:underline disabled:cursor-default disabled:text-ink-2 disabled:no-underline';

  return (
    <div className="relative isolate grid min-h-dvh grid-rows-[auto_1fr] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:grid-rows-1">
      <Backdrop />

      <aside className="relative isolate m-3 mb-0 flex items-end overflow-hidden rounded-[22px] bg-linear-[150deg,var(--color-tide-950)_0%,var(--color-tide-900)_50%,var(--color-tide-500)_100%] p-[22px] text-mist shadow-lift lg:m-4 lg:rounded-[30px] lg:p-12">
        <ParallaxScene>
          <div aria-hidden="true" className="absolute inset-0 -z-10">
            <Layer shiftX={-8} shiftY={-6} className="absolute inset-x-0 -inset-y-[10%]">
              <Stars />
            </Layer>
            <Layer
              shiftX={-30}
              shiftY={-22}
              className="absolute -top-[34px] -right-5 size-[110px] lg:top-[12%] lg:right-[14%] lg:size-[170px]"
            >
              <Sun />
            </Layer>

            {/* Tarjetas de muestra: cada una se mueve a distinta profundidad con el ratón. */}
            <Layer shiftX={26} shiftY={20} className="absolute top-[12%] left-[9%] hidden lg:block">
              <FloatCard className="flex items-center gap-3.5">
                <svg viewBox="0 0 80 80" width="72" height="72" fill="none" strokeWidth="8">
                  <circle cx="40" cy="40" r="30" className="stroke-white/18" />
                  <g transform="rotate(-90 40 40)">
                    <motion.circle
                      cx="40"
                      cy="40"
                      r="30"
                      strokeLinecap="round"
                      className="stroke-dawn-400"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 0.8 }}
                      transition={{ duration: 1.4, ease: EASE_OUT, delay: 0.3 }}
                    />
                  </g>
                </svg>
                <div>
                  <strong className="block font-display text-2xl leading-tight font-extrabold text-white">80%</strong>
                  <span>Hoy · 4 de 5</span>
                </div>
              </FloatCard>
            </Layer>

            <Layer shiftX={-40} shiftY={-30} className="absolute top-[33%] right-[9%] hidden lg:block">
              <FloatCard className="[animation-delay:-2.5s]">
                <span>Semana actual</span>
                <div className="mt-2.5 grid grid-cols-[repeat(7,15px)] gap-[5px]">
                  {DEMO_WEEK.map((on, i) => (
                    <i key={i} className={cn('h-[15px] rounded-[5px]', on ? 'bg-tide-300' : 'bg-white/14')} />
                  ))}
                </div>
              </FloatCard>
            </Layer>

            <Layer shiftX={14} shiftY={12} className="absolute top-[47%] left-[20%] hidden lg:[@media(min-height:760px)]:block">
              <FloatCard className="w-[190px] [animation-delay:-4.5s]">
                <span>Macros de hoy</span>
                {DEMO_MACROS.map((m, i) => (
                  <motion.i
                    key={m.fill}
                    className={cn('mt-[9px] block h-2 rounded-full', m.fill)}
                    initial={{ width: 0 }}
                    animate={{ width: m.width }}
                    transition={{ duration: 1.1, ease: EASE_OUT, delay: 0.4 + i * 0.1 }}
                  />
                ))}
              </FloatCard>
            </Layer>

            <div className="absolute inset-x-0 top-[40%] bottom-0 bg-linear-to-t from-[rgba(3,26,28,0.75)] to-transparent" />
          </div>
        </ParallaxScene>

        <motion.div
          className="max-w-[460px]"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE_OUT }}
        >
          <div className="flex items-center gap-2.5 font-display text-[17px] font-extrabold tracking-[-0.02em]">
            <Logo size={36} />
            <span>Planificación diaria</span>
          </div>
          <p className="mt-3.5 font-display text-[22px] leading-[1.15] font-extrabold tracking-[-0.025em] text-balance [word-spacing:0.06em] lg:mt-[22px] lg:text-[clamp(28px,3vw,40px)]">
            Tu día, en orden. Tu progreso, a la vista.
          </p>
          <ul className="m-0 mt-[22px] hidden list-none flex-col gap-2.5 p-0 lg:flex">
            {FEATURES.map((f) => (
              <li key={f.text} className="flex items-center gap-2.5 text-mist/90">
                <span className="flex-none text-tide-300">{f.icon}</span>
                <span>{f.text}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </aside>

      <main className="grid place-items-start justify-items-center px-4 py-6 lg:place-items-center">
        <Card className="flex w-full max-w-[420px] flex-col gap-[18px] p-6 md:p-8" delay={0.1}>
          <motion.div
            key={mode}
            className="flex flex-col gap-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
          >
            <h1 className="text-[26px] font-extrabold tracking-[-0.02em]">{COPY[mode].title}</h1>
            <p className="text-ink-2">{COPY[mode].subtitle}</p>
          </motion.div>
          {notice && !info && <Hint tone="warn">{notice}</Hint>}
          {info && (
            <Hint tone="ok" role="status">
              {info}
            </Hint>
          )}

          {mode === 'check-email' ? (
            <div className="flex flex-col gap-3">
              <p className="text-[13.5px] text-ink-2">
                Ábrelo desde este dispositivo o cualquier otro; el enlace vence en 24 horas. Si no lo ves, revisa la carpeta de spam.
              </p>
              {error && <FormError>{error}</FormError>}
              <Button className="min-h-11 w-full" onClick={resend} disabled={busy || cooldown > 0}>
                {resendLabel}
              </Button>
            </div>
          ) : (
          <form className={formClass} onSubmit={submit}>
            {mode === 'register' && (
              <>
                <Field label="Tipo de cuenta" as="div">
                  <Segmented>
                    <SegmentedOption active={accountType === 'PERSONAL'} onClick={() => setAccountType('PERSONAL')}>
                      <span className="inline-flex items-center gap-1.5">
                        <UserIcon size={15} />
                        Personal
                      </span>
                    </SegmentedOption>
                    <SegmentedOption active={accountType === 'BUSINESS'} onClick={() => setAccountType('BUSINESS')}>
                      <span className="inline-flex items-center gap-1.5">
                        <BuildingIcon size={15} />
                        Empresa
                      </span>
                    </SegmentedOption>
                  </Segmented>
                  <Hint>
                    {accountType === 'PERSONAL'
                      ? 'Incluye plan, disciplinas, pendientes, finanzas y nutrición.'
                      : 'Para gestionar las actividades diarias del negocio: plan, disciplinas y pendientes.'}
                  </Hint>
                </Field>
                <Field label={accountType === 'BUSINESS' ? 'Nombre de la empresa' : 'Nombre'}>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete={accountType === 'BUSINESS' ? 'organization' : 'name'}
                    required
                  />
                </Field>
              </>
            )}
            {mode !== 'reset' && (
              <Field label="Email">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required autoFocus />
              </Field>
            )}
            {mode !== 'forgot' && (
              <Field label={mode === 'reset' ? 'Contraseña nueva' : 'Contraseña'} as="div" htmlFor="auth-password">
                <div className="relative">
                  <Input
                    id="auth-password"
                    className="pr-[46px]"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    minLength={mode === 'login' ? undefined : 8}
                    maxLength={72}
                    required
                    autoFocus={mode === 'reset'}
                  />
                  {passwordToggle}
                </div>
                {mode !== 'login' && <Hint>Mínimo 8 caracteres.</Hint>}
                {mode === 'login' && EMAIL_ENABLED && (
                  <button type="button" className={cn(linkButton, 'self-end text-[13px]')} onClick={() => go('forgot')}>
                    ¿Olvidaste tu contraseña?
                  </button>
                )}
              </Field>
            )}
            {mode === 'reset' && (
              <Field label="Repite la contraseña">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  maxLength={72}
                  required
                />
              </Field>
            )}
            {error && <FormError>{error}</FormError>}
            {unverified && (
              <button type="button" className={cn(linkButton, 'self-start text-[13px]')} onClick={resend} disabled={busy || cooldown > 0}>
                {resendLabel}
              </button>
            )}
            <Button
              type="submit"
              variant="primary"
              className="min-h-11 w-full md:min-h-11"
              disabled={busy || (mode === 'forgot' && cooldown > 0) || (mode === 'reset' && !resetToken)}
            >
              {busy && <span className="size-[15px] animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />}
              {busy
                ? 'Un momento…'
                : {
                    login: 'Entrar',
                    register: 'Crear cuenta',
                    forgot: cooldown > 0 ? `Enviar de nuevo en ${cooldown} s` : 'Enviar enlace',
                    reset: 'Guardar contraseña',
                  }[mode]}
            </Button>
          </form>
          )}

          <p className="text-center text-[13px] text-ink-2">
            {mode === 'login' && (
              <>
                ¿No tienes cuenta?{' '}
                <button type="button" className={linkButton} onClick={() => go('register')}>
                  Regístrate
                </button>
              </>
            )}
            {mode === 'register' && (
              <>
                ¿Ya tienes cuenta?{' '}
                <button type="button" className={linkButton} onClick={() => go('login')}>
                  Inicia sesión
                </button>
              </>
            )}
            {mode === 'reset' && error && (
              <>
                <button type="button" className={linkButton} onClick={() => go('forgot')}>
                  Pedir un enlace nuevo
                </button>
                {' · '}
              </>
            )}
            {(mode === 'forgot' || mode === 'reset' || mode === 'check-email') && (
              <button type="button" className={linkButton} onClick={() => go('login')}>
                Volver a iniciar sesión
              </button>
            )}
          </p>
        </Card>
      </main>
    </div>
  );
}
