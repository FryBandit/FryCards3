import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { Home, ShoppingBag, Layers, BarChart2, Menu, X, Coins, Diamond, LogOut, Store, Target } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, dashboard, signOut } = useGame();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  const links = [
    { to: '/', label: 'Dashboard', icon: Home },
    { to: '/shop', label: 'Pack Shop', icon: ShoppingBag },
    { to: '/marketplace', label: 'Marketplace', icon: Store },
    { to: '/collection', label: 'Collection', icon: Layers },
    { to: '/quests', label: 'Quests', icon: Target },
    { to: '/leaderboard', label: 'Leaderboard', icon: BarChart2 },
  ];

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-2xl font-heading font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
              FC
            </span>
            <span className="hidden md:block font-heading font-bold text-white tracking-widest">FRYCARDS</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-2">
            {links.map(link => (
              <NavLink 
                key={link.to} 
                to={link.to}
                className={({ isActive }) => 
                  `flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`
                }
              >
                <link.icon size={16} />
                <span className="font-medium text-xs uppercase tracking-wide">{link.label}</span>
              </NavLink>
            ))}
          </div>

          {/* User Stats / Mobile Toggle */}
          <div className="flex items-center gap-4">
            {dashboard && dashboard.profile ? (
              <div className="flex items-center gap-3 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
                 <div className="flex items-center gap-1">
                   <Coins size={16} className="text-yellow-400" />
                   <span className="text-sm font-mono">{dashboard.profile.gold_balance.toLocaleString()}</span>
                 </div>
                 <div className="w-px h-4 bg-slate-600"></div>
                 <div className="flex items-center gap-1">
                   <Diamond size={16} className="text-cyan-400" />
                   <span className="text-sm font-mono">{dashboard.profile.gem_balance.toLocaleString()}</span>
                 </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700 animate-pulse">
                <div className="w-16 h-4 bg-slate-700 rounded"></div>
                <div className="w-px h-4 bg-slate-600"></div>
                <div className="w-16 h-4 bg-slate-700 rounded"></div>
              </div>
            )}
            
            <button onClick={signOut} className="hidden md:block text-slate-400 hover:text-red-400">
               <LogOut size={20} />
            </button>

            <button onClick={() => setIsOpen(!isOpen)} className="md:hidden text-white">
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-slate-800 border-t border-slate-700">
          <div className="flex flex-col p-4 gap-2">
            {links.map(link => (
              <NavLink 
                key={link.to} 
                to={link.to}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => 
                  `flex items-center gap-3 px-4 py-3 rounded-lg ${
                    isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700'
                  }`
                }
              >
                <link.icon size={20} />
                <span>{link.label}</span>
              </NavLink>
            ))}
            <button 
              onClick={signOut}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-red-500/20 hover:text-red-400 text-left"
            >
              <LogOut size={20} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;