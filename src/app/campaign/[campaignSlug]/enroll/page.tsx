import Link from "next/link";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { clearCampaignAccessSession, readCampaignAccessSession } from "@/server/auth/campaign-access-session";
import { getStudentEnrollmentContext, submitEnrollmentChoice } from "@/server/services/enrollment-service";

type CampaignEnrollPageProps = {
  params: Promise<{
    campaignSlug: string;
  }>;
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

export default async function CampaignEnrollPage({ params, searchParams }: CampaignEnrollPageProps) {
  const { campaignSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const success = resolvedSearchParams.success === "1";
  const errorMessage = resolvedSearchParams.error?.trim() ?? "";
  const session = await readCampaignAccessSession(campaignSlug);

  let context:
    | Awaited<ReturnType<typeof getStudentEnrollmentContext>>
    | null = null;
  let loadError: string | null = null;

  if (session) {
    try {
      context = await getStudentEnrollmentContext(campaignSlug, session.studentId, session.accessCode);
    } catch (error) {
      loadError = error instanceof Error ? error.message : "Não foi possível carregar as opções da campanha.";
    }
  }

  async function submitAction(formData: FormData) {
    "use server";

    const session = await readCampaignAccessSession(campaignSlug);
    if (!session) {
      redirect(`/campaign/${campaignSlug}/identify?error=${encodeURIComponent("A sessão da campanha expirou. Identifique o aluno novamente.")}`);
    }

    const choices = Array.from(formData.entries())
      .filter(([key, value]) => key.startsWith("choice:") && typeof value === "string" && value.length > 0)
      .map(([key, value]) => ({
        slotId: key.replace(/^choice:/, ""),
        clubId: String(value),
      }));

    try {
      await submitEnrollmentChoice({
        campaignSlug,
        studentId: session.studentId,
        accessCode: session.accessCode,
        choices,
      });
      await clearCampaignAccessSession();
      redirect(`/campaign/${campaignSlug}/enroll?success=1`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível submeter a inscrição.";
      redirect(`/campaign/${campaignSlug}/enroll?error=${encodeURIComponent(message)}`);
    }
  }

  return (
    <PageShell
      badge="Portal público / Submissão"
      title="Submeter inscrição"
      description="Confirme uma escolha por horário elegível. A disponibilidade é validada novamente no servidor no momento da submissão."
      breadcrumbs={[
        { label: "Início", href: "/" },
        { label: "Campanha", href: `/campaign/${campaignSlug}` },
        { label: "Submissão" },
      ]}
    >
      <div className="grid two">
        <section className="card stack">
          <h2>Aluno</h2>
          {!session && !success ? (
            <>
              <p className="status">Primeiro valide o aluno para obter as opções elegíveis desta campanha.</p>
              <div className="row">
                <Link href={`/campaign/${campaignSlug}/identify`}>
                  <button>Ir para a identificação</button>
                </Link>
              </div>
            </>
          ) : null}

          {loadError ? <p className="error">{loadError}</p> : null}
          {success ? <p className="success">Inscrição submetida com sucesso.</p> : null}
          {errorMessage ? <p className="error">{errorMessage}</p> : null}

          {context ? (
            <>
              <div className="stack">
                <p>
                  <strong>{context.student.name}</strong>
                </p>
                <p className="status">
                  {context.student.grade} · {context.student.className} · Nº {context.student.studentNumber}
                </p>
                <p className="status">
                  CC: {context.student.maskedCc ?? "—"} · NIF: {context.student.maskedNif ?? "—"}
                </p>
              </div>
              <div className="row">
                <Link href={`/campaign/${campaignSlug}/identify`}>
                  <button className="secondary">Voltar à identificação</button>
                </Link>
              </div>
            </>
          ) : null}
        </section>

        <section className="card stack">
          <h2>Escolhas</h2>
          {context && context.options.length > 0 ? (
            <form className="stack" action={submitAction}>
              {context.options.map((option) => (
                <fieldset key={option.slot.id} className="card stack">
                  <legend>
                    <strong>{option.slot.label}</strong>
                  </legend>
                  <p className="status">Escolha, no máximo, um clube para este horário.</p>
                  {option.clubs.map((club) => (
                    <label key={club.id} className="row">
                      <input type="radio" name={`choice:${option.slot.id}`} value={club.id} />
                      <span>
                        {club.name} · {club.teacher} · {club.remainingCapacity} vaga(s)
                      </span>
                    </label>
                  ))}
                </fieldset>
              ))}
              <button type="submit">Confirmar inscrição</button>
            </form>
          ) : null}

          {context && context.options.length === 0 ? (
            <p className="status">O aluno já não tem horários disponíveis para nova submissão nesta campanha.</p>
          ) : null}
        </section>
      </div>
    </PageShell>
  );
}
