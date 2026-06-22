import { useState, useEffect, useRef } from 'react';
import apiService from '../utils/apiService';
import generateTicketId from '../utils/generateTicketId';
import UPIPayment from './UPIPayment';
import { Loader2, Navigation, MapPin, AlertCircle, ArrowRight, ArrowDownUp, Tag } from 'lucide-react';
import { useTranslation } from '../utils/translationService';

const TicketForm = ({ onTicketSuccess, busId, fromQR }) => {
  const { t } = useTranslation();
  const [routes, setRoutes] = useState({});
  const [routesLoading, setRoutesLoading] = useState(true);
  const [selectedBusId, setSelectedBusId] = useState(busId);
  const [count, setCount] = useState(1);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [error, setError] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [ticketDocId, setTicketDocId] = useState('');
  const [ticketData, setTicketData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const ticketIdRef = useRef(''); // Ref to always have the latest ticketId synchronously

  const [coupons, setCoupons] = useState([]);
  const [selectedCouponCode, setSelectedCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const checkAndLoadAuth = () => {
    const storedUser = localStorage.getItem('stpay_user');
    const storedRole = localStorage.getItem('stpay_role');
    const parsedUser = storedUser ? JSON.parse(storedUser) : null;
    const logged = !!(parsedUser && !parsedUser.isAnonymous && storedRole === 'passenger');
    setIsLoggedIn(logged);

    if (logged) {
      apiService.getMyRedemptions().then(all => {
        const activeCoupons = all.filter(c => c.rewardCategory === 'ticket_discount' && c.status === 'active');
        setCoupons(activeCoupons);
      }).catch(err => console.warn('Could not load passenger coupons', err));
    } else {
      setCoupons([]);
      setSelectedCouponCode('');
      setCouponDiscount(0);
    }
  };

  useEffect(() => {
    checkAndLoadAuth();
    window.addEventListener('stpay_auth_changed', checkAndLoadAuth);
    window.addEventListener('storage', checkAndLoadAuth);
    return () => {
      window.removeEventListener('stpay_auth_changed', checkAndLoadAuth);
      window.removeEventListener('storage', checkAndLoadAuth);
    };
  }, []);

  const [densities, setDensities] = useState({});

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const res = await apiService.getRoutes();
        setRoutes(res || {});
      } catch (err) {
        console.error('Failed to load routes in TicketForm:', err);
      } finally {
        setRoutesLoading(false);
      }
    };
    fetchRoutes();
  }, []);

  const bus = routes[selectedBusId] || routes['BUS001-AT'];
  const stops = bus?.route || [];

  useEffect(() => {
    setSelectedBusId(busId);
    setFrom('');
    setTo('');
  }, [busId]);

  useEffect(() => {
    const fetchDensity = async () => {
      try {
        const data = await apiService.getCrowdDensity();
        setDensities(data);
      } catch (e) {
        console.warn('Could not fetch crowd density from backend:', e);
      }
    };
    fetchDensity();
  }, []);

  const dist = (() => {
    if (!from || !to) return 0;
    const fi = stops.findIndex((s) => s.name === from);
    const ti = stops.findIndex((s) => s.name === to);
    return fi < ti ? stops[ti].distance - stops[fi].distance : 0;
  })();

  const total = dist * count * 2;

  const createTicket = async (status, extra = {}) => {
    const currentTicketId = ticketIdRef.current || ticketId;
    const ticket = {
      ticketId: currentTicketId, busId: selectedBusId, busName: bus.busName, direction: bus.direction,
      fromStation: from, toStation: to, distance: dist, passengerCount: count,
      amount: Math.max(0, total - couponDiscount), verified: false, paymentStatus: status,
      paymentVerified: status === 'completed',
      timestamp: new Date().toISOString(), bookingTime: new Date().toLocaleString(),
      couponCode: selectedCouponCode,
      ...extra,
    };
    const created = await apiService.addTicket(ticket);
    setTicketDocId(created.id);
    return created;
  };

  const submit = async () => {
    setError(''); setSubmitting(true);
    try {
      if (!from || !to) throw new Error(t('select_stations'));
      if (from === to) throw new Error(t('same_station'));
      const fi = stops.findIndex((s) => s.name === from);
      const ti = stops.findIndex((s) => s.name === to);
      if (fi >= ti) throw new Error(t('desc_order'));
      if (!dist) throw new Error(t('invalid_route'));
      const id = await generateTicketId();
      ticketIdRef.current = id; // Sync ref so UPIPayment gets it immediately
      setTicketId(id);
      setShowPayment(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const onPaid = async (details) => {
    console.log('--- ST PAY LITE DEBUG: ONPAID DETAILS ---', details);
    try {
      const ticket = ticketDocId
        ? await apiService.updateTicket(ticketId, {
            paymentStatus: 'completed', paymentVerified: true,
            paymentId: details.paymentId, orderId: details.orderId,
            paymentMethod: details.method, signature: details.signature
          })
        : await createTicket('completed', { 
            paymentId: details.paymentId, orderId: details.orderId, paymentMethod: details.method, signature: details.signature
          });
      onTicketSuccess({ ...ticket, note: 'Payment successful.' });
    } catch (e) {
      setError(e.message);
    }
    setShowPayment(false);
  };

  const onInitiated = async () => {
    try {
      const ticket = await createTicket('pending');
      onTicketSuccess({ ...ticket, note: 'Show to conductor for verification.' });
    } catch (e) {
      setError(e.message);
    }
    setShowPayment(false);
  };

  const handleRouteChange = (e) => {
    setSelectedBusId(e.target.value);
    setFrom('');
    setTo('');
  };

  if (routesLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[40vh] gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-[13px] font-medium">{t('preparing')}</p>
      </div>
    );
  }

  if (!bus) {
    return (
      <div className="card p-6 text-center animate-fade-in">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-slate-900">Invalid Configuration</h3>
        <p className="text-[13px] text-slate-500 mt-1">Please scan a valid bus QR code.</p>
      </div>
    );
  }

  if (showPayment) {
    return (
      <UPIPayment
        amount={Math.max(0, total - couponDiscount)} ticketId={ticketIdRef.current || ticketId}
        onPaymentInitiated={onInitiated}
        onPaymentSuccess={onPaid}
        onCancel={() => { setShowPayment(false); setTicketId(''); ticketIdRef.current = ''; setTicketDocId(''); }}
      />
    );
  }

  return (
    <div className="animate-fade-in px-4 py-5">
      {/* Route Badge */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">{t('book_ticket')}</h2>
          <p className="text-[13px] font-medium text-slate-500 mt-0.5">{t('plan_journey')}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 flex items-center gap-2 shadow-sm">
          <Navigation className="w-4 h-4 text-blue-600" />
          <div className="text-right flex flex-col items-end">
            <p className="text-[11px] font-extrabold text-blue-900 tracking-wide uppercase leading-none">{bus.busName}</p>
            <p className="text-[9px] font-bold text-blue-600 uppercase mt-0.5 leading-none">{bus.direction}</p>
            {/* Dynamic Crowd Badge */}
            {(() => {
              const density = densities[selectedBusId];
              const level = density ? density.level : 'low';
              let colorClass = 'text-green-600 bg-green-50 border-green-200';
              let text = t('crowd_low');
              if (level === 'medium') {
                colorClass = 'text-amber-600 bg-amber-50 border-amber-200';
                text = t('crowd_medium');
              } else if (level === 'high') {
                colorClass = 'text-red-600 bg-red-50 border-red-200';
                text = t('crowd_high');
              }
              return (
                <span className={`inline-block text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border mt-1.5 leading-none ${colorClass}`}>
                  {text}
                </span>
              );
            })()}
          </div>
        </div>
      </div>

      {error && <div className="alert-error mb-5 animate-slide-up">{error}</div>}

      <div className="card p-5 mb-6 shadow-md shadow-slate-200/50">
        {/* Route Selector */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="route-select" className="label text-slate-400 m-0">{t('select_route')}</label>
            {fromQR && (
              <span className="text-[9px] bg-green-50 text-green-700 font-extrabold px-2 py-0.5 rounded-full border border-green-200/50 uppercase tracking-wider">
                Scanned QR
              </span>
            )}
          </div>
          <select
            id="route-select"
            value={selectedBusId}
            onChange={handleRouteChange}
            className="field border-none shadow-sm ring-1 ring-slate-200 bg-slate-50 focus:bg-white text-[14px] font-semibold h-12"
          >
            {Object.entries(routes).map(([id, r]) => {
              const density = densities[id];
              let densityText = '';
              if (density) {
                if (density.level === 'low') densityText = ` (${t('crowd_low')})`;
                else if (density.level === 'medium') densityText = ` (${t('crowd_medium')})`;
                else if (density.level === 'high') densityText = ` (${t('crowd_high')})`;
              } else {
                densityText = ` (${t('crowd_low')})`;
              }
              return (
                <option key={id} value={id}>
                  {r.busName} ({r.direction}){densityText}
                </option>
              );
            })}
          </select>
        </div>

        <div className="relative space-y-4 pt-4 border-t border-slate-100">
          {/* Journey Route Connector */}
          <div className="absolute left-[15px] top-[40px] bottom-[40px] w-0.5 bg-slate-200" aria-hidden="true" />

          {/* From */}
          <div className="relative pl-10">
            <div className="absolute left-1.5 top-3 w-3.5 h-3.5 bg-white border-[3px] border-blue-600 rounded-full z-10 shadow-sm" aria-hidden="true" />
            <label htmlFor="from" className="label text-slate-400">{t('boarding_point')}</label>
            <select id="from" value={from} onChange={(e) => setFrom(e.target.value)} className="field border-none shadow-sm ring-1 ring-slate-200 bg-slate-50 focus:bg-white text-[14px] font-semibold h-12">
              <option value="">{t('select_boarding')}</option>
              {stops.slice(0, -1).map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </div>

          <div className="relative h-2 flex items-center justify-center -my-2 z-20">
            <div className="w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 absolute left-[-1px]">
              <ArrowDownUp className="w-3 h-3" />
            </div>
          </div>

          {/* To */}
          <div className="relative pl-10">
            <div className="absolute left-[7px] top-3 w-3 h-3 bg-slate-400 rounded-full z-10 shadow-sm" aria-hidden="true" />
            <label htmlFor="to" className="label text-slate-400">{t('dropoff_point')}</label>
            <select id="to" value={to} onChange={(e) => setTo(e.target.value)} className="field border-none shadow-sm ring-1 ring-slate-200 bg-slate-50 focus:bg-white text-[14px] font-semibold h-12">
              <option value="">{t('select_dropoff')}</option>
              {stops.slice(1).map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {/* Passenger count */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <label className="label text-slate-400">{t('passengers')}</label>
          <div className="tab-group h-12 mt-2">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n} type="button" onClick={() => setCount(n)}
                className={`tab-item text-[14px] ${count === n ? 'tab-active' : 'tab-inactive'}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Coupon Selector Card */}
      {dist > 0 && isLoggedIn && coupons.length > 0 && (
        <div className="card p-4 mb-4 shadow-sm border border-amber-200 bg-amber-50/20 animate-slide-up">
          <label htmlFor="coupon-select" className="label text-amber-800 m-0 mb-1.5 font-bold flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-amber-600" />
            {t('apply_coupon')}
          </label>
          <select
            id="coupon-select"
            value={selectedCouponCode}
            onChange={(e) => {
              const code = e.target.value;
              setSelectedCouponCode(code);
              const selected = coupons.find(c => c.code === code);
              setCouponDiscount(selected ? selected.rewardValue : 0);
            }}
            className="field border-none shadow-sm ring-1 ring-slate-200 bg-white focus:bg-white text-[13px] font-semibold h-11 mt-1 cursor-pointer"
          >
            <option value="">{t('no_coupon')}</option>
            {coupons.map(c => (
              <option key={c.id} value={c.code}>
                {c.rewardTitle} ({c.code}) - Save ₹{c.rewardValue}
              </option>
            ))}
          </select>
          {selectedCouponCode && (
            <p className="text-[11px] font-bold text-emerald-600 mt-2">
              ✓ {t('coupon_applied')} -₹{couponDiscount}
            </p>
          )}
        </div>
      )}

      {/* Fare Card */}
      {dist > 0 && (
        <div className="card-inner mb-6 animate-slide-up border-blue-100 bg-blue-50/50 shadow-sm">
          <div className="flex justify-between items-center text-[13px] text-slate-600 font-medium mb-1.5">
            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-blue-500" /> {t('journey_dist')}</span>
            <span className="text-slate-900">{dist} km</span>
          </div>
          <div className="flex justify-between items-center text-[13px] text-slate-600 font-medium pb-3 border-b border-blue-100/60 border-dashed">
            <span>{t('fare_per_px')}</span>
            <span className="text-slate-900">₹{dist * 2}</span>
          </div>
          {couponDiscount > 0 && (
            <div className="flex justify-between items-center text-[13px] text-slate-600 font-medium pb-3 border-b border-blue-100/60 border-dashed mt-2">
              <span>Coupon Discount</span>
              <span className="text-emerald-600 font-bold">-₹{couponDiscount}</span>
            </div>
          )}
          <div className="flex justify-between items-end mt-3">
            <span className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">{t('total_amount')}</span>
            <span className="text-3xl font-black text-blue-600 tracking-tight leading-none">₹{Math.max(0, total - couponDiscount)}</span>
          </div>
        </div>
      )}

      <button
        onClick={submit}
        disabled={!from || !to || !dist || submitting}
        className="btn-primary w-full h-14 text-[15px]"
      >
        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
          <>
            {t('proceed_payment')}
            <ArrowRight className="w-4 h-4 ml-1" />
          </>
        )}
      </button>
    </div>
  );
};

export default TicketForm;
