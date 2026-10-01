"use client";

import React, { useMemo, useState } from "react";
import { findModule } from "../data/site-catalog";
import "./skill-tree.css";

type SkillNode = { id: string; label: string; icon: string; x: number; y: number; requires: string[]; moduleIds: string[] };
type SkillField = { id: string; label: string; rank: string; icon: string; unlockAt: number; blurb: string; nodes: SkillNode[] };

const TREE_W = 1000;
const TREE_H = 680;

const skillFields: SkillField[] = [
  { id: "foundational", label: "Fundamentos", rank: "Entry level", icon: "⬡", unlockAt: 0, blurb: "Selecione uma skill para ver quais módulos completar.", nodes: [
    { id: "core", label: "Núcleo", icon: "◆", x: 500, y: 92, requires: [], moduleIds: [] },
    { id: "owasp", label: "Web OWASP", icon: "⌘", x: 268, y: 250, requires: ["core"], moduleIds: ["A01", "A02", "A05"] },
    { id: "coding", label: "Secure Coding", icon: "</>", x: 732, y: 250, requires: ["core"], moduleIds: ["SC01", "SC02", "SC03"] },
    { id: "access", label: "Acesso", icon: "⚿", x: 132, y: 420, requires: ["owasp"], moduleIds: ["A01", "A07"] },
    { id: "inject", label: "Injeção", icon: "⚡", x: 268, y: 470, requires: ["owasp"], moduleIds: ["A03"] },
    { id: "config", label: "Config", icon: "⚙", x: 404, y: 420, requires: ["owasp"], moduleIds: ["A05", "A06"] },
    { id: "validate", label: "Validação", icon: "▣", x: 596, y: 420, requires: ["coding"], moduleIds: ["SC02", "SC03"] },
    { id: "crypto", label: "Cripto", icon: "◈", x: 732, y: 470, requires: ["coding"], moduleIds: ["A02", "SC05"] },
    { id: "tests", label: "Testes", icon: "✓", x: 868, y: 420, requires: ["coding"], moduleIds: ["SC07", "SC08"] },
    { id: "web-master", label: "Mestre Web", icon: "♛", x: 500, y: 590, requires: ["inject", "crypto"], moduleIds: ["A08", "A10", "SC06"] },
  ]},
  { id: "analyst", label: "Analista de Segurança", rank: "Operações", icon: "👁", unlockAt: 4, blurb: "APIs, nuvem e detecção para quem protege o ambiente.", nodes: [
    { id: "analyst-core", label: "SOC Base", icon: "◉", x: 500, y: 92, requires: [], moduleIds: ["A09"] },
    { id: "api-core", label: "APIs", icon: "{ }", x: 250, y: 270, requires: ["analyst-core"], moduleIds: ["API01", "API02", "API03"] },
    { id: "cloud-core", label: "Cloud", icon: "☁", x: 750, y: 270, requires: ["analyst-core"], moduleIds: ["CL01", "CL02", "CL03"] },
    { id: "identity", label: "Identidade", icon: "♟", x: 150, y: 450, requires: ["api-core"], moduleIds: ["API02", "API03", "A07"] },
    { id: "abuse", label: "Abuso de API", icon: "⚠", x: 340, y: 490, requires: ["api-core"], moduleIds: ["API04", "API05"] },
    { id: "iam", label: "IAM", icon: "🔑", x: 660, y: 490, requires: ["cloud-core"], moduleIds: ["CL02", "CL05"] },
    { id: "detect", label: "Detecção", icon: "📡", x: 850, y: 450, requires: ["cloud-core"], moduleIds: ["CL06", "CL07", "A09"] },
    { id: "ir", label: "Resposta", icon: "🛡", x: 500, y: 590, requires: ["detect", "identity"], moduleIds: ["CL07", "AGA07"] },
  ]},
  { id: "pentester", label: "Pentester", rank: "Red Team", icon: "◎", unlockAt: 8, blurb: "Do reconhecimento ao relatório, no ritmo de um teste autorizado.", nodes: [
    { id: "pt-core", label: "Engajamento", icon: "📜", x: 500, y: 92, requires: [], moduleIds: ["PT01"] },
    { id: "recon", label: "Recon", icon: "🔭", x: 280, y: 260, requires: ["pt-core"], moduleIds: ["PT02", "PT03"] },
    { id: "map", label: "Superfície", icon: "🗺", x: 720, y: 260, requires: ["pt-core"], moduleIds: ["PT03", "PT04"] },
    { id: "web-exploit", label: "Exploit Web", icon: "⚔", x: 200, y: 440, requires: ["recon"], moduleIds: ["PT05", "A03", "A10"] },
    { id: "post", label: "Pós-exploit", icon: "🕸", x: 500, y: 470, requires: ["map", "recon"], moduleIds: ["PT06"] },
    { id: "severity", label: "Severidade", icon: "📊", x: 800, y: 440, requires: ["map"], moduleIds: ["PT07"] },
    { id: "report", label: "Relatório", icon: "✉", x: 500, y: 590, requires: ["web-exploit", "severity"], moduleIds: ["PT08"] },
  ]},
  { id: "engineer", label: "Engenheiro de Segurança", rank: "DevSecOps", icon: "∞", unlockAt: 8, blurb: "Pipeline, segredos e política como código.", nodes: [
    { id: "eng-core", label: "Cultura", icon: "∞", x: 500, y: 92, requires: [], moduleIds: ["DS01"] },
    { id: "sast", label: "SAST", icon: "🔍", x: 250, y: 270, requires: ["eng-core"], moduleIds: ["DS02"] },
    { id: "deps", label: "SBOM", icon: "📦", x: 500, y: 300, requires: ["eng-core"], moduleIds: ["DS03"] },
    { id: "dast", label: "DAST", icon: "🎯", x: 750, y: 270, requires: ["eng-core"], moduleIds: ["DS04"] },
    { id: "secrets", label: "Segredos", icon: "🔐", x: 300, y: 460, requires: ["sast"], moduleIds: ["DS05", "CL05"] },
    { id: "policy", label: "Policy as Code", icon: "📐", x: 700, y: 460, requires: ["dast", "deps"], moduleIds: ["DS06"] },
    { id: "pipeline", label: "Pipeline", icon: "🚀", x: 500, y: 590, requires: ["secrets", "policy"], moduleIds: ["DS07"] },
  ]},
  { id: "ai", label: "Defesa de IA", rank: "Especialização", icon: "AI", unlockAt: 6, blurb: "Governança, LLMs e agentes: a árvore avançada da academia.", nodes: [
    { id: "ai-core", label: "Governança", icon: "⚖", x: 500, y: 92, requires: [], moduleIds: ["AIG01", "AIG02", "AIG03"] },
    { id: "policy-ai", label: "Política IA", icon: "📋", x: 260, y: 270, requires: ["ai-core"], moduleIds: ["AIG04", "AIG05"] },
    { id: "llm-arch", label: "LLM Seguro", icon: "LLM", x: 740, y: 270, requires: ["ai-core"], moduleIds: ["LLM01", "LLM02", "LLM03"] },
    { id: "red-ai", label: "Red Team IA", icon: "AI", x: 340, y: 440, requires: ["policy-ai"], moduleIds: ["AIR01", "AIR02", "AIR03"] },
    { id: "rag", label: "RAG", icon: "📚", x: 660, y: 440, requires: ["llm-arch"], moduleIds: ["LLM04", "LLM05"] },
    { id: "agents", label: "Agentes", icon: "∞AI", x: 500, y: 590, requires: ["rag", "red-ai"], moduleIds: ["AGA01", "AGA02", "AGA04", "AGA05"] },
  ]},
];

function hexPoints(cx: number, cy: number, r: number) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 180) * (60 * index - 30);
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(" ");
}

function latticeHexes() {
  const cells: { x: number; y: number }[] = [];
  const radius = 26;
  const dx = radius * 1.72;
  const dy = radius * 1.5;
  for (let row = 0; row < 16; row += 1) {
    for (let col = 0; col < 24; col += 1) {
      cells.push({ x: 18 + col * dx + (row % 2 ? dx / 2 : 0), y: 16 + row * dy });
    }
  }
  return cells;
}

function skillNodeOwned(node: SkillNode, completed: string[]) {
  return node.moduleIds.length === 0 || node.moduleIds.every((id) => completed.includes(id));
}

function skillNodeState(node: SkillNode, nodes: SkillNode[], completed: string[]): "locked" | "ready" | "owned" {
  if (skillNodeOwned(node, completed)) return "owned";
  const unlocked = node.requires.every((id) => {
    const required = nodes.find((item) => item.id === id);
    return required ? skillNodeOwned(required, completed) : false;
  });
  return unlocked ? "ready" : "locked";
}

function branchPath(from: SkillNode, to: SkillNode) {
  const midY = (from.y + to.y) / 2;
  return `M${from.x} ${from.y + 34} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y - 34}`;
}

