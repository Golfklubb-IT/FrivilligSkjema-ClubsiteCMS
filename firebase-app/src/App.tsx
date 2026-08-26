import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  LogIn, 
  LogOut, 
  LayoutDashboard, 
  UserPlus, 
  Loader2, 
  Mail, 
  AlertCircle, 
  Menu, 
  X, 
  Trees, 
  Landmark, 
  ShieldCheck,
  Share2,
  Copy,
  Check,
  Sparkles
} from 'lucide-react';
import { auth, db, signInWithGoogle, firebaseConfig, onAuthStateChanged, signOut } from './lib/firebase';
import VolunteerForm from './components/VolunteerForm';
import AdminDashboard from './components/AdminDashboard';
import AppOwnerDashboard from './components/AppOwnerDashboard';
import { cn } from './lib/utils';

const CLUBS = [
  { 
    id: '73', 
    name: 'Ski Golfklubb', 
    color: '#1e3a24', 
    hoverColor: '#2d5635', 
    logo: '⛳', 
    contactUrl: 'https://skigk.no/klubb/kontakt',
    domain: 'frivillig-kalendar-skigk.web.app'
  },
  { 
    id: '999', 
    name: 'Demoklubben', 
    color: '#0f172a', 
    hoverColor: '#1e293b', 
    logo: '🔮', 
    contactUrl: 'https://skigk.no/klubb/kontakt',
    domain: 'frivillig-kalendar-demo.web.app'
  }
];

const getClubById = (id: string) => {
  const predefined = CLUBS.find(c => c.id === id);
  if (predefined) return predefined;
  return {
    id,
    name: `Klubb ${id}`,
    color: '#1e3a24',
    hoverColor: '#2d5635',
    logo: '⛳',
    contactUrl: 'https://skigk.no/klubb/kontakt',
    domain: `frivillig-kalendar-${id}.web.app`
  };
};

const BOOTSTRAP_ADMIN_EMAILS = ['owe-admin@golfklubb-it.com', 'admin-2025@skigk.no', 'jarlemidt@gmail.com'];
const BOOTSTRAP_APP_OWNER_EMAILS = ['owe-admin@golfklubb-it.com', 'admin-2025@skigk.no'];

const isSkiUser = (email: string | null | undefined): boolean => {
  if (!email) return false;
  const emailLower = email.toLowerCase();
  
  if (emailLower.endsWith('@skigk.no')) return true;
  
  const skiEmails = [
    'leif.oddbjorn.moller@gmail.com',
    'owe.stangeland@gmail.com',
    'owe@skigolfklubb.no'
  ];
  return skiEmails.includes(emailLower);
};

// Helper functions for secure parameter scrambling to prevent exposing plain URLs
const scrambleUrl = (clubId: string, view: string, role?: string): string => {
  const parts = [];
  
  const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
  const isSingleClubHost = hostname.includes('skigk') || (hostname.includes('demo') && !hostname.includes('klubb.web.app'));

  // On dedicated branded single-club hosts (like skigk.web.app), we don't need to append the club= parameter
  // unless we are on the multi-club portal 'klubb.web.app' (where you manage absolutely all clubs).
  if (clubId && !isSingleClubHost) {
    parts.push(`club=${clubId}`);
  }
  if (view && view !== 'volunteer') {
    parts.push(`view=${view}`);
  }
  if (role) {
    parts.push(`role=${role}`);
  }
  
  if (parts.length === 0) {
    return '';
  }
  
  return `?${parts.join('&')}`;
};

