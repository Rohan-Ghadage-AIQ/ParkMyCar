import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { Lot, VehicleClass } from '../../types';
import {
  Search, MapPin, Car, Shield, Filter, Map, List,
  Clock, ArrowRight, Sparkles, Navigation, AlertCircle, Building
} from 'lucide-react';
import { MapComponent } from '../../components/MapComponent';

export const OwnerHome: React.FC = () => {
  const navigate = useNavigate();
  const [lots, setLots] = useState<Lot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWard, setSelectedWard] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [vehicleClass, setVehicleClass] = useState<VehicleClass>('FOUR_WHEELER');
  const [onlyBookable, setOnlyBookable] = useState(true);
  
  // UI View state
  const [viewMode, setViewMode] = useState<'split' | 'list' | 'map'>('split');
  const [selectedLotId, setSelectedLotId] = useState<number | null>(null);

  // User location for Mumbai distance sort
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>({
    lat: 19.0178, // Worli / Dadar default center
    lng: 72.8478,
  });

  const fetchLots = async () => {
    setIsLoading(true);
    try {
      const params: any = {
        vehicle_class: vehicleClass,
        only_bookable: onlyBookable,
      };
      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (selectedWard) params.ward = selectedWard;
      if (selectedSource) params.source = selectedSource;
      if (userCoords) {
        params.user_lat = userCoords.lat;
        params.user_lng = userCoords.lng;
      }

      const res = await api.get<Lot[]>('/lots', { params });
      setLots(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLots();
  }, [searchQuery, selectedWard, selectedSource, vehicleClass, onlyBookable]);

  const wards = ['A', 'D', 'G/South', 'G/North', 'H/West', 'H/East', 'K/West', 'K/East', 'P/South', 'P/North', 'S', 'T'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
            <Sparkles className="w-3.5 h-3.5" /> Official MCGM Open Parking Network v1.1
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Find & Pre-Book Verified Parking in <span className="text-amber-400">Mumbai</span>
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Reserve your bay in advance at official MCGM public parking lots, multi-level car parks, and premier private hubs. Get guaranteed entry with digital QR verification.
          </p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by area (e.g. Bandra, Fort, Colaba, BKC, Lower Parel, Powai)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Ward Selector */}
          <div className="w-full md:w-48">
            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
            >
              <option value="">All Mumbai Wards</option>
              {wards.map((w) => (
                <option key={w} value={w}>
                  Ward {w}
                </option>
              ))}
            </select>
          </div>

          {/* Source Selector */}
          <div className="w-full md:w-48">
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
            >
              <option value="">All Lot Sources</option>
              <option value="MCGM">Government (MCGM)</option>
              <option value="BEST">BEST Depots</option>
              <option value="PRIVATE">Private Lots</option>
              <option value="DEMO">Demo Government</option>
            </select>
          </div>
        </div>

        {/* Vehicle Class Tabs & View Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setVehicleClass('FOUR_WHEELER')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                vehicleClass === 'FOUR_WHEELER'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              🚗 4-Wheeler Car
            </button>
            <button
              onClick={() => setVehicleClass('TWO_WHEELER')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                vehicleClass === 'TWO_WHEELER'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              🏍️ 2-Wheeler
            </button>
            <button
              onClick={() => setVehicleClass('LCV')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                vehicleClass === 'LCV'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              🚐 LCV / Commercial
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyBookable}
                onChange={(e) => setOnlyBookable(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-amber-400 focus:ring-0"
              />
              <span>Bookable Only</span>
            </label>

            {/* Layout Toggles */}
            <div className="hidden sm:flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5">
              <button
                onClick={() => setViewMode('split')}
                className={`p-1.5 rounded-lg text-xs ${
                  viewMode === 'split' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-white'
                }`}
                title="Split List & Map"
              >
                Split
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs ${
                  viewMode === 'list' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-white'
                }`}
                title="List Only"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`p-1.5 rounded-lg text-xs ${
                  viewMode === 'map' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-white'
                }`}
                title="Map Only"
              >
                <Map className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
        {/* Lots List Column */}
        {(viewMode === 'split' || viewMode === 'list') && (
          <div className={`${viewMode === 'split' ? 'lg:col-span-6' : 'lg:col-span-12'} space-y-4`}>
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>Showing {lots.length} parking facilities across Mumbai</span>
              <span>Sorted by distance</span>
            </div>

            {isLoading ? (
              <div className="py-20 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-400 mx-auto" />
              </div>
            ) : lots.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
                <AlertCircle className="w-10 h-10 text-slate-500 mx-auto" />
                <h3 className="font-bold text-white text-base">No parking lots found</h3>
                <p className="text-xs text-slate-400">Try unchecking 'Bookable Only' or changing search filters.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[750px] overflow-y-auto pr-1">
                {lots.map((lot) => {
                  const isGov = lot.source === 'MCGM' || lot.source === 'BEST' || lot.source === 'DEMO';
                  const avail = lot.available_bays ?? 0;
                  const isSelected = selectedLotId === lot.id;

                  return (
                    <div
                      key={lot.id}
                      onClick={() => setSelectedLotId(lot.id)}
                      className={`bg-slate-900/90 border rounded-2xl p-4 transition-all cursor-pointer hover:border-slate-600 shadow-md ${
                        isSelected
                          ? 'border-amber-400 ring-1 ring-amber-400 bg-slate-900'
                          : 'border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              isGov
                                ? 'bg-blue-950/70 text-blue-300 border-blue-800/60'
                                : 'bg-purple-950/70 text-purple-300 border-purple-800/60'
                            }`}>
                              {lot.source === 'PRIVATE' ? 'Private' : `Govt (${lot.agency})`}
                            </span>
                            <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                              Ward {lot.ward || 'Mumbai'}
                            </span>
                            {lot.distance_km !== undefined && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                <Navigation className="w-2.5 h-2.5 text-blue-400" />
                                {lot.distance_km} km away
                              </span>
                            )}
                          </div>
                          <h3 className="text-base font-bold text-white mt-1">{lot.name}</h3>
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                            {lot.address || `Ward ${lot.ward}, Mumbai`}
                          </p>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <div className="text-lg font-black text-amber-400">
                            ₹{lot.calculated_price_per_hr || 60}<span className="text-[10px] font-normal text-slate-400">/hr</span>
                          </div>
                          {lot.free_parking === 'Y' && (
                            <span className="text-[9px] font-semibold text-emerald-400 block">
                              Free for limited time
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            lot.bookable && avail > 0
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {lot.bookable ? `${avail} Bays Open` : 'Pay on Site'}
                          </span>
                          <span className="text-[11px] text-slate-400 hidden sm:inline">
                            {lot.structure_type || 'Surface'}
                          </span>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/lot/${lot.id}`);
                          }}
                          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition flex items-center gap-1 shadow-sm"
                        >
                          <span>{lot.bookable ? 'Book' : 'Details'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Map Column */}
        {(viewMode === 'split' || viewMode === 'map') && (
          <div className={`${viewMode === 'split' ? 'lg:col-span-6' : 'lg:col-span-12'} sticky top-24 h-[650px]`}>
            <MapComponent
              lots={lots}
              selectedLotId={selectedLotId}
              onSelectLot={(id) => {
                setSelectedLotId(id);
                const el = document.getElementById(`lot-card-${id}`);
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              userCoords={userCoords}
            />
          </div>
        )}
      </div>
    </div>
  );
};
