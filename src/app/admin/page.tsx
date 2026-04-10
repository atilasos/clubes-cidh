import Link from "next/link";
import { redirect } from "next/navigation";
import { InfoCard, PageShell } from "@/components/page-shell";
import { createCampaign } from "@/server/services/campaign-service";
import { getDashboardData } from "@/server/services/dashboard-service";
import { importStudents } from "@/server/services/student-import-service";
import { createAdminSession, clearAdminSession } from "@/server/auth/admin-guard";
import { isAdminAuthenticated } from "@/server/auth/admin-session";
import { withStore } from "@/server/store/db";

type AdminDashboardPageProps = {
  searchParams: Promise<{
    message?: string;
    error?: string;
  }>;
};

function parseLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseSlots(value: string) {
  return parseLines(value).map((line) => {
    const [label, startsAt, endsAt, grades, capacityDivisor, minimumPerClub] = line.split("|").map((item) => item.trim());
    return {
      label,
      startsAt,
      endsAt,
      eligibleGrades: grades ? grades.split(",").map((grade) => grade.trim()).filter(Boolean) : [],
      capacityDivisor: capacityDivisor ? Number(capacityDivisor) : null,
      minimumPerClub: minimumPerClub ? Number(minimumPerClub) : null,
    };
  });
}

function parseClubs(value: string) {
  return parseLines(value).map((line) => {
    const [name, teacher, slotLabel, capacityOverride] = line.split("|").map((item) => item.trim());
    return {
      name,
      teacher,
      slotLabel,
      capacityOverride: capacityOverride ? Number(capacityOverride) : null,
    };
  });
}

