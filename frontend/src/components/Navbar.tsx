import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Car, Shield, BarChart3, Ticket, LogOut, Menu, X, MapPin } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 sticky top-7 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-400 p-0.5 shadow-lg flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <span className="font-extrabold text-lg text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-amber-300">P</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg tracking-tight text-white">Park<span className="text-amber-400">Mumbai</span></span>
                <span className="text-[10px] font-semibold bg-blue-900/60 text-blue-300 border border-blue-700/50 px-1.5 py-0.5 rounded">MCGM v1.1</span>
              </div>
              <p className="text-[10px] text-slate-400 -mt-0.5 flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5 text-amber-400" /> Mumbai Smart Parking
              </p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/') ? 'bg-slate-800 text-amber-400 border border-slate-700' : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <Car className="w-4 h-4" /> Find Parking
            </Link>

            <Link
              to="/my-bookings"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/my-bookings') ? 'bg-slate-800 text-amber-400 border border-slate-700' : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <Ticket className="w-4 h-4" /> My Bookings
            </Link>

            {(role === 'MARSHAL' || role === 'ADMIN') && (
              <Link
                to="/marshal"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname.startsWith('/marshal')
                    ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/50'
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-emerald-300'
                }`}
              >
                <Shield className="w-4 h-4 text-emerald-400" /> Marshal Desk
              </Link>
            )}

            {role === 'ADMIN' && (
              <Link
                to="/admin"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname.startsWith('/admin')
                    ? 'bg-purple-950/70 text-purple-400 border border-purple-800/50'
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-purple-300'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-purple-400" /> Admin Console
              </Link>
            )}
          </div>

          {/* User Profile & Actions */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3 bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-1.5">
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-100">{user.name}</div>
                  <div className="text-[10px] text-slate-400">{user.phone}</div>
                </div>
                <button
                  onClick={logout}
                  title="Logout"
                  className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-rose-400 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold px-4 py-2 rounded-lg text-sm transition shadow-sm"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-4 space-y-1">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            <Car className="w-4 h-4 text-amber-400" /> Find Parking
          </Link>
          <Link
            to="/my-bookings"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            <Ticket className="w-4 h-4 text-blue-400" /> My Bookings
          </Link>
          {(role === 'MARSHAL' || role === 'ADMIN') && (
            <Link
              to="/marshal"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-emerald-400 hover:bg-slate-800"
            >
              <Shield className="w-4 h-4" /> Marshal Desk
            </Link>
          )}
          {role === 'ADMIN' && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-purple-400 hover:bg-slate-800"
            >
              <BarChart3 className="w-4 h-4" /> Admin Console
            </Link>
          )}
          {user && (
            <button
              onClick={() => {
                logout();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-rose-400 hover:bg-slate-800"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          )}
        </div>
      )}
    </nav>
  );
};
