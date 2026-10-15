import { createClient } from '@supabase/supabase-js'

// Os links de convite e de "esqueci minha senha" voltam com #...type=invite|recovery na URL.
// Guardamos isso antes do cliente do Supabase ler e limpar a URL, para pedir a nova senha.
const hash = window.location.hash
export const LINK_DE_SENHA = /type=(invite|recovery)/.test(hash)
export const ERRO_DO_LINK = /error_description=([^&]+)/.exec(hash)?.[1]?.replace(/\+/g, ' ')

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_KEY)
