// Implantação híbrida: sincroniza hotéis, contratos e contatos a partir do Sensedata (API v2).
//
// Quem pode chamar: a editora (botão "Sincronizar agora") ou o agendamento do banco (pg_cron), que manda
// a chave interna guardada em impl_segredos no cabeçalho x-sync-chave. Publicar com verify_jwt desligado:
// a própria função confere uma das duas formas de acesso.
//
// Quem entra: só clientes com o campo customizado `implantacao_academy` preenchido E com o playbook
// "Onboarding - Implantação Híbrida" disparado (procurado pelo nome, sem diferenciar acento/maiúscula).
// Para cada um: o cliente vira hotel; contratos (campo Plano e fim da vigência) e contatos ativos com e-mail são
// atualizados; o CS do cliente vira o analista do hotel quando já existe um analista com o mesmo e-mail (senão fica
// como pendência para a editora cadastrar).
//
// Precisa do segredo SENSEDATA_TOKEN (Supabase → Edge Functions → Secrets). Nada é apagado do progresso.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const API = 'https://api.sensedata.io/v2'
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-chave',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const resposta = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms))

const PLAYBOOK = 'Onboarding - Implantação Híbrida'
const CAMPO = 'implantacao_academy'
const normal = (t: unknown) => String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
// Aceita pequenas variações de escrita (ex.: "Onbording - implantação hibrida").
const ehPlaybookHibrido = (nome: unknown) => { const n = normal(nome); return n.startsWith('onb') && n.includes('implantacao hibrida') }
const preenchido = (v: unknown) => v !== null && v !== undefined && String(v).trim() !== '' && v !== false

// GET na API do Sensedata respeitando o limite de chamadas (espera e tenta de novo quando recebe 429).
async function sense(token: string, caminho: string, params: Record<string, string | number | boolean>) {
  const url = new URL(API + caminho)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
    if (r.status === 429) { await espera((Number(r.headers.get('x-ratelimit-reset')) || 5) * 1000); continue }
    if (r.status === 401 || r.status === 403) throw new Error('O Sensedata recusou o token (SENSEDATA_TOKEN inválido ou sem permissão).')
    if (!r.ok) throw new Error(`Sensedata respondeu ${r.status} em ${caminho}: ${(await r.text()).slice(0, 200)}`)
    return await r.json()
  }
  throw new Error('Limite de chamadas do Sensedata excedido várias vezes seguidas.')
}

