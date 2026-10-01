import React from "react";

interface HeaderProps {
  userName?: string;
  userAvatar?: string;
  notificationsCount?: number;
  onAvatarClick?: () => void;
  onNotificationsClick?: () => void;
  onMenuClick?: () => void;
}

export function Header({ 
  userName, 
  userAvatar, 
  notificationsCount = 0, 
  onAvatarClick, 
  onNotificationsClick, 
  onMenuClick 
}: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 shadow-sm z-20">
      <div className="flex items-center gap-4">
        <button 
          type="button" 
          className="p-2 rounded hover:bg-gray-50 transition-colors" 
          onClick={onMenuClick}
          aria-label="Abrir menu"
        >
          <span className="text-xl">☰</span>
        </button>
        
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            VulcanAcademy
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Plataforma de aprendizado em cibersegurança
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <div className="relative group" onClick={onNotificationsClick}>
          <span className="text-xl">🔔</span>
          {notificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center bg-red-500 text-white text-xs rounded-full">
              {notificationsCount > 99 ? "99+" : notificationsCount}
            </span>
          )}
        </div>
        
        {/* User Avatar */}
        <div className="relative" onClick={onAvatarClick}>
          <img 
            src={userAvatar || "/default-avatar.png"} 
            alt={userName || "Usuário"} 
            className="h-10 w-10 rounded-full border-2 border-gray-200 hover:border-gray-300 transition-bordercursor-pointer"
          />
          {/* Online indicator */}
          <div className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-white"></div>
        </div>
      </div>
    </header>
  );
}
