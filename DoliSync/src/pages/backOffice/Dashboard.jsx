import { useEffect, useState, useMemo } from 'react';

const API = 'http://localhost:8080/dolibarr/api/index.php';
const KEY = { headers: { 'DOLAPIKEY': 'a31031ec9f9fac9ae7d484c24a4b8cf78a5a8aaf' } };
const euro = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
const sum  = (arr) => arr.reduce((a, s) => a + parseFloat(s.amount || 0), 0);
const ymOf = (s) => {
  const ts = parseInt(s.datep);
  if (!ts) return null;
  const d = new Date(ts * 1000);
  return isNaN(d.getTime()) ? null : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
};
const ymLabel = (ym) => { if (!ym) return ''; const [y,m] = ym.split('-'); return new Date(+y,+m-1).toLocaleDateString('fr-FR',{month:'long',year:'numeric'}); };

const ICONS = {
  users:  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  money:  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  person: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>,
};

const KpiCard = ({ title, value, color }) => (
  <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex items-center gap-5">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>{ICONS[color.includes('blue') ? 'users' : 'money']}</div>
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
    </div>
  </div>
);

const GenderBlock = ({ label, salaires, users, accent, bg }) => {
  const total = sum(salaires);
  const nb = new Set(salaires.map(s => String(s.fk_user))).size;
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className={`${bg} px-6 py-4 flex items-center gap-3`}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent} bg-white/30`}>{ICONS.person}</div>
        <div>
          <p className={`font-bold text-base capitalize ${accent}`}>{label}</p>
          <p className={`text-xs ${accent} opacity-70`}>{nb} employé{nb>1?'s':''}</p>
        </div>
        <p className={`ml-auto text-xl font-bold ${accent}`}>{euro(total)}</p>
      </div>
      <div className="divide-y divide-gray-50">
        {salaires.length === 0
          ? <p className="text-center text-sm text-gray-400 py-6">Aucun salaire pour cette période</p>
          : salaires.map(s => {
              const u = users.find(u => String(u.id) === String(s.fk_user));
              const name = u ? `${u.lastname||''} ${u.firstname||''}`.trim() : `Employé #${s.fk_user}`;
              return (
                <div key={s.id} className="px-6 py-3 flex justify-between items-center hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${bg} ${accent}`}>{name[0].toUpperCase()}</div>
                    <span className="text-sm font-medium text-gray-700">{name}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-800">{euro(parseFloat(s.amount||0))}</span>
                </div>
              );
            })
        }
      </div>
    </div>
  );
};

