import React, { useState } from 'react';
import { supabase } from './supabaseClient';

const EscapuladaLogo = ({ className = 'w-16 h-16' }) => (
  <div className={`${className} rounded-full bg-white overflow-hidden border-[3px] border-blue-600 shadow-lg relative shrink-0 flex items-center justify-center`}>
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full absolute top-0 left-0">
      <path d="M -10,0 L 50,60 L 110,0 L 110,30 L 50,90 L -10,30 Z" fill="#1d4ed8" />
    </svg>
  </div>
);

export default function Auth() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (!email || !password) {
      setErr('Cal correu i contrasenya.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg('Compte creat. Si Supabase et demana confirmar el correu, revisa la safata d\'entrada; si no, ja pots entrar.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // En cas d'èxit, l'AuthGate detectarà la sessió i carregarà l'app.
      }
    } catch (e2) {
      setErr(e2.message || 'Hi ha hagut un error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <EscapuladaLogo />
          <h1 className="mt-4 text-2xl font-black tracking-tighter text-slate-900">CE EUROPA</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-700">Direcció Esportiva</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl shadow-xl p-8">
          <div className="flex p-1.5 rounded-2xl bg-slate-100 mb-6">
            <button
              onClick={() => { setMode('login'); setErr(null); setMsg(null); }}
              className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${mode === 'login' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Entrar
            </button>
            <button
              onClick={() => { setMode('signup'); setErr(null); setMsg(null); }}
              className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${mode === 'signup' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Crear compte
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-black mb-1.5 uppercase text-slate-500">Correu electrònic</label>
              <input
                type="email" autoComplete="email" required
                className="w-full rounded-xl p-3 border border-slate-300 outline-none font-bold text-sm focus:border-blue-500 transition-colors"
                value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@exemple.com"
              />
            </div>
            <div>
              <label className="block text-xs font-black mb-1.5 uppercase text-slate-500">Contrasenya</label>
              <input
                type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required
                className="w-full rounded-xl p-3 border border-slate-300 outline-none font-bold text-sm focus:border-blue-500 transition-colors"
                value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
              />
            </div>

            {err && <p className="text-sm font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">{err}</p>}
            {msg && <p className="text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3">{msg}</p>}

            <button
              type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-black p-4 rounded-xl shadow-lg transition-transform active:scale-95 uppercase tracking-widest text-sm"
            >
              {loading ? 'Un moment…' : (mode === 'login' ? 'Entrar' : 'Crear compte')}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-6 font-medium">
          Les teves dades es guarden al núvol i et segueixen a qualsevol dispositiu.
        </p>
      </div>
    </div>
  );
}
