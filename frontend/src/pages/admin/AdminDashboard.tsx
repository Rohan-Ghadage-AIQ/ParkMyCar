import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import {
  BarChart3, DollarSign, Car, Shield, AlertTriangle,
  Layers, RefreshCw, FileText, ArrowRight, TrendingUp, CheckCircle
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [summaryData, setSummaryData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSummary = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/admin/dashboard-summary');
      setSummaryData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  const m = summaryData?.metrics || {};
  const lots = summaryData?.lots || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Subnav */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded border border-purple-400/20">
            MCGM Municipal Authority Console
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">Admin Operations Center</h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/admin/lots"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-3 py-2 rounded-xl text-xs border border-slate-700 transition"
          >
            Manage Lots & Quotas
          </Link>
          <Link
            to="/admin/disputes"
            className="bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 font-semibold px-3 py-2 rounded-xl text-xs border border-rose-800 transition flex items-center gap-1"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Disputes ({m.open_disputes || 0})</span>
          </Link>
          <Link
            to="/admin/shifts"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-3 py-2 rounded-xl text-xs border border-slate-700 transition"
          >
            Cash Reconciliation
          </Link>
          <Link
            to="/admin/import"
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-2 rounded-xl text-xs transition shadow"
          >
            + Data Import
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Logged Revenue</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono">₹{m.total_revenue || 0}</div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span>UPI Digital: <strong className="text-blue-400">₹{m.digital_revenue || 0}</strong></span>
            <span>Cash: <strong className="text-emerald-400">₹{m.cash_revenue || 0}</strong></span>
          </div>
        </div>

        {/* Total Bookings */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Bookings</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono">{m.total_bookings || 0}</div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span>Active: <strong className="text-emerald-400">{m.active_bookings || 0}</strong></span>
            <span>Completed: <strong className="text-slate-300">{m.completed_bookings || 0}</strong></span>
          </div>
        </div>

        {/* Active Parking Sessions */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Live Parked Cars</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono">{m.active_sessions || 0}</div>
          <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
            Across {m.total_lots || 0} Mumbai parking facilities
          </div>
        </div>

        {/* Mismatch & Dispute Queue */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Open Mismatch Disputes</span>
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono">{m.open_disputes || 0}</div>
          <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
            Requires Admin review & verification
          </div>
        </div>
      </div>

      {/* Per Lot Occupancy and Quota Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Facility Capacity & Live Occupancy</h2>
            <p className="text-xs text-slate-400">Official MCGM, BEST and Private parking network</p>
          </div>
          <button
            onClick={fetchSummary}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Lot Name & Ward</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Total Bays</th>
                <th className="py-3 px-4">Bookable Quota %</th>
                <th className="py-3 px-4">Live Occupancy</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {lots.map((l: any) => (
                <tr key={l.id} className="hover:bg-slate-800/50 transition">
                  <td className="py-3 px-4">
                    <div className="font-bold text-white">{l.name}</div>
                    <div className="text-[10px] text-slate-400">Ward {l.ward || 'Mumbai'}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      l.source === 'MCGM' ? 'bg-blue-950 text-blue-300 border-blue-800' :
                      l.source === 'BEST' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                      'bg-purple-950 text-purple-300 border-purple-800'
                    }`}>
                      {l.source}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-white">{l.capacity || '--'}</td>
                  <td className="py-3 px-4 font-mono">{l.quota_percent}%</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{
                            width: `${Math.min(100, (l.current_occupancy / (l.capacity || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-slate-300">{l.current_occupancy}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      l.bookable ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {l.bookable ? 'Bookable' : 'On-Site Only'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
