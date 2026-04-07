import { PageShell } from "@/components/page-shell";

type CampaignEnrollPageProps = {
  params: Promise<{
    campaignSlug: string;
  }>;
};

const examplePayload = JSON.stringify(
  [
    {
      slotId: "slot-science",
      clubId: "robotics",
    },
  ],
  null,
  2,
);

export default async function CampaignEnrollPage({ params }: CampaignEnrollPageProps) {
  const { campaignSlug } = await params;

  return (
    <PageShell
      badge="Portal público / Submissão"
      title="Submeter inscrição"
      description="Formulário mínimo para testar a submissão de escolhas da campanha."
      breadcrumbs={[
        { label: "Início", href: "/" },
        { label: "Campanha", href: `/campaign/${campaignSlug}` },
        { label: "Submissão" },
      ]}
    >
      <section className="card stack">
        <form className="stack" action={`/api/public/campaigns/${campaignSlug}/submit`} method="post">
          <label className="stack">
            <span>ID do aluno</span>
            <input name="studentId" placeholder="UUID ou id interno do aluno" required />
          </label>
          <label className="stack">
            <span>Código de acesso</span>
            <input name="accessCode" placeholder="Código válido da campanha" required />
          </label>
          <label className="stack">
            <span>Escolhas (JSON)</span>
            <textarea name="choices" rows={8} defaultValue={examplePayload} />
          </label>
          <button type="submit">Confirmar inscrição</button>
        </form>
        <p className="status">
          O endpoint volta a validar disponibilidade e elegibilidade no servidor. Para o MVP técnico, o
          formulário aceita um JSON com as escolhas.
        </p>
      </section>
    </PageShell>
  );
}
