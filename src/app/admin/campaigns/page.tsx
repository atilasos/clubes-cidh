import Link from "next/link";
import type { Route } from "next";
import { InfoCard, PageShell } from "@/components/page-shell";
import { requireAdminPage } from "@/server/auth/admin-guard";
import { getDashboardData } from "@/server/services/dashboard-service";

export default async function AdminCampaignsPage() {
  await requireAdminPage();
  const dashboard = await getDashboardData();

  return (
    <PageShell
      badge="Admin / Campanhas"
      title="Campanhas"
      description="Lista operacional das campanhas existentes, com estado, calendário e ligação direta ao detalhe para exportação, distribuição e finalização."
      breadcrumbs={[
        { label: "Início", href: "/" },
        { label: "Admin", href: "/admin" },
        { label: "Campanhas" },
      ]}
    >
      <div className="grid two">
        <InfoCard title="Campanhas registadas" eyebrow="Dados reais">
          {dashboard.campaigns.length === 0 ? (
            <p className="status">Ainda não existem campanhas para mostrar.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Campanha</th>
                    <th>Estado</th>
                    <th>Semestre</th>
                    <th>Período</th>
                    <th>Colocações</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.campaigns.map((campaign) => (
                    <tr key={campaign.id}>
                      <td>
                        <strong>{campaign.title}</strong>
                        <br />
                        <span className="status">{campaign.schoolYear}</span>
                      </td>
                      <td>{campaign.status}</td>
                      <td>{campaign.semester}º semestre</td>
                      <td>
                        <span className="status">
                          {new Date(campaign.startsAt).toLocaleDateString("en-US")} → {new Date(campaign.endsAt).toLocaleDateString("en-US")}
                        </span>
                      </td>
                      <td>{campaign.placements.length}</td>
                      <td>
                        <Link href={`/admin/campaigns/${campaign.slug}` as Route}>
                          <button>Ver detalhe</button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </InfoCard>
        <InfoCard title="Checklist operacional" eyebrow="Fluxo">
          <ol>
            <li>Criar a campanha e rever slots, clubes e vagas.</li>
            <li>Gerar o pacote de acesso para envio externo.</li>
            <li>Executar preview da distribuição antes do commit final.</li>
            <li>Registar exceções explícitas quando necessário.</li>
            <li>Finalizar apenas depois de resolver todos os horários pendentes.</li>
          </ol>
        </InfoCard>
      </div>
    </PageShell>
  );
}
