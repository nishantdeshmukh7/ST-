import { useState, useEffect } from 'react';
import apiService from '../utils/apiService';
import { Bus, CheckCircle2, ArrowRight } from 'lucide-react';
import { useTranslation } from '../utils/translationService';

const QRLanding = ({ onEnterApp, busId }) => {
  const { t } = useTranslation();
  const [routes, setRoutes] = useState({});

  useEffect(() => {
    apiService.getRoutes().then(setRoutes).catch(console.error);
  }, []);

  const bus = routes[busId] || routes['BUS001-AT'] || { busName: t('preparing'), direction: '' };

  return (
    <div className="animate-fade-in px-4 py-8 h-full flex flex-col justify-center max-w-sm mx-auto">
      <div className="card border-none shadow-2xl shadow-blue-900/5 overflow-hidden">
        
        <div className="bg-blue-600 p-8 text-white text-center relative overflow-hidden">
          {/* Subtle background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full translate-y-1/3 -translate-x-1/3" />
          
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl mx-auto flex items-center justify-center mb-5 border border-white/30 relative z-10 shadow-lg">
            <Bus className="w-8 h-8 text-white" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-blue-200 mb-1 relative z-10">{t('connected_to')}</p>
          <h1 className="text-2xl font-black tracking-tight leading-tight relative z-10">{bus.busName}</h1>
          <p className="text-[13px] font-medium text-blue-100 mt-2 relative z-10">{bus.direction}</p>
        </div>

        <div className="p-6 bg-white">
          <ul className="space-y-4 text-[13px] font-medium text-slate-600 mb-8">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span>{t('rate_info')}</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span>{t('max_pax_info')}</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span>{t('pay_instantly_info')}</span>
            </li>
          </ul>
          
          <button onClick={onEnterApp} className="btn-primary w-full h-14 text-[15px]">
            {t('start_booking')}
            <ArrowRight className="w-5 h-5 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRLanding;
