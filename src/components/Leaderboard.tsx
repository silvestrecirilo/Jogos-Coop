import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, getDocs, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Player } from '../types';
import { Trophy, Medal, Star, Maximize2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LeaderboardProps {
  isProjection?: boolean;
}

export default function Leaderboard({ isProjection = false }: LeaderboardProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isCleaning, setIsCleaning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'players'),
      orderBy('xp', 'desc'),
      limit(isProjection ? 20 : 10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const playerData: Player[] = [];
      snapshot.forEach((doc) => {
        playerData.push({ id: doc.id, ...doc.data() } as Player);
      });
      setPlayers(playerData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'players');
    });

    return () => unsubscribe();
  }, []);

  const handleClearLeaderboard = async () => {
    setIsCleaning(true);
    try {
      const snapshot = await getDocs(collection(db, 'players'));
      const batch = writeBatch(db);
      snapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      setShowConfirm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'players');
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className={`bg-brand-primary border-brand-text shadow-[8px_8px_0px_0px_#17382E] sm:shadow-[12px_12px_0px_0px_#17382E] overflow-hidden flex flex-col ${
      isProjection ? 'min-h-screen rounded-none border-0' : 'rounded-[32px] sm:rounded-[40px] p-6 sm:p-8 border-4 h-full'
    }`}>
      <div className={`flex items-center justify-between mb-6 ${isProjection ? 'p-6 sm:p-12 pb-0' : ''}`}>
        <div className="flex items-center gap-3">
          <Trophy className={`${isProjection ? 'w-8 h-8 sm:w-12 sm:h-12' : 'w-5 h-5 sm:w-6 sm:h-6'} text-brand-accent`} />
          <h2 className={`${isProjection ? 'text-2xl sm:text-5xl' : 'text-base sm:text-xl'} font-black text-white uppercase tracking-tighter italic break-words`}>
            Placar 🏆
          </h2>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          {!isProjection && (
            <div className="flex items-center gap-2 relative">
              <AnimatePresence>
                {showConfirm ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className="absolute right-0 top-10 sm:top-12 z-50 bg-white border-4 border-brand-text p-4 rounded-2xl shadow-[8px_8px_0px_0px_#17382E] w-48 sm:w-64 text-brand-text"
                  >
                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-tight mb-4">Tem certeza? Isso apagará TUDO!</p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button 
                        onClick={() => setShowConfirm(false)}
                        className="w-full py-2 bg-brand-bg rounded-lg text-[9px] sm:text-[10px] font-black uppercase cursor-pointer"
                      >
                        Não
                      </button>
                      <button 
                        onClick={handleClearLeaderboard}
                        disabled={isCleaning}
                        className="w-full py-2 bg-brand-danger text-white rounded-lg text-[9px] sm:text-[10px] font-black uppercase cursor-pointer disabled:opacity-50"
                      >
                        {isCleaning ? '...' : 'Sim'}
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <>
                    <button 
                      onClick={() => setShowConfirm(true)}
                      className="p-1.5 sm:p-2 bg-white/10 text-white rounded-lg hover:bg-brand-danger transition-all cursor-pointer"
                      title="Limpar Placar"
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    <button 
                      onClick={() => window.open('?view=placar', '_blank')}
                      className="p-1.5 sm:p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all cursor-pointer"
                      title="Projetar Placar"
                    >
                      <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}
          <span className={`${isProjection ? 'text-[10px] sm:text-sm px-3 py-1 sm:px-4 sm:py-2' : 'text-[8px] sm:text-[10px] px-1.5 py-0.5 sm:px-2 sm:py-1'} font-black bg-brand-danger rounded-md animate-pulse text-white uppercase tracking-widest flex-shrink-0`}>
            Ao Vivo
          </span>
        </div>
      </div>
      
      <div className={`flex-1 overflow-y-auto custom-scrollbar ${isProjection ? 'p-6 sm:p-12 pt-6 sm:px-16 space-y-4' : 'space-y-3 pr-2'}`}>
        <AnimatePresence mode="popLayout">
          {players.map((player, index) => (
            <motion.div
              key={player.id}
              layout
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              className={`group flex items-center justify-between transition-all border-b-4 border-brand-text/10 ${
                isProjection ? 'p-4 sm:p-8 rounded-[24px] sm:rounded-[32px]' : 'p-3 sm:p-4 rounded-xl sm:rounded-2xl'
              } ${
                index === 0 ? 'bg-brand-accent text-brand-text' : 
                index === 1 ? 'bg-white/20 text-white' :
                index === 2 ? 'bg-white/15 text-white' :
                'bg-white/10 text-white'
              }`}
            >
              <div className="flex items-center gap-3 sm:gap-6">
                <span className={`flex items-center justify-center font-black opacity-50 ${isProjection ? 'w-8 h-8 sm:w-12 sm:h-12 text-lg sm:text-2xl' : 'w-6 h-6 sm:w-8 sm:h-8 text-[10px] sm:text-xs'}`}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <div className={`font-black uppercase tracking-tight truncate ${isProjection ? 'text-xl sm:text-4xl' : 'text-xs sm:text-sm'}`}>
                    {player.name}
                  </div>
                  <div className={`uppercase tracking-widest font-black opacity-60 truncate ${isProjection ? 'text-xs sm:text-sm' : 'text-[8px] sm:text-[9px]'} ${index === 0 ? 'text-brand-primary' : 'text-white'}`}>
                    {player.lvl}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <span className={`font-black font-mono ${isProjection ? 'text-2xl sm:text-5xl' : 'text-base sm:text-lg'}`}>{player.xp}</span>
                <span className={`font-black uppercase opacity-60 ${isProjection ? 'text-xs sm:text-xl' : 'text-[8px] sm:text-[9px]'}`}>XP</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {players.length === 0 && (
          <div className="py-12 sm:py-24 text-center text-white/20 italic font-black uppercase tracking-widest text-xs sm:text-sm">
            Nenhum registro ainda...
          </div>
        )}
      </div>

      <div className={`mt-4 sm:mt-6 border-t-2 border-white/10 text-white/40 font-black uppercase tracking-[0.2em] flex justify-between items-center ${
        isProjection ? 'px-6 sm:px-16 py-4 sm:py-8 text-sm sm:text-xl' : 'pt-4 text-[7px] sm:text-[9px]'
      }`}>
        <span className="truncate">Sincronizando em tempo real</span>
        <Star className={`${isProjection ? 'w-5 h-5 sm:w-8 h-8' : 'w-2 h-2 sm:w-3 h-3'} animate-pulse text-brand-accent flex-shrink-0`} />
      </div>
    </div>
  );
}
