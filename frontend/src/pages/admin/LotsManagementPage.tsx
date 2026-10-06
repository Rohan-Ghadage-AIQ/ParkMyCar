import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { Lot } from '../../types';
import {
  Layers, Search, Edit3, Check, X, ArrowLeft,
  RefreshCw, Shield, AlertCircle
} from 'lucide-react';

export const LotsManagementPage: React.FC = () => {
  const [lots, setLots] = useState<Lot[]>([]);
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterWard, setFilterWard] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Edit modal
  const [editingLot, setEditingLot] = useState<Lot | null>(null);
  const [quotaInput, setQuotaInput] = useState<number>(30);
  const [bookableInput, setBookableInput] = useState<boolean>(true);
  const [cap4wInput, setCap4wInput] = useState<string>('');
  const [cap2wInput, setCap2wInput] = useState<string>('');
  const [priceOverrideInput, setPriceOverrideInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchLots = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<Lot[]>('/lots?only_bookable=false');
      setLots(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLots();
  }, []);

  const handleOpenEdit = (lot: Lot) => {
    setEditingLot(lot);
    setQuotaInput(lot.bookable_quota_percent || 30);
    setBookableInput(lot.bookable);
    setCap4wInput(lot.capacity_4w?.toString() || '');
    setCap2wInput(lot.capacity_2w?.toString() || '');
    setPriceOverrideInput(lot.price_override?.toString() || '');
  };

  const handleSaveLot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLot) return;
    setIsSaving(true);
    try {
      const payload: any = {
        bookable: bookableInput,
        bookable_quota_percent: quotaInput,
        capacity_4w: cap4wInput ? parseInt(cap4wInput) : null,
        capacity_2w: cap2wInput ? parseInt(cap2wInput) : null,
        price_override: priceOverrideInput ? parseFloat(priceOverrideInput) : null,
      };
      await api.put(`/admin/lots/${editingLot.id}`, payload);
      alert('Parking lot settings updated!');
      setEditingLot(null);
      fetchLots();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update lot');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredLots = lots.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.ward && l.ward.toLowerCase().includes(search.toLowerCase())) ||
      (l.gis_id && l.gis_id.toLowerCase().includes(search.toLowerCase()));
    const matchesSource = !filterSource || l.source === filterSource;
    const matchesWard = !filterWard || l.ward === filterWard;
    return matchesSearch && matchesSource && matchesWard;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/admin" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Admin Operations Center
        </Link>
        <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
          Lot Inventory & Quota Manager
        </span>
      </div>

      <div>
        <h1 className="text-2xl font-black text-white">Manage Parking Lots & Quotas</h1>
        <p className="text-xs text-slate-400">
          Configure online booking percentages, activate BEST depots, adjust bay capacities, and set custom rate overrides
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by lot name, ward, or GIS ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white"
        >
          <option value="">All Sources</option>
          <option value="MCGM">MCGM Public Lots</option>
          <option value="BEST">BEST Bus Depots</option>
          <option value="PRIVATE">Private Commercial</option>
          <option value="DEMO">Demo Government</option>
        </select>
      </div>

      {/* Lots Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Lot Name & GIS ID</th>
                <th className="py-3.5 px-4">Agency</th>
                <th className="py-3.5 px-4">Ward</th>
                <th className="py-3.5 px-4">4W / 2W Capacity</th>
                <th className="py-3.5 px-4">Online Quota %</th>
                <th className="py-3.5 px-4">Tariff Category</th>
                <th className="py-3.5 px-4">Bookable</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredLots.map((lot) => (
                <tr key={lot.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-white text-sm">{lot.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{lot.gis_id || 'NO_GIS_ID'}</div>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-300">{lot.agency}</td>
                  <td className="py-3.5 px-4">{lot.ward || 'Mumbai'}</td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-white">
                    4W: {lot.capacity_4w ?? 'N/A'} | 2W: {lot.capacity_2w ?? 'N/A'}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                    {lot.bookable_quota_percent}%
                  </td>
                  <td className="py-3.5 px-4">
                    {lot.price_override ? (
                      <span className="text-amber-400 font-bold font-mono">₹{lot.price_override}/hr (Override)</span>
                    ) : (
                      <span>Category {lot.price_category || 'A'}</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      lot.bookable ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {lot.bookable ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleOpenEdit(lot)}
                      className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition border border-slate-700 flex items-center gap-1 ml-auto"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                      <span>Edit</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingLot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 relative shadow-2xl space-y-4">
            <button
              onClick={() => setEditingLot(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                {editingLot.agency} • {editingLot.gis_id}
              </span>
              <h3 className="text-lg font-bold text-white mt-1">{editingLot.name}</h3>
            </div>

            <form onSubmit={handleSaveLot} className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-300 font-semibold">Enable Online Pre-booking:</span>
                <input
                  type="checkbox"
                  checked={bookableInput}
                  onChange={(e) => setBookableInput(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-0"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Online Bookable Quota (%):
                </label>
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={quotaInput}
                  onChange={(e) => setQuotaInput(parseInt(e.target.value) || 30)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Default is 30% to guarantee street walk-in capacity.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">4W Bay Capacity:</label>
                  <input
                    type="number"
                    value={cap4wInput}
                    onChange={(e) => setCap4wInput(e.target.value)}
                    placeholder="e.g. 450"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">2W Bay Capacity:</label>
                  <input
                    type="number"
                    value={cap2wInput}
                    onChange={(e) => setCap2wInput(e.target.value)}
                    placeholder="e.g. 150"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Custom Hourly Rate Override (INR) - Optional:
                </label>
                <input
                  type="number"
                  step="5"
                  value={priceOverrideInput}
                  onChange={(e) => setPriceOverrideInput(e.target.value)}
                  placeholder="Leave empty to use official MCGM tariff schedule"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingLot(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2 rounded-xl text-xs transition shadow"
                >
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
