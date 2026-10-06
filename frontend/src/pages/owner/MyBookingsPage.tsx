import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { Booking } from '../../types';
import {
  Ticket, Calendar, Clock, MapPin, QrCode, ArrowRight,
  AlertCircle, CheckCircle, Navigation, XCircle
} from 'lucide-react';

export const MyBookingsPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'UPCOMING' | 'ACTIVE' | 'PAST'>('UPCOMING');

  const fetchBookings = async () => {
    try {
      const res = await api.get<Booking[]>('/bookings/my');
      setBookings(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const now = new Date();

  // Categorize bookings
  const upcomingBookings = bookings.filter(
    (b) => b.status === 'CONFIRMED' && new Date(b.end_time) > now
  );
  const activeBookings = bookings.filter((b) => b.status === 'CHECKED_IN');
  const pastBookings = bookings.filter(
    (b) =>
      b.status === 'COMPLETED' ||
      b.status === 'CANCELLED' ||
      b.status === 'NO_SHOW' ||
      b.status === 'MISMATCH_REJECTED' ||
      (b.status === 'CONFIRMED' && new Date(b.end_time) <= now)
  );

  const currentList =
    activeTab === 'ACTIVE'
      ? activeBookings
      : activeTab === 'UPCOMING'
      ? upcomingBookings
      : pastBookings;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">My Parking Passes</h1>
          <p className="text-xs text-slate-400">View upcoming reservations, active parking sessions, and history</p>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm"
        >
          <span>+ Book New Spot</span>
        </Link>
      </div>

      {/* Active Session Warning / Countdown Banner if any */}
      {activeBookings.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/40 p-4 rounded-2xl flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl animate-pulse">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Active Parking Session</span>
              <h3 className="text-sm font-bold text-white">{activeBookings[0].lot?.name}</h3>
              <p className="text-xs text-slate-300">Car: <strong className="font-mono text-amber-400">{activeBookings[0].plate_at_booking}</strong></p>
            </div>
          </div>

          <Link
            to={`/ticket/${activeBookings[0].booking_code}`}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold px-4 py-2 rounded-xl transition flex items-center gap-1 shadow"
          >
            <span>View Ticket</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('UPCOMING')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'UPCOMING'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          Upcoming ({upcomingBookings.length})
        </button>

        <button
          onClick={() => setActiveTab('ACTIVE')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'ACTIVE'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          Active Sessions ({activeBookings.length})
        </button>

        <button
          onClick={() => setActiveTab('PAST')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'PAST'
              ? 'bg-slate-700 text-white shadow-sm'
              : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          Past Bookings ({pastBookings.length})
        </button>
      </div>

      {/* Bookings List */}
      {isLoading ? (
        <div className="py-20 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-400 mx-auto" />
        </div>
      ) : currentList.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <Ticket className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="font-bold text-white text-base">No bookings found in this tab</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Find and pre-book a parking spot in Mumbai with MCGM digital verification.
          </p>
          <Link
            to="/"
            className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-xl text-xs"
          >
            Search Parking
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {currentList.map((booking) => {
            const start = new Date(booking.start_time);
            const end = new Date(booking.end_time);

            return (
              <div
                key={booking.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition shadow-lg space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-extrabold text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded border border-amber-400/20">
                        {booking.booking_code}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        booking.status === 'CHECKED_IN' ? 'bg-emerald-500/20 text-emerald-400' :
                        booking.status === 'CONFIRMED' ? 'bg-blue-500/20 text-blue-400' :
                        booking.status === 'COMPLETED' ? 'bg-slate-800 text-slate-300' :
                        'bg-rose-500/20 text-rose-400'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white mt-1">{booking.lot?.name}</h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-400" />
                      {booking.lot?.address || `Ward ${booking.lot?.ward}, Mumbai`}
                    </p>
                  </div>

                  <div className="text-right sm:self-center">
                    <div className="text-base font-bold text-white">₹{booking.amount_paid}</div>
                    <div className="text-[10px] text-slate-400">Paid Online (Mock)</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-xs text-slate-300">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Vehicle Plate</span>
                    <span className="font-mono font-bold text-slate-100">{booking.plate_at_booking}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block">Date</span>
                    <span>{start.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-400 block">Slot Time</span>
                    <span>
                      {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <Link
                    to={`/ticket/${booking.booking_code}`}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>View QR Pass</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
