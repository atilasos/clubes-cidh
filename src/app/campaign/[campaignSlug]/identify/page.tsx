import { PageShell } from "@/components/page-shell";

type CampaignIdentifyPageProps = {
  params: Promise<{
    campaignSlug: string;
  }>;
};

export default async function CampaignIdentifyPage({ params }: CampaignIdentifyPageProps) {
  const { campaignSlug } = await params;

  return (
    <PageShell
      badge="Portal público / Identificação"
      title="Identificar aluno"
      description="Formulário mínimo para testar o endpoint público de identificação da campanha."
      breadcrumbs={[
        { label: "Início", href: "/" },
        { label: "Campanha", href: `/campaign/${campaignSlug}` },
        { label: "Identificação" },
      ]}
    >
      <section className="card stack">
        <form
          className="stack"
          action={`/api/public/campaigns/${campaignSlug}/identify`}
          method="post"
        >
          <label className="stack">
            <span>Identificador do aluno</span>
            <input name="identifier" placeholder="CC, NIF ou número do aluno" required />
          </label>
          <label className="stack">
            <span>Código de acesso</span>
            <input name="accessCode" placeholder="Código de 6 caracteres" required />
          </label>
          <label className="stack">
            <span>Chave remota opcional</span>
            <input name="remoteKey" placeholder="IP ou token técnico" />
          </label>
          <button type="submit">Validar aluno</button>
        </form>
        <p className="status">
          Nesta fase o endpoint devolve JSON diretamente, o que simplifica os testes manuais da campanha e do
          rate limiting.
        </p>
      </section>
    </PageShell>
  );
}
