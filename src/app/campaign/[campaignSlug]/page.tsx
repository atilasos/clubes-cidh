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
  const enrollHref = `/campaign/${campaignSlug}/enroll` as Route;

  return (
    <PageShell
      badge="Portal público"
      title={`Campanha ${campaignSlug}`}
      description="Entrada pública para identificação do aluno e submissão das escolhas dos clubes elegíveis."
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
        <InfoCard title="2. Submeter escolhas" eyebrow="Passo 2">
          <p>
            Depois de validar o aluno, submete as escolhas num máximo de um clube por horário, sempre sujeito a
            disponibilidade em tempo real.
          </p>
          <div className="row">
            <Link href={enrollHref}>
              <button>Abrir formulário de submissão</button>
            </Link>
          </div>
        </InfoCard>
      </div>
    </PageShell>
  );
}