function parseReservations(value: string) {
  return parseLines(value).map((line) => {
    const parts = line.split("|").map((item) => item.trim());
    if (parts.length >= 4) {
      const [studentNumber, slotLabel, clubName, reason] = parts;
      return { studentNumber, slotLabel, clubName, reason };
    }

    const [studentNumber, clubName, reason] = parts;
    return { studentNumber, clubName, reason };
  });
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function statusLabel(status: string) {
  return {
    draft: "rascunho",
    open: "aberta",
    closed: "fechada",
    finalized: "finalizada",
    archived: "arquivada",
  }[status] ?? status;
}

function auditActionLabel(action: string) {
  return {
    students_imported: "alunos importados",
    campaign_opened: "campanha aberta",
    campaign_created: "campanha criada",
    campaign_updated: "campanha atualizada",
    campaign_closed: "campanha fechada",
    campaign_archived: "campanha arquivada",
    access_export_generated: "pacote de acesso gerado",
    reservation_created: "reserva criada",
    reservation_removed: "reserva removida",
    placement_committed: "colocação confirmada",
    allocation_committed: "distribuição confirmada",
    capacity_override_configured: "ajuste manual de vagas configurado",
    slot_updated: "horário atualizado",
    club_updated: "clube atualizado",
    placement_exception_recorded: "exceção de colocação registada",
    placement_exception_updated: "exceção de colocação atualizada",
  }[action] ?? action;
}

export default async function AdminDashboardPage({ searchParams }: AdminDashboardPageProps) {
  const resolvedSearchParams = await searchParams;
  const authenticated = await isAdminAuthenticated();

  async function loginAction(formData: FormData) {
    "use server";

    try {
      await createAdminSession(String(formData.get("password") ?? ""));
      redirect("/admin?message=Autenticação%20administrativa%20ativa.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível autenticar a administração.";
      redirect(`/admin?error=${encodeURIComponent(message)}`);
    }
  }

  async function logoutAction() {
    "use server";

    await clearAdminSession();
    redirect("/admin?message=Sessão%20terminada.");
  }

  async function importStudentsAction(formData: FormData) {
    "use server";

    const csvText = String(formData.get("csv") ?? "").trim();
    const uploadedFile = formData.get("file");
    const fileText = uploadedFile instanceof File ? await uploadedFile.text() : "";
    const csv = fileText.trim() || csvText;

    try {
      const result = await withStore((store) => importStudents(store, { csv, actor: "admin" }));
      redirect(
        `/admin?message=${encodeURIComponent(`Importação concluída: ${result.imported.length} alunos, ${result.rejected.length} rejeições.`)}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível importar os alunos.";
      redirect(`/admin?error=${encodeURIComponent(message)}`);
    }
  }

  async function createCampaignAction(formData: FormData) {
    "use server";

    try {
      const title = String(formData.get("title") ?? "").trim();
      const slug = String(formData.get("slug") ?? "").trim();
      const semester = Number(formData.get("semester") ?? 1) as 1 | 2;
      const schoolYear = String(formData.get("schoolYear") ?? "").trim();
      const startsAt = String(formData.get("startsAt") ?? "").trim();
      const endsAt = String(formData.get("endsAt") ?? "").trim();
      const defaultCapacity = Number(formData.get("defaultCapacity") ?? 1);
      const openImmediately = formData.get("openImmediately") === "on";
      const slots = parseSlots(String(formData.get("slots") ?? ""));
      const clubs = parseClubs(String(formData.get("clubs") ?? ""));
      const reservations = parseReservations(String(formData.get("reservations") ?? ""));

      const campaign = await withStore((store) =>
        createCampaign(store, {
          title,
          slug: slug || undefined,
          semester,
          schoolYear,
          startsAt,
          endsAt,
          defaultCapacity,
          openImmediately,
          slots,
          clubs,
          reservations,
        }, "admin"),
      );
      redirect(`/admin/campaigns/${campaign.slug}?message=${encodeURIComponent("Campanha criada com sucesso.")}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível criar a campanha.";
      redirect(`/admin?error=${encodeURIComponent(message)}`);
    }
  }

  if (!authenticated) {
    return (
      <PageShell
        badge="Administração"
        title="Autenticação administrativa"
        description="Introduza a palavra-passe administrativa para aceder à preparação de campanhas, à importação de alunos e às ações de fecho."
        breadcrumbs={[{ label: "Início", href: "/" }, { label: "Administração" }]}
      >
        <div className="grid two">
          <InfoCard title="Entrar" eyebrow="Acesso protegido">
            {resolvedSearchParams.message ? <p className="success">{resolvedSearchParams.message}</p> : null}
            {resolvedSearchParams.error ? <p className="error">{resolvedSearchParams.error}</p> : null}
            <form className="stack" action={loginAction}>
              <label className="stack">
                <span>Palavra-passe administrativa</span>
                <input type="password" name="password" required />
              </label>
              <button type="submit">Entrar no painel</button>
            </form>
          </InfoCard>
          <InfoCard title="Âmbito" eyebrow="Operações disponíveis">
            <ul>
              <li>Importar ficheiros CSV de alunos.</li>
              <li>Criar campanhas em rascunho com horários, clubes e reservas.</li>
              <li>Exportar acessos, rever listas, distribuir e finalizar.</li>
            </ul>
          </InfoCard>
        </div>
      </PageShell>
    );
  }

  const dashboard = await getDashboardData();
  const openCampaigns = dashboard.campaigns.filter((campaign) => campaign.status === "open");
  const finalizedCampaigns = dashboard.campaigns.filter(
    (campaign) => campaign.status === "finalized" || campaign.status === "archived",
  );

  return (
    <PageShell
      badge="Administração"
      title="Painel administrativo"
      description="Vista operacional do estado atual: alunos importados, campanhas existentes, métricas de risco e pontos de entrada para rever, distribuir e finalizar."
      breadcrumbs={[{ label: "Início", href: "/" }, { label: "Administração" }]}
    >
      {resolvedSearchParams.message ? <p className="success">{resolvedSearchParams.message}</p> : null}
      {resolvedSearchParams.error ? <p className="error">{resolvedSearchParams.error}</p> : null}

      <div className="row">
        <form action={logoutAction}>
          <button className="secondary" type="submit">Terminar sessão</button>
        </form>
      </div>

      <div className="grid two">
        <InfoCard title="Resumo operacional" eyebrow="Estado atual">
          <ul>
            <li>{dashboard.students.length} aluno(s) importado(s)</li>
            <li>{dashboard.campaigns.length} campanha(s) registada(s)</li>
            <li>{openCampaigns.length} campanha(s) aberta(s)</li>
            <li>{finalizedCampaigns.length} campanha(s) finalizada(s) ou arquivada(s)</li>
          </ul>
          <div className="row">
            <Link href="/admin/campaigns">
              <button>Gerir campanhas</button>
            </Link>
          </div>
        </InfoCard>
        <InfoCard title="Métricas críticas" eyebrow="Observabilidade">
          <ul>
            <li>Falhas de identificação: {dashboard.metrics.campaign_identification_failures_total ?? 0}</li>
            <li>Disputas pela última vaga: {dashboard.metrics.campaign_last_seat_race_total ?? 0}</li>
            <li>Repetições inevitáveis: {dashboard.metrics.allocation_repeat_override_total ?? 0}</li>
            <li>Falhas na geração de PDFs: {dashboard.metrics.pdf_generation_failures_total ?? 0}</li>
          </ul>
        </InfoCard>
      </div>

      <div className="grid two">
        <InfoCard title="Importar alunos" eyebrow="Preparação">
          <form className="stack" action={importStudentsAction}>
            <label className="stack">
              <span>CSV da tabela de alunos</span>
              <textarea
                name="csv"
                defaultValue={"name,grade,className,cc,nif,studentNumber\nAna Silva,5,5A,123456780AA1,123456789,2025001"}
              />
            </label>
            <label className="stack">
              <span>Ou carregar ficheiro CSV</span>
              <input type="file" name="file" accept=".csv,text/csv" />
            </label>
            <button type="submit">Importar alunos</button>
          </form>

          {dashboard.lastStudentImportReport ? (
            <section className="card stack">
              <h3>Último relatório de importação</h3>
              <p className="status">
                {dashboard.lastStudentImportReport.importedCount} importado(s) · {dashboard.lastStudentImportReport.rejected.length} rejeição(ões)
              </p>
              {dashboard.lastStudentImportReport.rejected.length > 0 ? (
                <ul>
                  {dashboard.lastStudentImportReport.rejected.map((entry) => (
                    <li key={`${entry.rowNumber}-${entry.reason}`}>
                      Linha {entry.rowNumber}: {entry.reason}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="status">Sem rejeições no último ficheiro processado.</p>
              )}
            </section>
          ) : null}
        </InfoCard>

        <InfoCard title="Criar campanha" eyebrow="Preparação">
          <p className="status">Recomendado: criar em rascunho, rever os dados reais da campanha e abrir só quando a configuração estiver pronta.</p>
          <form className="stack" action={createCampaignAction}>
            <div className="grid two">
              <label className="stack">
                <span>Título</span>
                <input name="title" required />
              </label>
              <label className="stack">
              <span>Identificador público opcional</span>
              <input name="slug" />
              </label>
              <label className="stack">
                <span>Semestre</span>
                <select name="semester" defaultValue="1">
                  <option value="1">1º semestre</option>
                  <option value="2">2º semestre</option>
                </select>
              </label>
              <label className="stack">
                <span>Ano letivo</span>
                <input name="schoolYear" placeholder="2025/2026" required />
              </label>
              <label className="stack">
                <span>Início</span>
                <input name="startsAt" placeholder="2026-04-10T09:00:00.000Z" required />
              </label>
              <label className="stack">
                <span>Fim</span>
                <input name="endsAt" placeholder="2026-04-20T18:00:00.000Z" required />
              </label>
              <label className="stack">
                <span>Capacidade por defeito</span>
                <input type="number" min="1" name="defaultCapacity" defaultValue="1" required />
              </label>
              <label className="row">
                <input type="checkbox" name="openImmediately" />
                <span>Abrir imediatamente depois da criação</span>
              </label>
            </div>

            <label className="stack">
              <span>Horários (uma linha por horário: rótulo|início|fim|ano1,ano2|divisor opcional|mínimo opcional)</span>
              <textarea
                name="slots"
                defaultValue={"Quinta 14:00|2026-04-11T14:00:00.000Z|2026-04-11T15:00:00.000Z|5,6|2|1"}
                required
              />
            </label>

            <label className="stack">
              <span>Clubes (uma linha por clube: nome|professor|rótulo do horário|ajuste manual opcional)</span>
              <textarea
                name="clubs"
                defaultValue={"Robótica|Prof. Nuno|Quinta 14:00|1\nCiência Viva|Prof. Marta|Quinta 14:00|1"}
                required
              />
            </label>

            <label className="stack">
              <span>Reservas manuais (opcional, uma por linha: número de aluno|horário opcional|clube|razão)</span>
              <textarea name="reservations" />
            </label>

            <button type="submit">Criar campanha</button>
          </form>
        </InfoCard>
      </div>

      <div className="grid two">
        <InfoCard title="Campanhas recentes" eyebrow="Navegação">
          {dashboard.campaigns.length === 0 ? (
            <p className="status">Ainda não existem campanhas criadas.</p>
          ) : (
            <ul>
              {dashboard.campaigns.slice(0, 5).map((campaign) => (
                <li key={campaign.id}>
                  <Link href={`/admin/campaigns/${campaign.slug}`}>
                    {campaign.title}
                  </Link>{" "}
                  <span className="status">· {statusLabel(campaign.status)}</span>
                </li>
              ))}
            </ul>
          )}
        </InfoCard>
        <InfoCard title="Registo de auditoria recente" eyebrow="Rastreio">
          {dashboard.recentAuditLogs.length === 0 ? (
            <p className="status">Sem eventos recentes.</p>
          ) : (
            <ul>
              {dashboard.recentAuditLogs.slice(0, 5).map((entry) => (
                <li key={entry.id}>
                  <strong>{auditActionLabel(entry.action)}</strong>
                  <br />
                  <span className="status">{entry.actor} · {formatDateTime(entry.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </InfoCard>
      </div>
    </PageShell>
  );
}
