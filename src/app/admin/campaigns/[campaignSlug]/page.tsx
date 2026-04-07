import { InfoCard, PageShell } from "@/components/page-shell";

type CampaignDetailPageProps = {
  params: Promise<{
    campaignSlug: string;
  }>;
};

const deliverySteps = [
  "Importação e validação de alunos",
  "Configuração de slots, clubes e reservas",
  "Exportação do pacote de acesso",
  "Dry-run da distribuição final",
  "Commit final + PDFs + arquivo",
];

export default async function AdminCampaignDetailPage({ params }: CampaignDetailPageProps) {
  const { campaignSlug } = await params;

  return (
    <PageShell
      badge="Admin / Detalhe da campanha"
      title={`Campanha ${campaignSlug}`}
      description="Página placeholder para concentrar configuração, revisão operacional, exportações, dry-run e finalização."
      breadcrumbs={[
        { label: "Início", href: "/" },
        { label: "Admin", href: "/admin" },
        { label: "Campanhas", href: "/admin/campaigns" },
        { label: campaignSlug },
      ]}
    >
      <div className="grid two">
        <InfoCard title="Estado esperado" eyebrow="Operações">
          <ul>
            {deliverySteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </InfoCard>
        <InfoCard title="Notas de implementação" eyebrow="Skeleton">
          <p>
            Este detalhe será ligado ao serviço de campanhas para mostrar métricas, listas por clube, reservas,
            alunos por colocar e controlos de finalização.
          </p>
          <p className="status">
            O slug está ativo para typed routes e permite navegar para uma campanha de demonstração sem falhar o
            build.
          </p>
        </InfoCard>
      </div>
    </PageShell>
  );
}
