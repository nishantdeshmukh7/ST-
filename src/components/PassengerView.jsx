import { useState, useEffect } from 'react';
import TicketForm from './TicketForm';
import TicketSuccess from './TicketSuccess';
import QRLanding from './QRLanding';
import QRCodeDisplay from './QRCodeDisplay';
import apiService from '../utils/apiService';
import { Ticket, History, Loader2, CheckCircle2, ChevronRight, Wallet, Plus, ArrowRight, X, Calendar, Eye, EyeOff, Gift, Star, Tag } from 'lucide-react';
import { useTranslation } from '../utils/translationService';

const OnboardingModal = ({ onComplete }) => {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-scale-in">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight text-center mb-6">{t('welcome_to_stpay')}</h2>
        <div className="space-y-5 mb-8">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black flex-shrink-0">1</div>
            <div>
              <p className="font-bold text-slate-900">{t('onboarding_step1_title')}</p>
              <p className="text-[13px] text-slate-500 font-medium">{t('onboarding_step1_desc')}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black flex-shrink-0">2</div>
            <div>
              <p className="font-bold text-slate-900">{t('onboarding_step2_title')}</p>
              <p className="text-[13px] text-slate-500 font-medium">{t('onboarding_step2_desc')}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black flex-shrink-0">3</div>
            <div>
              <p className="font-bold text-slate-900">{t('onboarding_step3_title')}</p>
              <p className="text-[13px] text-slate-500 font-medium">{t('onboarding_step3_desc')}</p>
            </div>
          </div>
        </div>
        <button onClick={onComplete} className="btn-primary w-full h-14">
          {t('get_started')}
        </button>
      </div>
    </div>
  );
};

