import { supabase } from '../supabase/client'

export interface SignUpData {
  nombre: string
  correo: string
  password: string
}

export async function signUp({ nombre, correo, password }: SignUpData) {
  const { data, error } = await supabase.auth.signUp({
    email: correo,
    password,
    options: {
      data: { nombre },
    },
  })
  return { data, error }
}
