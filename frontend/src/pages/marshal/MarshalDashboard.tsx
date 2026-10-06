import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { Lot, MarshalShift } from '../../types';
import {
  Shield, QrCode, Car, DollarSign, Clock, AlertTriangle,
  CheckCircle2, ArrowRight, UserCheck, AlertCircle, RefreshCw
} from 'lucide-react';
import { EndShiftModal } from './EndShiftModal';

export const MarshalDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [lots, setLots] = useState<Lot[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<number>(1);
  const [occupancyData, setOccupancyData] = useState<any | null>(null);
  const [activeShift, setActiveShift] = useState<MarshalShift | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isEndShiftOpen, setIsEndShiftOpen] = useState(false);
  const [isDeclaringLotFull, setIsDeclaringLotFull] = useState(false);

  const fetchLotsAndShift = async () => {
    try {
      const [lotsRes, shiftRes] = await Promise.all([
        api.get<Lot[]>('/lots?only_bookable=false'),
        api.get<MarshalShift | null>('/marshal/shifts/active'),
      ]);
      setLots(lotsRes.data);
      if (shiftRes.data) {
        setActiveShift(shiftRes.data);
        setSelectedLotId(shiftRes.data.lot_id);
      } else if (lotsRes.data.length > 0) {
        setSelectedLotId(lotsRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOccupancy = async (lotId: number) => {
    try {
      const res = await api.get(`/marshal/occupancy/${lotId}`);
      setOccupancyData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLotsAndShift();
  }, []);

  useEffect(() => {
    if (selectedLotId) {
      fetchOccupancy(selectedLotId);
    }
  }, [selectedLotId]);

  const handleStartShift = async () => {
    try {
      const res = await api.post<MarshalShift>('/marshal/shifts/start', {
        lot_id: selectedLotId,
      });
      setActiveShift(res.data);
      alert('Shift started! All cash collected will be logged to this shift.');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to start shift');
    }
  };

  const handleLotFull = async () => {
    const confirm = window.confirm(
      'Are you sure you want to declare this lot FULL? This will automatically refund 100% of upcoming bookings arriving in the next 1 hour.'
    );
    if (!confirm) return;
    setIsDeclaringLotFull(true);
    try {
      const res = await api.post(`/marshal/lot-full/${selectedLotId}`);
      alert(res.data.message);
      fetchOccupancy(selectedLotId);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to trigger lot full');
    } finally {
      setIsDeclaringLotFull(false);
    }
  };

  const currentLot = lots.find((l) => l.id === selectedLotId);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Marshal Header & Shift Status */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                On-Ground Attendant Console
              </span>
              <h1 className="text-2xl font-black text-white mt-0.5">Marshal Desk</h1>
            </div>
          </div>

          {/* Assigned Lot Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline">Active Lot:</span>
            <select
              value={selectedLotId}
              onChange={(e) => setSelectedLotId(parseInt(e.target.value))}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:border-amber-400"
            >
              {lots.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} (Ward {l.ward})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Shift Status Bar */}
        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {activeShift ? (
            <>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Shift Active (Started {new Date(activeShift.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
                </div>
                <div className="text-slate-300">
                  Cash in hand ledger: <strong className="font-mono text-amber-400 text-sm">₹{activeShift.cash_collected || 0}</strong>
                </div>
              </div>
              <button
                onClick={() => setIsEndShiftOpen(true)}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2 rounded-xl transition shadow"
              >
                End Shift & Reconcile Cash
              </button>
            </>
          ) : (
            <>
              <div className="text-slate-400">
                No shift currently active for this lot. Start your shift to begin collecting cash.
              </div>
              <button
                onClick={handleStartShift}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-5 py-2 rounded-xl transition shadow"
              >
                Start Shift Now
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Action Cards (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Gate Actions</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Scan / Enter QR */}
            <Link
              to="/marshal/scan"
              className="bg-gradient-to-br from-blue-900/60 to-slate-900 border border-blue-700/50 hover:border-blue-500 p-6 rounded-3xl transition shadow-xl group space-y-3"
            >
              <div className="p-3 bg-blue-600 text-white rounded-2xl w-fit group-hover:scale-110 transition-transform">
                <QrCode className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white">1. Verify QR Pass</h3>
                <p className="text-xs text-slate-300 mt-1">
                  Scan customer QR or enter 6-char code. Verify physical car plate matches online booking.
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-blue-400 group-hover:translate-x-1 transition-transform">
                <span>Open Scanner</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>

            {/* 2. Walk-in Car */}
            <Link
              to="/marshal/walkin"
              className="bg-gradient-to-br from-amber-900/40 to-slate-900 border border-amber-700/40 hover:border-amber-500 p-6 rounded-3xl transition shadow-xl group space-y-3"
            >
              <div className="p-3 bg-amber-500 text-slate-950 rounded-2xl w-fit group-hover:scale-110 transition-transform">
                <Car className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white">2. Walk-In Parking</h3>
                <p className="text-xs text-slate-300 mt-1">
                  Register unbooked street driver. Collect cash or UPI, issue instant digital receipt.
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform">
                <span>Register Entry</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>

            {/* 3. Check-out & Overstay */}
            <Link
              to="/marshal/checkout"
              className="bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-700/40 hover:border-emerald-500 p-6 rounded-3xl transition shadow-xl group space-y-3"
            >
              <div className="p-3 bg-emerald-500 text-slate-950 rounded-2xl w-fit group-hover:scale-110 transition-transform">
                <Clock className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white">3. Vehicle Exit & Overstay</h3>
                <p className="text-xs text-slate-300 mt-1">
                  Process exit, calculate 1.5x overstay fee per 30m block, collect balance and raise barrier.
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
                <span>Process Checkout</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>

            {/* 4. Lot Full Trigger */}
            <div className="bg-gradient-to-br from-rose-950/40 to-slate-900 border border-rose-800/40 p-6 rounded-3xl transition shadow-xl space-y-3">
              <div className="p-3 bg-rose-600 text-white rounded-2xl w-fit">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white">4. Declare Lot Full</h3>
                <p className="text-xs text-slate-300 mt-1">
                  Emergency full button. Auto-refunds pending 1-hr arrivals and redirects users to nearby lots.
                </p>
              </div>
              <button
                disabled={isDeclaringLotFull}
                onClick={handleLotFull}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 px-3 rounded-xl text-xs transition shadow"
              >
                {isDeclaringLotFull ? 'Triggering...' : 'Declare Lot Full'}
              </button>
            </div>
          </div>
        </div>

        {/* Live Occupancy & Expected Arrivals (Right col) */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Lot Status</h2>

          {occupancyData && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Occupancy</span>
                  <span className="font-mono font-bold text-white">
                    {occupancyData.current_occupancy} / {occupancyData.total_capacity} bays
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (occupancyData.current_occupancy / (occupancyData.total_capacity || 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">4W Capacity</span>
                  <span className="font-bold text-white text-sm">{occupancyData.capacity_4w}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">2W Capacity</span>
                  <span className="font-bold text-white text-sm">{occupancyData.capacity_2w}</span>
                </div>
              </div>

              {/* Expected arrivals list */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Expected Arrivals (Next 2h)</span>
                  <span className="bg-blue-900/60 text-blue-300 font-bold px-2 py-0.5 rounded text-[10px]">
                    {occupancyData.expected_arrivals_count} cars
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {occupancyData.expected_arrivals.length === 0 ? (
                    <div className="text-[11px] text-slate-500 py-3 text-center">No bookings expected in this window</div>
                  ) : (
                    occupancyData.expected_arrivals.map((arr: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="font-mono font-bold text-amber-400">{arr.plate}</div>
                          <div className="text-[10px] text-slate-400">{arr.booking_code} • {arr.vehicle_class.replace('_', ' ')}</div>
                        </div>
                        <span className="text-[10px] text-slate-300">
                          {new Date(arr.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* End Shift Modal */}
      {activeShift && (
        <EndShiftModal
          shift={activeShift}
          isOpen={isEndShiftOpen}
          onClose={() => setIsEndShiftOpen(false)}
          onShiftEnded={() => {
            setActiveShift(null);
            fetchLotsAndShift();
          }}
        />
      )}
    </div>
  );
};