// Percorre todas as páginas de uma listagem.
async function todos(token: string, caminho: string, chave: string, params: Record<string, string | number | boolean> = {}) {
  const itens: any[] = []
  let page = 1
  while (page) {
    const r = await sense(token, caminho, { ...params, limit: 1000, page })
    itens.push(...(r[chave] ?? []))
    page = r.next_page || 0
  }
  return itens
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // ---- quem está chamando ----
  const chave = req.headers.get('x-sync-chave')
  let origem = 'agendada'
  if (chave) {
    const { data } = await admin.from('impl_segredos').select('valor').eq('chave', 'sync_chave').single()
    if (!data || data.valor !== chave) return resposta({ erro: 'Chave de sincronização inválida' }, 401)
  } else {
    const comoQuem = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })
    const { data: { user } } = await comoQuem.auth.getUser()
    if (!user?.email) return resposta({ erro: 'Não autenticado' }, 401)
    const { data: eu } = await admin.from('impl_usuarios').select('perfil').eq('email', user.email.toLowerCase()).maybeSingle()
    if (eu?.perfil !== 'editora') return resposta({ erro: 'Só a editora pode sincronizar' }, 403)
    origem = 'manual'
  }
  const { data: log } = await admin.from('impl_sync_log').insert({ origem }).select('id').single()
  const fechar = async (ok: boolean, resumo: unknown, erro?: string) => {
    await admin.from('impl_sync_log').update({ terminado_em: new Date().toISOString(), ok, resumo, erro: erro ?? null }).eq('id', log!.id)
    return resposta(ok ? { ok, resumo } : { ok, erro, resumo }, ok ? 200 : 400)
  }

  try {
    const token = Deno.env.get('SENSEDATA_TOKEN')
    if (!token) return await fechar(false, null, 'Falta salvar o token do Sensedata no Supabase (Edge Functions → Secrets → SENSEDATA_TOKEN).')

    // ---- quais playbooks contam ----
    const playbooks = (await sense(token, '/playbooks', {})).playbooks ?? []
    const escolhidos = playbooks.filter((p: any) => ehPlaybookHibrido(p.name))
    if (!escolhidos.length) return await fechar(false, null, `Não achei no Sensedata um playbook com o nome "${PLAYBOOK}".`)

    const { data: analistas } = await admin.from('impl_usuarios').select('id, email').eq('perfil', 'analista')
    const analistaPorEmail = new Map((analistas ?? []).map((a) => [a.email, a.id]))
    const resumo = {
      playbooks: escolhidos.map((p: any) => p.name), clientes: 0, hoteis_novos: 0, hoteis_atualizados: 0, contratos: 0, contatos_novos: 0, contatos_atualizados: 0,
      analistas_pendentes: [] as { nome: string; email: string; hotel: string }[],
      conflitos: [] as string[], erros: [] as string[],
    }

    // Clientes que receberam o playbook (pelas atividades que ele gerou)
    const comPlaybook = new Set<string>()
    for (const p of escolhidos) {
      const tarefas = await todos(token, '/tasks', 'tasks', { 'playbook:id': p.id })
      for (const t of tarefas) if (t.customer?.id) comPlaybook.add(String(t.customer.id))
    }
    // Clientes com o campo implantacao_academy preenchido
    const comCampo = await todos(token, '/customers', 'customers', { [`custom_fields:${CAMPO}:empty`]: false })
    const clientes = comCampo.filter((c) => preenchido(c.custom_fields?.[CAMPO]?.value) && comPlaybook.has(String(c.id)))
    Object.assign(resumo, { com_playbook: comPlaybook.size, com_campo: comCampo.length, clientes: clientes.length })

    for (const c of clientes) {
      try {
        // Hotel
        const csEmail = c.cs?.email ? String(c.cs.email).toLowerCase().trim() : null
        const analistaId = csEmail ? analistaPorEmail.get(csEmail) ?? null : null
        const nome = (c.name || c.name_contract || `Cliente ${c.id}`).trim()
        const hotel = {
          sensedata_id: String(c.id), nome, cnpj: c.cnpj ?? null,
          cidade: [c.city, c.state].filter(Boolean).join(', ') || null,
          status_sense: c.stage ?? null, cs_nome: c.cs?.name ?? null, cs_email: csEmail,
          analista_id: analistaId, sincronizado_em: new Date().toISOString(),
        }
        const { data: existente } = await admin.from('impl_hoteis').select('id').eq('sensedata_id', hotel.sensedata_id).maybeSingle()
        let hotelId: string
        if (existente) {
          await admin.from('impl_hoteis').update(hotel).eq('id', existente.id)
          hotelId = existente.id; resumo.hoteis_atualizados++
        } else {
          const { data: novo, error } = await admin.from('impl_hoteis').insert({ ...hotel, teste: false }).select('id').single()
          if (error) throw error
          hotelId = novo.id; resumo.hoteis_novos++
        }
        if (csEmail && !analistaId) resumo.analistas_pendentes.push({ nome: c.cs?.name ?? csEmail, email: csEmail, hotel: nome })

        // Contratos (o campo Plano define o produto; contratos que sumiram do Sensedata saem daqui)
        const contratos = await todos(token, '/contracts', 'contracts', { id_customer: c.id })
        const ids: string[] = []
        for (const k of contratos) {
          if (!k.plan) continue
          ids.push(String(k.id))
          await admin.from('impl_contratos').upsert({
            hotel_id: hotelId, sensedata_contrato_id: String(k.id), plano: String(k.plan).trim(),
            fim: k.end_date ?? null, descricao: k.description ?? null,
          }, { onConflict: 'sensedata_contrato_id' })
          resumo.contratos++
        }
        const { data: atuais } = await admin.from('impl_contratos').select('id, sensedata_contrato_id').eq('hotel_id', hotelId)
        const sobrando = (atuais ?? []).filter((x) => x.sensedata_contrato_id && !ids.includes(x.sensedata_contrato_id)).map((x) => x.id)
        if (sobrando.length) await admin.from('impl_contratos').delete().in('id', sobrando)

        // Contatos ativos com e-mail viram usuários do hotel
        const contatos = await todos(token, '/contacts', 'contacts', { id_customer: c.id, is_active: true })
        for (const p of contatos) {
          const email = p.email ? String(p.email).toLowerCase().trim() : ''
          if (!email || !email.includes('@')) continue
          const { data: u } = await admin.from('impl_usuarios').select('id, perfil, hotel_id').eq('email', email).maybeSingle()
          if (u && (u.perfil !== 'cliente' || u.hotel_id !== hotelId)) {
            resumo.conflitos.push(`${email} já está cadastrado em outro hotel ou perfil (contato de ${nome})`)
            continue
          }
          const dados = { nome: (p.name || p.nickname || email).trim(), sensedata_contato_id: String(p.id) }
          if (u) { await admin.from('impl_usuarios').update(dados).eq('id', u.id); resumo.contatos_atualizados++ }
          else {
            const { error } = await admin.from('impl_usuarios').insert({ ...dados, email, perfil: 'cliente', hotel_id: hotelId })
            if (error) resumo.erros.push(`${email}: ${error.message}`); else resumo.contatos_novos++
          }
        }
      } catch (e) {
        resumo.erros.push(`Cliente ${c.id} (${c.name ?? ''}): ${String((e as Error)?.message ?? e)}`)
      }
    }
    return await fechar(resumo.erros.length === 0, resumo, resumo.erros.length ? `${resumo.erros.length} cliente(s) com erro` : undefined)
  } catch (e) {
    return await fechar(false, null, String((e as Error)?.message ?? e))
  }
})
