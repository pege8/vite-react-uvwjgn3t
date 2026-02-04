import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import "./styles.css";

const TABLE_NAME = "verificacoes";

const SERVICOS = [
  "Hidráulica",
  "Elétrica",
  "Revestimento",
  "Pintura",
  "Portas",
  "Gesso",
  "Drywall",
  "Marcenaria",
  "Esquadrias",
  "Terrasse",
  "Outros",
] as const;

const STATUS = ["Pendente", "Concluído"] as const;

type Verificacao = {
  id: number;
  created_at: string;
  obra: string | null;
  pavimento: string | null;
  apartamento: string | null;
  local: string | null;
  mao_obra: string | null;
  servico: string | null;
  status: string | null;
};

type FormState = {
  obra: string;
  pavimento: string;
  apartamento: string;
  local: string;
  mao_obra: string;
  servico: string;
  status: string;
};

const FORM_VAZIO: FormState = {
  obra: "",
  pavimento: "",
  apartamento: "",
  local: "",
  mao_obra: "",
  servico: "",
  status: "Pendente",
};

function friendlyError(msg: string) {
  const m = (msg || "").toLowerCase();
  if (m.includes("failed to fetch")) return "Sem conexão com o servidor. Tenta recarregar.";
  if (m.includes("jwt")) return "Sessão/permiteções: verifica as políticas (RLS) do Supabase.";
  return msg;
}

export default function App() {
  const [lista, setLista] = useState<Verificacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [servicoFiltro, setServicoFiltro] = useState<string>("Todos");

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setLoading(true);
    setErro(null);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setErro(friendlyError(error.message));
      setLista([]);
    } else {
      setLista((data as Verificacao[]) ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  const listaFiltrada = useMemo(() => {
    if (servicoFiltro === "Todos") return lista;
    return lista.filter((v) => (v.servico ?? "") === servicoFiltro);
  }, [lista, servicoFiltro]);

  function abrirNovo() {
    setErro(null); // ✅ limpa o erro antes de abrir
    setEditId(null);
    setForm(FORM_VAZIO);
    setShowForm(true);
  }

  function abrirEditar(v: Verificacao) {
    setErro(null); // ✅ limpa o erro antes de abrir
    setEditId(v.id);
    setForm({
      obra: v.obra ?? "",
      pavimento: v.pavimento ?? "",
      apartamento: v.apartamento ?? "",
      local: v.local ?? "",
      mao_obra: v.mao_obra ?? "",
      servico: v.servico ?? "",
      status: v.status ?? "Pendente",
    });
    setShowForm(true);
  }

  function fecharForm() {
    setErro(null); // ✅ limpa ao fechar
    setShowForm(false);
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);

    const payload = {
      obra: form.obra || null,
      pavimento: form.pavimento || null,
      apartamento: form.apartamento || null,
      local: form.local || null,
      mao_obra: form.mao_obra || null,
      servico: form.servico || null,
      status: form.status || "Pendente",
    };

    if (!payload.servico) {
      setErro("Selecione um serviço.");
      setSalvando(false);
      return;
    }

    let res;
    if (editId) {
      res = await supabase.from(TABLE_NAME).update(payload).eq("id", editId);
    } else {
      res = await supabase.from(TABLE_NAME).insert([payload]);
    }

    if (res.error) {
      setErro(friendlyError(res.error.message));
      setSalvando(false);
      return;
    }

    await carregar();
    setSalvando(false);
    setShowForm(false);
  }

  return (
    <div className="app">
      {/* TOP CHIPS */}
      {!showForm && (
        <div className="top">
          <div className="chips">
            <button
              className={`chip ${servicoFiltro === "Todos" ? "active" : ""}`}
              onClick={() => setServicoFiltro("Todos")}
            >
              Todos
            </button>

            {SERVICOS.map((s) => (
              <button
                key={s}
                className={`chip ${servicoFiltro === s ? "active" : ""}`}
                onClick={() => setServicoFiltro(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* LISTA */}
      {!showForm && (
        <div className="content">
          <div className="headerRow">
            <h1 className="title">Verificações</h1>
            <button className="btn" onClick={carregar} disabled={loading}>
              Atualizar
            </button>
          </div>

          {erro && <div className="error">{erro}</div>}

          {loading ? (
            <div className="muted">Carregando…</div>
          ) : listaFiltrada.length === 0 ? (
            <div className="muted">Nenhuma verificação ainda.</div>
          ) : (
            <div className="cards">
              {listaFiltrada.map((v) => (
                <button
                  key={v.id}
                  className="card"
                  onClick={() => abrirEditar(v)}
                >
                  <div className="cardTop">
                    <div className="badge">{v.servico ?? "Sem serviço"}</div>
                    <div className={`status ${v.status === "Concluído" ? "ok" : "pend"}`}>
                      {v.status ?? "Pendente"}
                    </div>
                  </div>

                  <div className="cardLine">
                    <span className="label">Obra</span>
                    <span className="value">{v.obra ?? "-"}</span>
                  </div>

                  <div className="grid2">
                    <div className="cardLine">
                      <span className="label">Pavimento</span>
                      <span className="value">{v.pavimento ?? "-"}</span>
                    </div>
                    <div className="cardLine">
                      <span className="label">Apartamento</span>
                      <span className="value">{v.apartamento ?? "-"}</span>
                    </div>
                  </div>

                  <div className="cardLine">
                    <span className="label">Local</span>
                    <span className="value">{v.local ?? "-"}</span>
                  </div>

                  <div className="cardLine">
                    <span className="label">Mão de obra</span>
                    <span className="value">{v.mao_obra ?? "-"}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* FAB */}
          <button className="fab" onClick={abrirNovo} aria-label="Nova verificação">
            +
          </button>
        </div>
      )}

      {/* FORM (MODAL FULL SCREEN) */}
      {showForm && (
        <div className="modalBackdrop">
          <div className="modal">
            <div className="modalHeader">
              <h2 className="modalTitle">
                {editId ? "Editar Verificação" : "Nova Verificação"}
              </h2>
              <button className="iconBtn" onClick={fecharForm} aria-label="Fechar">
                ✕
              </button>
            </div>

            {erro && <div className="error">{erro}</div>}

            <div className="formGrid">
              <div className="field">
                <label>Obra</label>
                <input
                  value={form.obra}
                  onChange={(e) => setForm({ ...form, obra: e.target.value })}
                />
              </div>

              <div className="field">
                <label>Pavimento</label>
                <input
                  value={form.pavimento}
                  onChange={(e) => setForm({ ...form, pavimento: e.target.value })}
                />
              </div>

              <div className="field">
                <label>Apartamento</label>
                <input
                  value={form.apartamento}
                  onChange={(e) => setForm({ ...form, apartamento: e.target.value })}
                />
              </div>

              <div className="field">
                <label>Local do serviço</label>
                <input
                  value={form.local}
                  onChange={(e) => setForm({ ...form, local: e.target.value })}
                />
              </div>

              <div className="field">
                <label>Mão de obra</label>
                <input
                  value={form.mao_obra}
                  onChange={(e) => setForm({ ...form, mao_obra: e.target.value })}
                />
              </div>

              <div className="field">
                <label>Serviço</label>
                <select
                  value={form.servico}
                  onChange={(e) => setForm({ ...form, servico: e.target.value })}
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
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {STATUS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="actions">
              <button className="primary" onClick={salvar} disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar"}
              </button>

              <button className="secondary" onClick={fecharForm} disabled={salvando}>
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}