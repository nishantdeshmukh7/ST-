import { useState, useEffect } from 'react';
import { Loader2, ShieldCheck, Clock, CheckCircle2, LogIn, X, Eye, EyeOff, Wallet, ArrowRight, CreditCard } from 'lucide-react';
import apiService from '../utils/apiService';
import { useTranslation } from '../utils/translationService';

// ─── Inline Login / Register Modal ───────────────────────────────────────────
const WalletLoginModal = ({ onLoginSuccess, onDismiss }) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const switchMode = (m) => { setMode(m); setError(''); setEmail(''); setPassword(''); };

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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-[480px] rounded-t-3xl px-6 pt-6 pb-10 shadow-2xl animate-slide-up">

        {/* Handle bar */}
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-6" />

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-[17px] font-black text-slate-900 leading-tight">{t('wallet_title')}</h3>
              <p className="text-[12px] font-medium text-slate-500 mt-0.5">{t('wallet_subtitle')}</p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="tab-group mb-5">
          <button
            onClick={() => switchMode('login')}
            className={`tab-item text-[13px] ${mode === 'login' ? 'tab-active' : 'tab-inactive'}`}
          >
            {t('sign_in')}
          </button>
          <button
            onClick={() => switchMode('register')}
            className={`tab-item text-[13px] ${mode === 'register' ? 'tab-active' : 'tab-inactive'}`}
          >
            {t('create_acc')}
          </button>
        </div>

        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-[12px] font-medium text-blue-800 leading-relaxed">
            {mode === 'login' ? t('wallet_acc_info') : t('wallet_acc_register')}
          </p>
        </div>

        {error && (
          <div className="alert-error mb-4 animate-slide-up">{error}</div>
        )}

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label htmlFor="wallet-email" className="label">{t('email_addr')}</label>
            <input
              id="wallet-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="wallet-pw" className="label">
              {t('password')} {mode === 'register' && <span className="normal-case font-normal text-slate-400">{t('min_char')}</span>}
            </label>
            <div className="relative">
              <input
                id="wallet-pw"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field pr-12"
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 p-1 transition-colors"
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full h-12 mt-1">
            {loading
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : mode === 'login'
                ? <><LogIn className="w-4 h-4" /> {t('sign_in_use_wallet')}</>
                : <><LogIn className="w-4 h-4" /> {t('create_acc_continue')}</>
            }
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-[12px] text-slate-500 font-medium">
            {t('prefer_not_signin')}{' '}
            <button
              onClick={onDismiss}
              className="text-blue-600 font-bold hover:text-blue-800 transition-colors inline-flex items-center gap-0.5"
            >
              {t('pay_upi')} <ArrowRight className="w-3 h-3" />
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Main UPIPayment Component ────────────────────────────────────────────────
const UPIPayment = ({ amount, ticketId, onPaymentInitiated, onPaymentSuccess, onCancel }) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(120);
  const [walletBalance, setWalletBalance] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Check login state and fetch wallet balance
  const refreshUserState = async () => {
    try {
      const storedUser = localStorage.getItem('stpay_user');
      const storedRole = localStorage.getItem('stpay_role');
      const parsedUser = storedUser ? JSON.parse(storedUser) : null;
      const loggedIn = !!(parsedUser && !parsedUser.isAnonymous && storedRole === 'passenger');
      setIsLoggedIn(loggedIn);

      if (loggedIn) {
        const u = await apiService.getMe();
        setWalletBalance(u.walletBalance || 0);
      }
    } catch {
      setIsLoggedIn(false);
    }
  };

  useEffect(() => {
    refreshUserState();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) { onCancel(); return; }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, onCancel]);

  // Load Razorpay script
  useEffect(() => {
    if (document.querySelector('script[src*="razorpay"]')) return;
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    document.body.appendChild(script);
  }, []);

  // When user clicks the wallet tile:
  // - If not logged in → open login modal
  // - If logged in → select wallet
  const handleWalletClick = () => {
    if (!isLoggedIn) {
      setShowLoginModal(true);
    } else {
      setSelected('wallet');
      setError('');
    }
  };

  // After successful login inside the modal
  const handleLoginSuccess = async (user, role) => {
    setShowLoginModal(false);
    await refreshUserState();
    setSelected('wallet');
    setError('');
  };

  const pay = async () => {
    if (!selected) { setError(t('select_payment_method')); return; }
    setProcessing(true); setError('');

    // ── Wallet payment ──────────────────────────────────────────────────────
    if (selected === 'wallet') {
      if (!isLoggedIn) {
        setError(t('sign_in_required_wallet'));
        setSelected('');
        setProcessing(false);
        return;
      }
      if (walletBalance < amount) {
        setError(t('insufficient_balance'));
        setProcessing(false);
        return;
      }
      try {
        await onPaymentSuccess({ paymentId: 'st_wallet', orderId: 'st_wallet', method: 'wallet' });
      } catch (e) {
        setError(e.message || 'Wallet payment failed.');
        setProcessing(false);
      }
      return;
    }

    // ── UPI / Razorpay payment ──────────────────────────────────────────────
    try {
      const orderData = await apiService.createOrder(amount);
      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_T32kruqLCAY8Yp';
      const razorpay = new window.Razorpay({
        key: razorpayKey,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.orderId,
        name: 'ST Pay Lite',
        description: `Ticket ID: ${ticketId}`,
        handler: function (res) {
          console.log('--- ST PAY LITE DEBUG: ONPAID DETAILS ---', res);
          onPaymentSuccess({ 
            paymentId: res.razorpay_payment_id, 
            orderId: res.razorpay_order_id, 
            signature: res.razorpay_signature, 
            method: 'upi' 
          });
        },
        modal: { ondismiss: () => setProcessing(false) },
      });
      razorpay.open();
    } catch (e) {
      console.error('Payment init error:', e.message);
      setError(t('payment_init_failed'));
      setProcessing(false);
    }
  };

  const skip = () => {
    setProcessing(true);
    setTimeout(onPaymentInitiated, 800);
  };

  const progressPercent = (timeLeft / 120) * 100;
  const isDev = window.location.hostname === 'localhost';

  return (
    <>
      {/* Login Modal (bottom sheet) */}
      {showLoginModal && (
        <WalletLoginModal
          onLoginSuccess={handleLoginSuccess}
          onDismiss={() => setShowLoginModal(false)}
        />
      )}

      <div className="animate-fade-in px-4 py-5 flex flex-col h-full">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">{t('complete_payment')}</h2>
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-amber-600 bg-amber-50 rounded-lg px-2.5 py-1.5 mt-2 inline-flex border border-amber-100">
            <Clock className="w-4 h-4" />
            <span>{t('countdown')} {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-slate-100 rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-1000 ease-linear rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Amount Card */}
        <div className="card-inner flex justify-between items-center bg-slate-900 border-none mb-6 text-white shadow-lg shadow-slate-900/20">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('total_payable')}</p>
            <div className="text-3xl font-black tracking-tight leading-none">₹{amount}</div>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-slate-400 font-medium">{t('ticket_id')}</p>
            <p className="font-mono font-bold text-slate-300">{ticketId}</p>
          </div>
        </div>

        {/* Wallet Section */}
        <div className="mb-6">
          <h3 className="label text-slate-400 mb-3">{t('sec_wallet')}</h3>

          <button
            onClick={handleWalletClick}
            className={`w-full mb-4 relative flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 active:scale-95 ${
              selected === 'wallet'
                ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-1 ring-blue-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-[12px]">
                ST
              </div>
              <div className="text-left">
                <p className={`text-[14px] font-bold ${selected === 'wallet' ? 'text-blue-900' : 'text-slate-800'}`}>
                  {t('wallet_title')}
                </p>
                {isLoggedIn ? (
                  <p className={`text-[11px] font-medium ${walletBalance < amount ? 'text-red-500' : 'text-emerald-600'}`}>
                    {t('balance_label')}: ₹{walletBalance}
                    {walletBalance < amount && ` ${t('insufficient')}`}
                  </p>
                ) : (
                  <p className="text-[11px] font-semibold text-amber-600 flex items-center gap-1">
                    <LogIn className="w-3 h-3" />
                    {t('wallet_sub')}
                  </p>
                )}
              </div>
            </div>

            {/* Right side badge */}
            {selected === 'wallet' ? (
              <CheckCircle2 className="w-5 h-5 text-blue-500 animate-scale-in" />
            ) : !isLoggedIn ? (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                {t('sign_in').toUpperCase()}
              </span>
            ) : null}
          </button>

          {/* Razorpay Section */}
          <h3 className="label text-slate-400 mb-3">{t('upi_title')}</h3>
          
          <button
            onClick={() => { setSelected('razorpay'); setError(''); }}
            className={`w-full relative flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 active:scale-95 ${
              selected === 'razorpay'
                ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-1 ring-blue-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                <CreditCard className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <p className={`text-[14px] font-bold ${selected === 'razorpay' ? 'text-blue-900' : 'text-slate-800'}`}>
                  {t('upi_cards')}
                </p>
                <p className="text-[11px] font-medium text-slate-500">
                  {t('upi_sub')}
                </p>
              </div>
            </div>

            {selected === 'razorpay' && (
              <CheckCircle2 className="w-5 h-5 text-blue-500 animate-scale-in" />
            )}
          </button>
        </div>

        {error && <div className="alert-error mb-4 animate-slide-up">{error}</div>}

        <div className="mt-auto space-y-3 pb-8">
          <div className="flex justify-center items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            {t('merchant_sec')}
          </div>

          <button onClick={pay} disabled={!selected || processing} className="btn-primary w-full h-14 text-[15px]">
            {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : `${t('pay_securely')} - ₹${amount}`}
          </button>

          <button onClick={onCancel} disabled={processing} className="btn-secondary w-full">
            {t('cancel_payment')}
          </button>

          {isDev && (
            <button onClick={skip} disabled={processing} className="w-full text-center py-2 text-[12px] font-semibold text-blue-600 hover:text-blue-800 transition-colors mt-2">
              {t('skip_dev')}
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default UPIPayment;