const getInitialParamState = (): { club: string | null; view: string | null; role: string | null } => {
  if (typeof window === 'undefined') {
    return { club: null, view: null, role: null };
  }
  const params = new URLSearchParams(window.location.search || window.location.hash.split('?')[1] || '');
  
  const p = params.get('p');
  if (p) {
    try {
      const reversed = p.split('').reverse().join('');
      const decoded = atob(reversed);
      const decodedParams = new URLSearchParams(decoded);
      return {
        club: decodedParams.get('club') || decodedParams.get('clubId') || params.get('club') || params.get('clubId'),
        view: decodedParams.get('view') || decodedParams.get('role') || params.get('view') || params.get('role'),
        role: decodedParams.get('role') || params.get('role')
      };
    } catch (e) {
      console.warn("Failed to decode legacy scrambled state, falling back to clean parsing:", e);
    }
  }
  
  return {
    club: params.get('club') || params.get('clubId'),
    view: params.get('view') || params.get('role'),
    role: params.get('role')
  };
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  
  const [activeClubId, setActiveClubId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname.toLowerCase();
      
      // 1. First, check URL params to allow loading any club if explicitly set (very useful for sharing/testing)
      const paramState = getInitialParamState();
      const urlClub = paramState.club;
      if (urlClub && CLUBS.map(c => c.id).includes(urlClub)) {
        return urlClub;
      }

      // 2. Second, check cached active club in localStorage (especially useful for multi-tenant portal)
      const cachedClub = localStorage.getItem('active_club_id');
      if (cachedClub && CLUBS.map(c => c.id).includes(cachedClub)) {
        // Only force single-club domain lock if they are on a strictly branded single-club domain.
        // If they are on a multi-club portal like 'frivillig-kalendar-klubb.web.app', let them keep their cached club.
        if (hostname.includes('skigk') && !hostname.includes('klubb.web.app')) {
          return '73';
        }
        return cachedClub;
      }

      // 3. Fallback to domain defaults
      if (hostname.includes('demo')) {
        return '999';
      }
      
      // Both skigk.web.app and klubb.web.app default to '73' (Ski Golfklubb) initially
      return '73';
    }
    return '73';
  });

  const [firestoreIsAdmin, setFirestoreIsAdmin] = useState(false);
  const [firestoreRole, setFirestoreRole] = useState<string | null>(null);
  const [firestoreIsAppOwner, setFirestoreIsAppOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  // Read initial view choice with robust fallbacks
  const [view, setView] = useState<'volunteer' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      
      if (path.includes('admin') || path.includes('dashboard') || path.includes('clubadmin')) {
        return 'admin';
      }
      if (path.includes('frivillig') || path.includes('volunteer')) {
        return 'volunteer';
      }
      
      if (hash.includes('admin') || hash.includes('dashboard')) {
        return 'admin';
      }
      if (hash.includes('frivillig') || hash.includes('volunteer')) {
        return 'volunteer';
      }
      
      const paramState = getInitialParamState();
      const urlView = paramState.view;
      if (urlView === 'admin' || urlView === 'clubAdmin' || urlView === 'appOwner') {
        return 'admin';
      }
    }
    return 'volunteer';
  });

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginErrorCode, setLoginErrorCode] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // Golfbox ID login step state
  const [loginGolfboxId, setLoginGolfboxId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('saved_login_golfbox_id') || '';
    }
    return '';
  });
  const [loginStep, setLoginStep] = useState<'golfbox' | 'auth'>('golfbox');
  const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('/admin');

  const handleOpenLogin = () => {
    if (!isAdminRoute) {
      const savedId = localStorage.getItem('saved_login_golfbox_id') || '';
      setLoginGolfboxId(savedId);
    }
    setLoginStep(isAdminRoute ? 'auth' : 'golfbox');
    setShowLoginModal(true);
  };

  const handleGolfboxIdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = loginGolfboxId.trim();
    if (!trimmed) return;
    
    const parts = trimmed.split('-');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      alert("Feil format! Bruk formatet: Klubbnummer-Medlemsnummer (f.eks. '73-xxxxx' eller '999-xxxxx').");
      return;
    }
    
    const clubIdPrefix = parts[0].trim();
    if (!/^[a-zA-Z0-9]+$/.test(clubIdPrefix)) {
      alert("Ugyldig klubbnummer. Prøv igjen.");
      return;
    }

    setActiveClubId(clubIdPrefix);
    localStorage.setItem('active_club_id', clubIdPrefix);
    localStorage.setItem('saved_login_golfbox_id', trimmed);
    
    // Auto-fill Golfbox ID state into localStorage so VolunteerForm matches
    localStorage.setItem(`volunteer_form_state_${clubIdPrefix}`, JSON.stringify({
      golfboxId: trimmed
    }));

    setLoginStep('auth');
  };
  const [showShareModal, setShowShareModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedShareClubId, setSelectedShareClubId] = useState<string>(activeClubId);
  const [copiedLinkType, setCopiedLinkType] = useState<string | null>(null);

  useEffect(() => {
    setSelectedShareClubId(activeClubId);
  }, [activeClubId]);

  // Keep state changes synchronized with query parameters in the address bar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const scrambledQuery = scrambleUrl(activeClubId, view);
      const newRelativePathQuery = window.location.pathname + scrambledQuery;
      
      if (window.location.search !== scrambledQuery) {
        window.history.replaceState({}, '', newRelativePathQuery);
      }
    }
  }, [activeClubId, view]);

  // URL parameters may select a view, but never grant authorization.
  const userEmailLower = user?.email ? user.email.toLowerCase() : '';
  const isOwner = firestoreIsAppOwner;

  const isDemoActive = activeClubId === '999';

  // Dynamic role and admin level resolution based on current club session
  const isAdmin = firestoreIsAdmin;

  const isClubAdmin = firestoreRole === 'all' || firestoreRole === 'appOwner';

  const userRole = firestoreRole;

  // Determine if this is a Ski Golfklubb approved user
  const isSki = isSkiUser(userEmailLower);

  // In the multi-club portal, we dynamically list other clubs ONLY for the owner.
  // Regular volunteers see the single portal they typed in their Golfbox ID.
  const accessibleClubs = CLUBS.filter(c => {
    if (isOwner) return true;
    return c.id === activeClubId;
  });

  const currentClub = getClubById(activeClubId);

  const handleClubChange = (clubId: string) => {
    if (!isOwner) return; // Block switches for non-owners since they are locked to their Golfbox ID prefix portal
    
    setActiveClubId(clubId);
    localStorage.setItem('active_club_id', clubId);
  };

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setLoginError(null);
    setLoginErrorCode(null);
    try {
      await signInWithGoogle();
      setShowLoginModal(false);
    } catch (error: any) {
      console.error("Feil ved Google-innlogging:", error);
      const errMsg = error?.message || String(error);
      const errCode = error?.code || "";
      setLoginErrorCode(errCode);

      const isUnauthorizedDomain = 
        errCode === "auth/unauthorized-domain" || 
        errMsg.includes("unauthorized-domain") || 
        errMsg.includes("unauthorized_domain") ||
        errMsg.includes("unauthorized domain");

      const isApiKeyNotValid = 
        errCode === "auth/api-key-not-valid" || 
        errMsg.includes('api-key-not-valid') || 
        errMsg.includes('auth/api-key-not-valid') || 
        errMsg.includes('API key not valid') ||
        errMsg.includes('api-key');

      if (isUnauthorizedDomain || isApiKeyNotValid) {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'frivillig-kalendar-skigk.web.app';
        const activeProjectId = firebaseConfig.projectId;
        
        let errorDetails = `🔴 Konfigurasjonsfeil i Firebase!\n`;
        errorDetails += `Aktivt prosjekt akkurat nå: '${activeProjectId}'\n`;
        errorDetails += `Nåværende nettadresse: '${hostname}'\n\n`;

        if (isUnauthorizedDomain) {
          errorDetails += 
            `👉 HVORFOR SKJER DETTE?\n` +
            `Dette skyldes at Google/Firebase krever at kildedomenet du logger inn fra er registrert i Firebase-konsollen din under 'Authorized Domains'.\n\n` +
            `Siden du jobber med Frivillig-kalendar-klubb, må du påse at rett domene er lagt til i det aktuelle Firebase-prosjektet:\n\n` +
            `1️⃣ RETT OPP FOR UTVIKLING I AI STUDIO / PREVIEW:\n` +
            `• Gå til Firebase Konsollen for prosjektet '${activeProjectId}'.\n` +
            `• Gå til Authentication -> Settings -> Authorized domains.\n` +
            `• Klikk 'Add domain' og legg til denne nøyaktige nettadressen:\n` +
            `  👉 ${hostname}\n\n` +
            `2️⃣ RETT OPP FOR PRODUKSJON / LIVE NETTSTED (frivillig-kalendar-skigk.web.app):\n` +
            `• Gå til Firebase Konsollen for prosjektet 'frivillig-kalendar-klubb'.\n` +
            `• Gå til Authentication -> Settings -> Authorized domains.\n` +
            `• Sjekk at 'frivillig-kalendar-skigk.web.app' (og andre web.app adresser) er lagt til der.\n` +
            `• VIKTIG: Påse også at Google Sign-In leverandøren ('Google') er satt til 'Enabled' i 'frivillig-kalendar-klubb'.\n\n`;
        }

        if (isApiKeyNotValid) {
          errorDetails += 
            `👉 LØSNING FOR API-NØKKEL (auth/api-key-not-valid):\n` +
            `Dette skyldes som regel av API-nøkkelrestriksjoner i Google Cloud Console (GCP) for prosjektet ${activeProjectId}.\n\n` +
            `Slik fikser du det:\n` +
            `1. Åpne Google Cloud Console på https://console.cloud.google.com/apis/credentials\n` +
            `2. Endre 'Application restrictions' for nettlesernøkkelen og legg til:\n` +
            `   - https://${hostname}/*\n` +
            `   - https://frivillig-kalendar-skigk.web.app/*\n` +
            `3. Trykk 'Save' og vent 1-2 minutter.\n`;
        }

        setLoginError(errorDetails);
      } else {
        setLoginError(`Innlogging feilet: ${errMsg}`);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  useEffect(() => {
    // 1. Check standard Firebase Auth observer
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (!user) {
        setFirestoreIsAdmin(false);
        setFirestoreRole(null);
        setFirestoreIsAppOwner(false);
        setLoading(false);
      } else {
        setShowLoginModal(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Reactively check and load user's exact roles/permissions based on activeClubId and user state
  useEffect(() => {
    if (!user) return;

    let active = true;
    const loadClubRole = async () => {
      try {
        const userEmailLower = user.email ? user.email.toLowerCase() : '';
        
        // Try club-specific composite keys: uid_clubId or email_clubId
        const clubSpecificUidKey = `${user.uid}_${activeClubId}`;
        const clubSpecificEmailKey = `${userEmailLower}_${activeClubId}`;

        let dbIsAdmin = false;
        let dbRole: string | null = null;
        let dbIsAppOwner = false;

        try {
          const appOwnerDoc = await getDoc(doc(db, 'appOwners', user.uid));
          dbIsAppOwner = appOwnerDoc.exists() || BOOTSTRAP_APP_OWNER_EMAILS.includes(userEmailLower);
        } catch (e) {
          console.warn('Could not load app owner mapping:', e);
          dbIsAppOwner = BOOTSTRAP_APP_OWNER_EMAILS.includes(userEmailLower);
        }

        let uidClubDoc = null;
        try {
          uidClubDoc = await getDoc(doc(db, 'admins', clubSpecificUidKey));
        } catch (e) {
          console.warn("Could not load club UID admin mapping (expected for non-existing composite admins):", e);
        }

          if (uidClubDoc && uidClubDoc.exists() && active) {
            dbIsAdmin = true;
            dbRole = uidClubDoc.data()?.role || 'all';
            dbIsAppOwner = dbIsAppOwner || uidClubDoc.data()?.adminLevel === 'appOwner';
        } else if (userEmailLower) {
          let emailClubDoc = null;
          try {
            emailClubDoc = await getDoc(doc(db, 'admins', clubSpecificEmailKey));
          } catch (e) {
            console.warn("Could not load club email admin mapping:", e);
          }

          if (emailClubDoc && emailClubDoc.exists() && active) {
            dbIsAdmin = true;
            dbRole = emailClubDoc.data()?.role || 'all';
            dbIsAppOwner = dbIsAppOwner || emailClubDoc.data()?.adminLevel === 'appOwner';
            
            // Auto-link/write UID-based document for performance
            try {
              await setDoc(doc(db, 'admins', clubSpecificUidKey), {
                email: userEmailLower,
                role: dbRole,
                clubId: activeClubId,
                createdAt: new Date(),
                linkedFromEmail: true
              });
            } catch (err) {
              console.error("Feil ved autolenking av admin UID:", err);
            }
          }
        }

        // If not found, and activeClubId is '73', check legacy non-composite formats
        if (!dbIsAdmin) {
          let legacyUidDoc = null;
          try {
            legacyUidDoc = await getDoc(doc(db, 'admins', user.uid));
          } catch (e) {
            console.warn("Could not check legacy UID admin file:", e);
          }

          if (legacyUidDoc && legacyUidDoc.exists() && active) {
            const docClubId = legacyUidDoc.data()?.clubId;
            if (!docClubId || docClubId === activeClubId) {
              dbIsAdmin = true;
              dbRole = legacyUidDoc.data()?.role || 'all';
              dbIsAppOwner = dbIsAppOwner || legacyUidDoc.data()?.adminLevel === 'appOwner';
            }
          } else if (userEmailLower) {
            let legacyEmailDoc = null;
            try {
              legacyEmailDoc = await getDoc(doc(db, 'admins', userEmailLower));
            } catch (e) {
              console.warn("Could not check legacy email admin file:", e);
            }

            if (legacyEmailDoc && legacyEmailDoc.exists() && active) {
              const docClubId = legacyEmailDoc.data()?.clubId;
              if (!docClubId || docClubId === activeClubId) {
                dbIsAdmin = true;
                dbRole = legacyEmailDoc.data()?.role || 'all';
                dbIsAppOwner = dbIsAppOwner || legacyEmailDoc.data()?.adminLevel === 'appOwner';
                
                try {
                  await setDoc(doc(db, 'admins', user.uid), {
                    email: userEmailLower,
                    role: dbRole,
                    createdAt: new Date(),
                    linkedFromEmail: true
                  });
                } catch (linkError) {}
              }
            }
          }
        }

        if (active) {
          setFirestoreIsAdmin(dbIsAdmin);
          setFirestoreRole(dbRole);
          setFirestoreIsAppOwner(dbIsAppOwner);
          
          // Bootstrap identities may see the activation screen, but they do
          // not receive admin permissions until the Firestore write succeeds.
          const mayBootstrapAdmin = BOOTSTRAP_ADMIN_EMAILS.includes(userEmailLower);
          if (dbIsAdmin || mayBootstrapAdmin) {
            setView('admin');
          } else {
            setView('volunteer');
          }
        }
      } catch (error) {
        console.error("Feil ved lasting av klubbrolle:", error);
        if (active) {
          setFirestoreIsAdmin(false);
          setFirestoreRole(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadClubRole();
    return () => {
      active = false;
    };
  }, [user, activeClubId]);

  const claimAdmin = async () => {
    const userEmailLower = user?.email ? user.email.toLowerCase() : '';
    if (!user || !BOOTSTRAP_ADMIN_EMAILS.includes(userEmailLower)) return;
    setIsClaiming(true);
    try {
      await setDoc(doc(db, 'admins', user.uid), { 
        email: user.email,
        role: 'all',
        adminLevel: 'appOwner',
        createdAt: new Date()
      });
      await setDoc(doc(db, 'appOwners', user.uid), {
        email: user.email,
        role: 'appOwner',
        createdAt: new Date()
      }, { merge: true });
      setFirestoreIsAdmin(true);
      setFirestoreRole('all');
      setFirestoreIsAppOwner(true);
      setView('admin');
    } catch (e) {
      console.error("Failed to claim admin:", e);
      alert("Kunne ikke aktivere admin. Vennligst legg til din UID manuelt i Firebase Console.");
    } finally {
      setIsClaiming(false);
    }
  };

  const handleSignOut = () => {
    signOut(auth);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#f8fafc]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-colors animate-pulse"
            style={{ 
              backgroundColor: currentClub.color,
              boxShadow: `0 10px 15px -3px ${currentClub.color}33`
            }}
          >
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <p className="font-bold tracking-widest uppercase text-xs" style={{ color: currentClub.color }}>{currentClub.name}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-gray-900">
      {/* Demo Info Bar / Ordering Hub */}
      {activeClubId === '999' && (
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-650 to-slate-900 text-white text-xs py-2 px-4 text-center font-bold relative flex items-center justify-center gap-2 group shadow-sm transition-all border-b border-indigo-950">
          <span className="inline-flex items-center gap-1.5 bg-indigo-500/30 px-2 py-0.5 rounded-full border border-indigo-400/20 text-[9px] uppercase tracking-widest font-black shrink-0 animate-pulse">
            🔮 Sandkasse / Demo
          </span>
          <span className="text-[10px] sm:text-xs text-indigo-100">
            Dette er en trygg prøveversjon av Frivilligportalen. Klikk for å se hvordan du kan bestille til din egen klubb!
          </span>
          <button 
            onClick={() => setShowOrderModal(true)}
            className="ml-2 hover:bg-white/10 px-2.5 py-1 bg-white/5 border border-white/15 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all select-none cursor-pointer shrink-0"
          >
            Se Bestilling & Info
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 animate-fade-in">
            <div className="flex items-center gap-3">
              <div 
                onClick={() => setView(isAdmin ? 'admin' : 'volunteer')}
                className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer shadow-md transition-all active:scale-95"
                style={{ 
                  backgroundColor: currentClub.color,
                  boxShadow: `0 4px 6px -1px ${currentClub.color}1a`
                }}
              >
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-base sm:text-lg font-black tracking-tight leading-none text-gray-900 uppercase">
                  {currentClub.name}
                </span>
                <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mt-0.5">Frivilligportal {currentClub.logo}</span>
              </div>

              {/* Instant Club Switcher Pill (Multi-tenant demonstration) */}
              {accessibleClubs.length > 1 && (
                <div className="flex bg-gray-100 p-1 rounded-xl ml-2 sm:ml-4 text-xs font-bold gap-0.5 shadow-inner">
                  {accessibleClubs.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleClubChange(c.id)}
                      className={cn(
                        "px-2 sm:px-3 py-1 rounded-lg transition-all uppercase tracking-wider text-[9px] font-black cursor-pointer",
                        activeClubId === c.id
                          ? "bg-white shadow-xs text-gray-900"
                          : "text-gray-400 hover:text-gray-700"
                      )}
                      style={{ color: activeClubId === c.id ? c.color : undefined }}
                    >
                      {c.logo} <span className="hidden sm:inline">{c.id === '73' ? 'Ski' : 'Demo'}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Portal-URLs sharing button trigger */}
              {isAdmin && (
                <button
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-950 border border-gray-255 rounded-xl text-[10px] font-black transition-all cursor-pointer select-none ml-2 shadow-xs"
                  title="Vis og del direkte portal-lenker"
                >
                  <Share2 className="w-3.5 h-3.5 text-gray-500" />
                  <span className="hidden md:inline">Del portal</span>
                  <span className="md:hidden">Lenker</span>
                </button>
              )}
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-6">
              {user ? (
                <>
                  {!isAdmin && (
                    <button 
                      onClick={() => setView('volunteer')}
                      className={cn(
                        "text-sm font-bold flex items-center gap-2 transition-colors",
                        view === 'volunteer' ? "text-[#1e3a24]" : "text-gray-400 hover:text-gray-600"
                      )}
                    >
                      <UserPlus className="w-4 h-4" /> Påmelding
                    </button>
                  )}
                  {isAdmin && (
                    <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-150 gap-0.5 shadow-inner">
                      <button 
                        onClick={() => setView('volunteer')}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer uppercase tracking-tight flex items-center gap-1",
                          view === 'volunteer'
                            ? "bg-white text-gray-900 shadow-xs"
                            : "text-gray-450 hover:text-gray-700"
                        )}
                        style={{ color: view === 'volunteer' ? currentClub.color : undefined }}
                      >
                        <UserPlus className="w-3 h-3" /> Frivilligside
                      </button>
                      <button 
                        onClick={() => setView('admin')}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer uppercase tracking-tight flex items-center gap-1",
                          view === 'admin'
                            ? "bg-white text-gray-900 shadow-xs"
                            : "text-gray-450 hover:text-gray-700"
                        )}
                        style={{ color: view === 'admin' ? currentClub.color : undefined }}
                      >
                        <LayoutDashboard className="w-3 h-3" /> Admin-konsoll
                      </button>
                    </div>
                  )}
                  <div className="h-6 w-px bg-gray-100 mx-2" />
                  <div className="flex items-center gap-3">
                    <img 
                      src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
                      alt="" 
                      className="w-8 h-8 rounded-full border border-gray-100 shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                    <button 
                      onClick={handleSignOut}
                      className="text-xs font-bold text-red-500 hover:text-red-600 uppercase tracking-wider flex items-center gap-1.5"
                    >
                      Logg ut <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              ) : (
                <button 
                  onClick={handleOpenLogin}
                  className="bg-[#1e3a24] text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[#2d5635] shadow-lg shadow-[#1e3a24]/10 transition-all hover:-translate-y-0.5 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  Logg inn
                </button>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-gray-400">
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden overflow-hidden bg-white border-bottom border-gray-100 px-4 pb-6"
            >
              <div className="flex flex-col gap-4">
                {user ? (
                  <>
                    {!isAdmin && (
                      <button 
                        onClick={() => { setView('volunteer'); setIsMenuOpen(false); }}
                        className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl font-bold"
                      >
                        <UserPlus className="w-5 h-5" /> Påmelding
                      </button>
                    )}
                    {isAdmin && (
                      <div className="flex flex-col gap-2 p-1.5 bg-gray-50 border border-gray-150 rounded-2xl">
                        <button 
                          onClick={() => { setView('volunteer'); setIsMenuOpen(false); }}
                          className={cn(
                            "flex items-center justify-center gap-2.5 p-3 rounded-xl text-xs font-black transition-all",
                            view === 'volunteer' 
                              ? "bg-[#1e3a24] text-white shadow-sm" 
                              : "text-gray-550 hover:bg-gray-100"
                          )}
                          style={{ backgroundColor: view === 'volunteer' ? currentClub.color : undefined }}
                        >
                          <UserPlus className="w-4 h-4" /> Vis Frivilligside
                        </button>
                        <button 
                          onClick={() => { setView('admin'); setIsMenuOpen(false); }}
                          className={cn(
                            "flex items-center justify-center gap-2.5 p-3 rounded-xl text-xs font-black transition-all",
                            view === 'admin' 
                              ? "bg-[#1e3a24] text-white shadow-sm" 
                              : "text-gray-550 hover:bg-gray-100"
                          )}
                          style={{ backgroundColor: view === 'admin' ? currentClub.color : undefined }}
                        >
                          <LayoutDashboard className="w-4 h-4" /> Åpne Admin-konsoll
                        </button>
                      </div>
                    )}
                    <button 
                      onClick={handleSignOut}
                      className="flex items-center gap-3 p-4 text-red-500 font-bold"
                    >
                      <LogOut className="w-5 h-5" /> Logg ut
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => { handleOpenLogin(); setIsMenuOpen(false); }}
                    className="flex items-center justify-center gap-3 p-4 bg-[#1e3a24] text-white rounded-2xl font-bold cursor-pointer"
                  >
                    <LogIn className="w-5 h-5" />
                    Logg inn
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!user ? (
          <div className="text-center py-20 px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-xl mx-auto"
            >
              <div 
                className="mb-8 inline-block p-4 rounded-3xl"
                style={{ backgroundColor: `${currentClub.color}0d` }}
              >
                <ShieldCheck className="w-12 h-12" style={{ color: currentClub.color }} />
              </div>
              <h1 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight mb-6 uppercase">
                {activeClubId === '999' ? 'Prøv Frivilligportalen! 🔮' : `Vil du bidra i ${currentClub.name}? ${currentClub.logo}`}
              </h1>
              <p className="text-lg text-gray-650 mb-10 leading-relaxed font-bold">
                {activeClubId === '999' 
                  ? 'Dette er en interaktiv sandkasse. Logg inn med din Google-konto eller en test-epost for å registrere en profil, melde deg på testvakter og utforske leder-konsollen!'
                  : 'Vi trenger flere varme hender! Registrer deg som frivillig i dag og bli en del av vårt unike sosiale fellesskap på Smerta. Logg inn for å velge vakter.'}
              </p>
              <button 
                onClick={handleOpenLogin}
                className="group relative inline-flex items-center justify-center gap-3 text-white px-10 py-5 rounded-2xl font-black text-lg transition-all hover:scale-[1.02] active:scale-[0.98] uppercase tracking-wider w-full sm:w-auto cursor-pointer"
                style={{ 
                  backgroundColor: currentClub.color,
                  boxShadow: `0 20px 25px -5px ${currentClub.color}33`
                }}
              >
                <LogIn className="w-6 h-6" /> Kom i gang / Logg inn
                <div className="absolute -inset-1 bg-white/20 blur opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
              </button>
              
              <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { icon: Landmark, title: 'Godt fellesskap', desc: 'Møt andre dedikerte medlemmer i et uformelt miljø.' },
                  { icon: Trees, title: 'Flott anlegg', desc: 'Bidra til at Smerta fremstår på sitt aller beste.' },
                  { icon: Trophy, title: 'Sosiale fordeler', desc: 'Vi spanderer kaffe og holder varme takkesamlinger.' }
                ].map((feature, i) => (
                  <div key={i} className="text-left space-y-2">
                    <feature.icon className="w-6 h-6 text-amber-500" />
                    <h3 className="font-bold text-gray-950 uppercase text-xs tracking-wider">{feature.title}</h3>
                    <p className="text-xs text-gray-500 font-bold leading-normal">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {view === 'admin' ? (
              isAdmin ? (
                <motion.div
                  key="admin"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {isOwner ? <AppOwnerDashboard /> : <AdminDashboard 
                      user={user} 
                      isAdmin={isAdmin} 
                      isClubAdmin={isClubAdmin} 
                      userRole={userRole} 
                      activeClubId={activeClubId}
                    />}
                </motion.div>
              ) : (user?.email && BOOTSTRAP_ADMIN_EMAILS.includes(user.email.toLowerCase())) ? (
                <div className="text-center py-20">
                  <ShieldCheck className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Aktiver Admin-tilgang</h2>
                  <p className="text-gray-600 mb-8 text-balance max-w-md mx-auto">
                    Du er eieren eller systemansvarlig for systemet (`{user.email}`). 
                    Trykk nedenfor for å aktivere admin-tilgang for din konto.
                  </p>
                  <button 
                    onClick={claimAdmin}
                    disabled={isClaiming}
                    className="bg-amber-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-amber-600 transition-all disabled:opacity-50 flex items-center gap-2 mx-auto"
                  >
                    {isClaiming ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ShieldCheck className="w-5 h-5" /> Aktiver Admin</>}
                  </button>
                </div>
              ) : (
                <div className="text-center py-20">
                  <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Ingen admin-tilgang</h2>
                  <p className="text-gray-600 mb-4 text-balance">
                    Du er logget inn som frivillig, men har ikke tilgang til admin-panelet. 
                  </p>
                  
                  <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6 max-w-md mx-auto mb-8 text-left space-y-2.5">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Din Unike ID (UID)</p>
                    <code className="text-xs font-mono bg-white px-4 py-3 rounded-2xl block border border-gray-100 select-all break-all shadow-sm">{user.uid}</code>
                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
                      Vennligst oppgi denne ID-en til Hovedadmin eller app-eier (f.eks. `jarlemidt@gmail.com`) for å få tildelt riktig tilgang (f.eks. Banemester, Rangeransvarlig m.m.).
                    </p>
                  </div>

                  <button 
                    onClick={() => setView('volunteer')}
                    className="text-[#1e3a24] font-bold underline transition-colors hover:text-[#2d5635]"
                    style={{ color: currentClub.color }}
                  >
                    Tilbake til påmelding
                  </button>
                </div>
              )
            ) : (
              <motion.div
                key="volunteer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <VolunteerForm activeClubId={activeClubId} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">© 2026 Ski Golfklubb</span>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-2 justify-center">
            <a href="https://skigk.no" target="_blank" rel="noreferrer" className="text-xs font-bold text-gray-400 hover:text-[#1e3a24] uppercase tracking-wider transition-colors">Nettside</a>
            <a href="https://www.facebook.com/skigolfklubb" target="_blank" rel="noreferrer" className="text-xs font-bold text-gray-400 hover:text-[#1e3a24] uppercase tracking-wider transition-colors">Facebook</a>
            <a href="https://www.instagram.com/skigolfklubb/" target="_blank" rel="noreferrer" className="text-xs font-bold text-gray-400 hover:text-[#1e3a24] uppercase tracking-wider transition-colors">Instagram</a>
          </div>
        </div>
      </footer>

      {/* Custom Login Choice Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-100 relative text-left"
            >
              {/* Close Button */}
              <button 
                onClick={() => setShowLoginModal(false)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-650 rounded-full hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {loginStep === 'golfbox' ? (
                <form onSubmit={handleGolfboxIdSubmit} className="space-y-5">
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Trinn 1 av 2 • Portalkobling</span>
                    <h3 className="text-xl font-black text-gray-900 leading-tight mt-0.5">Angi din Golfbox ID</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Systemet støtter flere klubber. Vennligst oppgi din Golfbox ID først. Dette sikrer at du lander i din egen klubbportal.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
                      Golfbox ID (Klubb ID-Medlemsnr)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="F.eks. 73-xxxxx eller 999-xxxxx"
                      value={loginGolfboxId}
                      onChange={(e) => setLoginGolfboxId(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 font-bold text-sm bg-gray-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1e3a24] focus:border-transparent transition-all"
                    />
                    <p className="text-[10px] text-gray-400 font-medium mt-1.5 leading-relaxed">
                      💡 Formatet må være Klubbnummer-Medlemsnummer. F.eks. <strong className="text-gray-600">73-</strong> for Ski Golfklubb eller <strong className="text-gray-600">999-</strong> for Demoklubben.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 hover:opacity-90 text-white rounded-xl font-bold text-sm transition-all shadow-md cursor-pointer text-center"
                    style={{ backgroundColor: currentClub.color }}
                  >
                    Bekreft klubb & fortsett
                  </button>
                </form>
              ) : (
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                      {isAdminRoute ? 'Admininnlogging • Verifisering' : 'Trinn 2 av 2 • Verifisering'}
                    </span>
                    <h3 className="text-xl font-black text-gray-900 leading-tight mt-0.5">
                      {isAdminRoute ? 'Sikker admininnlogging' : 'Sikker pålogging'}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {isAdminRoute
                        ? 'Logg inn med Google-kontoen som er godkjent for klubbens adminpanel.'
                        : 'Logg inn med din Google-konto for å koble påloggingen til din Golfbox-profil.'}
                    </p>
                  </div>

                  {/* Club Identification Info Banner */}
                  {!isAdminRoute && <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col gap-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 font-bold">Identifisert portal:</span>
                      <span className="font-extrabold uppercase flex items-center gap-1" style={{ color: currentClub.color }}>
                        {currentClub.logo} {currentClub.name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 font-bold">Tilknyttet Golfbox-ID:</span>
                      <span className="font-mono font-bold text-gray-700">{loginGolfboxId}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLoginStep('golfbox')}
                      className="mt-2 text-[10px] font-black hover:underline uppercase tracking-wider text-left transition-all"
                      style={{ color: currentClub.color }}
                    >
                      🔄 Endre Golfbox ID / Portal
                    </button>
                  </div>}

                  <div className="space-y-4">
                    {/* Google sign-in */}
                    <button 
                      onClick={handleGoogleSignIn}
                      disabled={isSigningIn}
                      className="w-full relative inline-flex items-center justify-center gap-3 bg-white text-gray-700 hover:bg-gray-50 px-6 py-3.5 rounded-xl border border-gray-200 font-bold text-sm transition-all shadow-sm cursor-pointer hover:border-gray-300 disabled:opacity-50"
                    >
                      {isSigningIn ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: currentClub.color }} /> : (
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                      )}
                      Logg inn med Google
                    </button>

                    <div className="pt-3 border-t border-gray-100 flex items-start gap-2 text-[10px] text-gray-500 font-bold leading-relaxed">
                      <span className="shrink-0" style={{ color: currentClub.color }}>🔒 SIKKERHET:</span>
                      <span>
                        Kun godkjente, registrerte live Google-kontoer har tilgang til portalen.
                      </span>
                    </div>

                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic Error Modal */}
      <AnimatePresence>
        {loginError && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-red-100"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-red-50 rounded-2xl text-red-600 shrink-0">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">
                    {loginErrorCode === 'auth/unauthorized-domain' || loginErrorCode?.includes('api-key')
                      ? 'Konfigurasjonsfeil (Firebase)'
                      : 'Innloggingsfeil'}
                  </h3>
                  <p className="text-xs text-red-500 font-mono mt-1">{loginErrorCode || 'auth/login-failed'}</p>
                </div>
              </div>
              
              <div className="space-y-4 bg-gray-50 p-5 rounded-2xl text-sm text-gray-700 leading-relaxed max-h-[300px] overflow-y-auto font-sans whitespace-pre-line border border-gray-100">
                {loginError}
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <a 
                  href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 bg-[#1e3a24] text-white py-3.5 rounded-xl font-bold text-sm text-center hover:bg-[#2d5635] shadow-lg shadow-[#1e3a24]/10 transition-colors flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" /> Åpne Firebase Console
                </a>
                <button 
                  onClick={() => setLoginError(null)}
                  className="px-6 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition-colors cursor-pointer"
                >
                  Lukk
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Share Portal URLs Modal */}
      <AnimatePresence>
        {showShareModal && (() => {
          const currentSelClub = accessibleClubs.find(c => c.id === selectedShareClubId) || accessibleClubs[0];
          const baseClubUrl = currentSelClub && 'domain' in currentSelClub && currentSelClub.domain
            ? `https://${currentSelClub.domain}`
            : (typeof window !== 'undefined' ? window.location.origin : 'https://frivillig-kalendar-skigk.web.app');

          const links = [
            {
              type: 'volunteer',
              title: 'Påmeldingsportal / Frivilligside',
              desc: 'Gå direkte til frivillig-siden hvor medlemmer melder seg på ledige vakter.',
              url: `${baseClubUrl}/${scrambleUrl(selectedShareClubId, 'volunteer')}`,
              pillColor: 'bg-green-50 text-[#1e3a24] border border-[#1e3a24]/10'
            },
            {
              type: 'admin',
              title: 'Klubb-admin / Leder-pult',
              desc: 'Gå direkte til administrator-konsollen for underkomiteer og særgrupper.',
              url: `${baseClubUrl}/${scrambleUrl(selectedShareClubId, 'admin')}`,
              pillColor: 'bg-blue-50 text-blue-800 border border-blue-200'
            },
            ...(isOwner ? [{
              type: 'appOwner',
              title: 'App-eier / Systemansvarlig',
              desc: 'Spesiallenke for hovedadmin med overordnet kontroll.',
              url: `${baseClubUrl}/${scrambleUrl(selectedShareClubId, 'admin', 'appOwner')}`,
              pillColor: 'bg-indigo-50 text-indigo-850 border border-indigo-200'
            }] : [])
          ];

          const handleCopy = async (text: string, type: string) => {
            try {
              await navigator.clipboard.writeText(text);
              setCopiedLinkType(type);
              setTimeout(() => setCopiedLinkType(null), 2000);
            } catch (e) {
              console.error(e);
            }
          };

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-gray-150 relative text-left"
              >
                {/* Close Button */}
                <button
                  onClick={() => setShowShareModal(false)}
                  className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-50 transition-colors cursor-pointer animate-fade-in"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="mb-6 animate-fade-in">
                  <div className="flex items-center gap-2 mb-1">
                    <Share2 className="w-5 h-5 text-gray-400" />
                    <span className="text-[10px] font-black uppercase text-gray-450 tracking-wider">Distribusjon & Deling</span>
                  </div>
                  <h3 className="text-2xl font-black text-gray-950 leading-none uppercase">Direktelenker for klubber og roller</h3>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed font-semibold">
                    Kopier og del disse tilpassede URL-ene direkte via SMS, e-post eller Spond-invitasjoner. Nettsiden skifter automatisk klubb og rolle ved innlasting!
                  </p>
                </div>

                {/* 1. Club Selector Tab inside Modal */}
                {accessibleClubs.length > 1 && (
                  <div className="bg-gray-100/80 p-1 rounded-2xl flex items-center gap-1 mb-6 border border-gray-150 shadow-inner">
                    {accessibleClubs.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedShareClubId(c.id)}
                        className={cn(
                          "flex-grow py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5",
                          selectedShareClubId === c.id
                            ? "bg-white shadow-xs text-gray-950"
                            : "text-gray-400 hover:text-gray-750"
                        )}
                        style={{ color: selectedShareClubId === c.id ? c.color : undefined }}
                      >
                        {c.logo} <span className="hidden sm:inline">{c.name}</span><span className="sm:hidden">{c.id === '73' ? 'Ski' : 'Demo'}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* 2. List of URLs */}
                <div className="space-y-4">
                  {links.map((link) => {
                    const isCopied = copiedLinkType === link.type;
                    return (
                      <div 
                        key={link.type}
                        className="p-4 rounded-2xl border border-gray-200 bg-gray-50/30 hover:bg-gray-50/80 transition-all space-y-3"
                      >
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <span className={cn("px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider inline-block", link.pillColor)}>
                              {link.title}
                            </span>
                            <p className="text-xs text-gray-500 leading-snug font-bold">{link.desc}</p>
                          </div>
                        </div>

                        <div className="flex bg-white border border-gray-200 rounded-xl p-1.5 items-center gap-3 shadow-xs">
                          <code className="text-[10px] font-mono text-gray-800 select-all font-bold break-all flex-grow px-2 truncate">
                            {link.url}
                          </code>
                          <button
                            onClick={() => handleCopy(link.url, link.type)}
                            className={cn(
                              "px-3.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all shrink-0",
                              isCopied
                                ? "bg-green-600 text-white shadow-xs"
                                : "bg-gray-900 text-white hover:bg-gray-800"
                            )}
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5" /> Kopiert!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" /> Kopier
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 pt-5 border-t border-gray-150 flex items-start gap-2 text-[10px] text-gray-450 leading-relaxed font-bold">
                  <span className="text-[#1e3a24] shrink-0">💡 TIPS:</span>
                  <span>
                    Når en person åpner en av disse tilpassede lenkene, lagres klubben (<strong className="text-gray-950">active_club_id</strong>) lokalt på deres enhet. Neste gang de besøker nettstedet, sendes de automatisk til riktig klubbside!
                  </span>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Order Portal Info & Leads Modal */}
      <AnimatePresence>
        {showOrderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-gray-150 relative text-left animate-fade-in"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowOrderModal(false)}
                className="absolute top-4 right-4 p-2 text-gray-440 hover:text-gray-700 rounded-full hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-5 h-5 text-indigo-650" />
                  <span className="text-[10px] font-black uppercase text-indigo-650 tracking-wider">Alt-i-ett Frivilligportal</span>
                </div>
                <h3 className="text-2xl font-black text-gray-950 leading-none uppercase">Få Frivilligportalen til din egen klubb!</h3>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed font-semibold">
                  Slipp manuelt kaos med Excel-ark, e-poster og SMS-er. Frivilligportalen gir klubbens ledere og medlemmer et felles, vakkert og lynraskt system for dugnadsplanlegging.
                </p>
              </div>

              {/* Grid content */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/50 space-y-2">
                  <h4 className="font-black text-xs text-indigo-950 uppercase tracking-tight flex items-center gap-1.5">
                    🚀 Hva er inkludert?
                  </h4>
                  <ul className="text-xs space-y-1.5 font-semibold text-gray-700">
                    <li className="flex items-start gap-1.5">
                      <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      <span>Egen portal tilpasset klubbens farger og logo</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      <span>Mobilvennlig påmelding for alle medlemmer</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      <span>Ubegrenset antall særgrupper og administratorer</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      <span>Innebygde påminnelser og meldingsfunksjon</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      <span>Eksport til Excel / utskriftsklare vaktlister</span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-150 space-y-3">
                  <h4 className="font-black text-xs text-gray-950 uppercase tracking-tight">
                    🔥 Slik tester du i demoen nå:
                  </h4>
                  <div className="space-y-2.5 text-xs text-gray-600 font-semibold leading-relaxed">
                    <p>
                      1. Logg inn med Google for å koble til din godkjente profil.
                    </p>
                    <p>
                      2. Gå til <strong className="text-gray-950 font-black">Frivilligside</strong> og meld deg på ledige vakter for å se hvor raskt det er.
                    </p>
                    <p>
                      3. Gå til <strong className="text-gray-950 font-black">Admin-konsoll</strong> for å opprette egne test-vakter, endre særgrupper eller godkjenne frivillige!
                    </p>
                  </div>
                </div>
              </div>

              {/* Call to action & Contact details */}
              <div className="p-5 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <h4 className="font-extrabold text-sm uppercase text-indigo-400">Klar til å bestille eller lurer du på pris?</h4>
                  <p className="text-[10px] text-gray-400 font-bold">Vi setter opp en klar-til-bruk portal med din profil på under 24 timer!</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto">
                  <a
                    href="mailto:owe-admin@golfklubb-it.com?subject=Interesse%20for%20Frivilligportalen&body=Hei!%20%0A%0AVi%20er%20interessert%20i%20%C3%A8%20h%C3%B8re%20mer%20om%20Frivilligportalen%20for%20v%C3%A5r%20klubb.%0A%0AKlubbens%20navn:%2520%0AKontaktperson:%2520%0ATelefon:%2520%0A%0AMed%20vennlig%2520hilsen"
                    className="bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-black uppercase tracking-wider px-5 py-3 rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all text-center"
                  >
                    <Mail className="w-3.5 h-3.5" /> Send Forespørsel
                  </a>
                  <a
                    href="tel:+4747265100"
                    className="bg-slate-800 hover:bg-slate-750 border border-slate-700 text-white text-xs font-black uppercase tracking-wider px-4 py-3 rounded-xl flex items-center justify-center gap-1 transition-all text-center font-bold"
                  >
                    Ring Owe (47 26 51 00)
                  </a>
                </div>
              </div>

              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="text-xs text-gray-400 hover:text-gray-650 font-bold underline cursor-pointer"
                >
                  Lukk og fortsett testingen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
