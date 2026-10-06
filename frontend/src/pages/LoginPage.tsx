import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Car, Shield, User, Phone, KeyRound, Sparkles, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithOTP, demoLogin } = useAuth();
  
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('123456');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || phone.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await loginWithOTP(phone.trim(), otp);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = async (role: 'owner' | 'marshal' | 'admin') => {
    setIsSubmitting(true);
    setError('');
    try {
      await demoLogin(role);
      if (role === 'owner') navigate('/');
      if (role === 'marshal') navigate('/marshal');
      if (role === 'admin') navigate('/admin');
    } catch (err: any) {
      setError('Demo login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-400 p-0.5 shadow-xl flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <span className="font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-amber-300">P</span>
            </div>
          </div>
          <h1 className="text-2xl font-black text-white">Welcome to Park<span className="text-amber-400">Mumbai</span></h1>
          <p className="text-xs text-slate-400">Smart Pre-booking Parking Platform for Mumbai</p>
        </div>

        {/* 1-Tap Quick Demo Login Section */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>1-Tap Demo Quick Login:</span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo('owner')}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-900 hover:bg-blue-900/30 border border-slate-800 hover:border-blue-500/50 text-left transition group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg">
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-blue-300">1. Car Owner (Rahul Sharma)</div>
                  <div className="text-[10px] text-slate-400">Book slot, mock pay, QR ticket</div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition" />
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('marshal')}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-900 hover:bg-emerald-900/30 border border-slate-800 hover:border-emerald-500/50 text-left transition group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-lg">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-emerald-300">2. Gate Marshal (Santosh Kadam)</div>
                  <div className="text-[10px] text-slate-400">Scan QR, match plate, cash ledger</div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition" />
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('admin')}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-900 hover:bg-purple-900/30 border border-slate-800 hover:border-purple-500/50 text-left transition group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-600/20 text-purple-400 rounded-lg">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-purple-300">3. MCGM Admin (Priya Desai)</div>
                  <div className="text-[10px] text-slate-400">Quotas, disputes, cash audit, sync</div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition" />
            </button>
          </div>
        </div>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-4 text-[10px] uppercase tracking-widest text-slate-500 font-bold">Or Mobile OTP</span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        {/* Custom Phone + Mock OTP Form */}
        <form onSubmit={handlePhoneLogin} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile Number</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                placeholder="10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Mock OTP (Default: 123456)</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono tracking-widest"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold py-3 rounded-xl text-xs transition shadow disabled:opacity-50"
          >
            {isSubmitting ? 'Signing In...' : 'Verify & Enter'}
          </button>
        </form>
      </div>
    </div>
  );
};
