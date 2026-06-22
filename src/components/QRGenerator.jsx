import { useState, useEffect } from 'react';
import QRCodeDisplay from './QRCodeDisplay';
import apiService from '../utils/apiService';
import { Download, ChevronDown, Route } from 'lucide-react';
import QRCode from 'qrcode';
import { useTranslation } from '../utils/translationService';

const QRGenerator = () => {
  const { t } = useTranslation();
  const [routes, setRoutes] = useState({});
  const [bus, setBus] = useState('BUS001-AT');
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const res = await apiService.getRoutes();
        setRoutes(res || {});
        if (res && Object.keys(res).length > 0) {
          setError('');
          if (!res[bus]) {
            setBus(Object.keys(res)[0]);
          }
        } else {
          setError(t('no_routes'));
        }
      } catch (err) {
        setError(err.message || 'Failed to load routes');
      }
    };
    fetchRoutes();
  }, [t]);

  const qrUrl = `${window.location.href.split('?')[0]}?bus=${bus}`;
  const info = routes[bus];

  const download = async () => {
    setDownloading(true);
    try {
      const dataUrl = await QRCode.toDataURL(qrUrl, { width: 500, margin: 1 });
      const r = await fetch(dataUrl);
      const blob = await r.blob();
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `QR_${bus}.png`; a.click(); URL.revokeObjectURL(a.href);
    } catch (e) {
      console.error("Failed to download QR code offline", e);
    }
    setDownloading(false);
  };

  if (error) {
    return <div className="alert-error animate-fade-in">{error}</div>;
  }

  return (
    <div className="card p-5 animate-slide-up shadow-md shadow-slate-200/50">
      <div className="mb-5">
        <label htmlFor="route" className="label">{t('select_route_generator')}</label>
        <div className="relative">
          <select id="route" value={bus} onChange={(e) => setBus(e.target.value)} className="field appearance-none pr-10 font-bold bg-slate-50">
            {Object.entries(routes).map(([id, r]) => (
              <option key={id} value={id}>{id} — {r.busName}</option>
            ))}
          </select>
          <ChevronDown className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {info && (
        <div className="card-inner mb-6 bg-blue-50/50 border-blue-100 flex items-start gap-3">
          <Route className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[14px] font-bold text-blue-900 leading-tight">{info.busName}</p>
            <p className="text-[12px] font-medium text-slate-500 mt-1">
              {info.route?.[0]?.name} → {info.route?.[info.route.length - 1]?.name}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mt-1.5">{info.direction}</p>
          </div>
        </div>
      )}

      <div className="flex justify-center mb-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 ring-4 ring-slate-50">
          <QRCodeDisplay value={qrUrl} size={180} />
        </div>
      </div>

      <button onClick={download} disabled={downloading} className="btn-primary w-full h-12">
        <Download className="w-4 h-4" />
        {downloading ? t('preparing') : t('download_print_qr')}
      </button>
    </div>
  );
};

export default QRGenerator;