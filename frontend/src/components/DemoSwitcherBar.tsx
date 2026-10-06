import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, User, Award, Car, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DemoSwitcherBar: React.FC = () => {
  const { user, role, demoLogin } = useAuth();
  const navigate = useNavigate();

  const handleSwitch = async (targetRole: 'owner' | 'marshal' | 'admin') => {
    await demoLogin(targetRole);
    if (targetRole === 'owner') navigate('/');
    if (targetRole === 'marshal') navigate('/marshal');
    if (targetRole === 'admin') navigate('/admin');
  };

  return (
    <div className="bg-slate-950 border-b border-slate-800 text-xs text-slate-300 py-1.5 px-4 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 font-semibold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
            <Award className="w-3 h-3" /> DEMO MODE
          </span>
          <span className="hidden sm:inline text-slate-400">1-Tap Role Switcher:</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          <button
            onClick={() => handleSwitch('owner')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-medium ${
              role === 'OWNER'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Car className="w-3 h-3" />
            <span>1. Car Owner</span>
          </button>

          <button
            onClick={() => handleSwitch('marshal')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-medium ${
              role === 'MARSHAL'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Shield className="w-3 h-3" />
            <span>2. On-ground Marshal</span>
          </button>

          <button
            onClick={() => handleSwitch('admin')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-medium ${
              role === 'ADMIN'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <User className="w-3 h-3" />
            <span>3. MCGM Admin</span>
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 text-slate-400 text-[11px]">
          <span>Logged in as: <strong className="text-slate-200">{user ? user.name : 'Guest'}</strong></span>
        </div>
      </div>
    </div>
  );
};
