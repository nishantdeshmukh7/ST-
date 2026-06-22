import { CheckCircle2, Download, BusFront, ArrowRight } from 'lucide-react';
import QRCodeDisplay from './QRCodeDisplay';
import downloadTicketUtil from '../utils/downloadTicket';
import { useTranslation } from '../utils/translationService';

const TicketSuccess = ({ ticketData, onNewTicket }) => {
  const { t } = useTranslation();
  const downloadTicket = () => {
    downloadTicketUtil(ticketData);
  };

  return (
    <div className="animate-fade-in px-4 py-6 h-full flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Success Icon */}
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 animate-scale-in">
          <CheckCircle2 className="w-8 h-8" strokeWidth={2.5} />
        </div>
        
        <h2 className="text-2xl font-black text-slate-900 tracking-tight text-center">{t('confirmed')}</h2>
        <p className="text-[13px] text-slate-500 mt-1 font-medium text-center mb-8">
          {t('eticket_generated')}
        </p>

        {/* Realistic Digital Ticket */}
        <div className="w-full max-w-sm bg-white rounded-[24px] shadow-xl shadow-slate-200/50 relative overflow-hidden">
          {/* Top colored band */}
          <div className="h-2 w-full bg-blue-600" />
          
          <div className="p-6 pb-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('route_badge')}</p>
                <div className="flex items-center gap-1.5 text-blue-900 font-black tracking-tight text-xl">
                  <BusFront className="w-5 h-5 text-blue-600" />
                  {ticketData.busName}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('ticket_id')}</p>
                <p className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md text-[13px]">
                  {ticketData.ticketId}
                </p>
              </div>
            </div>

            {/* Journey */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('boarding')}</p>
                <p className="font-bold text-slate-900 truncate text-[15px]">{ticketData.fromStation}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
              <div className="flex-1 min-w-0 text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('drop_off')}</p>
                <p className="font-bold text-slate-900 truncate text-[15px]">{ticketData.toStation}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-y-4 gap-x-4 mb-6">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('passengers')}</p>
                <p className="font-bold text-slate-900">{ticketData.passengerCount || ticketData.count || 1} {t('adult')}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('distance')}</p>
                <p className="font-bold text-slate-900">{ticketData.distance} km</p>
              </div>
            </div>

            {ticketData.coinsEarned > 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center text-[12px] text-amber-600 border border-amber-200">★</div>
                  <p className="text-[12px] font-bold text-amber-800">{t('st_coins_earned')}</p>
                </div>
                <p className="text-[14px] font-black text-amber-600">+{ticketData.coinsEarned}</p>
              </div>
            )}
          </div>

          {/* Ticket Tear Line (CSS pseudo elements create the cutouts) */}
          <div className="relative h-px w-full bg-transparent flex items-center">
            {/* Left notch */}
            <div className="absolute -left-3 w-6 h-6 bg-slate-50 rounded-full shadow-inner" style={{ clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)' }} />
            {/* Dashed line */}
            <div className="flex-1 border-t-2 border-dashed border-slate-200 mx-3" />
            {/* Right notch */}
            <div className="absolute -right-3 w-6 h-6 bg-slate-50 rounded-full shadow-inner" style={{ clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)' }} />
          </div>

          {/* QR & Status Section */}
          <div className="p-6 bg-slate-50/50 flex flex-col items-center">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm mb-3">
              <QRCodeDisplay value={ticketData.qrToken || ticketData.ticketId} size={110} />
            </div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest text-center">
              {t('show_conductor')}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-3 pb-8 w-full max-w-sm mx-auto">
        <button onClick={onNewTicket} className="btn-primary w-full h-14">
          {t('book_another')}
        </button>
        <button onClick={downloadTicket} className="btn-secondary w-full h-12">
          <Download className="w-4 h-4 text-slate-400" />
          {t('save_device')}
        </button>
      </div>
    </div>
  );
};

export default TicketSuccess;