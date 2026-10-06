import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { AuditLog } from '../../types';
import { Shield, ArrowLeft, RefreshCw } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<AuditLog[]>('/admin/audit-logs');
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/admin" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Admin Operations Center
        </Link>
        <button
          onClick={fetchLogs}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Logs
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-black text-white">System Audit Trail</h1>
        <p className="text-xs text-slate-400">
          Immutable chronological ledger of all payments, gate verifications, status changes, overrides, and data imports
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Entity</th>
                <th className="py-3.5 px-4">Entity ID</th>
                <th className="py-3.5 px-4">Metadata Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 font-bold text-white">
                    <span className="font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px] text-purple-300">
                      {l.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-300">{l.entity}</td>
                  <td className="py-3 px-4 font-mono text-amber-400">{l.entity_id || '--'}</td>
                  <td className="py-3 px-4 max-w-md">
                    <pre className="font-mono text-[10px] text-slate-400 bg-slate-950 p-1.5 rounded-lg overflow-x-auto">
                      {JSON.stringify(l.metadata_json || {}, null, 1)}
                    </pre>
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
