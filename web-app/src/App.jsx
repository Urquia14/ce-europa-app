import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Users, ClipboardList, Shield, Search, PlusCircle, Info, Download,
  FileText, DollarSign, UploadCloud, AlertTriangle,
  X, Edit2, Trash2, Star, Eye, LayoutTemplate, SlidersHorizontal,
  Trophy, ListOrdered, Save, Menu, Sun, Moon, Calendar, ChevronRight,
  ChevronLeft, UserPlus, Database, CheckCircle2, Upload, LogOut
} from 'lucide-react';
import { supabase } from './supabaseClient';
import Auth from './Auth.jsx';
/* =====================================================================
   CONSTANTS
===================================================================== */
const STORAGE_KEY = 'ce_europa_data_v1';
const CURRENT_YEAR = new Date().getFullYear();
const POSICIONS_BASE_DADES = [
  "Porter", "Lateral D", "Central", "Lateral E", "Carriler D", "Carriler E",
  "Migcentre", "Interior", "Extrem", "Mitjapunta", "Davanter", "Desconeguda", "Invitació"
];
const getFormationPositions = (formation) => {
  switch (formation) {
    case '4-3-3': return [
      { p: 'Porter', d: '1' }, { p: 'Lateral D', d: '2' }, { p: 'Central', d: '5' }, { p: 'Central', d: '6' }, { p: 'Lateral E', d: '3' },
      { p: 'Migcentre', d: '4' }, { p: 'Interior', d: '8' }, { p: 'Interior', d: '10' },
      { p: 'Extrem', d: '7' }, { p: 'Davanter', d: '9' }, { p: 'Extrem', d: '11' }
    ];
    case '4-4-2': return [
      { p: 'Porter', d: '1' }, { p: 'Lateral D', d: '2' }, { p: 'Central', d: '5' }, { p: 'Central', d: '6' }, { p: 'Lateral E', d: '3' },
      { p: 'Extrem', d: '7' }, { p: 'Migcentre', d: '4' }, { p: 'Migcentre', d: '8' }, { p: 'Extrem', d: '11' },
      { p: 'Davanter', d: '9' }, { p: 'Davanter', d: '10' }
    ];
    case '4-2-3-1': return [
      { p: 'Porter', d: '1' }, { p: 'Lateral D', d: '2' }, { p: 'Central', d: '5' }, { p: 'Central', d: '6' }, { p: 'Lateral E', d: '3' },
      { p: 'Migcentre', d: '4' }, { p: 'Migcentre', d: '8' },
      { p: 'Extrem', d: '7' }, { p: 'Mitjapunta', d: '10' }, { p: 'Extrem', d: '11' },
      { p: 'Davanter', d: '9' }
    ];
    case '3-5-2': return [
      { p: 'Porter', d: '1' }, { p: 'Central', d: '4' }, { p: 'Central', d: '5' }, { p: 'Central', d: '6' },
      { p: 'Carriler D', d: '2' }, { p: 'Interior', d: '8' }, { p: 'Migcentre', d: '4' }, { p: 'Interior', d: '10' }, { p: 'Carriler E', d: '3' },
      { p: 'Davanter', d: '7' }, { p: 'Davanter', d: '9' }
    ];
    case '5-3-2': return [
      { p: 'Porter', d: '1' }, { p: 'Carriler D', d: '2' }, { p: 'Central', d: '4' }, { p: 'Central', d: '5' }, { p: 'Central', d: '6' }, { p: 'Carriler E', d: '3' },
      { p: 'Interior', d: '8' }, { p: 'Migcentre', d: '4' }, { p: 'Interior', d: '10' },
      { p: 'Davanter', d: '7' }, { p: 'Davanter', d: '9' }
    ];
    case '3-4-3': return [
      { p: 'Porter', d: '1' }, { p: 'Central', d: '4' }, { p: 'Central', d: '5' }, { p: 'Central', d: '6' },
      { p: 'Carriler D', d: '2' }, { p: 'Migcentre', d: '8' }, { p: 'Migcentre', d: '10' }, { p: 'Carriler E', d: '3' },
      { p: 'Extrem', d: '7' }, { p: 'Davanter', d: '9' }, { p: 'Extrem', d: '11' }
    ];
    default: return Array(11).fill({ p: 'Desconeguda', d: '' });
  }
};
const buildEmptySquad = (withInvitacio = false) => {
  const base = {
    porters: ['', '', '', ''],
    laterals: ['', '', '', '', ''],
    centralsD: ['', '', ''],
    centralsE: ['', '', ''],
    migcentres: ['', '', '', ''],
    interiorsD: ['', '', ''],
    interiorsE: ['', '', ''],
    extrems: ['', '', '', '', '', ''],
    davanters: ['', '', '', ''],
  };
  if (withInvitacio) base.invitacio = ['', '', '', '', ''];
  return base;
};
const CATEGORY_LABELS = {
  porters: 'Porters',
  laterals: 'Laterals',
  centralsD: 'Central Dret',
  centralsE: 'Central Esquerre',
  migcentres: 'Migcentres',
  interiorsD: 'Interior Dret',
  interiorsE: 'Interior Esquerre',
  extrems: 'Extrems',
  davanters: 'Davanters',
  invitacio: 'Invitació',
};
// Migrate legacy `centrals` / `interiors` arrays into the split D/E shape
const migrateSquad = (saved, withInvitacio) => {
  const base = buildEmptySquad(withInvitacio);
  const merged = { ...base, ...(saved || {}) };
  if (saved && Array.isArray(saved.centrals) && saved.centrals.length > 0) {
    const c = saved.centrals;
    merged.centralsD = [c[0] || '', c[2] || '', c[4] || ''];
    merged.centralsE = [c[1] || '', c[3] || '', c[5] || ''];
    delete merged.centrals;
  }
  if (saved && Array.isArray(saved.interiors) && saved.interiors.length > 0) {
    const i = saved.interiors;
    merged.interiorsD = [i[0] || '', i[2] || '', i[4] || ''];
    merged.interiorsE = [i[1] || '', i[3] || '', i[5] || ''];
    delete merged.interiors;
  }
  return merged;
};
const defaultState = () => ({
  players: [],
  matchReports: [],
  squadData: {
    'PRIMER EQUIP': buildEmptySquad(false),
    'FILIAL': buildEmptySquad(true),
  },
  plantillaActual: { 'PRIMER EQUIP': [], 'FILIAL': [] },
  evaluations: {},
  budgetLimits: { 'PRIMER EQUIP': 0, 'FILIAL': 0 },
  salaries: {},
  tasks: [],
});
/* =====================================================================
   THEME
===================================================================== */
const getTheme = (isDark) => ({
  app: isDark ? 'bg-slate-900 text-slate-200' : 'bg-slate-50 text-slate-800',
  sidebar: isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200',
  header: isDark ? 'bg-slate-800 border-blue-600' : 'bg-white border-blue-600',
  card: isDark ? 'bg-slate-800 border-slate-700 shadow-2xl' : 'bg-white border-slate-200 shadow-xl',
  panel: isDark ? 'bg-slate-900 border-slate-700/50' : 'bg-slate-100 border-slate-200',
  input: isDark ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400',
  inputSoft: isDark ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-500',
  textMain: isDark ? 'text-white' : 'text-slate-900',
  textMuted: isDark ? 'text-slate-400' : 'text-slate-500',
  textHighlight: isDark ? 'text-blue-400' : 'text-blue-700',
  border: isDark ? 'border-slate-700' : 'border-slate-200',
  tableHead: isDark ? 'bg-slate-900 text-slate-400 border-slate-700/50' : 'bg-slate-100 text-slate-600 border-slate-200',
  tableRowHover: isDark ? 'hover:bg-blue-900/20' : 'hover:bg-blue-50',
  tableRowDivide: isDark ? 'divide-slate-700/50' : 'divide-slate-100',
});
/* =====================================================================
   SHARED UI
===================================================================== */
const EscapuladaLogo = ({ className = "w-12 h-12", isDark }) => (
  <div className={`${className} rounded-full bg-white overflow-hidden border-[3px] shadow-lg relative shrink-0 flex items-center justify-center ${isDark ? 'border-slate-400' : 'border-blue-600'}`}>
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full absolute top-0 left-0">
      <path d="M -10,0 L 50,60 L 110,0 L 110,30 L 50,90 L -10,30 Z" fill="#1d4ed8" />
    </svg>
  </div>
);
const EscapuladaIcon = ({ mainName, subNames = [] }) => (
  <div className="flex flex-col items-center group z-10 w-20 sm:w-24">
    <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-slate-100 overflow-hidden border-[3px] border-slate-200 shadow-[0_5px_15px_rgba(0,0,0,0.6)] flex items-center justify-center transition-transform group-hover:scale-110">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full absolute top-0 left-0">
        <path d="M -10,0 L 50,60 L 110,0 L 110,30 L 50,90 L -10,30 Z" fill="#1d4ed8" />
      </svg>
    </div>
    <span
      className="mt-1.5 sm:mt-2 text-[11px] sm:text-[14px] font-black text-white uppercase tracking-tighter truncate max-w-full text-center"
      style={{ textShadow: '2px 2px 3px rgba(0,0,0,0.95), -1px -1px 0px rgba(0,0,0,0.95), 1px -1px 0px rgba(0,0,0,0.95), -1px 1px 0px rgba(0,0,0,0.95), 1px 1px 0px rgba(0,0,0,0.95)' }}
    >
      {mainName || "LLIURE"}
    </span>
    {subNames.length > 0 && (
      <div className="flex flex-col items-center mt-1 space-y-0.5">
        {subNames.map((name, idx) => (
          <span
            key={idx}
            className="text-[9px] sm:text-[11px] font-bold text-slate-200 uppercase tracking-tighter truncate max-w-[80px] sm:max-w-[100px] text-center"
            style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.9), -1px -1px 0px rgba(0,0,0,0.9), 1px -1px 0px rgba(0,0,0,0.9), -1px 1px 0px rgba(0,0,0,0.9), 1px 1px 0px rgba(0,0,0,0.9)' }}
          >
            {name}
          </span>
        ))}
      </div>
    )}
  </div>
);
function SidebarBtn({ active, onClick, icon, label, isDark }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl font-black text-sm transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' : (isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700')}`}
    >
      {icon} <span className="uppercase tracking-widest text-[11px]">{label}</span>
    </button>
  );
}
/* =====================================================================
   TOAST
===================================================================== */
function Toast({ toast, isDark }) {
  if (!toast) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 fade-in">
      <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-blue-200 text-slate-900'}`}>
        <CheckCircle2 size={20} className="text-blue-500" />
        <span className="font-bold text-sm">{toast}</span>
      </div>
    </div>
  );
}
/* =====================================================================
   LINEUP LIST (for PartitsTab)
===================================================================== */
function LineupList({ report, players, teamKey, typeKey, title, isTitular, updateSlotObj, isDark }) {
  const t = getTheme(isDark);
  return (
    <div className="mb-6">
      <h4 className={`text-xs font-black uppercase tracking-widest mb-3 border-b pb-2 ${t.textMuted} ${t.border}`}>{title}</h4>
      <div className="space-y-2">
        {report[`${typeKey}${teamKey}`].map((slot, i) => (
          <div key={i} className={`flex flex-col gap-2 p-3 rounded-2xl border ${t.panel}`}>
            <div className="flex items-center gap-2">
              {isTitular ? (
                <>
                  <input type="text" placeholder="#" className={`w-10 p-2.5 text-xs text-center font-bold rounded-xl border outline-none ${t.inputSoft}`} value={slot.dorsal} onChange={e => updateSlotObj(teamKey, typeKey, i, { ...slot, dorsal: e.target.value })} />
                  <select className={`w-[100px] p-2.5 text-[10px] font-bold rounded-xl border outline-none ${t.inputSoft}`} value={slot.posicio} onChange={e => updateSlotObj(teamKey, typeKey, i, { ...slot, posicio: e.target.value })}>
                    {POSICIONS_BASE_DADES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </>
              ) : (
                <span className={`w-8 text-center text-xs font-black ${t.textMuted}`}>{i + 12}</span>
              )}
              <div className="flex-1 relative">
                <input
                  list={`players-list-${teamKey}-${typeKey}-${i}`}
                  placeholder="Nom del jugador..."
                  className={`w-full text-sm p-2.5 rounded-xl border outline-none font-bold transition-colors ${slot.id ? (isDark ? 'bg-blue-900/40 text-blue-300 border-blue-700/50' : 'bg-blue-100 text-blue-800 border-blue-200') : t.inputSoft}`}
                  value={slot.name}
                  onChange={e => {
                    const val = e.target.value;
                    const matched = players.find(p => p.name.toLowerCase() === val.toLowerCase());
                    updateSlotObj(teamKey, typeKey, i, { ...slot, name: val, id: matched ? matched.id : '' });
                  }}
                />
                <datalist id={`players-list-${teamKey}-${typeKey}-${i}`}>
                  {players.map(p => <option key={p.id} value={p.name}>{p.team ? `(${p.team})` : ''}</option>)}
                </datalist>
              </div>
            </div>
            {slot.name && (
              <div className="flex items-center gap-2 pl-2 sm:pl-12 mt-1 animate-in fade-in slide-in-from-top-1">
                <input type="number" min="1" max="10" placeholder="Nota" className={`w-16 p-2.5 text-sm text-center font-black rounded-xl border outline-none ${isDark ? 'bg-slate-800 text-blue-400 border-blue-900/50 placeholder-slate-600' : 'bg-white text-blue-700 border-blue-200 placeholder-slate-300'}`} value={slot.rating} onChange={e => updateSlotObj(teamKey, typeKey, i, { ...slot, rating: e.target.value })} />
                <input type="text" placeholder="Avaluació individual..." className={`flex-1 p-2.5 text-sm font-medium rounded-xl border outline-none ${isDark ? 'bg-slate-800 text-slate-300 border-slate-700 placeholder-slate-600' : 'bg-white text-slate-700 border-slate-200 placeholder-slate-400'}`} value={slot.comment} onChange={e => updateSlotObj(teamKey, typeKey, i, { ...slot, comment: e.target.value })} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
/* =====================================================================
   PLAYER DETAIL MODAL
===================================================================== */
function PlayerDetailModal({ player, matchReports, onClose, isDark }) {
  const t = getTheme(isDark);
  if (!player) return null;
  const reports = matchReports.reduce((acc, report) => {
    const slot = [...report.titularsLocal, ...report.canvisLocal, ...report.titularsVisitant, ...report.canvisVisitant]
      .find(s => s.id === player.id);
    if (slot && (slot.rating || slot.comment)) {
      acc.push({ match: `${report.equipLocal} ${report.golsLocal}-${report.golsVisitant} ${report.equipVisitant}`, date: report.data, rating: slot.rating, comment: slot.comment });
    }
    return acc;
  }, []);
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <div className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border-2 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-blue-200'}`} onClick={e => e.stopPropagation()}>
        <div className={`p-6 sm:p-8 border-b flex items-start justify-between gap-4 ${t.border}`}>
          <div>
            <h2 className={`text-2xl sm:text-3xl font-black ${t.textHighlight}`}>{player.name}</h2>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest border ${isDark ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>{player.position}</span>
              {player.team && <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest border ${isDark ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>{player.team}</span>}
              {player.birthYear && <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest border ${isDark ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>{player.birthYear} • {player.age} anys</span>}
              {player.isU23 && <span className="px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest border bg-emerald-100 border-emerald-300 text-emerald-800">Sots-23 ✓</span>}
            </div>
          </div>
          <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
            <X size={24} />
          </button>
        </div>
        <div className="p-6 sm:p-8 space-y-6">
          {player.comments && (
            <div>
              <h3 className={`text-xs font-black uppercase tracking-widest mb-3 ${t.textMuted}`}>Observacions</h3>
              <p className={`p-4 rounded-2xl border italic font-medium leading-relaxed ${t.panel} ${t.textMain}`}>{player.comments}</p>
            </div>
          )}
          <div>
            <h3 className={`text-base font-black uppercase tracking-widest border-b-2 pb-3 mb-4 flex items-center gap-3 ${t.textHighlight} ${t.border}`}>
              <Star size={20} /> Avaluacions d'Scouting
            </h3>
            <div className="space-y-3">
              {reports.length === 0 ? (
                <p className={`text-sm italic p-5 rounded-2xl text-center border ${t.textMuted} ${t.panel}`}>Aquest jugador encara no ha estat avaluat en cap partit.</p>
              ) : (
                reports.map((rep, idx) => (
                  <div key={idx} className={`p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-start md:items-center border ${t.card}`}>
                    <div className={`flex flex-col items-center justify-center border p-3 rounded-xl min-w-[70px] shrink-0 ${isDark ? 'bg-blue-900/30 border-blue-800/50' : 'bg-blue-50 border-blue-200'}`}>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-blue-500' : 'text-blue-700'}`}>Nota</span>
                      <span className={`text-2xl font-black ${isDark ? 'text-blue-400' : 'text-blue-800'}`}>{rep.rating || '-'}</span>
                    </div>
                    <div className="flex-1">
                      <p className={`text-xs font-black mb-1 uppercase tracking-widest ${t.textMuted}`}>{rep.date} • <span className={t.textMain}>{rep.match}</span></p>
                      <p className={`text-sm font-medium italic leading-relaxed ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>"{rep.comment || 'Sense comentaris tècnics.'}"</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          {(player.linkPreferente || player.linkFCF) && (
            <div className="flex flex-wrap gap-3">
              {player.linkPreferente && <a href={player.linkPreferente} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest">La Preferente ↗</a>}
              {player.linkFCF && <a href={player.linkFCF} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest">FCF ↗</a>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
/* =====================================================================
   TAB 1: JUGADORS (PLAYER DATABASE)
===================================================================== */
function JugadorsTab({ players, setPlayers, matchReports, showToast, setSelectedPlayer, isDark }) {
  const [formData, setFormData] = useState({ name: '', position: 'Migcentre', birthYear: '', team: '', isU23: false, comments: '', linkPreferente: '', linkFCF: '' });
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef(null);
  const t = getTheme(isDark);
  const handleBirthYearChange = (e) => {
    const val = e.target.value;
    const year = parseInt(val, 10);
    setFormData({ ...formData, birthYear: val, isU23: (!isNaN(year) ? (CURRENT_YEAR - year) <= 23 : false) });
  };
  const handleAdd = (e) => {
    e.preventDefault();
    if (!formData.name) return;
    const age = formData.birthYear ? (CURRENT_YEAR - parseInt(formData.birthYear, 10)).toString() : '';
    if (editingId) {
      setPlayers(players.map(p => p.id === editingId ? { ...p, ...formData, age } : p));
      showToast("Jugador actualitzat.");
      setEditingId(null);
    } else {
      setPlayers([...players, { ...formData, age, id: Date.now().toString() + Math.random().toString(36).slice(2, 7), history: [] }]);
      showToast("Jugador registrat.");
    }
    setFormData({ name: '', position: 'Migcentre', birthYear: '', team: '', isU23: false, comments: '', linkPreferente: '', linkFCF: '' });
  };
  const handleEdit = (p) => {
    setFormData({ name: p.name || '', position: p.position || 'Migcentre', birthYear: p.birthYear || '', team: p.team || '', isU23: p.isU23 || false, comments: p.comments || '', linkPreferente: p.linkPreferente || '', linkFCF: p.linkFCF || '' });
    setEditingId(p.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const handleDelete = (id) => {
    if (window.confirm("Estàs segur que vols eliminar aquest jugador?")) {
      setPlayers(players.filter(p => p.id !== id));
      showToast("Jugador eliminat.");
    }
  };
  const getPlayerStats = (id) => {
    let totalRating = 0; let count = 0;
    matchReports.forEach(report => {
      [...report.titularsLocal, ...report.canvisLocal, ...report.titularsVisitant, ...report.canvisVisitant].forEach(p => {
        if (p.id === id && p.rating) { totalRating += Number(p.rating); count++; }
      });
    });
    return { matches: count, avgRating: count > 0 ? (totalRating / count).toFixed(1) : '-' };
  };
  const mapPosition = (posRaw) => {
    if (!posRaw) return 'Desconeguda';
    const pos = posRaw.toLowerCase();
    if (pos.includes('porter')) return 'Porter';
    if (pos.includes('lateral d') || pos.includes('lateral der')) return 'Lateral D';
    if (pos.includes('lateral e') || pos.includes('lateral esq') || pos.includes('lateral izq')) return 'Lateral E';
    if (pos.includes('lateral')) return 'Lateral D';
    if (pos.includes('carriler d') || pos.includes('carrilero der')) return 'Carriler D';
    if (pos.includes('carriler e') || pos.includes('carrilero izq')) return 'Carriler E';
    if (pos.includes('carriler')) return 'Carriler D';
    if (pos.includes('central') || pos.includes('defensa') || pos.includes('zaguero')) return 'Central';
    if (pos.includes('migcentre') || pos.includes('pivot') || pos.includes('mediocentro') || pos.includes('medio')) return 'Migcentre';
    if (pos.includes('interior')) return 'Interior';
    if (pos.includes('mitjapunta') || pos.includes('mediapunta')) return 'Mitjapunta';
    if (pos.includes('extrem') || pos.includes('extremo')) return 'Extrem';
    if (pos.includes('davanter') || pos.includes('punta') || pos.includes('delantero')) return 'Davanter';
    return 'Desconeguda';
  };
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    let allNewPlayers = [];
    for (const file of files) {
      try {
        const text = await file.text();
        const rows = text.split(/\r?\n/);
        let currentTeam = file.name.replace('.csv', '').replace('informe jdh.xlsx - ', '').trim();
        let format = 'unknown';
        let isDataSection = false;
        const parseCSVLine = (line) => {
          const re = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
          return line.split(re).map(val => val.replace(/^"|"$/g, '').trim());
        };
        for (let i = 0; i < rows.length; i++) {
          const line = rows[i].trim();
          if (!line) continue;
          const cols = parseCSVLine(line);
          if (cols[0] && cols[0].toUpperCase().includes('NOMBRE') && cols[1] && cols[1].toUpperCase().includes('APELLIDO')) { format = 'nou_format'; continue; }
          if (cols[0] && cols[0].toUpperCase().includes("NOM D'EQUIP")) { currentTeam = cols[2] || cols[1] || currentTeam; continue; }
          if (cols[0] && cols[0].toUpperCase().includes('NOM I COGNOM')) { format = 'jdh_antic'; isDataSection = true; continue; }
          if (format === 'nou_format') {
            const nom = cols[0] || '';
            const cognom = cols[1] || '';
            if (!nom || nom.toUpperCase().includes('NOMBRE')) continue;
            const name = `${nom} ${cognom}`.trim();
            const positionStr = cols[2] || '';
            const yearStr = cols[3] || '';
            const teamStr = cols[4] || '';
            const birthYear = parseInt(yearStr, 10);
            let age = ''; let isU23 = false;
            if (!isNaN(birthYear)) { age = (CURRENT_YEAR - birthYear).toString(); isU23 = (CURRENT_YEAR - birthYear) <= 23; }
            allNewPlayers.push({ id: Date.now().toString() + Math.random().toString(36).slice(2, 7) + i, name: name, position: mapPosition(positionStr), birthYear: isNaN(birthYear) ? '' : birthYear.toString(), age: age, team: teamStr || currentTeam, isU23: isU23, comments: 'Importat des de CSV', linkPreferente: '', linkFCF: '', history: [] });
            continue;
          }
          if (format === 'jdh_antic' && isDataSection && cols.length >= 3 && cols[0]) {
            const name = cols[0];
            if (name.toUpperCase().includes('AUTOMATED') || name === '') continue;
            const positionStr = cols[1];
            const yearStr = cols[2];
            const comments = cols[3] || '';
            let rating = '';
            if (cols[4] && !isNaN(parseFloat(cols[4]))) rating = cols[4];
            else if (cols[5] && !isNaN(parseFloat(cols[5]))) rating = cols[5];
            let fullComment = comments;
            if (rating) fullComment += ` (Nota: ${rating}/10)`;
            const birthYear = parseInt(yearStr, 10);
            let age = ''; let isU23 = false;
            if (!isNaN(birthYear)) { age = (CURRENT_YEAR - birthYear).toString(); isU23 = (CURRENT_YEAR - birthYear) <= 23; }
            allNewPlayers.push({ id: Date.now().toString() + Math.random().toString(36).slice(2, 7) + i, name: name, position: mapPosition(positionStr), birthYear: isNaN(birthYear) ? '' : birthYear.toString(), age: age, team: currentTeam.replace('informe jdh.xlsx - ', '').trim(), isU23: isU23, comments: fullComment, linkPreferente: '', linkFCF: '', history: [] });
          }
        }
      } catch (error) { console.error(`Error llegint l'arxiu ${file.name}:`, error); }
    }
    if (allNewPlayers.length > 0) {
      setPlayers(prev => [...prev, ...allNewPlayers]);
      showToast(`${allNewPlayers.length} jugadors importats!`);
    } else {
      showToast("No s'han trobat jugadors als documents.");
    }
    e.target.value = null;
  };
  const filteredPlayers = players.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.team && p.team.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 2xl:grid-cols-4 gap-6 lg:gap-8">
      <div className="space-y-6 lg:col-span-1">
        <div className={`p-6 sm:p-8 rounded-3xl border h-fit ${t.card}`}>
          <h2 className={`text-xl font-black mb-6 flex items-center gap-2 ${t.textHighlight}`}>
            {editingId ? <Edit2 /> : <PlusCircle />} {editingId ? "EDITAR JUGADOR" : "AFEGIR A LA BD"}
          </h2>
          <form onSubmit={handleAdd} className="space-y-5">
            <div><label className={`block text-xs font-black mb-1.5 uppercase ${t.textMuted}`}>Nom complet</label><input required className={`w-full rounded-xl p-3 border outline-none font-bold text-sm focus:border-blue-500 transition-colors ${t.input}`} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Àlex Cano" /></div>
            <div><label className={`block text-xs font-black mb-1.5 uppercase ${t.textMuted}`}>Equip Actual</label><input className={`w-full rounded-xl p-3 border outline-none font-bold text-sm focus:border-blue-500 transition-colors ${t.input}`} value={formData.team} onChange={e => setFormData({ ...formData, team: e.target.value })} placeholder="Ex: Sant Andreu" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-black mb-1.5 uppercase ${t.textMuted}`}>Posició</label>
                <select className={`w-full rounded-xl p-3 border outline-none font-bold text-xs focus:border-blue-500 transition-colors ${t.input}`} value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })}>
                  {POSICIONS_BASE_DADES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div><label className={`block text-xs font-black mb-1.5 uppercase ${t.textMuted}`}>Any Naixement</label><input type="number" className={`w-full rounded-xl p-3 border outline-none font-bold text-sm focus:border-blue-500 transition-colors ${t.input}`} value={formData.birthYear} onChange={handleBirthYearChange} placeholder="Ex: 2004" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={`block text-[10px] font-black mb-1.5 uppercase ${t.textMuted}`}>URL La Preferente</label><input className={`w-full rounded-xl p-2.5 border outline-none font-bold text-xs focus:border-blue-500 transition-colors ${t.input}`} value={formData.linkPreferente} onChange={e => setFormData({ ...formData, linkPreferente: e.target.value })} placeholder="https://..." /></div>
              <div><label className={`block text-[10px] font-black mb-1.5 uppercase ${t.textMuted}`}>URL FCF</label><input className={`w-full rounded-xl p-2.5 border outline-none font-bold text-xs focus:border-blue-500 transition-colors ${t.input}`} value={formData.linkFCF} onChange={e => setFormData({ ...formData, linkFCF: e.target.value })} placeholder="https://..." /></div>
            </div>
            <div><label className={`block text-xs font-black mb-1.5 uppercase ${t.textMuted}`}>Observacions</label><textarea rows="3" className={`w-full rounded-xl p-3 border outline-none font-bold text-sm resize-none focus:border-blue-500 transition-colors ${t.input}`} value={formData.comments} onChange={e => setFormData({ ...formData, comments: e.target.value })} placeholder="Notes, perfil..."></textarea></div>
            <div className={`flex items-center gap-3 p-3 rounded-xl border ${t.panel}`}><input type="checkbox" className="w-5 h-5 rounded text-blue-500 focus:ring-blue-500 cursor-pointer accent-blue-600" checked={formData.isU23} onChange={(e) => setFormData({ ...formData, isU23: e.target.checked })} /><label className={`text-sm font-bold cursor-pointer ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>És jugador Sots-23</label></div>
            <div className="flex gap-3 mt-4">
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black p-4 rounded-xl shadow-lg transition-transform active:scale-95 uppercase tracking-widest text-sm">{editingId ? "Actualitzar" : "Guardar Jugador"}</button>
              {editingId && <button type="button" onClick={() => { setEditingId(null); setFormData({ name: '', position: 'Migcentre', birthYear: '', team: '', isU23: false, comments: '', linkPreferente: '', linkFCF: '' }); }} className={`w-16 font-black p-4 rounded-xl shadow-sm transition-colors flex justify-center items-center ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}><X size={20} /></button>}
            </div>
          </form>
        </div>
        <div className={`p-8 rounded-3xl border ${isDark ? 'bg-gradient-to-br from-blue-900/40 to-slate-800 border-blue-800/30 text-white' : 'bg-gradient-to-br from-blue-50 to-white border-blue-200 text-slate-800'}`}>
          <h3 className={`font-black text-base mb-3 flex items-center gap-3 ${isDark ? 'text-blue-400' : 'text-blue-700'}`}><UploadCloud size={20} /> IMPORTACIÓ MASSIVA</h3>
          <p className={`text-xs mb-6 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Puja <strong>un o varis arxius CSV</strong> alhora. El sistema extraurà equip, posició, edat i puntuació automàticament.
          </p>
          <input type="file" accept=".csv" multiple className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          <button onClick={() => fileInputRef.current.click()} className={`w-full p-4 rounded-xl font-black text-sm transition-colors uppercase tracking-widest border ${isDark ? 'bg-blue-600/20 hover:bg-blue-600/40 border-blue-500/50 text-blue-300' : 'bg-blue-100 hover:bg-blue-200 border-blue-200 text-blue-700'}`}>
            Seleccionar Fitxers CSV
          </button>
        </div>
      </div>
      <div className={`lg:col-span-2 2xl:col-span-3 p-6 sm:p-10 rounded-[40px] border flex flex-col min-h-[600px] lg:min-h-[800px] ${t.card}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 shrink-0">
          <h2 className={`text-2xl font-black flex items-center gap-3 ${t.textHighlight}`}><Database size={24} /> BASE DE DADES <span className={`text-lg ${t.textMuted}`}>({filteredPlayers.length})</span></h2>
          <div className="relative w-full md:w-80">
            <Search className={`absolute left-4 top-3.5 ${t.textMuted}`} size={18} />
            <input
              type="text"
              placeholder="Cercar per nom o equip..."
              className={`w-full pl-11 pr-4 py-3 border rounded-xl text-sm font-bold outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all ${t.input}`}
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className={`flex-1 overflow-auto rounded-3xl border relative ${isDark ? 'bg-slate-900/50 border-slate-700/50' : 'bg-white border-slate-200'}`}>
          <table className="w-full text-left min-w-[600px] border-collapse">
            <thead className={`text-xs font-black uppercase sticky top-0 z-10 ${t.tableHead}`}>
              <tr>
                <th className="px-6 py-5">Jugador</th>
                <th className="px-6 py-5">Equip</th>
                <th className="px-6 py-5 text-center">Posició</th>
                <th className="px-6 py-5 text-center">Edat</th>
                <th className="px-6 py-5 text-center">Nota</th>
                <th className="px-6 py-5 text-center">Accions</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-medium ${t.tableRowDivide}`}>
              {filteredPlayers.length === 0 ? (
                <tr><td colSpan="6" className={`px-6 py-20 text-center italic text-lg ${t.textMuted}`}>No s'han trobat jugadors.</td></tr>
              ) : (
                filteredPlayers.map(p => {
                  const stats = getPlayerStats(p.id);
                  return (
                    <tr key={p.id} className={`transition-colors group ${t.tableRowHover}`}>
                      <td className={`px-6 py-5 ${t.textMain}`}>
                        <div className="flex items-center gap-3">
                          <button className="font-bold group-hover:text-blue-500 transition-colors text-base text-left" onClick={() => setSelectedPlayer(p)}>{p.name}</button>
                          {p.comments && <Info size={16} className={`${t.textMuted} cursor-help`} title={p.comments} />}
                        </div>
                      </td>
                      <td className={`px-6 py-5 text-sm font-bold ${t.textMuted}`}>{p.team || '-'}</td>
                      <td className="px-6 py-5 text-center"><span className={`border px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>{p.position}</span></td>
                      <td className={`px-6 py-5 text-center text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{p.birthYear || '-'} {p.isU23 && <span title="Sots-23">✅</span>}</td>
                      <td className="px-6 py-5 text-center">
                        {stats.matches > 0 ? (
                          <span className={`text-sm px-3 py-1.5 rounded-lg font-black border ${stats.avgRating >= 7 ? (isDark ? 'bg-emerald-900/80 text-emerald-400 border-emerald-800' : 'bg-emerald-100 text-emerald-700 border-emerald-200') : stats.avgRating >= 5 ? (isDark ? 'bg-amber-900/80 text-amber-400 border-amber-800' : 'bg-amber-100 text-amber-700 border-amber-200') : (isDark ? 'bg-rose-900/80 text-rose-400 border-rose-800' : 'bg-rose-100 text-rose-700 border-rose-200')}`}>{stats.avgRating}</span>
                        ) : <span className={`text-sm ${t.textMuted}`}>-</span>}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleEdit(p)} className={`p-2.5 rounded-xl transition-all border ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-amber-900/40 hover:border-amber-700/50 text-slate-400 hover:text-amber-500' : 'bg-white border-slate-200 hover:bg-amber-50 hover:border-amber-200 text-slate-500 hover:text-amber-600'}`}><Edit2 size={16} /></button>
                          <button onClick={() => handleDelete(p.id)} className={`p-2.5 rounded-xl transition-all border ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-rose-900/40 hover:border-rose-700/50 text-slate-400 hover:text-rose-500' : 'bg-white border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-500 hover:text-rose-600'}`}><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
/* =====================================================================
   TAB 2: PARTITS (SCOUTING REPORTS)
===================================================================== */
function PartitsTab({ players, setPlayers, matchReports, setMatchReports, showToast, isDark }) {
  const t = getTheme(isDark);
  const createEmptySlots = (count, formation = null) => {
    const layout = formation ? getFormationPositions(formation) : Array(count).fill({ p: 'Desconeguda', d: '' });
    return Array.from({ length: count }, (_, i) => ({
      id: '', name: '', rating: '', comment: '',
      dorsal: layout[i]?.d || '', posicio: layout[i]?.p || 'Desconeguda'
    }));
  };
  const emptyReport = () => ({
    equipLocal: '', golsLocal: '', equipVisitant: '', golsVisitant: '',
    categoria: 'Senior', lliga: '', data: '',
    formacioLocal: '4-3-3', formacioVisitant: '4-3-3',
    titularsLocal: createEmptySlots(11, '4-3-3'), canvisLocal: createEmptySlots(5),
    titularsVisitant: createEmptySlots(11, '4-3-3'), canvisVisitant: createEmptySlots(5),
    top3: [{ name: '', id: '' }, { name: '', id: '' }, { name: '', id: '' }],
    notes: ''
  });
  const [report, setReport] = useState(emptyReport());
  const [showHistory, setShowHistory] = useState(false);
  const handleFormationChange = (teamKey, newFormation) => {
    setReport(prev => {
      const layout = getFormationPositions(newFormation);
      const listName = `titulars${teamKey}`;
      const newTitulars = prev[listName].map((slot, i) => ({ ...slot, posicio: layout[i]?.p || 'Desconeguda', dorsal: layout[i]?.d || '' }));
      return { ...prev, [`formacio${teamKey}`]: newFormation, [listName]: newTitulars };
    });
  };
  const handleSave = (e) => {
    e.preventDefault();
    if (!report.equipLocal || !report.equipVisitant) return showToast("Falta el nom dels equips.");
    let updatedPlayers = [...players];
    let playersAdded = 0;
    const processSlots = (slots, teamName) => {
      return slots.map(slot => {
        if (slot.name && !slot.id) {
          const existing = updatedPlayers.find(p => p.name.toLowerCase() === slot.name.toLowerCase());
          if (existing) return { ...slot, id: existing.id };
          const newId = Date.now().toString() + Math.random().toString(36).slice(2, 7);
          const newPlayer = {
            id: newId, name: slot.name, team: teamName, position: slot.posicio || 'Desconeguda',
            birthYear: '', age: '', isU23: false, history: [], comments: `Auto-creat des d'informe d'scouting (${report.data || 'sense data'})`,
            linkPreferente: '', linkFCF: ''
          };
          updatedPlayers.push(newPlayer);
          playersAdded++;
          return { ...slot, id: newId };
        }
        return slot;
      });
    };
    const newReport = {
      ...report,
      titularsLocal: processSlots(report.titularsLocal, report.equipLocal),
      canvisLocal: processSlots(report.canvisLocal, report.equipLocal),
      titularsVisitant: processSlots(report.titularsVisitant, report.equipVisitant),
      canvisVisitant: processSlots(report.canvisVisitant, report.equipVisitant),
      id: Date.now().toString()
    };
    if (playersAdded > 0) {
      setPlayers(updatedPlayers);
      showToast(`Informe desat. ${playersAdded} jugador(s) nou(s) afegit(s) a la BD.`);
    } else {
      showToast("Informe de partit desat.");
    }
    setMatchReports([...matchReports, newReport]);
    setReport(emptyReport());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const updateSlotObj = (teamKey, typeKey, index, newSlotObj) => {
    setReport(prev => {
      const listName = `${typeKey}${teamKey}`;
      const newList = [...prev[listName]];
      newList[index] = newSlotObj;
      return { ...prev, [listName]: newList };
    });
  };
  const updateTop3 = (index, value) => {
    const matched = players.find(p => p.name.toLowerCase() === value.toLowerCase());
    setReport(prev => {
      const newTop3 = [...prev.top3];
      newTop3[index] = { name: value, id: matched ? matched.id : '' };
      return { ...prev, top3: newTop3 };
    });
  };
  const handleDeleteReport = (id) => {
    if (window.confirm("Eliminar aquest informe permanentment?")) {
      setMatchReports(matchReports.filter(r => r.id !== id));
      showToast("Informe eliminat.");
    }
  };
  return (
    <div className={`w-full mx-auto p-6 sm:p-10 rounded-[40px] border ${t.card}`}>
      <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
        <h2 className={`text-2xl sm:text-3xl font-black uppercase tracking-tighter ${t.textHighlight}`}>Informe d'Scouting</h2>
        <button onClick={() => setShowHistory(!showHistory)} className={`px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest border transition-colors ${isDark ? 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600' : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'}`}>
          {showHistory ? 'Tornar a l\'informe' : `Historial (${matchReports.length})`}
        </button>
      </div>
      {showHistory ? (
        <div className="space-y-4">
          {matchReports.length === 0 ? (
            <p className={`text-center italic p-12 rounded-3xl border ${t.panel} ${t.textMuted}`}>Encara no hi ha informes desats.</p>
          ) : (
            matchReports.slice().reverse().map(r => (
              <div key={r.id} className={`p-6 rounded-3xl border ${t.card}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className={`text-xs font-black uppercase tracking-widest mb-1 ${t.textMuted}`}>{r.data || 'Sense data'} • {r.lliga || 'Lliga'} • {r.categoria}</p>
                    <h3 className={`text-xl font-black ${t.textMain}`}>{r.equipLocal} <span className={t.textHighlight}>{r.golsLocal}-{r.golsVisitant}</span> {r.equipVisitant}</h3>
                  </div>
                  <button onClick={() => handleDeleteReport(r.id)} className={`p-2.5 rounded-xl transition-all border ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400' : 'bg-white border-slate-200 hover:bg-rose-50 text-slate-500 hover:text-rose-600'}`}><Trash2 size={16} /></button>
                </div>
                {r.notes && <p className={`mt-3 text-sm italic ${t.textMuted}`}>"{r.notes}"</p>}
                {r.top3.some(t => t.name) && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {r.top3.filter(t => t.name).map((t, idx) => (
                      <span key={idx} className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest border ${idx === 0 ? 'bg-amber-100 border-amber-300 text-amber-800' : idx === 1 ? 'bg-slate-200 border-slate-300 text-slate-700' : 'bg-orange-100 border-orange-300 text-orange-800'}`}>
                        #{idx + 1} {t.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-10 pb-8 max-w-[1600px] mx-auto">
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 p-8 rounded-[30px] border ${t.panel}`}>
            <div><label className={`block text-xs font-black mb-2 uppercase ${t.textMuted}`}>Lliga</label><input className={`w-full border rounded-xl p-4 text-base font-bold outline-none focus:border-blue-500 transition-colors ${t.inputSoft}`} value={report.lliga} onChange={e => setReport({ ...report, lliga: e.target.value })} placeholder="Ex: Tercera RFEF" /></div>
            <div>
              <label className={`block text-xs font-black mb-2 uppercase ${t.textMuted}`}>Categoria</label>
              <select className={`w-full border rounded-xl p-4 text-base font-bold outline-none focus:border-blue-500 transition-colors ${t.inputSoft}`} value={report.categoria} onChange={e => setReport({ ...report, categoria: e.target.value })}>
                <option value="Senior">Senior</option><option value="Juvenil">Juvenil</option><option value="Cadet">Cadet</option>
              </select>
            </div>
            <div><label className={`block text-xs font-black mb-2 uppercase ${t.textMuted}`}>Data</label><input type="date" className={`w-full border rounded-xl p-4 text-base font-bold outline-none focus:border-blue-500 transition-colors ${t.inputSoft} ${isDark ? '[color-scheme:dark]' : ''}`} value={report.data} onChange={e => setReport({ ...report, data: e.target.value })} /></div>
          </div>
          <div className={`flex flex-col lg:flex-row gap-8 items-center justify-between p-8 sm:p-12 rounded-[40px] border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="w-full lg:w-1/3 text-center">
              <label className={`block text-[11px] font-black mb-3 uppercase tracking-widest ${t.textMuted}`}>Equip Local</label>
              <input required className={`w-full bg-transparent border-b-2 text-2xl sm:text-3xl font-black text-center outline-none mb-6 focus:border-blue-500 transition-colors pb-2 ${isDark ? 'border-slate-700 text-white placeholder-slate-700' : 'border-slate-200 text-slate-900 placeholder-slate-300'}`} value={report.equipLocal} onChange={e => setReport({ ...report, equipLocal: e.target.value })} placeholder="Nom Equip" />
              <div className="flex justify-center">
                <select className={`text-xs font-bold px-4 py-2 rounded-xl outline-none border cursor-pointer transition-colors ${isDark ? 'bg-slate-800 text-blue-400 border-slate-700 hover:bg-slate-700' : 'bg-slate-50 text-blue-700 border-slate-200 hover:bg-slate-100'}`} value={report.formacioLocal} onChange={e => handleFormationChange('Local', e.target.value)}>
                  <option value="4-3-3">F: 4-3-3</option><option value="4-4-2">F: 4-4-2</option><option value="4-2-3-1">F: 4-2-3-1</option><option value="3-5-2">F: 3-5-2</option><option value="5-3-2">F: 5-3-2</option><option value="3-4-3">F: 3-4-3</option>
                </select>
              </div>
            </div>
            <div className={`flex items-center gap-4 sm:gap-6 shrink-0 p-4 sm:p-6 rounded-3xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <input type="number" className={`w-20 h-20 sm:w-28 sm:h-28 text-4xl sm:text-6xl font-black rounded-2xl text-center outline-none border focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all ${isDark ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-slate-900 border-slate-200'}`} value={report.golsLocal} onChange={e => setReport({ ...report, golsLocal: e.target.value })} />
              <span className={`text-4xl sm:text-6xl font-black ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>-</span>
              <input type="number" className={`w-20 h-20 sm:w-28 sm:h-28 text-4xl sm:text-6xl font-black rounded-2xl text-center outline-none border focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all ${isDark ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-slate-900 border-slate-200'}`} value={report.golsVisitant} onChange={e => setReport({ ...report, golsVisitant: e.target.value })} />
            </div>
            <div className="w-full lg:w-1/3 text-center">
              <label className={`block text-[11px] font-black mb-3 uppercase tracking-widest ${t.textMuted}`}>Equip Visitant</label>
              <input required className={`w-full bg-transparent border-b-2 text-2xl sm:text-3xl font-black text-center outline-none mb-6 focus:border-blue-500 transition-colors pb-2 ${isDark ? 'border-slate-700 text-white placeholder-slate-700' : 'border-slate-200 text-slate-900 placeholder-slate-300'}`} value={report.equipVisitant} onChange={e => setReport({ ...report, equipVisitant: e.target.value })} placeholder="Nom Equip" />
              <div className="flex justify-center">
                <select className={`text-xs font-bold px-4 py-2 rounded-xl outline-none border cursor-pointer transition-colors ${isDark ? 'bg-slate-800 text-blue-400 border-slate-700 hover:bg-slate-700' : 'bg-slate-50 text-blue-700 border-slate-200 hover:bg-slate-100'}`} value={report.formacioVisitant} onChange={e => handleFormationChange('Visitant', e.target.value)}>
                  <option value="4-3-3">F: 4-3-3</option><option value="4-4-2">F: 4-4-2</option><option value="4-2-3-1">F: 4-2-3-1</option><option value="3-5-2">F: 3-5-2</option><option value="5-3-2">F: 5-3-2</option><option value="3-4-3">F: 3-4-3</option>
                </select>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className={`border rounded-[30px] p-6 sm:p-8 ${t.card}`}>
              <h3 className={`text-xl font-black mb-8 text-center uppercase tracking-tighter py-4 rounded-2xl ${t.textHighlight} ${t.panel}`}>{report.equipLocal || 'LOCAL'}</h3>
              <LineupList report={report} players={players} updateSlotObj={updateSlotObj} teamKey="Local" typeKey="titulars" title={`XI Titular (${report.formacioLocal})`} isTitular={true} isDark={isDark} />
              <div className={`h-px my-8 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
              <LineupList report={report} players={players} updateSlotObj={updateSlotObj} teamKey="Local" typeKey="canvis" title="Substitucions" isTitular={false} isDark={isDark} />
            </div>
            <div className={`border rounded-[30px] p-6 sm:p-8 ${t.card}`}>
              <h3 className={`text-xl font-black mb-8 text-center uppercase tracking-tighter py-4 rounded-2xl ${t.textHighlight} ${t.panel}`}>{report.equipVisitant || 'VISITANT'}</h3>
              <LineupList report={report} players={players} updateSlotObj={updateSlotObj} teamKey="Visitant" typeKey="titulars" title={`XI Titular (${report.formacioVisitant})`} isTitular={true} isDark={isDark} />
              <div className={`h-px my-8 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
              <LineupList report={report} players={players} updateSlotObj={updateSlotObj} teamKey="Visitant" typeKey="canvis" title="Substitucions" isTitular={false} isDark={isDark} />
            </div>
          </div>
          <div className={`p-8 rounded-[30px] border mt-12 ${t.panel}`}>
            <h3 className={`text-xl font-black uppercase tracking-widest border-b-2 pb-4 mb-6 flex items-center gap-3 ${isDark ? 'text-amber-400 border-slate-800' : 'text-amber-600 border-slate-200'}`}>
              <Trophy size={24} /> Top 3 del Partit (MVP)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[0, 1, 2].map(idx => (
                <div key={idx} className={`p-6 rounded-2xl border flex flex-col justify-center ${idx === 0 ? (isDark ? 'bg-amber-900/20 border-amber-500/50' : 'bg-amber-50 border-amber-300') : idx === 1 ? (isDark ? 'bg-slate-800 border-slate-500/50' : 'bg-slate-100 border-slate-300') : (isDark ? 'bg-orange-900/20 border-orange-700/50' : 'bg-orange-50 border-orange-300')}`}>
                  <label className={`text-xs font-black uppercase mb-3 flex items-center gap-2 ${idx === 0 ? (isDark ? 'text-amber-400' : 'text-amber-700') : idx === 1 ? (isDark ? 'text-slate-300' : 'text-slate-600') : (isDark ? 'text-orange-400' : 'text-orange-700')}`}>
                    MVP #{idx + 1}
                  </label>
                  <input
                    list={`mvp-list-${idx}`} placeholder="Nom del jugador..."
                    className={`w-full text-sm p-4 rounded-xl border outline-none font-bold focus:ring-2 focus:ring-blue-500 transition-all ${isDark ? 'bg-slate-950 text-white border-transparent placeholder-slate-600' : 'bg-white text-slate-900 border-slate-200'}`}
                    value={report.top3[idx].name} onChange={e => updateTop3(idx, e.target.value)}
                  />
                  <datalist id={`mvp-list-${idx}`}>
                    {players.map(p => <option key={p.id} value={p.name}>{p.team ? `(${p.team})` : ''}</option>)}
                  </datalist>
                </div>
              ))}
            </div>
          </div>
          <div className={`p-8 rounded-[30px] border ${t.panel}`}>
            <label className={`block text-sm font-black mb-4 uppercase tracking-widest flex items-center gap-2 ${t.textMuted}`}><FileText size={18} /> Resum Global / Avaluació Col·lectiva</label>
            <textarea className={`w-full min-h-[160px] resize-none border rounded-2xl p-6 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium text-base ${t.inputSoft}`} value={report.notes} onChange={e => setReport({ ...report, notes: e.target.value })} placeholder="Escriu les teves notes, conclusions i observacions del partit aquí..."></textarea>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white p-6 rounded-[20px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-500 transition-all active:scale-95 text-lg">
            Desar Informe Definitiu
          </button>
        </form>
      )}
    </div>
  );
}
/* =====================================================================
   TAB 3: PROSPECTE (DRAFT BOARD)
===================================================================== */
function ProspecteTab({ players, squadData, setSquadData, selectedTeam, setSelectedTeam, isDark }) {
  const [isVisualMode, setIsVisualMode] = useState(false);
  const currentSquad = squadData[selectedTeam];
  const t = getTheme(isDark);
  const categoriesOrder = selectedTeam === 'FILIAL'
    ? ['porters', 'laterals', 'centralsD', 'centralsE', 'migcentres', 'interiorsD', 'interiorsE', 'extrems', 'davanters', 'invitacio']
    : ['porters', 'laterals', 'centralsD', 'centralsE', 'migcentres', 'interiorsD', 'interiorsE', 'extrems', 'davanters'];
  const updateSlot = (cat, idx, value) => {
    setSquadData(prev => ({
      ...prev,
      [selectedTeam]: { ...prev[selectedTeam], [cat]: prev[selectedTeam][cat].map((v, i) => i === idx ? value : v) }
    }));
  };
  const getFilteredPlayers = (cat) => {
    return players.filter(p => {
      const pos = (p.position || '').toLowerCase();
      switch (cat) {
        case 'porters': return pos === 'porter';
        case 'laterals': return pos === 'lateral d' || pos === 'lateral e' || pos === 'carriler d' || pos === 'carriler e';
        case 'centralsD':
        case 'centralsE': return pos === 'central';
        case 'migcentres': return pos === 'migcentre';
        case 'interiorsD':
        case 'interiorsE': return pos === 'interior' || pos === 'mitjapunta';
        case 'extrems': return pos === 'extrem';
        case 'davanters': return pos === 'davanter';
        case 'invitacio': return true;
        default: return true;
      }
    });
  };
  const getSurname = (val) => {
    const p = players.find(p => p.id === val);
    if (!p || !p.name) return null;
    const parts = p.name.trim().split(/\s+/).filter(Boolean);
    return parts[parts.length - 1];
  };
  const getSurnames = (idsArray) => idsArray.map(id => getSurname(id)).filter(Boolean);
  const xi = {
    por: { main: currentSquad.porters[0], subs: [currentSquad.porters[1], currentSquad.porters[2], currentSquad.porters[3]] },
    ld: { main: currentSquad.laterals[0], subs: [currentSquad.laterals[2], currentSquad.laterals[4]] },
    li: { main: currentSquad.laterals[1], subs: [currentSquad.laterals[3]] },
    crd: { main: currentSquad.centralsD[0], subs: [currentSquad.centralsD[1], currentSquad.centralsD[2]] },
    cri: { main: currentSquad.centralsE[0], subs: [currentSquad.centralsE[1], currentSquad.centralsE[2]] },
    piv: { main: currentSquad.migcentres[0], subs: [currentSquad.migcentres[1], currentSquad.migcentres[2], currentSquad.migcentres[3]] },
    intd: { main: currentSquad.interiorsD[0], subs: [currentSquad.interiorsD[1], currentSquad.interiorsD[2]] },
    inti: { main: currentSquad.interiorsE[0], subs: [currentSquad.interiorsE[1], currentSquad.interiorsE[2]] },
    ed: { main: currentSquad.extrems[0], subs: [currentSquad.extrems[2], currentSquad.extrems[4]] },
    ei: { main: currentSquad.extrems[1], subs: [currentSquad.extrems[3], currentSquad.extrems[5]] },
    dc: { main: currentSquad.davanters ? currentSquad.davanters[0] : '', subs: currentSquad.davanters ? [currentSquad.davanters[1], currentSquad.davanters[2], currentSquad.davanters[3]] : [] }
  };
  const allAssignedIds = [];
  categoriesOrder.forEach(cat => {
    if (currentSquad[cat]) {
      currentSquad[cat].forEach(id => { if (id) allAssignedIds.push({ id, cat }); });
    }
  });
  const pitchMappedIds = Object.values(xi).flatMap(pos => [pos.main, ...pos.subs]).filter(Boolean);
  const suplents = allAssignedIds.filter(item => !pitchMappedIds.includes(item.id));
  return (
    <div className="space-y-8 w-full mx-auto">
      <div className={`flex flex-col md:flex-row justify-between items-center p-4 sm:p-6 rounded-3xl border gap-4 ${t.card}`}>
        <div className={`flex p-1.5 rounded-2xl w-full md:w-auto overflow-x-auto ${t.panel}`}>
          {['PRIMER EQUIP', 'FILIAL'].map(team => (
            <button key={team} onClick={() => { setSelectedTeam(team); setIsVisualMode(false); }} className={`px-6 sm:px-8 py-3 rounded-xl font-black text-xs transition-all shrink-0 ${selectedTeam === team ? 'bg-blue-600 text-white shadow-md' : (isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-white')}`}>{team}</button>
          ))}
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-3">
            <LayoutTemplate size={24} className="text-blue-500 hidden sm:block" />
            <span className={`text-lg sm:text-xl font-black uppercase tracking-tighter ${t.textHighlight}`}>Prospecte {selectedTeam}</span>
          </div>
          <button
            onClick={() => setIsVisualMode(!isVisualMode)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shrink-0 ${isVisualMode ? 'bg-amber-500 text-white hover:bg-amber-400' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
          >
            {isVisualMode ? <><Edit2 size={16} /> <span className="hidden sm:inline">Editar</span></> : <><Eye size={16} /> <span className="hidden sm:inline">Veure Camp</span></>}
          </button>
        </div>
      </div>
      {isVisualMode ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className={`lg:col-span-3 p-4 sm:p-8 rounded-[40px] border flex justify-center items-center ${t.card}`}>
            <div className={`relative w-full max-w-[800px] aspect-[3/4] sm:aspect-[4/4.5] rounded-3xl overflow-hidden border-8 shadow-[inset_0_0_50px_rgba(0,0,0,0.5)] ${isDark ? 'bg-emerald-800 border-emerald-950' : 'bg-emerald-600 border-emerald-800'}`}>
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 10%, rgba(0,0,0,${isDark ? '0.4' : '0.2'}) 10%, rgba(0,0,0,${isDark ? '0.4' : '0.2'}) 20%)` }}></div>
              <div className={`absolute inset-4 sm:inset-8 border-2 rounded-sm ${isDark ? 'border-white/30' : 'border-white/50'}`}></div>
              <div className={`absolute top-1/2 left-0 w-full h-0.5 ${isDark ? 'bg-white/30' : 'bg-white/50'}`}></div>
              <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 sm:w-48 sm:h-48 border-2 rounded-full ${isDark ? 'border-white/30' : 'border-white/50'}`}></div>
              <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${isDark ? 'bg-white/60' : 'bg-white'}`}></div>
              <div className={`absolute top-4 sm:top-8 left-1/2 -translate-x-1/2 w-48 sm:w-64 h-24 sm:h-32 border-2 border-t-0 ${isDark ? 'border-white/30' : 'border-white/50'}`}></div>
              <div className={`absolute top-4 sm:top-8 left-1/2 -translate-x-1/2 w-24 sm:w-32 h-8 sm:h-12 border-2 border-t-0 ${isDark ? 'border-white/30' : 'border-white/50'}`}></div>
              <div className={`absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 w-48 sm:w-64 h-24 sm:h-32 border-2 border-b-0 ${isDark ? 'border-white/30' : 'border-white/50'}`}></div>
              <div className={`absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 w-24 sm:w-32 h-8 sm:h-12 border-2 border-b-0 ${isDark ? 'border-white/30' : 'border-white/50'}`}></div>
              <div className="absolute inset-0 p-4 sm:p-8 flex flex-col justify-between items-center z-10 py-10 sm:py-16">
                <div className="w-full flex justify-around items-start">
                  {getSurname(xi.ei.main) ? <EscapuladaIcon mainName={getSurname(xi.ei.main)} subNames={getSurnames(xi.ei.subs)} /> : <div className="w-20 sm:w-24"></div>}
                  <div className="mt-2 sm:mt-4">{getSurname(xi.dc.main) ? <EscapuladaIcon mainName={getSurname(xi.dc.main)} subNames={getSurnames(xi.dc.subs)} /> : <div className="w-20 sm:w-24"></div>}</div>
                  {getSurname(xi.ed.main) ? <EscapuladaIcon mainName={getSurname(xi.ed.main)} subNames={getSurnames(xi.ed.subs)} /> : <div className="w-20 sm:w-24"></div>}
                </div>
                <div className="w-full flex justify-around px-8 sm:px-32">
                  {getSurname(xi.inti.main) ? <EscapuladaIcon mainName={getSurname(xi.inti.main)} subNames={getSurnames(xi.inti.subs)} /> : <div className="w-20 sm:w-24"></div>}
                  {getSurname(xi.intd.main) ? <EscapuladaIcon mainName={getSurname(xi.intd.main)} subNames={getSurnames(xi.intd.subs)} /> : <div className="w-20 sm:w-24"></div>}
                </div>
                <div className="-mt-4 sm:-mt-8">
                  {getSurname(xi.piv.main) ? <EscapuladaIcon mainName={getSurname(xi.piv.main)} subNames={getSurnames(xi.piv.subs)} /> : <div className="w-20 sm:w-24"></div>}
                </div>
                <div className="w-full flex justify-between items-start px-2 sm:px-8">
                  {getSurname(xi.li.main) ? <EscapuladaIcon mainName={getSurname(xi.li.main)} subNames={getSurnames(xi.li.subs)} /> : <div className="w-20 sm:w-24"></div>}
                  <div className="flex gap-4 sm:gap-16 mt-2 sm:mt-4">
                    {getSurname(xi.cri.main) ? <EscapuladaIcon mainName={getSurname(xi.cri.main)} subNames={getSurnames(xi.cri.subs)} /> : <div className="w-20 sm:w-24"></div>}
                    {getSurname(xi.crd.main) ? <EscapuladaIcon mainName={getSurname(xi.crd.main)} subNames={getSurnames(xi.crd.subs)} /> : <div className="w-20 sm:w-24"></div>}
                  </div>
                  {getSurname(xi.ld.main) ? <EscapuladaIcon mainName={getSurname(xi.ld.main)} subNames={getSurnames(xi.ld.subs)} /> : <div className="w-20 sm:w-24"></div>}
                </div>
                <div className="mb-2 sm:mb-4">
                  {getSurname(xi.por.main) ? <EscapuladaIcon mainName={getSurname(xi.por.main)} subNames={getSurnames(xi.por.subs)} /> : <div className="w-20 sm:w-24"></div>}
                </div>
              </div>
            </div>
          </div>
          <div className={`p-6 rounded-[40px] border max-h-[800px] overflow-y-auto ${t.card}`}>
            <h3 className={`text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2 border-b-2 pb-4 ${isDark ? 'text-white border-slate-700' : 'text-slate-800 border-slate-200'}`}>
              <Users size={18} className="text-blue-400" /> Banqueta / Proves
            </h3>
            {suplents.length === 0 ? (
              <p className={`text-xs italic text-center p-8 rounded-2xl border border-dashed ${isDark ? 'text-slate-500 bg-slate-900/50 border-slate-700' : 'text-slate-500 bg-slate-50 border-slate-200'}`}>Tots els jugadors assignats tenen posició al camp.</p>
            ) : (
              <div className="space-y-4">
                {suplents.map((suplent, idx) => {
                  const p = players.find(player => player.id === suplent.id);
                  if (!p) return null;
                  return (
                    <div key={idx} className={`flex items-center gap-3 p-3 rounded-2xl border transition-colors ${isDark ? 'bg-slate-900 border-slate-700/50 hover:border-slate-600' : 'bg-slate-50 border-slate-200 hover:border-blue-300'}`}>
                      <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500 text-blue-500 flex items-center justify-center font-black text-[10px] shrink-0">
                        {p.position.substring(0, 3).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className={`font-bold text-sm truncate ${t.textMain}`}>{p.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${isDark ? 'text-slate-500 bg-slate-800' : 'text-slate-600 bg-white border border-slate-200'}`}>{p.age || '?'} anys</span>
                          {suplent.cat === 'invitacio' && <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${isDark ? 'text-amber-500 bg-amber-900/30 border-amber-800/50' : 'text-amber-700 bg-amber-100 border-amber-200'}`}>A prova</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {categoriesOrder.map((cat) => {
            const slots = currentSquad[cat] || [];
            const filteredPlayers = getFilteredPlayers(cat);
            return (
              <div key={cat} className={`p-6 rounded-3xl border transition-colors ${t.card}`}>
                <h3 className={`text-[11px] font-black uppercase tracking-widest mb-5 flex justify-between items-center border-b pb-3 ${isDark ? 'text-blue-300 border-slate-700' : 'text-blue-700 border-slate-200'}`}>
                  {CATEGORY_LABELS[cat] || cat} <span className={`px-3 py-1 rounded-lg border ${isDark ? 'bg-slate-900 text-slate-300 border-slate-700/50' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>{slots.filter(x => x).length} / {slots.length}</span>
                </h3>
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                  {slots.map((val, i) => {
                    const displayValue = players.find(p => p.id === val)?.name || val;
                    return (
                      <div key={i} className={`relative flex items-center group rounded-xl border focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all overflow-hidden ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <span className={`w-8 text-[10px] font-black text-center py-3 border-r ${isDark ? 'text-slate-500 bg-slate-800 border-slate-700' : 'text-slate-500 bg-slate-50 border-slate-200'}`}>{i + 1}</span>
                        <input
                          type="text" list={`list-${selectedTeam}-${cat}-${i}`}
                          className={`flex-1 p-3 pr-10 border-none text-xs sm:text-sm font-bold outline-none bg-transparent ${val ? (isDark ? 'text-blue-300' : 'text-blue-800') : (isDark ? 'text-slate-400 italic' : 'text-slate-400 italic')}`}
                          placeholder={cat === 'invitacio' ? "Jugador a prova..." : "Lliure o Cercar..."}
                          value={displayValue}
                          onChange={(e) => {
                            const typed = e.target.value;
                            const matched = filteredPlayers.find(p => p.name.toLowerCase() === typed.toLowerCase());
                            updateSlot(cat, i, matched ? matched.id : typed);
                          }}
                        />
                        <datalist id={`list-${selectedTeam}-${cat}-${i}`}>{filteredPlayers.map(p => <option key={p.id} value={p.name} />)}</datalist>
                        {val && (
                          <button onClick={() => updateSlot(cat, i, '')} className={`absolute right-0 top-0 bottom-0 px-3 transition-colors flex items-center justify-center ${isDark ? 'text-slate-500 hover:text-rose-400 hover:bg-slate-800' : 'text-slate-400 hover:text-rose-500 hover:bg-slate-50'}`} title="Buidar"><X size={16} /></button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
/* =====================================================================
   TAB 4: PLANTILLA EVAL
===================================================================== */
function PlantillaEvalTab({ players, plantillaActual, setPlantillaActual, selectedTeam, setSelectedTeam, evaluations, setEvaluations, showToast, isDark }) {
  const [searchAdd, setSearchAdd] = useState('');
  const [viewMode, setViewMode] = useState('cards');
  const t = getTheme(isDark);
  const currentIds = plantillaActual[selectedTeam] || [];
  const handleAddPlayer = () => {
    if (!searchAdd.trim()) return;
    const matched = players.find(p => p.name.toLowerCase() === searchAdd.toLowerCase());
    if (matched) {
      if (!currentIds.includes(matched.id)) {
        setPlantillaActual(prev => ({ ...prev, [selectedTeam]: [...(prev[selectedTeam] || []), matched.id] }));
        setSearchAdd('');
        showToast('Jugador afegit a la plantilla.');
      } else { showToast('El jugador ja està a la plantilla.'); }
    } else { showToast("No s'ha trobat el jugador a la BD."); }
  };
  const handleRemovePlayer = (id) => {
    if (window.confirm("Treure jugador d'aquesta avaluació?")) {
      setPlantillaActual(prev => ({ ...prev, [selectedTeam]: prev[selectedTeam].filter(pid => pid !== id) }));
    }
  };
  const handleEvalChange = (id, field, value) => {
    setEvaluations(prev => ({ ...prev, [id]: { ...(prev[id] || { cost: 50, disp: 50, exp: 50, rend: 50, decisio: null }), [field]: Number(value) } }));
  };
  const handleDecision = (id, decision) => {
    setEvaluations(prev => ({ ...prev, [id]: { ...(prev[id] || { cost: 50, disp: 50, exp: 50, rend: 50 }), decisio: decision } }));
    showToast(`Decisió: ${decision}`);
  };
  const getAverage = (evalData) => {
    const data = evalData || { cost: 50, disp: 50, exp: 50, rend: 50 };
    return Math.round((data.cost + data.disp + data.exp + data.rend) / 4);
  };
  const getCardStyle = (decisio) => {
    if (isDark) {
      switch (decisio) {
        case 'Renovació': return 'bg-emerald-900/20 border-emerald-500/40';
        case 'Cessió': return 'bg-amber-900/20 border-amber-500/40';
        case 'Baixa': return 'bg-rose-900/20 border-rose-500/40';
        case 'Ascens': return 'bg-blue-900/20 border-blue-500/40';
        default: return 'bg-slate-800 border-slate-700 hover:border-slate-600';
      }
    } else {
      switch (decisio) {
        case 'Renovació': return 'bg-emerald-50 border-emerald-400';
        case 'Cessió': return 'bg-amber-50 border-amber-400';
        case 'Baixa': return 'bg-rose-50 border-rose-400';
        case 'Ascens': return 'bg-blue-50 border-blue-400';
        default: return 'bg-white border-slate-200 hover:border-blue-300';
      }
    }
  };
  const getRowStyle = (decisio) => {
    if (isDark) {
      switch (decisio) {
        case 'Renovació': return 'bg-emerald-900/40 border-l-[6px] border-l-emerald-500 text-emerald-100';
        case 'Cessió': return 'bg-amber-900/40 border-l-[6px] border-l-amber-500 text-amber-100';
        case 'Baixa': return 'bg-rose-900/40 border-l-[6px] border-l-rose-500 text-rose-100';
        case 'Ascens': return 'bg-blue-900/40 border-l-[6px] border-l-blue-500 text-blue-100';
        default: return 'bg-slate-800 border-l-[6px] border-l-slate-600 text-slate-300';
      }
    } else {
      switch (decisio) {
        case 'Renovació': return 'bg-emerald-50 border-l-[6px] border-l-emerald-500 text-emerald-900';
        case 'Cessió': return 'bg-amber-50 border-l-[6px] border-l-amber-500 text-amber-900';
        case 'Baixa': return 'bg-rose-50 border-l-[6px] border-l-rose-500 text-rose-900';
        case 'Ascens': return 'bg-blue-50 border-l-[6px] border-l-blue-500 text-blue-900';
        default: return 'bg-white border-l-[6px] border-l-slate-300 text-slate-800';
      }
    }
  };
  const sortedIds = [...currentIds].sort((a, b) => getAverage(evaluations[b]) - getAverage(evaluations[a]));
  return (
    <div className="space-y-8 w-full mx-auto">
      <div className={`flex flex-col md:flex-row justify-between items-center p-4 sm:p-6 rounded-3xl border gap-4 ${t.card}`}>
        <div className={`flex p-1.5 rounded-2xl w-full md:w-auto overflow-x-auto ${t.panel}`}>
          {['PRIMER EQUIP', 'FILIAL'].map(team => (
            <button key={team} onClick={() => { setSelectedTeam(team); setViewMode('cards'); }} className={`px-6 sm:px-8 py-3 rounded-xl font-black text-xs transition-all shrink-0 ${selectedTeam === team ? 'bg-blue-600 text-white shadow-md' : (isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-white')}`}>{team}</button>
          ))}
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-3">
            {viewMode === 'cards' ? <Shield size={24} className="text-blue-500 hidden sm:block" /> : <Trophy size={24} className="text-amber-500 hidden sm:block" />}
            <span className={`text-lg sm:text-xl font-black uppercase tracking-tighter ${t.textHighlight}`}>Plantilla {selectedTeam}</span>
          </div>
          <button
            onClick={() => setViewMode(v => v === 'cards' ? 'leaderboard' : 'cards')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shrink-0 ${viewMode === 'cards' ? 'bg-indigo-600 text-white hover:bg-indigo-500' : (isDark ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-200 text-slate-800 hover:bg-slate-300')}`}
          >
            {viewMode === 'cards' ? <><ListOrdered size={16} /> <span className="hidden sm:inline">Classificació</span></> : <><SlidersHorizontal size={16} /> <span className="hidden sm:inline">Avaluació</span></>}
          </button>
        </div>
      </div>
      {viewMode === 'cards' && (
        <div className={`flex flex-col md:flex-row items-center gap-4 p-6 rounded-3xl border ${t.card}`}>
          <div className="flex-1 w-full relative">
            <Search className={`absolute left-5 top-4 ${t.textMuted}`} size={20} />
            <input
              list="all-players-list" className={`w-full pl-14 pr-4 py-4 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 border ${t.input}`}
              placeholder="Cercar a la BD i afegir jugador..."
              value={searchAdd} onChange={e => setSearchAdd(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddPlayer())}
            />
            <datalist id="all-players-list">{players.map(p => <option key={p.id} value={p.name} />)}</datalist>
          </div>
          <button onClick={handleAddPlayer} className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shrink-0">
            Afegir
          </button>
        </div>
      )}
      {currentIds.length === 0 && (
        <div className={`text-center py-20 rounded-3xl border ${t.panel}`}>
          <Shield size={48} className={`mx-auto mb-4 ${t.textMuted}`} />
          <p className={`font-medium text-lg ${t.textMuted}`}>La llista d'avaluació està buida.<br />Afegeix jugadors de la base de dades.</p>
        </div>
      )}
      {currentIds.length > 0 && viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {currentIds.map(id => {
            const p = players.find(p => p.id === id);
            if (!p) return null;
            const evalData = evaluations[id] || { cost: 50, disp: 50, exp: 50, rend: 50, decisio: null };
            const avg = getAverage(evalData);
            return (
              <div key={id} className={`relative p-6 sm:p-8 rounded-[30px] border-2 transition-all duration-300 ${getCardStyle(evalData.decisio)}`}>
                <button onClick={() => handleRemovePlayer(id)} className={`absolute top-4 right-4 rounded-full p-2 transition-colors ${isDark ? 'text-slate-400 hover:text-rose-400 hover:bg-slate-900/50' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'}`} title="Treure">
                  <X size={18} />
                </button>
                <div className={`flex justify-between items-start mb-6 border-b pb-4 pr-6 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                  <div>
                    <h3 className={`text-xl font-black mb-1 leading-tight ${t.textMain}`}>{p.name}</h3>
                    <p className={`text-[10px] font-black uppercase tracking-widest inline-block px-2 py-1 rounded border ${isDark ? 'text-blue-400 bg-blue-900/30 border-blue-800/50' : 'text-blue-700 bg-blue-50 border-blue-200'}`}>{p.position} • {p.age || '?'} ANYS</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-3xl font-black ${t.textMain}`}>{avg}</span>
                  </div>
                </div>
                <div className="space-y-5 mb-8">
                  {[
                    { label: 'Relació Cost / Rendiment', field: 'cost', val: evalData.cost },
                    { label: 'Disponibilitat Fís/Mental', field: 'disp', val: evalData.disp },
                    { label: 'Expectativa Prèvia', field: 'exp', val: evalData.exp },
                    { label: 'Rendiment Final Real', field: 'rend', val: evalData.rend }
                  ].map(item => (
                    <div key={item.field} className="flex flex-col gap-1.5">
                      <div className={`flex justify-between text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        <span>{item.label}</span>
                        <span className={`px-1.5 rounded ${isDark ? 'text-white bg-slate-900' : 'text-slate-900 bg-slate-100'}`}>{item.val}</span>
                      </div>
                      <input
                        type="range" min="1" max="100"
                        value={item.val} onChange={e => handleEvalChange(id, item.field, e.target.value)}
                        className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-600 ${isDark ? 'bg-black/30' : 'bg-slate-200'}`}
                      />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-auto">
                  {(() => {
                    const decisions = [
                      { label: 'Renovació', active: 'bg-emerald-600 text-white shadow-md', inactiveLight: 'bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200' },
                      { label: 'Cessió', active: 'bg-amber-500 text-white shadow-md', inactiveLight: 'bg-slate-50 text-slate-600 hover:bg-amber-50 hover:text-amber-700 border border-slate-200' },
                      { label: 'Baixa', active: 'bg-rose-600 text-white shadow-md', inactiveLight: 'bg-slate-50 text-slate-600 hover:bg-rose-50 hover:text-rose-700 border border-slate-200' },
                      { label: 'Ascens', active: 'bg-blue-600 text-white shadow-md', inactiveLight: 'bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-700 border border-slate-200' },
                    ];
                    const inactiveDark = 'bg-slate-900/50 text-slate-400 hover:bg-slate-800 border border-slate-700';
                    return decisions.map(d => (
                      <button key={d.label} onClick={() => handleDecision(id, d.label)} className={`py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${evalData.decisio === d.label ? d.active : (isDark ? inactiveDark : d.inactiveLight)}`}>
                        {d.label}
                      </button>
                    ));
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {currentIds.length > 0 && viewMode === 'leaderboard' && (
        <div className={`p-6 sm:p-10 rounded-[40px] border animate-in fade-in slide-in-from-bottom-4 ${t.card}`}>
          <div className={`mb-8 flex justify-between items-center border-b pb-6 ${t.border}`}>
            <h3 className="text-xl sm:text-2xl font-black text-amber-500 uppercase tracking-widest flex items-center gap-3">
              <Trophy size={28} /> Classificació de Rendiment
            </h3>
          </div>
          <div className={`overflow-x-auto rounded-3xl border ${isDark ? 'border-slate-700 bg-slate-900/30' : 'border-slate-200 bg-slate-50'}`}>
            <table className="w-full text-left min-w-[800px] border-collapse">
              <thead className={`text-xs font-black uppercase tracking-wider sticky top-0 ${t.tableHead}`}>
                <tr>
                  <th className={`px-6 py-5 w-20 text-center border-b ${t.border}`}>#</th>
                  <th className={`px-6 py-5 border-b ${t.border}`}>Jugador</th>
                  <th className={`px-6 py-5 text-center border-b ${t.border}`}>Posició</th>
                  <th className={`px-6 py-5 text-center border-b ${t.border}`}>Edat</th>
                  <th className={`px-6 py-5 text-center border-b ${t.border}`}>Nota Global</th>
                  <th className={`px-6 py-5 text-center border-b ${t.border}`}>Decisió</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-medium ${t.tableRowDivide}`}>
                {sortedIds.map((id, index) => {
                  const p = players.find(x => x.id === id);
                  if (!p) return null;
                  const evalData = evaluations[id] || {};
                  const avg = getAverage(evalData);
                  return (
                    <tr key={id} className={`transition-colors group ${getRowStyle(evalData.decisio)}`}>
                      <td className="px-6 py-4 text-center">
                        <div className={`w-10 h-10 flex items-center justify-center rounded-full font-black mx-auto text-sm ${index === 0 ? 'bg-amber-400 text-amber-900 scale-110' : index === 1 ? 'bg-slate-300 text-slate-800' : index === 2 ? 'bg-orange-400 text-orange-900' : (isDark ? 'bg-slate-800 text-slate-400 border border-slate-600' : 'bg-slate-200 text-slate-600 border border-slate-300')}`}>
                          {index + 1}
                        </div>
                      </td>
                      <td className={`px-6 py-4 font-black text-lg tracking-tight ${t.textMain}`}>{p.name}</td>
                      <td className="px-6 py-4 text-center"><span className={`border px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest ${isDark ? 'bg-black/30 border-white/10' : 'bg-white border-slate-200'}`}>{p.position}</span></td>
                      <td className={`px-6 py-4 text-center text-sm font-bold opacity-70 ${t.textMain}`}>{p.age || '?'}</td>
                      <td className="px-6 py-4 text-center">
                        <div className={`flex items-end justify-center gap-1 ${t.textMain}`}>
                          <span className="text-3xl font-black">{avg}</span><span className="text-xs font-bold mb-1 opacity-50">/100</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border ${
                          evalData.decisio === 'Renovació' ? 'bg-emerald-600 border-emerald-500 text-white' :
                          evalData.decisio === 'Cessió' ? 'bg-amber-500 border-amber-400 text-white' :
                          evalData.decisio === 'Baixa' ? 'bg-rose-600 border-rose-500 text-white' :
                          evalData.decisio === 'Ascens' ? 'bg-blue-600 border-blue-500 text-white' :
                          (isDark ? 'bg-slate-800 border-slate-600 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-500')
                        }`}>
                          {evalData.decisio || 'PENDENT'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
/* =====================================================================
   TAB 5: PRESSUPOST
===================================================================== */
function PressupostTab({ players, squadData, selectedTeam, setSelectedTeam, budgetLimits, setBudgetLimits, salaries, setSalaries, isDark }) {
  const t = getTheme(isDark);
  const currentSquadIds = useMemo(() => {
    const ids = [];
    const categoriesOrder = selectedTeam === 'FILIAL'
      ? ['porters', 'laterals', 'centralsD', 'centralsE', 'migcentres', 'interiorsD', 'interiorsE', 'extrems', 'davanters', 'invitacio']
      : ['porters', 'laterals', 'centralsD', 'centralsE', 'migcentres', 'interiorsD', 'interiorsE', 'extrems', 'davanters'];
    categoriesOrder.forEach(cat => {
      if (squadData[selectedTeam][cat]) {
        squadData[selectedTeam][cat].forEach(id => { if (id && players.some(p => p.id === id) && !ids.includes(id)) ids.push(id); });
      }
    });
    return ids;
  }, [squadData, selectedTeam, players]);
  const currentLimit = budgetLimits[selectedTeam] || 0;
  const totalCost = currentSquadIds.reduce((sum, id) => sum + (Number(salaries[id]) || 0), 0);
  const remainingBudget = currentLimit - totalCost;
  const percentageUsed = currentLimit > 0 ? (totalCost / currentLimit) * 100 : 0;
  let progressColor = "bg-emerald-500";
  if (percentageUsed > 75) progressColor = "bg-orange-500";
  if (percentageUsed > 95) progressColor = "bg-red-500";
  return (
    <div className="space-y-8 w-full mx-auto">
      <div className={`flex flex-col md:flex-row justify-between items-center p-4 sm:p-6 rounded-3xl border gap-4 ${t.card}`}>
        <div className={`flex p-1.5 rounded-2xl w-full md:w-auto overflow-x-auto ${t.panel}`}>
          {['PRIMER EQUIP', 'FILIAL'].map(team => (
            <button key={team} onClick={() => setSelectedTeam(team)} className={`px-6 sm:px-8 py-3 rounded-xl font-black text-xs transition-all shrink-0 ${selectedTeam === team ? 'bg-blue-600 text-white shadow-lg' : (isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-white')}`}>{team}</button>
          ))}
        </div>
        <div className={`flex items-center gap-3 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
          <DollarSign size={24} className="hidden sm:block" />
          <span className="text-xl font-black uppercase tracking-tighter">Finances {selectedTeam}</span>
        </div>
      </div>
      <div className={`p-6 sm:p-10 rounded-[40px] border ${t.card}`}>
        <div className={`flex flex-col lg:flex-row justify-between items-center gap-8 mb-10 border-b pb-10 ${t.border}`}>
          <div className="w-full lg:w-1/3">
            <label className={`block text-xs font-black mb-3 uppercase ${t.textMuted}`}>Límit Salarial ({selectedTeam})</label>
            <div className="relative">
              <span className={`absolute left-5 top-1/2 -translate-y-1/2 font-black text-xl ${t.textMuted}`}>€</span>
              <input
                type="number" min="0" step="1000"
                className={`w-full border rounded-2xl py-5 pl-12 pr-6 text-2xl sm:text-3xl font-black outline-none focus:ring-2 focus:ring-emerald-500 ${t.input} ${isDark ? 'text-blue-300' : 'text-blue-700'}`}
                value={currentLimit} onChange={e => setBudgetLimits(prev => ({ ...prev, [selectedTeam]: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className={`w-full lg:w-2/3 flex flex-col sm:flex-row justify-around items-center p-6 sm:p-8 rounded-3xl border gap-6 sm:gap-0 ${t.panel}`}>
            <div className="text-center w-full sm:w-auto">
              <p className={`text-[11px] font-black uppercase tracking-widest mb-2 ${t.textMuted}`}>Massa Salarial</p>
              <p className={`text-3xl sm:text-4xl font-black ${t.textMain}`}>{totalCost.toLocaleString('ca-ES')} €</p>
            </div>
            <div className={`w-full h-px sm:w-px sm:h-16 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`}></div>
            <div className="text-center w-full sm:w-auto">
              <p className={`text-[11px] font-black uppercase tracking-widest mb-2 ${t.textMuted}`}>Marge Disponible</p>
              <p className={`text-3xl sm:text-4xl font-black ${remainingBudget < 0 ? 'text-red-500' : 'text-emerald-500'}`}>{remainingBudget.toLocaleString('ca-ES')} €</p>
            </div>
          </div>
        </div>
        <div className="mb-12">
          <div className="flex justify-between text-xs font-bold mb-3">
            <span className={`uppercase tracking-widest ${t.textMuted}`}>Consumit: {percentageUsed.toFixed(1)}%</span>
            {percentageUsed > 100 && <span className="text-red-500 flex items-center gap-1 font-black"><AlertTriangle size={16} /> LÍMIT EXCEDIT!</span>}
          </div>
          <div className={`h-8 w-full rounded-full overflow-hidden border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-200 border-slate-300'}`}>
            <div className={`h-full ${progressColor} transition-all duration-700 ease-out`} style={{ width: `${Math.min(percentageUsed, 100)}%` }}></div>
          </div>
        </div>
        <h3 className={`text-base font-black uppercase tracking-widest mb-6 flex items-center gap-3 ${t.textMain}`}>
          <Users className="text-blue-500" /> Assignació Individual <span className={`text-sm ${t.textMuted}`}>({currentSquadIds.length} jugadors)</span>
        </h3>
        {currentSquadIds.length === 0 ? (
          <div className={`text-center py-16 font-medium text-lg rounded-3xl border border-dashed ${isDark ? 'text-slate-400 bg-slate-900/50 border-slate-700' : 'text-slate-500 bg-slate-50 border-slate-300'}`}>
            No hi ha jugadors assignats al Prospecte d'aquest equip.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {currentSquadIds.map(id => {
              const p = players.find(p => p.id === id);
              if (!p) return null;
              return (
                <div key={id} className={`flex justify-between items-center p-5 rounded-2xl border transition-colors ${isDark ? 'bg-slate-900 border-slate-700 hover:border-emerald-500/50' : 'bg-slate-50 border-slate-200 hover:border-emerald-300'}`}>
                  <div className="min-w-0 pr-4">
                    <p className={`font-bold text-sm truncate ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>{p.name}</p>
                    <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${t.textMuted}`}>{p.position} | {p.age || '?'} anys</p>
                  </div>
                  <div className="relative w-28 sm:w-32 shrink-0">
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 font-black ${t.textMuted}`}>€</span>
                    <input
                      type="number" min="0" step="100" placeholder="0"
                      className={`w-full text-right font-black border rounded-xl p-2.5 pr-8 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all ${isDark ? 'bg-slate-800 border-slate-600 text-emerald-400' : 'bg-white border-slate-300 text-emerald-600'}`}
                      value={salaries[id] || ''} onChange={e => setSalaries(prev => ({ ...prev, [id]: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
/* =====================================================================
   TAB 6: TASQUES (KANBAN)
===================================================================== */
function TasksTab({ tasks, setTasks, showToast, isDark }) {
  const t = getTheme(isDark);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [people, setPeople] = useState('');
  const statuses = ['A fer', 'En procés', 'Recta final', 'Finalitzat'];
  const handleAddTask = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const newTask = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 5),
      title: title,
      description: desc,
      people: people,
      status: 'A fer'
    };
    setTasks([...tasks, newTask]);
    setTitle('');
    setDesc('');
    setPeople('');
    showToast("Tasca afegida.");
  };
  const moveTask = (taskId, direction) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const currentIdx = statuses.indexOf(task.status);
        let nextIdx = currentIdx + direction;
        if (nextIdx >= 0 && nextIdx < statuses.length) {
          return { ...task, status: statuses[nextIdx] };
        }
      }
      return task;
    }));
  };
  const deleteTask = (taskId) => {
    if (window.confirm("Vols eliminar aquesta tasca?")) {
      setTasks(prev => prev.filter(task => task.id !== taskId));
      showToast("Tasca eliminada.");
    }
  };
  return (
    <div className="space-y-8 w-full mx-auto">
      <div className={`p-4 sm:p-6 rounded-3xl border ${t.card} flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <Calendar className="text-blue-500" size={24} />
          <h2 className={`text-xl font-black uppercase tracking-tighter ${t.textMain}`}>Workflow de Scouting</h2>
        </div>
      </div>
      <div className={`p-6 sm:p-10 rounded-[30px] border ${t.card}`}>
        <h3 className={`text-base font-black uppercase tracking-widest mb-6 ${t.textHighlight}`}>Nova Tasca</h3>
        <form onSubmit={handleAddTask} className={`grid grid-cols-1 lg:grid-cols-3 gap-6 items-end border-b pb-10 mb-8 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="space-y-2">
            <label className={`block text-xs font-black uppercase ${t.textMuted}`}>Títol</label>
            <input
              required placeholder="Ex: Veure partit del Girona B"
              className={`w-full rounded-xl p-3 border outline-none font-bold text-sm focus:border-blue-500 transition-colors ${t.input}`}
              value={title} onChange={e => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className={`block text-xs font-black uppercase ${t.textMuted}`}>Involucrats</label>
            <input
              placeholder="Ex: Joan, Àngel"
              className={`w-full rounded-xl p-3 border outline-none font-bold text-sm focus:border-blue-500 transition-colors ${t.input}`}
              value={people} onChange={e => setPeople(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className={`block text-xs font-black uppercase ${t.textMuted}`}>Descripció</label>
            <div className="flex gap-2">
              <input
                placeholder="Ex: Seguir l'extrem dret"
                className={`flex-1 rounded-xl p-3 border outline-none font-bold text-sm focus:border-blue-500 transition-colors ${t.input}`}
                value={desc} onChange={e => setDesc(e.target.value)}
              />
              <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-xl font-black text-xs uppercase tracking-wider shadow-md shrink-0 transition-transform active:scale-95">
                Afegir
              </button>
            </div>
          </div>
        </form>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {statuses.map(status => {
            const statusTasks = tasks.filter(task => task.status === status);
            return (
              <div key={status} className={`p-5 rounded-3xl border flex flex-col h-[550px] ${t.panel}`}>
                <div className={`flex justify-between items-center border-b pb-4 mb-5 shrink-0 ${isDark ? 'border-slate-700' : 'border-slate-300'}`}>
                  <span className={`text-sm font-black uppercase tracking-widest ${t.textMain}`}>{status}</span>
                  <span className={`px-3 py-1 text-xs font-black rounded-lg ${statusTasks.length > 0 ? (isDark ? 'bg-blue-600/30 text-blue-400 border border-blue-500/30' : 'bg-blue-100 text-blue-700 border border-blue-200') : (isDark ? 'bg-slate-800 text-slate-500 border border-slate-700' : 'bg-slate-200 text-slate-500')}`}>{statusTasks.length}</span>
                </div>
                <div className="flex-1 space-y-4 overflow-y-auto pr-2">
                  {statusTasks.length === 0 && (
                    <div className="h-full flex items-center justify-center">
                      <p className={`text-sm italic ${t.textMuted}`}>Sense tasques</p>
                    </div>
                  )}
                  {statusTasks.map(task => (
                    <div key={task.id} className={`p-5 rounded-2xl border flex flex-col justify-between hover:border-blue-500 transition-all ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300'}`}>
                      <div>
                        <div className="flex justify-between items-start gap-3 mb-2">
                          <h4 className={`font-bold text-sm leading-snug ${t.textMain}`}>{task.title}</h4>
                          <button onClick={() => deleteTask(task.id)} className={`p-1 rounded transition-colors shrink-0 ${isDark ? 'text-slate-400 hover:text-rose-400' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'}`}><X size={16} /></button>
                        </div>
                        {task.description && (
                          <p className={`text-xs mb-4 font-medium leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{task.description}</p>
                        )}
                      </div>
                      <div className={`flex items-center justify-between border-t pt-4 mt-2 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                        <div className={`flex items-center gap-1.5 text-[10px] font-bold truncate max-w-[130px] ${t.textMuted}`} title={task.people}>
                          <UserPlus size={14} className={t.textHighlight} />
                          <span className="truncate">{task.people || 'Sense assignar'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            disabled={status === 'A fer'}
                            onClick={() => moveTask(task.id, -1)}
                            className={`p-1.5 rounded-lg transition-colors border ${status === 'A fer' ? 'opacity-30 cursor-not-allowed border-transparent' : (isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-100')}`}
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <button
                            disabled={status === 'Finalitzat'}
                            onClick={() => moveTask(task.id, 1)}
                            className={`p-1.5 rounded-lg transition-colors border ${status === 'Finalitzat' ? 'opacity-30 cursor-not-allowed border-transparent' : (isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-100')}`}
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
/* =====================================================================
   MAIN APP
===================================================================== */
function ScoutingApp({ session }) {
  const [activeTab, setActiveTab] = useState('jugadors');
  const [isDark, setIsDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Core data
  const [players, setPlayers] = useState([]);
  const [matchReports, setMatchReports] = useState([]);
  const [squadData, setSquadData] = useState({
    'PRIMER EQUIP': buildEmptySquad(false),
    'FILIAL': buildEmptySquad(true),
  });
  const [plantillaActual, setPlantillaActual] = useState({ 'PRIMER EQUIP': [], 'FILIAL': [] });
  const [evaluations, setEvaluations] = useState({});
  const [budgetLimits, setBudgetLimits] = useState({ 'PRIMER EQUIP': 0, 'FILIAL': 0 });
  const [salaries, setSalaries] = useState({});
  const [tasks, setTasks] = useState([]);
  // Per-tab team selector
  const [selectedTeamProspecte, setSelectedTeamProspecte] = useState('PRIMER EQUIP');
  const [selectedTeamPlantilla, setSelectedTeamPlantilla] = useState('PRIMER EQUIP');
  const [selectedTeamPressupost, setSelectedTeamPressupost] = useState('PRIMER EQUIP');
  // UI
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [toast, setToast] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('synced'); // synced | saving | error
  const importFileRef = useRef(null);
  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }, []);
  // --- LOAD from Supabase on mount / login ---
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data: row } = await supabase
          .from('user_state').select('data').eq('user_id', session.user.id).maybeSingle();
        if (cancelled) return;
        const data = row && row.data ? row.data : null;
        if (data) {
          if (data.players) setPlayers(data.players);
          if (data.matchReports) setMatchReports(data.matchReports);
          if (data.squadData) {
            setSquadData({
              'PRIMER EQUIP': migrateSquad(data.squadData['PRIMER EQUIP'], false),
              'FILIAL': migrateSquad(data.squadData['FILIAL'], true),
            });
          }
          if (data.plantillaActual) setPlantillaActual(data.plantillaActual);
          if (data.evaluations) setEvaluations(data.evaluations);
          if (data.budgetLimits) setBudgetLimits(data.budgetLimits);
          if (data.salaries) setSalaries(data.salaries);
          if (data.tasks) setTasks(data.tasks);
          if (data.isDark !== undefined) setIsDark(data.isDark);
        }
      } catch (e) {
        console.log('Load error:', e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [session.user.id]);
  // --- SAVE to Supabase (debounced) ---
  useEffect(() => {
    if (isLoading) return; // don't save during initial load
    setSaveStatus('saving');
    const timer = setTimeout(async () => {
      try {
        const payload = {
          players, matchReports, squadData, plantillaActual,
          evaluations, budgetLimits, salaries, tasks, isDark
        };
        const { error } = await supabase.from('user_state').upsert({
          user_id: session.user.id, data: payload, updated_at: new Date().toISOString()
        });
        setSaveStatus(error ? 'error' : 'synced');
      } catch (e) {
        console.error('Save error:', e);
        setSaveStatus('error');
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [players, matchReports, squadData, plantillaActual, evaluations, budgetLimits, salaries, tasks, isDark, isLoading, session.user.id]);
  // --- EXPORT to JSON file ---
  const handleExport = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      version: 1,
      players, matchReports, squadData, plantillaActual,
      evaluations, budgetLimits, salaries, tasks,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 10);
    a.download = `ce-europa-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Backup descarregat.');
  };
  // --- IMPORT from JSON file ---
  const handleImportClick = () => importFileRef.current?.click();
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!window.confirm('Importar substituirà totes les dades actuals. Continuar?')) {
        e.target.value = null;
        return;
      }
      if (data.players) setPlayers(data.players);
      if (data.matchReports) setMatchReports(data.matchReports);
      if (data.squadData) {
        setSquadData({
          'PRIMER EQUIP': migrateSquad(data.squadData['PRIMER EQUIP'], false),
          'FILIAL': migrateSquad(data.squadData['FILIAL'], true),
        });
      }
      if (data.plantillaActual) setPlantillaActual(data.plantillaActual);
      if (data.evaluations) setEvaluations(data.evaluations);
      if (data.budgetLimits) setBudgetLimits(data.budgetLimits);
      if (data.salaries) setSalaries(data.salaries);
      if (data.tasks) setTasks(data.tasks);
      showToast('Dades importades correctament.');
    } catch (err) {
      console.error(err);
      showToast('Error: el fitxer no és vàlid.');
    }
    e.target.value = null;
  };
  const t = getTheme(isDark);
  const tabs = [
    { key: 'jugadors', label: 'Jugadors', icon: <Database size={18} /> },
    { key: 'partits', label: 'Partits', icon: <ClipboardList size={18} /> },
    { key: 'prospecte', label: 'Prospecte', icon: <LayoutTemplate size={18} /> },
    { key: 'plantilla', label: 'Plantilla', icon: <Shield size={18} /> },
    { key: 'pressupost', label: 'Pressupost', icon: <DollarSign size={18} /> },
    { key: 'tasques', label: 'Tasques', icon: <Calendar size={18} /> },
  ];
  const renderTab = () => {
    switch (activeTab) {
      case 'jugadors':
        return <JugadorsTab players={players} setPlayers={setPlayers} matchReports={matchReports} showToast={showToast} setSelectedPlayer={setSelectedPlayer} isDark={isDark} />;
      case 'partits':
        return <PartitsTab players={players} setPlayers={setPlayers} matchReports={matchReports} setMatchReports={setMatchReports} showToast={showToast} isDark={isDark} />;
      case 'prospecte':
        return <ProspecteTab players={players} squadData={squadData} setSquadData={setSquadData} selectedTeam={selectedTeamProspecte} setSelectedTeam={setSelectedTeamProspecte} isDark={isDark} />;
      case 'plantilla':
        return <PlantillaEvalTab players={players} plantillaActual={plantillaActual} setPlantillaActual={setPlantillaActual} selectedTeam={selectedTeamPlantilla} setSelectedTeam={setSelectedTeamPlantilla} evaluations={evaluations} setEvaluations={setEvaluations} showToast={showToast} isDark={isDark} />;
      case 'pressupost':
        return <PressupostTab players={players} squadData={squadData} selectedTeam={selectedTeamPressupost} setSelectedTeam={setSelectedTeamPressupost} budgetLimits={budgetLimits} setBudgetLimits={setBudgetLimits} salaries={salaries} setSalaries={setSalaries} isDark={isDark} />;
      case 'tasques':
        return <TasksTab tasks={tasks} setTasks={setTasks} showToast={showToast} isDark={isDark} />;
      default:
        return null;
    }
  };
  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${t.app}`}>
        <div className="flex flex-col items-center gap-4">
          <EscapuladaLogo className="w-20 h-20 animate-pulse" isDark={isDark} />
          <p className="font-black uppercase tracking-widest text-sm text-blue-600">Carregant CE Europa...</p>
        </div>
      </div>
    );
  }
  return (
    <div className={`min-h-screen ${t.app}`}>
      {/* HEADER */}
      <header className={`sticky top-0 z-40 border-b-4 ${t.header}`}>
        <div className="flex items-center justify-between px-4 sm:px-8 py-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`lg:hidden p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-blue-50 text-slate-700'}`}>
              <Menu size={24} />
            </button>
            <EscapuladaLogo className="w-12 h-12" isDark={isDark} />
            <div>
              <h1 className={`text-xl sm:text-2xl font-black tracking-tighter ${t.textMain}`}>CE EUROPA</h1>
              <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${t.textHighlight}`}>Direcció Esportiva</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Save status */}
            <span className={`hidden sm:flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border ${
              saveStatus === 'synced' ? (isDark ? 'bg-emerald-900/30 border-emerald-700/40 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700') :
              saveStatus === 'saving' ? (isDark ? 'bg-amber-900/30 border-amber-700/40 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700') :
              (isDark ? 'bg-rose-900/30 border-rose-700/40 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-700')
            }`}>
              <Save size={12} /> {saveStatus === 'synced' ? 'Desat' : saveStatus === 'saving' ? 'Desant...' : 'Error'}
            </span>
            <button onClick={handleExport} title="Exportar backup JSON" className={`p-2.5 rounded-xl border transition-colors ${isDark ? 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-200' : 'bg-white border-blue-200 hover:bg-blue-50 text-blue-700'}`}>
              <Download size={18} />
            </button>
            <input type="file" accept=".json" ref={importFileRef} className="hidden" onChange={handleImport} />
            <button onClick={handleImportClick} title="Importar backup JSON" className={`p-2.5 rounded-xl border transition-colors ${isDark ? 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-200' : 'bg-white border-blue-200 hover:bg-blue-50 text-blue-700'}`}>
              <Upload size={18} />
            </button>
            <button onClick={() => setIsDark(!isDark)} title="Canviar tema" className={`p-2.5 rounded-xl border transition-colors ${isDark ? 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-200' : 'bg-white border-blue-200 hover:bg-blue-50 text-blue-700'}`}>
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={async () => { await supabase.auth.signOut(); }} title="Tancar sessió" className={`p-2.5 rounded-xl border transition-colors ${isDark ? 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-200' : 'bg-white border-blue-200 hover:bg-blue-50 text-blue-700'}`}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>
      {/* LAYOUT: SIDEBAR + MAIN */}
      <div className="flex">
        {/* SIDEBAR - desktop */}
        <aside className={`hidden lg:flex flex-col w-64 min-h-[calc(100vh-80px)] border-r p-4 gap-2 ${t.sidebar}`}>
          {tabs.map(tab => (
            <SidebarBtn
              key={tab.key}
              active={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              icon={tab.icon}
              label={tab.label}
              isDark={isDark}
            />
          ))}
          <div className={`mt-auto pt-6 border-t ${t.border}`}>
            <p className={`text-[10px] font-bold uppercase tracking-widest text-center ${t.textMuted}`}>
              {players.length} jugadors • {matchReports.length} informes
            </p>
          </div>
        </aside>
        {/* SIDEBAR - mobile drawer */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex" onClick={() => setSidebarOpen(false)}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <aside className={`relative w-64 h-full border-r p-4 flex flex-col gap-2 ${t.sidebar} animate-in slide-in-from-left`} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <span className={`font-black uppercase tracking-widest text-xs ${t.textHighlight}`}>Menú</span>
                <button onClick={() => setSidebarOpen(false)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}><X size={20} /></button>
              </div>
              {tabs.map(tab => (
                <SidebarBtn
                  key={tab.key}
                  active={activeTab === tab.key}
                  onClick={() => { setActiveTab(tab.key); setSidebarOpen(false); }}
                  icon={tab.icon}
                  label={tab.label}
                  isDark={isDark}
                />
              ))}
            </aside>
          </div>
        )}
        {/* MAIN */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          {renderTab()}
        </main>
      </div>
      {/* MODALS */}
      <PlayerDetailModal player={selectedPlayer} matchReports={matchReports} onClose={() => setSelectedPlayer(null)} isDark={isDark} />
      {/* TOAST */}
      <Toast toast={toast} isDark={isDark} />
    </div>
  );
}


/* =====================================================================
   AUTH GATE (default export)
===================================================================== */
export default function App() {
  const [session, setSession] = useState(undefined); // undefined = comprovant

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => { if (active) setSession(data.session); });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="font-black uppercase tracking-widest text-sm text-blue-600">Carregant…</p>
      </div>
    );
  }
  if (!session) return <Auth />;
  return <ScoutingApp key={session.user.id} session={session} />;
}
