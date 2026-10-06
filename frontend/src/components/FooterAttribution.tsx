import React from 'react';
import { Database, ShieldCheck, ExternalLink, Info } from 'lucide-react';

export const FooterAttribution: React.FC = () => {
  return (
    <footer className="bg-slate-950 border-t border-slate-800/80 text-slate-400 text-xs py-8 px-4 mt-auto">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-slate-200">Official Municipal Open Data</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 100% Verified Parking Data
            </span>
            <span>•</span>
            <span>Dataset: MCGM & BEST Off-Street v1.1</span>
            <span>•</span>
            <span className="text-slate-500">Asia/Kolkata (IST)</span>
          </div>
        </div>

        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-[11px] leading-relaxed text-slate-400">
          <p className="font-medium text-slate-300 mb-1 flex items-center gap-1">
            <Info className="w-3 h-3 text-blue-400" /> Government Data Attribution Notice:
          </p>
          Contains data provided by <strong>Municipal Corporation of Greater Mumbai (MCGM)</strong> and/or <strong>Brihanmumbai Electric Supply & Transport Undertaking (BEST)</strong>. Published under Mumbai Open Data Off-Street Parking v1.1. Operating hours, live bay availability, and municipal charges are subject to ward-level notifications and official MCGM parking policies.
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-900 text-[10px] text-slate-500">
          <p>© {new Date().getFullYear()} ParkMumbai Prototype. Built for smart urban mobility in Mumbai.</p>
          <p className="flex items-center gap-1 text-slate-400">
            Platform Online Booking Quota: <strong>30% default</strong> (Walk-in capacity preserved on-ground)
          </p>
        </div>
      </div>
    </footer>
  );
};
