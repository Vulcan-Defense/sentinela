import React from "react";
import { LabDefinition } from "../data/site-catalog";
import { LabCard } from "./LabCard";
import { labThemeDefinitions } from "../data/site-catalog";

interface LabListProps {
  labs: LabDefinition[];
  completedLabs: string[];
  selectedLabId: string | null;
  onSelectLab: (labId: string) => void;
  onFilterChange: (theme: string | null) => void;
  activeFilter: string | null;
}

export function LabList({ 
  labs, 
  completedLabs, 
  selectedLabId, 
  onSelectLab, 
  onFilterChange, 
  activeFilter 
}: LabListProps) {
  // Filter labs by theme if activeFilter is set
  const filteredLabs = activeFilter 
    ? labs.filter(lab => lab.theme === activeFilter) 
    : labs;

  return (
    <div className="lab-list space-y-6">
      {/* Filter Controls */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          type="button"
          className={\`px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors font-medium ${activeFilter === null ? "bg-primary text-white" : ""}\`}
          onClick={() => onFilterChange(null)}
        >
          Todos os Laboratórios
        </button>
        
        {labThemeDefinitions.map((theme) => (
          <button
            key={theme.id}
            type="button"
            className={\`px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors font-medium ${activeFilter === theme.id ? "bg-${theme.id === "appsec" ? "purple" : theme.id === "api-identidade" ? "indigo" : theme.id === "cloud-devsecops" ? "blue" : theme.id === "red-blue" ? "red" : "green"} text-white" : ""}\`}
            onClick={() => onFilterChange(theme.id)}
          >
            {theme.label}
          </button>
        ))}
      </div>

      {/* Labs Grid */}
      <div className="grid gap-6">
        {/* Responsive grid: 1col on mobile, 2col on tablet, 3col on desktop */}
        <div className="sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {filteredLabs.map((lab) => (
            <LabCard
              key={lab.id}
              lab={lab}
              onSelect={onSelectLab}
              selectedLabId={selectedLabId}
              completedLabs={completedLabs}
            />
          ))}
          
          {/* Empty state */}
          {filteredLabs.length === 0 && (
            <div className="col-span-full flex flex-col items-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center bg-gray-200 rounded-lg mb-4">
                <span className="text-gray-500">🔍</span>
              </div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2">Nenhum laboratório encontrado</h3>
              <p className="text-gray-500">Tente ajustar os filtros ou verificar sua conexão.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
