import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { Booking } from '../../types';
import {
  FileText, Search, ArrowLeft, RefreshCw, Edit2, X, Check
} from 'lucide-react';

export const BookingsListPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchCode, setSearchCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Override plate modal
  const [overrideBooking, setOverrideBooking] = useState<Booking | null>(null);
  const [overridePlate, setOverridePlate] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (filterStatus) params.status = filterStatus;
      const res = await api.get<Booking[]>('/admin/bookings', { params });
      setBookings(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [filterStatus]);

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideBooking || !overridePlate.trim()) return;
    setIsUpdating(true);
    try {
      await api.patch(`/bookings/${overrideBooking.id}/update-plate`, {
        new_plate: overridePlate.trim(),
      });
      alert('Admin license plate override saved and logged to audit trail!');
      setOverrideBooking(null);
      fetchBookings();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Override failed');
    } finally {
      setIsUpdating(false);
    }
  };

  const filtered = bookings.filter((b) =>
    b.booking_code.toLowerCase().includes(searchCode.toLowerCase()) ||
    b.plate_at_booking.toLowerCase().includes(searchCode.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/admin" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Admin Operations Center
        </Link>
        <button
          onClick={fetchBookings}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh List
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-black text-white">All Bookings & Reservations</h1>
        <p className="text-xs text-slate-400">
          Search all municipal digital passes, audit status changes, and perform admin plate overrides
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by 6-char code or vehicle plate number..."
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white"
        >
          <option value="">All Booking Statuses</option>
          <option value="CONFIRMED">CONFIRMED (Upcoming)</option>
          <option value="CHECKED_IN">CHECKED_IN (Active)</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="CANCELLED">CANCELLED</option>
          <option value="NO_SHOW">NO_SHOW (Penalty applied)</option>
          <option value="MISMATCH_REJECTED">MISMATCH_REJECTED</option>
        </select>
      </div>

      {/* Bookings Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Code</th>
                <th className="py-3.5 px-4">Lot</th>
                <th className="py-3.5 px-4">Plate Number</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Slot Time</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Admin Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-mono font-black text-amber-400">{b.booking_code}</td>
                  <td className="py-3.5 px-4 font-medium text-white">{b.lot?.name || `Lot #${b.lot_id}`}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-100">{b.plate_at_booking}</td>
                  <td className="py-3.5 px-4 text-slate-400">{b.vehicle_class.replace('_', ' ')}</td>
                  <td className="py-3.5 px-4 text-slate-400">
                    <div>{new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    <div className="text-[10px]">{new Date(b.start_time).toLocaleDateString()}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-white">₹{b.amount_paid}</td>
                  <td className="py-3.5 px-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      b.status === 'CONFIRMED' ? 'bg-blue-500/20 text-blue-400' :
                      b.status === 'CHECKED_IN' ? 'bg-emerald-500/20 text-emerald-400' :
                      b.status === 'COMPLETED' ? 'bg-slate-800 text-slate-300' :
                      'bg-rose-500/20 text-rose-400'
                    }`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => {
                        setOverrideBooking(b);
                        setOverridePlate(b.plate_at_booking);
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-2.5 py-1 rounded-lg text-[11px] border border-slate-700 flex items-center gap-1 ml-auto"
                    >
                      <Edit2 className="w-3 h-3 text-amber-400" />
                      <span>Plate</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Override Modal */}
      {overrideBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-sm p-6 relative shadow-2xl space-y-4">
            <button
              onClick={() => setOverrideBooking(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-bold text-purple-400 uppercase">Admin Plate Override</span>
              <h3 className="text-lg font-bold text-white">Booking #{overrideBooking.booking_code}</h3>
            </div>

            <form onSubmit={handleOverrideSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">New License Plate:</label>
                <input
                  type="text"
                  value={overridePlate}
                  onChange={(e) => setOverridePlate(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono uppercase font-bold"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOverrideBooking(null)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-1.5 rounded-xl transition shadow"
                >
                  {isUpdating ? 'Saving...' : 'Confirm Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