const WalletAuthView = ({ onAuthSuccess }) => {
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
      await fn.call(apiService, email, password);
      // Dispatch global auth event so App header updates too
      window.dispatchEvent(new Event('stpay_auth_changed'));
      onAuthSuccess();
    } catch (err) {
      setError(err.message || (mode === 'login' ? t('signin_failed') : t('register_failed')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 animate-fade-in pb-8">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-sm border border-blue-100">
          <Wallet className="w-8 h-8 text-blue-600" strokeWidth={1.5} />
        </div>
        <h2 className="text-xl font-black tracking-tight text-slate-900">{t('wallet_title')}</h2>
        <p className="text-[13px] font-medium text-slate-500 mt-1">
          {mode === 'login' ? t('wallet_acc_info') : t('wallet_acc_register')}
        </p>
      </div>

      <div className="card p-5 shadow-md shadow-slate-200/50">
        <div className="tab-group mb-5">
          <button
            onClick={() => { setMode('login'); setError(''); }}
            className={`tab-item text-[13px] ${mode === 'login' ? 'tab-active' : 'tab-inactive'}`}
          >
            {t('sign_in')}
          </button>
          <button
            onClick={() => { setMode('register'); setError(''); }}
            className={`tab-item text-[13px] ${mode === 'register' ? 'tab-active' : 'tab-inactive'}`}
          >
            {t('create_acc')}
          </button>
        </div>

        {error && <div className="alert-error mb-4 animate-slide-up">{error}</div>}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="wallet-tab-email" className="label">{t('email_addr')}</label>
            <input
              id="wallet-tab-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="wallet-tab-pw" className="label">{t('password')} {mode === 'register' && <span className="normal-case font-normal text-slate-400">{t('min_char')}</span>}</label>
            <div className="relative">
              <input
                id="wallet-tab-pw"
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
          <button type="submit" disabled={loading} className="btn-primary w-full h-12 mt-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : mode === 'login' ? t('sign_in') : t('create_acc')}
          </button>
        </form>
      </div>
    </div>
  );
};

const PassengerView = ({ busId, fromQR, user, setUser }) => {
  const { t } = useTranslation();
  const [ticketData, setTicketData] = useState(null);
  const [started, setStarted] = useState(!fromQR);
  const [tab, setTab] = useState('booking'); // 'booking' | 'history' | 'wallet' | 'passes'
  const [myTickets, setMyTickets] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [recharging, setRecharging] = useState(false);
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Passes states
  const [passes, setPasses] = useState([]);
  const [loadingPasses, setLoadingPasses] = useState(false);
  const [showPurchasePass, setShowPurchasePass] = useState(false);
  const [passBusId, setPassBusId] = useState('ALL');
  const [passType, setPassType] = useState('weekly'); // 'weekly' | 'monthly'
  const [calculatedPassPrice, setCalculatedPassPrice] = useState(300);
  const [buyingPassState, setBuyingPassState] = useState(false);
  const [passError, setPassError] = useState('');
  const [selectedPass, setSelectedPass] = useState(null);

  // Rewards states
  const [rewards, setRewards] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [loadingRewards, setLoadingRewards] = useState(false);
  // Storing stCoins in global user state; no local state needed

  const [routes, setRoutes] = useState({});

  useEffect(() => {
    apiService.getRoutes().then(setRoutes).catch(console.error);
  }, []);

  const checkLoginState = () => {
    const storedUser = localStorage.getItem('stpay_user');
    const storedRole = localStorage.getItem('stpay_role');
    const parsedUser = storedUser ? JSON.parse(storedUser) : null;
    // Must be a real (non-anonymous) user AND specifically a passenger role
    // Admins and conductors who log in should NOT be treated as passenger here
    const loggedInAsPassenger = !!(parsedUser && !parsedUser.isAnonymous && storedRole === 'passenger');
    setIsLoggedIn(loggedInAsPassenger);
  };

  useEffect(() => {
    checkLoginState();
    window.addEventListener('stpay_auth_changed', checkLoginState);
    // Also sync on cross-tab login/logout (native storage event)
    window.addEventListener('storage', checkLoginState);
    return () => {
      window.removeEventListener('stpay_auth_changed', checkLoginState);
      window.removeEventListener('storage', checkLoginState);
    };
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('stpay_onboarded')) {
      setShowOnboarding(true);
    }
  }, []);

  // Update pass price dynamically
  useEffect(() => {
    let price = 0;
    if (passType === 'weekly') {
      price = passBusId === 'ALL' ? 300 : 150;
    } else {
      price = passBusId === 'ALL' ? 900 : 500;
    }
    setCalculatedPassPrice(price);
  }, [passBusId, passType]);

  useEffect(() => {
    if (tab === 'history' && isLoggedIn) loadHistory();
    if (tab === 'wallet' && isLoggedIn) loadWallet();
    if (tab === 'passes' && isLoggedIn) loadPasses();
    if (tab === 'rewards' && isLoggedIn) loadRewardsData();
  }, [tab, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn && (tab === 'wallet' || tab === 'history' || tab === 'passes' || tab === 'rewards')) {
      setTab('booking');
    }
  }, [isLoggedIn, tab]);

  // Load Razorpay script
  useEffect(() => {
    if (document.querySelector('script[src*="razorpay"]')) return;
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    document.body.appendChild(script);
  }, []);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const tickets = await apiService.getMyTickets();
      setMyTickets(tickets);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadWallet = async () => {
    try {
      const user = await apiService.getMe();
      setWalletBalance(user.walletBalance || 0);
    } catch (err) {
      console.error(err);
    }
  };

  const loadPasses = async () => {
    setLoadingPasses(true);
    try {
      const all = await apiService.getMyPasses();
      setPasses(all);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPasses(false);
    }
  };

  const loadRewardsData = async () => {
    setLoadingRewards(true);
    try {
      const [allRewards, allRedemptions, me] = await Promise.all([
        apiService.getRewards(),
        apiService.getMyRedemptions(),
        apiService.getMe()
      ]);
      setRewards(allRewards);
      setRedemptions(allRedemptions);
      setUser(prev => ({ ...prev, stCoins: me.stCoins || 0 }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRewards(false);
    }
  };

  const handleRedeem = async (rewardId) => {
    setLoadingRewards(true); setError('');
    try {
      const res = await apiService.redeemReward(rewardId);
      if (res.success) {
        setUser(prev => ({ ...prev, stCoins: res.stCoins }));
        // Refresh redemptions list
        const allRedemptions = await apiService.getMyRedemptions();
        setRedemptions(allRedemptions);
        // If it was a wallet recharge, update local balance
        if (res.walletBalance !== undefined) {
          setWalletBalance(res.walletBalance);
          window.dispatchEvent(new Event('wallet_updated'));
        }
      }
    } catch (err) {
      setError(err.message || 'Redemption failed');
    } finally {
      setLoadingRewards(false);
    }
  };

  const handleBuyPass = async () => {
    setBuyingPassState(true); setPassError('');
    try {
      const selectedBusName = passBusId === 'ALL' ? 'All Routes' : (routes[passBusId]?.busName || passBusId);
      await apiService.buyPass({
        busId: passBusId,
        busName: selectedBusName,
        type: passType,
        paymentMethod: 'wallet'
      });
      await loadWallet();
      await loadPasses();
      setShowPurchasePass(false);
    } catch (err) {
      setPassError(err.message || 'Pass purchase failed');
    } finally {
      setBuyingPassState(false);
    }
  };

  const rechargeWallet = async (amount) => {
    setRecharging(true); setError('');
    try {
      const orderData = await apiService.createOrder(amount);
      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_T32kruqLCAY8Yp';
      const razorpay = new window.Razorpay({
        key: razorpayKey,
        amount: orderData.amount, currency: orderData.currency, order_id: orderData.orderId,
        name: 'ST Pay Lite Wallet', description: `Recharge Wallet`,
        handler: async function (res) {
          try {
            const result = await apiService.rechargeWallet(
              amount, 
              res.razorpay_payment_id, 
              res.razorpay_order_id, 
              res.razorpay_signature
            );
            setWalletBalance(result.newBalance);
            window.dispatchEvent(new Event('wallet_updated'));
          } catch(e) {
            setError(t('wallet_update_failed'));
          }
        },
        modal: { ondismiss: () => setRecharging(false) },
      });
      razorpay.open();
    } catch (e) {
      setError(t('payment_init_failed'));
      setRecharging(false);
    }
  };

  const handleOnboarded = () => {
    localStorage.setItem('stpay_onboarded', 'true');
    setShowOnboarding(false);
  };

  const startBooking = () => {
    if (fromQR) setStarted(true);
  };

  if (showOnboarding) {
    return <OnboardingModal onComplete={handleOnboarded} />;
  }

  if (ticketData) {
    return (
      <TicketSuccess 
        ticketData={ticketData} 
        onNewTicket={() => { setTicketData(null); setTab('history'); }} 
      />
    );
  }

  if (fromQR && !started) {
    return <QRLanding busId={busId} onEnterApp={startBooking} />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top Tabs */}
      <div className="px-4 py-3 bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="tab-group text-[11px]">
          <button onClick={() => setTab('booking')} className={`tab-item px-1 ${tab === 'booking' ? 'tab-active' : 'tab-inactive'}`}>
            <Ticket className="w-3.5 h-3.5" /> {t('book_tab')}
          </button>
          {isLoggedIn && (
            <button onClick={() => setTab('wallet')} className={`tab-item px-1 ${tab === 'wallet' ? 'tab-active' : 'tab-inactive'}`}>
              <Wallet className="w-3.5 h-3.5" /> {t('wallet_tab')}
            </button>
          )}
          {isLoggedIn && (
            <button onClick={() => setTab('history')} className={`tab-item px-1 ${tab === 'history' ? 'tab-active' : 'tab-inactive'}`}>
              <History className="w-3.5 h-3.5" /> {t('history_tab')}
            </button>
          )}
          {isLoggedIn && (
            <button onClick={() => setTab('passes')} className={`tab-item px-1 ${tab === 'passes' ? 'tab-active' : 'tab-inactive'}`}>
              <Calendar className="w-3.5 h-3.5" /> {t('passes_tab')}
            </button>
          )}
          {isLoggedIn && (
            <button onClick={() => setTab('rewards')} className={`tab-item px-1 ${tab === 'rewards' ? 'tab-active' : 'tab-inactive'}`}>
              <Gift className="w-3.5 h-3.5" /> {t('rewards_tab')}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'booking' && (
          <TicketForm 
            busId={busId} 
            fromQR={fromQR} 
            onTicketSuccess={setTicketData} 
          />
        )}
        
        {tab === 'wallet' && (
          isLoggedIn ? (
            <div className="p-4 animate-fade-in pb-8">
              <h2 className="text-xl font-black text-slate-900 tracking-tight mb-4">{t('wallet_title')}</h2>
              
              <div className="card bg-slate-900 text-white p-6 mb-6 shadow-xl shadow-slate-900/20 relative overflow-hidden border-none">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full -translate-y-1/2 translate-x-1/3 blur-xl" />
                <div className="relative z-10">
                  <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('wallet_balance')}</p>
                  <div className="text-4xl font-black tracking-tight leading-none mb-4">₹{walletBalance}</div>
                  <p className="text-[13px] text-slate-300 font-medium">{(t('wallet_info'))}</p>
                </div>
              </div>

              {error && <div className="alert-error mb-4">{error}</div>}

              <h3 className="label text-slate-400 mb-3">{t('recharge_amount')}</h3>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[100, 200, 500].map(amt => (
                  <button 
                    key={amt} onClick={() => rechargeWallet(amt)} disabled={recharging}
                    className="bg-white border border-slate-200 rounded-xl py-3 font-bold text-slate-700 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 active:scale-95 transition-all"
                  >
                    +₹{amt}
                  </button>
                ))}
              </div>

              <button onClick={() => rechargeWallet(1000)} disabled={recharging} className="btn-primary w-full h-14 bg-slate-900 hover:bg-slate-800 shadow-slate-900/20">
                {recharging ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    <Plus className="w-5 h-5" /> {t('add_custom')}
                  </>
                )}
              </button>
            </div>
          ) : (
            <WalletAuthView onAuthSuccess={() => {
              checkLoginState();
              loadWallet();
            }} />
          )
        )}

        {tab === 'history' && (
          <div className="p-4 animate-fade-in pb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">{t('trip_history')}</h2>
              {myTickets.length > 0 && (
                <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                  {myTickets.length} {myTickets.length === 1 ? 'ride' : 'rides'}
                </span>
              )}
            </div>

            {loadingHistory ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
                <p className="text-[13px] font-medium">Loading your rides…</p>
              </div>
            ) : myTickets.length === 0 ? (
              <div className="card p-10 text-center text-slate-500 border-dashed border-2 flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <Ticket className="w-7 h-7 text-slate-300" />
                </div>
                <p className="font-bold text-[15px] text-slate-700">{t('no_past_rides')}</p>
                <p className="text-[12px] mt-1 text-slate-400">{t('no_past_sub')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myTickets.map(ticket => (
                  <div
                    key={ticket.id}
                    className="card p-4 active:scale-[0.98] transition-all cursor-pointer hover:border-blue-200 hover:shadow-md"
                    onClick={() => setTicketData(ticket)}
                  >
                    {/* Top row: date + amount */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">
                          {ticket.bookingTime?.split(',')[0]}
                        </p>
                        <p className="text-[15px] font-extrabold text-slate-900 leading-tight">
                          {ticket.fromStation}
                          <span className="text-slate-400 mx-1.5 font-normal">→</span>
                          {ticket.toStation}
                        </p>
                        {ticket.busName && (
                          <p className="text-[11px] font-semibold text-slate-400 mt-0.5">{ticket.busName}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[16px] font-black text-blue-600">₹{ticket.amount}</p>
                        {ticket.verified ? (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md mt-1">
                            <CheckCircle2 className="w-2.5 h-2.5" /> {t('verified')}
                          </span>
                        ) : (
                          <span className="inline-block text-[9px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-md mt-1">
                            {t('pending')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom row: ticket ID + coins */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <p className="text-[11px] font-semibold text-slate-400 font-mono">{ticket.ticketId}</p>
                      <div className="flex items-center gap-2">
                        {ticket.coinsEarned > 0 && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${
                            ticket.coinsAwarded
                              ? 'text-amber-600 bg-amber-50 border border-amber-100'
                              : 'text-slate-400 bg-slate-50 border border-slate-100'
                          }`}>
                            ★ {ticket.coinsEarned} {ticket.coinsAwarded ? 'earned' : 'pending'}
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            )}
          </div>
        )}

        {tab === 'passes' && (
          isLoggedIn ? (
            <div className="p-4 animate-fade-in pb-8">
              {/* Show selected Pass QR Modal if click on a pass */}
              {selectedPass && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
                  <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-scale-in text-center relative">
                    <button
                      onClick={() => setSelectedPass(null)}
                      className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <h3 className="text-lg font-black text-slate-900 mb-1">{t('pass_qr_title')}</h3>
                    <p className="text-[12px] text-slate-500 font-medium mb-6">
                      {selectedPass.busName === 'ALL' ? t('all_routes') : selectedPass.busName} ({selectedPass.type === 'weekly' ? t('weekly_pass') : t('monthly_pass')})
                    </p>
                    <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm inline-block mb-4">
                      <QRCodeDisplay value={selectedPass.qrToken} size={180} />
                    </div>
                    <div className="block">
                      <span className="font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg text-sm inline-block mb-4">
                        {selectedPass.passId}
                      </span>
                    </div>
                    <div className="text-[12px] font-medium text-slate-500 space-y-1 mt-2">
                      <p>Start: {new Date(selectedPass.startDate).toLocaleDateString()}</p>
                      <p>Expiry: {new Date(selectedPass.endDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Purchase New Pass Section */}
              {showPurchasePass ? (
                <div className="animate-slide-up">
                  <div className="flex items-center gap-2 mb-4">
                    <button onClick={() => setShowPurchasePass(false)} className="text-xs font-bold text-slate-400 hover:text-slate-950 transition-colors">
                      ← Back
                    </button>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">{t('purchase_pass')}</h2>
                  </div>

                  <div className="card p-5 mb-6 shadow-md shadow-slate-200/50 space-y-4">
                    <div>
                      <label htmlFor="pass-route" className="label">{t('select_route')}</label>
                      <select
                        id="pass-route"
                        value={passBusId}
                        onChange={(e) => setPassBusId(e.target.value)}
                        className="field border-none shadow-sm ring-1 ring-slate-200 bg-slate-50 focus:bg-white text-[14px] font-semibold h-12 mt-1"
                      >
                        <option value="ALL">{t('all_routes')}</option>
                        {Object.entries(routes).map(([id, r]) => (
                          <option key={id} value={id}>
                            {r.busName} ({r.direction})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label">Duration</label>
                      <div className="tab-group h-12 mt-2">
                        <button
                          type="button" onClick={() => setPassType('weekly')}
                          className={`tab-item text-[13px] ${passType === 'weekly' ? 'tab-active' : 'tab-inactive'}`}
                        >
                          {t('weekly_pass')}
                        </button>
                        <button
                          type="button" onClick={() => setPassType('monthly')}
                          className={`tab-item text-[13px] ${passType === 'monthly' ? 'tab-active' : 'tab-inactive'}`}
                        >
                          {t('monthly_pass')}
                        </button>
                      </div>
                    </div>

                    <div className="card-inner bg-blue-50/50 border-blue-100 p-4">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('total_payable')}</p>
                          <p className="text-3xl font-black text-blue-600 leading-none mt-1">₹{calculatedPassPrice}</p>
                        </div>
                        <div className="text-right text-[11px] font-bold text-slate-400">
                          Balance: ₹{walletBalance}
                        </div>
                      </div>
                    </div>

                    {passError && <div className="alert-error mt-2">{passError}</div>}

                    <button
                      onClick={handleBuyPass}
                      disabled={buyingPassState || walletBalance < calculatedPassPrice}
                      className="btn-primary w-full h-14"
                    >
                      {buyingPassState ? <Loader2 className="w-5 h-5 animate-spin" /> : t('purchase_pass')}
                    </button>
                  </div>
                </div>
              ) : (
                // Passes List View
                <div className="animate-fade-in">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">{t('passes_tab')}</h2>
                    <button
                      onClick={() => { setShowPurchasePass(true); setPassError(''); }}
                      className="text-xs font-bold bg-blue-50 border border-blue-100 text-blue-600 px-3 py-2 rounded-xl flex items-center gap-1 active:scale-95 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> {t('buy_pass')}
                    </button>
                  </div>

                  {loadingPasses ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
                  ) : passes.length === 0 ? (
                    <div className="card p-8 text-center text-slate-500 border-dashed border-2">
                      <Calendar className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                      <p className="font-semibold text-[14px]">{t('no_passes')}</p>
                      <p className="text-[12px] mt-1">{t('no_passes_sub')}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {passes.map(p => {
                        const isActive = new Date().toISOString() <= p.endDate;
                        return (
                          <div
                            key={p.id}
                            onClick={() => setSelectedPass(p)}
                            className="card p-4 active:scale-[0.98] transition-transform cursor-pointer hover:border-blue-200"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                  isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'
                                }`}>
                                  {isActive ? t('active') : t('expired')}
                                </span>
                                <h3 className="text-[15px] font-bold text-slate-900 mt-2">{p.busName === 'All Routes' || p.busId === 'ALL' ? t('all_routes') : p.busName}</h3>
                                <p className="text-[12px] font-semibold text-slate-500 mt-0.5">
                                  {p.type === 'weekly' ? t('weekly_pass') : t('monthly_pass')}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="font-mono text-[12px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border">
                                  {p.passId}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-[11px] font-medium text-slate-500">
                              <span>Exp: {new Date(p.endDate).toLocaleDateString()}</span>
                              <span className="text-blue-600 font-bold flex items-center gap-0.5">Show QR →</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <WalletAuthView onAuthSuccess={() => {
              checkLoginState();
              loadPasses();
            }} />
          )
        )}

        {tab === 'rewards' && (
          isLoggedIn ? (
            <div className="p-4 animate-fade-in pb-8">
              <h2 className="text-xl font-black text-slate-900 tracking-tight mb-2">{t('rewards_title')}</h2>
              
              {/* Coin Balance Card */}
              <div className="card bg-gradient-to-br from-amber-500 to-orange-600 text-white p-5 mb-6 shadow-md border-none relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-xl animate-pulse" />
                <div className="relative z-10">
                  <p className="text-[10px] font-bold text-amber-100 uppercase tracking-widest mb-1.5">{t('wallet_balance')}</p>
                  <div className="text-3xl font-black tracking-tight leading-none flex items-center gap-2">
                    <Star className="w-8 h-8 fill-amber-300 text-amber-300" />
                    {user?.stCoins ?? 0} {t('coins')}
                  </div>
                </div>
              </div>

              {error && <div className="alert-error mb-4">{error}</div>}

              {loadingRewards ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
              ) : (
                <div className="space-y-6">
                  {/* Rewards Catalog */}
                  <div className="space-y-3">
                    {rewards.map(reward => {
                      const canRedeem = (user?.stCoins ?? 0) >= reward.cost;
                      let categoryIcon = <Gift className="w-5 h-5 text-purple-500" />;
                      if (reward.category === 'ticket_discount') {
                        categoryIcon = <Ticket className="w-5 h-5 text-blue-500" />;
                      } else if (reward.category === 'wallet_recharge') {
                        categoryIcon = <Wallet className="w-5 h-5 text-emerald-500" />;
                      } else if (reward.category === 'merchant_voucher') {
                        categoryIcon = <Tag className="w-5 h-5 text-orange-500" />;
                      }

                      return (
                        <div key={reward.id} className="card p-4 flex items-center justify-between gap-4 transition-all hover:border-amber-200">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0 border">
                              {categoryIcon}
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-[14px] font-extrabold text-slate-900 leading-snug">{reward.title}</h3>
                              <p className="text-[11px] text-slate-500 font-medium leading-snug mt-0.5">{reward.description}</p>
                              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide">
                                Partner: {reward.partnerName}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-[13px] font-black text-amber-600 mb-1.5">{reward.cost} {t('coins')}</p>
                            <button
                              onClick={() => handleRedeem(reward.id)}
                              disabled={!canRedeem}
                              className={`text-[11px] font-extrabold px-3 py-1.5 rounded-lg transition-all active:scale-95 ${
                                canRedeem 
                                  ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm'
                                  : 'bg-slate-100 text-slate-400 border cursor-not-allowed'
                              }`}
                            >
                              {t('redeem_btn')}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Redeemed Vouchers */}
                  {redemptions.length > 0 && (
                    <div className="pt-4 border-t">
                      <h3 className="text-sm font-black text-slate-900 tracking-tight mb-3 flex items-center gap-1.5">
                        <Tag className="w-4 h-4 text-slate-600" />
                        {t('my_vouchers')}
                      </h3>
                      <div className="space-y-2.5">
                        {redemptions.map(v => {
                          const isUsed = v.status === 'used';
                          return (
                            <div 
                              key={v.id} 
                              className={`card-inner p-3.5 flex justify-between items-center transition-all ${
                                isUsed ? 'bg-slate-50/50 border-slate-100 opacity-60' : 'bg-white border-slate-200'
                              }`}
                            >
                              <div className="min-w-0">
                                <h4 className="text-[13px] font-extrabold text-slate-900 leading-snug">{v.rewardTitle}</h4>
                                <p className="text-[11px] text-slate-500 font-medium leading-snug mt-0.5">{v.rewardDescription}</p>
                                <div className="mt-2 flex items-center gap-2">
                                  <span className="font-mono text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border">
                                    {v.code}
                                  </span>
                                  {isUsed && (
                                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                      Used
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right text-[10px] font-bold text-slate-400">
                                {new Date(v.redeemedAt).toLocaleDateString()}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <WalletAuthView onAuthSuccess={() => {
              checkLoginState();
              loadRewardsData();
            }} />
          )
        )}
      </div>
    </div>
  );
};

export default PassengerView;