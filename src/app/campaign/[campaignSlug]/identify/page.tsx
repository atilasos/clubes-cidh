import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { requestRemoteKey } from "@/server/lib/security";
import { identifyStudentForCampaign } from "@/server/services/enrollment-service";
import { setCampaignAccessSession } from "@/server/auth/campaign-access-session";

type CampaignIdentifyPageProps = {
  params: Promise<{
    campaignSlug: string;
  }>;
  searchParams: Promise<{
    message?: string;
    error?: string;
  }>;
};

export default async function CampaignIdentifyPage({ params, searchParams }: CampaignIdentifyPageProps) {
  const { campaignSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const errorMessage = resolvedSearchParams.error?.trim() ?? "";
  const message = resolvedSearchParams.message?.trim() ?? "";

  async function identifyAction(formData: FormData) {
    "use server";

    try {
      const identifier = String(formData.get("identifier") ?? "").trim();
      const accessCode = String(formData.get("accessCode") ?? "").trim();
      const result = await identifyStudentForCampaign(campaignSlug, identifier, accessCode, requestRemoteKey(await headers()));

      await setCampaignAccessSession({
        campaignSlug,
        studentId: result.student.id,
        accessCode,
      });

      redirect(`/campaign/${campaignSlug}/enroll`);
    } catch (error) {
      const nextError = error instanceof Error ? error.message : "Não foi possível validar o acesso do aluno.";
      redirect(`/campaign/${campaignSlug}/identify?error=${encodeURIComponent(nextError)}`);
    }
  }

  return (
    <PageShell
      badge="Portal público / Identificação"
      title="Identificar aluno"
      description="Introduza um identificador do aluno e o código da campanha para ver apenas os clubes ainda elegíveis e disponíveis."
      breadcrumbs={[
        { label: "Início", href: "/" },
        { label: "Campanha", href: `/campaign/${campaignSlug}` },
        { label: "Identificação" },
      ]}
    >
      <div className="grid two">
        <section className="card stack">
          <form className="stack" action={identifyAction}>
            <label className="stack">
              <span>Identificador do aluno</span>
              <input name="identifier" placeholder="CC, NIF ou número do aluno" required />
            </label>
            <label className="stack">
              <span>Código de acesso</span>
              <input name="accessCode" placeholder="Código de 6 caracteres" required />
            </label>
            <button type="submit">Validar aluno</button>
          </form>
          <p className="status">
            O portal não mostra clubes incompatíveis nem vagas entretanto esgotadas. A validação final volta a ser
            feita antes da submissão.
          </p>
        </section>

        <section className="card stack">
          <h2>Seguimento</h2>
          {message ? <p className="success">{message}</p> : null}
          {errorMessage ? <p className="error">{errorMessage}</p> : null}
          {!message && !errorMessage ? (
            <p className="status">Depois da validação, o portal abre a página de inscrição sem colocar identificadores ou códigos no URL.</p>
          ) : null}
        </section>
      </div>
    </PageShell>
  );
}
