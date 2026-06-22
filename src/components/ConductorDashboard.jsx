import { useState, useEffect, useCallback } from 'react';
import apiService from '../utils/apiService';
import { Search, Check, Loader2, RefreshCw, Activity, Ticket, Clock, ScanLine, X } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { jwtDecode } from 'jwt-decode';
import { useTranslation } from '../utils/translationService';

// Base64URL decode helper
const base64urlDecode = (str) => {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
};

// Convert string to Uint8Array
const str2ab = (str) => {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return bufView;
};

// Verify JWT signature using native Web Crypto API
const verifyJwtOffline = async (token, secretStr) => {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  const [header, payload, signature] = parts;
  const data = header + '.' + payload;
  
  const enc = new TextEncoder();
  const key = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(secretStr),
    { name: "HMAC", hash: { name: "SHA-256" } },
    false,
    ["verify"]
  );
  
  const sigBytes = str2ab(base64urlDecode(signature));
  
  return await window.crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    enc.encode(data)
  );
};

const ConductorDashboard = () => {
  const { t } = useTranslation();
  const [routes, setRoutes] = useState({});
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(null);
  const [showFlash, setShowFlash] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [verificationKey, setVerificationKey] = useState(null);

  // Active Conductor Bus Route
  const [activeBusId, setActiveBusId] = useState('BUS001-AT');

  useEffect(() => {
    apiService.getRoutes().then(setRoutes).catch(console.error);
  }, []);

  // Offline queue state, initialized from localStorage
  const [offlineQueue, setOfflineQueue] = useState(() => {
    try {
      const saved = localStorage.getItem('stpay_offline_scans');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [syncing, setSyncing] = useState(false);

  // Sync offlineQueue with localStorage
  useEffect(() => {
    localStorage.setItem('stpay_offline_scans', JSON.stringify(offlineQueue));
  }, [offlineQueue]);

  const load = useCallback(async () => {
    try {
      const all = await apiService.getTickets();
      // Deduplicate by ticketId just in case
      setTickets(Array.from(new Map(all.map((tk) => [tk.ticketId, tk])).values()));
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    load(); 
    fetchKey();
  }, [load]);

  const fetchKey = async () => {
    try {
      const data = await apiService.getVerificationKey();
      setVerificationKey(data.secret);
    } catch (e) {
      console.warn("Could not load verification key from server. Scanned tickets won't be cryptographically validated offline.");
    }
  };

  // Sync the offline queue with the backend
  const syncOfflineQueue = useCallback(async () => {
    if (syncing) return;
    // Read the latest queue from localStorage to avoid stale closures
    let currentQueue;
    try {
      const saved = localStorage.getItem('stpay_offline_scans');
      currentQueue = saved ? JSON.parse(saved) : [];
    } catch {
      currentQueue = [];
    }
    if (currentQueue.length === 0) return;

    setSyncing(true);
    try {
      await apiService.bulkVerifyTickets(currentQueue);
      setOfflineQueue([]);
      await load();
    } catch (e) {
      console.error('Failed to sync offline queue:', e);
    } finally {
      setSyncing(false);
    }
  }, [syncing, load]);

  // Set up connection event listeners for auto-sync
  useEffect(() => {
    const handleOnline = () => {
      syncOfflineQueue();
    };
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [syncOfflineQueue]);

  // Periodic heartbeat sync check (every 10 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine && offlineQueue.length > 0) {
        syncOfflineQueue();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [offlineQueue.length, syncOfflineQueue]);

  useEffect(() => {
    if (scanning) {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
      scanner.render(
        (decodedText) => {
          scanner.clear();
          setScanning(false);
          handleScanSuccess(decodedText);
        },
        () => { /* ignore continuous errors */ }
      );
      return () => {
        scanner.clear().catch(e => console.error("Failed to clear scanner", e));
      };
    }
  }, [scanning]);

  const handleScanSuccess = async (token) => {
    try {
      // Cryptographically verify signature offline if key is available
      if (verificationKey) {
        const isValid = await verifyJwtOffline(token, verificationKey);
        if (!isValid) {
          throw new Error('Cryptographic signature verification failed');
        }
      }

      // Decode JWT Offline
      const decoded = jwtDecode(token);

      // ── Handle Season Pass Scans ──────────────────────────────────────────
      if (decoded.pid) {
        const isPassExpired = new Date().toISOString() > decoded.ed;
        if (isPassExpired) {
          throw new Error('Pass expired');
        }

        const isAllRoutes = decoded.bid === 'ALL';
        const isRouteMatch = decoded.bid === activeBusId;
        if (!isAllRoutes && !isRouteMatch) {
          throw new Error('Invalid Route for Pass');
        }

        // Haptic and Visual Feedback
        if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
        setShowFlash(true);
        setTimeout(() => setShowFlash(false), 600);

        const verifiedTime = new Date().toLocaleString();
        const checkinTicketId = `PASS_${decoded.pid.substring(0, 4)}_${Date.now().toString().slice(-4)}`;

        const currentBus = routes[activeBusId] || routes['BUS001-AT'] || { busName: 'Unknown Route', direction: '', route: [] };
        const rideTicket = {
          id: `temp_${checkinTicketId}`,
          ticketId: checkinTicketId,
          busId: activeBusId,
          busName: currentBus.busName,
          direction: currentBus.direction,
          fromStation: currentBus.route[0]?.name || 'Pass Checked',
          toStation: currentBus.route[currentBus.route.length - 1]?.name || 'Route End',
          distance: 0,
          passengerCount: 1,
          amount: 0,
          verified: true,
          paymentStatus: 'completed',
          paymentVerified: true,
          verifiedTime,
          bookingTime: verifiedTime,
          passengerUid: decoded.uid,
          paymentMethod: 'pass'
        };

        // Optimistically update tickets list UI
        setTickets((prev) => [rideTicket, ...prev]);

        // Attempt to sync check-in ticket immediately
        try {
          await apiService.addTicket(rideTicket);
          try { await load(); } catch {}
        } catch (e) {
          setOfflineQueue((prev) => {
            if (prev.some((item) => item.ticketId === checkinTicketId)) return prev;
            return [...prev, rideTicket];
          });
        }
        return;
      }

      // ── Handle Single Ride Ticket Scans ───────────────────────────────────
      if (!decoded.tid || !decoded.f || !decoded.t) {
        throw new Error('Invalid ticket format');
      }

      // Visual feedback immediately for offline experience
      if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 600);

      const verifiedTime = new Date().toLocaleString();

      // Optimistically update tickets list UI
      setTickets((prev) => {
        const exists = prev.some((tk) => tk.ticketId === decoded.tid);
        if (exists) {
          return prev.map((tk) =>
            tk.ticketId === decoded.tid
              ? { ...tk, verified: true, paymentVerified: true, verifiedTime }
              : tk
          );
        } else {
          return [
            {
              id: `temp_${decoded.tid}`,
              ticketId: decoded.tid,
              fromStation: decoded.f,
              toStation: decoded.t,
              passengerCount: decoded.px,
              bookingTime: decoded.dt,
              verified: true,
              paymentVerified: true,
              verifiedTime,
              amount: 0,
              isLocalOnly: true
            },
            ...prev
          ];
        }
      });

      // Attempt to sync with backend immediately
      try {
        await apiService.updateTicket(decoded.tid, {
          verified: true, paymentVerified: true, verifiedTime,
        });
        try { await load(); } catch {}
      } catch (e) {
        setOfflineQueue((prev) => {
          if (prev.some((item) => item.ticketId === decoded.tid)) return prev;
          return [...prev, { ticketId: decoded.tid, verifiedTime }];
        });
      }
    } catch (e) {
      setError(e.message === 'Cryptographic signature verification failed' 
        ? 'Invalid ticket: Cryptographic signature verification failed.' 
        : e.message === 'Pass expired' || e.message === 'Invalid Route for Pass'
        ? t('invalid_pass')
        : 'Scanned QR is not a valid ST Pay ticket.');
    }
  };

  const verify = async (ticket) => {
    setVerifying(ticket.ticketId); setError('');
    const verifiedTime = new Date().toLocaleString();

    // Optimistically update UI
    setTickets((prev) => prev.map((tk) =>
      tk.ticketId === ticket.ticketId
        ? { ...tk, verified: true, paymentVerified: true, verifiedTime }
        : tk
    ));

    // Haptic and Visual Feedback
    if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 600);

    try {
      await apiService.updateTicket(ticket.ticketId, {
        verified: true, paymentVerified: true, verifiedTime,
      });
    } catch (e) {
      setOfflineQueue((prev) => {
        if (prev.some((item) => item.ticketId === ticket.ticketId)) return prev;
        return [...prev, { ticketId: ticket.ticketId, verifiedTime }];
      });
    } finally {
      setVerifying(null);
    }
  };

  const pending = tickets.filter((tk) => !tk.verified);
  const verified = tickets.filter((tk) => tk.verified);
  const list = tab === 'pending' ? pending : verified;
  const filtered = search ? list.filter((tk) => tk.ticketId?.toUpperCase().includes(search.toUpperCase())) : list;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 animate-fade-in pb-12 relative">
      {/* Full screen success flash overlay */}
      {showFlash && (
        <div className="fixed inset-0 z-50 bg-emerald-500 flex items-center justify-center animate-fade-in pointer-events-none">
          <Check className="w-32 h-32 text-white drop-shadow-lg" strokeWidth={3} />
        </div>
      )}

      {/* Offline Sync Banner */}
      {offlineQueue.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center text-white flex-shrink-0">
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <p className="text-[13px] font-bold text-amber-900 leading-snug">
                {offlineQueue.length} {t('offline_syncing')}
              </p>
              <p className="text-[11px] font-medium text-amber-600 mt-0.5 leading-snug">
                {syncing ? t('sync_now') : 'Automatic sync pending network connectivity.'}
              </p>
            </div>
          </div>
          {navigator.onLine && (
            <button
              onClick={syncOfflineQueue}
              disabled={syncing}
              className="text-[12px] bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-3 py-2 rounded-xl shadow-sm transition-all flex-shrink-0 active:scale-95"
            >
              Sync
            </button>
          )}
        </div>
      )}

      {/* Conductor Bus Selector */}
      <div className="card p-4 mb-6 shadow-sm">
        <label htmlFor="conductor-bus" className="label text-slate-400 m-0 mb-1">{t('route_badge') || 'Active Route'}</label>
        <select
          id="conductor-bus"
          value={activeBusId}
          onChange={(e) => setActiveBusId(e.target.value)}
          className="field border-none shadow-sm ring-1 ring-slate-200 bg-slate-50 focus:bg-white text-[14px] font-semibold h-11 mt-1"
        >
          {Object.entries(routes).map(([id, r]) => (
            <option key={id} value={id}>
              {r.busName} ({r.direction})
            </option>
          ))}
        </select>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 border-none shadow-md shadow-blue-500/20">
          <Activity className="w-5 h-5 mb-2 text-blue-200" />
          <p className="text-2xl font-black">{tickets.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200 mt-0.5">{t('total')}</p>
        </div>
        <div className="card bg-white p-4">
          <Clock className="w-5 h-5 mb-2 text-amber-500" />
          <p className="text-2xl font-black text-slate-900">{pending.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">{t('pending')}</p>
        </div>
        <div className="card bg-white p-4">
          <Check className="w-5 h-5 mb-2 text-emerald-500" />
          <p className="text-2xl font-black text-slate-900">{verified.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">{t('verified')}</p>
        </div>
      </div>

      {error && <div className="alert-error mb-4">{error}</div>}

      {/* Controls */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search_ticket')}
            className="field pl-9 h-11" aria-label="Search tickets"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
        <button onClick={load} className="w-11 h-11 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-colors shadow-sm active:scale-95" aria-label="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="tab-group mb-5">
        {[
          { id: 'pending', label: `${t('pending')} (${pending.length})` },
          { id: 'verified', label: `${t('verified')} (${verified.length})` },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => { setTab(id); setSearch(''); }}
            className={`tab-item ${tab === id ? 'tab-active' : 'tab-inactive'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Feed */}
      {filtered.length === 0 ? (
        <div className="card p-8 text-center border-dashed border-2">
          <Ticket className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-[13px] font-semibold text-slate-600">
            {t('no_scans') || 'No tickets found'}
          </p>
          {search && <p className="text-[12px] text-slate-400 mt-1">{t('try_different_search')}</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ticket) => (
            <div key={ticket.id} className="card p-4 animate-slide-up transition-all hover:border-blue-200">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-[15px] font-black text-slate-900">{ticket.ticketId}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${
                      ticket.verified ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                    }`}>
                      {ticket.verified ? t('verified') : t('pending')}
                    </span>
                    {ticket.paymentMethod === 'pass' && (
                      <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-100">
                        Pass
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] font-semibold text-slate-700 truncate">{ticket.fromStation} → {ticket.toStation}</p>
                  
                  <div className="flex items-center gap-3 mt-2 text-[12px] font-medium text-slate-500">
                    <span className="text-slate-900 font-bold">₹{ticket.amount}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span>{ticket.passengerCount || 1} pax</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span>{ticket.bookingTime?.split(',')[1]?.trim() || ticket.bookingTime}</span>
                  </div>

                  {ticket.verifiedTime && (
                    <p className="text-[11px] font-bold text-emerald-600 mt-3 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      {t('verified')} {ticket.verifiedTime}
                    </p>
                  )}
                </div>

                {!ticket.verified && (
                  <button
                    onClick={() => verify(ticket)} disabled={verifying === ticket.ticketId}
                    className="w-12 h-12 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-90 border border-blue-100 shadow-sm"
                    aria-label={`Verify ${ticket.ticketId}`}
                  >
                    {verifying === ticket.ticketId
                      ? <Loader2 className="w-5 h-5 animate-spin" />
                      : <Check className="w-5 h-5" strokeWidth={2.5} />
                    }
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Action Button for Scanner — positioned above bottom nav */}
      <button 
        onClick={() => setScanning(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-xl shadow-slate-900/30 hover:bg-slate-800 active:scale-90 transition-all z-40"
        aria-label="Scan ticket QR code"
      >
        <ScanLine className="w-6 h-6" />
      </button>

      {/* Scanner Modal */}
      {scanning && (
        <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex flex-col p-4 animate-fade-in">
          <div className="flex justify-between items-center mb-8 pt-safe">
            <h3 className="text-white font-bold text-lg">{t('scan_ticket_qr')}</h3>
            <button onClick={() => setScanning(false)} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white active:scale-95" aria-label="Close scanner">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="bg-white rounded-[24px] overflow-hidden shadow-2xl p-4">
            <div id="reader" className="w-full"></div>
            <p className="text-center text-[12px] font-medium text-slate-500 mt-4">{t('scan_info')}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConductorDashboard;