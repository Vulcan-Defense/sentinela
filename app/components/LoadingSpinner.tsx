import React from "react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
}

export function LoadingSpinner({ 
  size = "md", 
  label 
}: LoadingSpinnerProps) {
  const sizeMap = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8"
  };

  return (
    <div className="flex items-center gap-3">
      <div className={\`animate-spin rounded-full border-2 border-primary border-t-transparent ${sizeMap[size]}\`}></div>
      {label && <span className="text-sm text-gray-600">{label}</span>}
    </div>
  );
}
