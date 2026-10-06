import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { Lot, PriceRule } from '../../types';
import {
  MapPin, Clock, Shield, CheckCircle2, AlertTriangle,
  Building2, Sparkles, Flag, ArrowLeft, ArrowRight, Video,
  Compass, Info, Calendar
} from 'lucide-react';
import { BookingCheckoutModal } from './BookingCheckoutModal';
import { ReportModal } from '../../components/ReportModal';

export const LotDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lot, setLot] = useState<Lot | null>(null);
  const [priceRules, setPriceRules] = useState<PriceRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const fetchLot = async () => {
    if (!id) return;
    try {
      const [lotRes, rulesRes] = await Promise.all([
        api.get<Lot>(`/lots/${id}`),
        api.get<PriceRule[]>(`/lots/${id}/rules`),
      ]);
      setLot(lotRes.data);
      setPriceRules(rulesRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLot();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  if (!lot) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Parking Lot Not Found</h2>
        <Link to="/" className="inline-block bg-blue-600 px-4 py-2 rounded-xl text-xs font-semibold text-white">
          Back to Parking Search
        </Link>
      </div>
    );
  }

  const isGovernment = lot.source === 'MCGM' || lot.source === 'BEST' || lot.source === 'DEMO';
  const availBays = lot.available_bays ?? 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header Back & Tag */}
      <div className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition">
          <ArrowLeft className="w-4 h-4" /> Back to Search
        </Link>
        <button
          onClick={() => setIsReportOpen(true)}
          className="flex items-center gap-1 text-xs text-amber-400/90 hover:text-amber-300 font-medium"
        >
          <Flag className="w-3.5 h-3.5" /> Report incorrect info
        </button>
      </div>

      {/* Main Lot Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
              isGovernment
                ? 'bg-blue-900/40 text-blue-300 border-blue-700/50'
                : 'bg-purple-900/40 text-purple-300 border-purple-700/50'
            }`}>
              {lot.source === 'PRIVATE' ? 'Private Commercial Facility' : `Government (${lot.agency})`}
            </span>
            <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
              Ward {lot.ward || 'Mumbai'}
            </span>
            {lot.price_category && (
              <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                Tariff Cat {lot.price_category}
              </span>
            )}
          </div>

          <div className="text-right">
            <div className="text-2xl font-black text-amber-400">
              ₹{lot.calculated_price_per_hr || 60}<span className="text-xs font-normal text-slate-400">/hr</span>
            </div>
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">{lot.name}</h1>
          <p className="text-sm text-slate-400 mt-1 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-amber-400 flex-shrink-0" />
            {lot.address || `Ward ${lot.ward}, Mumbai`}
          </p>
        </div>

        {/* Live Availability Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Online Pre-booking</span>
            <div className="flex items-center gap-2 mt-0.5">
              <div className={`w-2.5 h-2.5 rounded-full ${
                lot.bookable && availBays > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`} />
              <span className="font-bold text-sm text-white">
                {lot.bookable ? `${availBays} Bays Available` : 'Pay on Site / Full'}
              </span>
            </div>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Operating Hours</span>
            <div className="font-bold text-sm text-white mt-0.5 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-400" />
              {lot.open_time} - {lot.close_time}
            </div>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Structure & Type</span>
            <div className="font-bold text-sm text-white mt-0.5 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-purple-400" />
              {lot.structure_type || 'Surface Parking'}
            </div>
          </div>
        </div>

        {/* Facilities Grid */}
        <div className="pt-2">
          <span className="text-xs font-semibold text-slate-300 block mb-2">On-Site Facilities</span>
          <div className="flex flex-wrap gap-2">
            {lot.facilities_cctv && (
              <span className="text-xs bg-slate-800/80 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700/60 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-blue-400" /> 24/7 CCTV Surveillance
              </span>
            )}
            {lot.facilities_secguard && (
              <span className="text-xs bg-slate-800/80 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700/60 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" /> Security Guard on Duty
              </span>
            )}
            {lot.facilities_sensors && (
              <span className="text-xs bg-slate-800/80 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700/60 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Smart Bay Sensors
              </span>
            )}
            {lot.facilities_toilets && (
              <span className="text-xs bg-slate-800/80 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700/60">
                🚻 Clean Restrooms
              </span>
            )}
            {lot.handicap_reservation && (
              <span className="text-xs bg-slate-800/80 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700/60">
                ♿ Accessible Parking Bay
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quota Disclaimer Card */}
      <div className="p-4 bg-amber-950/20 border border-amber-800/30 rounded-2xl text-xs text-amber-300 flex items-start gap-3">
        <Info className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Platform Quota Notice:</strong> Official MCGM capacity represents total parking bays. ParkMumbai reserves <strong>{lot.bookable_quota_percent}% of bays for online pre-booking</strong> so walk-in drivers in Mumbai can always find street parking on arrival.
        </div>
      </div>

      {/* Official Tariff Schedule Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" /> Official Tariff Schedule (Category {lot.price_category || 'A'})
          </h2>
          <span className="text-[11px] text-slate-400">Fixed MCGM Gazetted Rates</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Vehicle Category</th>
                <th className="py-3 px-4">Duration Band</th>
                <th className="py-3 px-4 text-right">Official Tariff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {priceRules.map((rule) => (
                <tr key={rule.id} className="hover:bg-slate-800/50 transition">
                  <td className="py-3 px-4 font-medium text-white">{rule.vehicle_class.replace('_', ' ')}</td>
                  <td className="py-3 px-4 text-slate-400">{rule.duration_band}</td>
                  <td className="py-3 px-4 text-right font-bold text-amber-400 font-mono">₹{rule.price_inr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CTA Button Sticky at bottom */}
      <div className="sticky bottom-4 z-20">
        <button
          onClick={() => setIsCheckoutOpen(true)}
          disabled={!lot.bookable}
          className="w-full bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-extrabold py-4 px-6 rounded-2xl text-base shadow-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {lot.bookable ? (
            <>
              <span>Book Time Slot (Starting ₹{lot.calculated_price_per_hr || 60})</span>
              <ArrowRight className="w-5 h-5" />
            </>
          ) : (
            <span>Currently Not Open for Pre-booking</span>
          )}
        </button>
      </div>

      {/* Checkout Modal */}
      <BookingCheckoutModal
        lot={lot}
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onSuccess={(code) => {
          setIsCheckoutOpen(false);
          navigate(`/ticket/${code}`);
        }}
      />

      {/* Report Modal */}
      <ReportModal
        lotId={lot.id}
        lotName={lot.name}
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />
    </div>
  );
};
