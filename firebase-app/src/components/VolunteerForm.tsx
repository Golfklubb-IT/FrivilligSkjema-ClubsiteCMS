import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, getDoc, setDoc, serverTimestamp, collection, onSnapshot } from 'firebase/firestore';
import { 
  CheckCircle2, 
  ChevronRight, 
  Loader2, 
  User, 
  Phone, 
  Mail, 
  Clock, 
  Calendar, 
  AlertCircle, 
  CalendarRange, 
  ChevronLeft, 
  MapPin, 
  CornerDownRight, 
  Check, 
  Sparkles,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { db, auth, onAuthStateChanged } from '../lib/firebase';
import { cn } from '../lib/utils';
import { handleFirestoreError } from '../services/errorService';
import { OperationType } from '../types';

const TASKS = [
  'Turneringskomiteen',
  'Banekomiteen',
  'Sponsorkomiteen',
  'Baneverter',
  'Huskomiteen',
  'Seniorkomiteen',
  'Herrekomiteen',
  'Handicapkomiteen',
  'Dugnadskomiteen'
];

const AVAILABILITY = [
  'Dagtid hverdager',
  'Ettermiddag/Kveld hverdager',
  'Helger',
  'Fleksibel'
];

const MEMBER_CALENDARS = [
  { id: 'all', name: 'Felleskalender', manager: 'Alle komiteer på Smerta', tasks: [
    'Turneringskomiteen',
    'Banekomiteen',
    'Sponsorkomiteen',
    'Baneverter',
    'Huskomiteen',
    'Seniorkomiteen',
    'Herrekomiteen',
    'Handicapkomiteen',
    'Dugnadskomiteen'
  ] },
  { id: 'turnering', name: 'Turneringskomiteen', manager: 'Turneringskoordinator (epost: turnering@skigk.no)', tasks: ['Turneringskomiteen'] },
  { id: 'bane', name: 'Banekomiteen', manager: 'Baneansvarlig (epost: bane@skigk.no)', tasks: ['Banekomiteen'] },
  { id: 'sponsor', name: 'Sponsorkomiteen', manager: 'Markedskomiteen/Sponsorgruppen', tasks: ['Sponsorkomiteen'] },
  { id: 'banevert', name: 'Baneverter', manager: 'Hovedbanevert (epost: banevert@skigk.no)', tasks: ['Baneverter'] },
  { id: 'hus', name: 'Huskomiteen', manager: 'Klubbhus-ansvarlig', tasks: ['Huskomiteen'] },
  { id: 'senior', name: 'Seniorkomiteen', manager: 'Seniorkomiteen (epost: senior@skigk.no)', tasks: ['Seniorkomiteen'] },
  { id: 'herre', name: 'Herrekomiteen', manager: 'Herrekomiteen (epost: herre@skigk.no)', tasks: ['Herrekomiteen'] },
  { id: 'handicap', name: 'Handicapkomiteen', manager: 'Handicapkomiteen (epost: handicap@skigk.no)', tasks: ['Handicapkomiteen'] },
  { id: 'dugnad', name: 'Dugnadskomiteen', manager: 'TBA', tasks: ['Dugnadskomiteen'] }
];

const CLUBS = [
  { id: '73', name: 'Ski Golfklubb', color: '#1e3a24', hoverColor: '#2d5635', bgLight: '#f0fdf4', border: '#bbf7d0', logo: '⛳', contactUrl: 'https://skigk.no/klubb/kontakt' },
  { id: '999', name: 'Demoklubben', color: '#0f172a', hoverColor: '#1e293b', bgLight: '#f8fafc', border: '#e2e8f0', logo: '🔮', contactUrl: 'https://skigk.no/klubb/kontakt' }
];

const formatNorwegianDate = (dateStr: string) => {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('no-NO', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
};

const safeConfirm = (msg: string): boolean => {
  if (typeof window !== 'undefined') {
    try {
      return window.confirm(msg);
    } catch (e) {
      console.warn("Iframe blocked standard confirm, auto-approving action for smooth UX.");
      return true;
    }
  }
  return true;
};

interface VolunteerFormProps {
  activeClubId: string;
}

export default function VolunteerForm({ activeClubId }: VolunteerFormProps) {
  const currentClub = CLUBS.find(c => c.id === activeClubId) || CLUBS[0];
  const isSki = activeClubId === '73';

  const [activeTab, setActiveTab] = useState<'mine' | 'booking'>('mine');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [preloaded, setPreloaded] = useState(false);
  const [preloading, setPreloading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    golfboxId: '',
    tasks: [] as string[],
    availability: '',
  });

  const [selectedCalendarId, setSelectedCalendarId] = useState('all');
  const [isRegistered, setIsRegistered] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);

  const [bookingMode, setBookingMode] = useState<'general' | 'specific'>('specific');
  const [dbShifts, setDbShifts] = useState<any[]>([]);
  const [submittingShiftId, setSubmittingShiftId] = useState<string | null>(null);
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState<string | null>(null);

  // Local tracking of Auth user state so components update reactively to sign-in completion.
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // Calendar Year/Month for mini monthly view
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(4); // May (0-indexed)
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
  const [myShiftsFilter, setMyShiftsFilter] = useState<'week' | 'month' | 'all'>('all');

  // Listen to shifts
  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'shifts');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDbShifts(data);
    }, (error) => {
      console.error("Feil ved lytting til vakter:", error);
      try {
        handleFirestoreError(error, OperationType.GET, 'shifts');
      } catch (err) {}
    });
    return () => unsubscribe();
  }, [user]);

  // Sync profile when auth user or activeClubId changes
  useEffect(() => {
    const currentUser = user;
    if (!currentUser) return;

    const loadProfile = async () => {
      setPreloading(true);
      
      // 1. First try club-scoped localStorage
      const localKey = `volunteer_profile_${activeClubId}_v1`;
      const saved = localStorage.getItem(localKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.name || parsed.phone) {
            setFormData({
              name: parsed.name || '',
              phone: parsed.phone || '',
              golfboxId: parsed.golfboxId || '',
              tasks: parsed.tasks || [],
              availability: parsed.availability || ''
            });
            setPreloaded(true);
            setIsRegistered(true);
            setPreloading(false);
            return;
          }
        } catch (e) {
          console.error("Feil ved lesing av lokal profil:", e);
        }
      }

      // 2. Fall back to secure Firestore document using composite key: {uid}_{clubId}
      try {
        const docRef = doc(db, 'volunteers', `${currentUser.uid}_${activeClubId}`);
        const snap = await getDoc(docRef);
        
        if (snap.exists()) {
          const data = snap.data();
          const profileData = {
            name: data.name || '',
            phone: data.phone || '',
            golfboxId: data.golfboxId || '',
            tasks: data.tasks || [],
            availability: data.availability || ''
          };
          setFormData(profileData);
          setPreloaded(true);
          setIsRegistered(true);
          
          // Sync back to localStorage
          localStorage.setItem(localKey, JSON.stringify(profileData));
        } else {
          // No current profile for this club! Reset state so they register.
          setFormData({
            name: '',
            phone: '',
            golfboxId: '',
            tasks: [],
            availability: ''
          });
          setPreloaded(false);
          setIsRegistered(false);
        }
      } catch (err) {
        console.error("Feil ved henting av profil fra Firestore:", err);
      } finally {
        setPreloading(false);
      }
    };

    loadProfile();
  }, [user, activeClubId]);

  const toggleTask = (task: string) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.includes(task)
        ? prev.tasks.filter(t => t !== task)
        : [...prev.tasks, task]
    }));
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // Validate Golfbox ID prefix based on activeClubId
    const trimmedId = formData.golfboxId.trim();
    const expectedPrefix = `${activeClubId}-`;
    if (!trimmedId.startsWith(expectedPrefix)) {
      alert(`Feil Golfbox ID format!\nSiden du registrerer deg for ${currentClub.name}, må Golfbox ID starte med "${expectedPrefix}".\nF.eks. "${expectedPrefix}10524".`);
      return;
    }

    setLoading(true);
    const mockCompositeId = `${currentUser.uid}_${activeClubId}`;

    try {
      const payload = {
        ...formData,
        email: currentUser.email || '',
        clubId: activeClubId,
        submittedAt: serverTimestamp(),
      };

      // Store in standard volunteers collection with compound key {uid}_{clubId}
      await setDoc(doc(db, 'volunteers', mockCompositeId), payload);

      // Save to localStorage specifically for this club/tenant
      localStorage.setItem(`volunteer_profile_${activeClubId}_v1`, JSON.stringify({
        name: formData.name,
        phone: formData.phone,
        golfboxId: formData.golfboxId,
        tasks: formData.tasks,
        availability: formData.availability
      }));

      setSuccess(true);
      setIsRegistered(true);
      setShowProfileEdit(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `volunteers/${mockCompositeId}`);
    } finally {
      setLoading(false);
    }
  };

  // Mini Calendar Calculations
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => {
    let day = new Date(y, m, 1).getDay();
    return day === 0 ? 6 : day - 1; // Adjust Monday to Sunday (0=Mon, 6=Sun)
  };

  const currentCalendar = MEMBER_CALENDARS.find(c => c.id === selectedCalendarId) || MEMBER_CALENDARS[0];

  // Helper to change month
  const changeMonth = (offset: number) => {
    let newM = currentMonth + offset;
    let newY = currentYear;
    if (newM < 0) {
      newM = 11;
      newY -= 1;
    } else if (newM > 11) {
      newM = 0;
      newY += 1;
    }
    setCurrentMonth(newM);
    setCurrentYear(newY);
    setSelectedDateFilter(null);
  };

  const monthNamesNo = [
    'Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni', 
    'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'
  ];

  if (preloading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-gray-500" />
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-none">
          Laster din {currentClub.name} profil...
        </p>
      </div>
    );
  }

  // If user is registered and not actively editing profile
  if (isRegistered && !showProfileEdit) {
    // 1. Active bookings (My shifts) for this user at this specific club
    const myBookings = dbShifts.filter(s => {
      const isMatchingClub = (s.clubId || '73') === activeClubId;
      const parsedGolfboxId = s.golfboxId || '';
      
      const emailMatch = s.volunteerEmail && auth.currentUser?.email && s.volunteerEmail.toLowerCase() === auth.currentUser.email.toLowerCase();
      const golfboxMatch = parsedGolfboxId.trim() !== '' && parsedGolfboxId.toLowerCase() === formData.golfboxId.toLowerCase();
      
      return isMatchingClub && (emailMatch || golfboxMatch);
    }).sort((a, b) => a.date.localeCompare(b.date));

    const now = new Date();
    
    // Calculates if date string is in current Monday-Sunday week
    const isShiftThisWeek = (dateStr: string) => {
      try {
        const [year, month, day] = dateStr.split('-').map(Number);
        const shiftDate = new Date(year, month - 1, day);
        const dayOfWeek = now.getDay();
        const startOfWeek = new Date(now);
        const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        startOfWeek.setDate(now.getDate() + diffToMon);
        startOfWeek.setHours(0,0,0,0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23,59,59,999);
        
        return shiftDate >= startOfWeek && shiftDate <= endOfWeek;
      } catch (e) {
        return false;
      }
    };

    // Calculates if date string is in current month
    const isShiftThisMonth = (dateStr: string) => {
      try {
        const [year, month, day] = dateStr.split('-').map(Number);
        const shiftDate = new Date(year, month - 1, day);
        return shiftDate.getFullYear() === now.getFullYear() && shiftDate.getMonth() === now.getMonth();
      } catch (e) {
        return false;
      }
    };

    const thisWeeksBookings = myBookings.filter(s => isShiftThisWeek(s.date));
    const thisMonthsBookings = myBookings.filter(s => isShiftThisMonth(s.date));
    
    const displayedMyBookings = myShiftsFilter === 'week' 
      ? thisWeeksBookings 
      : myShiftsFilter === 'month' 
        ? thisMonthsBookings 
        : myBookings;

    // Filter available calendars list (shift groups/departments) to only those the user is registered/interested in
    const userInterests = formData.tasks || [];
    const allowedCalendars = MEMBER_CALENDARS.filter(c => {
      if (c.id === 'all') return true;
      const hasInterest = userInterests.includes(c.name) || userInterests.some(t => c.tasks.includes(t));
      const hasBooking = myBookings.some(sh => c.tasks.includes(sh.task));
      return hasInterest || hasBooking;
    });

    const filteredCalendars = allowedCalendars.length > 1 ? allowedCalendars : MEMBER_CALENDARS;

    // REDEFINE active currentCalendar using only filtered options to fix over-visibility
    const foundCalendar = filteredCalendars.find(c => c.id === selectedCalendarId) || filteredCalendars[0];
    const currentCalendar = {
      ...foundCalendar,
      tasks: selectedCalendarId === 'all' && filteredCalendars.length > 1
        ? filteredCalendars.filter(c => c.id !== 'all').reduce((acc, curr) => [...acc, ...curr.tasks], [] as string[])
        : foundCalendar.tasks
    };

    // 2. Vacant shifts filtered by active club AND selected category/calendar
    const vacantShifts = dbShifts.filter(s => {
      const isVacant = s.volunteerId === 'vacant';
      const isMatchingClub = (s.clubId || '73') === activeClubId;
      const isMatchingTask = currentCalendar.tasks.includes(s.task);
      return isVacant && isMatchingClub && isMatchingTask;
    }).sort((a, b) => a.date.localeCompare(b.date));

    // Further date filtration if calendar day is clicked
    const displayedVacantShifts = selectedDateFilter 
      ? vacantShifts.filter(s => s.date === selectedDateFilter)
      : vacantShifts;

    return (
      <div className="space-y-8 pb-12">
        {/* Welcome Block scoped nicely to active club */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-150 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 animate-fade-in">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: currentClub.color }} />
              <span className="text-[10px] font-black tracking-wider uppercase" style={{ color: currentClub.color }}>
                {currentClub.name} Frivilligportal
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-none">
              Velkommen, {formData.name || 'Frivillig'}! {currentClub.logo}
            </h1>
            <p className="text-xs text-gray-500 font-bold leading-relaxed max-w-xl">
              MedlemsID: <span className="font-extrabold text-gray-700">{formData.golfboxId}</span> • 
              Mobil: <span className="font-extrabold text-gray-700">{formData.phone || 'Ikke oppgitt'}</span> • 
              E-post: <span className="font-extrabold text-gray-700">{auth.currentUser?.email}</span>
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {formData.tasks && formData.tasks.length > 0 ? (
                formData.tasks.map(t => (
                  <span key={t} className="text-[9px] bg-slate-100 font-black px-2.5 py-1 rounded-lg text-slate-600 uppercase tracking-wider">
                    ✓ {t}
                  </span>
                ))
              ) : (
                <span className="text-[10px] bg-amber-50 text-amber-600 font-black px-2.5 py-1 rounded-lg">
                  Ingen faste interesser valgt ennå
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setStep(1);
              setShowProfileEdit(true);
            }}
            className="shrink-0 px-5 py-3 border border-gray-200 hover:border-gray-300 rounded-2xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            <User className="w-4 h-4 text-gray-400" /> Rediger profil & Golfbox
          </button>
        </div>

        {/* Dashboard Tabs Menus */}
        <div className="flex p-1.5 bg-gray-100 rounded-2xl max-w-md">
          <button
            type="button"
            onClick={() => setActiveTab('mine')}
            className={cn(
              "flex-1 py-3 text-xs font-black rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 uppercase tracking-wider",
              activeTab === 'mine' 
                ? "bg-white shadow-xs" 
                : "text-gray-500 hover:text-gray-700"
            )}
            style={{ color: activeTab === 'mine' ? currentClub.color : undefined }}
          >
            <CheckCircle2 className="w-4 h-4" /> mine vakter ({myBookings.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('booking')}
            className={cn(
              "flex-1 py-3 text-xs font-black rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 uppercase tracking-wider",
              activeTab === 'booking' 
                ? "bg-white shadow-xs" 
                : "text-gray-500 hover:text-gray-700"
            )}
            style={{ color: activeTab === 'booking' ? currentClub.color : undefined }}
          >
            <CalendarRange className="w-4 h-4" /> vaktkalendere & påmelding
            {(() => {
              const count = dbShifts.filter(s => s.volunteerId === 'vacant' && (s.clubId || '73') === activeClubId).length;
              return count > 0 ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-black text-white ml-1" style={{ backgroundColor: currentClub.color }}>
                  {count}
                </span>
              ) : null;
            })()}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'mine' ? (
            <motion.div 
              key="mine-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Mine Vakter - Linje for Linje (Minimalistic, requested design) */}
              <div className="space-y-4">
                {(() => {
                  const userInterests = formData.tasks || [];
                  const relevantCalendars = MEMBER_CALENDARS.filter(c => {
                    if (c.id === 'all') return false;
                    // Matches user interests or existing bookings
                    const hasInterest = userInterests.includes(c.name) || userInterests.some(t => c.tasks.includes(t));
                    const hasBooking = myBookings.some(sh => c.tasks.includes(sh.task));
                    return hasInterest || hasBooking;
                  });

                  const displayedCalendars = relevantCalendars.length > 0 
                    ? relevantCalendars 
                    : MEMBER_CALENDARS.filter(c => c.id !== 'all').slice(0, 3);

                  return displayedCalendars.map(r => {
                    const calendarBookings = displayedMyBookings.filter(sh => r.tasks.includes(sh.task));
                    const nextThreeBookings = calendarBookings.slice(0, 3);

                    return (
                      <div 
                        key={r.id} 
                        className="bg-white p-6 rounded-3xl border border-gray-150 shadow-xs space-y-4"
                      >
                        {/* Header structure */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                          <div>
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">
                              ⛳ {r.name}
                            </h3>
                            <p className="text-[9px] text-gray-400 font-bold uppercase mt-1 leading-none">
                              Ansvarlig: {r.manager}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCalendarId(r.id);
                              setActiveTab('booking');
                            }}
                            className="px-4 py-2 border border-gray-200 hover:border-gray-300 rounded-xl text-[10px] font-black uppercase text-gray-700 hover:bg-gray-50 flex items-center gap-1 cursor-pointer transition-all active:scale-95 self-start md:self-auto"
                          >
                            Meld deg på flere vakter <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                        </div>

                        {/* Sub-list of registered shifts */}
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                            Dine neste påmeldte oppgaver:
                          </h4>

                          {nextThreeBookings.length === 0 ? (
                            <div className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <p className="text-xs text-gray-400 font-semibold italic">
                                Du har ingen påmeldte dugnadsvakter i denne avdelingen ennå.
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCalendarId(r.id);
                                  setActiveTab('booking');
                                }}
                                className="text-xs font-bold underline cursor-pointer"
                                style={{ color: currentClub.color }}
                              >
                                Finn ledige vakter her
                              </button>
                            </div>
                          ) : (
                            <div className="divide-y divide-gray-100">
                              {nextThreeBookings.map((shift, idx) => (
                                <div 
                                  key={shift.id} 
                                  className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 first:pt-0 last:pb-0"
                                >
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold text-slate-800">
                                    {/* Short, exact line format: Dato : Tid : Hva */}
                                    <span className="text-gray-400 select-none">#{idx + 1}</span>
                                    <span className="text-gray-950 font-black capitalize">
                                      {formatNorwegianDate(shift.date)}
                                    </span>
                                    <span className="text-gray-300 select-none">:</span>
                                    <span className="text-gray-650">
                                      {shift.timeSlot}
                                      {shift.startTime && shift.endTime ? ` (${shift.startTime}-${shift.endTime})` : ''}
                                    </span>
                                    <span className="text-gray-300 select-none">:</span>
                                    <span 
                                      className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider inline-block font-mono"
                                      style={{ 
                                        backgroundColor: `${currentClub.color}08`, 
                                        color: currentClub.color 
                                      }}
                                    >
                                      {shift.task}
                                    </span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (safeConfirm(`Vil du melde deg av vakten som ${shift.task} den ${formatNorwegianDate(shift.date)} (${shift.timeSlot})?`)) {
                                        try {
                                          await setDoc(doc(db, 'shifts', shift.id), {
                                            ...shift,
                                            volunteerId: 'vacant',
                                            volunteerName: '',
                                            volunteerPhone: '',
                                            volunteerEmail: '',
                                            golfboxId: ''
                                          });
                                        } catch (err: any) {
                                          console.error("Feil ved unbooking:", err);
                                          alert(`Kunne ikke melde av vakt: ${err.message}`);
                                        }
                                      }
                                    }}
                                    className="px-3 py-1.5 border border-red-200 text-red-650 hover:bg-red-50 hover:text-red-700 bg-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs shrink-0 self-start md:self-auto"
                                  >
                                    Meld av
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              <div className="pt-4 text-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ski GK © 2026</span>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="booking-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Categories/Comitee Selectors */}
              <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-xs space-y-4 animate-fade-in">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#1e3a24]" style={{ color: currentClub.color }}>
                    Velg vaktgruppe / avdeling
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Klikk under for å bytte mellom de forskjellige ansvarsområdene og filtrere de ledige vaktene.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {filteredCalendars.map(r => {
                    const isSelected = selectedCalendarId === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setSelectedCalendarId(r.id);
                          setSelectedDateFilter(null); // Clear selected date filter on calendar tab swap
                        }}
                        className={cn(
                          "px-4 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider border",
                          isSelected
                            ? "bg-[#1e3a24] text-white border-[#1e3a24]"
                            : "bg-white border-gray-150 hover:border-gray-200 text-gray-700"
                        )}
                        style={{ 
                          backgroundColor: isSelected ? currentClub.color : undefined,
                          borderColor: isSelected ? currentClub.color : undefined
                        }}
                      >
                        {r.id === 'all' ? '🌍 Felles' : r.name}
                        {(() => {
                          const count = vacantShifts.filter(s => r.tasks.includes(s.task)).length;
                          return count > 0 ? (
                            <span className={cn(
                              "text-[9px] px-1.5 py-0.5 rounded-full font-black ml-1.5 leading-none",
                              isSelected ? "bg-white" : "text-white"
                            )}
                            style={{ 
                              color: isSelected ? currentClub.color : undefined,
                              backgroundColor: !isSelected ? currentClub.color : undefined 
                            }}
                            >
                              {count}
                            </span>
                          ) : null;
                        })()}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mini Calendar Month Viewer */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-white p-5 rounded-3xl border border-gray-150 shadow-xs space-y-4 text-center">
                    <div className="flex items-center justify-between border-b border-gray-150 pb-3">
                      <button 
                        type="button" 
                        onClick={() => changeMonth(-1)}
                        className="p-1 px-2 border border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50 rounded-lg text-xs font-bold shrink-0 cursor-pointer"
                      >
                        ←
                      </button>
                      <h4 className="text-xs font-black uppercase text-gray-900 tracking-wider">
                        {monthNamesNo[currentMonth]} {currentYear}
                      </h4>
                      <button 
                        type="button" 
                        onClick={() => changeMonth(1)}
                        className="p-1 px-2 border border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50 rounded-lg text-xs font-bold shrink-0 cursor-pointer"
                      >
                        →
                      </button>
                    </div>

                    {/* Weekday labels */}
                    <div className="grid grid-cols-7 gap-1">
                      {['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'].map(day => (
                        <span key={day} className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center py-1">
                          {day}
                        </span>
                      ))}

                      {/* Padding cells */}
                      {Array.from({ length: getFirstDayOfMonth(currentYear, currentMonth) }).map((_, i) => (
                        <div key={`padding-${i}`} className="py-2.5" />
                      ))}

                      {/* Active Days */}
                      {Array.from({ length: getDaysInMonth(currentYear, currentMonth) }).map((_, i) => {
                        const dayNum = i + 1;
                        const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                        const isFiltered = selectedDateFilter === dateString;

                        // Check if day has vacant shift in this category
                        const availableTasks = currentCalendar.tasks;
                        const hasVacantShift = vacantShifts.some(s => s.date === dateString && availableTasks.includes(s.task));

                        return (
                          <button
                            key={`day-${dayNum}`}
                            type="button"
                            onClick={() => setSelectedDateFilter(isFiltered ? null : dateString)}
                            className={cn(
                              "relative py-2.5 rounded-xl text-xs font-extrabold flex flex-col items-center justify-center cursor-pointer transition-all",
                              isFiltered 
                                ? "text-white scale-105" 
                                : "text-gray-800 hover:bg-slate-100"
                            )}
                            style={{
                              backgroundColor: isFiltered ? currentClub.color : undefined
                            }}
                          >
                            <span>{dayNum}</span>
                            {hasVacantShift && (
                              <span 
                                className="absolute bottom-1.5 w-1.5 h-1.5 rounded-full transition-colors animate-pulse" 
                                style={{ backgroundColor: isFiltered ? 'white' : currentClub.color }}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {selectedDateFilter && (
                      <button
                        type="button"
                        onClick={() => setSelectedDateFilter(null)}
                        className="w-full text-center text-[10px] text-gray-400 font-extrabold uppercase tracking-widest hover:text-[#1e3a24] underline mt-3 cursor-pointer block"
                      >
                        Vis alle datoer for måneden
                      </button>
                    )}
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl text-[10px] leading-relaxed text-slate-500 font-medium">
                    <p className="font-extrabold uppercase tracking-wide text-slate-600 mb-1">
                      Tips for påmelding:
                    </p>
                    Komiteer du er med i, har dager markert med en <span className="font-black" style={{ color: currentClub.color }}>glowing dot</span> under tallet dersom dager har ledige vakter som krever hender. Klikk direkte på datoen for å filtrere!
                  </div>
                </div>

                <div className="lg:col-span-3 space-y-4">
                  <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-150 shadow-xs space-y-6">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                      <div>
                        <h4 className="text-sm font-black text-gray-950 uppercase tracking-wider">
                          Ledige vakter i {currentCalendar.name}
                        </h4>
                        {selectedDateFilter && (
                          <p className="text-[11px] text-gray-450 font-bold mt-1">
                            Filtrert på dato: <span className="font-extrabold capitalize text-gray-700">{formatNorwegianDate(selectedDateFilter)}</span>
                          </p>
                        )}
                      </div>
                      <span className="text-xs bg-slate-100 px-2.5 py-1 rounded-full text-slate-500 font-black">
                        {displayedVacantShifts.length} ledige vakter
                      </span>
                    </div>

                    {displayedVacantShifts.length === 0 ? (
                      <div className="py-12 text-center text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 p-6 space-y-2">
                        <AlertCircle className="w-8 h-8 text-gray-300 mx-auto" />
                        <p className="text-xs font-black">Ingen ledige vakter akkurat her</p>
                        <p className="text-[11px] text-gray-400 max-w-sm mx-auto leading-normal">
                          Det er for øyeblikket ingen ledige timer i denne gruppen eller på den valgte datoen. Vennligst sjekk en annen gruppe, naviger til en annen måned, eller nullstill filteret.
                        </p>
                        {selectedDateFilter && (
                          <button
                            type="button"
                            onClick={() => setSelectedDateFilter(null)}
                            className="text-xs font-black uppercase text-[#1e3a24] underline pt-2 cursor-pointer inline-block"
                            style={{ color: currentClub.color }}
                          >
                            Nullstill datofilter
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                        {displayedVacantShifts.map(shift => {
                          const isMatch = formData.tasks?.includes(shift.task);
                          return (
                            <div 
                              key={shift.id}
                              className={cn(
                                "p-4 bg-white rounded-2xl border border-gray-100 hover:border-gray-200 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4",
                                isMatch ? "border-emerald-100 bg-emerald-50/10" : ""
                              )}
                            >
                              <div className="space-y-1.5 text-left">
                                <div className="flex flex-wrap gap-1.5 items-center">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide inline-block" style={{ backgroundColor: `${currentClub.color}0a`, color: currentClub.color }}>
                                    {shift.task}
                                  </span>
                                  {isMatch && (
                                    <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded text-[9px] font-black tracking-wide inline-block uppercase">
                                      Matcher dine interesser!
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-sm font-black text-gray-900 capitalize">
                                  {formatNorwegianDate(shift.date)}
                                </h4>
                                <p className="text-xs text-gray-500 font-bold flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-gray-400" /> Vaktperiode: {shift.timeSlot}{shift.startTime && shift.endTime ? ` (${shift.startTime}-${shift.endTime})` : ''}
                                </p>
                              </div>

                              <button
                                type="button"
                                disabled={submittingShiftId !== null}
                                onClick={async () => {
                                  if (safeConfirm(`Vil du bekrefte påmelding som ${shift.task} den ${formatNorwegianDate(shift.date)} (${shift.timeSlot}${shift.startTime && shift.endTime ? ` [kl ${shift.startTime}-${shift.endTime}]` : ''})?`)) {
                                    setSubmittingShiftId(shift.id);
                                    try {
                                      // Real-time booking
                                      await setDoc(doc(db, 'shifts', shift.id), {
                                        ...shift,
                                        volunteerId: auth.currentUser?.uid || 'custom-uid',
                                        volunteerName: formData.name,
                                        volunteerPhone: formData.phone,
                                        volunteerEmail: auth.currentUser?.email || '',
                                        golfboxId: formData.golfboxId,
                                        clubId: activeClubId
                                      });
                                      
                                      // Show confirmation
                                      setBookingSuccessMsg(`Bokkingsbehandling utført! Du er registrert for vakten på den ${formatNorwegianDate(shift.date)}.`);
                                      setTimeout(() => setBookingSuccessMsg(null), 5000);
                                    } catch (err: any) {
                                      console.error("Feil ved booking:", err);
                                      alert(`Feil ved lagring: ${err.message}`);
                                    } finally {
                                      setSubmittingShiftId(null);
                                    }
                                  }
                                }}
                                className="w-full sm:w-auto px-4 py-2.5 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer hover:scale-[1.02] disabled:opacity-50 shrink-0 uppercase tracking-widest"
                                style={{ backgroundColor: currentClub.color }}
                              >
                                {submittingShiftId === shift.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  "Meld på ➔"
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {bookingSuccessMsg && (
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-black rounded-2xl flex items-center gap-3"
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>{bookingSuccessMsg}</span>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // If user is editing/completing profile
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-3xl shadow-lg border border-gray-150 overflow-hidden">
        {/* Progress Bar with currentClub branding */}
        <div className="h-2 bg-gray-100 flex">
          <motion.div 
            initial={{ width: '0%' }}
            animate={{ width: `${(step / 3) * 100}%` }}
            className="h-full"
            style={{ backgroundColor: currentClub.color }}
          />
        </div>

        <form onSubmit={handleProfileSubmit} className="p-8 md:p-12">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wider block" style={{ color: currentClub.color }}>
                    Nivå 4: Frivillig Registrering
                  </span>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight">Klubbmedlemskap ⛳️</h2>
                  <p className="text-gray-500 text-xs">Vennligst oppgi din medlemsinformasjon for å koble deg til <strong>{currentClub.name}</strong>.</p>
                </div>

                {preloaded && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="border rounded-2xl p-4 flex items-start gap-3"
                    style={{ backgroundColor: `${currentClub.color}05`, borderColor: `${currentClub.color}1a` }}
                  >
                    <div className="p-1 px-1.5 text-white text-[9px] font-black rounded-lg mt-0.5 tracking-wider uppercase" style={{ backgroundColor: currentClub.color }}>
                      Gjenkjent
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-black leading-snug" style={{ color: currentClub.color }}>Prefylte felter tilgjengelig!</p>
                      <p className="text-[10px] text-gray-400 font-bold leading-normal mt-0.5">Vi fant en eksisterende profil som du kan verifisere eller justere under.</p>
                    </div>
                  </motion.div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Ditt Fullt Navn</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        required
                        type="text"
                        placeholder="Skriv inn ditt fulle navn"
                        value={formData.name}
                        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-transparent rounded-2xl focus:ring-2 focus:bg-white transition-all outline-none text-sm font-bold text-gray-850"
                        style={{ '--tw-ring-color': currentClub.color } as React.CSSProperties}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Golfbox UID (Unikt Medlemsnr)</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        required
                        type="text"
                        placeholder={`${activeClubId}-xxxxx`}
                        value={formData.golfboxId}
                        onChange={e => setFormData(prev => ({ ...prev, golfboxId: e.target.value }))}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-transparent rounded-2xl focus:ring-2 focus:bg-white transition-all outline-none text-sm font-mono font-bold text-gray-850"
                        style={{ '--tw-ring-color': currentClub.color } as React.CSSProperties}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold leading-relaxed mt-1.5">
                      🚨 Unik Golfbox-ID som kobler deg til {currentClub.name}. Må starte med prefixet <strong className="text-gray-600">"{activeClubId}-"</strong>.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Mobilnummer</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        required
                        type="tel"
                        placeholder="Mobilnummer (8 siffer)"
                        value={formData.phone}
                        onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-transparent rounded-2xl focus:ring-2 focus:bg-white transition-all outline-none text-sm font-bold text-gray-850"
                        style={{ '--tw-ring-color': currentClub.color } as React.CSSProperties}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">E-postadresse (Låst)</label>
                    <div className="relative opacity-65 cursor-not-allowed">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        disabled
                        type="email"
                        value={auth.currentUser?.email || ''}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-transparent rounded-2xl outline-none text-sm font-bold text-gray-500"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] bg-slate-100 text-slate-500 font-black px-2.5 py-1 rounded-md">VERIFISERT</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const trimmedId = formData.golfboxId.trim();
                    const expectedPrefix = `${activeClubId}-`;
                    if (!trimmedId.startsWith(expectedPrefix)) {
                      alert(`Feil Golfbox ID format!\nSiden du registrerer deg for ${currentClub.name}, må Golfbox ID starte med "${expectedPrefix}".\nF.eks. "${expectedPrefix}10524".`);
                      return;
                    }
                    setStep(2);
                  }}
                  disabled={!formData.name || !formData.phone || !formData.golfboxId}
                  className="w-full text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: currentClub.color }}
                >
                  Neste steg <ChevronRight className="w-5 h-5" />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wider block" style={{ color: currentClub.color }}>
                    Nivå 4: Velg Oppgaver
                  </span>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight">Dine Interesser ⛳️</h2>
                  <p className="text-gray-500 text-xs">Hvilke komiteer eller oppgaver ønsker du faste meldinger om? Du kan endre dette når som helst.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {TASKS.map(task => {
                    const isSelected = formData.tasks.includes(task);
                    return (
                      <button
                        key={task}
                        type="button"
                        onClick={() => toggleTask(task)}
                        className={cn(
                          "p-4 text-left border rounded-2xl transition-all flex items-center gap-3 cursor-pointer",
                          isSelected
                            ? "bg-slate-50 font-bold"
                            : "border-gray-150 hover:border-gray-200"
                        )}
                        style={{ borderColor: isSelected ? currentClub.color : undefined }}
                      >
                        <div className="w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all"
                             style={{ 
                               borderColor: isSelected ? currentClub.color : '#cbd5e1',
                               backgroundColor: isSelected ? currentClub.color : 'transparent'
                             }}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <span className="text-xs font-bold text-gray-800">{task}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 rounded-2xl transition-colors cursor-pointer"
                  >
                    Tilbake
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    disabled={formData.tasks.length === 0}
                    className="flex-[2] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
                    style={{ backgroundColor: currentClub.color }}
                  >
                    Neste steg <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wider block" style={{ color: currentClub.color }}>
                    Nivå 4: Tilgjengelighet
                  </span>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight">Når passer det? ⏱️</h2>
                  <p className="text-gray-500 text-xs">Vennligst oppgi når du primært foretrekker å gjennomføre dugnadsarbeid.</p>
                </div>

                <div className="space-y-3">
                  {AVAILABILITY.map(time => {
                    const isSelected = formData.availability === time;
                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, availability: time }))}
                        className={cn(
                          "w-full p-4 text-left border rounded-2xl transition-all flex items-center gap-4 cursor-pointer",
                          isSelected
                            ? "bg-slate-50 font-bold"
                            : "border-gray-150 hover:border-gray-200"
                        )}
                        style={{ borderColor: isSelected ? currentClub.color : undefined }}
                      >
                        <div className="w-5 h-5 rounded-full border flex items-center justify-center shrink-0"
                             style={{ borderColor: isSelected ? currentClub.color : '#cbd5e1' }}
                        >
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: currentClub.color }} />}
                        </div>
                        <span className="text-xs font-bold text-gray-800">{time}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-4 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 rounded-2xl transition-colors cursor-pointer"
                  >
                    Tilbake
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !formData.availability}
                    className="flex-[2] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
                    style={{ backgroundColor: currentClub.color }}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>Bekreft profil <CheckCircle2 className="w-5 h-5" /></>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>

      <div className="mt-8 text-center text-gray-400 text-xs font-bold flex items-center justify-center gap-2">
        <span>{currentClub.logo} {currentClub.name}</span>
        <span>•</span>
        <span>Golfbox Sikret System</span>
      </div>
    </div>
  );
}
