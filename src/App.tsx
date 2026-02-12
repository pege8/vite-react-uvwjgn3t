import React, { useEffect, useMemo, useState } from "react";
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

const STATUS_OPCOES = ["Todos", "Pendente", "Em andamento", "Concluída"] as const;
type StatusFiltro = (typeof STATUS_OPCOES)[number];

const OBRAS = ["Accueillant", "Nature"] as const;

type Verificacao = {
  id: string;
  created_at: string;
  obra: string | null;
  pavimento: string | null;
  apartamento: string | null;
  local_do_servico: string | null;
  mao_de_obra: string | null;
  servico: string | null;
  status: string | null;
  observacoes: string | null;
};

type FormState = {
  id?: string;
  obra: string;
  pavimento: string;
  apartamento: string;
  local_do_servico: string;
  mao_de_obra: string;
  servico: string;
  status: string;
  observacoes: string;
};

const emptyForm: FormState = {
  obra: "",
  pavimento: "",
  apartamento: "",
  local_do_servico: "",
  mao_de_obra: "",
  servico: "",
  status: "Pendente",
  observacoes: "",
};

function formatarDataBR(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR");
}

export default function App() {
  const [verificacoes, setVerificacoes] = useState<Verificacao[]>([]);
  const [loading, setLoading] = useState(false);

  // ✅ filtros (agora ficam no menu ⋯)
  const [servicoFiltro, setServicoFiltro] = useState<string>("Todos");
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("Todos");
  const [obraFiltro, setObraFiltro] = useState<string>("Todos");

  // ✅ menu de filtros
  const [menuFiltrosAberto, setMenuFiltrosAberto] = useState(false);

  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const [erroUi, setErroUi] = useState<string>("");

  async function carregar() {
    setErroUi("");
    setLoading(true);
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      setErroUi(error.message);
      return;
    }
    setVerificacoes((data as Verificacao[]) || []);
  }

  useEffect(() => {
    carregar();
  }, []);

  const listaFiltrada = useMemo(() => {
    return verificacoes
      .filter((v) => (servicoFiltro === "Todos" ? true : v.servico === servicoFiltro))
      .filter((v) => (statusFiltro === "Todos" ? true : v.status === statusFiltro))
      .filter((v) => (obraFiltro === "Todos" ? true : v.obra === obraFiltro));
  }, [verificacoes, servicoFiltro, statusFiltro, obraFiltro]);

  // ✅ RESUMO DOS FILTROS
  const resumoFiltros = useMemo(() => {
    const partes: string[] = [];
    if (obraFiltro !== "Todos") partes.push(obraFiltro);
    if (servicoFiltro !== "Todos") partes.push(servicoFiltro);
    if (statusFiltro !== "Todos") partes.push(statusFiltro);
    return partes.join(" • ");
  }, [obraFiltro, servicoFiltro, statusFiltro]);

  function limparFiltrosRapido() {
    setServicoFiltro("Todos");
    setStatusFiltro("Todos");
    setObraFiltro("Todos");
    setMenuFiltrosAberto(false);
  }

  function abrirNova() {
    setErroUi("");
    setModoEdicao(false);
    setForm(emptyForm);
    setModalAberto(true);
    setMenuFiltrosAberto(false);
    document.body.style.overflow = "hidden";
  }

  function abrirEditar(v: Verificacao) {
    setErroUi("");
    setModoEdicao(true);
    setForm({
      id: v.id,
      obra: v.obra ?? "",
      pavimento: v.pavimento ?? "",
      apartamento: v.apartamento ?? "",
      local_do_servico: v.local_do_servico ?? "",
      mao_de_obra: v.mao_de_obra ?? "",
      servico: v.servico ?? "",
      status: v.status ?? "Pendente",
      observacoes: v.observacoes ?? "",
    });
    setModalAberto(true);
    setMenuFiltrosAberto(false);
    document.body.style.overflow = "hidden";
  }

  function fecharModal() {
    setModalAberto(false);
    document.body.style.overflow = "auto";
  }

  function validarAntesDeSalvar(): string | null {
    if (!form.obra.trim()) return "Preencha a Obra.";
    if (!form.pavimento.trim()) return "Preencha o Pavimento.";
    if (!form.apartamento.trim()) return "Preencha o Apartamento.";
    if (!form.local_do_servico.trim()) return "Preencha o Local do serviço.";
    if (!form.mao_de_obra.trim()) return "Preencha a Mão de obra.";
    if (!form.servico.trim()) return "Selecione o Serviço.";
    if (!form.status.trim()) return "Selecione o Status.";
    return null;
  }

  async function salvar() {
    setErroUi("");

    const erroValidacao = validarAntesDeSalvar();
    if (erroValidacao) {
      setErroUi(erroValidacao);
      return;
    }

    setLoading(true);

    const payload = {
      obra: form.obra.trim(),
      pavimento: form.pavimento.trim(),
      apartamento: form.apartamento.trim(),
      local_do_servico: form.local_do_servico.trim(),
      mao_de_obra: form.mao_de_obra.trim(),
      servico: form.servico.trim(),
      status: form.status.trim(),
      observacoes: form.observacoes.trim() || null,
    };

    let error: any = null;

    if (modoEdicao && form.id) {
      const res = await supabase.from(TABLE_NAME).update(payload).eq("id", form.id);
      error = res.error;
    } else {
      const res = await supabase.from(TABLE_NAME).insert([payload]);
      error = res.error;
    }

    setLoading(false);

    if (error) {
      setErroUi(error.message || "Erro ao salvar.");
      return;
    }

    fecharModal();
    setForm(emptyForm);
    await carregar();
  }

  function limparFiltros() {
    setServicoFiltro("Todos");
    setStatusFiltro("Todos");
    setObraFiltro("Todos");
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Topo enxuto: título + ⋯ + */}
        <div style={styles.headerTop}>
          <div>
            <div style={styles.h1}>Verificações</div>
            <div style={styles.h2}>{listaFiltrada.length} resultado(s)</div>

            {/* ✅ RESUMINHO */}
            {!!resumoFiltros && (
              <div style={styles.resumoContainer}>
                <span>{resumoFiltros}</span>
                <button
                  onClick={limparFiltrosRapido}
                  style={styles.resumoClose}
                  title="Limpar filtros"
                  type="button"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          <div style={styles.headerRight}>
            <button style={styles.iconBtn} onClick={carregar} title="Atualizar" type="button">
              ↻
            </button>

            <div style={{ position: "relative" }}>
              <button
                style={styles.iconBtn}
                onClick={() => setMenuFiltrosAberto((v) => !v)}
                title="Filtros"
                type="button"
              >
                ⋯
              </button>

              {menuFiltrosAberto && (
                <>
                  {/* overlay pra fechar ao tocar fora */}
                  <div style={styles.menuOverlay} onClick={() => setMenuFiltrosAberto(false)} />

                  <div style={styles.menu}>
                    <div style={styles.menuTitle}>Filtros</div>

                    <div style={styles.menuField}>
                      <div style={styles.menuLabel}>Obra</div>
                      <select
                        value={obraFiltro}
                        onChange={(e) => setObraFiltro(e.target.value)}
                        style={styles.menuSelect}
                      >
                        <option value="Todos">Todos</option>
                        {OBRAS.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={styles.menuField}>
                      <div style={styles.menuLabel}>Serviço</div>
                      <select
                        value={servicoFiltro}
                        onChange={(e) => setServicoFiltro(e.target.value)}
                        style={styles.menuSelect}
                      >
                        <option value="Todos">Todos</option>
                        {SERVICOS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={styles.menuField}>
                      <div style={styles.menuLabel}>Status</div>
                      <select
                        value={statusFiltro}
                        onChange={(e) => setStatusFiltro(e.target.value as StatusFiltro)}
                        style={styles.menuSelect}
                      >
                        {STATUS_OPCOES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={styles.menuButtons}>
                      <button style={styles.menuBtnGhost} onClick={limparFiltros} type="button">
                        Limpar
                      </button>
                      <button
                        style={styles.menuBtnPrimary}
                        onClick={() => setMenuFiltrosAberto(false)}
                        type="button"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button style={styles.fabSmall} onClick={abrirNova} title="Nova verificação" type="button">
              +
            </button>
          </div>
        </div>

        {/* LISTA */}
        <div style={{ marginTop: 10 }}>
          {loading && <div style={styles.info}>Carregando...</div>}

          {!loading && !!erroUi && <div style={styles.errorBox}>{erroUi}</div>}

          {!loading && !erroUi && listaFiltrada.length === 0 && (
            <div style={styles.info}>Nenhuma verificação ainda.</div>
          )}

          {!loading &&
            !erroUi &&
            listaFiltrada.map((v) => (
              <div key={v.id} style={styles.card} onClick={() => abrirEditar(v)}>
                <div style={styles.cardTop}>
                  <div style={styles.cardTitle}>{(v.obra || "") + " | " + (v.servico || "")}</div>
                  <div style={styles.badge}>{v.status || "Pendente"}</div>
                </div>

                <div style={styles.cardSub}>
                  {`Pavimento ${v.pavimento || "-"} • Apto ${v.apartamento || "-"} • ${v.local_do_servico || "-"}`}
                </div>

                <div style={styles.cardLine}>
                  <span style={styles.smallMuted}>{formatarDataBR(v.created_at)}</span>
                  <span style={styles.smallMuted}>{v.mao_de_obra || ""}</span>
                </div>

                {!!v.observacoes && <div style={styles.obs}>{v.observacoes}</div>}
              </div>
            ))}
        </div>
      </div>

      {/* MODAL */}
      {modalAberto && (
        <div style={styles.modalOverlay2} onClick={fecharModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>{modoEdicao ? "Editar Verificação" : "Nova Verificação"}</div>
              <button style={styles.closeBtn} onClick={fecharModal} type="button">
                ✕
              </button>
            </div>

            {!!erroUi && <div style={styles.errorBox}>{erroUi}</div>}

            <div style={styles.modalBody}>
              {/* OBRA (select) */}
              <div style={styles.field}>
                <div style={styles.label}>Obra</div>
                <select
                  value={form.obra}
                  onChange={(e) => setForm({ ...form, obra: e.target.value })}
                  style={styles.select}
                >
                  <option value="">Selecione</option>
                  {OBRAS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.grid2}>
                <div style={styles.field}>
                  <div style={styles.label}>Pavimento</div>
                  <input
                    value={form.pavimento}
                    onChange={(e) => setForm({ ...form, pavimento: e.target.value })}
                    style={styles.input}
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Apartamento</div>
                  <input
                    value={form.apartamento}
                    onChange={(e) => setForm({ ...form, apartamento: e.target.value })}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.field}>
                <div style={styles.label}>Local do serviço</div>
                <input
                  value={form.local_do_servico}
                  onChange={(e) => setForm({ ...form, local_do_servico: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div style={styles.field}>
                <div style={styles.label}>Mão de obra</div>
                <input
                  value={form.mao_de_obra}
                  onChange={(e) => setForm({ ...form, mao_de_obra: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div style={styles.grid2}>
                <div style={styles.field}>
                  <div style={styles.label}>Serviço</div>
                  <select
                    value={form.servico}
                    onChange={(e) => setForm({ ...form, servico: e.target.value })}
                    style={styles.select}
                  >
                    <option value="">Selecione</option>
                    {SERVICOS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Status</div>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    style={styles.select}
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Em andamento">Em andamento</option>
                    <option value="Concluída">Concluída</option>
                  </select>
                </div>
              </div>

              <div style={styles.field}>
                <div style={styles.label}>Observações</div>
                <textarea
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  style={styles.textarea}
                  rows={4}
                />
              </div>

              <button style={styles.primaryBtn} onClick={salvar} disabled={loading} type="button">
                {loading ? "Salvando..." : "Salvar"}
              </button>

              <button style={styles.secondaryBtn} onClick={fecharModal} type="button">
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f6f7fb",
    padding: 14,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial',
  },
  container: {
    maxWidth: 520,
    margin: "0 auto",
    position: "relative",
  },

  headerTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  h1: { fontSize: 22, fontWeight: 900, color: "#0f172a" },
  h2: { marginTop: 2, fontSize: 13, fontWeight: 700, color: "#64748b" },

  // ✅ ESTILOS DO RESUMO
  resumoContainer: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: 800,
    color: "#0f172a",
    background: "white",
    border: "1px solid #e5e7eb",
    padding: "6px 10px",
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
  resumoClose: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 900,
    color: "#64748b",
    padding: 0,
    lineHeight: "14px",
  },

  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "white",
    cursor: "pointer",
    fontSize: 18,
    fontWeight: 900,
    color: "#0f172a",
    display: "grid",
    placeItems: "center",
  },
  fabSmall: {
    width: 44,
    height: 44,
    borderRadius: 14,
    border: "none",
    background: "#2563eb",
    color: "white",
    cursor: "pointer",
    fontSize: 26,
    fontWeight: 900,
    display: "grid",
    placeItems: "center",
    boxShadow: "0 10px 22px rgba(37, 99, 235, 0.30)",
  },

  menuOverlay: {
    position: "fixed",
    inset: 0,
    background: "transparent",
    zIndex: 9998,
  },
  menu: {
    position: "absolute",
    top: 46,
    right: 0,
    width: 260,
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 12,
    zIndex: 9999,
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.18)",
  },
  menuTitle: { fontWeight: 900, fontSize: 16, marginBottom: 10, color: "#0f172a" },
  menuField: { marginBottom: 10 },
  menuLabel: { fontWeight: 800, fontSize: 12, color: "#64748b", marginBottom: 6 },
  menuSelect: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "white",
    fontSize: 14,
    fontWeight: 700,
    outline: "none",
  },
  menuButtons: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6 },
  menuBtnGhost: {
    border: "1px solid #e5e7eb",
    background: "white",
    borderRadius: 12,
    padding: "10px 12px",
    fontWeight: 900,
    cursor: "pointer",
  },
  menuBtnPrimary: {
    border: "none",
    background: "#16a34a",
    color: "white",
    borderRadius: 12,
    padding: "10px 12px",
    fontWeight: 900,
    cursor: "pointer",
  },

  info: { padding: 12, color: "#475569" },

  card: {
    background: "white",
    borderRadius: 18,
    border: "1px solid #e5e7eb",
    padding: 16,
    marginBottom: 12,
    cursor: "pointer",
    boxShadow: "0 8px 22px rgba(15, 23, 42, 0.06)",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: "#0f172a",
    lineHeight: 1.25,
    flex: 1,
  },
  badge: {
    background: "#fdecc8",
    color: "#a16207",
    fontWeight: 800,
    borderRadius: 999,
    padding: "6px 12px",
    fontSize: 13,
    border: "1px solid #f7dba3",
    whiteSpace: "nowrap",
  },
  cardSub: { marginTop: 8, color: "#475569", fontWeight: 600 },
  cardLine: {
    marginTop: 10,
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
  },
  smallMuted: { color: "#64748b", fontWeight: 600, fontSize: 13 },
  obs: {
    marginTop: 10,
    color: "#334155",
    fontWeight: 600,
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    padding: 10,
    borderRadius: 12,
    whiteSpace: "pre-wrap",
  },

  modalOverlay2: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.42)",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: 14,
    zIndex: 9999,
    overflowY: "auto",
  },
  modal: {
    width: "100%",
    maxWidth: 520,
    background: "white",
    borderRadius: 20,
    border: "1px solid #e5e7eb",
    marginTop: 18,
    boxShadow: "0 22px 50px rgba(15, 23, 42, 0.25)",
    overflow: "hidden",
  },
  modalHeader: {
    padding: 16,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #e5e7eb",
  },
  modalTitle: { fontSize: 22, fontWeight: 900, color: "#0f172a" },
  closeBtn: {
    border: "none",
    background: "transparent",
    fontSize: 22,
    cursor: "pointer",
    color: "#0f172a",
    fontWeight: 900,
  },
  errorBox: {
    margin: 16,
    padding: 12,
    borderRadius: 14,
    background: "#fee2e2",
    border: "1px solid #fecaca",
    color: "#991b1b",
    fontWeight: 700,
  },
  modalBody: { padding: 16, maxHeight: "78vh", overflowY: "auto" },

  field: { marginBottom: 14 },
  label: { fontWeight: 800, color: "#0f172a", marginBottom: 8 },

  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },

  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    outline: "none",
    fontSize: 16,
    background: "white",
  },
  select: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    outline: "none",
    fontSize: 16,
    background: "white",
  },
  textarea: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    outline: "none",
    fontSize: 16,
    background: "white",
    resize: "vertical",
  },

  primaryBtn: {
    width: "100%",
    padding: 14,
    borderRadius: 14,
    border: "none",
    background: "#2563eb",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: 16,
    marginTop: 6,
  },
  secondaryBtn: {
    width: "100%",
    padding: 14,
    borderRadius: 14,
    border: "1px solid #e5e7eb",
    background: "white",
    color: "#0f172a",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: 16,
    marginTop: 10,
  },
};