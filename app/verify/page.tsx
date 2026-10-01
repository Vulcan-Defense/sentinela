"use client";

import { useEffect, useState } from "react";
import "./verify.css";

type CertificateRecord = { id:string; studentName:string; courseTitle:string; hours:number; issuedAt:string; issuer:string; status:string };

const ACADEMY_HOME = "https://academy.vulcandefense.com.br/";
const VERIFY_HOST = "verify.vulcandefense.com.br";

function verifyPath() {
  return window.location.hostname === VERIFY_HOST ? "/" : "/verify";
}

export default function VerifyCertificate() {
  const [certificateId,setCertificateId]=useState("");
  const [certificate,setCertificate]=useState<CertificateRecord|null>(null);
  const [status,setStatus]=useState<"idle"|"loading"|"valid"|"invalid">("idle");

  async function verify(id:string) {
    const normalized=id.trim().toUpperCase();
    if (!normalized) return;
    setStatus("loading");
    setCertificate(null);
    try {
      const response=await fetch(`/api/certificates/${encodeURIComponent(normalized)}`);
      const data=await response.json() as {certificate?:CertificateRecord};
      if (!response.ok||!data.certificate) { setStatus("invalid"); return; }
      setCertificate(data.certificate);
      setStatus("valid");
      window.history.replaceState(null,"",`${verifyPath()}?id=${encodeURIComponent(normalized)}`);
    } catch { setStatus("invalid"); }
  }

  useEffect(()=>{const id=new URLSearchParams(window.location.search).get("id");if(id){setCertificateId(id);void verify(id)}},[]);

  return <main className="verify-page"><header className="verify-nav"><a href={ACADEMY_HOME} aria-label="Vulcan Defense Academy"><img src="/logo-vulcan-defense.png" alt="Vulcan Defense"/><span>ACADEMY</span></a><a href={ACADEMY_HOME}>Voltar para a academia</a></header><section className="verify-hero"><p>REGISTRO OFICIAL DE CREDENCIAIS</p><h1>Validar certificado</h1><span>Confirme a autenticidade de certificados emitidos pela Vulcan Defense Academy.</span><form onSubmit={event=>{event.preventDefault();void verify(certificateId)}}><label htmlFor="certificate-id">ID da credencial</label><div><input id="certificate-id" value={certificateId} onChange={event=>setCertificateId(event.target.value)} placeholder="VD-2026-XXXXXXXXXXXX"/><button disabled={status==="loading"}>{status==="loading"?"Validando...":"Validar certificado"}</button></div></form></section><section className="verify-result" aria-live="polite">{status==="idle"&&<div className="verify-empty"><b>◆</b><h2>Digite o ID apresentado no certificado</h2><p>O resultado exibirá titular, formação, carga horária, data de emissão e situação atual.</p></div>}{status==="invalid"&&<div className="verify-invalid"><b>×</b><h2>Certificado não encontrado</h2><p>Confira o código informado. Credenciais revogadas ou inexistentes não são reconhecidas como válidas.</p></div>}{status==="valid"&&certificate&&<article className="verify-valid"><div className="valid-head"><span>✓</span><div><small>CREDENCIAL AUTÊNTICA</small><h2>Certificado válido</h2></div></div><dl><div><dt>Titular</dt><dd>{certificate.studentName}</dd></div><div><dt>Formação</dt><dd>{certificate.courseTitle}</dd></div><div><dt>{certificate.hours>0?"Carga horária":"Avaliação"}</dt><dd>{certificate.hours>0?`${certificate.hours} horas`:"Prova oficial · 40 questões"}</dd></div><div><dt>Data de emissão</dt><dd>{new Date(certificate.issuedAt).toLocaleDateString("pt-BR")}</dd></div><div><dt>Emissor</dt><dd>{certificate.issuer}</dd></div><div><dt>ID da credencial</dt><dd>{certificate.id}</dd></div></dl><footer><img src="/logo-vulcan-defense.png" alt=""/><span><strong>Vulcan Defense Academy</strong><small>Diretor de Ensino: Rafael Ribeiro · Diretor Geral: Rodrigo Carran</small></span></footer></article>}</section><footer className="verify-footer">© {new Date().getFullYear()} Vulcan Defense · Validação pública de certificados</footer></main>;
}
