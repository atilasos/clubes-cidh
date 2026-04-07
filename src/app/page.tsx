import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <div className="container grid two">
        <section className="card stack">
          <span className="badge">Administração</span>
          <h1>Portal de inscrição nos clubes</h1>
          <p>
            Configure campanhas, importe alunos, reserve vagas, gere revisões de colocação e finalize com
            PDFs prontos para impressão.
          </p>
          <div className="row">
            <Link href="/admin">
              <button>Abrir painel administrativo</button>
            </Link>
          </div>
        </section>
        <section className="card stack">
          <span className="badge">Portal público</span>
          <h2>Fluxo para pais e encarregados</h2>
          <p>
            Cada campanha usa um link público com código de acesso. Os alunos só veem clubes elegíveis e
            disponíveis em cada horário.
          </p>
          <p className="status">
            Depois de criar uma campanha, partilhe o link e os códigos gerados no painel administrativo.
          </p>
        </section>
      </div>
    </main>
  );
}
