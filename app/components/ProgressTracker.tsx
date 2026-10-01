import React from "react";

interface ProgressTrackerProps {
  completedLabs: string[];
  totalLabs: number;
  currentStreak: number;
  longestStreak: number;
  totalXP: number;
}

export function ProgressTracker({ 
  completedLabs, 
  totalLabs, 
  currentStreak, 
  longestStreak, 
  totalXP 
}: ProgressTrackerProps) {
  const completionRate = totalLabs > 0 ? (completedLabs.length / totalLabs) * 100 : 0;

  return (
    <div className="progress-tracker bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="space-y-4">
        {/* Overall Progress */}
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <span className="text-primary">📊</span> Progresso Geral
          </h3>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className={\`h-2.5 bg-primary rounded-full transition-all duration-500\`} 
                style={{ width: \`${completionRate}%\` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-gray-500 mt-1">
              <span>{completedLabs.length} de {totalLabs} laboratórios</span>
              <span>${Math.round(completionRate)}% concluído</span>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-center">
            <div className="text-primary font-semibold text-lg">{currentStreak}</div>
            <div className="text-gray-500">Dia atual</div>
          </div>
          <div className="text-center">
            <div className="text-primary font-semibold text-lg">{longestStreak}</div>
            <div className="text-gray-500">Melhor sequência</div>
          </div>
          <div className="text-center">
            <div className="text-primary font-semibold text-lg">{totalXP}</div>
            <div className="text-gray-500">XP Total</div>
          </div>
          <div className="text-center">
            <div className="text-primary font-semibold text-lg">{totalLabs - completedLabs.length}</div>
            <div className="text-gray-500">Para completar</div>
          </div>
        </div>
      </div>
    </div>
  );
}
