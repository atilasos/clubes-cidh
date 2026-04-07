import Link from "next/link";
import type { Route } from "next";
import { InfoCard, PageShell } from "@/components/page-shell";

const lifecycle = [
  {
    title: "Preparar campanha",
    text: "Criar janela temporal, slots, clubes, capacidade por defeito e overrides auditados.",
  },
  {
    title: "Abrir portal público",
    text: "Gerar link e códigos de acesso para envio externo pela escola.",
  },
  {
    title: "Fechar e distribuir",
    text: "Executar preview da distribuição final, rever impactos e confirmar commit.",
  },
];

export default function AdminCampaignsPage() {
  return (
    <PageShell
      badge="Admin / Campanhas"
      title="Campanhas"
      description="Vista de navegação para o ciclo completo da campanha, preparada para ligar listagens reais e estados operacionais."
      breadcrumbs={[
        { label: "Início", href: "/" },
        { label: "Admin", href: "/admin" },
        { label: "Campanhas" },
      ]}
    >
      <div className="grid two">
        <InfoCard title="Linha de vida da campanha" eyebrow="Fluxo">
          <ol>
            {lifecycle.map((step) => (
              <li key={step.title}>
                <strong>{step.title}</strong>
                <br />
                <span className="status">{step.text}</span>
              </li>
            ))}
          </ol>
        </InfoCard>
        <InfoCard title="Exemplo de detalhe" eyebrow="Skeleton">
          <p>
            O detalhe da campanha vai concentrar configuração, reservas, revisão visual, finalização e exportações.
          </p>
          <div className="row">
            <Link href={"/admin/campaigns/demo-campanha-2026-1" as Route}>
              <button>Abrir detalhe de exemplo</button>
            </Link>
          </div>
        </InfoCard>
      </div>
    </PageShell>
  );
}
