import React from "react";
import { LabDefinition } from "../data/site-catalog";

interface LabCardProps {
  lab: LabDefinition;
  onSelect: (labId: string) => void;
  selectedLabId?: string;
  completedLabs: string[];
}

export function LabCard({ lab, onSelect, selectedLabId, completedLabs }: LabCardProps) {
  const isSelected = selectedLabId === lab.id;
  const isCompleted = completedLabs.includes(lab.id);
  
  return (
    <div 
      className={\`group relative flex h-[160px] w-full rounded-xl border border-gray-200 bg-white p-4 transition-all hover:shadow-md hover:border-gray-300 cursor-pointer ${isSelected ? "ring-2 ring-primary/50" : ""} ${isCompleted ? "border-success/50 bg-success/5" : ""}\`}
      onClick={() => onSelect(lab.id)}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
          <span className="text-sm">🔬</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg line-clamp-1">
            {lab.title}
          </h3>
          <p className="mt-1 text-sm text-gray-600 line-clamp-2">
            {lab.summary}
          </p>
          
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600">
              {lab.duration} min
            </span>
            <span className="px-2 py-0.5 bg-primary/10 rounded text-primary">
              {lab.xp} XP
            </span>
            {lab.theme && (
              <span className="px-2 py-0.5 bg-secondary/10 rounded text-secondary">
                {lab.theme}
              </span>
            )}
          </div>
        </div>
        
        {!isCompleted && (
          <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 bg-gray-100 rounded hover:bg-gray-200 transition-colors">
            <span className="text-gray-400">▶</span>
          </div>
        )}
        
        {isCompleted && (
          <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 bg-success/10 rounded text-success">
            <span className="text-sm">✓</span>
          </div>
        )}
      </div>
    </div>
  );
}
