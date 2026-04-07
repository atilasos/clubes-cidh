import Link from "next/link";
import type { Route } from "next";
import { InfoCard, PageShell } from "@/components/page-shell";

type CampaignLandingPageProps = {
  params: Promise<{
    campaignSlug: string;
  }>;
};

export default async function CampaignLandingPage({ params }: CampaignLandingPageProps) {
  const { campaignSlug } = await params;
  const identifyHref = `/campaign/${campaignSlug}/identify` as Route;

  return (
    <PageShell
      badge="Portal público"
      title={`Campanha ${campaignSlug}`}
      description="Fluxo público para identificar o aluno, ver apenas os clubes elegíveis por horário e confirmar a inscrição com validação no servidor."
      breadcrumbs={[{ label: "Início", href: "/" }, { label: "Campanha" }, { label: campaignSlug }]}
    >
      <div className="grid two">
        <InfoCard title="1. Identificar o aluno" eyebrow="Passo 1">
          <p>
            Introduz um identificador do aluno (CC, NIF ou número de aluno) juntamente com o código de acesso
            da campanha.
          </p>
          <div className="row">
            <Link href={identifyHref}>
              <button>Identificar aluno</button>
            </Link>
          </div>
        </InfoCard>
        <InfoCard title="2. Confirmar escolhas elegíveis" eyebrow="Passo 2">
          <p>
            Depois da identificação, o portal mostra apenas os horários e clubes ainda válidos para esse aluno.
            A confirmação volta a validar disponibilidade e conflitos no servidor.
          </p>
          <ul>
            <li>Um clube por horário.</li>
            <li>Clubes esgotados deixam de estar disponíveis.</li>
            <li>As escolhas ficam sujeitas à ordem de chegada.</li>
          </ul>
        </InfoCard>
      </div>
    </PageShell>
  );
}
