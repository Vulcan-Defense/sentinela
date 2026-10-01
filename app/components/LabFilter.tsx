import React from "react";
import { labThemeDefinitions } from "../data/site-catalog";

interface LabFilterProps {
  activeFilter: string | null;
  onFilterChange: (theme: string | null) => void;
}

export function LabFilter({ 
  activeFilter, 
  onFilterChange 
}: LabFilterProps) {
  return (
    <div className="lab-filter bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
        <span className="text-primary">🔍</span> Filtrar por categoria
      </div>
      
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={\`px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors font-medium ${activeFilter === null ? "bg-primary text-white" : ""}\`}
          onClick={() => onFilterChange(null)}
        >
          Todos
        </button>
        
        {labThemeDefinitions.map((theme) => (
          <button
            key={theme.id}
            type="button"
            className={\`px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors font-medium ${activeFilter === theme.id ? 
              \`bg-${theme.id === "appsec" ? "purple-600" : 
                theme.id === "api-identidade" ? "indigo-600" : 
                theme.id === "cloud-devsecops" ? "blue-600" : 
                theme.id === "red-blue" ? "red-600" : 
                theme.id === "ia-governanca" ? "pink-600" : "green-600"} text-white" 
              : ""}\`}
            onClick={() => onFilterChange(theme.id)}
          >
            {theme.label}
          </button>
        ))}
      </div>
    </div>
  );
}