const FilterSelect = ({ label, value, onChange, options, allLabel }) => (
  <div className="flex items-center gap-2">
    <label className="text-sm font-medium text-gray-500">{label} :</label>
    <select value={value} onChange={onChange} className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg px-3 py-2 shadow-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition">
      <option value="all">{allLabel}</option>
      {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  </div>
);

export default function Dashboard() {
  const [loading, setLoading]   = useState(true);
  const [salaries, setSalaries] = useState([]);
  const [users, setUsers]       = useState([]);
  const [yearFilter, setYearFilter]   = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');

  useEffect(() => {
    Promise.all([
      fetch(`${API}/users?limit=100`, KEY).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API}/salaries?limit=1000`, KEY).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API}/salaries/payments?limit=1000`, KEY).then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([u, s, p]) => {
      const usersData = Array.isArray(u) ? u : [];
      const salariesData = Array.isArray(s) ? s : [];
      const paymentsData = Array.isArray(p) ? p : [];

      console.log("Salaires récupérés:", salariesData);
      console.log("Paiements récupérés:", paymentsData);

      const processedSalaries = salariesData.map(sal => {
        const salPayments = paymentsData.filter(pay => String(pay.fk_salary) === String(sal.id));
        let latestDatep = null;
        if (salPayments.length > 0) {
          const timestamps = salPayments
            .map(pay => {
              const val = pay.datepaye || pay.date || pay.datep;
              if (!val) return null;
              if (typeof val === 'number') return val;
              if (typeof val === 'string') {
                if (/^\d+$/.test(val)) return parseInt(val);
                const d = new Date(val);
                return isNaN(d.getTime()) ? null : Math.floor(d.getTime() / 1000);
              }
              return null;
            })
            .filter(t => t !== null && !isNaN(t) && t > 0);
          if (timestamps.length > 0) {
            latestDatep = Math.max(...timestamps);
          }
        }
        return {
          ...sal,
          datep: latestDatep || sal.datep || null
        };
      });

      setUsers(usersData);
      setSalaries(processedSalaries);
      setLoading(false);
    })
      .catch(() => setLoading(false));
  }, []);

  const availableYears  = useMemo(() => [...new Set(salaries.map(s=>ymOf(s)?.split('-')[0]).filter(Boolean))].sort().reverse(), [salaries]);
  const availableMonths = useMemo(() => [...new Set(salaries.map(s=>ymOf(s)).filter(ym=>ym&&(yearFilter==='all'||ym.startsWith(yearFilter))))].sort().reverse(), [salaries,yearFilter]);

  const filtered = useMemo(() => salaries.filter(s => {
    const ym = ymOf(s);
    if (yearFilter!=='all' && (!ym||!ym.startsWith(yearFilter))) return false;
    if (monthFilter!=='all' && ym!==monthFilter) return false;
    return true;
  }), [salaries, yearFilter, monthFilter]);

  const gender = (s) => { const u = users.find(u=>String(u.id)===String(s.fk_user)); const c=u?.civility_code; return c==='MR'?'homme':c==='MME'||c==='MS'?'femme':'unknown'; };
  const hommes = useMemo(() => filtered.filter(s=>gender(s)==='homme'), [filtered,users]);
  const femmes = useMemo(() => filtered.filter(s=>gender(s)==='femme'), [filtered,users]);

  const totalEmps = useMemo(() => new Set(salaries.map(s=>String(s.fk_user))).size, [salaries]);
  const totalMass = useMemo(() => sum(salaries), [salaries]);

  if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"/></div>;

  return (
    <div className="p-6 md:p-10 bg-[#F8FAFC] min-h-screen font-sans text-gray-800">
      <div className="mb-10 flex flex-col md:flex-row md:justify-between md:items-start gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vue d'ensemble</h1>
          <p className="text-sm text-gray-400 mt-1">Tableau de bord des salaires et employés</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <KpiCard title="Total Employés" value={totalEmps} color="text-blue-600"/>
          <KpiCard title="Masse Salariale Totale" value={euro(totalMass)} color="text-emerald-600"/>
        </div>
      </div>

      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Salaires par genre</h2>
          <div className="flex flex-wrap items-center gap-3">
            <FilterSelect label="Année" value={yearFilter} onChange={e=>{setYearFilter(e.target.value);setMonthFilter('all');}} options={availableYears.map(y=>({v:y,l:y}))} allLabel="Toutes"/>
            <FilterSelect label="Mois"  value={monthFilter} onChange={e=>setMonthFilter(e.target.value)} options={availableMonths.map(ym=>({v:ym,l:ymLabel(ym)}))} allLabel="Tous"/>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GenderBlock label="Hommes" salaires={hommes} users={users} accent="text-blue-600" bg="bg-blue-50"/>
          <GenderBlock label="Femmes" salaires={femmes} users={users} accent="text-pink-600" bg="bg-pink-50"/>
        </div>

        {monthFilter !== 'all' && (
          <div className="mt-4 p-4 bg-white border border-gray-100 rounded-xl shadow-sm flex flex-wrap gap-6">
            {[
              { label: 'Période',           val: ymLabel(monthFilter), cls: 'text-gray-700' },
              { label: 'Total hommes',      val: euro(sum(hommes)),    cls: 'text-blue-600'  },
              { label: 'Total femmes',      val: euro(sum(femmes)),    cls: 'text-pink-600'  },
              { label: 'Masse totale',      val: euro(sum(filtered)),  cls: 'text-gray-800'  },
            ].map(({label, val, cls}) => (
              <div key={label}>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
                <p className={`text-sm font-bold capitalize ${cls}`}>{val}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}