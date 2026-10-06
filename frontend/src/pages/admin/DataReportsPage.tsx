import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { DataReport } from '../../types';
import { Flag, ArrowLeft, RefreshCw, CheckCircle, MessageSquare } from 'lucide-react';

export const DataReportsPage: React.FC = () => {
  const [reports, setReports] = useState<DataReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<DataReport[]>('/admin/reports');
      setReports(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/admin" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Admin Operations Center
        </Link>
        <button
          onClick={fetchReports}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Reports
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-black text-white">Citizen Inaccuracy Reports</h1>
        <p className="text-xs text-slate-400">
          User-submitted feedback and correction tickets regarding parking lot locations, hours, and rates
        </p>
      </div>

      {isLoading ? (
        <div className="py-20 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-400 mx-auto" />
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 text-xs space-y-2">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
          <p className="font-bold text-white text-base">No Data Inaccuracy Tickets</p>
          <p>Reports submitted from lot detail pages will appear here for municipal review.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div
              key={r.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs space-y-2 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flag className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-white">Lot #{r.lot_id} Report</span>
                </div>
                <span className="text-slate-500 text-[11px]">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <p className="text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 leading-relaxed">
                "{r.message}"
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
