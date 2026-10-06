import React, { useState } from 'react';
import { api } from '../api';
import { Flag, CheckCircle, AlertTriangle, X } from 'lucide-react';

interface ReportModalProps {
  lotId: number;
  lotName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ lotId, lotName, isOpen, onClose }) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setIsSubmitting(true);
    try {
      await api.post('/reports', { lot_id: lotId, message: message.trim() });
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setMessage('');
        onClose();
      }, 1500);
    } catch {
      alert('Failed to submit report. Please check connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
            <Flag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Report Incorrect Info</h3>
            <p className="text-xs text-slate-400">{lotName}</p>
          </div>
        </div>

        {isSuccess ? (
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-2 animate-bounce" />
            <p className="font-semibold text-white">Thank you!</p>
            <p className="text-xs text-slate-400 mt-1">Our municipal admin team will verify and update this lot record.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                What information is inaccurate?
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Rate is outdated, lot is temporarily closed for metro construction, inaccurate 4W capacity, missing lift facility..."
                rows={4}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !message.trim()}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
