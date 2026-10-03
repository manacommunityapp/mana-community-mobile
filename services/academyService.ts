import api from './apiClient';
import type {
  AcademyProgram,
  AcademyCategory,
  AcademyInstructor,
  UserEnrollment,
  DigitalCertificate,
  ClassAttendee,
  InstructorEarnings,
  HostWorkshopRequest,
  InstructorApplication,
  ProgramApprovalItem,
  AcademyAdminStats,
} from '@/types/academy';

// ── Mock Fallback Data ────────────────────────────────────────────────
const MOCK_CATEGORIES: AcademyCategory[] = [
  { id: 'cat-1', name: 'All Workshops', code: 'ALL', icon: 'apps', active: true, programCount: 14 },
  { id: 'cat-2', name: '🎵 Music & Instruments', code: 'MUSIC', icon: 'musical-notes', active: true, programCount: 3 },
  { id: 'cat-3', name: '🧘 Yoga & Wellness', code: 'YOGA', icon: 'leaf', active: true, programCount: 4 },
  { id: 'cat-4', name: '💻 Coding & AI', code: 'CODING', icon: 'code-slash', active: true, programCount: 3 },
  { id: 'cat-5', name: '🤖 Robotics & STEM Kids', code: 'STEM', icon: 'hardware-chip', active: true, programCount: 2 },
  { id: 'cat-6', name: '♟️ Chess Masterclass', code: 'CHESS', icon: 'trophy', active: true, programCount: 1 },
  { id: 'cat-7', name: '🎨 Fine Arts & Pottery', code: 'ARTS', icon: 'color-palette', active: true, programCount: 2 },
  { id: 'cat-8', name: '🍳 Gourmet Cooking', code: 'CULINARY', icon: 'restaurant', active: true, programCount: 1 },
];

const MOCK_INSTRUCTORS: AcademyInstructor[] = [
  {
    id: 'inst-1',
    fullName: 'Arjun Mehta',
    profession: 'Principal Software Architect & AI Researcher',
    bio: '14+ years in cloud native AI. Passionate about teaching Python, Full-Stack development, and robotics to community kids and professionals.',
    tower: 'Tower B',
    flatNumber: '804',
    skills: 'Python, React Native, LangChain, Machine Learning, IoT',
    totalSessions: 42,
    totalLearners: 186,
    averageRating: 4.9,
    reviewCount: 38,
    isVerified: true,
    badge: 'Master Mentor',
  },
  {
    id: 'inst-2',
    fullName: 'Pooja Iyer',
    profession: 'Certified Hatha Yoga Guru (RYS 500)',
    bio: 'Practicing Ashtanga & Iyengar yoga for 12 years. Holding morning breathwork, pranayama, and posture alignment classes at the clubhouse lawn.',
    tower: 'Tower A',
    flatNumber: '302',
    skills: 'Hatha Yoga, Sound Bath Healing, Pranayama, Posture Therapy',
    totalSessions: 86,
    totalLearners: 340,
    averageRating: 4.95,
    reviewCount: 92,
    isVerified: true,
    badge: 'Resident Wellness Lead',
  },
  {
    id: 'inst-3',
    fullName: 'Vikramaditya Sharma',
    profession: 'Trinity College Guildhall Certified Guitarist',
    bio: 'Classical and acoustic guitar coach. Mentored over 150 students across Bangalore from beginner chords to flamenco fingerpicking.',
    tower: 'Tower D',
    flatNumber: '1105',
    skills: 'Acoustic Guitar, Electric Soloing, Music Theory, Ukulele',
    totalSessions: 60,
    totalLearners: 120,
    averageRating: 4.85,
    reviewCount: 29,
    isVerified: true,
    badge: 'Top Music Coach',
  },
  {
    id: 'inst-4',
    fullName: 'Dr. Radhika Nambiar',
    profession: 'FIDE Rated Chess Player (ELO 2140)',
    bio: 'State chess championship medalist. Focusing on endgame tactics, positional chess strategies, and rapid tournament preparation for children and adults.',
    tower: 'Tower C',
    flatNumber: '401',
    skills: 'Opening Theory, Endgame Tactics, Blindfold Chess, Puzzles',
    totalSessions: 35,
    totalLearners: 94,
    averageRating: 4.92,
    reviewCount: 24,
    isVerified: true,
    badge: 'Grandmaster Coach',
  },
];

const MOCK_PROGRAMS: AcademyProgram[] = [
  {
    id: 'prog-1',
    instructorId: 'inst-1',
    instructorName: 'Arjun Mehta',
    instructorTower: 'Tower B',
    instructorFlat: '804',
    instructorRating: 4.9,
    categoryName: 'Coding & AI',
    categoryCode: 'CODING',
    title: 'Python for Kids & Beginners: AI & Game Logic',
    summary: 'Master core programming fundamentals, turtle graphics, arcade games, and simple generative AI prompts.',
    description: 'Designed specifically for beginners aged 10+ and curious adults. Learn loops, functions, object-oriented concepts, and build 3 playable mini-games (Snake, Space Invaders, AI Chatbot assistant) using Python.',
    learningType: 'COURSE',
    level: 'BEGINNER',
    mode: 'HYBRID',
    location: 'Clubhouse Activity Room 2 & Zoom',
    onlineMeetingUrl: 'https://zoom.us/j/982341234',
    startDate: '10 Oct 2026',
    endDate: '15 Nov 2026',
    startTime: '10:00 AM - 11:30 AM (Sat/Sun)',
    durationMinutes: 90,
    totalSessions: 6,
    pricingType: 'PAID',
    price: 1800,
    totalSeats: 16,
    enrolledCount: 14,
    userEnrolled: true,
    status: 'REGISTRATION_OPEN',
    certificateProvided: true,
    tags: ['Python', 'Coding for Kids', 'AI', 'Game Dev'],
    prerequisites: ['Laptop with Chrome/VS Code installed'],
    materialsProvided: ['Starter codebase', 'Python cheat sheet', 'Digital Workbook'],
    syllabus: [
      { sessionNumber: 1, title: 'Introduction & Python Basics', description: 'Variables, data types, and Turtle visual drawing.', durationMinutes: 90 },
      { sessionNumber: 2, title: 'Conditionals & Game Loops', description: 'Building the Snake arcade game framework.', durationMinutes: 90 },
      { sessionNumber: 3, title: 'Functions & Event Listeners', description: 'Keyboard inputs, collision detection, and scoring.', durationMinutes: 90 },
      { sessionNumber: 4, title: 'Data Structures (Lists & Dicts)', description: 'Managing game inventories and high-score boards.', durationMinutes: 90 },
      { sessionNumber: 5, title: 'Generative AI & API Connectors', description: 'Connecting simple OpenAI / Gemini prompt wrappers.', durationMinutes: 90 },
      { sessionNumber: 6, title: 'Final Showcase & Project Demos', description: 'Resident demo day, peer reviews, and certificate awards.', durationMinutes: 90 },
    ],
  },
  {
    id: 'prog-2',
    instructorId: 'inst-2',
    instructorName: 'Pooja Iyer',
    instructorTower: 'Tower A',
    instructorFlat: '302',
    instructorRating: 4.95,
    categoryName: 'Yoga & Wellness',
    categoryCode: 'YOGA',
    title: 'Sunrise Vinyasa Flow & Pranayama Breathwork',
    summary: 'Energize your mornings with posture alignment, core vitality flows, and stress-releasing sound meditations.',
    description: 'Immerse in holistic physical and mental wellness right on the central clubhouse manicured lawns. Suitable for all age groups with modifications for seniors and beginners.',
    learningType: 'FITNESS_SESSION',
    level: 'ALL_LEVELS',
    mode: 'IN_PERSON',
    location: 'Central Lawn / Open Amphitheatre',
    startDate: 'Daily 06:30 AM',
    startTime: '06:30 AM - 07:30 AM',
    durationMinutes: 60,
    totalSessions: 12,
    pricingType: 'PAID',
    price: 999,
    totalSeats: 25,
    enrolledCount: 22,
    userEnrolled: true,
    status: 'REGISTRATION_OPEN',
    certificateProvided: true,
    tags: ['Yoga', 'Pranayama', 'Wellness', 'Morning Routine'],
    prerequisites: ['Yoga Mat, Water bottle'],
    materialsProvided: ['Herbal tea after class', 'Daily posture guide'],
    syllabus: [
      { sessionNumber: 1, title: 'Surya Namaskar & Breath Sync', description: '12 foundational asanas with breath modulation.', durationMinutes: 60 },
      { sessionNumber: 2, title: 'Spinal Mobility & Core Strength', description: 'Gentle twists and abdominal strengthening.', durationMinutes: 60 },
      { sessionNumber: 3, title: 'Balancing Asanas (Vrikshasana / Garudasana)', description: 'Equilibrium, focus, and stability postures.', durationMinutes: 60 },
      { sessionNumber: 4, title: 'Deep Restorative Yoga & Shavasana', description: 'Guided body scan and nervous system calm.', durationMinutes: 60 },
      { sessionNumber: 5, title: 'Pranayama & Tibetan Singing Bowl Sound Bath', description: 'Kapalabhati, Anulom Vilom, and sound frequencies.', durationMinutes: 60 },
    ],
  },
  {
    id: 'prog-3',
    instructorId: 'inst-3',
    instructorName: 'Vikramaditya Sharma',
    instructorTower: 'Tower D',
    instructorFlat: '1105',
    instructorRating: 4.85,
    categoryName: 'Music & Instruments',
    categoryCode: 'MUSIC',
    title: 'Acoustic Guitar Mastery: Chords, Strumming & Jamming',
    summary: 'From open chords to Bollywood and Rock jamming in 4 weekend masterclasses.',
    description: 'Learn finger positioning, rhythm patterns, popular chord progressions (G-Em-C-D), barre chords, and transition smoothly between rhythm and lead riffs.',
    learningType: 'WORKSHOP',
    level: 'BEGINNER',
    mode: 'IN_PERSON',
    location: 'Clubhouse Music Studio (3rd Floor)',
    startDate: '12 Oct 2026',
    startTime: '05:00 PM - 06:30 PM (Sat)',
    durationMinutes: 90,
    totalSessions: 4,
    pricingType: 'PAID',
    price: 1500,
    totalSeats: 10,
    enrolledCount: 8,
    userEnrolled: false,
    status: 'REGISTRATION_OPEN',
    certificateProvided: true,
    tags: ['Guitar', 'Music Theory', 'Jamming', 'Acoustic'],
    prerequisites: ['Acoustic or Classical Guitar'],
    materialsProvided: ['Tab sheets', 'Digital chord flashcards'],
    syllabus: [
      { sessionNumber: 1, title: 'Fretboard Geography & Tuning', description: 'Standard tuning, finger warmups, and root notes.', durationMinutes: 90 },
      { sessionNumber: 2, title: 'Essential 8 Chords & Strumming', description: 'Mastering Down-Up syncopated strumming rhythms.', durationMinutes: 90 },
      { sessionNumber: 3, title: 'Song Construction & Fingerpicking', description: 'P-I-M-A picking patterns and popular songs.', durationMinutes: 90 },
      { sessionNumber: 4, title: 'Community Jam Session', description: 'Group ensemble performance and stage presence.', durationMinutes: 90 },
    ],
  },
  {
    id: 'prog-4',
    instructorId: 'inst-4',
    instructorName: 'Dr. Radhika Nambiar',
    instructorTower: 'Tower C',
    instructorFlat: '401',
    instructorRating: 4.92,
    categoryName: 'Chess Masterclass',
    categoryCode: 'CHESS',
    title: 'Grandmaster Tactics & Endgame Strategy',
    summary: 'Elevate your rating through tactical motifs: pins, forks, skewers, and king-pawn endgames.',
    description: 'Weekly tournament-style analysis, puzzle solving, clock management, and interactive sparring sessions with individual review.',
    learningType: 'COACHING',
    level: 'INTERMEDIATE',
    mode: 'IN_PERSON',
    location: 'Clubhouse Chess Lounge',
    startDate: '14 Oct 2026',
    startTime: '04:00 PM - 05:30 PM (Sun)',
    durationMinutes: 90,
    totalSessions: 4,
    pricingType: 'FREE',
    price: 0,
    totalSeats: 14,
    enrolledCount: 12,
    userEnrolled: false,
    status: 'REGISTRATION_OPEN',
    certificateProvided: true,
    tags: ['Chess', 'FIDE', 'Strategy', 'Tactics'],
    prerequisites: ['Basic understanding of chess rules and piece movements'],
    syllabus: [
      { sessionNumber: 1, title: 'Opening Principles & Gambit Traps', description: 'Italian Game, Sicilian Defense, Queen’s Gambit.', durationMinutes: 90 },
      { sessionNumber: 2, title: 'Tactical Calculation & Spotting Combinations', description: 'Double attacks, deflection, overloaded defenders.', durationMinutes: 90 },
      { sessionNumber: 3, title: 'Endgame Mastery & Opposition', description: 'Rook endgames, Lucena and Philidor positions.', durationMinutes: 90 },
      { sessionNumber: 4, title: 'Simul Match & Tournament Play', description: '10-board simultaneous sparring with Dr. Radhika.', durationMinutes: 90 },
    ],
  },
  {
    id: 'prog-5',
    instructorId: 'inst-1',
    instructorName: 'Arjun Mehta',
    instructorTower: 'Tower B',
    instructorFlat: '804',
    instructorRating: 4.9,
    categoryName: 'Robotics & STEM Kids',
    categoryCode: 'STEM',
    title: 'Arduino & ESP32 Smart Home IoT Workshop',
    summary: 'Build working smart sensors: automated water-level alerts, RFID door lock, and LED matrix.',
    description: 'Hands-on breadboard circuit wiring, C++ Arduino programming, and WiFi connectivity to send push notifications to mobile phones.',
    learningType: 'WORKSHOP',
    level: 'INTERMEDIATE',
    mode: 'IN_PERSON',
    location: 'Innovation Lab / Tower B Multipurpose Room',
    startDate: '18 Oct 2026',
    startTime: '02:00 PM - 04:30 PM',
    durationMinutes: 150,
    totalSessions: 2,
    pricingType: 'PAID',
    price: 2200,
    totalSeats: 12,
    enrolledCount: 10,
    userEnrolled: false,
    status: 'REGISTRATION_OPEN',
    certificateProvided: true,
    tags: ['Robotics', 'IoT', 'Arduino', 'Electronics'],
    prerequisites: ['Basic computer skills'],
    materialsProvided: ['Complete Hardware Kit (Sensors, ESP32, Jumper Wires) included'],
  },
];

const MOCK_ENROLLMENTS: UserEnrollment[] = [
  {
    id: 'enr-101',
    programId: 'prog-1',
    programTitle: 'Python for Kids & Beginners: AI & Game Logic',
    instructorName: 'Arjun Mehta',
    instructorTower: 'Tower B - 804',
    categoryName: 'Coding & AI',
    startDate: '10 Oct 2026',
    startTime: '10:00 AM - 11:30 AM (Sat/Sun)',
    location: 'Clubhouse Activity Room 2',
    mode: 'HYBRID',
    status: 'CONFIRMED',
    qrCheckInToken: 'MANA-ACAD-PY7721',
    attendanceMarked: false,
    attendedSessions: 4,
    totalSessions: 6,
    pricePaid: 1800,
    attendanceHistory: [
      { sessionId: 's1', sessionNumber: 1, title: 'Introduction & Python Basics', date: '10 Oct 2026', time: '10:00 AM', status: 'COMPLETED', attended: true, notes: 'Mastered variables & turtle loop' },
      { sessionId: 's2', sessionNumber: 2, title: 'Conditionals & Game Loops', date: '11 Oct 2026', time: '10:00 AM', status: 'COMPLETED', attended: true, notes: 'Built Snake movement logic' },
      { sessionId: 's3', sessionNumber: 3, title: 'Functions & Event Listeners', date: '17 Oct 2026', time: '10:00 AM', status: 'COMPLETED', attended: true, notes: 'Implemented collision detector' },
      { sessionId: 's4', sessionNumber: 4, title: 'Data Structures (Lists & Dicts)', date: '18 Oct 2026', time: '10:00 AM', status: 'COMPLETED', attended: true, notes: 'High score serialization' },
      { sessionId: 's5', sessionNumber: 5, title: 'Generative AI & API Connectors', date: '24 Oct 2026', time: '10:00 AM', status: 'UPCOMING', attended: false },
      { sessionId: 's6', sessionNumber: 6, title: 'Final Showcase & Project Demos', date: '25 Oct 2026', time: '10:00 AM', status: 'UPCOMING', attended: false },
    ],
  },
  {
    id: 'enr-102',
    programId: 'prog-2',
    programTitle: 'Sunrise Vinyasa Flow & Pranayama Breathwork',
    instructorName: 'Pooja Iyer',
    instructorTower: 'Tower A - 302',
    categoryName: 'Yoga & Wellness',
    startDate: 'Daily 06:30 AM',
    startTime: '06:30 AM - 07:30 AM',
    location: 'Central Clubhouse Lawn',
    mode: 'IN_PERSON',
    status: 'COMPLETED',
    qrCheckInToken: 'MANA-ACAD-YG9941',
    attendanceMarked: true,
    attendedSessions: 5,
    totalSessions: 5,
    pricePaid: 999,
    certificateId: 'cert-101',
    attendanceHistory: [
      { sessionId: 'y1', sessionNumber: 1, title: 'Surya Namaskar & Breath Sync', date: '01 Oct 2026', time: '06:30 AM', status: 'COMPLETED', attended: true },
      { sessionId: 'y2', sessionNumber: 2, title: 'Spinal Mobility & Core Strength', date: '02 Oct 2026', time: '06:30 AM', status: 'COMPLETED', attended: true },
      { sessionId: 'y3', sessionNumber: 3, title: 'Balancing Asanas (Vrikshasana)', date: '03 Oct 2026', time: '06:30 AM', status: 'COMPLETED', attended: true },
      { sessionId: 'y4', sessionNumber: 4, title: 'Deep Restorative Yoga', date: '04 Oct 2026', time: '06:30 AM', status: 'COMPLETED', attended: true },
      { sessionId: 'y5', sessionNumber: 5, title: 'Pranayama & Singing Bowl Bath', date: '05 Oct 2026', time: '06:30 AM', status: 'COMPLETED', attended: true },
    ],
  },
];

const MOCK_CERTIFICATES: DigitalCertificate[] = [
  {
    id: 'cert-101',
    enrollmentId: 'enr-102',
    programId: 'prog-2',
    programTitle: 'Sunrise Vinyasa Flow & Pranayama Mastery',
    categoryName: 'Yoga & Holistic Wellness',
    recipientName: 'Sandeep Kumar',
    recipientFlat: 'Tower B - 602',
    instructorName: 'Pooja Iyer',
    instructorDesignation: 'Certified Yoga Master (RYS-500) & Resident Wellness Coach',
    issueDate: '06 October 2026',
    certificateNumber: 'MANA-CERT-2026-YOGA-8842',
    gradeScore: '100% Attendance & Distinction',
    skillsAcquired: ['Ashtanga Vinyasa Series', 'Pranayama Modulation', 'Sound Bath Meditation', 'Postural Biomechanics'],
    verificationUrl: 'https://mana.community/verify/cert/MANA-CERT-2026-YOGA-8842',
    communityName: 'Mana Residency Community Academy',
  },
  {
    id: 'cert-102',
    enrollmentId: 'enr-prev-01',
    programId: 'prog-prev-01',
    programTitle: 'Emergency First Aid & CPR Certification',
    categoryName: 'Safety & Health',
    recipientName: 'Sandeep Kumar',
    recipientFlat: 'Tower B - 602',
    instructorName: 'Dr. Vivek Menon',
    instructorDesignation: 'Resident Chief Medical Advisor',
    issueDate: '15 September 2026',
    certificateNumber: 'MANA-CERT-2026-CPR-3109',
    gradeScore: 'Passed with Honors',
    skillsAcquired: ['Adult & Infant CPR', 'AED Machine Operation', 'Burn & Fracture Immobilization'],
    verificationUrl: 'https://mana.community/verify/cert/MANA-CERT-2026-CPR-3109',
    communityName: 'Mana Residency Community Academy',
  },
];

const MOCK_STUDENT_ROSTER: ClassAttendee[] = [
  { id: 'att-1', studentName: 'Rohan Deshmukh', flatNumber: '403', tower: 'Tower A', enrolledAt: '02 Oct 2026', attendedCount: 4, totalSessions: 6, paymentStatus: 'PAID', amount: 1800, checkedInToday: true, qrToken: 'MANA-ACAD-ROH44' },
  { id: 'att-2', studentName: 'Ananya Sen', flatNumber: '702', tower: 'Tower B', enrolledAt: '03 Oct 2026', attendedCount: 4, totalSessions: 6, paymentStatus: 'PAID', amount: 1800, checkedInToday: true, qrToken: 'MANA-ACAD-ANA21' },
  { id: 'att-3', studentName: 'Aditya Varma', flatNumber: '1104', tower: 'Tower C', enrolledAt: '04 Oct 2026', attendedCount: 3, totalSessions: 6, paymentStatus: 'PAID', amount: 1800, checkedInToday: false, qrToken: 'MANA-ACAD-ADI09' },
  { id: 'att-4', studentName: 'Priya Nambiar', flatNumber: '201', tower: 'Tower A', enrolledAt: '05 Oct 2026', attendedCount: 4, totalSessions: 6, paymentStatus: 'PAID', amount: 1800, checkedInToday: true, qrToken: 'MANA-ACAD-PRI88' },
  { id: 'att-5', studentName: 'Kabir & Sneha Rao', flatNumber: '905', tower: 'Tower D', enrolledAt: '06 Oct 2026', attendedCount: 4, totalSessions: 6, paymentStatus: 'PAID', amount: 1800, checkedInToday: false, qrToken: 'MANA-ACAD-KAB33' },
];

const MOCK_INSTRUCTOR_EARNINGS: InstructorEarnings = {
  totalGrossRevenue: 48600,
  platformFeeAmount: 2430, // 5% community maintenance contribution
  netPayoutAmount: 46170,
  pendingPayout: 12600,
  totalLearnersTaught: 186,
  activeWorkshopsCount: 2,
  completedWorkshopsCount: 8,
};

const MOCK_ADMIN_STATS: AcademyAdminStats = {
  totalActiveWorkshops: 14,
  totalResidentFaculty: 18,
  totalEnrollments: 342,
  totalCertificatesIssued: 215,
  grossRevenueGmv: 284500,
  communityFundContribution: 14225,
  pendingInstructorApplications: 3,
  pendingProgramApprovals: 2,
};

const MOCK_PENDING_INSTRUCTORS: InstructorApplication[] = [
  {
    id: 'app-1',
    applicantName: 'Meera Krishnan',
    flatNumber: '601',
    tower: 'Tower C',
    profession: 'Professional Kathak Dancer & Choreographer',
    experienceYears: 10,
    proposedSubject: 'Classical Kathak Basics & Rhythm Taals for Kids',
    qualifications: 'Doordarshan Graded Artist, Gandharva Mahavidyalaya Alankar',
    status: 'PENDING',
    appliedDate: '01 Oct 2026',
  },
  {
    id: 'app-2',
    applicantName: 'Naveen Bhatia',
    flatNumber: '1202',
    tower: 'Tower B',
    profession: 'Senior Portfolio Manager (CFA)',
    experienceYears: 12,
    proposedSubject: 'Personal Finance, Mutual Funds & Retirement Planning for Residents',
    qualifications: 'CFA Charterholder, IIM Calcutta Alum',
    status: 'PENDING',
    appliedDate: '02 Oct 2026',
  },
];

const MOCK_PENDING_PROGRAMS: ProgramApprovalItem[] = [
  {
    id: 'pap-1',
    title: 'Weekend Sourdough Bread & Artisan Baking',
    instructorName: 'Chef Shalini Nair',
    tower: 'Tower A',
    flatNumber: '504',
    categoryName: 'Gourmet Cooking',
    learningType: 'WORKSHOP',
    pricingType: 'PAID',
    price: 1200,
    totalSeats: 12,
    submittedDate: '02 Oct 2026',
    status: 'PENDING_APPROVAL',
    summary: 'Master wild yeast starters, hydration calculations, and dutch oven crust baking.',
  },
  {
    id: 'pap-2',
    title: 'Speedcubing & 3x3 Rubik’s Cube Masterclass',
    instructorName: 'Dhruv Goel',
    tower: 'Tower D',
    flatNumber: '302',
    categoryName: 'Robotics & STEM Kids',
    learningType: 'KIDS_CLASS',
    pricingType: 'FREE',
    price: 0,
    totalSeats: 15,
    submittedDate: '02 Oct 2026',
    status: 'PENDING_APPROVAL',
    summary: 'CFOP method algorithms, cross alignment, F2L pairs for under-30-second solves.',
  },
];

// ── In-Memory State for dynamic mutations in demo ──────────────────────
let memoryPrograms = [...MOCK_PROGRAMS];
let memoryEnrollments = [...MOCK_ENROLLMENTS];
let memoryCertificates = [...MOCK_CERTIFICATES];
let memoryAttendees = [...MOCK_STUDENT_ROSTER];
let memoryPendingInstructors = [...MOCK_PENDING_INSTRUCTORS];
let memoryPendingPrograms = [...MOCK_PENDING_PROGRAMS];

