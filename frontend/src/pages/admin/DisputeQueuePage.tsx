import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { Dispute, DisputeStatus } from '../../types';
import {
  AlertTriangle, CheckCircle, XCircle, DollarSign,
  ArrowLeft, RefreshCw, Eye, Image as ImageIcon
} from 'lucide-react';

export const DisputeQueuePage: React.FC = () => {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const fetchDisputes = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<Dispute[]>('/admin/disputes');
      setDisputes(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

  const handleResolve = async (disputeId: number, status: DisputeStatus, note: string) => {
    setIsResolving(true);
    try {
      await api.post(`/admin/disputes/${disputeId}/resolve`, {
        status,
        note,
      });
      alert(`Dispute updated: ${status}`);
      fetchDisputes();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to resolve dispute');
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/admin" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Admin Operations Center
        </Link>
        <button
          onClick={fetchDisputes}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Queue
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-black text-white">Mismatch & Dispute Queue</h1>
        <p className="text-xs text-slate-400">
          Review on-ground vehicle plate mismatches, attendant photo captures, and issue official refunds
        </p>
      </div>

      {isLoading ? (
        <div className="py-20 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-400 mx-auto" />
        </div>
      ) : disputes.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 text-xs space-y-2">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
          <p className="font-bold text-white text-base">All Clean! No Pending Disputes</p>
          <p>Any gate mismatches or attendant escalation tickets will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map((d) => (
            <div
              key={d.id}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded border border-amber-400/20">
                    Ticket #{d.id} • Booking #{d.booking?.booking_code}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    d.status === 'OPEN' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                    d.status === 'REFUNDED' ? 'bg-emerald-500/20 text-emerald-400' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {d.status}
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  Logged on {new Date(d.created_at).toLocaleString()}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Booking Details:</span>
                  <div className="font-bold text-white">{d.booking?.lot?.name || 'Lot'}</div>
                  <div className="text-slate-300 font-mono mt-0.5">
                    Expected Plate: <strong className="text-amber-400">{d.booking?.plate_at_booking}</strong>
                  </div>
                  <div className="text-slate-400">Amount Paid: ₹{d.booking?.amount_paid}</div>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5">Attendant Reason & Notes:</span>
                  <div className="font-semibold text-rose-300">{d.reason}</div>
                  <div className="text-slate-400 mt-0.5 italic">{d.note || 'No additional note provided'}</div>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5">Physical Car Proof:</span>
                  {d.photo_path ? (
                    <button
                      onClick={() => setSelectedPhoto(d.photo_path || null)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
                    >
                      <ImageIcon className="w-4 h-4 text-blue-400" />
                      <span>View Attendant Photo</span>
                    </button>
                  ) : (
                    <span className="text-slate-500 italic">No photo uploaded</span>
                  )}
                </div>
              </div>

              {d.status === 'OPEN' && (
                <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-end gap-2">
                  <button
                    disabled={isResolving}
                    onClick={() => handleResolve(d.id, 'REFUNDED', 'Admin approved 100% refund for mismatch')}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Approve & Issue 100% Refund (₹{d.booking?.amount_paid})</span>
                  </button>

                  <button
                    disabled={isResolving}
                    onClick={() => handleResolve(d.id, 'REJECTED', 'Admin rejected dispute')}
                    className="bg-slate-800 hover:bg-slate-700 text-rose-400 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition border border-slate-700"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Dismiss Dispute</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Photo Viewer Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-4 max-w-lg w-full relative">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 bg-slate-800 text-white p-2 rounded-full hover:bg-slate-700"
            >
              ✕
            </button>
            <h3 className="font-bold text-white mb-2 text-sm">Gate Physical Car Capture</h3>
            <img
              src={`http://localhost:8000${selectedPhoto}`}
              alt="Verification Car Proof"
              className="w-full max-h-[400px] object-contain rounded-2xl bg-black"
            />
          </div>
        </div>
      )}
    </div>
  );
};
