"use client";

import { useState, useEffect, useRef } from "react";

const SM = 1518.0;

function fmt(v: number) {
  return "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtInt(v: number) {
  return Math.floor(v).toLocaleString("pt-BR");
}

type Dado = {
  ano: number;
  patrimonio: number;
  investido: number;
  dividendosAno: number;
  rendaMensal: number;
  cotas: number;
  precoCota: number;
};

export default function CalculadoraFIIClient() {
  const [cotasAtuais, setCotasAtuais] = useState(500);
  const [precoAtual, setPrecoAtual] = useState(115);
  const [dyMensal, setDyMensal] = useState(0.85);
  const [aporteMensal, setAporteMensal] = useState(800);
  const [anosProj, setAnosProj] = useState(10);
  const [valorizacao, setValorizacao] = useState(0);

  const [showResults, setShowResults] = useState(false);
  const [hoje, setHoje] = useState({ pat: 0, renda: 0, anual: 0 });
  const [fut, setFut] = useState({ pat: 0, renda: 0, anual: 0, totalInv: 0, cotas: 0, precoFinal: 0 });
  const [dados, setDados] = useState<Dado[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const resultadosRef = useRef<HTMLDivElement>(null);

  function calcular() {
    const dyM = dyMensal / 100;
    const valM = valorizacao / 12 / 100;
    const meses = anosProj * 12;

    const patHoje = cotasAtuais * precoAtual;
    const rendaHoje = patHoje * dyM;

    setHoje({ pat: patHoje, renda: rendaHoje, anual: rendaHoje * 12 });

    let cotas = cotasAtuais;
    let totalInv = patHoje;
    let precoCota = precoAtual;
    const dadosArr: Dado[] = [];

    for (let m = 1; m <= meses; m++) {
      cotas += aporteMensal / precoCota;
      totalInv += aporteMensal;

      const divM = cotas * precoCota * dyM;
      cotas += divM / precoCota;

      precoCota *= 1 + valM;

      if (m % 12 === 0) {
        const patrimonio = cotas * precoCota;
        dadosArr.push({
          ano: m / 12,
          patrimonio,
          investido: totalInv,
          dividendosAno: divM * 12,
          rendaMensal: cotas * precoCota * dyM,
          cotas: cotas,
          precoCota: precoCota,
        });
      }
    }

    // caso anos =0? already handled
    const patF = cotas * precoCota;
    const rendaF = cotas * precoCota * dyM;

    setFut({
      pat: patF,
      renda: rendaF,
      anual: rendaF * 12,
      totalInv,
      cotas,
      precoFinal: precoCota,
    });
    setDados(dadosArr);
    setShowResults(true);

    // scroll after render
    setTimeout(() => {
      resultadosRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  useEffect(() => {
    const t = setTimeout(() => calcular(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build SVG after dados changes
  useEffect(() => {
    if (!showResults || dados.length === 0 || !svgRef.current) return;
    const svg = svgRef.current;
    const W = 860, H = 300;
    const pad = { t: 30, r: 30, b: 45, l: 90 };
    const gw = W - pad.l - pad.r, gh = H - pad.t - pad.b;
    const maxVal = Math.max(...dados.map((d) => d.patrimonio));
    const sx = (i: number) => pad.l + (i / (dados.length - 1 || 1)) * gw;
    const sy = (v: number) => pad.t + gh - (v / (maxVal || 1)) * gh;

    let pathP = `M ${sx(0)} ${sy(dados[0].patrimonio)}`;
    let areaP = `M ${sx(0)} ${H - pad.b} L ${sx(0)} ${sy(dados[0].patrimonio)}`;
    let pathI = `M ${sx(0)} ${sy(dados[0].investido)}`;
    for (let i = 1; i < dados.length; i++) {
      pathP += ` L ${sx(i)} ${sy(dados[i].patrimonio)}`;
      areaP += ` L ${sx(i)} ${sy(dados[i].patrimonio)}`;
      pathI += ` L ${sx(i)} ${sy(dados[i].investido)}`;
    }
    areaP += ` L ${sx(dados.length - 1)} ${H - pad.b} Z`;

    let s = "";
    s += `<defs>
      <linearGradient id="gPat" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#667eea" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#764ba2" stop-opacity="0"/>
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#667eea" flood-opacity="0.3"/>
      </filter>
    </defs>`;

    for (let i = 0; i <= 5; i++) {
      const y = pad.t + (gh / 5) * i;
      const val = maxVal * (1 - i / 5);
      const label = val >= 1_000_000 ? (val / 1_000_000).toFixed(1) + "M" : val >= 1000 ? (val / 1000).toFixed(0) + "k" : val.toFixed(0);
      s += `<line x1="${pad.l}" y1="${y}" x2="${W - pad.r}" y2="${y}" stroke="rgba(148,163,184,0.08)" stroke-width="1"/>`;
      s += `<text x="${pad.l - 10}" y="${y + 4}" text-anchor="end" font-size="11" fill="#64748b">${label}</text>`;
    }

    const step = Math.max(1, Math.floor(dados.length / 8));
    dados.forEach((d, i) => {
      if (i % step === 0 || i === dados.length - 1) {
        s += `<text x="${sx(i)}" y="${H - 14}" text-anchor="middle" font-size="11" fill="#64748b">${d.ano}a</text>`;
      }
    });

    s += `<path d="${pathI}" fill="none" stroke="#64748b" stroke-width="1.5" stroke-dasharray="6,4"/>`;
    s += `<path d="${areaP}" fill="url(#gPat)"/>`;
    s += `<path d="${pathP}" fill="none" stroke="#818cf8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" filter="url(#shadow)"/>`;

    dados.forEach((d, i) => {
      s += `<circle cx="${sx(i)}" cy="${sy(d.patrimonio)}" r="4" fill="#c7d2fe" stroke="#667eea" stroke-width="2"/>`;
    });

    const lx = W - 200, ly = pad.t + 5;
    s += `<rect x="${lx}" y="${ly}" width="175" height="58" rx="8" fill="rgba(15,23,42,0.85)" stroke="rgba(148,163,184,0.15)"/>`;
    s += `<line x1="${lx + 12}" y1="${ly + 20}" x2="${lx + 36}" y2="${ly + 20}" stroke="#818cf8" stroke-width="3" stroke-linecap="round"/>`;
    s += `<text x="${lx + 44}" y="${ly + 24}" font-size="11" fill="#e2e8f0">Patrimônio</text>`;
    s += `<line x1="${lx + 12}" y1="${ly + 42}" x2="${lx + 36}" y2="${ly + 42}" stroke="#64748b" stroke-width="1.5" stroke-dasharray="5,4"/>`;
    s += `<text x="${lx + 44}" y="${ly + 46}" font-size="11" fill="#94a3b8">Total Investido</text>`;

    svg.innerHTML = s;
  }, [dados, showResults]);

  return (
    <div className="fii-wrap">
      <style>{`
        .fii-wrap {
          --bg: #0f172a;
          --card: rgba(30,41,59,0.7);
          --border: rgba(148,163,184,0.15);
          --text: #e2e8f0;
          --muted: #94a3b8;
          --accent: #667eea;
          --accent2: #764ba2;
        }
        .fii-wrap * { box-sizing: border-box; }
        .fii-page {
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          background: linear-gradient(160deg, #0f172a 0%, #1e1b4b 40%, #0f172a 100%);
          color: #e2e8f0;
          min-height: 100vh;
          padding: 24px 16px;
        }
        .fii-container { max-width: 900px; margin: 0 auto; }
        .fii-header { text-align: center; margin-bottom: 28px; }
        .fii-header h1 {
          font-size: 1.9rem;
          font-weight: 800;
          background: linear-gradient(90deg, #667eea, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0;
        }
        .fii-header p { color: #94a3b8; font-size: 0.92rem; margin-top: 4px; }
        .fii-card {
          background: rgba(30,41,59,0.7);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(148,163,184,0.15);
          border-radius: 18px;
          padding: 22px;
          margin-bottom: 18px;
        }
        .fii-section-label {
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.2px;
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .fii-section-label.blue { color: #93c5fd; }
        .fii-section-label.green { color: #6ee7b7; }
        .fii-section-label.purple { color: #c4b5fd; }
        .fii-form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 14px;
        }
        .fii-field label {
          display: block;
          font-size: 0.78rem;
          color: #94a3b8;
          font-weight: 600;
          margin-bottom: 6px;
        }
        .fii-field input {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid rgba(148,163,184,0.15);
          border-radius: 10px;
          background: rgba(15,23,42,0.5);
          color: #fff;
          font-size: 1rem;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .fii-field input:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102,126,234,0.15);
        }
        .fii-field input::placeholder { color: #475569; }
        .fii-btn {
          width: 100%;
          padding: 16px;
          margin-top: 18px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: #fff;
          border: none;
          border-radius: 12px;
          font-size: 1.08rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.2s;
          letter-spacing: 0.3px;
        }
        .fii-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(102,126,234,0.35); }
        .fii-btn:active { transform: translateY(0); }
        .fii-info { font-size: 0.82rem; color: #94a3b8; margin-top: 12px; line-height: 1.5; }
        .fii-result-card { border-radius: 16px; padding: 20px; margin-bottom: 14px; }
        .fii-result-card.today {
          background: linear-gradient(135deg, rgba(16,185,129,0.1), rgba(6,95,70,0.15));
          border: 1px solid rgba(16,185,129,0.25);
        }
        .fii-result-card.future {
          background: linear-gradient(135deg, rgba(59,130,246,0.1), rgba(30,64,175,0.15));
          border: 1px solid rgba(59,130,246,0.25);
        }
        .fii-result-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 12px;
        }
        .fii-result-item { text-align: center; }
        .fii-result-item .lbl {
          font-size: 0.72rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }
        .fii-result-item .val { font-size: 1.45rem; font-weight: 800; }
        .fii-result-card.today .lbl { color: #34d399; }
        .fii-result-card.today .val { color: #6ee7b7; }
        .fii-result-card.future .lbl { color: #93c5fd; }
        .fii-result-card.future .val { color: #bfdbfe; }
        .fii-compare { font-size: 0.85rem; margin-top: 10px; text-align: center; opacity: 0.85; }
        .fii-summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 10px;
          margin-bottom: 14px;
        }
        .fii-summary-box {
          background: rgba(15,23,42,0.5);
          border: 1px solid rgba(148,163,184,0.15);
          border-radius: 12px;
          padding: 14px;
          text-align: center;
        }
        .fii-summary-box .lbl {
          font-size: 0.72rem;
          color: #94a3b8;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }
        .fii-summary-box .val { font-size: 1.15rem; font-weight: 700; }
        .fii-table-wrap {
          max-height: 380px;
          overflow-y: auto;
          border-radius: 12px;
          border: 1px solid rgba(148,163,184,0.15);
        }
        .fii-table-wrap table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        .fii-table-wrap th {
          background: rgba(102,126,234,0.12);
          color: #a5b4fc;
          padding: 10px 8px;
          text-align: right;
          font-weight: 600;
          position: sticky;
          top: 0;
          backdrop-filter: blur(4px);
        }
        .fii-table-wrap th:first-child { text-align: left; padding-left: 14px; }
        .fii-table-wrap td {
          padding: 9px 8px;
          text-align: right;
          border-bottom: 1px solid rgba(148,163,184,0.06);
        }
        .fii-table-wrap td:first-child { text-align: left; padding-left: 14px; font-weight: 700; }
        .fii-table-wrap tr:nth-child(even) { background: rgba(255,255,255,0.02); }
        .fii-table-wrap tr:hover { background: rgba(102,126,234,0.06); }
        .td-pat { color: #bfdbfe; font-weight: 700; }
        .td-div { color: #34d399; }
        .td-renda { color: #fbbf24; }
        .td-cotas { color: #c4b5fd; }
        #chartBox {
          width: 100%;
          height: 300px;
          background: rgba(15,23,42,0.4);
          border-radius: 14px;
          border: 1px solid rgba(148,163,184,0.15);
          position: relative;
          overflow: hidden;
        }
        #chartSVG { width: 100%; height: 100%; display: block; }
        @media (max-width: 600px) {
          .fii-header h1 { font-size: 1.4rem; }
          .fii-result-item .val { font-size: 1.15rem; }
          .fii-form-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="fii-page">
        <div className="fii-container">
          <header className="fii-header">
            <h1>🏢 Calculadora Completa de FIIs</h1>
            <p>Portfólio atual + Projeção futura com aportes e juros compostos</p>
          </header>

          <div className="fii-card">
            <div className="fii-section-label blue">📊 Seu Portfólio Atual</div>
            <div className="fii-form-grid">
              <div className="fii-field">
                <label>Quantidade de Cotas</label>
                <input
                  type="number"
                  value={cotasAtuais}
                  min={0}
                  onChange={(e) => setCotasAtuais(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="fii-field">
                <label>Preço Atual da Cota (R$)</label>
                <input
                  type="number"
                  value={precoAtual}
                  step="0.01"
                  min={0.01}
                  onChange={(e) => setPrecoAtual(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="fii-field">
                <label>Dividend Yield Mensal (%)</label>
                <input
                  type="number"
                  value={dyMensal}
                  step="0.01"
                  min={0}
                  onChange={(e) => setDyMensal(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          <div className="fii-card">
            <div className="fii-section-label green">🚀 Projeção Futura</div>
            <div className="fii-form-grid">
              <div className="fii-field">
                <label>Aporte Mensal (R$)</label>
                <input
                  type="number"
                  value={aporteMensal}
                  min={0}
                  step={50}
                  onChange={(e) => setAporteMensal(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="fii-field">
                <label>Período (anos)</label>
                <input
                  type="number"
                  value={anosProj}
                  min={1}
                  max={50}
                  onChange={(e) => setAnosProj(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="fii-field">
                <label>Valorização Anual da Cota (%)</label>
                <input
                  type="number"
                  value={valorizacao}
                  step="0.1"
                  onChange={(e) => setValorizacao(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
            <button className="fii-btn" onClick={calcular}>
              📈 Calcular Portfólio + Projeção
            </button>
            <p className="fii-info">
              💡 Os dividendos são automaticamente reinvestidos (compra de novas cotas). A valorização da cota é
              aplicada mensalmente de forma composta.
            </p>
          </div>

          {showResults && (
            <div ref={resultadosRef}>
              <div className="fii-result-card today">
                <div className="fii-section-label green">💰 Sua Situação HOJE</div>
                <div className="fii-result-grid">
                  <div className="fii-result-item">
                    <div className="lbl">Patrimônio</div>
                    <div className="val">{fmt(hoje.pat)}</div>
                  </div>
                  <div className="fii-result-item">
                    <div className="lbl">Renda Mensal</div>
                    <div className="val">{fmt(hoje.renda)}</div>
                  </div>
                  <div className="fii-result-item">
                    <div className="lbl">Renda Anual</div>
                    <div className="val">{fmt(hoje.anual)}</div>
                  </div>
                </div>
                <div className="fii-compare">
                  Sua renda hoje equivale a <strong>{((hoje.renda / SM) * 100).toFixed(1)}%</strong> de um salário
                  mínimo (R$ {SM.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})
                </div>
              </div>

              <div className="fii-result-card future">
                <div className="fii-section-label blue">🚀 Sua Situação no FUTURO</div>
                <div className="fii-result-grid">
                  <div className="fii-result-item">
                    <div className="lbl">Patrimônio Final</div>
                    <div className="val">{fmt(fut.pat)}</div>
                  </div>
                  <div className="fii-result-item">
                    <div className="lbl">Renda Mensal</div>
                    <div className="val">{fmt(fut.renda)}</div>
                  </div>
                  <div className="fii-result-item">
                    <div className="lbl">Renda Anual</div>
                    <div className="val">{fmt(fut.anual)}</div>
                  </div>
                </div>
                <div className="fii-compare">
                  Sua renda futura equivale a <strong>{((fut.renda / SM) * 100).toFixed(1)}%</strong> de um salário
                  mínimo
                </div>
              </div>

              <div className="fii-summary-grid">
                <div className="fii-summary-box">
                  <div className="lbl">Total Investido</div>
                  <div className="val" style={{ color: "#fbbf24" }}>
                    {fmt(fut.totalInv)}
                  </div>
                </div>
                <div className="fii-summary-box">
                  <div className="lbl">Ganho em Juros</div>
                  <div className="val" style={{ color: "#f87171" }}>
                    {fmt(fut.pat - fut.totalInv)}
                  </div>
                </div>
                <div className="fii-summary-box">
                  <div className="lbl">Cotas no Final</div>
                  <div className="val" style={{ color: "#a78bfa" }}>
                    {fmtInt(fut.cotas)}
                  </div>
                </div>
                <div className="fii-summary-box">
                  <div className="lbl">Preço Final Cota</div>
                  <div className="val" style={{ color: "#60a5fa" }}>
                    {fmt(fut.precoFinal)}
                  </div>
                </div>
              </div>

              <div className="fii-card">
                <div className="fii-section-label purple">📊 Evolução do Patrimônio</div>
                <div id="chartBox">
                  <svg ref={svgRef} id="chartSVG" viewBox="0 0 860 300" preserveAspectRatio="xMidYMid meet" />
                </div>
              </div>

              <div className="fii-card">
                <div className="fii-section-label blue">📋 Evolução Detalhada Ano a Ano</div>
                <div className="fii-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Ano</th>
                        <th>Patrimônio</th>
                        <th>Investido</th>
                        <th>Dividendos/Ano</th>
                        <th>Renda Mensal</th>
                        <th>Cotas</th>
                        <th>Preço Cota</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dados.map((d) => (
                        <tr key={d.ano}>
                          <td>{d.ano}º</td>
                          <td className="td-pat">{fmt(d.patrimonio)}</td>
                          <td>{fmt(d.investido)}</td>
                          <td className="td-div">{fmt(d.dividendosAno)}</td>
                          <td className="td-renda">{fmt(d.rendaMensal)}</td>
                          <td className="td-cotas">{fmtInt(d.cotas)}</td>
                          <td>{fmt(d.precoCota)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
