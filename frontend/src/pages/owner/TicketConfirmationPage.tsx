import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api';
import { Booking, BookingStatus } from '../../types';
import { QRCodeSVG } from 'qrcode.react';
import {
  MapPin, Clock, ShieldCheck, Navigation, AlertTriangle,
  Edit2, XCircle, ArrowLeft, CheckCircle2, Copy, Check
} from 'lucide-react';

export const TicketConfirmationPage: React.FC = () => {
  const { bookingCode } = useParams<{ bookingCode: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Edit plate state
  const [isEditingPlate, setIsEditingPlate] = useState(false);
  const [newPlate, setNewPlate] = useState('');
  const [isUpdatingPlate, setIsUpdatingPlate] = useState(false);

  // Cancel state
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchBooking = async () => {
    if (!bookingCode) return;
    try {
      const res = await api.get<Booking>(`/bookings/${bookingCode}`);
      setBooking(res.data);
      setNewPlate(res.data.plate_at_booking);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
  }, [bookingCode]);

  const handleCopyCode = () => {
    if (booking?.booking_code) {
      navigator.clipboard.writeText(booking.booking_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleUpdatePlate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking || !newPlate.trim()) return;
    setIsUpdatingPlate(true);
    try {
      const res = await api.patch<Booking>(`/bookings/${booking.id}/update-plate`, {
        new_plate: newPlate.trim(),
      });
      setBooking(res.data);
      setIsEditingPlate(false);
      alert('Vehicle plate updated successfully!');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update plate');
    } finally {
      setIsUpdatingPlate(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking) return;
    const confirmCancel = window.confirm(
      'Are you sure you want to cancel this booking? Refund will be calculated based on time remaining.'
    );
    if (!confirmCancel) return;

    setIsCancelling(true);
    try {
      const res = await api.post<Booking>(`/bookings/${booking.id}/cancel`);
      setBooking(res.data);
      alert(`Booking cancelled. Mock refund of ₹${res.data.cancellation_refund_amount} initiated.`);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Cancellation failed');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Booking Not Found</h2>
        <p className="text-xs text-slate-400">Please verify your booking code or check My Bookings.</p>
        <Link to="/" className="inline-block bg-blue-600 px-4 py-2 rounded-xl text-xs font-semibold text-white">
          Back to Home
        </Link>
      </div>
    );
  }

  const startDate = new Date(booking.start_time);
  const endDate = new Date(booking.end_time);
  const directionsUrl = booking.lot?.lat && booking.lot?.lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${booking.lot.lat},${booking.lot.lng}`
    : '#';

  const isConfirmed = booking.status === 'CONFIRMED';
  const isCheckedIn = booking.status === 'CHECKED_IN';
  const isCancelled = booking.status === 'CANCELLED';

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/my-bookings" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> My Bookings
        </Link>
        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
          isCheckedIn ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
          isConfirmed ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
          isCancelled ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
          'bg-slate-800 text-slate-300 border-slate-700'
        }`}>
          {booking.status}
        </span>
      </div>

      {/* Main Digital Pass Ticket */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 relative shadow-2xl overflow-hidden">
        {/* Decorative notch */}
        <div className="absolute -left-4 top-1/2 w-8 h-8 bg-slate-900 border-r border-slate-800 rounded-full" />
        <div className="absolute -right-4 top-1/2 w-8 h-8 bg-slate-900 border-l border-slate-800 rounded-full" />

        <div className="text-center space-y-1 mb-6">
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded border border-amber-400/20">
            Official Pre-booked Parking Pass
          </span>
          <h1 className="text-2xl font-black text-white pt-1">{booking.lot?.name}</h1>
          <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            {booking.lot?.address || `Ward ${booking.lot?.ward}, Mumbai`}
          </p>
        </div>

        {/* QR Code and 6-Char Code Display */}
        <div className="bg-white p-6 rounded-2xl max-w-[240px] mx-auto shadow-xl flex flex-col items-center justify-center">
          <QRCodeSVG
            value={booking.booking_code}
            size={180}
            level="H"
            includeMargin={false}
          />
          <div className="mt-3 text-center">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Booking Code</div>
            <div className="font-mono text-2xl font-black text-slate-900 tracking-widest flex items-center justify-center gap-2">
              {booking.booking_code}
              <button
                onClick={handleCopyCode}
                className="text-slate-500 hover:text-slate-900 p-1"
                title="Copy code"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Vehicle & Time Details */}
        <div className="mt-8 grid grid-cols-2 gap-4 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
          <div>
            <span className="text-[11px] text-slate-400 block">Registered Vehicle</span>
            <span className="font-mono text-base font-bold text-amber-400 tracking-wide">
              {booking.plate_at_booking}
            </span>
            <span className="text-[10px] text-slate-400 block">{booking.vehicle_class.replace('_', ' ')}</span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block">Slot Timing (IST)</span>
            <span className="text-xs font-semibold text-slate-200 block">
              {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })} - {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
            </span>
            <span className="text-[10px] text-slate-400 block">
              {startDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Verification Warning Notice */}
        <div className="mt-4 p-3 bg-blue-950/40 border border-blue-800/40 rounded-xl text-xs text-blue-300 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[11px]">
            <strong>On-Ground Verification Notice:</strong> The parking marshal will scan this QR and physically verify your number plate <strong>({booking.plate_at_booking})</strong> before granting boom-barrier access.
          </p>
        </div>

        {/* Navigation & Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-1/2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg transition"
          >
            <Navigation className="w-4 h-4" /> Open Navigation
          </a>

          {isConfirmed && booking.plate_edit_count < 1 && (
            <button
              onClick={() => setIsEditingPlate(!isEditingPlate)}
              className="w-full sm:w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 transition border border-slate-700"
            >
              <Edit2 className="w-4 h-4" /> Change Vehicle
            </button>
          )}
        </div>

        {/* Edit Plate Inline Form */}
        {isEditingPlate && (
          <form onSubmit={handleUpdatePlate} className="mt-4 p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
            <div className="text-xs font-semibold text-slate-300">
              Update License Plate (Allowed once before arrival)
            </div>
            <input
              type="text"
              value={newPlate}
              onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
              placeholder="e.g. MH02CB5678"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs uppercase"
              required
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditingPlate(false)}
                className="text-xs text-slate-400 px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdatingPlate}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs"
              >
                {isUpdatingPlate ? 'Updating...' : 'Save New Plate'}
              </button>
            </div>
          </form>
        )}

        {/* Cancellation Option */}
        {isConfirmed && (
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <div className="text-slate-400">
              Need to cancel? Tiered refund policy applies.
            </div>
            <button
              onClick={handleCancelBooking}
              disabled={isCancelling}
              className="text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1"
            >
              <XCircle className="w-3.5 h-3.5" /> Cancel Slot
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
