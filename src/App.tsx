import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Quiz from './components/Quiz';
import { GameState } from './types';
import { Trophy, Play, Brain, Users, Heart } from 'lucide-react';
import Leaderboard from './components/Leaderboard';
import { auth, ensureAuth } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

export default function App() {
  const [playerName, setPlayerName] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [isProjectionView, setIsProjectionView] = useState(false);

  useEffect(() => {
    // Check for projection view in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'placar') {
      setIsProjectionView(true);
    }

    // Persistent local ID for players without auth
    if (!localStorage.getItem('temp_player_id')) {
      localStorage.setItem('temp_player_id', 'temp_' + Math.random().toString(36).substring(2, 11));
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim()) {
      setGameStarted(true);
      // Attempt auth in background if not ready
      if (!user) {
        ensureAuth().catch(() => console.warn("Background auth failed"));
      }
    }
  };

  if (isProjectionView) {
    return (
      <div className="min-h-screen bg-brand-primary">
        <Leaderboard isProjection />
      </div>
    );
  }

  if (gameStarted) {
    const effectiveId = user?.uid || localStorage.getItem('temp_player_id') || 'temp';
    return (
      <div className="min-h-screen bg-brand-bg text-brand-text selection:bg-brand-accent selection:text-brand-text">
        <Quiz playerName={playerName} playerId={effectiveId} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text selection:bg-brand-accent selection:text-brand-text overflow-x-hidden">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:py-24 grid lg:grid-cols-5 gap-8 lg:gap-16 items-center">
        
        {/* Left Content */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-3 space-y-8 lg:space-y-12"
        >
          <div className="space-y-6">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-accent text-brand-primary text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] border-2 border-brand-text"
            >
              <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Desafio de Convivência
            </motion.div>
            
            <h1 className="text-4xl sm:text-6xl lg:text-8xl font-black uppercase tracking-tighter leading-[0.85] italic text-brand-text break-words">
              Jogos <br />
              <span className="text-brand-primary">Cooperativos</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-brand-muted max-w-xl leading-relaxed font-bold">
              Explore os fundamentos, a história e a prática da Pedagogia da Convivência através de um desafio gamificado de 15 níveis.
            </p>
          </div>

          <form onSubmit={handleStart} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.25em] text-brand-label font-black ml-4">Nome Completo do Facilitador</label>
              <input
                required
                type="text"
                placeholder="Ex: Fábio Otuzi Brotto"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full bg-white border-4 border-brand-text rounded-[32px] px-6 py-5 text-lg focus:outline-none focus:ring-4 focus:ring-brand-accent/30 transition-all placeholder:text-brand-muted/20 font-bold shadow-[8px_8px_0px_0px_#17382E]"
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="group w-full py-5 px-8 bg-brand-primary text-white font-black uppercase tracking-widest rounded-[32px] flex items-center justify-center gap-3 hover:translate-y-1 hover:shadow-none border-b-8 border-brand-text transition-all active:border-b-0 cursor-pointer shadow-[0px_8px_0px_0px_#17382E] disabled:opacity-50"
            >
              {loading ? 'Iniciando...' : 'Iniciar Experiência'} <Play className="w-5 h-5 fill-current" />
            </button>
          </form>

          <div className="grid grid-cols-3 gap-8 pt-8 border-t-4 border-brand-accent">
            <div className="space-y-2">
              <Brain className="w-6 h-6 text-brand-primary" />
              <div className="text-xs font-black uppercase tracking-widest">Aprenda</div>
              <div className="text-[10px] text-brand-muted leading-snug font-mono uppercase font-bold">Princípios de Orlick & Brotto</div>
            </div>
            <div className="space-y-2">
              <Users className="w-6 h-6 text-brand-primary" />
              <div className="text-xs font-black uppercase tracking-widest">Conviva</div>
              <div className="text-[10px] text-brand-muted leading-snug font-mono uppercase font-bold">Estratégias de Inclusão</div>
            </div>
            <div className="space-y-2">
              <Heart className="w-6 h-6 text-brand-primary" />
              <div className="text-xs font-black uppercase tracking-widest">Transforme</div>
              <div className="text-[10px] text-brand-muted leading-snug font-mono uppercase font-bold">Educação para a Paz</div>
            </div>
          </div>
        </motion.div>

        {/* Right Content - Leaderboard Preview */}
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 hidden lg:block"
        >
          <Leaderboard />
        </motion.div>

      </div>

      <footer className="fixed bottom-0 left-0 w-full p-4 sm:p-8 flex justify-between items-center text-[8px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em] text-brand-label/40 font-black pointer-events-none">
        <div>UFRRJ | IE512 | 2025</div>
        <div className="text-right">Pedagogia da Convivência</div>
      </footer>
    </div>
  );
}
