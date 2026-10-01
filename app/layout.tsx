import type { Metadata } from "next";
import "./globals.css";
import "./dark.css";
import "./theme-modes.css";
import "./sidebar.css";
import "./site-template.css";
import "./landing-ht.css";
import "./offensive-panel.css";
import "./modern-review.css";
import "./student-dashboard.css";

export const metadata: Metadata = {
  title: "VulcanAcademy — Cybersecurity e IA na prática",
  description: "Plataforma comunitária de aprendizagem em cibersegurança e IA, com cursos práticos, laboratórios seguros e certificações.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" data-theme="night"><body>{children}</body></html>;
}
