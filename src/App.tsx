import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

const TABLE_NAME = "verificacoes";

const SERVICOS = [
  "Hidráulica",
  "Elétrica",
  "Revestimento",
  "Pintura",
  "Portas",
  "Marcenaria",
  "Esquadrias",
  "Terrasse",
  "Gesso",
  "Drywall",
  "Outros",
] as const;

const STATUS = ["Pendente", "Em andamento", "Concluída"] as const;

type Verificacao = {
  id: string;
  created_at: string;
  obra: string | null;
  pavimento: string | null;
  apartamento: string | null;
  local_do_servico: string | null;
  mao_obra: string | null;
  servico: string | null;
  status: string | null;
  observacoes: string | null;
};

type FormState = {
  obra: string;
  pavimento: string;
  apartamento: string;
  local_do_servico: string;
  mao_obra: string;
  servico: string;
  status: string;
  observacoes: string;
};

const emptyForm = (): FormState => ({
  obra: "",
  pavimento: "",
  apartamento: "",
  local_do_servico: "",
  mao_obra: "",
  servico: "",
  status: "Pendente",
  observacoes: "",
});

function formatDateBR(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function statusClass(status?: string | null) {
  const s = (status || "").toLowerCase();
  if (s.includes("concl")) return "statusChip statusDone";
  if (s.includes("and")) return "statusChip statusDoing";
  return "statusChip statusPending";
}

export default function App() {
  const [lista, setLista] = useState<Verificacao[]>([]);
  const [loading, setLoading] = useState(false);

  const [servicoFiltro, setServicoFiltro] = useState<string>("Todos");

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(emptyForm());

  const [msgErro, setMsgErro] = useState<string | null>(null);

  async function carregar() {
    setLoading(true);
    setMsgErro(null);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMsgErro(error.message);
      setLista([]);
      setLoading(false);
      return;
    }

    setLista((data || []) as Verificacao[]);
    setLoading(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  const listaFiltrada = useMemo(() => {
    if (servicoFiltro === "Todos") return lista;
    return lista.filter((v) => (v.servico || "") === servicoFiltro);
  }, [lista, servicoFiltro]);

  function abrirNova() {
    setEditId(null);
    setForm(emptyForm());
    setMsgErro(null);
    setModalOpen(true);
  }

  function abrirEdicao(v: Verificacao) {
    setEditId(v.id);
    setForm({
      obra: v.obra || "",
      pavimento: v.pavimento || "",
      apartamento: v.apartamento || "",
      local_do_servico: v.local_do_servico || "",
      mao_obra: v.mao_obra || "",
      servico: v.servico || "",
      status: v.status || "Pendente",
      observacoes: v.observacoes || "",
    });
    setMsgErro(null);
    setModalOpen(true);
  }

  function fecharModal() {
    setModalOpen(false);
    setEditId(null);
    setMsgErro(null);
  }

  function validarForm(): string | null {
    // Ajuste o que você quiser obrigar:
    if (!form.obra.trim()) return "Preencha Obra.";
    if (!form.pavimento.trim()) return "Preencha Pavimento.";
    if (!form.apartamento.trim()) return "Preencha Apartamento.";
    if (!form.local_do_servico.trim()) return "Preencha Local do serviço.";
    if (!form.mao_obra.trim()) return "Preencha Mão de obra.";
    if (!form.servico.trim()) return "Selecione Serviço.";
    if (!form.status.trim()) return "Selecione Status.";
    return null;
  }

  async function salvar() {
    setMsgErro(null);

    const erro = validarForm();
    if (erro) {
      setMsgErro(erro);
      return;
    }

    const payload = {
      obra: form.obra.trim(),
      pavimento: form.pavimento.trim(),
      apartamento: form.apartamento.trim(),
      local_do_servico: form.local_do_servico.trim(),
      mao_obra: form.mao_obra.trim(),
      servico: form.servico.trim(),
      status: form.status.trim(),
      observacoes: form.observacoes.trim() ? form.observacoes.trim() : null,
    };

    if (editId) {
      const { error } = await supabase
        .from(TABLE_NAME)
        .update(payload)
        .eq("id", editId);

      if (error) {
        setMsgErro(error.message);
        return;
      }
    } else {
      const { error } = await supabase.from(TABLE_NAME).insert([payload]);
      if (error) {
        setMsgErro(error.message);
        return;
      }
    }

    await carregar();
    fecharModal();
  }

  return (
    <div className="page">
      {/* Topo estilo “chips” */}
      <div className="topBar">
        <div className="chips">
          <button
            className={servicoFiltro === "Todos" ? "chip chipActive" : "chip"}
            onClick={() => setServicoFiltro("Todos")}
            type="button"
          >
            Todos
          </button>

          {SERVICOS.map((s) => (
            <button
              key={s}
              className={servicoFiltro === s ? "chip chipActive" : "chip"}
              onClick={() => setServicoFiltro(s)}
              type="button"
            >
              {s}
            </button>
          ))}
        </div>

        <button className="fab" onClick={abrirNova} type="button" title="Nova verificação">
          +
        </button>
      </div>

      {/* Lista */}
      <div className="content">
        {loading && <div className="muted">Carregando...</div>}

        {!loading && msgErro && <div className="errorBox">{msgErro}</div>}

        {!loading && !msgErro && listaFiltrada.length === 0 && (
          <div className="muted">Nenhuma verificação ainda.</div>
        )}

        {!loading &&
          !msgErro &&
          listaFiltrada.map((v) => {
            // título forte (igual card do exemplo)
            const titulo = `${v.obra || ""} | ${v.apartamento || ""} | ${v.local_do_servico || ""}`.trim();

            // subtítulo (linha menor)
            const subtitulo = `${v.servico || ""} • ${v.pavimento || ""} • ${v.mao_obra || ""}`.trim();

            return (
              <button
                key={v.id}
                className="card"
                onClick={() => abrirEdicao(v)}
                type="button"
              >
                <div className="cardTop">
                  <div className="cardLeft">
                    <div className="smallTop">{v.mao_obra || "—"}</div>
                    <div className="title">{titulo || "Verificação"}</div>
                    <div className="subtitle">{subtitulo || "—"}</div>
                    <div className="date">{formatDateBR(v.created_at)}</div>
                  </div>

                  <div className={statusClass(v.status)}>{v.status || "Pendente"}</div>
                </div>

                <div className="cardBottom">
                  <div className="pill">{v.servico || "Serviço"}</div>

                  <div className="rightStrong">
                    {v.observacoes ? "Com observações" : ""}
                  </div>
                </div>

                {v.observacoes ? (
                  <div className="obsPreview">{v.observacoes}</div>
                ) : null}
              </button>
            );
          })}
      </div>

      {/* Modal Criar/Editar */}
      {modalOpen && (
        <div className="modalOverlay" onClick={fecharModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div className="modalTitle">
                {editId ? "Editar Verificação" : "Nova Verificação"}
              </div>
              <button className="closeBtn" onClick={fecharModal} type="button">
                ✕
              </button>
            </div>

            {msgErro && <div className="errorBox">{msgErro}</div>}

            {/* scroll do modal */}
            <div className="modalBody">
              <div className="field">
                <label>Obra</label>
                <input
                  value={form.obra}
                  onChange={(e) => setForm({ ...form, obra: e.target.value })}
                />
              </div>

              <div className="grid2">
                <div className="field">
                  <label>Pavimento</label>
                  <input
                    value={form.pavimento}
                    onChange={(e) =>
                      setForm({ ...form, pavimento: e.target.value })
                    }
                  />
                </div>

                <div className="field">
                  <label>Apartamento</label>
                  <input
                    value={form.apartamento}
                    onChange={(e) =>
                      setForm({ ...form, apartamento: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="field">
                <label>Local do serviço</label>
                <input
                  value={form.local_do_servico}
                  onChange={(e) =>
                    setForm({ ...form, local_do_servico: e.target.value })
                  }
                />
              </div>

              <div className="field">
                <label>Mão de obra</label>
                <input
                  value={form.mao_obra}
                  onChange={(e) =>
                    setForm({ ...form, mao_obra: e.target.value })
                  }
                />
              </div>

              <div className="grid2">
                <div className="field">
                  <label>Serviço</label>
                  <select
                    value={form.servico}
                    onChange={(e) =>
                      setForm({ ...form, servico: e.target.value })
                    }
                  >
                    <option value="">Selecione</option>
                    {SERVICOS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>Status</label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                  >
                    {STATUS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* NOVO CAMPO */}
              <div className="field">
                <label>Observações</label>
                <textarea
                  value={form.observacoes}
                  onChange={(e) =>
                    setForm({ ...form, observacoes: e.target.value })
                  }
                  rows={4}
                />
              </div>
            </div>

            <div className="modalFooter">
              <button className="primaryBtn" onClick={salvar} type="button">
                Salvar
              </button>
              <button className="ghostBtn" onClick={fecharModal} type="button">
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}