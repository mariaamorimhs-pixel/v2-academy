// Implantação híbrida: envia o convite de primeiro acesso para um usuário da tabela impl_usuarios.
// Só a editora pode chamar. Se a pessoa já tem login no Supabase (ex.: equipe HSystem), envia o link
// de definir senha em vez do convite. Publicar com verify_jwt ligado.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const resposta = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const comoQuemChamou = createClient(url, anonKey, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
    const { data: { user } } = await comoQuemChamou.auth.getUser()
    if (!user?.email) return resposta({ erro: 'Não autenticado' }, 401)

    const { data: eu } = await admin.from('impl_usuarios').select('perfil').eq('email', user.email.toLowerCase()).maybeSingle()
    if (eu?.perfil !== 'editora') return resposta({ erro: 'Só a editora pode enviar convites' }, 403)

    const { usuario_id, redirect_to } = await req.json()
    const { data: alvo } = await admin.from('impl_usuarios').select('id, email, nome').eq('id', usuario_id).maybeSingle()
    if (!alvo) return resposta({ erro: 'Usuário não encontrado' }, 404)

    let tipo = 'convite'
    const { error: erroConvite } = await admin.auth.admin.inviteUserByEmail(alvo.email, {
      redirectTo: redirect_to,
      data: { nome: alvo.nome },
    })
    if (erroConvite) {
      if (!/already|registered|exists/i.test(erroConvite.message)) return resposta({ erro: erroConvite.message }, 400)
      tipo = 'redefinir-senha'
      const anon = createClient(url, anonKey)
      const { error } = await anon.auth.resetPasswordForEmail(alvo.email, { redirectTo: redirect_to })
      if (error) return resposta({ erro: error.message }, 400)
    }

    await admin.from('impl_usuarios').update({ convidado_em: new Date().toISOString() }).eq('id', alvo.id)
    return resposta({ ok: true, tipo, email: alvo.email })
  } catch (e) {
    return resposta({ erro: String(e?.message ?? e) }, 500)
  }
})
