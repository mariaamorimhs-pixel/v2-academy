import { useState } from 'react'
import { salvarGravacao, excluirGravacao } from '../dados.js'
import { tentar, youtubeId, fmtData } from '../comum.jsx'
import { TREINAMENTOS_GRUPO } from '../trilhas.js'

// Cadastro das gravações das turmas ao vivo (só admin). Aparecem para todos os clientes em "Gravados".
const treinoPorId = Object.fromEntries(TREINAMENTOS_GRUPO.map((t) => [t.id, t]))
const vazio = { treinoId: TREINAMENTOS_GRUPO[0]?.id ?? '', titulo: '', descricao: '', video: '', gravadoEm: '' }

export default function Gravacoes({ estado }) {
  const [editando, setEditando] = useState(null) // null = fechado, 'nova' ou o id
  const gravacoes = estado.gravacoes ?? []
  const atual = editando && editando !== 'nova' ? gravacoes.find((g) => g.id === editando) : null

  return (
    <>
      <header className="cabecalho">
        <div>
          <h1>Gravações</h1>
          <p className="muted">Gravações das turmas ao vivo. Todos os clientes veem em Treinamentos → Gravados.</p>
        </div>
        {!editando && <button className="btn primario" onClick={() => setEditando('nova')}>Nova gravação</button>}
      </header>

      {editando && (
        <FormGravacao key={editando} gravacao={atual} onFechar={() => setEditando(null)} />
      )}

      {gravacoes.length === 0 ? (
        !editando && <div className="cartao vazio-cartao"><p>Nenhuma gravação cadastrada ainda.</p></div>
      ) : (
        <div className="cartao tabela-cartao">
          <table className="tabela tabela-acessos">
            <thead><tr><th>Gravação</th><th>Treinamento</th><th>Data</th><th><span className="sr-only">Ações</span></th></tr></thead>
            <tbody>
              {gravacoes.map((g) => (
                <tr key={g.id}>
                  <td><b>{g.titulo}</b>{g.descricao && <><br /><span className="muted pequeno">{g.descricao.slice(0, 120)}{g.descricao.length > 120 ? '…' : ''}</span></>}</td>
                  <td>{treinoPorId[g.treino_id]?.titulo ?? g.treino_id}</td>
                  <td className="sem-quebra">{g.gravado_em ? fmtData(g.gravado_em + 'T12:00:00') : '—'}</td>
                  <td className="sem-quebra">
                    <button className="link" onClick={() => { setEditando(g.id); window.scrollTo(0, 0) }}>Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function FormGravacao({ gravacao, onFechar }) {
  const [form, setForm] = useState(() => gravacao
    ? { treinoId: gravacao.treino_id, titulo: gravacao.titulo, descricao: gravacao.descricao ?? '', video: gravacao.video, gravadoEm: gravacao.gravado_em ?? '' }
    : vazio)
  const [salvando, setSalvando] = useState(false)
  const campo = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const videoInvalido = form.video.trim() && !youtubeId(form.video)
  const pode = form.treinoId && form.titulo.trim() && form.video.trim() && !videoInvalido

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    const video = form.video.trim().startsWith('https://') ? form.video.trim() : `https://youtu.be/${youtubeId(form.video)}`
    const ok = await tentar(() => salvarGravacao(gravacao?.id, { ...form, video }))
    setSalvando(false)
    if (ok) onFechar()
  }
  async function excluir() {
    if (!confirm(`Excluir a gravação "${gravacao.titulo}"? Ela some para os clientes.`)) return
    if (await tentar(() => excluirGravacao(gravacao.id))) onFechar()
  }

  return (
    <form className="cartao editor-pesquisa-bloco form-gravacao" onSubmit={salvar}>
      <h2>{gravacao ? 'Editar gravação' : 'Nova gravação'}</h2>
      <div className="linha-form">
        <label>Treinamento
          <select value={form.treinoId} onChange={campo('treinoId')}>
            {TREINAMENTOS_GRUPO.map((t) => <option key={t.id} value={t.id}>{t.titulo}</option>)}
          </select>
        </label>
        <label>Data da turma (opcional)<input type="date" value={form.gravadoEm} onChange={campo('gravadoEm')} /></label>
      </div>
      <label>Título<input value={form.titulo} onChange={campo('titulo')} placeholder="Ex.: Turma de terça — configurando tarifas" /></label>
      <label>Link do vídeo no YouTube
        <input value={form.video} onChange={campo('video')} placeholder="https://youtu.be/…" />
        {videoInvalido && <span className="erro-campo">Não reconheci este link do YouTube.</span>}
        <span className="muted pequeno">Pode ser um vídeo "não listado".</span>
      </label>
      <label>Descrição (opcional)<textarea rows={3} value={form.descricao} onChange={campo('descricao')} placeholder="O que foi visto nesta turma." /></label>
      <div className="acoes">
        <button className="btn primario" disabled={!pode || salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
        <button type="button" className="btn fantasma" onClick={onFechar}>Cancelar</button>
        {gravacao && <button type="button" className="btn fantasma" onClick={excluir}>Excluir</button>}
      </div>
    </form>
  )
}
