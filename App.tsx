import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GameProvider, useGame } from './context/GameContext';
import Navbar from './components/Navbar';
import Dashboard from './views/Dashboard';
import Shop from './views/Shop';
import Collection from './views/Collection';
import Leaderboard from './views/Leaderboard';
import Marketplace from './views/Marketplace';
import QuestsAndAchievements from './views/QuestsAndAchievements';
import Login from './views/Login';
import Decks from './views/Decks';
import BattleArena from './views/BattleArena';
import Friends from './views/Friends';
import Trading from './views/Trading';
import ItemShop from './views/ItemShop';
import UserProfile from './views/UserProfile';
import Toast from './components/Toast';
import ChatWidget from './components/ChatWidget';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useGame();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
       <Navbar />
       <main className="flex-1 container mx-auto px-4 py-8">
         <RouterRoutes />
       </main>
       <ChatWidget />
    </div>
  );
};

const RouterRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/shop" element={<Shop />} />
      <Route path="/items" element={<ItemShop />} />
      <Route path="/collection" element={<Collection />} />
      <Route path="/decks" element={<Decks />} />
      <Route path="/battle" element={<BattleArena />} />
      <Route path="/marketplace" element={<Marketplace />} />
      <Route path="/trading" element={<Trading />} />
      <Route path="/friends" element={<Friends />} />
      <Route path="/profile" element={<UserProfile />} />
      <Route path="/quests" element={<QuestsAndAchievements />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

const GlobalUI: React.FC = () => {
  const { toasts, removeToast } = useGame();
  return <Toast toasts={toasts} removeToast={removeToast} />;
}

const AppContent: React.FC = () => {
  const { user } = useGame();
  return (
    <Router>
       <GlobalUI />
       <Routes>
         <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
         <Route path="/*" element={
           <ProtectedRoute>
             <Layout />
           </ProtectedRoute>
         } />
       </Routes>
    </Router>
  );
}

const App: React.FC = () => {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
};

export default App;