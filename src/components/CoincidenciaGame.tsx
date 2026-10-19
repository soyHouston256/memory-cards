'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, Timer } from 'lucide-react';

type Card = { symbol: string; color: string; id: number };
type Feedback = { correct: boolean; message: string; points?: number };

const CoincidenciaGame = () => {
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameState, setGameState] = useState('playing');
  
  const [cards, setCards] = useState<Card[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'memorize' | 'gap' | 'answer' | 'feedback' | 'level'>('idle');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const answered = useRef(false);
  const currentCard = cards[currentCardIndex] ?? null;
  const previousCard = cards[currentCardIndex - 1] ?? null;
  const canAnswer = phase === 'answer';
  const isShowingCard = phase === 'memorize' || phase === 'answer' || phase === 'feedback';
  const cardsHistory = cards.slice(Math.max(0, currentCardIndex - 3), currentCardIndex);

  const symbols = ['♠', '♥', '♦', '♣'];
  const colors = ['#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#14B8A6'];

  const levelConfig: Record<number, { totalCards: number; name: string; matchProbability: number }> = {
    1: { totalCards: 15, name: "Nivel 1", matchProbability: 0.3 },
    2: { totalCards: 20, name: "Nivel 2", matchProbability: 0.35 },
    3: { totalCards: 25, name: "Nivel 3", matchProbability: 0.4 },
    4: { totalCards: 30, name: "Nivel 4", matchProbability: 0.45 },
    5: { totalCards: 35, name: "Nivel 5", matchProbability: 0.5 },
  };

  const generateCard = () => ({
    symbol: symbols[Math.floor(Math.random() * symbols.length)],
    color: colors[Math.floor(Math.random() * colors.length)],
    id: Math.random()
  });

  const generateCardSequence = (roundLevel: number) => {
    const config = levelConfig[roundLevel];
    const sequence: Card[] = [];
    
    for (let i = 0; i < config.totalCards; i++) {
      if (i === 0) {
        sequence.push(generateCard());
      } else {
        const shouldMatch = Math.random() < config.matchProbability;
        
        if (shouldMatch) {
          sequence.push({ ...sequence[i - 1], id: Math.random() });
        } else {
          let newCard;
          do {
            newCard = generateCard();
          } while (
            newCard.symbol === sequence[i - 1].symbol && 
            newCard.color === sequence[i - 1].color
          );
          sequence.push(newCard);
        }
      }
    }
    
    return sequence;
  };

  const startNewRound = (roundLevel = 1) => {
    answered.current = false;
    setLevel(roundLevel);
    setCards(generateCardSequence(roundLevel));
    setCurrentCardIndex(0);
    setFeedback(null);
    setPhase('memorize');
  };

  const handleAnswer = useCallback((playerSaysMatch: boolean) => {
    if (phase !== 'answer' || answered.current || !previousCard || !currentCard) return;
    // Lock synchronously: a click and ENTER in the same frame count only once.
    answered.current = true;
    const actualMatch = previousCard.symbol === currentCard.symbol && previousCard.color === currentCard.color;
    const correct = playerSaysMatch === actualMatch;
    setScore(value => Math.max(0, value + (correct ? 100 : -50)));
    setFeedback({
      correct,
      message: correct ? '✓ +100' : playerSaysMatch ? '✗ -50 No coincidían' : '✗ -50 Debiste presionar ENTER',
      points: correct ? 100 : -50,
    });
    setPhase('feedback');
  }, [phase, previousCard, currentCard]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (phase === 'memorize') {
      timer = setTimeout(() => setPhase('gap'), 2500);
    } else if (phase === 'answer') {
      timer = setTimeout(() => handleAnswer(false), 3000);
    } else if (phase === 'feedback') {
      timer = setTimeout(() => {
        setFeedback(null);
        if (currentCardIndex === cards.length - 1) {
          if (level === 5) setGameState('won');
          else {
            setFeedback({ correct: true, message: `¡Nivel ${level} completado!` });
            setPhase('level');
          }
        } else setPhase('gap');
      }, 350);
    } else if (phase === 'gap') {
      timer = setTimeout(() => {
        answered.current = false;
        setCurrentCardIndex(index => index + 1);
        setPhase('answer');
      }, 150);
    } else if (phase === 'level') {
      timer = setTimeout(() => startNewRound(level + 1), 1200);
    }
    return () => clearTimeout(timer);
  }, [phase, currentCardIndex, cards.length, level, handleAnswer]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code !== 'Space' && event.code !== 'Enter') return;
      // Preserve native button activation without also handling the same key globally.
      if (event.target instanceof HTMLElement && event.target.closest('button')) return;
      event.preventDefault();
      if (event.repeat) return;
      if (event.code === 'Space' && (!gameStarted || gameState === 'won')) {
        setGameStarted(true);
        setScore(0);
        setGameState('playing');
        startNewRound(1);
      } else if (event.code === 'Enter' && gameStarted && gameState === 'playing') {
        handleAnswer(true);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameStarted, gameState, handleAnswer]);

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-2xl text-center">
          <div className="mb-8">
            <Trophy className="w-20 h-20 mx-auto text-yellow-500 mb-4" />
            <h1 className="text-5xl font-bold text-gray-800 mb-4">Memoria Secuencial</h1>
            <p className="text-xl text-gray-600">¿Coincide con la carta anterior?</p>
          </div>

          <div className="bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 rounded-xl p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Cómo Jugar</h2>
            <div className="space-y-3 text-left">
              <p className="text-gray-700">🎴 Se muestra la carta 1 por 2.5 segundos</p>
              <p className="text-gray-700">🔄 La carta 1 se voltea (queda boca abajo)</p>
              <p className="text-gray-700">👁️ Aparece la carta 2</p>
              <p className="text-gray-700">❓ ¿La carta 2 coincide con la carta 1?</p>
              <p className="text-gray-700 font-bold text-lg">✅ Si COINCIDEN → Presiona ENTER (+100 pts)</p>
              <p className="text-gray-700 font-bold text-lg">⏭️ Si NO coinciden → No hagas nada (+100 pts)</p>
              <p className="text-gray-700">🔁 La carta se voltea automáticamente después de 3 segundos</p>
              <p className="text-gray-700">⚠️ Error = -50 puntos</p>
              <p className="text-gray-700">🎯 Completa 15 cartas para pasar de nivel</p>
            </div>
          </div>

          <button
            onClick={() => { setGameStarted(true); startNewRound(); }}
            className="bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 text-white text-2xl font-bold px-12 py-4 rounded-xl hover:from-pink-700 hover:via-purple-700 hover:to-blue-700 transform hover:scale-105 transition-all shadow-lg"
          >
            Presiona ESPACIO para comenzar
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'gameover' || gameState === 'won') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-2xl text-center">
          <div className="mb-8">
            <div className="text-6xl mb-4">{gameState === 'won' ? '🏆' : '💔'}</div>
            <h1 className="text-5xl font-bold text-gray-800 mb-4">
              {gameState === 'won' ? '¡Ganaste!' : 'Game Over'}
            </h1>
            <p className="text-xl text-gray-600">¡Buen intento!</p>
          </div>

          <div className="bg-gradient-to-r from-pink-100 to-purple-100 rounded-xl p-6 mb-8">
            <div className="text-4xl font-bold text-purple-600 mb-2">{score}</div>
            <div className="text-gray-600">Puntos totales</div>
            <div className="mt-4 text-2xl font-bold text-pink-600">Nivel {level}</div>
            <div className="text-gray-600">Cartas completadas: {currentCardIndex}</div>
          </div>

          <button
            onClick={() => {
              setScore(0);
              setLevel(1);
              setGameState('playing');
              startNewRound();
            }}
            className="bg-gradient-to-r from-pink-600 to-purple-600 text-white text-2xl font-bold px-12 py-4 rounded-xl hover:from-pink-700 hover:to-purple-700 transform hover:scale-105 transition-all shadow-lg"
          >
            Presiona ESPACIO para reiniciar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-purple-600">{score}</div>
              <div className="text-sm text-gray-600">Puntos</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">{level}</div>
              <div className="text-sm text-gray-600">{levelConfig[level].name}</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">{currentCardIndex + 1}/{levelConfig[level].totalCards}</div>
              <div className="text-sm text-gray-600">Progreso</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-pink-600">{levelConfig[level].totalCards - currentCardIndex}</div>
              <div className="text-sm text-gray-600">Faltan</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progreso del nivel</span>
              <span>{currentCardIndex + 1}/{levelConfig[level].totalCards}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-pink-600 to-purple-600 transition-all duration-300"
                style={{ width: `${((currentCardIndex + 1) / levelConfig[level].totalCards) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 mb-6 text-center">
          <div className="flex items-center justify-center gap-3 text-purple-600">
            <Timer className="w-6 h-6" />
            <span className="text-lg font-semibold">
              {currentCardIndex === 0 
                ? '¡Memoriza esta primera carta!' 
                : '¿Esta carta coincide con la anterior?'}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-12">
          <div className="flex justify-center items-center gap-8 mb-8">
            {cardsHistory.map((card, index) => (
              <div key={card.id} className="relative opacity-60">
                <div className="w-40 h-56 rounded-xl shadow-lg bg-gradient-to-br from-gray-300 to-gray-400 border-4 border-gray-500 flex items-center justify-center">
                  <div className="text-5xl">🂠</div>
                </div>
                {index === cardsHistory.length - 1 && (
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                    <span className="text-xs font-bold text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
                      Anterior
                    </span>
                  </div>
                )}
              </div>
            ))}

            {currentCard && (
              <div className="relative">
                <div className="absolute -top-10 left-1/2 transform -translate-x-1/2">
                  <div className="w-4 h-4 bg-purple-600 rounded-full animate-pulse"></div>
                </div>
                
                <div className={`w-64 h-96 rounded-2xl shadow-2xl border-4 flex items-center justify-center transition-all duration-500 ${
                  currentCardIndex === 0 
                    ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-400'
                    : 'bg-white border-purple-400'
                }`}>
                  {isShowingCard ? (
                    <div 
                      className="text-9xl font-bold"
                      style={{ color: currentCard.color }}
                    >
                      {currentCard.symbol}
                    </div>
                  ) : (
                    <div className="text-7xl">🂠</div>
                  )}
                </div>

                {(phase === 'memorize' || phase === 'answer') && (
                  <Countdown key={`${level}-${currentCardIndex}`} duration={phase === 'memorize' ? 2500 : 3000} />
                )}

                {feedback && (
                  <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 text-center text-2xl font-bold pointer-events-none ${
                    feedback.correct ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {feedback.message}
                  </div>
                )}

                {isShowingCard && currentCardIndex > 0 && (
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                    <span className="text-xs font-bold text-pink-600 bg-pink-100 px-3 py-1 rounded-full">
                      Actual
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {currentCardIndex > 0 && (
            <div className="flex flex-col items-center gap-4 mt-16">
              <button
                type="button"
                onKeyDown={event => { if (event.repeat) event.preventDefault(); }}
                onClick={() => handleAnswer(true)}
                disabled={!canAnswer}
                className="group relative px-20 py-8 rounded-2xl font-bold text-2xl transition-transform duration-100 active:scale-95 disabled:opacity-60 disabled:cursor-default touch-manipulation transform hover:scale-105 bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-2xl"
              >
                <div className="text-center">
                  <div className="text-5xl mb-3">✅</div>
                  <div className="text-3xl mb-2">¡SÍ COINCIDEN!</div>
                  <div className="text-lg font-normal opacity-90 mt-2">Presiona ENTER (+100 pts)</div>
                </div>
              </button>
              
              <div className="text-gray-500 text-sm mt-2">
                Si NO coinciden, simplemente no presiones nada
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-gray-600">
          <p className="text-sm">
            {currentCardIndex === 0 
              ? '¡Memoriza esta primera carta!' 
              : 'ENTER = Sí coinciden (+100) | No hacer nada = No coinciden (+100) | Error = -50'}
          </p>
        </div>
      </div>
    </div>
  );
};

// Keep countdown updates local so the whole board does not render 20 times/second.
function Countdown({ duration }: { duration: number }) {
  const [remaining, setRemaining] = useState(duration);
  useEffect(() => {
    const deadline = performance.now() + duration;
    const timer = setInterval(() => {
      const next = Math.max(0, deadline - performance.now());
      setRemaining(next);
      if (next === 0) clearInterval(timer);
    }, 50);
    return () => clearInterval(timer);
  }, [duration]);
  return (
    <div className="absolute -bottom-16 left-0 right-0 px-4">
      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-[width] duration-75 ease-linear"
          style={{ width: `${remaining / duration * 100}%` }} />
      </div>
      <div className="text-xs text-center text-gray-500 mt-1">{Math.ceil(remaining / 1000)}s</div>
    </div>
  );
}

export default CoincidenciaGame;