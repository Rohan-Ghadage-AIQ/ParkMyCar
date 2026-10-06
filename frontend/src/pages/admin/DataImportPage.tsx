import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import {
  UploadCloud, Database, CheckCircle, AlertTriangle,
  ArrowLeft, RefreshCw, FileSpreadsheet, ShieldAlert
} from 'lucide-react';

export const DataImportPage: React.FC = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [importReport, setImportReport] = useState<any | null>(null);

  // File upload state
  const [mcgmFile, setMcgmFile] = useState<File | null>(null);
  const [bestFile, setBestFile] = useState<File | null>(null);
  const [chargesFile, setChargesFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  const handleTriggerImport = async () => {
    setIsImporting(true);
    setImportReport(null);
    try {
      const res = await api.post('/admin/import-data');
      setImportReport(res.data.report);
      alert('Data import completed successfully!');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Data import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const handleUploadSingle = async (type: string, file: File | null) => {
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post(`/admin/upload-csv?file_type=${type}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadStatus(`Uploaded ${file.name} successfully.`);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'File upload failed');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/admin" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Admin Operations Center
        </Link>
        <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
          MCGM & BEST Open Data Sync
        </span>
      </div>

      <div>
        <h1 className="text-2xl font-black text-white">Government Data Importer</h1>
        <p className="text-xs text-slate-400">
          Sync official Municipal Corporation of Greater Mumbai & BEST parking data v1.1 into the operational database
        </p>
      </div>

      {/* 1-Click Trigger Card */}
      <div className="bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-900 border border-purple-800/50 p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h2 className="text-lg font-bold text-white flex items-center justify-center sm:justify-start gap-2">
            <Database className="w-5 h-5 text-purple-400" />
            <span>Run Idempotent Data Importer</span>
          </h2>
          <p className="text-xs text-slate-300">
            Parses /data CSV files, resolves price categories, upserts lots by (Agency, GIS ID), and preserves raw sources.
          </p>
        </div>

        <button
          disabled={isImporting}
          onClick={handleTriggerImport}
          className="bg-purple-600 hover:bg-purple-500 text-white font-black px-6 py-3 rounded-2xl text-xs transition shadow-lg flex items-center gap-2 disabled:opacity-50 flex-shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${isImporting ? 'animate-spin' : ''}`} />
          <span>{isImporting ? 'Importing Dataset...' : 'Trigger Sync Now'}</span>
        </button>
      </div>

      {/* Import Results Report */}
      {importReport && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Import Execution Report</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">MCGM Lots</span>
              <span className="font-mono font-bold text-white text-base">{importReport.mcgm_imported}</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">BEST Depots/Terminals</span>
              <span className="font-mono font-bold text-white text-base">{importReport.best_imported}</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Price Tariff Rules</span>
              <span className="font-mono font-bold text-white text-base">{importReport.charges_imported}</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Private Demo Lots</span>
              <span className="font-mono font-bold text-white text-base">{importReport.private_imported}</span>
            </div>
          </div>

          {importReport.warnings?.length > 0 && (
            <div className="p-4 bg-amber-950/20 border border-amber-800/30 rounded-2xl text-xs space-y-1.5">
              <div className="font-bold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Data Quirks & Handling Log ({importReport.warnings.length}):</span>
              </div>
              <ul className="list-disc list-inside text-slate-300 space-y-1">
                {importReport.warnings.map((w: string, idx: number) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* CSV File Upload Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-blue-400" /> Upload New Municipal CSVs
          </h2>
          <p className="text-xs text-slate-400">Update local dataset files from MCGM or BEST portals</p>
        </div>

        {uploadStatus && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs">
            {uploadStatus}
          </div>
        )}

        <div className="space-y-3 text-xs">
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-white">1. MCGM Off-Street Lots CSV</div>
              <div className="text-[10px] text-slate-400">mcgm_offstreet_lots.csv (26 lots)</div>
            </div>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                if (e.target.files?.[0]) handleUploadSingle('mcgm', e.target.files[0]);
              }}
              className="text-xs text-slate-400 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
            />
          </div>

          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-white">2. BEST Depots & Terminals CSV</div>
              <div className="text-[10px] text-slate-400">best_depots_terminals.csv (Depots/Terminals)</div>
            </div>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                if (e.target.files?.[0]) handleUploadSingle('best', e.target.files[0]);
              }}
              className="text-xs text-slate-400 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
            />
          </div>

          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-white">3. Official Parking Charges Tariff CSV</div>
              <div className="text-[10px] text-slate-400">parking_charges.csv (Cat A/B/C bands)</div>
            </div>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                if (e.target.files?.[0]) handleUploadSingle('charges', e.target.files[0]);
              }}
              className="text-xs text-slate-400 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
