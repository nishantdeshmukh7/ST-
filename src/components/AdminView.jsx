import { useState, useEffect } from 'react';
import QRGenerator from './QRGenerator';
import apiService from '../utils/apiService';
import { RefreshCw, Download, Database, KeySquare, Ticket, Plus, Trash2, MapPin, Route } from 'lucide-react';
import { useTranslation } from '../utils/translationService';

const AdminView = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState('qr');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);

  // Custom route state
  const [routes, setRoutes] = useState({});
  const [routesLoading, setRoutesLoading] = useState(false);
  const [newBusId, setNewBusId] = useState('');
  const [newBusName, setNewBusName] = useState('');
  const [newDirection, setNewDirection] = useState('');
  const [newStops, setNewStops] = useState([]);
  const [stopNameInput, setStopNameInput] = useState('');
  const [stopDistanceInput, setStopDistanceInput] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (tab === 'data') loadTickets();
    if (tab === 'routes') loadRoutes();
  }, [tab]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const all = await apiService.getTickets();
      setTickets(all);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadRoutes = async () => {
    setRoutesLoading(true);
    try {
      const res = await apiService.getRoutes();
      setRoutes(res || {});
    } catch (err) {
      console.error(err);
    } finally {
      setRoutesLoading(false);
    }
  };

  const handleAddStop = () => {
    if (!stopNameInput.trim()) return;
    const dist = parseFloat(stopDistanceInput);
    if (isNaN(dist) || dist < 0) return;
    
    // Sort stops dynamically by distance
    const updated = [...newStops, { name: stopNameInput.trim(), distance: dist }]
      .sort((a, b) => a.distance - b.distance);
    
    setNewStops(updated);
    setStopNameInput('');
    setStopDistanceInput('');
    setFormError('');
  };

  const handleRemoveStop = (idx) => {
    setNewStops(newStops.filter((_, i) => i !== idx));
  };

  const handleSaveRoute = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    if (!newBusId.trim() || !newBusName.trim() || !newDirection.trim()) {
      setFormError('All fields are required');
      return;
    }
    if (newStops.length < 2) {
      setFormError('At least 2 stops are required');
      return;
    }
    if (newStops[0].distance !== 0) {
      setFormError(t('invalid_stops_order'));
      return;
    }
    
    // Check increasing distances
    for (let i = 1; i < newStops.length; i++) {
      if (newStops[i].distance <= newStops[i - 1].distance) {
        setFormError(t('invalid_stops_order'));
        return;
      }
    }

    try {
      setRoutesLoading(true);
      await apiService.createRoute({
        busId: newBusId.trim(),
        busName: newBusName.trim(),
        direction: newDirection.trim(),
        stops: newStops
      });
      
      setNewBusId('');
      setNewBusName('');
      setNewDirection('');
      setNewStops([]);
      setFormError('');
      setSuccessMessage(t('route_saved_success'));
      await loadRoutes();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setRoutesLoading(false);
    }
  };

  const handleDeleteRoute = async (busId) => {
    if (!window.confirm(`Are you sure you want to delete ${busId}?`)) return;
    setSuccessMessage('');
    try {
      setRoutesLoading(true);
      await apiService.deleteRoute(busId);
      setSuccessMessage(t('route_delete_success'));
      await loadRoutes();
    } catch (err) {
      alert(err.message);
    } finally {
      setRoutesLoading(false);
    }
  };

  return (
    <div className="px-4 py-6 animate-fade-in pb-12">
      <div className="tab-group mb-6">
        <button
          onClick={() => setTab('qr')}
          className={`tab-item ${tab === 'qr' ? 'tab-active' : 'tab-inactive'}`}
        >
          <KeySquare className="w-4 h-4" /> {t('select_route_generator') || 'Generate QR'}
        </button>
        <button
          onClick={() => setTab('routes')}
          className={`tab-item ${tab === 'routes' ? 'tab-active' : 'tab-inactive'}`}
        >
          <Route className="w-4 h-4" /> {t('routes_tab') || 'Routes'}
        </button>
        <button
          onClick={() => setTab('data')}
          className={`tab-item ${tab === 'data' ? 'tab-active' : 'tab-inactive'}`}
        >
          <Database className="w-4 h-4" /> {t('sys_data') || 'System Data'}
        </button>
      </div>

      {tab === 'qr' && <QRGenerator />}

      {tab === 'routes' && (
        <div className="space-y-6">
          {/* Create Route Card */}
          <div className="card p-5 animate-slide-up">
            <h3 className="text-[15px] font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              {t('create_custom_route')}
            </h3>

            {formError && (
              <div className="p-3 mb-4 text-xs font-semibold bg-rose-50 border border-rose-100 text-rose-600 rounded-lg">
                {formError}
              </div>
            )}
            
            {successMessage && (
              <div className="p-3 mb-4 text-xs font-semibold bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-lg">
                {successMessage}
              </div>
            )}

            <form onSubmit={handleSaveRoute} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    {t('bus_id')}
                  </label>
                  <input
                    type="text"
                    className="field text-xs"
                    value={newBusId}
                    onChange={(e) => setNewBusId(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                    placeholder="e.g. BUS004-KT"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    {t('bus_name')}
                  </label>
                  <input
                    type="text"
                    className="field text-xs"
                    value={newBusName}
                    onChange={(e) => setNewBusName(e.target.value)}
                    placeholder="e.g. Kalyan-Thane Shuttle"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    {t('direction')}
                  </label>
                  <input
                    type="text"
                    className="field text-xs"
                    value={newDirection}
                    onChange={(e) => setNewDirection(e.target.value)}
                    placeholder={t('direction_placeholder')}
                    required
                  />
                </div>
              </div>

              {/* Stops management */}
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                <h4 className="text-[12px] font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  {t('stops_list')}
                </h4>

                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    className="field text-xs flex-1 bg-white"
                    value={stopNameInput}
                    onChange={(e) => setStopNameInput(e.target.value)}
                    placeholder={t('stop_name')}
                  />
                  <input
                    type="number"
                    step="0.1"
                    className="field text-xs w-28 bg-white"
                    value={stopDistanceInput}
                    onChange={(e) => setStopDistanceInput(e.target.value)}
                    placeholder={t('distance_km')}
                  />
                  <button
                    type="button"
                    onClick={handleAddStop}
                    className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {newStops.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {newStops.map((stop, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white border border-slate-100 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 shadow-sm">
                        <span className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          {stop.name}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400 text-[10px]">{stop.distance} km</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveStop(idx)}
                            className="text-rose-500 hover:text-rose-600 transition-colors p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 font-medium py-2 text-center">No stops added yet.</p>
                )}
              </div>

              <button
                type="submit"
                disabled={routesLoading}
                className="btn-primary w-full text-xs py-2.5"
              >
                {t('save_route')}
              </button>
            </form>
          </div>

          {/* List Routes Card */}
          <div className="card p-5 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[15px] font-bold text-slate-900">{t('manage_routes')}</h3>
                <p className="text-[11px] text-slate-500 font-medium">View and delete existing bus routes</p>
              </div>
              <button
                onClick={loadRoutes}
                disabled={routesLoading}
                className="p-2 bg-slate-50 border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${routesLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {routesLoading && Object.keys(routes).length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-6">{t('preparing')}</p>
            ) : Object.keys(routes).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(routes).map(([busId, r]) => (
                  <div key={busId} className="border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all rounded-xl p-4 bg-slate-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider rounded-md border border-blue-100">
                          {busId}
                        </span>
                        <h4 className="text-[13px] font-bold text-slate-900">{r.busName}</h4>
                      </div>
                      <p className="text-[10px] text-slate-500 font-semibold">{r.direction}</p>
                      
                      <div className="pt-2 flex flex-wrap gap-1.5 items-center">
                        {r.route.map((stop, sidx) => (
                          <div key={sidx} className="flex items-center">
                            <span className="text-[10px] font-semibold text-slate-600 bg-white border border-slate-100 px-1.5 py-0.5 rounded">
                              {stop.name} <span className="text-slate-400 font-normal">({stop.distance}km)</span>
                            </span>
                            {sidx < r.route.length - 1 && (
                              <span className="text-slate-300 mx-1 text-xs">➔</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleDeleteRoute(busId)}
                      className="p-2 border border-rose-100 text-rose-500 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-colors self-end md:self-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-xs text-slate-400 py-6">{t('no_routes')}</p>
            )}
          </div>
        </div>
      )}

      {tab === 'data' && (
        <div className="card p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-[15px] font-bold text-slate-900">{t('db_dump')}</h3>
              <p className="text-[11px] text-slate-500 font-medium">{t('export_records')}</p>
            </div>
            <button onClick={loadTickets} disabled={loading} className="p-2 bg-slate-50 border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-100 transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="card-inner flex items-center justify-between mb-5">
            <div className="flex items-center gap-3 text-slate-700">
              <Ticket className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-[13px] font-bold text-slate-900">{tickets.length}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('total_tickets')}</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              const str = JSON.stringify(tickets, null, 2);
              const blob = new Blob([str], { type: 'application/json' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = `stpay_dump_${Date.now()}.json`;
              a.click();
            }}
            disabled={tickets.length === 0}
            className="btn-secondary w-full"
          >
            <Download className="w-4 h-4" /> {t('download_json')}
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminView;