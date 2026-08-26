import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, where } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Calendar, 
  CheckCircle2, 
  Download, 
  LayoutDashboard, 
  Mail, 
  Phone, 
  Search, 
  Loader2, 
  TrendingUp, 
  Briefcase, 
  Clock, 
  Trash2, 
  AlertCircle, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck, 
  UserCheck, 
  X,
  Sliders
} from 'lucide-react';
import { db } from '../lib/firebase';
import { Volunteer, Admin, OperationType } from '../types';
import { cn } from '../lib/utils';
import { handleFirestoreError } from '../services/errorService';

// Helper to bypass window.confirm popup blockages in sandboxed/iframe preview engines
const safeConfirm = (message: string): boolean => {
  try {
    const isIframe = window.self !== window.top;
    if (isIframe) {
      console.log("[Iframe Bypass] Auto-confirming action in iframe preview environment:", message);
      return true;
    }
    return window.confirm(message);
  } catch (e) {
    console.warn("[Iframe Bypass Exception] Auto-confirming action due to blocked dialog:", message);
    return true;
  }
};

const TIME_OPTIONS = [
  "05:00", "05:30", "06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00", "22:30", "23:00"
];

// Roles (Task Owners) definitions
interface RoleDefinition {
  id: string;
  name: string;
  manager: string;
  description: string;
  tasks: string[];
}

const ROLES: RoleDefinition[] = [
  {
    id: 'all',
    name: 'Hovedadmin',
    manager: 'Daglig leder / Styret',
    description: 'Full tilgang til alle påmeldinger og komplett statistikk.',
    tasks: [] // Full admin views everything
  },
  {
    id: 'turnering',
    name: 'Turneringskomiteen',
    manager: 'Turneringskoordinator (epost: turnering@skigk.no)',
    description: 'Ansvarlig for planlegging og gjennomføring av turneringer.',
    tasks: ['Turneringskomiteen']
  },
  {
    id: 'bane',
    name: 'Banekomiteen',
    manager: 'Baneansvarlig (epost: bane@skigk.no)',
    description: 'Drift, vedlikehold og oppgradering av banen og fellesområder.',
    tasks: ['Banekomiteen']
  },
  {
    id: 'sponsor',
    name: 'Sponsorkomiteen',
    manager: 'Markedskomiteen/Sponsorgruppen',
    description: 'Sponsorarbeid, bedriftskontakt og profilering.',
    tasks: ['Sponsorkomiteen']
  },
  {
    id: 'banevert',
    name: 'Baneverter',
    manager: 'Hovedbanevert (epost: banevert@skigk.no)',
    description: 'Sikkerhet, flyt og spillerassistansetjeneste på banen.',
    tasks: ['Baneverter']
  },
  {
    id: 'hus',
    name: 'Huskomiteen',
    manager: 'Klubbhus-ansvarlig',
    description: 'Drift og vedlikehold av klubbhus, garderober og uteområder.',
    tasks: ['Huskomiteen']
  },
  {
    id: 'senior',
    name: 'Seniorkomiteen',
    manager: 'Seniorkomiteen (epost: senior@skigk.no)',
    description: 'Ukentlige seniorrunder, turneringer og tilhørende arrangementer.',
    tasks: ['Seniorkomiteen']
  },
  {
    id: 'herre',
    name: 'Herrekomiteen',
    manager: 'Herrekomiteen (epost: herre@skigk.no)',
    description: 'Herreklubb, herredager, turneringer og treninger.',
    tasks: ['Herrekomiteen']
  },
  {
    id: 'handicap',
    name: 'Handicapkomiteen',
    manager: 'Handicapkomiteen (epost: handicap@skigk.no)',
    description: 'Ansvarlig for handicaprevisjon, regelspørsmål og scorekort.',
    tasks: ['Handicapkomiteen']
  },
  {
    id: 'dugnad',
    name: 'Dugnadskomiteen',
    manager: 'TBA',
    description: 'Organisering og innkalling til felles dugnadsarbeid.',
    tasks: ['Dugnadskomiteen']
  }
];

// Shifts interface for planner
interface Shift {
  id: string;
  volunteerId: string;
  volunteerName: string;
  volunteerPhone: string;
  volunteerEmail: string;
  task: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // 'Dagtid' | 'Ettermiddag/Kveld' | 'Fleksibel'
  startTime?: string;
  endTime?: string;
  clubId?: string;
  golfboxId?: string;
}

// Realistic local-fallback volunteers to showcase simulated interactions
const LOCAL_MOCK_VOLUNTEERS: Volunteer[] = [
  {
    id: 'mock-1',
    name: 'Per Gren',
    email: 'per.gren@outlook.com',
    phone: '912 34 567',
    tasks: ['Baneverter', 'Banekomiteen'],
    availability: 'Dagtid hverdager',
    submittedAt: { toDate: () => new Date(Date.now() - 3 * 24 * 3600 * 1000) } as any
  },
  {
    id: 'mock-2',
    name: 'Astrid Smerta',
    email: 'astrid.smerta@gmail.com',
    phone: '488 22 911',
    tasks: ['Herrekomiteen', 'Seniorkomiteen'],
    availability: 'Ettermiddag/Kveld hverdager',
    submittedAt: { toDate: () => new Date(Date.now() - 1 * 24 * 3600 * 1000) } as any
  },
  {
    id: 'mock-3',
    name: 'Jan Volden',
    email: 'jan.volden@sf.no',
    phone: '900 11 222',
    tasks: ['Banekomiteen', 'Huskomiteen'],
    availability: 'Helger',
    submittedAt: { toDate: () => new Date(Date.now() - 8 * 24 * 3600 * 1000) } as any
  },
  {
    id: 'mock-4',
    name: 'Sindre Berg',
    email: 'sindre.berg@skigk.no',
    phone: '450 67 890',
    tasks: ['Turneringskomiteen', 'Herrekomiteen'],
    availability: 'Fleksibel',
    submittedAt: { toDate: () => new Date() } as any
  }
];

