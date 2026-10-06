import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { MarshalShift } from '../../types';
import { DollarSign, ArrowLeft, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

export const ShiftReconciliationPage: React.FC = () => {
  const [shifts, setShifts] = useState<MarshalShift[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchShifts = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<MarshalShift[]>('/admin/shifts');
      setShifts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/admin" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Admin Operations Center
        </Link>
        <button
          onClick={fetchShifts}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Shifts
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-black text-white">Marshal Shift & Cash Reconciliation</h1>
        <p className="text-xs text-slate-400">
          Audit on-ground cash collected vs physical cash submitted by attendants across all municipal lots
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Shift ID</th>
                <th className="py-3.5 px-4">Lot ID</th>
                <th className="py-3.5 px-4">Shift Timing</th>
                <th className="py-3.5 px-4">Logged Cash Collected</th>
                <th className="py-3.5 px-4">Physical Cash Submitted</th>
                <th className="py-3.5 px-4">Discrepancy</th>
                <th className="py-3.5 px-4">Notes</th>
                <th className="py-3.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {shifts.map((s) => {
                const disc = s.discrepancy ?? 0;
                return (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">#{s.id}</td>
                    <td className="py-3.5 px-4 font-semibold">Lot #{s.lot_id}</td>
                    <td className="py-3.5 px-4 text-slate-400">
                      <div>{new Date(s.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      <div className="text-[10px]">
                        {s.ended_at ? `Ended ${new Date(s.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Still Active'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">₹{s.cash_collected}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {s.cash_submitted !== null ? `₹${s.cash_submitted}` : '--'}
                    </td>
                    <td className="py-3.5 px-4">
                      {s.ended_at ? (
                        <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                          disc === 0 ? 'bg-emerald-500/10 text-emerald-400' :
                          disc > 0 ? 'bg-blue-500/10 text-blue-400' :
                          'bg-rose-500/10 text-rose-400'
                        }`}>
                          {disc === 0 ? 'Match (₹0)' : disc > 0 ? `+₹${disc}` : `-₹${Math.abs(disc)}`}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">In progress</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px] max-w-xs truncate">
                      {s.notes || 'No notes'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        s.ended_at ? 'bg-slate-800 text-slate-300' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {s.ended_at ? 'Closed' : 'Active'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
