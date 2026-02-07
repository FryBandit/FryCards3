

import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { Home, ShoppingBag, Layers, BarChart2, Menu, X, Coins, Diamond, LogOut, Store, Sword, Layout, Users, Repeat, User as UserIcon } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, dashboard, signOut } = useGame();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!user) return null;

  const links = [
    { to: '/', label: 'Base', icon: Home },
    { to: '/shop', label: 'Store', icon: ShoppingBag },
    { to: '/collection', label: 'Card', icon: Layers },
    { to: '/decks', label: 'Deck', icon: Layout },
    { to: '/battle', label: 'War', icon: Sword },
    { to: '/trading', label: 'Swap', icon: Repeat },
    { to: '/marketplace', label: 'Mkt', icon: Store },
    { to: '/friends', label: 'Net', icon: Users },
    { to: '/leaderboard', label: 'Top', icon: BarChart2 },
  ];

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-[1000]">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-heading font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
              FC
            </span>
            <span className="hidden md:block font-heading font-bold text-white tracking-widest text-[10px]">FRYCARDS</span>
          </div>

          <div className="hidden xl:flex items-center gap-1">
            {links.map(link => (
              <NavLink 
                key={link.to} 
                to={link.to}
                className={({ isActive }) => 
                  `flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`
                }
              >
                <link.icon size={14} />
                <span className="font-bold text-[9px] uppercase tracking-wider">{link.label}</span>
              </NavLink>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {dashboard && dashboard.profile && (
              <div className="flex items-center gap-3 bg-slate-950 px-3 py-1.5 rounded-sm border border-slate-800 shadow-inner">
                 <div className="flex items-center gap-1">
                   <Coins size={12} className="text-yellow-400" />
                   <span className="text-[10px] font-mono font-bold text-slate-200">{dashboard.profile.gold_balance.toLocaleString()}</span>
                 </div>
                 <div className="w-px h-3 bg-slate-800"></div>
                 <div className="flex items-center gap-1">
                   <Diamond size={12} className="text-cyan-400" />
                   <span className="text-[10px] font-mono font-bold text-slate-200">{dashboard.profile.gem_balance.toLocaleString()}</span>
                 </div>
              </div>
            )}
            
            <NavLink to="/profile" className={({isActive}) => `hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${isActive ? 'bg-slate-800 border-indigo-500 text-white' : 'border-slate-700 text-slate-400 hover:text-white'}`}>
               {dashboard?.profile?.avatar_url ? (
                 <img src={dashboard.profile.avatar_url} alt="Avatar" className="w-6 h-6 rounded-full object-cover" />
               ) : (
                 <UserIcon size={16} />
               )}
            </NavLink>

            <button onClick={signOut} className="hidden md:block text-slate-500 hover:text-red-400 transition-colors">
               <LogOut size={16} />
            </button>

            <button onClick={() => setIsOpen(!isOpen)} className="xl:hidden text-white">
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="xl:hidden fixed inset-0 top-16 bg-slate-900 border-t border-slate-800 animate-fade-in z-[999] overflow-y-auto">
          <div className="flex flex-col p-4 gap-2">
            <NavLink to="/profile" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-4 py-4 rounded-lg font-bold text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-800 mb-2 border border-slate-800">
               {dashboard?.profile?.avatar_url ? (
                 <img src={dashboard.profile.avatar_url} alt="Avatar" className="w-6 h-6 rounded-full object-cover" />
               ) : (
                 <UserIcon size={18} />
               )}
               <span>My Profile</span>
            </NavLink>
            {links.map(link => (
              <NavLink 
                key={link.to} 
                to={link.to}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => 
                  `flex items-center gap-3 px-4 py-4 rounded-lg font-bold text-xs uppercase tracking-widest ${
                    isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                  }`
                }
              >
                <link.icon size={18} />
                <span>{link.label}</span>
              </NavLink>
            ))}
            <button 
              onClick={() => { signOut(); setIsOpen(false); }} 
              className="flex items-center gap-3 px-4 py-4 rounded-lg font-bold text-xs uppercase tracking-widest text-red-400 hover:bg-red-400/10 mt-4"
            >
               <LogOut size={18} />
               <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;