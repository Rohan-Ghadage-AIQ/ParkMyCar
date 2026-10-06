import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../api';
import { Html5Qrcode } from 'html5-qrcode';
import {
  QrCode, Camera, Search, CheckCircle2, XCircle, AlertTriangle,
  Upload, Shield, FileText, ArrowLeft, RefreshCw, Car, Clock
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const ScanVerifyPage: React.FC = () => {
  const navigate = useNavigate();
  const [bookingCodeInput, setBookingCodeInput] = useState('');
  const [isScanningCamera, setIsScanningCamera] = useState(false);
  const [scannedData, setScannedData] = useState<any | null>(null);
  const [isLoadingLookup, setIsLoadingLookup] = useState(false);

  // Verification form state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mismatch modal state
  const [showMismatchModal, setShowMismatchModal] = useState(false);
  const [mismatchReason, setMismatchReason] = useState('Different License Plate');
  const [mismatchNote, setMismatchNote] = useState('');
  const [mismatchAction, setMismatchAction] = useState<'REJECT' | 'ALLOW_WITH_FEE' | 'ESCALATE'>('REJECT');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  const startCamera = async () => {
    setIsScanningCamera(true);
    try {
      const qr = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = qr;
      await qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          stopCamera();
          lookupCode(decodedText.trim());
        },
        () => {}
      );
    } catch (err) {
      console.error('Camera permission or start failed', err);
      alert('Unable to access camera. Please enter the 6-character code manually below.');
      setIsScanningCamera(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      await html5QrCodeRef.current.stop();
      html5QrCodeRef.current.clear();
    }
    setIsScanningCamera(false);
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const lookupCode = async (code: string) => {
    if (!code) return;
    setIsLoadingLookup(true);
    setScannedData(null);
    try {
      const res = await api.get(`/marshal/scan/${code.toUpperCase()}`);
      setScannedData(res.data);
    } catch (err: any) {
      alert(err.response?.data?.detail || `Booking code '${code}' not found.`);
    } finally {
      setIsLoadingLookup(false);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    lookupCode(bookingCodeInput.trim());
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleMatchCheckIn = async () => {
    if (!scannedData?.booking?.booking_code) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('booking_code', scannedData.booking.booking_code);
      formData.append('plate_actual', scannedData.expected_plate);
      formData.append('verification_result', 'MATCH');
      formData.append('client_request_id', `checkin-${scannedData.booking.id}-${Date.now()}`);
      if (photoFile) {
        formData.append('photo', photoFile);
      }

      const res = await api.post('/marshal/check-in', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      alert('Vehicle plate MATCHED! Check-in confirmed. Boom barrier raised.');
      navigate('/marshal');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Check-in failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMismatchSubmit = async () => {
    if (!scannedData?.booking?.booking_code) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('booking_code', scannedData.booking.booking_code);
      formData.append('plate_actual', mismatchReason === 'Different License Plate' ? (mismatchNote || 'UNKNOWN_PLATE') : scannedData.expected_plate);
      formData.append('verification_result', 'MISMATCH');
      formData.append('mismatch_action', mismatchAction);
      formData.append('mismatch_reason', mismatchReason);
      formData.append('mismatch_note', mismatchNote);
      formData.append('client_request_id', `mismatch-${scannedData.booking.id}-${Date.now()}`);
      if (photoFile) {
        formData.append('photo', photoFile);
      }

      const res = await api.post('/marshal/check-in', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      alert(`Mismatch Action Recorded: ${res.data.message}`);
      setShowMismatchModal(false);
      navigate('/marshal');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/marshal" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Marshal Dashboard
        </Link>
        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
          On-Ground Check-In Gate
        </span>
      </div>

      {/* Code Scanner / Manual Entry Card */}
      {!scannedData && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-black text-white">Scan Customer QR Pass</h1>
            <p className="text-xs text-slate-400">Point camera at customer's phone or type their 6-char pass code</p>
          </div>

          {/* Camera Scanner Container */}
          {isScanningCamera ? (
            <div className="space-y-3">
              <div id="qr-reader" className="w-full rounded-2xl overflow-hidden bg-black min-h-[300px]" />
              <button
                type="button"
                onClick={stopCamera}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-2.5 rounded-xl transition"
              >
                Stop Camera
              </button>
            </div>
          ) : (
            <button
              onClick={startCamera}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 px-4 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg transition"
            >
              <Camera className="w-5 h-5" />
              <span>Launch Camera QR Scanner</span>
            </button>
          )}

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-4 text-[11px] uppercase tracking-wider text-slate-500 font-bold">Or Enter 6-Char Code</span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* Manual 6-Char Input */}
          <form onSubmit={handleManualSearch} className="flex gap-2">
            <input
              type="text"
              maxLength={6}
              placeholder="e.g. PK7M2A"
              value={bookingCodeInput}
              onChange={(e) => setBookingCodeInput(e.target.value.toUpperCase())}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-center text-xl font-mono font-black tracking-widest text-amber-400 uppercase focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              disabled={isLoadingLookup || bookingCodeInput.length < 4}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-6 py-3 rounded-2xl text-sm transition disabled:opacity-50"
            >
              {isLoadingLookup ? 'Looking up...' : 'Verify'}
            </button>
          </form>
        </div>
      )}

      {/* Verification Screen once booking is found */}
      {scannedData && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                Booking #{scannedData.booking?.booking_code}
              </span>
              <h2 className="text-xl font-bold text-white mt-1">{scannedData.lot_name}</h2>
            </div>
            <button
              onClick={() => {
                setScannedData(null);
                setPhotoFile(null);
                setPhotoPreview(null);
              }}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Scan Next
            </button>
          </div>

          {/* Status & Window Check */}
          <div className={`p-3 rounded-2xl text-xs flex items-center gap-2.5 ${
            scannedData.is_valid_time_window && !scannedData.already_checked_in
              ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
              : 'bg-amber-950/40 border border-amber-500/30 text-amber-300'
          }`}>
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>{scannedData.time_window_message}</span>
          </div>

          {/* HUGE PHYSICAL PLATE TO VERIFY */}
          <div className="bg-slate-950 p-6 rounded-3xl border-2 border-amber-400/80 text-center space-y-2 shadow-inner">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Expected Vehicle Plate Number
            </span>
            <div className="text-3xl sm:text-4xl font-black font-mono text-amber-400 tracking-widest py-1 select-all">
              {scannedData.expected_plate}
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-300">
              <span className="bg-slate-800 px-2.5 py-1 rounded-lg font-medium">{scannedData.vehicle_class.replace('_', ' ')}</span>
              <span className="bg-emerald-900/50 text-emerald-300 px-2.5 py-1 rounded-lg font-bold border border-emerald-700/50">
                ✓ Online Paid (₹{scannedData.amount_paid})
              </span>
            </div>
          </div>

          {/* Photo upload / Capture */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-blue-400" /> Physical Vehicle Photo (Audit Log)
            </label>

            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoSelect}
                className="text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
              />
              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="Car proof"
                  className="w-16 h-16 rounded-xl object-cover border border-slate-700 shadow"
                />
              )}
            </div>
          </div>

          {/* Core Decision: MATCH or MISMATCH */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <button
              type="button"
              disabled={isSubmitting || scannedData.already_checked_in}
              onClick={handleMatchCheckIn}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 px-4 rounded-2xl text-base shadow-xl flex flex-col items-center justify-center gap-1 transition disabled:opacity-50"
            >
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5" />
                <span>MATCH</span>
              </div>
              <span className="text-[10px] font-normal opacity-90">Plate Verified • Allow Entry</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting || scannedData.already_checked_in}
              onClick={() => setShowMismatchModal(true)}
              className="bg-rose-600 hover:bg-rose-500 text-white font-black py-4 px-4 rounded-2xl text-base shadow-xl flex flex-col items-center justify-center gap-1 transition disabled:opacity-50"
            >
              <div className="flex items-center gap-1.5">
                <XCircle className="w-5 h-5" />
                <span>MISMATCH</span>
              </div>
              <span className="text-[10px] font-normal opacity-90">Different Car / Action</span>
            </button>
          </div>
        </div>
      )}

      {/* Mismatch Options Modal */}
      {showMismatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 relative shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Vehicle Plate Mismatch</h3>
                <p className="text-xs text-slate-400">Strict Municipal Verification Protocol</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Reason for Mismatch:</label>
                <select
                  value={mismatchReason}
                  onChange={(e) => setMismatchReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="Different License Plate">Different License Plate Arrived</option>
                  <option value="Wrong Vehicle Category">Wrong Vehicle Category (e.g. Truck on Car booking)</option>
                  <option value="Counterfeit / Duplicate Pass">Suspicious / Counterfeit Pass</option>
                  <option value="Driver Replaced Vehicle">Driver claims replaced rental car</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Actual Physical Plate / Notes:</label>
                <input
                  type="text"
                  placeholder="Enter physical plate seen on car"
                  value={mismatchNote}
                  onChange={(e) => setMismatchNote(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Action to Take:</label>
                <div className="space-y-2">
                  <label className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer ${
                    mismatchAction === 'REJECT' ? 'bg-rose-950/40 border-rose-500 text-rose-200' : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="mismatchAction"
                      value="REJECT"
                      checked={mismatchAction === 'REJECT'}
                      onChange={() => setMismatchAction('REJECT')}
                      className="mt-0.5"
                    />
                    <div>
                      <strong className="block text-white">1. Reject Entry (Recommended)</strong>
                      <span>Deny gate entry. Flag booking as MISMATCH_REJECTED & open dispute ticket.</span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer ${
                    mismatchAction === 'ALLOW_WITH_FEE' ? 'bg-amber-950/40 border-amber-500 text-amber-200' : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="mismatchAction"
                      value="ALLOW_WITH_FEE"
                      checked={mismatchAction === 'ALLOW_WITH_FEE'}
                      onChange={() => setMismatchAction('ALLOW_WITH_FEE')}
                      className="mt-0.5"
                    />
                    <div>
                      <strong className="block text-white">2. Allow with ₹50 Vehicle-Change Fee</strong>
                      <span>Collect ₹50 fine/fee on-ground and log physical plate in session.</span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer ${
                    mismatchAction === 'ESCALATE' ? 'bg-purple-950/40 border-purple-500 text-purple-200' : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="mismatchAction"
                      value="ESCALATE"
                      checked={mismatchAction === 'ESCALATE'}
                      onChange={() => setMismatchAction('ESCALATE')}
                      className="mt-0.5"
                    />
                    <div>
                      <strong className="block text-white">3. Escalate to MCGM Admin</strong>
                      <span>Put entry on hold and dispatch to Admin Dispute Queue for review.</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowMismatchModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleMismatchSubmit}
                className="bg-rose-500 hover:bg-rose-400 text-white font-bold px-5 py-2 rounded-xl text-xs transition shadow"
              >
                {isSubmitting ? 'Submitting...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