export const academyService = {
  // ── Catalog & Programs ─────────────────────────────────────────────
  async getCategories(): Promise<AcademyCategory[]> {
    try {
      const res = await api.get<AcademyCategory[]>('/academy/categories');
      return res.data?.length ? res.data : MOCK_CATEGORIES;
    } catch {
      return MOCK_CATEGORIES;
    }
  },

  async getPrograms(category?: string, query?: string): Promise<AcademyProgram[]> {
    try {
      const res = await api.get<AcademyProgram[]>('/academy/programs', {
        params: { category: category === 'ALL' ? undefined : category, q: query },
      });
      if (res.data?.length) return res.data;
    } catch {
      // Fallback
    }
    let list = [...memoryPrograms];
    if (category && category !== 'ALL') {
      list = list.filter((p) => p.categoryCode === category);
    }
    if (query?.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.instructorName.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  },

  async getProgramById(id: string): Promise<AcademyProgram> {
    try {
      const res = await api.get<AcademyProgram>(`/academy/programs/${id}`);
      return res.data;
    } catch {
      const found = memoryPrograms.find((p) => p.id === id);
      if (!found) throw new Error('Program not found');
      return found;
    }
  },

  async enrollProgram(programId: string): Promise<UserEnrollment> {
    try {
      const res = await api.post<UserEnrollment>(`/academy/programs/${programId}/enroll`);
      if (res.data) return res.data;
    } catch {
      // Offline simulation
    }
    const prog = memoryPrograms.find((p) => p.id === programId);
    if (!prog) throw new Error('Program not found');

    prog.userEnrolled = true;
    prog.enrolledCount += 1;

    const newEnrollment: UserEnrollment = {
      id: `enr-${Date.now()}`,
      programId: prog.id,
      programTitle: prog.title,
      instructorName: prog.instructorName,
      instructorTower: `${prog.instructorTower || 'Tower A'} - ${prog.instructorFlat || '101'}`,
      categoryName: prog.categoryName,
      startDate: prog.startDate,
      startTime: prog.startTime,
      location: prog.location || 'Clubhouse',
      mode: prog.mode,
      status: 'CONFIRMED',
      qrCheckInToken: `MANA-ACAD-${Math.floor(1000 + Math.random() * 9000)}`,
      attendanceMarked: false,
      attendedSessions: 0,
      totalSessions: prog.totalSessions || 4,
      pricePaid: prog.price,
      attendanceHistory: prog.syllabus?.map((s, idx) => ({
        sessionId: `sess-${idx + 1}`,
        sessionNumber: s.sessionNumber,
        title: s.title,
        date: prog.startDate,
        time: prog.startTime,
        status: idx === 0 ? 'UPCOMING' : 'UPCOMING',
        attended: false,
      })) || [],
    };

    memoryEnrollments = [newEnrollment, ...memoryEnrollments];
    return newEnrollment;
  },

  // ── My Learning, Attendance & Certificates ──────────────────────────
  async getMyEnrollments(): Promise<UserEnrollment[]> {
    try {
      const res = await api.get<UserEnrollment[]>('/academy/my-enrollments');
      return res.data?.length ? res.data : memoryEnrollments;
    } catch {
      return memoryEnrollments;
    }
  },

  async getCertificates(): Promise<DigitalCertificate[]> {
    try {
      const res = await api.get<DigitalCertificate[]>('/academy/certificates');
      return res.data?.length ? res.data : memoryCertificates;
    } catch {
      return memoryCertificates;
    }
  },

  async getCertificateById(certId: string): Promise<DigitalCertificate> {
    try {
      const res = await api.get<DigitalCertificate>(`/academy/certificates/${certId}`);
      return res.data;
    } catch {
      const found = memoryCertificates.find((c) => c.id === certId || c.certificateNumber === certId);
      if (!found) throw new Error('Certificate not found');
      return found;
    }
  },

  async checkInStudentSession(enrollmentId: string, token: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await api.post(`/academy/attendance/check-in`, { enrollmentId, token });
      return res.data;
    } catch {
      const enr = memoryEnrollments.find((e) => e.id === enrollmentId);
      if (enr) {
        enr.attendanceMarked = true;
        enr.attendedSessions = Math.min(enr.totalSessions, enr.attendedSessions + 1);
        if (enr.attendanceHistory && enr.attendanceHistory.length > 0) {
          const firstUpcoming = enr.attendanceHistory.find((s) => s.status === 'UPCOMING');
          if (firstUpcoming) {
            firstUpcoming.status = 'COMPLETED';
            firstUpcoming.attended = true;
          }
        }
      }
      return { success: true, message: 'Class check-in recorded successfully!' };
    }
  },

  // ── Instructors Directory & Profile ────────────────────────────────
  async getInstructors(): Promise<AcademyInstructor[]> {
    try {
      const res = await api.get<AcademyInstructor[]>('/academy/instructors');
      return res.data?.length ? res.data : MOCK_INSTRUCTORS;
    } catch {
      return MOCK_INSTRUCTORS;
    }
  },

  // ── Instructor Hub (/academy/teaching) ──────────────────────────────
  async getInstructorHubData(): Promise<{
    stats: InstructorEarnings;
    hostedPrograms: AcademyProgram[];
    attendees: ClassAttendee[];
  }> {
    try {
      const res = await api.get('/academy/teaching/dashboard');
      return res.data;
    } catch {
      return {
        stats: MOCK_INSTRUCTOR_EARNINGS,
        hostedPrograms: memoryPrograms.filter((p) => p.instructorId === 'inst-1'),
        attendees: memoryAttendees,
      };
    }
  },

  async hostWorkshop(req: HostWorkshopRequest): Promise<AcademyProgram> {
    try {
      const res = await api.post<AcademyProgram>('/academy/teaching/workshops', req);
      return res.data;
    } catch {
      const newProg: AcademyProgram = {
        id: `prog-${Date.now()}`,
        instructorId: 'inst-1',
        instructorName: 'Arjun Mehta',
        instructorTower: 'Tower B',
        instructorFlat: '804',
        instructorRating: 4.9,
        categoryName: req.categoryCode,
        categoryCode: req.categoryCode,
        title: req.title,
        summary: req.summary,
        description: req.description,
        learningType: req.learningType,
        level: req.level,
        mode: req.mode,
        location: req.location || 'Clubhouse',
        onlineMeetingUrl: req.onlineMeetingUrl,
        startDate: req.startDate,
        startTime: req.startTime,
        durationMinutes: req.durationMinutes,
        totalSessions: req.totalSessions,
        pricingType: req.pricingType,
        price: req.price,
        totalSeats: req.totalSeats,
        enrolledCount: 0,
        userEnrolled: false,
        status: 'PENDING_APPROVAL',
        certificateProvided: true,
        syllabus: req.syllabus?.map((s, idx) => ({
          sessionNumber: idx + 1,
          title: s.title,
          description: s.description,
          durationMinutes: req.durationMinutes,
        })),
      };

      memoryPrograms = [newProg, ...memoryPrograms];
      return newProg;
    }
  },

  async toggleAttendeeAttendance(attendeeId: string): Promise<ClassAttendee> {
    try {
      const res = await api.post<ClassAttendee>(`/academy/teaching/attendees/${attendeeId}/toggle-attendance`);
      return res.data;
    } catch {
      const att = memoryAttendees.find((a) => a.id === attendeeId);
      if (att) {
        att.checkedInToday = !att.checkedInToday;
        att.attendedCount += att.checkedInToday ? 1 : -1;
      }
      return att || memoryAttendees[0];
    }
  },

  async applyAsInstructor(data: Omit<InstructorApplication, 'id' | 'status' | 'appliedDate'>): Promise<InstructorApplication> {
    try {
      const res = await api.post<InstructorApplication>('/academy/instructors/apply', data);
      return res.data;
    } catch {
      const newApp: InstructorApplication = {
        id: `app-${Date.now()}`,
        ...data,
        status: 'PENDING',
        appliedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      };
      memoryPendingInstructors = [newApp, ...memoryPendingInstructors];
      return newApp;
    }
  },

  // ── Academy Admin (/academy/admin) ──────────────────────────────────
  async getAdminStats(): Promise<AcademyAdminStats> {
    try {
      const res = await api.get<AcademyAdminStats>('/academy/admin/stats');
      return res.data;
    } catch {
      return {
        ...MOCK_ADMIN_STATS,
        pendingInstructorApplications: memoryPendingInstructors.filter((i) => i.status === 'PENDING').length,
        pendingProgramApprovals: memoryPendingPrograms.filter((p) => p.status === 'PENDING_APPROVAL').length,
      };
    }
  },

  async getPendingInstructorApplications(): Promise<InstructorApplication[]> {
    try {
      const res = await api.get<InstructorApplication[]>('/academy/admin/instructors/pending');
      return res.data;
    } catch {
      return memoryPendingInstructors;
    }
  },

  async approveInstructorApplication(id: string, approved: boolean): Promise<void> {
    try {
      await api.post(`/academy/admin/instructors/${id}/${approved ? 'approve' : 'reject'}`);
    } catch {
      const target = memoryPendingInstructors.find((i) => i.id === id);
      if (target) target.status = approved ? 'APPROVED' : 'REJECTED';
    }
  },

  async getPendingProgramApprovals(): Promise<ProgramApprovalItem[]> {
    try {
      const res = await api.get<ProgramApprovalItem[]>('/academy/admin/programs/pending');
      return res.data;
    } catch {
      return memoryPendingPrograms;
    }
  },

  async approveProgramSubmission(id: string, approved: boolean): Promise<void> {
    try {
      await api.post(`/academy/admin/programs/${id}/${approved ? 'approve' : 'reject'}`);
    } catch {
      const target = memoryPendingPrograms.find((p) => p.id === id);
      if (target) target.status = approved ? 'APPROVED' : 'REJECTED';

      const liveTarget = memoryPrograms.find((p) => p.id === id);
      if (liveTarget) liveTarget.status = approved ? 'REGISTRATION_OPEN' : 'COMPLETED';
    }
  },
};

