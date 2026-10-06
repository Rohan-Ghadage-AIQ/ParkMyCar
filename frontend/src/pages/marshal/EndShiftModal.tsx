import React, { useState } from 'react';
import { api } from '../../api';
import { MarshalShift } from '../../types';
import { X, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';

interface EndShiftModalProps {
  shift: MarshalShift;
  isOpen: boolean;
  onClose: () => void;
  onShiftEnded: () => void;
}

export const EndShiftModal: React.FC<EndShiftModalProps> = ({
  shift,
  isOpen,
  onClose,
  onShiftEnded,
}) => {
  const [cashSubmitted, setCashSubmitted] = useState<string>(shift.cash_collected.toString());
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const expectedCash = shift.cash_collected || 0;
  const enteredCash = parseFloat(cashSubmitted) || 0;
  const discrepancy = enteredCash - expectedCash;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/marshal/shifts/end', {
        shift_id: shift.id,
        cash_submitted: enteredCash,
        notes: notes.trim() || undefined,
      });
      alert('Shift ended successfully! Cash report submitted to Admin.');
      onShiftEnded();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to end shift');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 relative shadow-2xl space-y-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-2xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">End Shift & Cash Submit</h2>
            <p className="text-xs text-slate-400">Shift #{shift.id} Cash Reconciliation</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">System Calculated Cash Collected:</span>
              <span className="font-mono font-bold text-base text-emerald-400">₹{expectedCash}</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 mt-2">
                Physical Cash In Hand (INR)
              </label>
              <input
                type="number"
                step="0.5"
                value={cashSubmitted}
                onChange={(e) => setCashSubmitted(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-lg font-bold focus:outline-none focus:border-amber-400"
                required
              />
            </div>

            {/* Discrepancy indicator */}
            <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
              discrepancy === 0
                ? 'bg-emerald-950/30 border-emerald-800 text-emerald-300'
                : discrepancy > 0
                ? 'bg-blue-950/30 border-blue-800 text-blue-300'
                : 'bg-rose-950/30 border-rose-800 text-rose-300'
            }`}>
              <span>Cash Discrepancy:</span>
              <span className="font-mono font-bold">
                {discrepancy === 0 ? 'Exact Match (₹0)' : discrepancy > 0 ? `+₹${discrepancy} (Surplus)` : `-₹${Math.abs(discrepancy)} (Shortage)`}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Shift Closing Notes / Explanation
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Handed cash to night shift attendant, collected ₹50 mismatch fee..."
              rows={3}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
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
              disabled={isSubmitting}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs transition shadow disabled:opacity-50"
            >
              {isSubmitting ? 'Closing Shift...' : 'Submit & Close Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
