import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { setDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, ensureAuth } from '../firebase';
import { GameState, Level, getLevel, Question, Card } from '../types';
import { QUESTIONS, CARDS, WILDCARD_QUESTION } from '../data/content';
import { CheckCircle2, XCircle, Zap, ShieldAlert, Sparkles, Award, ArrowRight, BrainCircuit } from 'lucide-react';
import Leaderboard from './Leaderboard';

interface QuizProps {
  playerName: string;
  playerId: string;
}

export default function Quiz({ playerName, playerId }: QuizProps) {
  const [gameState, setGameState] = useState<GameState>(GameState.PLAYING);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [xp, setXp] = useState(100);
  const [streak, setStreak] = useState(0);
  const [history, setHistory] = useState<{ questionId: number, xpResult: number, isCorrect: boolean }[]>([]);
  const [lastCard, setLastCard] = useState<Card | null>(null);
  const [showCard, setShowCard] = useState(false);
  const [crisisActive, setCrisisActive] = useState(false);
  const [wildcardActive, setWildcardActive] = useState(false);
  const [crisisFeedback, setCrisisFeedback] = useState<{ impact: number, choice: string } | null>(null);
  const [wildcardUnlocked, setWildcardUnlocked] = useState(false);

  const currentLevel = getLevel(xp);
  const currentQuestion = gameState === GameState.WILDCARD ? WILDCARD_QUESTION : QUESTIONS[currentQuestionIndex];

  // Randomly shuffle questions once if needed, but the prompt says 15 questions (10 easy + 5 medium)
  // I'll stick to the provided order but we can shuffle the easy/medium blocks if we want.
  // For now, I'll follow the logical progression.

  useEffect(() => {
    // Update score in Firestore
    const updatePlayer = async () => {
      const path = `players/${playerId}`;
      try {
        await ensureAuth();
        await setDoc(doc(db, 'players', playerId), {
          name: playerName,
          xp: xp,
          lvl: currentLevel,
          lastUpdated: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, path);
      }
    };
    updatePlayer();
  }, [xp, currentLevel, playerId, playerName]);

  const handleAnswer = (optionIndex: number) => {
    const isCorrect = optionIndex === currentQuestion.correctAnswer;
    const isEasy = currentQuestion.complexity === 'easy';
    
    let xpChange = isCorrect 
      ? currentQuestion.xp 
      : -currentQuestion.xpPenalty;

    // Streak bonus
    const newStreak = isCorrect ? streak + 1 : 0;
    setStreak(newStreak);
    
    if (newStreak >= 3) {
      xpChange += 10;
    }

    // Trigger Card
    const cardPool = isCorrect ? CARDS.filter(c => c.type === 'benefit') : CARDS.filter(c => c.type === 'crisis');
    const randomCard = cardPool[Math.floor(Math.random() * cardPool.length)];
    setLastCard(randomCard);
    xpChange += randomCard.xpEffect;

    setXp(prev => Math.max(0, prev + xpChange));
    setHistory([...history, { questionId: currentQuestion.id, xpResult: xpChange, isCorrect }]);
    
    setShowCard(true);

    // Wildcard check
    if (newStreak === 10 && !wildcardUnlocked) {
      setWildcardUnlocked(true);
    }
  };

  const nextStep = () => {
    setShowCard(false);
    
    if (wildcardUnlocked && !wildcardActive) {
      setWildcardActive(true);
      setGameState(GameState.WILDCARD_DECISION);
      setWildcardUnlocked(false);
      return;
    }

    const nextIndex = currentQuestionIndex + 1;
    
    // Crisis check (rounds 4, 8, 12, 14)
    const crisisRounds = [3, 7, 11, 13]; // 0-indexed rounds corresponding to 4, 8, 12, 14
    
    if (crisisRounds.includes(nextIndex) && !crisisActive) {
      setCrisisActive(true);
      setGameState(GameState.CRISIS_DECISION);
      return;
    }

    if (wildcardUnlocked && nextIndex === 15) {
      setGameState(GameState.WILDCARD);
      return;
    }

    if (nextIndex >= QUESTIONS.length) {
      setGameState(GameState.FINISHED);
    } else {
      setCurrentQuestionIndex(nextIndex);
      setGameState(GameState.PLAYING);
    }
  };

  const handleCrisisDecision = (impact: number, choice: string) => {
    setXp(prev => Math.max(0, prev + impact));
    setCrisisFeedback({ impact, choice });
  };

  const handleWildcardDecision = (impact: number, choice: string) => {
    setXp(prev => Math.max(0, prev + impact));
    setCrisisFeedback({ impact, choice });
  };

  const finishCrisis = () => {
    setCrisisActive(false);
    setWildcardActive(false);
    setCrisisFeedback(null);
    setGameState(GameState.PLAYING);
    // Move to next question after decision
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex >= QUESTIONS.length) {
      setGameState(GameState.FINISHED);
    } else {
      setCurrentQuestionIndex(nextIndex);
    }
  };

  if (gameState === GameState.FINISHED) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }}
        className="max-w-5xl mx-auto p-6 md:py-12 text-brand-text space-y-12"
      >
        <div className="text-center space-y-4">
          <div className="w-24 h-24 bg-brand-accent rounded-[32px] border-4 border-brand-text flex items-center justify-center mx-auto brutalist-shadow">
            <Award className="w-12 h-12 text-brand-primary" />
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tighter italic">Caminhada Concluída!</h1>
          <p className="text-xl text-brand-muted font-bold">Parabéns, {playerName}. Sua jornada na Pedagogia da Convivência foi registrada.</p>
          
          <div className="flex justify-center gap-6 pt-4">
            <div className="bg-white p-6 rounded-[32px] border-4 border-brand-text brutalist-shadow w-40">
              <div className="text-xs text-brand-label uppercase font-black tracking-widest mb-1">XP Total</div>
              <div className="text-4xl font-black text-brand-primary font-mono">{xp}</div>
            </div>
            <div className="bg-brand-primary p-6 rounded-[32px] border-4 border-brand-text brutalist-shadow-sm w-48 text-white">
              <div className="text-xs text-white/60 uppercase font-black tracking-widest mb-1">Nível Final</div>
              <div className="text-xl font-black leading-tight uppercase italic">{currentLevel.split(' ')[1]}</div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          <div className="space-y-6">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-brand-label flex items-center gap-2">
              <BrainCircuit className="w-5 h-5" /> Histórico da Questão
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-4 custom-scrollbar">
              {history.map((h, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white border-2 border-brand-text/10 hover:border-brand-text/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${h.isCorrect ? 'bg-brand-success/20' : 'bg-brand-danger/20'}`}>
                      {h.isCorrect ? <CheckCircle2 className="w-5 h-5 text-brand-success" /> : <XCircle className="w-5 h-5 text-brand-danger" />}
                    </div>
                    <span className="text-sm font-black text-brand-muted uppercase tracking-widest">Questão {h.questionId === 99 ? '★' : String(h.questionId).padStart(2, '0')}</span>
                  </div>
                  <span className={`font-mono font-black ${h.xpResult >= 0 ? 'text-brand-success' : 'text-brand-danger'}`}>
                    {h.xpResult >= 0 ? `+${h.xpResult}` : h.xpResult} XP
                  </span>
                </div>
              ))}
            </div>
          </div>
          <Leaderboard />
        </div>

        <div className="text-center pt-8">
          <button 
            onClick={() => window.location.reload()}
            className="px-12 py-5 bg-brand-accent text-brand-text font-black uppercase tracking-widest rounded-[32px] border-b-8 border-brand-text hover:translate-y-1 active:border-b-0 transition-all shadow-[0px_8px_0px_0px_#17382E] cursor-pointer"
          >
            Jogar Novamente
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-brand-bg">
      {/* Header HUD */}
      <header className="h-20 sm:h-24 bg-white border-b-4 border-brand-accent flex items-center justify-between px-4 sm:px-8 shadow-sm">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-accent rounded-xl sm:rounded-2xl border-2 border-brand-text flex items-center justify-center text-xl sm:text-2xl font-black text-brand-primary">IE</div>
          <div>
            <h1 className="text-sm sm:text-lg font-black uppercase tracking-tight text-brand-text leading-none truncate max-w-[100px] sm:max-w-none">{playerName}</h1>
            <p className="text-[8px] sm:text-[10px] font-black text-brand-muted uppercase tracking-widest mt-0.5 sm:mt-1">Convivência</p>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6 lg:gap-10">
          <div className="hidden sm:block text-center">
            <p className="text-[9px] font-black text-brand-label uppercase tracking-[0.2em]">Nível Atual</p>
            <div className="mt-1">
              <span className="px-3 py-1 bg-brand-primary text-white text-[10px] font-black rounded-full uppercase tracking-widest">{currentLevel}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black text-brand-label uppercase tracking-[0.2em]">Pontuação</p>
            <p className="text-xl sm:text-2xl font-black text-brand-text leading-none mt-1 font-mono">{xp} <span className="text-xs text-brand-success uppercase">XP</span></p>
          </div>
          {streak >= 2 && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="w-20 sm:w-24 h-10 sm:h-12 bg-brand-danger rounded-xl flex flex-col items-center justify-center text-white border-b-4 border-brand-text shadow-sm"
            >
              <p className="text-[7px] sm:text-[8px] font-black uppercase leading-none tracking-widest">Streak</p>
              <p className="text-sm sm:text-lg font-black italic">{streak} 🔥</p>
            </motion.div>
          )}
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 grid lg:grid-cols-5 gap-6 lg:gap-8 overflow-x-hidden">
        {/* Main Quiz Area */}
        <div className="lg:col-span-3 flex flex-col gap-6 w-full overflow-x-hidden">
          <AnimatePresence mode="wait">
            {gameState === GameState.WILDCARD_DECISION ? (
              <motion.div
                key="wildcard_decision"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-brand-accent/20 border-4 border-brand-accent p-8 md:p-12 rounded-[40px] space-y-8 relative overflow-hidden brutalist-shadow-lg"
              >
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Award className="w-64 h-64 text-brand-accent" />
                </div>
                
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-primary text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                    <Zap className="w-4 h-4 text-brand-accent" /> Carta Coringa Desbloqueada!
                  </div>
                  <h2 className="text-2xl sm:text-3xl md:text-5xl font-black text-brand-text uppercase tracking-tighter leading-tight italic break-words">
                    Mestria em Convivência
                  </h2>
                </div>

                <p className="text-lg sm:text-xl text-brand-muted leading-relaxed max-w-2xl font-bold">
                  Sua fluência na Pedagogia da Convivência é notável! Com um streak de 10 acertos, você atingiu um patamar de excelência. Como deseja direcionar sua liderança agora?
                </p>

                <div className="grid md:grid-cols-2 gap-6 pt-4">
                  <AnimatePresence mode="wait">
                    {!crisisFeedback ? (
                      <>
                        <motion.button 
                          key="wild1"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          onClick={() => handleWildcardDecision(50, "Multiplicador Social")}
                          className="p-8 bg-white border-4 border-brand-text rounded-3xl text-left transition-all group shadow-[0px_8px_0px_0px_#17382E] hover:translate-y-1 hover:shadow-none cursor-pointer"
                        >
                          <div className="font-black text-lg uppercase tracking-tight mb-2 group-hover:text-brand-primary transition-colors">
                            Multiplicador Social
                          </div>
                          <div className="text-xs text-brand-muted font-bold leading-relaxed">
                            Expandir os horizontes e inspirar outros facilitadores com suas práticas exitosas.
                          </div>
                        </motion.button>
                        <motion.button 
                          key="wild2"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          onClick={() => handleWildcardDecision(50, "Pilar Comunitário")}
                          className="p-8 bg-white border-4 border-brand-text rounded-3xl text-left transition-all group shadow-[0px_8px_0px_0px_#17382E] hover:translate-y-1 hover:shadow-none cursor-pointer"
                        >
                          <div className="font-black text-lg uppercase tracking-tight mb-2 group-hover:text-brand-primary transition-colors">
                            Pilar Comunitário
                          </div>
                          <div className="text-xs text-brand-muted font-bold leading-relaxed">
                            Focar no aprofundamento dos vínculos e na segurança psicológica do seu grupo atual.
                          </div>
                        </motion.button>
                      </>
                    ) : (
                      <motion.div 
                        key="feedback_wildcard"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="col-span-full bg-white border-4 border-brand-text p-8 rounded-3xl shadow-[0px_8px_0px_0px_#17382E] text-center space-y-6"
                      >
                        <div className="flex justify-center">
                          <div className="w-16 h-16 rounded-2xl flex items-center justify-center border-4 border-brand-text bg-brand-accent">
                            <Zap className="w-8 h-8 text-brand-primary" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Você escolheu</div>
                          <div className="text-2xl font-black text-brand-text uppercase italic">{crisisFeedback.choice}</div>
                        </div>
                        <div className="text-4xl font-black font-mono text-brand-text">
                          +{crisisFeedback.impact} XP
                        </div>
                        <button 
                          onClick={finishCrisis}
                          className="w-full py-4 bg-brand-primary text-white font-black uppercase tracking-widest rounded-2xl border-b-4 border-brand-text hover:translate-y-1 transition-all cursor-pointer"
                        >
                          Continuar Jornada
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ) : gameState === GameState.CRISIS_DECISION ? (
              <motion.div
                key="crisis"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-brand-danger/10 border-4 border-brand-danger p-8 md:p-12 rounded-[40px] space-y-8 relative overflow-hidden brutalist-shadow-lg"
              >
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <ShieldAlert className="w-64 h-64 text-brand-danger" />
                </div>
                
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-danger text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                    <ShieldAlert className="w-4 h-4" /> Alerta de Crise
                  </div>
                  <h2 className="text-2xl sm:text-3xl md:text-5xl font-black text-brand-text uppercase tracking-tighter leading-tight italic break-words">
                    {currentQuestionIndex === 2 && "Competitividade Tóxica"}
                    {currentQuestionIndex === 6 && "Exclusão Silenciosa"}
                    {currentQuestionIndex === 10 && "Debriefing Ignorado"}
                    {currentQuestionIndex === 12 && "Conflito Não Mediado"}
                  </h2>
                </div>

                <p className="text-lg sm:text-xl text-brand-muted leading-relaxed max-w-2xl font-bold">
                  {currentQuestionIndex === 2 && "Um grupo compete agressivamente, excluindo os menos habilidosos. O esportivismo tomou conta da aula. Qual sua intervenção?"}
                  {currentQuestionIndex === 6 && "Um aluno é ignorado sistematicamente pelo grupo. O princípio da aceitação foi violado. Intervenção necessária!"}
                  {currentQuestionIndex === 10 && "A reflexão final foi pulada por pressão da coordenação. A vivência ficou sem sentido pedagógico. Oportunidade perdida!"}
                  {currentQuestionIndex === 12 && "Um conflito sério eclodiu e não houve facilitação pedagógica. O debriefing foi ignorado. O que fazer?"}
                </p>

                <div className="grid md:grid-cols-2 gap-6 pt-4">
                  <AnimatePresence mode="wait">
                    {!crisisFeedback ? (
                      <>
                        <motion.button 
                          key="opt1"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          onClick={() => handleCrisisDecision(-20, currentQuestionIndex === 2 ? "Punição Coletiva" : currentQuestionIndex === 6 ? "Ignorar Sentimento" : currentQuestionIndex === 10 ? "Ceder à Pressão" : "Negligenciar Conflito")}
                          className="p-8 bg-white border-4 border-brand-text rounded-3xl text-left transition-all group shadow-[0px_8px_0px_0px_#17382E] hover:translate-y-1 hover:shadow-none cursor-pointer"
                        >
                          <div className="font-black text-lg uppercase tracking-tight mb-2 group-hover:text-brand-primary transition-colors">
                            {currentQuestionIndex === 2 && "Punição Coletiva"}
                            {currentQuestionIndex === 6 && "Ignorar Sentimento"}
                            {currentQuestionIndex === 10 && "Ceder à Pressão"}
                            {currentQuestionIndex === 12 && "Negligenciar Conflito"}
                          </div>
                          <div className="text-xs text-brand-muted font-bold leading-relaxed">
                            {currentQuestionIndex === 2 && "Interromper o jogo abruptamente sem diálogo."}
                            {currentQuestionIndex === 6 && "Prosseguir o jogo focando apenas no resultado."}
                            {currentQuestionIndex === 10 && "Encerrar a aula sem qualquer tipo de reflexão."}
                            {currentQuestionIndex === 12 && "Deixar que os alunos se resolvam sozinhos."}
                          </div>
                        </motion.button>
                        <motion.button 
                          key="opt2"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          onClick={() => handleCrisisDecision(15, currentQuestionIndex === 2 ? "Reestruturar Regras" : currentQuestionIndex === 6 ? "Debriefing Relâmpago" : currentQuestionIndex === 10 ? "Garantir Reflexão" : "Facilitação Ativa")}
                          className="p-8 bg-white border-4 border-brand-text rounded-3xl text-left transition-all group shadow-[0px_8px_0px_0px_#17382E] hover:translate-y-1 hover:shadow-none cursor-pointer"
                        >
                          <div className="font-black text-lg uppercase tracking-tight mb-2 group-hover:text-brand-primary transition-colors">
                            {currentQuestionIndex === 2 && "Reestruturar Regras"}
                            {currentQuestionIndex === 6 && "Debriefing Relâmpago"}
                            {currentQuestionIndex === 10 && "Garantir Reflexão"}
                            {currentQuestionIndex === 12 && "Facilitação Ativa"}
                          </div>
                          <div className="text-xs text-brand-muted font-bold leading-relaxed">
                            {currentQuestionIndex === 2 && "Pausar e propor regra que garanta a inclusão."}
                            {currentQuestionIndex === 6 && "Abrir espaço imediato para acolhimento grupal."}
                            {currentQuestionIndex === 10 && "Garantir 5min de roda apesar da pressa externa."}
                            {currentQuestionIndex === 12 && "Atuar na mediação para gerar crescimento coletivo."}
                          </div>
                        </motion.button>
                      </>
                    ) : (
                      <motion.div 
                        key="feedback"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="col-span-full bg-white border-4 border-brand-text p-8 rounded-3xl shadow-[0px_8px_0px_0px_#17382E] text-center space-y-6"
                      >
                        <div className="flex justify-center">
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-4 border-brand-text ${crisisFeedback.impact > 0 ? 'bg-brand-success' : 'bg-brand-danger'}`}>
                            {crisisFeedback.impact > 0 ? <Sparkles className="w-8 h-8 text-white" /> : <ShieldAlert className="w-8 h-8 text-white" />}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Você escolheu</div>
                          <div className="text-2xl font-black text-brand-text uppercase italic">{crisisFeedback.choice}</div>
                        </div>
                        <div className="text-4xl font-black font-mono text-brand-text">
                          {crisisFeedback.impact > 0 ? '+' : ''}{crisisFeedback.impact} XP
                        </div>
                        <button 
                          onClick={finishCrisis}
                          className="w-full py-4 bg-brand-primary text-white font-black uppercase tracking-widest rounded-2xl border-b-4 border-brand-text hover:translate-y-1 transition-all cursor-pointer"
                        >
                          Continuar Jornada
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border-4 border-brand-text rounded-[32px] sm:rounded-[40px] p-6 sm:p-8 md:p-12 space-y-8 sm:space-y-10 relative brutalist-shadow flex-1 flex flex-col"
              >
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="w-fit px-5 py-2 bg-brand-label text-white rounded-full text-[10px] font-black uppercase tracking-widest font-mono">
                      Questão {String(currentQuestionIndex + 1).padStart(2, '0')} / 15
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-widest font-mono ${
                      currentQuestion.complexity === 'easy' ? 'text-brand-success' : 
                      currentQuestion.complexity === 'medium' ? 'text-orange-500' : 
                      'text-brand-primary'
                    }`}>
                      Complexidade: {currentQuestion.complexity === 'easy' ? 'Baixa' : 
                       currentQuestion.complexity === 'medium' ? 'Média' : 'Alta (Coringa)'}
                    </span>
                  </div>
                  
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-brand-text leading-[1.1] italic uppercase tracking-tighter break-words">
                    {currentQuestion.text}
                  </h2>
                </div>

                <div className="grid gap-3 sm:pt-6">
                  {currentQuestion.options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAnswer(idx)}
                      className="group flex items-center gap-3 sm:gap-5 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border-2 border-brand-bg hover:border-brand-primary hover:bg-brand-primary/5 text-left transition-all active:scale-[0.98] cursor-pointer"
                    >
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-brand-bg group-hover:bg-brand-primary group-hover:text-white flex-shrink-0 flex items-center justify-center font-black text-brand-muted transition-all text-xs sm:text-sm border-2 border-brand-text/10 group-hover:border-transparent">
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <span className="text-base sm:text-lg font-bold text-brand-muted group-hover:text-brand-text transition-colors">
                        {option}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex-1">
            <Leaderboard />
          </div>
          
          <div className="h-44 bg-white border-4 border-brand-text rounded-[32px] p-6 shadow-[8px_8px_0px_0px_#17382E] flex flex-col">
            <h3 className="text-[10px] font-black text-brand-label uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <BrainCircuit className="w-4 h-4" /> Histórico Recente
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
              {history.slice(-3).reverse().map((h, i) => (
                <div key={i} className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                  <span className={h.isCorrect ? 'text-brand-success' : 'text-brand-danger'}>
                    Questão {h.questionId} - {h.isCorrect ? 'Correta' : 'Incorreta'}
                  </span>
                  <span className={h.xpResult >= 0 ? 'text-brand-success' : 'text-brand-danger'}>
                    {h.xpResult >= 0 ? `+${h.xpResult}` : h.xpResult} XP
                  </span>
                </div>
              ))}
              {lastCard && history.length > 0 && (
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-brand-primary pt-1 border-t border-brand-bg mt-1">
                  <span>Carta: {lastCard.name}</span>
                  <span>{lastCard.xpEffect >= 0 ? `+${lastCard.xpEffect}` : lastCard.xpEffect} XP</span>
                </div>
              )}
            </div>
          </div>
        </aside>
      </main>

      {/* Progress Footer */}
      <footer className="h-4 bg-[#DFE6E9] w-full relative">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${(currentQuestionIndex / 15) * 100}%` }}
          className="h-full bg-brand-primary rounded-r-full shadow-[0px_-2px_10px_rgba(0,184,148,0.4)]"
        />
      </footer>

      {/* Card Overlay */}
      <AnimatePresence>
        {showCard && lastCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.8, y: 50, rotate: -5 }}
              animate={{ scale: 1, y: 0, rotate: 0 }}
              className={`max-w-md w-full p-6 sm:p-10 rounded-[32px] sm:rounded-[40px] border-4 border-brand-text shadow-[8px_8px_0px_0px_#17382E] sm:shadow-[16px_16px_0px_0px_#17382E] space-y-6 sm:space-y-8 text-center relative ${
                lastCard.type === 'benefit' ? 'bg-brand-success' : 'bg-brand-danger'
              }`}
            >
              <div className="flex justify-center">
                <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-[1.5rem] sm:rounded-[2rem] bg-white border-4 border-brand-text flex items-center justify-center shadow-[4px_4px_0px_0px_#17382E] sm:shadow-[6px_6px_0px_0px_#17382E]">
                  {lastCard.type === 'benefit' ? (
                    <Sparkles className="w-8 h-8 sm:w-12 sm:h-12 text-brand-success" />
                  ) : (
                    <ShieldAlert className="w-8 h-8 sm:w-12 sm:h-12 text-brand-danger" />
                  )}
                </div>
              </div>

              <div className="space-y-2 sm:space-y-3">
                <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.3em] font-mono text-brand-text/50">
                   Carta Ativada: {lastCard.type === 'benefit' ? 'Sinergia' : 'Alerta'}
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-brand-text uppercase tracking-tighter italic leading-none">
                  {lastCard.name}
                </h3>
              </div>

              <p className="text-brand-text font-bold text-base sm:text-lg leading-relaxed">
                {lastCard.description}
              </p>

              <div className="text-3xl sm:text-5xl font-black font-mono text-brand-text">
                {lastCard.xpEffect >= 0 ? '+' : ''}{lastCard.xpEffect} <span className="text-lg sm:text-xl">XP</span>
              </div>

              <button
                onClick={nextStep}
                className="w-full py-4 sm:py-5 px-6 sm:px-8 bg-brand-accent text-brand-text font-black uppercase tracking-widest rounded-[24px] sm:rounded-3xl border-b-4 sm:border-b-8 border-brand-text hover:translate-y-1 active:border-b-0 transition-all cursor-pointer flex items-center justify-center gap-3 shadow-[0px_4px_0px_0px_#17382E]"
              >
                Continuar <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
