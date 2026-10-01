import React, { useEffect, useState } from "react";

interface ToastNotificationProps {
  message: string;
  type?: "success" | "error" | "warning" | "info";
  duration?: number;
  onClose?: () => void;
}

export function ToastNotification({ 
  message, 
  type = "info", 
  duration = 5000,
  onClose 
}: ToastNotificationProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;

  const typeConfig: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    success: { bg: "bg-green-50", border: "border-green-200", text: "text-green-800", icon: "✅" },
    error: { bg: "bg-red-50", border: "border-red-200", text: "text-red-800", icon: "❌" },
    warning: { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-800", icon: "⚠️" },
    info: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", icon: "ℹ️" }
  };

  const config = typeConfig[type] || typeConfig.info;

  return (
    <div 
      className={\`fixed bottom-4 right-4 p-4 ${config.bg} ${config.border} rounded-lg shadow-lg flex items-center gap-3 z-50 transform transition-transform duration-300 ${visible ? "translate-x-0" : "translate-x-full"}\`}
    >
      <div className="text-2xl">{config.icon}</div>
      <div>
        <p className={\`font-medium ${config.text}\`}>{message}</p>
      </div>
      <button 
        onClick={() => {
          setVisible(false);
          onClose?.();
        }}
        className="ml-4 text-gray-400 hover:text-gray-600"
      >
        ×
      </div>
    </div>
  );
}
