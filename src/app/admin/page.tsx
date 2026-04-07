import Link from "next/link";
import { InfoCard, PageShell } from "@/components/page-shell";

const openingChecklist = [
  "Importar alunos com relatório de rejeições legível.",
  "Configurar slots, clubes, regras de vagas e overrides auditados.",
  "Reservar vagas antes da abertura e gerar pacote de acesso da campanha.",
];

const finalizationChecklist = [
  "Rever listas por clube e alunos sem colocação.",
  "Executar dry-run antes do commit da distribuição.",
  "Bloquear finalização sem placements completos ou exceção explícita.",
  "Gerar PDFs apenas a partir de snapshots finalizados.",
];

export default function AdminDashboardPage() {
  return (
    <PageShell
      badge="Admin"
      title="Painel administrativo"
      description="Skeleton inicial para os fluxos administrativos: preparar campanha, controlar vagas, rever colocação, finalizar e arquivar com auditabilidade."
      breadcrumbs={[{ label: "Início", href: "/" }, { label: "Admin" }]}
    >
      <div className="grid two">
        <InfoCard title="Preparação da campanha" eyebrow="Abertura">
          <ul>
            {openingChecklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="row">
            <Link href="/admin/campaigns">
              <button>Ver campanhas</button>
            </Link>
          </div>
        </InfoCard>
        <InfoCard title="Revisão e finalização" eyebrow="Fecho">
          <ul>
            {finalizationChecklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="status">
            Este painel vai ligar as próximas rotas de configuração, dry-run, commit de colocação e geração
            de documentos.
          </p>
        </InfoCard>
      </div>
    </PageShell>
  );
}
