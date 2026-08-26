import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { Building2, KeyRound, Loader2, Plus, ShieldCheck, ToggleLeft, ToggleRight } from 'lucide-react';
import { db } from '../lib/firebase';

type Tenant = { id: string; name: string; slug?: string; status?: string };
type AppCatalogItem = { id: string; name: string; description?: string; enabled?: boolean };
type License = { id: string; tenantId: string; appId: string; status?: string; startsAt?: any; endsAt?: any };

const DEFAULT_APPS: AppCatalogItem[] = [
  { id: 'vtg', name: 'VTG', description: 'VTG-applikasjonen', enabled: true },
  { id: 'golfbil', name: 'Golfbil', description: 'Golfbil-applikasjonen', enabled: true },
  { id: 'frivillig', name: 'Frivilligportal', description: 'Frivilligkalender og registrering', enabled: true },
];

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-700';

export default function AppOwnerDashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [apps, setApps] = useState<AppCatalogItem[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [tenantName, setTenantName] = useState('');
  const [selectedTenant, setSelectedTenant] = useState('');
  const [selectedApp, setSelectedApp] = useState(DEFAULT_APPS[0].id);
  const [adminEmail, setAdminEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const unsubTenants = onSnapshot(query(collection(db, 'tenants'), orderBy('name')), snapshot => {
      const next = snapshot.docs.map(item => ({ id: item.id, ...item.data() })) as Tenant[];
      setTenants(next);
      setSelectedTenant(current => current || next[0]?.id || '');
    });
    const unsubApps = onSnapshot(collection(db, 'appCatalog'), snapshot => {
      const next = snapshot.docs.map(item => ({ id: item.id, ...item.data() })) as AppCatalogItem[];
      setApps(next.length ? next : DEFAULT_APPS);
    });
    const unsubLicenses = onSnapshot(collection(db, 'licenses'), snapshot => {
      setLicenses(snapshot.docs.map(item => ({ id: item.id, ...item.data() })) as License[]);
    });
    return () => { unsubTenants(); unsubApps(); unsubLicenses(); };
  }, []);

  const effectiveApps = useMemo(() => apps.length ? apps : DEFAULT_APPS, [apps]);

  const createTenant = async () => {
    const name = tenantName.trim();
    if (!name) return;
    setBusy(true); setMessage('');
    try {
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
      if (!id) throw new Error('Klubben må ha et gyldig navn.');
      await setDoc(doc(db, 'tenants', id), { name, slug: id, status: 'active', createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
      setTenantName(''); setSelectedTenant(id); setMessage('Klubb aktivert.');
    } catch (error: any) { setMessage(error?.message || 'Kunne ikke lagre klubb.'); }
    finally { setBusy(false); }
  };

  const setTenantStatus = async (tenant: Tenant) => {
    await setDoc(doc(db, 'tenants', tenant.id), { status: tenant.status === 'active' ? 'inactive' : 'active', updatedAt: serverTimestamp() }, { merge: true });
  };

  const addClubAdmin = async () => {
    const email = adminEmail.trim().toLowerCase();
    if (!email || !selectedTenant) return;
    setBusy(true); setMessage('');
    try {
      await setDoc(doc(db, 'admins', `${email}_${selectedTenant}`), { email, clubId: selectedTenant, role: 'all', adminLevel: 'clubAdmin', createdAt: serverTimestamp() }, { merge: true });
      setAdminEmail(''); setMessage('ClubAdmin er registrert.');
    } catch (error: any) { setMessage(error?.message || 'Kunne ikke registrere administrator.'); }
    finally { setBusy(false); }
  };

  const saveLicense = async (status: 'active' | 'suspended') => {
    if (!selectedTenant || !selectedApp) return;
    setBusy(true); setMessage('');
    try {
      await setDoc(doc(db, 'licenses', `${selectedTenant}_${selectedApp}`), { tenantId: selectedTenant, appId: selectedApp, status, startsAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
      setMessage(`Lisens ${status === 'active' ? 'aktivert' : 'suspendert'}.`);
    } catch (error: any) { setMessage(error?.message || 'Kunne ikke lagre lisens.'); }
    finally { setBusy(false); }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-600"><ShieldCheck className="h-4 w-4" /> AppOwner</div>
          <h1 className="text-3xl font-black text-slate-900">App-eierkonsoll</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Administrer klubber, klubbadministratorer og hvilke apper hver klubb har lisens til.</p>
        </div>
        {busy && <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />}
      </div>

      {message && <div className="mb-6 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{message}</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 font-black"><Building2 className="h-5 w-5 text-emerald-700" /> Klubber</h2>
          <div className="mb-4 flex gap-2"><input className={inputClass} value={tenantName} onChange={e => setTenantName(e.target.value)} placeholder="Ny klubb" /><button onClick={createTenant} className="rounded-xl bg-emerald-800 px-3 text-white" title="Aktiver klubb"><Plus className="h-4 w-4" /></button></div>
          <div className="space-y-2">{tenants.length === 0 && <p className="text-sm text-slate-400">Ingen klubber er registrert ennå.</p>}{tenants.map(tenant => <div key={tenant.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span className="text-sm font-bold">{tenant.name}<small className="ml-2 text-xs font-normal text-slate-400">{tenant.id}</small></span><button onClick={() => setTenantStatus(tenant)} className="text-slate-500" title="Aktiver/deaktiver">{tenant.status === 'active' ? <ToggleRight className="h-5 w-5 text-emerald-700" /> : <ToggleLeft className="h-5 w-5" />}</button></div>)}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 font-black"><ShieldCheck className="h-5 w-5 text-emerald-700" /> ClubAdmin</h2>
          <select className={`${inputClass} mb-3`} value={selectedTenant} onChange={e => setSelectedTenant(e.target.value)}><option value="">Velg klubb</option>{tenants.map(tenant => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select>
          <input className={`${inputClass} mb-3`} value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="admin@klubb.no" type="email" />
          <button onClick={addClubAdmin} disabled={busy || !selectedTenant || !adminEmail.trim()} className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Legg til klubbadministrator</button>
          <p className="mt-3 text-xs text-slate-400">Administratorer logger inn med Google og kobles automatisk til klubben ved første innlogging.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 font-black"><KeyRound className="h-5 w-5 text-emerald-700" /> Lisenser</h2>
          <select className={`${inputClass} mb-3`} value={selectedTenant} onChange={e => setSelectedTenant(e.target.value)}><option value="">Velg klubb</option>{tenants.map(tenant => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select>
          <select className={`${inputClass} mb-3`} value={selectedApp} onChange={e => setSelectedApp(e.target.value)}>{effectiveApps.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}</select>
          <div className="flex gap-2"><button onClick={() => saveLicense('active')} disabled={busy || !selectedTenant} className="flex-1 rounded-xl bg-emerald-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-40">Aktiver</button><button onClick={() => saveLicense('suspended')} disabled={busy || !selectedTenant} className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-40">Stans</button></div>
          <div className="mt-4 space-y-1">{licenses.filter(item => item.tenantId === selectedTenant).map(item => <p key={item.id} className="text-xs text-slate-500">{item.appId}: <strong className={item.status === 'active' ? 'text-emerald-700' : 'text-red-600'}>{item.status}</strong></p>)}</div>
        </div>
      </div>
    </section>
  );
}
