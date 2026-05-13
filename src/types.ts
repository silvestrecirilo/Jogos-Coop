export interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number; // Index in options
  complexity: 'easy' | 'medium' | 'high';
  xp: number;
  xpPenalty: number;
}

export interface Card {
  id: string;
  name: string;
  description: string;
  xpEffect: number;
  type: 'benefit' | 'crisis' | 'coringa';
}

export interface Player {
  id: string;
  name: string;
  xp: number;
  lvl: string;
  lastUpdated: string;
}

export enum GameState {
  LOGIN = 'login',
  PLAYING = 'playing',
  CARD_DISPLAY = 'card_display',
  CRISIS_DECISION = 'crisis_decision',
  WILDCARD = 'wildcard',
  FINISHED = 'finished'
}

export type Level = '🌱 Iniciante' | '🤝 Cooperador' | '🎓 Facilitador' | '⭐ Mestre da Convivência';

export const getLevel = (xp: number): Level => {
  if (xp >= 450) return '⭐ Mestre da Convivência';
  if (xp >= 300) return '🎓 Facilitador';
  if (xp >= 150) return '🤝 Cooperador';
  return '🌱 Iniciante';
};