export function SkillsMatrix({ completed, onOpenTrail }: { completed: string[]; onOpenTrail: () => void }) {
  const [fieldId, setFieldId] = useState(skillFields[0].id);
  const [selectedId, setSelectedId] = useState(skillFields[0].nodes[0].id);
  const field = skillFields.find((item) => item.id === fieldId) ?? skillFields[0];
  const fieldUnlocked = completed.length >= field.unlockAt;
  const selected = field.nodes.find((node) => node.id === selectedId) ?? field.nodes[0];
  const selectedState = skillNodeState(selected, field.nodes, completed);
  const selectedDone = selected.moduleIds.filter((id) => completed.includes(id)).length;
  const ownedCount = field.nodes.filter((node) => skillNodeOwned(node, completed)).length;
  const selectedModules = selected.moduleIds.map((id) => findModule(id)).filter(Boolean);
  const hexes = useMemo(latticeHexes, []);
  const selectedTrail = new Set([selected.id, ...selected.requires]);

  function openField(id: string) {
    const next = skillFields.find((item) => item.id === id);
    if (!next) return;
    setFieldId(id);
    setSelectedId(next.nodes[0].id);
  }

  return (
    <section className="profile-feature-panel skill-tree-panel">
      <header>
        <div>
          <p className="eyebrow">SKILL TREE</p>
          <h2>Árvore de competências</h2>
          <p>Campos de estudo à esquerda. O gráfico central é a árvore: complete um nó para acender o próximo ramo.</p>
        </div>
        <div className="skill-tree-legend" aria-hidden="true">
          <span className="owned">Dominado</span>
          <span className="ready">Disponível</span>
          <span className="locked">Bloqueado</span>
        </div>
      </header>
      <div className="skill-tree-layout">
        <aside className="skill-field-rail" aria-label="Campos de estudo">
          {skillFields.map((item) => {
            const locked = completed.length < item.unlockAt;
            const owned = item.nodes.filter((node) => skillNodeOwned(node, completed)).length;
            return (
              <button key={item.id} type="button" className={`${fieldId === item.id ? "active" : ""} ${locked ? "locked" : ""}`} onClick={() => openField(item.id)}>
                <span>{locked ? "🔒" : item.icon}</span>
                <strong>{item.label}</strong>
                <small>{locked ? `Abre com ${item.unlockAt} módulos` : `${owned}/${item.nodes.length} nós`}</small>
              </button>
            );
          })}
          <p className="skill-quiz-hint">Cada campo é uma árvore. Fundamentos abre o restante.</p>
        </aside>
        <div className="skill-tree-stage">
          <div className="skill-tree-heading">
            <div>
              <p className="eyebrow">{field.rank}</p>
              <h3>{field.icon} {field.label}</h3>
              <p>{field.blurb}</p>
            </div>
            <strong>{ownedCount}<small>/{field.nodes.length}</small></strong>
          </div>
          <div className={`skill-tree-viewport ${fieldUnlocked ? "" : "is-locked"}`}>
            <svg viewBox={`0 0 ${TREE_W} ${TREE_H}`} role="img" aria-label={`Árvore de skills de ${field.label}`}>
              <defs>
                <filter id="skill-glow" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <radialGradient id="skill-board" cx="50%" cy="18%" r="72%">
                  <stop offset="0%" stopColor="rgba(142,227,51,.16)" />
                  <stop offset="55%" stopColor="rgba(20,36,58,.2)" />
                  <stop offset="100%" stopColor="rgba(8,14,24,.55)" />
                </radialGradient>
              </defs>
              <rect width={TREE_W} height={TREE_H} fill="url(#skill-board)" />
              {hexes.map((cell, index) => (
                <polygon key={index} points={hexPoints(cell.x, cell.y, 14)} className="skill-hex-cell" />
              ))}
              {field.nodes.flatMap((node) => node.requires.map((parentId) => {
                const parent = field.nodes.find((item) => item.id === parentId);
                if (!parent) return null;
                const lit = skillNodeOwned(parent, completed);
                const active = selectedTrail.has(parent.id) && selectedTrail.has(node.id);
                return <path key={`${parent.id}-${node.id}`} d={branchPath(parent, node)} className={`skill-branch ${lit ? "lit" : ""} ${active ? "active" : ""}`} />;
              }))}
              {field.nodes.map((node) => {
                const state = skillNodeState(node, field.nodes, completed);
                const done = node.moduleIds.filter((id) => completed.includes(id)).length;
                const picked = selected.id === node.id;
                return (
                  <g key={node.id} className={`skill-glyph ${state} ${picked ? "selected" : ""}`} onClick={() => setSelectedId(node.id)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedId(node.id); }}>
                    <polygon points={hexPoints(node.x, node.y, picked ? 40 : 36)} filter={state === "owned" || picked ? "url(#skill-glow)" : undefined} />
                    <text x={node.x} y={node.y + 6} className="skill-glyph-icon">{state === "locked" ? "🔒" : node.icon}</text>
                    <text x={node.x} y={node.y + 54} className="skill-glyph-label">{node.label}</text>
                    <text x={node.x} y={node.y + 72} className="skill-glyph-xp">{node.moduleIds.length ? `${done}/${node.moduleIds.length}` : "origem"}</text>
                  </g>
                );
              })}
            </svg>
            {!fieldUnlocked && (
              <div className="skill-tree-lock-banner">
                <strong>Campo selado</strong>
                <span>A árvore já aparece aqui. Conclua {field.unlockAt} módulos para acender os ramos.</span>
              </div>
            )}
          </div>
          <article className={`skill-node-detail ${selectedState}`}>
            <div>
              <span className="skill-icon">{selected.icon}</span>
              <div>
                <p className="eyebrow">{selectedState === "owned" ? "DOMINADO" : selectedState === "ready" ? "DISPONÍVEL" : "BLOQUEADO"}</p>
                <h4>{selected.label}</h4>
                <p>{selectedState === "locked" ? "Complete o ramo anterior para acender esta linha." : selected.moduleIds.length ? `${selectedDone} de ${selected.moduleIds.length} módulos deste ramo.` : "Ponto de partida. Escolha um hexágono para evoluir."}</p>
              </div>
            </div>
            {selectedModules.length > 0 && (
              <ul>
                {selectedModules.map((item) => item && (
                  <li key={item.module.id} className={completed.includes(item.module.id) ? "done" : ""}>
                    <b>{completed.includes(item.module.id) ? "✓" : "○"}</b>
                    <span>
                      <strong>{item.module.title}</strong>
                      <small>{item.course.title} · {item.module.xp} XP</small>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className="outline-button" onClick={onOpenTrail}>Abrir trilhas relacionadas →</button>
          </article>
        </div>
      </div>
    </section>
  );
}
