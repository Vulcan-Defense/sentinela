import React from "react";

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export function ErrorFallback({ 
  error, 
  resetError 
}: ErrorFallbackProps) {
  return (
    <div className="p-6 text-center bg-red-50 border border-red-200 rounded-lg">  
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center bg-red-100 rounded-lg">
          <span className="text-red-600">⚠️</span>
        </div>
        <h3 className="font-semibold text-lg text-red-800">Algo deu errado</h3>
        <p className="text-sm text-gray-600">
          {error.message}
        </p>
        <button
          onClick={resetError}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
