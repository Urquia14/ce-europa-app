import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Missatge clar a la consola si falten les variables d'entorn
  console.error(
    'Falten les variables VITE_SUPABASE_URL i/o VITE_SUPABASE_ANON_KEY. ' +
    'Crea un fitxer .env (local) o configura-les al teu hosting (Vercel).'
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
