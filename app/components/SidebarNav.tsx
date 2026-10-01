import React from "react";

interface SidebarNavProps {
  groups: Array<{
    id: string;
    label: string;
    items: Array<{
      id: string;
      icon: string; 
      label: string;
    }>;
  }>;
  activeId: string;
  onNavItemClick: (id: string) => void;
}

export function SidebarNav({ groups, activeId, onNavItemClick }: SidebarNavProps) {
  return (
    <aside className="sidebar fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-20 flex flex-col p-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
          VA
        </div>
        <div>
          <div className="font-bold text-lg">VulcanAcademy</div>
          <div className="text-xs text-gray-500">Cybersecurity e IA na prática</div>
        </div>
      </div>
      
      <nav className="flex-1 flex-col mb-6">
        {groups.map((group) => (
          <div key={group.id} className="mb-4">
            <h3 className="text-xs font-bold tracking-wider text-gray-400 uppercase mb-2">
              {group.label}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={\`group flex w-full items-center px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors ${activeId === item.id ? "bg-primary/10 text-primary" : ""}\`}
                  onClick={() => onNavItemClick(item.id)}
                >
                  <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                    <span className="text-sm">{item.icon}</span>
                  </span>
                  <span className="flex-1 min-w-0 text-sm font-medium">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>
      
      <div className="mt-auto pt-4 border-t border-gray-200">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex-shrink-0 w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
            <span className="text-sm">⚡</span>
          </span>
          <div>
            <div className="font-medium">Modo Noturno</div>
            <div className="text-xs">Ativo</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
