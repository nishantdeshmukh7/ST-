import { useState, useEffect, useMemo } from 'react';
import apiService from './utils/apiService';
import PassengerView from './components/PassengerView';
import ConductorView from './components/ConductorView';
import AdminView from './components/AdminView';
import LoginView from './components/LoginView';
import { Ticket, ScanLine, Settings, LogOut, Loader2, Bus, Eye, EyeOff, LogIn, X } from 'lucide-react';
import { useTranslation } from './utils/translationService';

const PassengerLoginModal = ({ onLoginSuccess, onDismiss }) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError(t('enter_email_pw')); return; }
    if (mode === 'register' && password.length < 6) {
      setError(t('pw_min_len')); return;
    }
    setLoading(true); setError('');
    try {
      const fn = mode === 'login' ? apiService.signIn : apiService.register;
      const { user, role } = await fn.call(apiService, email, password);
      onLoginSuccess(user, role);
    } catch (err) {
      setError(err.message || (mode === 'login' ? t('signin_failed') : t('register_failed')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-[480px] rounded-t-3xl px-6 pt-6 pb-10 shadow-2xl animate-slide-up">
        {/* Handle bar */}
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-6" />

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30">
              <LogIn className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-[17px] font-black text-slate-900 leading-tight">{t('passenger_login')}</h3>
              <p className="text-[11px] font-medium text-slate-400 mt-0.5">{t('wallet_subtitle')}</p>
            </div>
          </div>
          <button onClick={onDismiss} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && <div className="alert-error mb-4">{error}</div>}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              {t('email_addr')}
            </label>
            <input
              type="email"
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {t('password')} <span className="text-[9px] text-slate-300 font-medium">{t('min_char')}</span>
              </label>
            </div>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                className="field pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button type="submit" disabled={loading} className="btn-primary w-full h-12 flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'login' ? t('sign_in') : t('create_acc')}
            </button>
          </div>
        </form>

        <div className="mt-5 text-center">
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            className="text-[12px] font-bold text-blue-600 hover:text-blue-700"
          >
            {mode === 'login' ? t('create_acc') : t('sign_in')}
          </button>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const { t, lang, changeLanguage } = useTranslation();
  const [view, setView] = useState('passenger');
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPassengerLogin, setShowPassengerLogin] = useState(false);
  const [routes, setRoutes] = useState({});
  const [busId, setBusId] = useState('BUS001-AT');

  const { urlParams, fromQR } = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      urlParams: params,
      fromQR: params.has('bus') || params.has('ticket')
    };
  }, []);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const loadedRoutes = await apiService.getRoutes();
        setRoutes(loadedRoutes || {});
        let urlBusId = urlParams.get('bus') || 'BUS001-AT';
        if (loadedRoutes && !loadedRoutes[urlBusId]) {
          urlBusId = Object.keys(loadedRoutes)[0] || 'BUS001-AT';
        }
        setBusId(urlBusId);
      } catch (err) {
        console.error('Failed to fetch routes in App:', err);
      }
    };
    fetchRoutes();
  }, []);

  const initAuth = async () => {
    try {
      const storedUser = localStorage.getItem('stpay_user');
      const storedRole = localStorage.getItem('stpay_role');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
        setRole(storedRole);
      } else {
        await apiService.ensurePassengerSession();
        const newUser = localStorage.getItem('stpay_user');
        if (newUser) {
          setUser(JSON.parse(newUser));
          setRole(localStorage.getItem('stpay_role'));
        }
      }
      
      // Fetch fresh user data for ST Coins
      if (localStorage.getItem('stpay_token')) {
        const freshUser = await apiService.getMe();
        if (freshUser) {
          setUser(prev => ({ ...prev, stCoins: freshUser.stCoins }));
        }
      }
    } catch (err) {
      console.error("Auth init failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
    // Same-tab auth change events
    window.addEventListener('stpay_auth_changed', initAuth);

    // Cross-tab auth sync: native 'storage' event fires in OTHER tabs when localStorage changes
    const onStorageChange = (e) => {
      if (e.key === 'stpay_auth_ts') {
        // Another tab logged in or out — re-sync our state
        const storedUser = localStorage.getItem('stpay_user');
        const storedRole = localStorage.getItem('stpay_role');
        if (!storedUser || JSON.parse(storedUser)?.isAnonymous) {
          // Other tab logged out — force logout here too
          setUser(null);
          setRole(null);
          setView('passenger');
          setLoading(false);
        } else {
          // Other tab logged in — update our session
          setUser(JSON.parse(storedUser));
          setRole(storedRole);
          setLoading(false);
        }
      }
    };
    window.addEventListener('storage', onStorageChange);
    return () => {
      window.removeEventListener('stpay_auth_changed', initAuth);
      window.removeEventListener('storage', onStorageChange);
    };
  }, []);

  useEffect(() => {
    if (fromQR) setView('passenger');
  }, [fromQR]);

  const handleLogin = (u, r) => {
    setUser(u);
    setRole(r);
    // Broadcast to same tab
    window.dispatchEvent(new Event('stpay_auth_changed'));
    // Broadcast cross-tab via localStorage storage event
    localStorage.setItem('stpay_auth_ts', Date.now().toString());
  };

  const handleLogout = async () => {
    await apiService.logout();
    setUser(null);
    setRole(null);
    setView('passenger');
    // Broadcast to same tab
    window.dispatchEvent(new Event('stpay_auth_changed'));
    // Broadcast cross-tab — storage event fires in OTHER tabs
    localStorage.setItem('stpay_auth_ts', Date.now().toString());
  };

  const content = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] animate-fade-in gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-[13px] font-medium">{t('securing_session')}</p>
        </div>
      );
    }
    switch (view) {
      case 'passenger':
        return <div key="passenger" className="animate-fade-in"><PassengerView fromQR={fromQR} busId={busId} user={user} setUser={setUser} /></div>;
      case 'conductor':
        return user && role === 'conductor'
          ? <div key="cond-dash" className="animate-fade-in"><ConductorView /></div>
          : <div key="cond-log" className="animate-slide-up"><LoginView onLoginSuccess={handleLogin} defaultRole="conductor" /></div>;
      case 'admin':
        return user && role === 'admin'
          ? <div key="admin-dash" className="animate-fade-in"><AdminView /></div>
          : <div key="admin-log" className="animate-slide-up"><LoginView onLoginSuccess={handleLogin} defaultRole="admin" /></div>;
      default:
        return null;
    }
  };

  const tabs = [
    { id: 'passenger', label: t('book_tab'), icon: Ticket },
    { id: 'conductor', label: t('verify_tickets'), icon: ScanLine },
    { id: 'admin', label: t('admin_portal') || 'Admin', icon: Settings },
  ];

  return (
    <div className="min-h-[100dvh] bg-slate-900 flex justify-center selection:bg-blue-500/30">
      {/* Mobile Shell Frame */}
      <div className="w-full max-w-[480px] bg-slate-50 flex flex-col min-h-[100dvh] relative shadow-2xl overflow-hidden md:my-0 md:rounded-none">

        {/* Premium Header */}
        <header className="bg-white px-5 py-5 flex items-center justify-between sticky top-0 z-40 border-b border-slate-200/60 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] pt-safe">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-[14px] flex items-center justify-center shadow-inner mt-1.5">
              <Bus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight leading-tight">{t('app_title')}</h1>
              {user && role === 'passenger' ? (
                <p className="text-[11px] font-bold text-amber-500 tracking-wide mt-0.5 flex items-center gap-1">
                  <span className="w-3.5 h-3.5 bg-amber-100 rounded-full flex items-center justify-center text-[8px] border border-amber-200 text-amber-600">★</span>
                  {(user?.stCoins ?? 0)} {t('coins')}
                </p>
              ) : user && !user.isAnonymous && (
                <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase mt-0.5">{role}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={lang}
              onChange={(e) => changeLanguage(e.target.value)}
              className="text-[11px] font-black text-slate-600 bg-slate-50 border border-slate-200/80 px-2 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-95 transition-all select-none mr-1 cursor-pointer"
            >
              <option value="en">EN</option>
              <option value="hi">हिंदी</option>
              <option value="mr">मराठी</option>
            </select>

            {user && !user.isAnonymous ? (
              <button
                onClick={handleLogout}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all active:scale-95"
                aria-label={t('sign_out')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setShowPassengerLogin(true)}
                className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-2 rounded-xl hover:bg-blue-100 transition-all active:scale-95"
              >
                {t('sign_in')}
              </button>
            )}
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto pb-[90px] w-full" id="scroll-container">
          {content()}
        </main>

        <nav className="absolute bottom-0 w-full bg-white/80 backdrop-blur-xl border-t border-slate-200/60 pb-safe z-50" role="tablist">
          <div className="flex justify-around items-center px-2 py-2">
            {tabs.map(({ id, label, icon: Icon }) => {
              const active = view === id;
              return (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  className="relative flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl transition-all duration-300 active:scale-95"
                  role="tab"
                  aria-label={label}
                  aria-selected={active}
                >
                  {/* Animated background pill for active state */}
                  {active && (
                    <span className="absolute inset-0 bg-blue-50 rounded-2xl -z-10 animate-fade-in" />
                  )}
                  <Icon 
                    className={`w-5 h-5 transition-all duration-300 ${active ? 'text-blue-600 translate-y-0.5' : 'text-slate-400'}`} 
                    strokeWidth={active ? 2.5 : 2} 
                  />
                  <span className={`text-[10px] font-bold tracking-wide transition-all duration-300 ${active ? 'text-blue-700 opacity-100' : 'text-slate-500 opacity-0 translate-y-1'}`}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {showPassengerLogin && (
          <PassengerLoginModal
            onLoginSuccess={(u, r) => {
              handleLogin(u, r);
              setShowPassengerLogin(false);
            }}
            onDismiss={() => setShowPassengerLogin(false)}
          />
        )}

      </div>
    </div>
  );
};

export default App;