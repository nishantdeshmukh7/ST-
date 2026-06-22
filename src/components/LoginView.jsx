import { useState } from 'react';
import apiService from '../utils/apiService';
import { Eye, EyeOff, Loader2, ShieldCheck, Database, Zap } from 'lucide-react';
import { useTranslation } from '../utils/translationService';

const LoginView = ({ onLoginSuccess, defaultRole = 'conductor' }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError(t('enter_email_pw')); return; }
    setLoading(true);
    setError('');
    try {
      const { user, role } = await apiService.signIn(email, password);
      onLoginSuccess(user, role);
    } catch (err) {
      setError(err.message === 'Invalid email or password' ? t('invalid_email_pw') || 'Invalid email or password' : t('signin_failed'));
    } finally {
      setLoading(false);
    }
  };

  const seed = async () => {
    setSeeding(true); setError(''); setInfo('');
    try {
      await apiService.seedUsers();
      setInfo('Test accounts generated. (Password: password123)');
      setEmail(defaultRole === 'admin' ? 'admin@stpay.com' : 'conductor@stpay.com');
      setPassword('password123');
    } catch (err) {
      setError('Failed to seed accounts.');
    } finally {
      setSeeding(false);
    }
  };

  const fill = (r) => {
    setEmail(r === 'admin' ? 'admin@stpay.com' : 'conductor@stpay.com');
    setPassword('password123');
    setError('');
  };

  const isDev = window.location.hostname === 'localhost';

  return (
    <div className="px-5 py-8 animate-fade-in">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-sm border border-blue-100">
          <ShieldCheck className="w-8 h-8" strokeWidth={1.5} />
        </div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900">
          {defaultRole === 'admin' ? t('admin_portal') : t('conductor_portal')}
        </h2>
        <p className="text-[13px] font-medium text-slate-500 mt-1">
          {t('secure_access')}
        </p>
      </div>

      <div className="card p-5">
        {error && <div className="alert-error mb-5">{error}</div>}
        {info && <div className="alert-success mb-5">{info}</div>}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="email" className="label">{t('email_addr')}</label>
            <input
              id="email" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field" placeholder="name@stpay.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="pw" className="label">{t('password')}</label>
            <div className="relative">
              <input
                id="pw" type={showPw ? 'text' : 'password'} value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field pr-12" placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 p-1 transition-colors"
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('secure_signin')}
          </button>
        </form>
      </div>

      {isDev && (
        <div className="mt-8 animate-slide-up">
          <div className="flex items-center gap-2 mb-3 px-1">
            <Database className="w-4 h-4 text-slate-400" />
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{t('dev_tools')}</h3>
          </div>
          <div className="card-inner space-y-3">
            <button onClick={seed} disabled={seeding || loading} className="btn-secondary w-full">
              {seeding ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : (
                <>
                  <Zap className="w-4 h-4 text-amber-500" />
                  {t('seed_db')}
                </>
              )}
            </button>
            <div className="flex justify-center gap-4 text-[12px] font-semibold">
              <button onClick={() => fill('conductor')} className="text-blue-600 hover:text-blue-800 transition-colors">{t('fill_conductor')}</button>
              <div className="w-px bg-slate-300" />
              <button onClick={() => fill('admin')} className="text-blue-600 hover:text-blue-800 transition-colors">{t('fill_admin')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginView;