// Pre-seeded shifts to make calendar look populated on first launch
const PRE_SEEDED_SHIFTS = (volunteersList: Volunteer[]): Shift[] => {
  const getDistantDate = (offsetDays: number) => {
    const d = new Date(2026, 4, 28); // Core Anchor: May 28, 2026
    d.setDate(d.getDate() + offsetDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const findV = (name: string) => volunteersList.find(vl => vl.name.includes(name)) || volunteersList[0];

  const s1 = findV('Per Gren');
  const s2 = findV('Astrid Smerta');
  const s3 = findV('Jan Volden');
  const s4 = findV('Sindre Berg');

  return [
    {
      id: 'pre-1',
      volunteerId: s1?.id || 'mock-1',
      volunteerName: s1?.name || 'Per Gren',
      volunteerPhone: s1?.phone || '912 34 567',
      volunteerEmail: s1?.email || 'per.gren@outlook.com',
      task: 'Baneverter',
      date: getDistantDate(1), // Friday May 29, 2026
      timeSlot: 'Dagtid'
    },
    {
      id: 'pre-2',
      volunteerId: s2?.id || 'mock-2',
      volunteerName: s2?.name || 'Astrid Smerta',
      volunteerPhone: s2?.phone || '488 22 911',
      volunteerEmail: s2?.email || 'astrid.smerta@gmail.com',
      task: 'Herrekomiteen',
      date: getDistantDate(2), // Sat May 30, 2026
      timeSlot: 'Ettermiddag/Kveld'
    },
    {
      id: 'pre-3',
      volunteerId: s3?.id || 'mock-3',
      volunteerName: s3?.name || 'Jan Volden',
      volunteerPhone: s3?.phone || '900 11 222',
      volunteerEmail: s3?.email || 'jan.volden@sf.no',
      task: 'Banekomiteen',
      date: getDistantDate(-1), // Wed May 27, 2026
      timeSlot: 'Dagtid'
    },
    {
      id: 'pre-4',
      volunteerId: s4?.id || 'mock-4',
      volunteerName: s4?.name || 'Sindre Berg',
      volunteerPhone: s4?.phone || '450 67 890',
      volunteerEmail: s4?.email || 'sindre.berg@skigk.no',
      task: 'Turneringskomiteen',
      date: getDistantDate(5), // Tue June 2, 2026
      timeSlot: 'Fleksibel'
    },
    {
      id: 'pre-vacant-1',
      volunteerId: 'vacant',
      volunteerName: 'Trenger frivillig',
      volunteerPhone: '',
      volunteerEmail: '',
      task: 'Baneverter',
      date: getDistantDate(3), // Sun May 31, 2026
      timeSlot: 'Dagtid'
    },
    {
      id: 'pre-vacant-2',
      volunteerId: 'vacant',
      volunteerName: 'Trenger frivillig',
      volunteerPhone: '',
      volunteerEmail: '',
      task: 'Turneringskomiteen',
      date: getDistantDate(4), // Mon June 1, 2026
      timeSlot: 'Ettermiddag/Kveld'
    },
    {
      id: 'pre-vacant-3',
      volunteerId: 'vacant',
      volunteerName: 'Trenger frivillig',
      volunteerPhone: '',
      volunteerEmail: '',
      task: 'Banekomiteen',
      date: getDistantDate(3), // Sun May 31, 2026
      timeSlot: 'Ettermiddag/Kveld'
    }
  ];
};

export default function AdminDashboard({ 
  user, 
  isAdmin, 
  isClubAdmin, 
  userRole,
  activeClubId = '73'
}: { 
  user: any; 
  isAdmin: boolean; 
  isClubAdmin: boolean; 
  userRole: string | null;
  activeClubId?: string;
}) {
  const [dbVolunteers, setDbVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'admins'>('list');
  
  // Selected simulated role
  const [selectedRole, setSelectedRole] = useState<string>(() => {
    if (userRole && userRole.includes(',')) {
      return 'my-roles'; // Default to consolidated "Alle mine grupper"!
    }
    return userRole || 'all';
  });

  // List of all admins in database
  const [adminsList, setAdminsList] = useState<Admin[]>([]);

  // Editing volunteer state
  const [editingVolunteer, setEditingVolunteer] = useState<Volunteer | null>(null);

  // Helper for multi-role string display names
  const getRoleDisplayName = (rStr: string | null) => {
    if (!rStr) return 'Ukjent';
    if (rStr === 'all') return 'Hovedadmin';
    const splitRoles = rStr.split(',').map(x => x.trim());
    const matchedNames = splitRoles.map(rid => {
      const detail = ROLES.find(r => r.id === rid);
      return detail ? detail.name : rid;
    });
    return matchedNames.join(', ');
  };

  // Helper to obtain the set of tasks associated with the active role/selection
  const getSelectedRoleTasks = (): string[] => {
    if (selectedRole === 'all') {
      return Array.from(new Set(ROLES.flatMap(r => r.tasks)));
    }
    if (selectedRole === 'my-roles') {
      const assignedRoles = userRole ? userRole.split(',').map(x => x.trim()) : [];
      return Array.from(new Set(ROLES.filter(r => assignedRoles.includes(r.id)).flatMap(r => r.tasks)));
    }
    const rDef = ROLES.find(r => r.id === selectedRole);
    return rDef ? rDef.tasks : [];
  };

  // Sync selectedRole if userRole changes or if they are not club admin
  useEffect(() => {
    if (!isClubAdmin && userRole) {
      if (userRole.includes(',')) {
        setSelectedRole('my-roles');
      } else {
        setSelectedRole(userRole);
      }
    }
  }, [userRole, isClubAdmin]);

  // Load registered admins (club admin only)
  useEffect(() => {
    if (!isClubAdmin || !user) return;
    const q = query(
      collection(db, 'admins'),
      where('clubId', '==', activeClubId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as Admin[];

      // Only display admins that belong to the active club (or legacy admins defaulting to Ski)
      const clubAdmins = data.filter(adm => {
        return adm.clubId === activeClubId || (!adm.clubId && activeClubId === '73');
      });

      setAdminsList(clubAdmins);
    }, (error) => {
      console.error("Feil ved henting av admin-liste:", error);
      try {
        handleFirestoreError(error, OperationType.GET, 'admins');
      } catch (err) {}
    });
    return () => unsubscribe();
  }, [isClubAdmin, user, activeClubId]);

  // Custom fine-grained clock hours entered by the planner for a custom shift
  const [shiftTimesState, setShiftTimesState] = useState<Record<string, { start: string; end: string }>>({});

  // Calendar state
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(5); // June (0-indexed)
  const [selectedDate, setSelectedDate] = useState<string>('2026-06-02'); // Current anchor: 2026-06-02 (June 2, 2026)
  
  // Shifts planning state (stored in local storage for responsiveness)
  const [rawShifts, setRawShifts] = useState<Shift[]>([]);

  // Shadow variable filtering shifts by active tenant
  const shifts = rawShifts.filter(s => (s as any).clubId === activeClubId || (!(s as any).clubId && activeClubId === '73'));

  // Synchronize shifts from Firestore in real-time
  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'shifts');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Shift[];
      
      if (data.length > 0) {
        setRawShifts(data);
        localStorage.setItem('skigk_shifts_v1', JSON.stringify(data));
      } else {
        // Fallback or initialization with mock pre-seeded shifts if database is empty
        const saved = localStorage.getItem('skigk_shifts_v1');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.length > 0) {
              setRawShifts(parsed);
              // Proactively seed them to database
              parsed.forEach(async (s: Shift) => {
                try {
                  await setDoc(doc(db, 'shifts', s.id), s);
                } catch (e) {
                  console.error("Feil ved seeding av vakt til skyen:", e);
                }
              });
            }
          } catch (e) {}
        }
      }
    }, (error) => {
      console.error("Feil ved lasting av skyvakter (bruker lokal fallback):", error);
      const saved = localStorage.getItem('skigk_shifts_v1');
      if (saved) {
        try {
          setRawShifts(JSON.parse(saved));
        } catch (e) {}
      }
      try {
        handleFirestoreError(error, OperationType.GET, 'shifts');
      } catch (err) {}
    });

    return () => unsubscribe();
  }, [user]);

  // Save shifts
  const saveShifts = (updated: Shift[]) => {
    setRawShifts(updated);
    localStorage.setItem('skigk_shifts_v1', JSON.stringify(updated));
  };

  // Fetch volunteers from Firestore
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'volunteers'), 
      where('clubId', '==', activeClubId)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Volunteer[];

      // Sort client-side by submittedAt descending
      data.sort((a, b) => {
        const dateA = a.submittedAt?.toDate ? a.submittedAt.toDate() : new Date();
        const dateB = b.submittedAt?.toDate ? b.submittedAt.toDate() : new Date();
        return dateB.getTime() - dateA.getTime();
      });

      setDbVolunteers(data);
      setLoading(false);
    }, (error) => {
      console.error("Kunne ikke lytte til frivillige:", error);
      setLoading(false);
      try {
        handleFirestoreError(error, OperationType.GET, 'volunteers');
      } catch (err) {}
    });

    return () => unsubscribe();
  }, [user, activeClubId]);

  // Hybridize database and mock volunteers so the views are beautifully full
  const rawAllVolunteers = [...dbVolunteers, ...LOCAL_MOCK_VOLUNTEERS.filter(mv => 
    !dbVolunteers.some(dv => dv.email === mv.email)
  )];

  // Shadow variable filtering volunteers by active tenant
  const allVolunteers = rawAllVolunteers.filter(v => (v.clubId || '73') === activeClubId);

  // Set pre-seeded shifts if none exist
  useEffect(() => {
    if (shifts.length === 0 && allVolunteers.length > 0) {
      saveShifts(PRE_SEEDED_SHIFTS(allVolunteers));
    }
  }, [allVolunteers]);

  // Find active role details
  const currentRoleDef = ROLES.find(r => r.id === selectedRole) || ROLES[0];

  // Map Filter: Determine which volunteers belong under the active role sphere
  const filteredByRoleVolunteers = allVolunteers.filter(v => {
    if (selectedRole === 'all') return true;
    return v.tasks.some(t => getSelectedRoleTasks().includes(t));
  });

  // Search Filter: Combine search term and role
  const finalFilteredVolunteers = filteredByRoleVolunteers.filter(v => 
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.email.toLowerCase().includes(search.toLowerCase()) ||
    v.tasks.some(t => t.toLowerCase().includes(search.toLowerCase())) ||
    v.availability.toLowerCase().includes(search.toLowerCase())
  );

  // Statistics tailored for current role
  const stats = {
    total: filteredByRoleVolunteers.length,
    recent: filteredByRoleVolunteers.filter(v => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const submittedDate = v.submittedAt?.toDate ? v.submittedAt.toDate() : new Date();
      return submittedDate.getTime() > weekAgo.getTime();
    }).length,
    topTask: (Object.entries(
      filteredByRoleVolunteers.flatMap(v => v.tasks).reduce((acc, curr) => {
        // Only count if it belongs to selected role or if full admin
        if (selectedRole === 'all' || getSelectedRoleTasks().includes(curr)) {
          acc[curr] = (acc[curr] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>)
    ) as [string, number][]).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Ingen'
  };

  // Calendar Calculations
  const monthNamesNo = [
    'Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'
  ];

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => {
    // 0 = Sunday, 1 = Monday...
    const day = new Date(y, m, 1).getDay();
    // Realign so Monday is 0, Sunday is 6
    return day === 0 ? 6 : day - 1;
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Shift assignment state
  const [plannerVolunteerId, setPlannerVolunteerId] = useState('');
  const [plannerTask, setPlannerTask] = useState('');
  const [plannerSlot, setPlannerSlot] = useState('Dagtid');

  // Trigger default task when planning volunteer changes
  const handlePlannerVolunteerChange = (id: string) => {
    setPlannerVolunteerId(id);
    if (id === 'vacant') {
      const defaultTask = selectedRole === 'all' 
        ? ROLES[0].tasks[0] 
        : currentRoleDef.tasks[0];
      setPlannerTask(defaultTask || 'Banevert');
      setPlannerSlot('Dagtid');
      return;
    }
    const chosenV = allVolunteers.find(v => v.id === id);
    if (chosenV && chosenV.tasks.length > 0) {
      // Find first task that matches the active role context, if possible
      const applicableTask = chosenV.tasks.find(t => selectedRole === 'all' || currentRoleDef.tasks.includes(t)) || chosenV.tasks[0];
      setPlannerTask(applicableTask);
      
      // Map availability string to slot defaults
      if (chosenV.availability.includes('Ettermiddag')) {
        setPlannerSlot('Ettermiddag/Kveld');
      } else if (chosenV.availability.includes('Helger')) {
        setPlannerSlot('Helger');
      } else {
        setPlannerSlot('Dagtid');
      }
    }
  };

  const handleAddShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plannerVolunteerId || !plannerTask) return;

    const customKey = `${plannerTask}-${plannerSlot}`;
    const customTime = shiftTimesState[customKey] || {
      start: plannerSlot === 'Dagtid' ? '08:00' : (plannerSlot === 'Ettermiddag/Kveld' ? '14:00' : '08:00'),
      end: plannerSlot === 'Dagtid' ? '14:00' : (plannerSlot === 'Ettermiddag/Kveld' ? '21:00' : '16:00')
    };

    let newShift: Shift;
    if (plannerVolunteerId === 'vacant') {
      newShift = {
        id: crypto.randomUUID(),
        volunteerId: 'vacant',
        volunteerName: 'Trenger frivillig',
        volunteerPhone: '',
        volunteerEmail: '',
        task: plannerTask,
        date: selectedDate,
        timeSlot: plannerSlot,
        startTime: customTime.start,
        endTime: customTime.end,
        clubId: activeClubId
      };
    } else {
      const chosenV = allVolunteers.find(v => v.id === plannerVolunteerId);
      if (!chosenV) return;

      newShift = {
        id: crypto.randomUUID(),
        volunteerId: chosenV.id || 'err',
        volunteerName: chosenV.name,
        volunteerPhone: chosenV.phone,
        volunteerEmail: chosenV.email,
        task: plannerTask,
        date: selectedDate,
        timeSlot: plannerSlot,
        startTime: customTime.start,
        endTime: customTime.end,
        clubId: activeClubId,
        golfboxId: chosenV.golfboxId
      };
    }

    try {
      await setDoc(doc(db, 'shifts', newShift.id), newShift);
      // Reset selection in planner
      setPlannerVolunteerId('');
      setPlannerTask('');
    } catch (err: any) {
      console.error("Feil ved lagring av vakt i Firestore:", err);
      // Fallback
      saveShifts([...shifts, newShift]);
      setPlannerVolunteerId('');
      setPlannerTask('');
    }
  };

  const handleCancelShift = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'shifts', id));
    } catch (err) {
      console.error("Feil ved sletting av vakt fra Firestore:", err);
      // Fallback
      saveShifts(shifts.filter(s => s.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-[#1e3a24]" />
        <p className="text-sm text-gray-400 font-medium">Henter påmeldinger fra Smerta...</p>
      </div>
    );
  }

  // Active shifts on selected day filtered by role tasks
  const activeDateShifts = shifts.filter(s => {
    if (s.date !== selectedDate) return false;
    if (selectedRole === 'all') return true;
    return getSelectedRoleTasks().includes(s.task);
  });

  // Filter visible categories/menus based on user rights
  const visibleRoles = ROLES.filter(r => {
    if (isClubAdmin || userRole === 'all') return true;
    const assignedRoles = userRole ? userRole.split(',').map(x => x.trim()) : [];
    // Support multi-role category listings (e.g. bane, banevert, etc)
    return assignedRoles.includes(r.id) || (assignedRoles.includes('bane') && r.id === 'dugnad') || r.id === 'all';
  });

  return (
    <div className="space-y-8 pb-12">
      
      {/* Vaktkalender Velg-meny over Heading */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-150 shadow-sm space-y-6">
        <div>
          <h1 className="text-sm font-black uppercase text-[#1e3a24] tracking-wider">
            Dine tildelte vaktkalendere og ansvarsområder
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            {isClubAdmin || userRole === 'all' 
              ? 'Hovedadmin-modus: Du har full tilgang og kan velge blant alle klubbens vaktbøker.' 
              : 'Kategori-admin-modus: Du har kun tilgang til å se og redigere dine tildelte vaktbøker.'}
          </p>
        </div>

        {/* List of elegant menus/bars showing category header and next 3 shifts */}
        <div className="space-y-3">
          {visibleRoles.map(r => {
            const isSelected = selectedRole === r.id;
            
            // Find next 3 shifts belonging to this role/category
            const roleShifts = shifts
              .filter(s => {
                const isMatchingClub = (s.clubId || '73') === activeClubId;
                if (!isMatchingClub) return false;
                if (r.id === 'all') return true; // Felleskalender sees everything
                return r.tasks.includes(s.task);
              })
              .sort((a, b) => a.date.localeCompare(b.date));

            const nextThreeShifts = roleShifts.slice(0, 3);

            return (
              <div
                key={r.id}
                className={cn(
                  "p-5 rounded-2xl border transition-all text-left space-y-4",
                  isSelected
                    ? "border-[#1e3a24] bg-white ring-2 ring-[#1e3a24]/10 shadow-xs"
                    : "border-gray-150 bg-slate-50 hover:bg-white hover:border-gray-200"
                )}
              >
                {/* Header structure of row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-gray-900">
                        {r.id === 'all' ? '🌍 Felleskalender' : `⛳ ${r.name}`}
                      </span>
                      {isSelected ? (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-[#1e3a24]/10 text-[#1e3a24] rounded-md tracking-wider">
                          Aktiv vaktbok
                        </span>
                      ) : (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-gray-200/60 text-gray-400 rounded-md tracking-wider">
                          Kombinert
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide leading-none">{r.manager}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole(r.id);
                      setSearch('');
                    }}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer self-start md:self-auto",
                      isSelected
                        ? "bg-[#1e3a24] text-white shadow-xs"
                        : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    {isSelected ? 'Viser detaljer' : 'Administrer'}
                  </button>
                </div>

                {/* Next 3 tasks/shifts list formatted exactly as (Dato : Tid : Hva) */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                    Neste 3 planlagte oppgaver i vaktboken:
                  </h4>
                  {nextThreeShifts.length === 0 ? (
                    <p className="text-xs text-gray-400 font-semibold italic">Ingen oppsatte vakter i denne kategorien nå.</p>
                  ) : (
                    <div className="space-y-1.5 pt-1">
                      {nextThreeShifts.map((sh, index) => {
                        // Clean up date format for pretty rendering
                        const rawDate = sh.date;
                        let formattedDateStr = rawDate;
                        try {
                          const [y, m, d] = rawDate.split('-').map(Number);
                          const dt = new Date(y, m - 1, d);
                          formattedDateStr = dt.toLocaleDateString('no-NO', { day: '2-digit', month: 'short' });
                        } catch (err) {}

                        const isVacant = sh.volunteerId === 'vacant';

                        return (
                          <div 
                            key={sh.id} 
                            className="flex flex-col sm:flex-row sm:items-center text-xs font-bold gap-x-2 text-slate-800"
                          >
                            <span className="text-gray-400 select-none">#{index+1}</span>
                            <span className="text-gray-950 font-black">{formattedDateStr}</span>
                            <span className="text-gray-300 select-none hidden sm:inline">:</span>
                            <span className="text-gray-600 font-semibold">
                              {sh.timeSlot}
                              {sh.startTime && sh.endTime ? ` (${sh.startTime}-${sh.endTime})` : ''}
                            </span>
                            <span className="text-gray-300 select-none hidden sm:inline">:</span>
                            <span className={cn(
                              "px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase shrink-0 inline-block",
                              isVacant 
                                ? "bg-amber-50 text-amber-600 border border-amber-200/50" 
                                : "bg-sky-50 text-sky-600 border border-sky-100"
                            )}>
                              {sh.task} {isVacant ? '(Ledig)' : `(${sh.volunteerName})`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Role-Specific Introduction Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedRole}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col sm:flex-row items-start gap-6"
        >
          <div className="p-4 bg-green-50 rounded-2xl text-[#1e3a24] shrink-0">
            <Briefcase className="w-8 h-8" />
          </div>
          <div className="space-y-2 flex-grow">
            <span className="text-xs font-black uppercase text-gray-400 tracking-widest">
              {selectedRole === 'my-roles' ? 'Leif Oddbjørn Møller' : currentRoleDef.manager}
            </span>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">
              {selectedRole === 'all' 
                ? 'Velkommen, Hovedadmin' 
                : (selectedRole === 'my-roles' ? 'Alle mine tildelte grupper' : `Logget inn som: ${currentRoleDef.name}`)}
            </h2>
            <p className="text-sm text-gray-650 leading-relaxed max-w-3xl">
              {selectedRole === 'my-roles'
                ? 'Viser samlet oversikt over dine underkomiteer: Banekomiteen, Baneverter og Dugnadskomiteen.'
                : currentRoleDef.description}
            </p>
            {selectedRole !== 'all' && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 mr-2 self-center">Oppgavefilter:</span>
                {getSelectedRoleTasks().map(t => (
                  <span key={t} className="px-2.5 py-1 bg-[#1e3a24]/10 text-[#1e3a24] rounded-lg text-[10px] font-bold uppercase tracking-tight">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Adaptive Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: selectedRole === 'all' ? 'Totalt påmeldte' : `Gjeldende kandidater`, value: stats.total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Søkt siste uke', value: stats.recent, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
          { label: selectedRole === 'all' ? 'Mest populære særinteresse' : 'Hovedoppgave', value: stats.topTask, icon: Briefcase, color: 'text-amber-600', bg: 'bg-amber-50', small: true },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4"
          >
            <div className={cn("p-4 rounded-2xl", stat.bg)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
              <p className={cn("font-black text-gray-900 mt-1", stat.small ? "text-base tracking-tight" : "text-3xl")}>
                {stat.value}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-gray-100 gap-2">
        <button
          onClick={() => setViewMode('list')}
          className={cn(
            "px-6 py-3 text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer",
            viewMode === 'list'
              ? "border-[#1e3a24] text-[#1e3a24]"
              : "border-transparent text-gray-400 hover:text-gray-600"
          )}
        >
          <Users className="w-4 h-4" /> Liste-visning ({finalFilteredVolunteers.length})
        </button>
        <button
          onClick={() => setViewMode('calendar')}
          className={cn(
            "px-6 py-3 text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer",
            viewMode === 'calendar'
              ? "border-[#1e3a24] text-[#1e3a24]"
              : "border-transparent text-gray-400 hover:text-gray-600"
          )}
        >
          <Calendar className="w-4 h-4" /> Vaktplanlegger & Kalender
        </button>
        {isClubAdmin && (
          <button
            onClick={() => setViewMode('admins')}
            className={cn(
              "px-6 py-3 text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer",
              viewMode === 'admins'
                ? "border-[#1e3a24] text-[#1e3a24]"
                : "border-transparent text-gray-400 hover:text-gray-600"
            )}
          >
            <ShieldCheck className="w-4 h-4" /> Administrer tilganger ({adminsList.length + 2})
          </button>
        )}
      </div>

      {/* Main Mode Output */}
      <AnimatePresence mode="wait">
        {viewMode === 'list' && (
          <motion.div
            key="listView"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-lg font-black text-[#1e3a24] uppercase tracking-tight">
                Arbeidsliste for {selectedRole === 'my-roles' ? 'Mine grupper' : currentRoleDef.name}
              </h2>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input 
                    type="text"
                    placeholder="Søk i navn, e-post eller oppgaver..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm w-full md:w-64 focus:ring-2 focus:ring-[#1e3a24] outline-none"
                  />
                </div>
                <button 
                  onClick={() => {
                    const csv = [
                      ['Navn', 'E-post', 'Telefon', 'Særinteresser', 'Foretrukket tid', 'Registrert den'].join(','),
                      ...finalFilteredVolunteers.map(v => [
                        `"${v.name}"`,
                        `"${v.email}"`,
                        `"${v.phone}"`,
                        `"${v.tasks.join('; ')}"`,
                        `"${v.availability}"`,
                        `"${v.submittedAt?.toDate ? v.submittedAt.toDate().toLocaleDateString('no-NO') : new Date().toLocaleDateString('no-NO')}"`
                      ].join(','))
                    ].join('\n');
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `frivillige_skigk_${selectedRole}_${new Date().toISOString().split('T')[0]}.csv`;
                    link.click();
                  }}
                  className="p-2.5 bg-gray-50 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
                  title="Eksporter til CSV"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Kandidat</th>
                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Valgte Oppgaver</th>
                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Foretrukket Tid</th>
                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Søkt Dato</th>
                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Handling</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {finalFilteredVolunteers.length > 0 ? (
                    finalFilteredVolunteers.map((v, i) => (
                      <motion.tr 
                        key={v.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="hover:bg-gray-50/20 transition-colors group"
                      >
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                              {v.name}
                              {v.id?.startsWith('mock-') && (
                                <span className="text-[9px] bg-sky-50 text-sky-600 font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Eksempel</span>
                              )}
                            </span>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                              <a href={`mailto:${v.email}`} className="text-xs text-gray-400 hover:text-[#1e3a24] flex items-center gap-1">
                                <Mail className="w-3.5 h-3.5" /> {v.email}
                              </a>
                              <a href={`tel:${v.phone}`} className="text-xs text-gray-400 hover:text-[#1e3a24] flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5" /> {v.phone}
                              </a>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-wrap gap-1.5">
                            {v.tasks.map(task => {
                              const highlight = selectedRole !== 'all' && currentRoleDef.tasks.includes(task);
                              return (
                                <span 
                                  key={task} 
                                  className={cn(
                                    "px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight transition-colors",
                                    highlight 
                                      ? "bg-[#1e3a24] text-white" 
                                      : "bg-gray-100 text-gray-500"
                                  )}
                                >
                                  {task}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 rounded-full text-xs font-bold">
                            <Clock className="w-3.5 h-3.5 text-amber-600" /> {v.availability}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-xs font-mono text-gray-400">
                            {v.submittedAt?.toDate ? v.submittedAt.toDate().toLocaleDateString('no-NO') : new Date().toLocaleDateString('no-NO')}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => {
                                setViewMode('calendar');
                                // set standard selected day to tomorrow if weekday
                                setSelectedDate('2026-05-28');
                                handlePlannerVolunteerChange(v.id || '');
                              }}
                              className="text-xs font-black uppercase text-[#1e3a24] hover:text-[#2d5635] flex items-center gap-1 bg-[#1e3a24]/5 hover:bg-[#1e3a24]/10 px-3 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap"
                            >
                              <Calendar className="w-3.5 h-3.5" /> Sett opp vakt
                            </button>
                            {isClubAdmin && (
                              <>
                                <button
                                  onClick={() => setEditingVolunteer(v)}
                                  className="text-xs font-black uppercase text-blue-600 hover:text-blue-800 flex items-center bg-blue-50 hover:bg-blue-100/80 px-3 py-2 rounded-xl transition-all cursor-pointer"
                                  title="Rediger frivillig"
                                >
                                  Rediger
                                </button>
                                <button
                                  onClick={async () => {
                                    if (v.id?.startsWith('mock-')) {
                                      alert("Dette er en eksempelperson og finnes ikke i databasen.");
                                      return;
                                    }
                                    if (safeConfirm(`Er du sikker på at du vil slette registreringen til ${v.name}?`)) {
                                      try {
                                        await deleteDoc(doc(db, 'volunteers', v.id!));
                                      } catch (err: any) {
                                        alert(`Feil ved sletting: ${err.message}`);
                                      }
                                    }
                                  }}
                                  className="text-xs font-black uppercase text-red-600 hover:text-red-800 flex items-center bg-red-50 hover:bg-red-100/80 px-3 py-2 rounded-xl transition-all cursor-pointer"
                                  title="Slett frivillig"
                                >
                                  Slett
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic font-medium">
                        Ingen særinteresser oppgitt eller treff i listen for denne rollesfæren.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {viewMode === 'calendar' && (
          <motion.div
            key="calendarView"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            className="space-y-8"
          >
            {/* 1. THREE-MONTH SEASON OVERVIEW TABS */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                  <h3 className="text-base font-black text-gray-900 tracking-tight">
                    Hovedsesong 2026 — 3 Måneders Full Vaktbok
                  </h3>
                  <p className="text-xs text-gray-500">
                    Velg måned under hverdags- og helgebemanning for rask navigasjon og statuskontroll.
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl">
                  <button 
                    onClick={prevMonth}
                    className="p-1 px-2.5 bg-white rounded-lg border border-gray-100 hover:border-gray-200 text-xs font-bold transition-all shadow-sm cursor-pointer"
                    title="Forrige måned"
                  >
                    ◀
                  </button>
                  <span className="text-xs font-black px-2 text-gray-700">Månedskompass</span>
                  <button 
                    onClick={nextMonth}
                    className="p-1 px-2.5 bg-white rounded-lg border border-gray-100 hover:border-gray-200 text-xs font-bold transition-all shadow-sm cursor-pointer"
                    title="Neste måned"
                  >
                    ▶
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { num: 4, name: 'Mai 2026', desc: 'Sone 1: Vårklargjøring & Sesongåpning' },
                  { num: 5, name: 'Juni 2026', desc: 'Sone 2: Høysesong, turneringer & fellesdugnad' },
                  { num: 6, name: 'Juli 2026', desc: 'Sone 3: Fellesferie, helgebemanning & baneguider' }
                ].map(item => {
                  const isActive = currentMonth === item.num && currentYear === 2026;
                  // Compute stats for this month
                  const monthPrefix = `2026-${String(item.num + 1).padStart(2, '0')}`;
                  const monthShifts = shifts.filter(s => {
                    if (!s.date.startsWith(monthPrefix)) return false;
                    if (selectedRole === 'all') return true;
                    return getSelectedRoleTasks().includes(s.task);
                  });
                  const vacantCount = monthShifts.filter(s => s.volunteerId === 'vacant').length;
                  const filledCount = monthShifts.filter(s => s.volunteerId !== 'vacant').length;

                  return (
                    <button
                      key={item.num}
                      type="button"
                      onClick={() => {
                        setCurrentMonth(item.num);
                        setCurrentYear(2026);
                      }}
                      className={cn(
                        "p-4 rounded-2xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between h-28 relative overflow-hidden",
                        isActive
                          ? "border-[#1e3a24] bg-[#1e3a24]/5 shadow-sm ring-1 ring-[#1e3a24]"
                          : "border-gray-50 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-200"
                      )}
                    >
                      <div>
                        <div className="flex justify-between items-center">
                          <span className={cn("text-xs font-black tracking-tight", isActive ? "text-[#1e3a24]" : "text-gray-900")}>
                            {item.name}
                          </span>
                          {isActive && (
                            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium leading-none mt-1">{item.desc}</p>
                      </div>

                      <div className="flex gap-2 mt-2">
                        <span className={cn(
                          "text-[9px] font-black px-2 py-0.5 rounded-lg border",
                          filledCount > 0 
                            ? "bg-green-50 text-emerald-800 border-green-100" 
                            : "bg-gray-100 text-gray-500 border-gray-200"
                        )}>
                          👤 {filledCount} bemannet
                        </span>
                        {vacantCount > 0 && (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
                            🚨 {vacantCount} ledige vakter
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. CATEGORY-SPECIFIC AND INTER-OPERABILITY SELECTOR */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-3">
              <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider block">Spesialist- og Felleskalender (Kategori-velger):</span>
              <div className="flex flex-wrap gap-2 text-left">
                {/* Consolidated multi-role option */}
                {userRole && userRole.includes(',') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('my-roles');
                      setSearch('');
                    }}
                    className={cn(
                      "px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer border flex items-center gap-1.5",
                      selectedRole === 'my-roles'
                        ? "bg-[#1e3a24] text-white border-transparent shadow animate-pulse"
                        : "bg-[#1e3a24]/5 text-[#1e3a24] border-emerald-100 hover:bg-[#1e3a24]/10"
                    )}
                  >
                    🏠 Alle mine grupper samlet
                  </button>
                )}
                {ROLES.map(r => {
                  const assignedRoles = userRole ? userRole.split(',').map(x => x.trim()) : [];
                  const isSelectable = isClubAdmin || userRole === 'all' || assignedRoles.includes(r.id);
                  if (!isSelectable) return null;
                  const isSelected = selectedRole === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setSelectedRole(r.id);
                        setSearch(''); // clear search to stay focus
                      }}
                      className={cn(
                        "px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer border flex items-center gap-1.5",
                        isSelected
                          ? "bg-[#1e3a24] text-white border-transparent shadow"
                          : "bg-white text-gray-600 border-gray-150 hover:bg-gray-50"
                      )}
                    >
                      {r.id === 'all' ? '🌍 Felles kalender (alle)' : `⛳ ${r.name}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. CORE CALENDAR AND ADAPTIVE ASSIGNMENTS SIDEBAR PANEL */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Module: Monthly Grid View */}
              <div className="lg:col-span-7 bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                
                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div className="flex flex-col">
                    <span className="text-xl font-black tracking-tight text-[#1e3a24]">
                      {monthNamesNo[currentMonth]} {currentYear}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wide mt-0.5">
                      {selectedRole === 'all' 
                        ? 'Viser felles kalender for samtlige kategorier' 
                        : (selectedRole === 'my-roles'
                           ? 'Viser vakter for alle mine tildelte grupper'
                           : `Viser tilpassende vakter for: ${currentRoleDef.name}`)}
                    </span>
                  </div>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 gap-2 text-center">
                  {['MA', 'TI', 'ON', 'TO', 'FR', 'LØ', 'SØ'].map(dayName => (
                    <span key={dayName} className="text-xs font-black text-gray-400 uppercase tracking-widest">{dayName}</span>
                  ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7 gap-2">
                  {(() => {
                    const cells = [];
                    // Empty buffer for start offset structure
                    for (let i = 0; i < firstDayIndex; i++) {
                      cells.push(<div key={`b-${i}`} className="h-20 bg-gray-50/50 rounded-2xl" />);
                    }
                    // Day render loop
                    for (let d = 1; d <= daysInMonth; d++) {
                      const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                      const isSelected = selectedDate === dateString;
                      const isToday = d === 2 && currentMonth === 5 && currentYear === 2026; // June 2, 2026 core anchor

                      // Count shifts on this day filtered by active category context
                      const dayShifts = shifts.filter(s => {
                        if (s.date !== dateString) return false;
                        if (selectedRole === 'all') return true;
                        return getSelectedRoleTasks().includes(s.task);
                      });

                      const vacantCount = dayShifts.filter(s => s.volunteerId === 'vacant').length;
                      const filledCount = dayShifts.filter(s => s.volunteerId !== 'vacant').length;

                      cells.push(
                        <button
                          key={dateString}
                          onClick={() => setSelectedDate(dateString)}
                          className={cn(
                            "h-20 p-2 text-left rounded-2xl border flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden focus:outline-none",
                            isSelected
                              ? "border-[#1e3a24] bg-[#1e3a24]/5 ring-1 ring-[#1e3a24]"
                              : "border-gray-100 bg-white hover:border-gray-200",
                            isToday && !isSelected ? "border-amber-400 bg-amber-50/15" : ""
                          )}
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className={cn(
                              "text-xs font-black w-5 h-5 flex items-center justify-center rounded-full",
                              isToday ? "bg-amber-500 text-white font-black" : "text-gray-900",
                              isSelected && !isToday ? "text-[#1e3a24] font-black" : ""
                            )}>
                              {d}
                            </span>
                          </div>

                          <div className="w-full flex flex-col gap-0.5">
                            {filledCount > 0 && (
                              <span className="bg-[#1e3a24] text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider block text-center leading-tight">
                                👤 {filledCount} bemannet
                              </span>
                            )}
                            {vacantCount > 0 && (
                              <span className="bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider block text-center leading-tight animate-pulse">
                                🚨 {vacantCount} ledig
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    }
                    return cells;
                  })()}
                </div>

                <div className="bg-green-50/40 p-4 rounded-2xl text-xs text-gray-600 border border-green-100/60 leading-relaxed space-y-1">
                  <p>💡 <strong>Tips for kategoriansvarlig:</strong></p>
                  <p className="text-gray-500">
                    Velg en dato i kalenderen for å vise detaljer, markere nye vaktbehov (Søker frivillige) eller koble spesifikke frivillige direkte til ledige stillinger på høyre side.
                  </p>
                </div>
              </div>

              {/* Right Module: Contextual Assignments & Real-time Need Toggler */}
              <div className="lg:col-span-5 space-y-8">
                
                {/* A. REAL-TIME NEED MANAGEMENT GRID (BEHOV / IKKE BEHOV) */}
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-base font-black text-gray-900 tracking-tight">
                      Behovs-tilpasning (Behov / Ikke behov)
                    </h3>
                    <p className="text-xs text-gray-400 font-bold uppercase mt-1 leading-snug">
                      Oppgave-behov for {new Date(selectedDate).toLocaleDateString('no-NO', { 
                        weekday: 'short', 
                        day: 'numeric', 
                        month: 'short'
                      })} under:
                      <span className="text-[#1e3a24] font-black block mt-0.5">
                        {selectedRole === 'all' 
                          ? 'Alle kategorier (Hovedadmin)' 
                          : (selectedRole === 'my-roles' ? 'Alle mine grupper samlet' : currentRoleDef.name)}
                      </span>
                    </p>
                  </div>

                  {(() => {
                    const activeTasks = getSelectedRoleTasks();

                    if (activeTasks.length === 0) {
                      return (
                        <p className="text-xs text-gray-400 text-center py-4 italic">
                          Ingen spesifikke oppgaver er definert for denne rollen.
                        </p>
                      );
                    }

                    const timeSlotsList = ['Dagtid', 'Ettermiddag/Kveld', 'Fleksibel'];

                    const handleToggleNeed = async (taskName: string, slotName: string, existingShift?: Shift, startVal?: string, endVal?: string) => {
                      if (existingShift) {
                        const confirmMsg = existingShift.volunteerId === 'vacant'
                          ? `Vil du fjerne bemanningsbehovet for "${taskName}" på "${slotName}" den ${selectedDate}?`
                          : `Vil du fjerne vakten og koble av booket frivillig: ${existingShift.volunteerName}?`;

                        if (safeConfirm(confirmMsg)) {
                          try {
                            await deleteDoc(doc(db, 'shifts', existingShift.id));
                          } catch (err) {
                            console.error("Feil ved sletting av vaktbehov:", err);
                            // sync local fallback
                            saveShifts(shifts.filter(s => s.id !== existingShift.id));
                          }
                        }
                      } else {
                        // Create vacant shift (Behov)
                        const newShiftId = crypto.randomUUID();
                        const newShift: Shift = {
                          id: newShiftId,
                          volunteerId: 'vacant',
                          volunteerName: 'Trenger frivillig',
                          volunteerPhone: '',
                          volunteerEmail: '',
                          task: taskName,
                          date: selectedDate,
                          timeSlot: slotName,
                          startTime: startVal || '',
                          endTime: endVal || '',
                          clubId: activeClubId
                        };
                        try {
                          await setDoc(doc(db, 'shifts', newShiftId), newShift);
                        } catch (err) {
                          console.error("Feil ved oppretting av vaktbehov:", err);
                          // Sync local fallback
                          saveShifts([...shifts, newShift]);
                        }
                      }
                    };

                    return (
                      <div className="space-y-6 max-h-[500px] overflow-y-auto pr-1">
                        {activeTasks.map(task => {
                          return (
                            <div key={task} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0 space-y-2">
                              <div className="flex justify-between items-center bg-gray-50/50 p-2 rounded-xl">
                                <span className="text-xs font-black text-[#1e3a24] uppercase tracking-wider">{task}</span>
                              </div>

                              <div className="flex flex-col gap-2">
                                {timeSlotsList.map(slot => {
                                  // Find if there is a shift defined on this task/date/slot
                                  const matchingShift = shifts.find(s => 
                                    s.date === selectedDate && 
                                    s.task === task && 
                                    s.timeSlot === slot
                                  );

                                  const customKey = `${task}-${slot}`;
                                  const customTime = shiftTimesState[customKey] || {
                                    start: slot === 'Dagtid' ? '08:00' : (slot === 'Ettermiddag/Kveld' ? '14:00' : '08:00'),
                                    end: slot === 'Dagtid' ? '14:00' : (slot === 'Ettermiddag/Kveld' ? '21:00' : '16:00')
                                  };

                                  const setStart = (val: string) => {
                                    setShiftTimesState(prev => ({
                                      ...prev,
                                      [customKey]: { ...customTime, start: val }
                                    }));
                                  };

                                  const setEnd = (val: string) => {
                                    setShiftTimesState(prev => ({
                                      ...prev,
                                      [customKey]: { ...customTime, end: val }
                                    }));
                                  };

                                  return (
                                    <div 
                                      key={slot} 
                                      className="flex flex-col gap-2 p-3 rounded-2xl bg-white border border-gray-100 shadow-sm hover:border-gray-200 transition-all"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                                          <span className="text-[11px] font-black text-gray-700 uppercase tracking-tight">{slot}</span>
                                        </div>

                                        {matchingShift && matchingShift.startTime && matchingShift.endTime && (
                                          <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg">
                                            ⏰ Kl. {matchingShift.startTime} - {matchingShift.endTime}
                                          </span>
                                        )}
                                      </div>

                                      {/* Fine-grained clock hours input form (only if shift doesn't exist yet) */}
                                      {!matchingShift && (
                                        <div className="flex items-center gap-2 bg-gray-50/50 p-2 rounded-xl border border-gray-100">
                                          <span className="text-[9px] font-extrabold uppercase text-gray-400 font-sans">Tid:</span>
                                          <div className="flex items-center gap-1.5">
                                            <select 
                                              value={customTime.start} 
                                              onChange={e => setStart(e.target.value)}
                                              className="bg-white border border-gray-300 rounded-lg text-[10px] font-black py-1 px-1.5 outline-none text-[#1e3a24] cursor-pointer hover:border-[#1e3a24]/40"
                                            >
                                              {TIME_OPTIONS.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                              ))}
                                            </select>
                                            <span className="text-gray-400 text-xs font-bold">—</span>
                                            <select 
                                              value={customTime.end} 
                                              onChange={e => setEnd(e.target.value)}
                                              className="bg-white border border-gray-300 rounded-lg text-[10px] font-black py-1 px-1.5 outline-none text-[#1e3a24] cursor-pointer hover:border-[#1e3a24]/40"
                                            >
                                              {TIME_OPTIONS.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                              ))}
                                            </select>
                                          </div>
                                        </div>
                                      )}

                                      <div className="flex justify-end gap-2">
                                        {matchingShift ? (
                                          matchingShift.volunteerId === 'vacant' ? (
                                            <button
                                              key="remove-need-btn"
                                              type="button"
                                              onClick={() => handleToggleNeed(task, slot, matchingShift)}
                                              className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-black rounded-lg transition-all cursor-pointer"
                                              title="Fjern behov for frivillige (Marker som ikkebehov)"
                                            >
                                              🚨 SØKER FRIVILLIG — Fjern ✖
                                            </button>
                                          ) : (
                                            <button
                                              key="remove-booking-btn"
                                              type="button"
                                              onClick={() => handleToggleNeed(task, slot, matchingShift)}
                                              className="px-2.5 py-1.5 bg-[#1e3a24] hover:bg-red-700 hover:text-white text-white text-[9px] font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                                              title={`Booket av ${matchingShift.volunteerName}. Klikk for å avbooke.`}
                                            >
                                              👤 {matchingShift.volunteerName} — Fristill ✖
                                            </button>
                                          )
                                        ) : (
                                          <button
                                            key="create-need-btn"
                                            type="button"
                                            onClick={() => handleToggleNeed(task, slot, undefined, customTime.start, customTime.end)}
                                            className="px-2.5 py-1.5 bg-gray-100 hover:bg-[#1e3a24]/10 text-gray-600 hover:text-[#1e3a24] text-[9px] font-black rounded-lg transition-all border border-dashed border-gray-200 cursor-pointer"
                                            title="Trykk for å lyse ut behov for frivillige på denne vaktperioden"
                                          >
                                            ➕ Sett som BEHOV
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* B. DETAILED MANUAL BOOKING FORM SIGNUP */}
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-base font-black text-gray-900 tracking-tight">
                      Manuell kobling av ledig vakt
                    </h3>
                    <p className="text-xs text-gray-400 font-bold uppercase mt-1">
                      Koble en registrert frivillig direkte til en oppgave på denne datoen
                    </p>
                  </div>

                  <form onSubmit={handleAddShift} className="space-y-4">
                    {/* Volunteer Picker */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-wider block">Frivillig kandidat</label>
                      <select
                        required
                        value={plannerVolunteerId}
                        onChange={e => handlePlannerVolunteerChange(e.target.value)}
                        className="w-full bg-gray-50 border-transparent rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#1e3a24] focus:bg-white transition-all outline-none border cursor-pointer"
                      >
                        <option value="">Velg kandidat ({filteredByRoleVolunteers.length} tilgjengelige)</option>
                        <option value="vacant" className="text-red-600 font-bold">-- LEDIG VAKT (Åpen for påmelding!) --</option>
                        {filteredByRoleVolunteers.map(v => {
                          const dayNum = new Date(selectedDate).getDay(); // 0 is Sun, 6 is Sat
                          const isWeekend = dayNum === 0 || dayNum === 6;
                          const matchAv = (isWeekend && v.availability.includes('Helger')) || (!isWeekend && (v.availability.includes('Dagtid') || v.availability.includes('Ettermiddag')));
                          return (
                            <option key={v.id} value={v.id}>
                              {v.name} ({v.availability}){matchAv ? ' ★ Anbefalt' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {plannerVolunteerId && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-4 pt-1"
                      >
                        {/* Task select */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-black text-gray-400 uppercase tracking-wider block">Tildelt Oppgave</label>
                          <select
                            required
                            value={plannerTask}
                            onChange={e => setPlannerTask(e.target.value)}
                            className="w-full bg-gray-50 border-transparent rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#1e3a24] focus:bg-white transition-all outline-none border cursor-pointer"
                          >
                            {(() => {
                              if (plannerVolunteerId === 'vacant') {
                                const tasksList = selectedRole === 'all' 
                                  ? Array.from(new Set(ROLES.flatMap(r => r.tasks))) 
                                  : currentRoleDef.tasks;
                                return tasksList.map(t => (
                                  <option key={t} value={t}>{t}</option>
                                ));
                              }
                              const chosenV = allVolunteers.find(v => v.id === plannerVolunteerId);
                              if (!chosenV) return null;
                              return chosenV.tasks.map(t => {
                                const isWithinScope = selectedRole === 'all' || currentRoleDef.tasks.includes(t);
                                return (
                                  <option key={t} value={t} disabled={!isWithinScope}>
                                    {t} {!isWithinScope ? '(Krever annen admin-rolle)' : ''}
                                  </option>
                                );
                              });
                            })()}
                          </select>
                        </div>

                        {/* Time segment select */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-black text-gray-400 uppercase tracking-wider block">Klokkeslett/Tidspunkt</label>
                          <div className="grid grid-cols-3 gap-2">
                            {['Dagtid', 'Ettermiddag/Kveld', 'Fleksibel'].map(tSlot => (
                              <button
                                key={tSlot}
                                type="button"
                                onClick={() => setPlannerSlot(tSlot)}
                                className={cn(
                                  "py-2.5 px-3 rounded-xl text-xs font-bold text-center border-2 transition-all cursor-pointer",
                                  plannerSlot === tSlot 
                                    ? "border-[#1e3a24] bg-[#1e3a24] text-white" 
                                    : "border-gray-50 bg-gray-50 hover:border-gray-200 text-gray-600"
                                )}
                              >
                                {tSlot}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <button
                      type="submit"
                      disabled={!plannerVolunteerId || !plannerTask}
                      className="w-full bg-[#1e3a24] hover:bg-[#2d5635] text-white rounded-2xl py-3.5 font-bold text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Koble Frivillig til Vaktbehov
                    </button>
                  </form>
                </div>

              </div>
            </div>
          </motion.div>
        )}

        {viewMode === 'admins' && isClubAdmin && (
          <motion.div
            key="adminsView"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Left Column: Admin list */}
            <div className="lg:col-span-7 bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">
                  Registrerte Administratorer
                </h3>
                <p className="text-xs text-gray-400 font-bold uppercase mt-1">Hoved- og oppgave-avdelingsledere</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="px-4 py-3 text-xs font-black text-gray-400 uppercase tracking-widest">E-post / UID</th>
                      <th className="px-4 py-3 text-xs font-black text-gray-400 uppercase tracking-widest">Tildelt Rolle</th>
                      <th className="px-4 py-3 text-xs font-black text-gray-400 uppercase tracking-widest">Handling</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {/* Hardcoded pre-configured club admins for clear reference */}
                    <tr className="hover:bg-gray-50/20 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900 flex items-center gap-1">
                            Admin-2025@skigk.no
                            <span className="text-[8px] bg-amber-50 text-amber-700 font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Hovedadmin</span>
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">Systemansvarlig</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded text-[10px] font-bold uppercase">Full tilgang</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-[10px] text-gray-400 italic">Pre-konfigurert</span>
                      </td>
                    </tr>

                    <tr className="hover:bg-gray-50/20 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900 flex items-center gap-1">
                            owe-admin@golfklubb-it.com
                            <span className="text-[8px] bg-amber-50 text-amber-700 font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Hovedadmin</span>
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">Systemeier</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded text-[10px] font-bold uppercase">Full tilgang</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-[10px] text-gray-400 italic">Pre-konfigurert</span>
                      </td>
                    </tr>

                    <tr className="hover:bg-gray-50/20 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900 flex items-center gap-1">
                            eier@skigk.no
                            <span className="text-[8px] bg-indigo-50 text-indigo-700 font-black px-1.5 py-0.5 rounded uppercase tracking-wider">App-eier</span>
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">Full tilgang & eier</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 rounded text-[10px] font-bold uppercase">Full tilgang</span>
                      </td>
                      <td className="px-4 py-4">
                        <a
                          href={`mailto:eier@skigk.no?subject=Admin-innlogging%20frivilligportal&body=Hei%2C%0A%0ADu%20har%20n%C3%A5%20full%20admin%20og%20app%20owner-tilgang%20til%20Frivilligportalen%20for%20Ski%20Golfklubb.%0A%0ALogg%20inn%20her%20for%20%C3%A5%20bytte%20til%20admin-panelet%3A%0A${encodeURIComponent(window.location.origin || 'https://ais-pre-mpu2uu2suujmqr2kfmtyt6-342254598775.europe-west3.run.app')}%0A%0AMed%20vennlig%20hilsen%0ASki%20Golfklubb`}
                          className="px-2.5 py-1.5 bg-[#1e3a24] text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer hover:bg-[#2d5635] inline-flex items-center gap-1 shrink-0"
                        >
                          📩 Send lenke
                        </a>
                      </td>
                    </tr>

                    <tr className="hover:bg-gray-50/20 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900 flex items-center gap-1">
                            bane-leder@skigk.no
                            <span className="text-[8px] bg-sky-50 text-sky-700 font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Kategori-leder</span>
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">Ansvarlig leder</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-2 py-0.5 bg-sky-50 text-sky-850 rounded text-[10px] font-bold uppercase">Banekomiteen, Baneverter, Dugnadskomiteen</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-[10px] text-gray-400 italic">Pre-konfigurert (Passord: 123456)</span>
                      </td>
                    </tr>

                    {/* Firestore loaded admins */}
                    {(() => {
                      const emailGroups: { [email: string]: { emailDoc?: Admin; uidDoc?: Admin } } = {};
                      
                      adminsList.forEach(adm => {
                        if (adm.email === 'owe-admin@golfklubb-it.com' || adm.email === 'Admin-2025@skigk.no' || adm.email === 'jarlemidt@gmail.com' || adm.email === 'leif.m@skigk.no') return;
                        const emailKey = adm.email.toLowerCase();
                        if (!emailGroups[emailKey]) {
                          emailGroups[emailKey] = {};
                        }
                        if (adm.uid.includes('@')) {
                          emailGroups[emailKey].emailDoc = adm;
                        } else {
                          emailGroups[emailKey].uidDoc = adm;
                        }
                      });

                      return Object.entries(emailGroups).map(([emailKey, group]) => {
                        const representation = group.emailDoc || group.uidDoc;
                        if (!representation) return null;
                        
                        const role = group.emailDoc?.role || group.uidDoc?.role || 'all';
                        const roleDetails = ROLES.find(r => r.id === role);
                        
                        const hasLoggedIn = !!group.uidDoc;
                        const displayUid = hasLoggedIn ? group.uidDoc?.uid : 'Sist lagret e-postinvitasjon (venter på innlogging)';
                        
                        return (
                          <tr key={emailKey} className="hover:bg-gray-50/20 transition-colors">
                            <td className="px-4 py-4">
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-gray-900">{representation.email}</span>
                                <span className={cn(
                                  "text-[10px] font-mono leading-normal",
                                  hasLoggedIn ? "text-gray-400" : "text-amber-600 font-bold"
                                )}>
                                  {hasLoggedIn ? `UID: ${displayUid}` : `⏱ ${displayUid}`}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className="px-2 py-0.5 bg-green-50 text-[#1e3a24] rounded text-[10px] font-bold uppercase">
                                {getRoleDisplayName(role)}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <button
                                onClick={async () => {
                                  if (confirm(`Er du sikker på at du vil fjerne admin-rettighetene til ${representation.email}?`)) {
                                    try {
                                      if (group.emailDoc) {
                                        await deleteDoc(doc(db, 'admins', group.emailDoc.uid));
                                      }
                                      if (group.uidDoc) {
                                        await deleteDoc(doc(db, 'admins', group.uidDoc.uid));
                                      }
                                      // Ensure composite and legacy email documents are completely cleared
                                      await deleteDoc(doc(db, 'admins', `${emailKey}_${activeClubId}`));
                                      try {
                                        await deleteDoc(doc(db, 'admins', emailKey));
                                      } catch (ignore) {}
                                    } catch (e: any) {
                                      alert(`Feil ved sletting: ${e.message}`);
                                    }
                                  }
                                }}
                                className="text-xs text-red-500 hover:text-red-700 font-bold transition-colors cursor-pointer"
                              >
                                Fjern tilgang
                              </button>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
 
            {/* Right Column: Add Category Admin Form */}
            <div className="lg:col-span-5 bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight">
                  Legg til ny oppgave-leder
                </h3>
                <p className="text-xs text-gray-400 font-bold uppercase mt-1">Tildel admin-tilgang til en bestemt rolle</p>
              </div>
 
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  const targetEmail = (e.currentTarget.elements.namedItem('adminEmail') as HTMLInputElement).value.trim();
                  const targetRole = (e.currentTarget.elements.namedItem('adminRole') as HTMLSelectElement).value;
 
                  if (!targetEmail || !targetRole) return;
                  const emailLower = targetEmail.toLowerCase();
 
                  try {
                    // Create composite key per club to support safe multi-club role mapping
                    const compositeKey = `${emailLower}_${activeClubId}`;
                    await setDoc(doc(db, 'admins', compositeKey), {
                      email: emailLower,
                      role: targetRole,
                      clubId: activeClubId,
                      createdAt: new Date()
                    });
                    // Reset form
                    (e.target as HTMLFormElement).reset();
                    alert(`Vellykket! ${targetEmail} er tildelt lederrollen for ${ROLES.find(r => r.id === targetRole)?.name}.\nNår hen logger på med denne e-posten, vil systemet automatisk aktivere tilgangen.`);
                  } catch (err: any) {
                    console.error("Feil ved lagring av admin:", err);
                    alert(`Kunne ikke lagre admin: ${err.message}`);
                  }
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider block">Brukerens E-post</label>
                  <input
                    name="adminEmail"
                    type="email"
                    required
                    placeholder="f.eks. ola.nordmann@skigk.no"
                    className="w-full bg-gray-50 border-transparent rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#1e3a24] focus:bg-white transition-all outline-none border"
                  />
                  <p className="text-[10px] text-gray-400 leading-snug">Du trenger bare oppgi e-posten til lederen. Systemet håndterer resten automatisk ved innlogging!</p>
                </div>
 
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider block">Velg Ansvarsområde / Rolle</label>
                  <select
                    name="adminRole"
                    required
                    className="w-full bg-gray-50 border-transparent rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#1e3a24] focus:bg-white transition-all outline-none border cursor-pointer"
                  >
                    {ROLES.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.manager})
                      </option>
                    ))}
                  </select>
                </div>
 
                <button
                  type="submit"
                  className="w-full bg-[#1e3a24] hover:bg-[#2d5635] text-white rounded-2xl py-3.5 font-semibold text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" /> Lagre Admin-tilgang
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Volunteer Modal */}
      <AnimatePresence>
        {editingVolunteer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-gray-100"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Rediger Frivillig-registrering</h3>
                <button 
                  onClick={() => setEditingVolunteer(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!editingVolunteer || !editingVolunteer.id) return;

                  if (editingVolunteer.id.startsWith('mock-')) {
                    alert("Eksempeldata kan ikke redigeres i databasen.");
                    setEditingVolunteer(null);
                    return;
                  }

                  const formData = new FormData(e.currentTarget);
                  const name = formData.get('name') as string;
                  const phone = formData.get('phone') as string;
                  const availability = formData.get('availability') as string;
                  const golfboxId = (formData.get('golfboxId') as string || '').trim();
                  
                  // Collect checked tasks
                  const taskElements = e.currentTarget.elements.namedItem('tasks') as any;
                  const selectedTasks: string[] = [];
                  if (taskElements) {
                    if (taskElements.length) {
                      for (let index = 0; index < taskElements.length; index++) {
                        if (taskElements[index].checked) {
                          selectedTasks.push(taskElements[index].value);
                        }
                      }
                    } else if (taskElements.checked) {
                      selectedTasks.push(taskElements.value);
                    }
                  }

                  if (selectedTasks.length === 0) {
                    alert("Du må velge minst én oppgave.");
                    return;
                  }

                  try {
                    const clubId = editingVolunteer.clubId || activeClubId;
                    const payload = {
                      name,
                      phone,
                      availability,
                      tasks: selectedTasks,
                      email: editingVolunteer.email,
                      submittedAt: editingVolunteer.submittedAt,
                      golfboxId,
                      clubId
                    };
                    await setDoc(doc(db, 'volunteers', editingVolunteer.id), payload);
                    setEditingVolunteer(null);
                    alert("Endringene ble lagret i databasen!");
                  } catch (err: any) {
                    console.error("Feil ved lagring av frivilligendringer:", err);
                    try {
                      handleFirestoreError(err, OperationType.UPDATE, `volunteers/${editingVolunteer.id}`);
                    } catch (fe) {
                      // Logged securely by error service
                    }
                    alert(`Kunne ikke lagre endringene: ${err.message}`);
                  }
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider block">Fullt Navn</label>
                  <input
                    name="name"
                    type="text"
                    required
                    defaultValue={editingVolunteer.name}
                    className="w-full bg-gray-50 border-transparent rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#1e3a24] outline-none border"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider block">Telefon</label>
                  <input
                    name="phone"
                    type="text"
                    required
                    defaultValue={editingVolunteer.phone}
                    className="w-full bg-gray-50 border-transparent rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#1e3a24] outline-none border"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider block">Golfbox-medlemsnummer</label>
                  <input
                    name="golfboxId"
                    type="text"
                    required
                    defaultValue={editingVolunteer.golfboxId || ''}
                    className="w-full bg-gray-50 border-transparent rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#1e3a24] outline-none border"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider block">Foretrukket Tid</label>
                  <input
                    name="availability"
                    type="text"
                    required
                    defaultValue={editingVolunteer.availability}
                    className="w-full bg-gray-50 border-transparent rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#1e3a24] outline-none border"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider block">Særinteresser / Oppgaver</label>
                  <div className="grid grid-cols-2 gap-2 text-xs font-medium max-h-[160px] overflow-y-auto pr-1">
                    {Array.from(new Set(ROLES.flatMap(r => r.tasks))).filter(Boolean).map(task => (
                      <label key={task} className="flex items-center gap-2 cursor-pointer p-2 bg-gray-50 hover:bg-gray-100/50 rounded-lg">
                        <input
                          type="checkbox"
                          name="tasks"
                          value={task}
                          defaultChecked={editingVolunteer.tasks.includes(task)}
                          className="rounded border-gray-300 text-[#1e3a24] focus:ring-[#1e3a24] cursor-pointer"
                        />
                        <span>{task}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-[#1e3a24] hover:bg-[#2d5635] text-white py-3 rounded-xl font-bold text-sm text-center shadow-lg hover:scale-[1.01] transition-all cursor-pointer"
                  >
                    Lagre endringer
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingVolunteer(null)}
                    className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition-colors cursor-pointer"
                  >
                    Avbryt
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
