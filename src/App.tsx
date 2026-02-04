import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

/* ========= SUPABASE ========= */
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

type Status = "Pendente" | "OK" | "Red";

type Registro = {
  id: number;
  obra: string;
  pavimento: string;
  apartamento: string;
  local: string;
  mao_de_obra: string;
  status: Status;
  foto_url?: string | null;
};

export default function App() {
  const [obra, setObra] = useState("");
  const [pavimento, setPavimento] = useState("");
  const [apartamento, setApartamento] = useState("");
  const [local, setLocal] = useState("");
  const [maoDeObra, setMaoDeObra] = useState("");
  const [status, setStatus] = useState<Status>("Pendente");

  const [foto, setFoto] = useState<File | null>(null);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(false);

  const previewUrl = useMemo(() => {
    if (!foto) return "";
    return URL.createObjectURL(foto);
  }, [foto]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function carregar() {
    const { data } = await supabase
      .from("registros")
      .select("*")
      .order("id", { ascending: false });

    setRegistros((data as Registro[]) || []);
  }

  useEffect(() => {
    carregar();
  }, []);

  function badgeClass(s: Status) {
    if (s === "Pendente") return "badge pendente";
    if (s === "OK") return "badge ok";
    return "badge red";
  }

  async function uploadFotoSeTiver(): Promise<string | null> {
    if (!foto) return null;

    // nome único
    const ext = foto.name.split(".").pop() || "jpg";
    const filePath = `registros/${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from("verificacoes")
      .upload(filePath, foto, { upsert: false });

    if (error) {
      alert("Erro ao enviar foto: " + error.message);
      return null;
    }

    const { data } = supabase.storage.from("verificacoes").getPublicUrl(filePath);
    return data.publicUrl || null;
  }

  async function salvar() {
    if (!obra || !pavimento || !apartamento || !local || !maoDeObra) {
      alert("Preencha todos os campos.");
      return;
    }

    setLoading(true);

    const foto_url = await uploadFotoSeTiver();

    const { error } = await supabase.from("registros").insert([
      {
        obra,
        pavimento,
        apartamento,
        local,
        mao_de_obra: maoDeObra,
        status,
        foto_url
      }
    ]);

    setLoading(false);

    if (error) {
      alert("Erro ao salvar: " + error.message);
      return;
    }

    setObra("");
    setPavimento("");
    setApartamento("");
    setLocal("");
    setMaoDeObra("");
    setStatus("Pendente");
    setFoto(null);

    carregar();
  }

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <div className="title">Verificação</div>
          <div className="subtitle">Serviços</div>
        </div>
        <div className="icon">🏆</div>
      </header>

      <div className="card formcard">
        <div className="cardtitle">Nova verificação</div>

        <label className="label">Obra</label>
        <input className="input" value={obra} onChange={e => setObra(e.target.value)} />

        <label className="label">Pavimento</label>
        <input className="input" value={pavimento} onChange={e => setPavimento(e.target.value)} />

        <label className="label">Apartamento</label>
        <input className="input" value={apartamento} onChange={e => setApartamento(e.target.value)} />

        <label className="label">Local do serviço</label>
        <input className="input" value={local} onChange={e => setLocal(e.target.value)} />

        <label className="label">Mão de obra</label>
        <input className="input" value={maoDeObra} onChange={e => setMaoDeObra(e.target.value)} />

        <label className="label">Status</label>
        <select className="select" value={status} onChange={e => setStatus(e.target.value as Status)}>
          <option value="Pendente">Pendente</option>
          <option value="OK">OK</option>
          <option value="Red">Red</option>
        </select>

        <label className="label">Foto</label>
        <input
          className="file"
          type="file"
          accept="image/*"
          onChange={e => setFoto(e.target.files?.[0] || null)}
        />

        {previewUrl ? (
          <div className="previewWrap">
            <img className="preview" src={previewUrl} alt="Prévia" />
          </div>
        ) : null}

        <button className="btn" onClick={salvar} disabled={loading}>
          {loading ? "Salvando..." : "Salvar"}
        </button>
      </div>

      <div className="list">
        {registros.map(r => (
          <div key={r.id} className="card">
            <div className="cardTop">
              <div className="small">PEGE</div>
              <span className={badgeClass(r.status)}>{r.status}</span>
            </div>

            <div className="big">{r.obra}</div>

            <div className="meta">
              <div><b>Pavimento:</b> {r.pavimento}</div>
              <div><b>Apartamento:</b> {r.apartamento}</div>
              <div><b>Local:</b> {r.local}</div>
              <div><b>Mão de obra:</b> {r.mao_de_obra}</div>
            </div>

            {r.foto_url ? (
              <div className="photoWrap">
                <img className="photo" src={r.foto_url} alt="Foto do registro" />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <style>{`
        * { 
          box-sizing: border-box; 
          font-family: Arial, sans-serif;
        }
        
        body { 
          margin: 0; 
          font-family: Arial, sans-serif;
        }

        .page{
          max-width: 420px;
          margin: 0 auto;
          padding: 18px;
          font-family: Arial, sans-serif;
          background: #f6f7fb;
          min-height: 100vh;
        }

        .topbar{
          display:flex;
          justify-content: space-between;
          align-items:center;
          padding: 14px 14px;
          background: #ffffff;
          border-radius: 14px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.06);
          margin-bottom: 14px;
        }

        .title{
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.5px;
          color: #1f2937;
        }
        .subtitle{
          margin-top: 2px;
          font-size: 13px;
          color: #6b7280;
          font-weight: 600;
        }
        .icon{
          font-size: 22px;
          opacity: 0.9;
        }

        .card{
          background:#fff;
          border-radius: 16px;
          padding: 14px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.06);
          margin-bottom: 12px;
        }

        .formcard .cardtitle{
          font-size: 18px;
          font-weight: 800;
          margin-bottom: 10px;
          color:#111827;
        }

        .label{
          display:block;
          font-size: 12px;
          font-weight: 800;
          color: #374151;
          margin: 10px 0 6px;
        }

        .input, .select, .file{
          width:100%;
          padding: 12px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          outline: none;
          background: #fff;
        }

        /* arruma o select pra não ficar “feio/zoado” */
        .select{
          appearance: none;
          background-image: linear-gradient(45deg, transparent 50%, #6b7280 50%),
                            linear-gradient(135deg, #6b7280 50%, transparent 50%);
          background-position: calc(100% - 18px) calc(50% - 2px),
                              calc(100% - 12px) calc(50% - 2px);
          background-size: 6px 6px, 6px 6px;
          background-repeat: no-repeat;
        }

        .btn{
          width:100%;
          margin-top: 14px;
          padding: 12px;
          border: none;
          border-radius: 12px;
          background: #2563eb;
          color: #fff;
          font-weight: 800;
          font-size: 14px;
        }
        .btn:disabled{
          opacity: 0.7;
        }

        .previewWrap{
          margin-top: 10px;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #e5e7eb;
        }
        .preview{
          width: 100%;
          display:block;
        }

        .cardTop{
          display:flex;
          justify-content: space-between;
          align-items:center;
          margin-bottom: 8px;
        }

        .small{
          font-size: 12px;
          color:#6b7280;
          font-weight: 800;
          letter-spacing: 1px;
        }

        .badge{
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
        }
        .pendente{ background:#fff3cd; color:#b45309; }
        .ok{ background:#dcfce7; color:#15803d; }
        .red{ background:#fee2e2; color:#b91c1c; }

        .big{
          font-size: 16px;
          font-weight: 900;
          color:#111827;
          margin-bottom: 8px;
        }

        .meta{
          font-size: 13px;
          color:#374151;
          line-height: 1.4;
        }

        .photoWrap{
          margin-top: 10px;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #e5e7eb;
        }
        .photo{
          width: 100%;
          display:block;
        }
      `}</style>
    </div>
  );
}