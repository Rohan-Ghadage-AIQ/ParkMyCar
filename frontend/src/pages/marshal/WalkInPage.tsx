import React, { useState } from 'react';
import { api } from '../../api';
import { Lot, VehicleClass } from '../../types';
import { Car, CreditCard, DollarSign, CheckCircle, ArrowLeft, Receipt } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface WalkInPageProps {
  currentLotId: number;
}

export const WalkInPage: React.FC<WalkInPageProps> = ({ currentLotId }) => {
  const navigate = useNavigate();
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleClass, setVehicleClass] = useState<VehicleClass>('FOUR_WHEELER');
  const [durationHours, setDurationHours] = useState(2);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI'>('CASH');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptData, setReceiptData] = useState<any | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plateNumber.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await api.post('/marshal/walkin', {
        lot_id: currentLotId,
        plate_number: plateNumber.trim(),
        vehicle_class: vehicleClass,
        duration_hours: durationHours,
        payment_method: paymentMethod,
        client_request_id: `walkin-${Date.now()}`,
      });
      setReceiptData(res.data);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Walk-in registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/marshal" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Marshal Desk
        </Link>
        <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
          Walk-In Parking Gate
        </span>
      </div>

      {receiptData ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
          <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto animate-bounce" />
          <h2 className="text-2xl font-bold text-white">Walk-in Entry Registered!</h2>

          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-3 text-left">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
              <span className="text-slate-400">Digital Receipt No:</span>
              <span className="font-mono font-bold text-amber-400">{receiptData.receipt_no}</span>
            </div>
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
              <span className="text-slate-400">Vehicle Number:</span>
              <span className="font-mono font-black text-white text-base">{receiptData.plate}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Amount Paid ({paymentMethod}):</span>
              <span className="font-mono font-black text-emerald-400 text-lg">₹{receiptData.amount_collected}</span>
            </div>
          </div>

          <button
            onClick={() => {
              setReceiptData(null);
              setPlateNumber('');
            }}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-2xl text-xs transition shadow"
          >
            Register Next Walk-in Vehicle
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
          <div>
            <h1 className="text-2xl font-black text-white">Walk-in Gate Entry</h1>
            <p className="text-xs text-slate-400">Log unregistered street vehicles and collect payment directly</p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Vehicle License Plate</label>
              <input
                type="text"
                placeholder="e.g. MH01AB1234"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-lg font-mono font-black tracking-widest text-amber-400 uppercase focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Vehicle Category</label>
                <select
                  value={vehicleClass}
                  onChange={(e) => setVehicleClass(e.target.value as VehicleClass)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white"
                >
                  <option value="FOUR_WHEELER">4-Wheeler Car</option>
                  <option value="TWO_WHEELER">2-Wheeler Bike</option>
                  <option value="LCV">LCV / Commercial</option>
                  <option value="AUTO_TAXI">Auto / Taxi</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Expected Duration</label>
                <select
                  value={durationHours}
                  onChange={(e) => setDurationHours(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white"
                >
                  <option value={1}>1 Hour</option>
                  <option value={2}>2 Hours</option>
                  <option value={4}>4 Hours</option>
                  <option value={8}>8 Hours</option>
                  <option value={12}>12 Hours (Full Day)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Payment Method</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`p-3 rounded-2xl border flex items-center justify-center gap-2 font-bold transition ${
                    paymentMethod === 'CASH'
                      ? 'bg-emerald-900/40 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <DollarSign className="w-4 h-4" /> Cash Handed
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('UPI')}
                  className={`p-3 rounded-2xl border flex items-center justify-center gap-2 font-bold transition ${
                    paymentMethod === 'UPI'
                      ? 'bg-blue-900/40 border-blue-500 text-blue-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <CreditCard className="w-4 h-4" /> UPI QR Code
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !plateNumber.trim()}
            className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-4 px-4 rounded-2xl text-sm transition shadow-lg disabled:opacity-50"
          >
            {isSubmitting ? 'Logging Entry...' : 'Collect Payment & Raise Barrier'}
          </button>
        </form>
      )}
    </div>
  );
};
