import Link from "next/link";
import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { InfoCard, PageShell } from "@/components/page-shell";
import { requireAdminPage } from "@/server/auth/admin-guard";
import { exportCampaignAccessPackage, getCampaignDetailView, recordCampaignException } from "@/server/services/campaign-service";
import { closeCampaign, commitCampaignAllocation, openCampaign, previewCampaignAllocation, finalizeCampaign } from "@/server/services/campaign-operations-service";
import { readStore, withStore } from "@/server/store/db";

type CampaignDetailPageProps = {
  params: Promise<{
    campaignSlug: string;
  }>;
  searchParams: Promise<{
    preview?: string;
    message?: string;
    error?: string;
  }>;
};

export default async function AdminCampaignDetailPage({ params, searchParams }: CampaignDetailPageProps) {
  await requireAdminPage();
  const { campaignSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const pageUrl = `/admin/campaigns/${campaignSlug}`;
  const pageRoute = pageUrl as Route;
  const store = await readStore();
  const detail = getCampaignDetailView(store, campaignSlug);
  const preview =
    resolvedSearchParams.preview === "1" && detail.campaign.status === "closed"
      ? previewCampaignAllocation(store, detail.campaign.id).preview
      : [];
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const baseUrl = `${protocol}://${host}`;

  async function exportAccessAction(formData: FormData) {
    "use server";

    const nextBaseUrl = String(formData.get("baseUrl") ?? "http://localhost:3000");

    try {
      await withStore((mutableStore) => exportCampaignAccessPackage(mutableStore, detail.campaign.id, nextBaseUrl, "admin"));
      redirect(`${pageUrl}?message=${encodeURIComponent("Pacote de acesso gerado com sucesso.")}` as Route);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível gerar o pacote de acesso.";
      redirect(`${pageUrl}?error=${encodeURIComponent(message)}` as Route);
    }
  }

  async function commitAllocationAction() {
    "use server";

    try {
      await withStore((mutableStore) => commitCampaignAllocation(mutableStore, detail.campaign.id, "admin"));
      redirect(`${pageUrl}?message=${encodeURIComponent("Distribuição confirmada com sucesso.")}` as Route);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível confirmar a distribuição.";
      redirect(`${pageUrl}?error=${encodeURIComponent(message)}` as Route);
    }
  }

  async function closeCampaignAction() {
    "use server";

    try {
      await withStore((mutableStore) => closeCampaign(mutableStore, detail.campaign.id, "admin"));
      redirect(`${pageUrl}?message=${encodeURIComponent("Campanha fechada com sucesso.")}` as Route);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível fechar a campanha.";
      redirect(`${pageUrl}?error=${encodeURIComponent(message)}` as Route);
    }
  }

  async function openCampaignAction() {
    "use server";

    try {
      await withStore((mutableStore) => openCampaign(mutableStore, detail.campaign.id, "admin"));
      redirect(`${pageUrl}?message=${encodeURIComponent("Campanha aberta com sucesso.")}` as Route);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível abrir a campanha.";
      redirect(`${pageUrl}?error=${encodeURIComponent(message)}` as Route);
    }
  }

  async function exceptionAction(formData: FormData) {
    "use server";

    const studentId = String(formData.get("studentId") ?? "");
    const slotId = String(formData.get("slotId") ?? "");
    const reason = String(formData.get("reason") ?? "").trim();

    try {
      await withStore((mutableStore) =>
        recordCampaignException(
          mutableStore,
          {
            campaignId: detail.campaign.id,
            studentId,
            slotId,
            reason,
          },
          "admin",
        ),
      );
      redirect(`${pageUrl}?message=${encodeURIComponent("Exceção registada com sucesso.")}` as Route);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível registar a exceção.";
      redirect(`${pageUrl}?error=${encodeURIComponent(message)}` as Route);
    }
  }

  async function finalizeAction() {
    "use server";

    try {
      await withStore((mutableStore) => finalizeCampaign(mutableStore, detail.campaign.id, "admin"));
      redirect(`${pageUrl}?message=${encodeURIComponent("Campanha finalizada com sucesso.")}` as Route);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível finalizar a campanha.";
      redirect(`${pageUrl}?error=${encodeURIComponent(message)}` as Route);
    }
  }

  return (
    <PageShell
      badge="Admin / Detalhe da campanha"
      title={detail.campaign.title}
      description="Vista operacional da campanha: revisão de vagas, exportação de acessos, distribuição automática, gestão de exceções e finalização com documentos gerados."
      breadcrumbs={[
        { label: "Início", href: "/" },
        { label: "Admin", href: "/admin" },
        { label: "Campanhas", href: "/admin/campaigns" },
        { label: campaignSlug },
      ]}
    >
      <div className="grid two">
        <InfoCard title="Resumo" eyebrow="Campanha">
          <ul>
            <li>Estado: {detail.campaign.status}</li>
            <li>Semestre: {detail.campaign.semester}º semestre</li>
            <li>Ano letivo: {detail.campaign.schoolYear}</li>
            <li>Capacidade por defeito: {detail.campaign.defaultCapacity}</li>
            <li>Horários pendentes: {detail.pendingTargets.length}</li>
            <li>Documentos gerados: {detail.documents.length}</li>
          </ul>
        </InfoCard>
        <InfoCard title="Ações" eyebrow="Operações">
          {resolvedSearchParams.message ? <p className="success">{resolvedSearchParams.message}</p> : null}
          {resolvedSearchParams.error ? <p className="error">{resolvedSearchParams.error}</p> : null}

          {detail.campaign.status !== "finalized" && detail.campaign.status !== "archived" ? (
            <form action={exportAccessAction} className="stack">
              <input type="hidden" name="baseUrl" value={baseUrl} />
              <button type="submit">Gerar pacote de acesso</button>
            </form>
          ) : null}

          {detail.campaign.status === "draft" ? (
            <form action={openCampaignAction}>
              <button type="submit">Abrir campanha</button>
            </form>
          ) : null}

          {detail.campaign.status === "open" ? (
            <form action={closeCampaignAction}>
              <button type="submit">Fechar campanha</button>
            </form>
          ) : null}

          {detail.campaign.status === "closed" ? (
            <>
              <div className="row">
                <Link href={`${pageUrl}?preview=1` as Route}>
                  <button className="secondary">Ver dry-run da distribuição</button>
                </Link>
                {resolvedSearchParams.preview === "1" ? (
                  <Link href={pageRoute}>
                    <button className="secondary">Ocultar dry-run</button>
                  </Link>
                ) : null}
              </div>

              <form action={commitAllocationAction}>
                <button type="submit">Confirmar distribuição automática</button>
              </form>

              <form action={finalizeAction}>
                <button className="danger" type="submit">Finalizar campanha</button>
              </form>
            </>
          ) : null}
        </InfoCard>
      </div>

      <div className="grid two">
        <InfoCard title="Horários e clubes" eyebrow="Capacidade">
          <div className="stack">
            {detail.slots.map((slot) => (
              <section key={slot.id} className="card stack">
                <div>
                  <strong>{slot.label}</strong>
                  <p className="status">
                    Elegível para: {slot.eligibleGrades.join(", ") || "todos os anos"} · regra: divisor {slot.capacityDivisor ?? "—"} · mínimo {slot.minimumPerClub ?? 1}
                  </p>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Clube</th>
                        <th>Professor</th>
                        <th>Override</th>
                        <th>Vagas restantes</th>
                        <th>Colocações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slot.clubs.map((club) => (
                        <tr key={club.id}>
                          <td>{club.name}</td>
                          <td>{club.teacher}</td>
                          <td>{club.capacityOverride ?? "—"}</td>
                          <td>{club.remainingCapacity}</td>
                          <td>{club.placements.length}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        </InfoCard>

        <InfoCard title="Reservas e listas" eyebrow="Revisão">
          <div className="stack">
            <section className="card stack">
              <h3>Reservas</h3>
              {detail.reservations.length === 0 ? (
                <p className="status">Sem reservas manuais nesta campanha.</p>
              ) : (
                <ul>
                  {detail.reservations.map((reservation) => (
                    <li key={reservation.id}>
                      <strong>{reservation.student?.name ?? reservation.studentId}</strong> · {reservation.club?.name ?? reservation.clubId} · {reservation.slot?.label ?? reservation.slotId}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card stack">
              <h3>Colocações por clube</h3>
              {detail.slots.flatMap((slot) => slot.clubs).every((club) => club.placements.length === 0) ? (
                <p className="status">Ainda não existem colocações confirmadas.</p>
              ) : (
                detail.slots.map((slot) => (
                  <div key={slot.id} className="stack">
                    <strong>{slot.label}</strong>
                    {slot.clubs.map((club) => (
                      <div key={club.id}>
                        <span>{club.name}</span>
                        {club.placements.length === 0 ? (
                          <p className="status">Sem alunos colocados.</p>
                        ) : (
                          <ul>
                            {club.placements.map((placement) => (
                              <li key={placement.id}>
                                {placement.student?.name ?? placement.studentId} · {placement.source}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </section>
          </div>
        </InfoCard>
      </div>

      <div className="grid two">
        <InfoCard title="Pendências e exceções" eyebrow="Fecho">
          {detail.pendingTargets.length === 0 ? (
            <p className="success">Todos os horários elegíveis estão colocados ou já têm exceção explícita.</p>
          ) : (
            <div className="stack">
              {detail.pendingTargets.map((target) => (
                <form key={`${target.studentId}:${target.slotId}`} action={exceptionAction} className="card stack">
                  <input type="hidden" name="studentId" value={target.studentId} />
                  <input type="hidden" name="slotId" value={target.slotId} />
                  <div>
                    <strong>{target.studentName}</strong>
                    <p className="status">{target.grade} · {target.className} · {target.slotLabel}</p>
                  </div>
                  <label className="stack">
                    <span>Razão da exceção</span>
                    <input name="reason" placeholder="Ex.: sem vagas restantes neste horário" required />
                  </label>
                  <button className="secondary" type="submit">Registar exceção</button>
                </form>
              ))}
            </div>
          )}

          {detail.exceptions.length > 0 ? (
            <section className="card stack">
              <h3>Exceções registadas</h3>
              <ul>
                {detail.exceptions.map((exception) => (
                  <li key={exception.id}>
                    <strong>{exception.student?.name ?? exception.studentId}</strong> · {exception.slot?.label ?? exception.slotId}
                    <br />
                    <span className="status">{exception.reason}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </InfoCard>

        <InfoCard title="Dry-run e outputs" eyebrow="Distribuição">
          {preview.length === 0 && resolvedSearchParams.preview === "1" ? (
            <p className="status">O dry-run não encontrou novas colocações a atribuir.</p>
          ) : null}
          {preview.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>Horário</th>
                    <th>Clube</th>
                    <th>Repetição</th>
                    <th>Razão</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((placement) => {
                    const target = detail.pendingTargets.find(
                      (entry) => entry.studentId === placement.studentId && entry.slotId === placement.slotId,
                    );
                    const club = detail.slots.flatMap((slot) => slot.clubs).find((entry) => entry.id === placement.clubId);
                    return (
                      <tr key={`${placement.studentId}:${placement.slotId}:${placement.clubId}`}>
                        <td>{target?.studentName ?? placement.studentId}</td>
                        <td>{target?.slotLabel ?? placement.slotId}</td>
                        <td>{club?.name ?? placement.clubId}</td>
                        <td>{placement.repeatedClub ? "Sim" : "Não"}</td>
                        <td>{placement.reason}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="status">Use o dry-run para rever a distribuição automática antes do commit.</p>
          )}

          <section className="card stack">
            <h3>Pacotes de acesso e documentos</h3>
            {detail.accessExports[0] ? (
              <div>
                <p>
                  <strong>Último pacote de acesso</strong>
                </p>
                <p className="status">
                  {detail.accessExports[0].rows.length} linha(s) · {new Date(detail.accessExports[0].createdAt).toLocaleString("en-US")}
                </p>
              </div>
            ) : (
              <p className="status">Ainda não foi gerado qualquer pacote de acesso.</p>
            )}

            {detail.documents.length > 0 ? (
                <ul>
                  {detail.documents.map((document) => (
                    <li key={document.id}>
                      <a href={`/api/admin/documents/${document.id}` as Route}>
                        <strong>{document.fileName}</strong>
                      </a>
                      <br />
                      <span className="status">{document.documentType} · {new Date(document.createdAt).toLocaleString("en-US")}</span>
                    </li>
                ))}
              </ul>
            ) : (
              <p className="status">Os documentos serão gerados na finalização.</p>
            )}
          </section>
        </InfoCard>
      </div>

      <InfoCard title="Audit log da campanha" eyebrow="Rastreabilidade">
        {detail.auditLogs.length === 0 ? (
          <p className="status">Sem eventos associados a esta campanha.</p>
        ) : (
          <ul>
            {detail.auditLogs.slice(0, 12).map((entry) => (
              <li key={entry.id}>
                <strong>{entry.action}</strong>
                <br />
                <span className="status">{entry.actor} · {new Date(entry.createdAt).toLocaleString("en-US")}</span>
              </li>
            ))}
          </ul>
        )}
      </InfoCard>
    </PageShell>
  );
}
