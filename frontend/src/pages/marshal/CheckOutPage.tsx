import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { ParkingSession } from '../../types';
import {
  Car, Clock, AlertTriangle, CheckCircle2, DollarSign,
  ArrowLeft, Search, RefreshCw, CreditCard
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface CheckOutPageProps {
  currentLotId: number;
}

export const CheckOutPage: React.FC<CheckOutPageProps> = ({ currentLotId }) => {
  const [sessions, setSessions] = useState<ParkingSession[]>([]);
  const [searchPlate, setSearchPlate] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Selected session for checkout
  const [selectedSession, setSelectedSession] = useState<ParkingSession | null>(null);
  const [estimateData, setEstimateData] = useState<any | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI'>('CASH');
  const [isCompleting, setIsCompleting] = useState(false);

  const fetchActiveSessions = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<ParkingSession[]>(`/marshal/active-sessions/${currentLotId}`);
      setSessions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveSessions();
  }, [currentLotId]);

  const handleSelectSession = async (session: ParkingSession) => {
    setSelectedSession(session);
    setIsEstimating(true);
    try {
      const res = await api.get(`/marshal/checkout-estimate/${session.id}`);
      setEstimateData(res.data);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to estimate checkout');
      setSelectedSession(null);
    } finally {
      setIsEstimating(false);
    }
  };

  const handleCompleteCheckOut = async () => {
    if (!selectedSession) return;
    setIsCompleting(true);
    try {
      const res = await api.post('/marshal/checkout', {
        session_id: selectedSession.id,
        payment_method: paymentMethod,
        client_request_id: `checkout-${selectedSession.id}-${Date.now()}`,
      });
      alert(`Vehicle Checked Out! ${res.data.overstay_amount > 0 ? `Overstay collected: ₹${res.data.overstay_amount}` : ''}`);
      setSelectedSession(null);
      setEstimateData(null);
      fetchActiveSessions();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Checkout failed');
    } finally {
      setIsCompleting(false);
    }
  };

  const filteredSessions = sessions.filter((s) =>
    s.plate_actual.toLowerCase().includes(searchPlate.toLowerCase())
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/marshal" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Marshal Desk
        </Link>
        <button
          onClick={fetchActiveSessions}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh List
        </button>
      </div>

      {selectedSession && estimateData ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
              Vehicle Exit & Overstay Settlement
            </span>
            <div className="text-3xl font-mono font-black text-white pt-1">
              {selectedSession.plate_actual}
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400">Checked-in At:</span>
              <span className="text-white font-medium">
                {new Date(estimateData.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400">Scheduled Departure:</span>
              <span className="text-white font-medium">
                {new Date(estimateData.expected_end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-400">Overstay Duration:</span>
              <span className={`font-bold ${estimateData.overstay_minutes > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {estimateData.overstay_minutes > 0 ? `${estimateData.overstay_minutes} Minutes Overstay` : 'On Time (0 min)'}
              </span>
            </div>

            {estimateData.overstay_amount > 0 && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-1 mt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-300">Overstay Fee Payable (1.5x rate):</span>
                  <span className="font-mono text-xl font-black text-rose-400">₹{estimateData.overstay_amount}</span>
                </div>
                <p className="text-[10px] text-rose-400/80">Calculated per started 30-minute block at gate exit</p>
              </div>
            )}
          </div>

          {/* If overstay fee applies, choose cash or UPI */}
          {estimateData.overstay_amount > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Collect Overstay Via:</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`p-3 rounded-2xl border text-xs flex items-center justify-center gap-2 font-bold ${
                    paymentMethod === 'CASH'
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <DollarSign className="w-4 h-4" /> Collect Cash
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('UPI')}
                  className={`p-3 rounded-2xl border text-xs flex items-center justify-center gap-2 font-bold ${
                    paymentMethod === 'UPI'
                      ? 'bg-blue-950/40 border-blue-500 text-blue-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <CreditCard className="w-4 h-4" /> UPI QR Code
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setSelectedSession(null);
                setEstimateData(null);
              }}
              className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3.5 rounded-2xl text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isCompleting}
              onClick={handleCompleteCheckOut}
              className="w-2/3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3.5 rounded-2xl text-xs transition shadow-lg disabled:opacity-50"
            >
              {isCompleting ? 'Processing...' : 'Confirm Exit & Open Barrier'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-black text-white">Vehicle Check-Out</h1>
            <p className="text-xs text-slate-400">Select active parked vehicle to process exit and overstay charges</p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by vehicle license plate..."
              value={searchPlate}
              onChange={(e) => setSearchPlate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          {isLoading ? (
            <div className="py-20 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-400 mx-auto" />
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-slate-400 text-xs space-y-2">
              <Car className="w-10 h-10 text-slate-600 mx-auto" />
              <p>No active parked vehicles currently on ground.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleSelectSession(s)}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl">
                      <Car className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-mono text-base font-bold text-white">{s.plate_actual}</div>
                      <div className="text-[10px] text-slate-400">
                        Parked at {new Date(s.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {s.verification_result}
                      </div>
                    </div>
                  </div>

                  <button className="bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-700">
                    Process Exit
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
