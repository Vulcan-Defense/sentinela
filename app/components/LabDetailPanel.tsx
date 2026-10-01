import React from "react";
import { LabDefinition, LabLearningContext, LabTimelineEvent } from "../data/site-catalog";

interface LabDetailPanelProps {
  lab: LabDefinition | null;
  isLoading: boolean;
  completedLabs: string[];
  onStartLab: (labId: string) => void;
  onExitLab: () => void;
}

export function LabDetailPanel({ 
  lab, 
  isLoading, 
  completedLabs, 
  onStartLab, 
  onExitLab 
}: LabDetailPanelProps) {
  if (isLoading) {
    return (
      <div className="lab-detail-panel p-6">
        <div className="flex flex-col items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Carregando laboratório...</p>
        </div>
      </div>
    );
  }

  if (!lab) {
    return (
      <div className="lab-detail-panel p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Selecione um laboratório</h3>
          <p className="text-gray-500">Escolha um laboratório do catálogo para ver os detalhes e iniciar a simulação.</p>
        </div>
      </div>
    );
  }

  const context = labLearningContexts[lab.courseId as keyof typeof labLearningContexts] || {
    application: "Contexto não disponível",
    flow: "Informação de fluxo não disponível",
    assets: [],
    vulnerability: "Vulnerabilidade não especificada",
    impact: "Impacto não especificado",
    commandGuides: []
  };

  const timeline = createLabTimeline(lab);

  return (
    <div className="lab-detail-panel p-6 space-y-6">
      {/* Lab Header */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-shrink-0 h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-2xl">
          <span className="text-sm">🔬</span>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{lab.title}</h2>
          <p className="mt-1 text-sm text-gray-500 flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs">
              <span className="w-3 h-3 bg-primary/20 rounded inline-flex items-center justify-center text-xs text-primary">⏱</span>
              {lab.duration} min
            </span>
            <span className="flex items-center gap-1 text-xs">
              <span className="w-3 h-3 bg-secondary/20 rounded inline-flex items-center justify-center text-xs text-secondary">🎯</span>
              {lab.xp} XP
            </span>
          </p>
        </div>
      </div>

      {/* Lab Content Tabs */}
      <div className="space-y-4">
        {/* Overview Tab */}
        <section>
          <h3 className="font-semibold text-lg mb-3">Visão Geral</h3>
          <div className="space-y-3">
            <p className="text-gray-600">{lab.summary}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-700">Ambiente</p>
                <p className="text-gray-600 bg-gray-50 p-3 rounded">{lab.environment}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Provedor</p>
                <p className="text-gray-600 bg-gray-50 p-3 rounded">{lab.provider}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Tema</p>
                <p className="text-gray-600 bg-gray-50 p-3 rounded">{lab.theme || "-"}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Curso</p>
                <p className="text-gray-600 bg-gray-50 p-3 rounded">{lab.courseId}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Context Tab */}
        <section>
          <h3 className="font-semibold text-lg mb-3">Contexto do Laboratório</h3>
          <div className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-800">Aplicação</h4>
              <p className="text-gray-600">{context.application}</p>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-gray-800">Fluxo de Trabalho</h4>
              <p className="text-gray-600">{context.flow}</p>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-gray-800">Recursos Envolvidos</h4>
              <div className="flex flex-wrap gap-2">
                {context.assets.map((asset, index) => (
                  <span key={index} className="px-2 py-0.5 bg-blue-50 text-blue-800 text-xs rounded">
                    {asset}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Security Analysis Tab */}
        <section>
          <h3 className="font-semibold text-lg mb-3">Análise de Segurança</h3>
          <div className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-800">Vulnerabilidade Principal</h4>
              <p className="text-gray-600 bg-gray-50 p-3 rounded">{context.vulnerability}</p>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-gray-800">Impacto Potencial</h4>
              <p className="text-gray-600 bg-gray-50 p-3 rounded">{context.impact}</p>
            </div>
          </div>
        </section>

        {/* Command Guides Tab */}
        <section>
          <h3 className="font-semibold text-lg mb-3">Guias de Comandos</h3>
          <div className="space-y-4">
            {context.commandGuides.map((guide, index) => (
              <div key={index} className="border-l-2 border-primary pl-4 mb-4">
                <h4 className="font-medium text-gray-800 mb-1">{guide.action}</h4>
                <p className="text-gray-600 text-sm italic">{guide.interpretation}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Timeline Tab */}
        <section>
          <h3 className="font-semibold text-lg mb-3">Cronograma de Atividades</h3>
          <div className="space-y-3">
            {timeline.map((event, index) => (
              <div key={index} className={\`flex items-start gap-3 py-2 border-l-2 ${event.severity === "critical" ? "border-red-400" : event.severity === "warn" ? "border-yellow-400" : event.severity === "info" ? "border-blue-400" : "border-green-400"} pl-4\`}
                <div className="flex-shrink-0 h-3 w-3 rounded-full bg-gray-200"></div>
                <div className="flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-mono text-xs">{event.time}</span>
                    <span className="font-medium text-gray-700">{event.source}</span>
                  </div>
                  <p className={\`mt-1 text-gray-600 ${event.severity === "critical" ? "text-red-600" : event.severity === "warn" ? "text-yellow-600" : event.severity === "info" ? "text-blue-600" : "text-green-600"}\`}
                    {event.message}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
        <div className="flex-1 pr-4">
          <p className={\`text-sm text-gray-500 ${completedLabs.includes(lab.id) ? "text-success-600" : "text-gray-500"}\`}
            {completedLabs.includes(lab.id) 
              ? "Laboratório concluído! \" + lab.xp + " XP ganhos" 
              : "Pronto para começar o laboratório"\}
          </p>
        </div>
        
        <div className="flex gap-3">
          {!completedLabs.includes(lab.id) && (
            <button
              type="button"
              onClick={() => onStartLab(lab.id)}
              className="flex-1 md:flex-none px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium"
            >
              Iniciar Laboratório
            </button>
          )}
          
          <button
            type="button"
            onClick={onExitLab}
            className="flex-1 md:flex-none px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Voltar ao Catálogo
          </button>
        </div>
      </div>
    </div>
  );
}
