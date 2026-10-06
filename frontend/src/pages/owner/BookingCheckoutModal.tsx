import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { Lot, Vehicle } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { X, Car, Shield, CheckCircle, AlertCircle, Clock, CreditCard, ArrowRight } from 'lucide-react';

interface BookingCheckoutModalProps {
  lot: Lot;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (bookingCode: string) => void;
}

export const BookingCheckoutModal: React.FC<BookingCheckoutModalProps> = ({
  lot,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  
  // New vehicle form
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [newPlate, setNewPlate] = useState('');
  const [newClass, setNewClass] = useState('FOUR_WHEELER');

  // Booking time slot
  const now = new Date();
  const defaultStart = new Date(now.getTime() + 15 * 60000); // 15 mins from now
  const defaultEnd = new Date(defaultStart.getTime() + 2 * 3600000); // 2 hours duration

  const [startTime, setStartTime] = useState<string>(
    new Date(defaultStart.getTime() - defaultStart.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  );
  const [endTime, setEndTime] = useState<string>(
    new Date(defaultEnd.getTime() - defaultEnd.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  );

  // Price estimate state
  const [priceData, setPriceData] = useState<{
    total_price: number;
    duration_band: string;
    duration_hours: number;
    available_bays: number;
    quota_capacity: number;
  } | null>(null);

  const [isEstimating, setIsEstimating] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'IDLE' | 'SUCCESS' | 'FAILED'>('IDLE');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch user vehicles
  const fetchVehicles = async () => {
    try {
      const res = await api.get<Vehicle[]>('/auth/vehicles');
      setVehicles(res.data);
      if (res.data.length > 0 && !selectedVehicleId) {
        setSelectedVehicleId(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchVehicles();
    }
  }, [isOpen]);

  // Recalculate price when times or vehicle changes
  useEffect(() => {
    const calc = async () => {
      if (!startTime || !endTime) return;
      const start = new Date(startTime);
      const end = new Date(endTime);
      if (end <= start) {
        setErrorMessage('End time must be after start time');
        setPriceData(null);
        return;
      }
      setErrorMessage('');
      setIsEstimating(true);
      try {
        const vClass = vehicles.find((v) => v.id === selectedVehicleId)?.vehicle_class || 'FOUR_WHEELER';
        const res = await api.post('/lots/estimate-price', {
          lot_id: lot.id,
          vehicle_class: vClass,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
        });
        setPriceData(res.data);
      } catch (err: any) {
        setErrorMessage(err.response?.data?.detail || 'Error calculating price');
        setPriceData(null);
      } finally {
        setIsEstimating(false);
      }
    };
    calc();
  }, [lot.id, startTime, endTime, selectedVehicleId, vehicles]);

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlate.trim()) return;
    try {
      const res = await api.post<Vehicle>('/auth/vehicles', {
        plate_number: newPlate.trim(),
        vehicle_class: newClass,
      });
      setVehicles([...vehicles, res.data]);
      setSelectedVehicleId(res.data.id);
      setShowAddVehicle(false);
      setNewPlate('');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to add vehicle');
    }
  };

  const handleConfirmAndPay = async (simulateStatus: string = 'SUCCESS') => {
    if (!selectedVehicleId) {
      alert('Please select or add a vehicle');
      return;
    }
    if (!priceData) return;

    setIsPaying(true);
    setErrorMessage('');

    try {
      const start = new Date(startTime).toISOString();
      const end = new Date(endTime).toISOString();
      const clientReqId = `book-${user?.id}-${Date.now()}`;

      const res = await api.post('/bookings', {
        lot_id: lot.id,
        vehicle_id: selectedVehicleId,
        start_time: start,
        end_time: end,
        client_request_id: clientReqId,
      });

      setPaymentStatus('SUCCESS');
      setTimeout(() => {
        onSuccess(res.data.booking_code);
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Booking failed. Slot may have just been booked.');
      setPaymentStatus('FAILED');
    } finally {
      setIsPaying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg p-6 relative shadow-2xl my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/30">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
              {lot.source} Lot • Ward {lot.ward || 'Mumbai'}
            </span>
            <h2 className="text-xl font-bold text-white mt-0.5">{lot.name}</h2>
          </div>
        </div>

        {paymentStatus === 'SUCCESS' ? (
          <div className="text-center py-10 space-y-3">
            <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto animate-bounce" />
            <h3 className="text-2xl font-bold text-white">Payment Confirmed!</h3>
            <p className="text-sm text-slate-300">Generating your digital parking pass & QR code...</p>
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            {/* 1. Vehicle Selection */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-amber-400" /> Select Vehicle
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddVehicle(!showAddVehicle)}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                >
                  {showAddVehicle ? 'Cancel' : '+ Add New Car'}
                </button>
              </div>

              {showAddVehicle ? (
                <form onSubmit={handleAddVehicle} className="space-y-3 pt-2 border-t border-slate-800">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="e.g. MH02CB1234"
                      value={newPlate}
                      onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs uppercase"
                      required
                    />
                    <select
                      value={newClass}
                      onChange={(e) => setNewClass(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-2 py-2 text-white text-xs"
                    >
                      <option value="FOUR_WHEELER">4-Wheeler Car</option>
                      <option value="TWO_WHEELER">2-Wheeler Bike</option>
                      <option value="LCV">LCV / Van</option>
                      <option value="AUTO_TAXI">Auto / Taxi</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-1.5 rounded-xl text-xs"
                  >
                    Save Vehicle
                  </button>
                </form>
              ) : (
                <div className="space-y-2">
                  {vehicles.length === 0 ? (
                    <div className="text-xs text-slate-400">No vehicles saved. Click '+ Add New Car' above.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {vehicles.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedVehicleId(v.id)}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition ${
                            selectedVehicleId === v.id
                              ? 'bg-blue-900/30 border-blue-500 text-white shadow-sm'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <div className="font-mono font-bold text-xs text-slate-100">{v.plate_number}</div>
                            <div className="text-[10px] text-slate-400">{v.vehicle_class.replace('_', ' ')}</div>
                          </div>
                          {selectedVehicleId === v.id && (
                            <CheckCircle className="w-4 h-4 text-blue-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. Date & Time Selection */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> Choose Time Slot
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Start Time</span>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">End Time</span>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>

            {/* 3. Availability & Price Breakdown */}
            {priceData && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Duration Band:</span>
                  <span className="font-semibold text-slate-200">
                    {priceData.duration_band} ({priceData.duration_hours} hrs)
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Online Quota Availability:</span>
                  <span className={`font-bold ${priceData.available_bays > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {priceData.available_bays} of {priceData.quota_capacity} bays open
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <div className="text-xs text-slate-400">Total Payable Amount</div>
                    <div className="text-[10px] text-slate-500">Official Municipal Rate Schedule</div>
                  </div>
                  <div className="text-2xl font-extrabold text-amber-400">
                    ₹{priceData.total_price}
                  </div>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 4. Mock UPI Payment CTA */}
            <div className="pt-2">
              <div className="mb-2 text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                <span>Mock Payment Gateway (UPI / GPay / PhonePe / Paytm)</span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  disabled={isPaying || !priceData || priceData.available_bays <= 0}
                  onClick={() => handleConfirmAndPay('SUCCESS')}
                  className="w-full bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-bold py-3.5 px-4 rounded-2xl text-sm transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isPaying ? (
                    'Processing Mock UPI Payment...'
                  ) : (
                    <>
                      <span>Pay ₹{priceData?.total_price || '--'} & Reserve Slot</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
