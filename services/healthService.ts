import api from "./apiClient";
import {
  DoctorDto,
  DoctorReview,
  FamilyMemberDto,
  HealthAppointmentDto,
  MedicalRecordDto,
  LabPackageDto,
  HomecareProviderDto,
  HealthEmergencyContactDto,
  AiTriageResponse,
  HealthAuditEntry,
  ConsultationMode,
  HealthCampDto,
  HealthCampRegistrationDto,
  HealthBenefitWalletDto,
  CareJourneyDto
} from "../types/health";
import { personalFinanceService } from "./personalFinanceService";

let doctorsState: DoctorDto[] = [
  // ── DOCTORS ──
  {
    id: "doc-1",
    name: "Dr. Rajesh Kumar",
    specialty: "Cardiologist",
    category: "DOCTOR",
    qualifications: ["MBBS", "MD (Medicine)", "DM (Cardiology)"],
    experienceYears: 15,
    rating: 4.8,
    reviewCount: 42,
    consultationFee: 700,
    consultationModes: ["IN_PERSON", "VIDEO"],
    nextAvailableSlot: "Today, 6:30 PM",
    verifiedBadge: true,
    registrationNumber: "KMC-48291",
    medicalCouncil: "Karnataka Medical Council",
    languages: ["English", "Hindi", "Kannada"],
    clinicName: "Mana Community Health & Wellness Center",
    clinicAddress: "Tower B, Ground Floor, Mana Residency",
    distanceKm: 0.1,
    phone: "+91-98801-44221",
    email: "dr.rajesh@manawellness.in",
    hospitalAffiliations: ["Apollo Hospitals", "Manipal Heart Centre"],
    verifiedCommunityConsultations: 28,
    openNow: true,
    emergencyServicesAvailable: true,
    homeVisitAvailable: false,
    communityOffer: {
      title: "Complimentary ECG with Consultation",
      badge: "Mana Resident Exclusive",
      discountPercent: 15,
      promoCode: "MANAHEART",
      description: "Free in-clinic ECG report review for all Mana society residents.",
      validUntil: "2026-11-30"
    },
    clinicHours: [
      { day: "Mon - Fri", morning: "09:00 AM - 01:00 PM", evening: "05:00 PM - 08:30 PM" },
      { day: "Saturday", morning: "10:00 AM - 02:00 PM" },
      { day: "Sunday", isClosed: true }
    ],
    appointmentSlots: [
      { id: "s-1", time: "10:00 AM", period: "MORNING", available: true, mode: "IN_PERSON" },
      { id: "s-2", time: "11:30 AM", period: "MORNING", available: false, mode: "IN_PERSON" },
      { id: "s-3", time: "05:30 PM", period: "EVENING", available: true, mode: "VIDEO" },
      { id: "s-4", time: "06:30 PM", period: "EVENING", available: true, mode: "IN_PERSON" },
      { id: "s-5", time: "07:30 PM", period: "EVENING", available: true, mode: "VIDEO" }
    ],
    reviews: [
      {
        communication: 5,
        waitingTime: 4,
        professionalism: 5,
        clinicExperience: 5,
        wouldRecommend: true,
        comment: "Extremely attentive and explained ECG report with great clarity.",
        authorName: "Tower C Resident",
        date: "2026-09-28"
      }
    ]
  },
  {
    id: "doc-2",
    name: "Dr. Ananya Sharma",
    specialty: "Pediatrician",
    category: "DOCTOR",
    qualifications: ["MBBS", "DCH", "DNB (Pediatrics)"],
    experienceYears: 11,
    rating: 4.9,
    reviewCount: 68,
    consultationFee: 600,
    consultationModes: ["IN_PERSON", "VIDEO", "PHONE"],
    nextAvailableSlot: "Tomorrow, 10:00 AM",
    verifiedBadge: true,
    registrationNumber: "KMC-59102",
    medicalCouncil: "Karnataka Medical Council",
    languages: ["English", "Hindi"],
    clinicName: "Little Stars Child Clinic",
    clinicAddress: "Opp. Mana Community Gate 2",
    distanceKm: 0.3,
    phone: "+91-99002-33112",
    email: "ananya@littlestarsclinic.org",
    hospitalAffiliations: ["Cloudnine Hospitals"],
    verifiedCommunityConsultations: 46,
    openNow: true,
    emergencyServicesAvailable: false,
    homeVisitAvailable: true,
    communityOffer: {
      title: "Free Vaccination Record Audit",
      badge: "Kids Wellness Partner",
      discountPercent: 10,
      description: "Complimentary childhood milestone check with any consultation.",
      validUntil: "2026-12-15"
    },
    clinicHours: [
      { day: "Mon - Sat", morning: "09:30 AM - 01:30 PM", evening: "04:30 PM - 08:00 PM" },
      { day: "Sunday", morning: "10:00 AM - 01:00 PM" }
    ],
    appointmentSlots: [
      { id: "s-6", time: "10:00 AM", period: "MORNING", available: true, mode: "IN_PERSON" },
      { id: "s-7", time: "11:00 AM", period: "MORNING", available: true, mode: "IN_PERSON" },
      { id: "s-8", time: "05:00 PM", period: "EVENING", available: true, mode: "VIDEO" },
      { id: "s-9", time: "06:30 PM", period: "EVENING", available: true, mode: "PHONE" }
    ],
    reviews: [
      {
        communication: 5,
        waitingTime: 5,
        professionalism: 5,
        clinicExperience: 5,
        wouldRecommend: true,
        comment: "Super gentle with our 3-year-old. Always available for urgent queries.",
        authorName: "Tower A Resident",
        date: "2026-10-02"
      }
    ]
  },
  {
    id: "doc-3",
    name: "Dr. Vikram Sethi",
    specialty: "Orthopedic Surgeon",
    category: "DOCTOR",
    qualifications: ["MBBS", "MS (Ortho)", "FACS (Joint Replacement)"],
    experienceYears: 18,
    rating: 4.7,
    reviewCount: 35,
    consultationFee: 800,
    consultationModes: ["IN_PERSON"],
    nextAvailableSlot: "Today, 5:00 PM",
    verifiedBadge: true,
    registrationNumber: "MCI-31908",
    medicalCouncil: "Medical Council of India",
    languages: ["English", "Hindi", "Punjabi"],
    clinicName: "Sethi Bone & Joint Clinic",
    clinicAddress: "Sarjapur Main Road, 1.2 km away",
    distanceKm: 1.2,
    phone: "+91-98112-99881",
    hospitalAffiliations: ["Fortis Hospital", "Columbia Asia"],
    verifiedCommunityConsultations: 19,
    openNow: true,
    emergencyServicesAvailable: true,
    homeVisitAvailable: false,
    clinicHours: [
      { day: "Mon - Sat", morning: "10:00 AM - 01:00 PM", evening: "05:00 PM - 08:30 PM" },
      { day: "Sunday", isClosed: true }
    ],
    appointmentSlots: [
      { id: "s-10", time: "05:00 PM", period: "EVENING", available: true, mode: "IN_PERSON" },
      { id: "s-11", time: "06:00 PM", period: "EVENING", available: true, mode: "IN_PERSON" }
    ],
    reviews: []
  },
  {
    id: "doc-4",
    name: "Dr. Priya Swaminathan",
    specialty: "Dermatologist & Trichologist",
    category: "DOCTOR",
    qualifications: ["MBBS", "MD (Dermatology, Venereology & Leprosy)"],
    experienceYears: 12,
    rating: 4.85,
    reviewCount: 52,
    consultationFee: 650,
    consultationModes: ["IN_PERSON", "VIDEO"],
    nextAvailableSlot: "Tomorrow, 11:30 AM",
    verifiedBadge: true,
    registrationNumber: "KMC-62411",
    medicalCouncil: "Karnataka Medical Council",
    languages: ["English", "Tamil", "Hindi"],
    clinicName: "Aura Skin & Hair Aesthetics",
    clinicAddress: "Green Glen Layout, Bellandur (1.5 km)",
    distanceKm: 1.5,
    phone: "+91-97401-22334",
    hospitalAffiliations: ["Manipal Hospital Old Airport Rd"],
    verifiedCommunityConsultations: 31,
    openNow: false,
    emergencyServicesAvailable: false,
    homeVisitAvailable: false,
    communityOffer: {
      title: "20% Off Clinical Skin & Hair Consultation",
      badge: "Mana Privilege",
      discountPercent: 20,
      description: "Exclusive discount on first consultation and scalp analysis.",
      validUntil: "2026-11-25"
    },
    clinicHours: [
      { day: "Mon - Fri", morning: "10:30 AM - 02:00 PM", evening: "04:30 PM - 07:30 PM" },
      { day: "Saturday", morning: "10:00 AM - 02:00 PM" },
      { day: "Sunday", isClosed: true }
    ],
    appointmentSlots: [
      { id: "s-12", time: "11:30 AM", period: "MORNING", available: true, mode: "IN_PERSON" },
      { id: "s-13", time: "05:30 PM", period: "EVENING", available: true, mode: "VIDEO" }
    ],
    reviews: []
  },
  {
    id: "doc-5",
    name: "Dr. Sanjay Hegde",
    specialty: "General Physician & Diabetologist",
    category: "DOCTOR",
    qualifications: ["MBBS", "MD (General Medicine)", "PG Dip Diabetes"],
    experienceYears: 22,
    rating: 4.9,
    reviewCount: 94,
    consultationFee: 450,
    consultationModes: ["IN_PERSON", "VIDEO", "PHONE"],
    nextAvailableSlot: "Today, 4:00 PM",
    verifiedBadge: true,
    registrationNumber: "KMC-23109",
    medicalCouncil: "Karnataka Medical Council",
    languages: ["English", "Kannada", "Hindi", "Telugu"],
    clinicName: "Mana Resident Family Clinic",
    clinicAddress: "Tower A, Ground Floor, Mana Residency",
    distanceKm: 0.1,
    phone: "+91-98440-11223",
    hospitalAffiliations: ["Sakra World Hospital"],
    verifiedCommunityConsultations: 82,
    openNow: true,
    emergencyServicesAvailable: true,
    homeVisitAvailable: true,
    clinicHours: [
      { day: "Mon - Sun", morning: "08:30 AM - 12:30 PM", evening: "04:00 PM - 09:00 PM" }
    ],
    appointmentSlots: [
      { id: "s-14", time: "04:00 PM", period: "EVENING", available: true, mode: "IN_PERSON" },
      { id: "s-15", time: "05:00 PM", period: "EVENING", available: true, mode: "IN_PERSON" },
      { id: "s-16", time: "07:30 PM", period: "EVENING", available: true, mode: "VIDEO" }
    ],
    reviews: [
      {
        communication: 5,
        waitingTime: 5,
        professionalism: 5,
        clinicExperience: 5,
        wouldRecommend: true,
        comment: "The go-to family doctor for our entire society. Patient, warm, and highly experienced.",
        authorName: "Tower D Resident",
        date: "2026-10-06"
      }
    ]
  },

  // ── CLINICS ──
  {
    id: "clinic-1",
    name: "Mana Resident Wellness & Day Care Center",
    specialty: "Multi-Specialty Primary Healthcare Clinic",
    category: "CLINIC",
    qualifications: ["NABH Accredited Primary Care Center", "RWA Certified"],
    experienceYears: 6,
    rating: 4.88,
    reviewCount: 110,
    consultationFee: 350,
    consultationModes: ["IN_PERSON"],
    nextAvailableSlot: "Walk-ins Welcome Today",
    verifiedBadge: true,
    registrationNumber: "KPME-2019-8420",
    medicalCouncil: "Karnataka Private Medical Establishments Authority",
    languages: ["English", "Kannada", "Hindi", "Telugu", "Tamil"],
    clinicName: "Mana Wellness Hub",
    clinicAddress: "Clubhouse Annex Level 1, Mana Residency",
    distanceKm: 0.0,
    phone: "+91-98440-01122",
    hospitalAffiliations: ["Manipal Hospitals", "Apollo Health City"],
    verifiedCommunityConsultations: 160,
    openNow: true,
    emergencyServicesAvailable: true,
    homeVisitAvailable: true,
    communityOffer: {
      title: "Subsidized Resident Health Consultations",
      badge: "Community Facility",
      discountPercent: 30,
      description: "Flat subsidized fee for all registered Mana apartment residents and domestic staff.",
      validUntil: "2027-01-01"
    },
    clinicHours: [
      { day: "Mon - Sat", morning: "08:00 AM - 02:00 PM", evening: "04:00 PM - 09:30 PM" },
      { day: "Sunday", morning: "09:00 AM - 01:00 PM" }
    ],
    appointmentSlots: [
      { id: "s-17", time: "09:00 AM", period: "MORNING", available: true, mode: "IN_PERSON" },
      { id: "s-18", time: "11:00 AM", period: "MORNING", available: true, mode: "IN_PERSON" },
      { id: "s-19", time: "05:00 PM", period: "EVENING", available: true, mode: "IN_PERSON" }
    ],
    reviews: []
  },
  {
    id: "clinic-2",
    name: "Cloudnine Neighborhood Family Clinic",
    specialty: "Maternity, Pediatric & Women's Health Clinic",
    category: "CLINIC",
    qualifications: ["NABH Accredited Clinic Chain"],
    experienceYears: 14,
    rating: 4.75,
    reviewCount: 88,
    consultationFee: 750,
    consultationModes: ["IN_PERSON", "VIDEO"],
    nextAvailableSlot: "Today, 3:30 PM",
    verifiedBadge: true,
    registrationNumber: "KPME-2016-5120",
    medicalCouncil: "KPME Karnataka",
    languages: ["English", "Hindi", "Kannada"],
    clinicName: "Cloudnine Clinic Sarjapur",
    clinicAddress: "Beside Wipro SEZ, Sarjapur Road (1.1 km)",
    distanceKm: 1.1,
    phone: "080-6799-9999",
    hospitalAffiliations: ["Cloudnine Hospital Bellandur"],
    verifiedCommunityConsultations: 39,
    openNow: true,
    emergencyServicesAvailable: false,
    homeVisitAvailable: false,
    clinicHours: [
      { day: "Mon - Sat", morning: "09:00 AM - 08:00 PM" },
      { day: "Sunday", morning: "10:00 AM - 02:00 PM" }
    ],
    appointmentSlots: [
      { id: "s-20", time: "03:30 PM", period: "AFTERNOON", available: true, mode: "IN_PERSON" },
      { id: "s-21", time: "06:00 PM", period: "EVENING", available: true, mode: "VIDEO" }
    ],
    reviews: []
  },

  // ── DENTISTS ──
  {
    id: "dentist-1",
    name: "Dr. Pooja Hegde (SmileCraft Dental)",
    specialty: "Dentist & Orthodontist",
    category: "DENTIST",
    qualifications: ["BDS", "MDS (Orthodontics & Dentofacial Orthopedics)"],
    experienceYears: 13,
    rating: 4.92,
    reviewCount: 76,
    consultationFee: 400,
    consultationModes: ["IN_PERSON"],
    nextAvailableSlot: "Today, 5:30 PM",
    verifiedBadge: true,
    registrationNumber: "DCI-18492-A",
    medicalCouncil: "Dental Council of India / Karnataka State Dental Council",
    languages: ["English", "Hindi", "Kannada", "Konkani"],
    clinicName: "SmileCraft Advanced Dental & Implant Center",
    clinicAddress: "1st Floor, Above Star Market, Gate 1 Crossing (0.5 km)",
    distanceKm: 0.5,
    phone: "+91-98809-55667",
    hospitalAffiliations: ["Vydehi Institute of Dental Sciences"],
    verifiedCommunityConsultations: 43,
    openNow: true,
    emergencyServicesAvailable: true,
    homeVisitAvailable: false,
    communityOffer: {
      title: "Free Dental Checkup & Digital X-Ray",
      badge: "Mana Neighbor Perk",
      discountPercent: 100,
      description: "First comprehensive checkup and IOPA X-ray completely free for Mana residents.",
      validUntil: "2026-12-31"
    },
    clinicHours: [
      { day: "Mon - Sat", morning: "10:00 AM - 01:30 PM", evening: "04:30 PM - 09:00 PM" },
      { day: "Sunday", morning: "10:30 AM - 01:30 PM" }
    ],
    appointmentSlots: [
      { id: "s-22", time: "05:30 PM", period: "EVENING", available: true, mode: "IN_PERSON" },
      { id: "s-23", time: "06:45 PM", period: "EVENING", available: true, mode: "IN_PERSON" },
      { id: "s-24", time: "08:00 PM", period: "EVENING", available: true, mode: "IN_PERSON" }
    ],
    reviews: [
      {
        communication: 5,
        waitingTime: 5,
        professionalism: 5,
        clinicExperience: 5,
        wouldRecommend: true,
        comment: "Painless root canal treatment. Dr. Pooja is exceptionally skilled and transparent about costs.",
        authorName: "Tower B Resident",
        date: "2026-09-15"
      }
    ]
  },
  {
    id: "dentist-2",
    name: "Dr. Rahul Roy (32 Pearls Dental Care)",
    specialty: "Pediatric & Cosmetic Dentist",
    category: "DENTIST",
    qualifications: ["BDS", "FAGE (Manipal)", "Certified Invisalign Provider"],
    experienceYears: 10,
    rating: 4.78,
    reviewCount: 38,
    consultationFee: 500,
    consultationModes: ["IN_PERSON"],
    nextAvailableSlot: "Tomorrow, 11:00 AM",
    verifiedBadge: true,
    registrationNumber: "DCI-20412-B",
    medicalCouncil: "Dental Council of India",
    languages: ["English", "Bengali", "Hindi"],
    clinicName: "32 Pearls Family Dental Studio",
    clinicAddress: "Kaikondrahalli Main Road (1.4 km)",
    distanceKm: 1.4,
    phone: "+91-97312-44556",
    hospitalAffiliations: ["Clove Dental Associate"],
    verifiedCommunityConsultations: 18,
    openNow: true,
    emergencyServicesAvailable: false,
    homeVisitAvailable: false,
    clinicHours: [
      { day: "Mon - Sat", morning: "10:00 AM - 02:00 PM", evening: "05:00 PM - 08:30 PM" },
      { day: "Sunday", isClosed: true }
    ],
    appointmentSlots: [
      { id: "s-25", time: "11:00 AM", period: "MORNING", available: true, mode: "IN_PERSON" },
      { id: "s-26", time: "05:30 PM", period: "EVENING", available: true, mode: "IN_PERSON" }
    ],
    reviews: []
  },

  // ── DIAGNOSTIC CENTERS ──
  {
    id: "diag-1",
    name: "Anand Diagnostic Laboratory & Scan Center",
    specialty: "Pathology, Biochemistry & Radiology Lab",
    category: "DIAGNOSTIC_CENTER",
    qualifications: ["NABL Accredited", "ICMR Approved", "ISO 15189 Certified"],
    experienceYears: 25,
    rating: 4.86,
    reviewCount: 135,
    consultationFee: 0,
    consultationModes: ["IN_PERSON"],
    nextAvailableSlot: "Home Collection Available within 45 mins",
    verifiedBadge: true,
    registrationNumber: "NABL-MC-2011",
    medicalCouncil: "Quality Council of India / NABL",
    languages: ["English", "Kannada", "Hindi", "Telugu"],
    clinicName: "Anand Diagnostic Lab - Sarjapur Hub",
    clinicAddress: "Tower Plaza, Gate 1 (0.4 km)",
    distanceKm: 0.4,
    phone: "080-4567-8900",
    hospitalAffiliations: ["Neuberg Anand Reference Lab"],
    verifiedCommunityConsultations: 92,
    openNow: true,
    emergencyServicesAvailable: true,
    homeVisitAvailable: true,
    communityOffer: {
      title: "20% Discount + Free Home Collection",
      badge: "Partner Diagnostic Lab",
      discountPercent: 20,
      promoCode: "MANALAB20",
      description: "20% off all blood tests & scans. Zero home sample collection fee inside Mana Community.",
      validUntil: "2026-12-31"
    },
    clinicHours: [
      { day: "Mon - Sat", morning: "06:30 AM - 08:30 PM" },
      { day: "Sunday", morning: "07:00 AM - 02:00 PM" }
    ],
    appointmentSlots: [
      { id: "s-27", time: "07:00 AM", period: "MORNING", available: true, mode: "IN_PERSON" },
      { id: "s-28", time: "08:30 AM", period: "MORNING", available: true, mode: "IN_PERSON" },
      { id: "s-29", time: "11:00 AM", period: "MORNING", available: true, mode: "IN_PERSON" }
    ],
    reviews: [
      {
        communication: 5,
        waitingTime: 5,
        professionalism: 5,
        clinicExperience: 5,
        wouldRecommend: true,
        comment: "Phlebotomist arrived right on time at 7 AM. Painless sample collection for our elderly parents.",
        authorName: "Tower A Resident",
        date: "2026-10-04"
      }
    ]
  },
  {
    id: "diag-2",
    name: "Metropolis Healthcare & Ultrasound Center",
    specialty: "Advanced Molecular Diagnostics & Imaging",
    category: "DIAGNOSTIC_CENTER",
    qualifications: ["CAP & NABL Accredited Center"],
    experienceYears: 30,
    rating: 4.79,
    reviewCount: 82,
    consultationFee: 0,
    consultationModes: ["IN_PERSON"],
    nextAvailableSlot: "Open Today for Tests",
    verifiedBadge: true,
    registrationNumber: "CAP-7218401",
    medicalCouncil: "College of American Pathologists & NABL",
    languages: ["English", "Hindi", "Kannada"],
    clinicName: "Metropolis Healthcare Sarjapur",
    clinicAddress: "Opposite Wipro Gate 5 (1.6 km)",
    distanceKm: 1.6,
    phone: "080-6811-2233",
    hospitalAffiliations: ["Metropolis Central Lab Mumbai"],
    verifiedCommunityConsultations: 24,
    openNow: true,
    emergencyServicesAvailable: false,
    homeVisitAvailable: true,
    clinicHours: [
      { day: "Mon - Sat", morning: "07:00 AM - 08:00 PM" },
      { day: "Sunday", morning: "07:30 AM - 01:00 PM" }
    ],
    appointmentSlots: [
      { id: "s-30", time: "08:00 AM", period: "MORNING", available: true, mode: "IN_PERSON" },
      { id: "s-31", time: "10:30 AM", period: "MORNING", available: true, mode: "IN_PERSON" }
    ],
    reviews: []
  },

  // ── PHARMACIES ──
  {
    id: "pharm-1",
    name: "Apollo Pharmacy 24x7 Express Mana",
    specialty: "24-Hour Pharmacy & Urgent Medicine Supply",
    category: "PHARMACY",
    qualifications: ["Licensed Retail Pharmacy", "State Drug Control Accredited"],
    experienceYears: 20,
    rating: 4.88,
    reviewCount: 140,
    consultationFee: 0,
    consultationModes: ["IN_PERSON"],
    nextAvailableSlot: "Open 24 Hours • 15 Min Tower Delivery",
    verifiedBadge: true,
    registrationNumber: "DL-KA-B-2018-9102",
    medicalCouncil: "Karnataka State Pharmacy Council (KSPC)",
    languages: ["English", "Kannada", "Hindi", "Tamil", "Telugu"],
    clinicName: "Apollo Pharmacy Mana Store",
    clinicAddress: "Shop 2, Mana Commercial Annex, Main Gate",
    distanceKm: 0.1,
    phone: "1860-500-0101 / +91-98450-22119",
    hospitalAffiliations: ["Apollo Hospitals Network"],
    verifiedCommunityConsultations: 210,
    openNow: true,
    emergencyServicesAvailable: true,
    homeVisitAvailable: true,
    communityOffer: {
      title: "Flat 15% Off Prescribed Medicines + Free Delivery",
      badge: "Resident RWA Partner",
      discountPercent: 15,
      promoCode: "MANARX15",
      description: "Show Mana resident ID card or order via app for flat 15% discount on all branded medicines.",
      validUntil: "2027-03-31"
    },
    clinicHours: [
      { day: "Monday - Sunday", is24x7: true }
    ],
    appointmentSlots: [],
    reviews: [
      {
        communication: 5,
        waitingTime: 5,
        professionalism: 5,
        clinicExperience: 5,
        wouldRecommend: true,
        comment: "Delivered emergency pediatric fever drops to Tower C at 2:30 AM in less than 15 minutes. Invaluable!",
        authorName: "Tower C Resident",
        date: "2026-09-22"
      }
    ]
  },
  {
    id: "pharm-2",
    name: "MedPlus Community Pharmacy & Surgical Hub",
    specialty: "Generics, Chronic Medicine & Surgical Care",
    category: "PHARMACY",
    qualifications: ["Licensed Retail Pharmacy"],
    experienceYears: 16,
    rating: 4.74,
    reviewCount: 65,
    consultationFee: 0,
    consultationModes: ["IN_PERSON"],
    nextAvailableSlot: "Open Today 07:00 AM - 11:30 PM",
    verifiedBadge: true,
    registrationNumber: "DL-KA-B-2015-4421",
    medicalCouncil: "Karnataka State Pharmacy Council",
    languages: ["English", "Hindi", "Kannada"],
    clinicName: "MedPlus Gate 2 Corner",
    clinicAddress: "Opposite Mana Gate 2 Entrance (0.2 km)",
    distanceKm: 0.2,
    phone: "080-6122-3344",
    hospitalAffiliations: [],
    verifiedCommunityConsultations: 78,
    openNow: true,
    emergencyServicesAvailable: false,
    homeVisitAvailable: true,
    communityOffer: {
      title: "Up to 20% Savings on Monthly Chronic Medicines",
      badge: "Mana Senior Saver",
      discountPercent: 20,
      description: "Special medicine refill packages for BP, Diabetes, and Heart prescriptions.",
      validUntil: "2026-12-31"
    },
    clinicHours: [
      { day: "Monday - Sunday", morning: "07:00 AM - 11:30 PM" }
    ],
    appointmentSlots: [],
    reviews: []
  },

  // ── PHYSIOTHERAPISTS ──
  {
    id: "physio-1",
    name: "Dr. Varun Nair (ActiveLife Physio)",
    specialty: "Sports Physiotherapist & Post-Surgery Rehab",
    category: "PHYSIOTHERAPIST",
    qualifications: ["BPT", "MPT (Sports & Musculoskeletal Rehab)", "MIAP"],
    experienceYears: 12,
    rating: 4.9,
    reviewCount: 47,
    consultationFee: 600,
    consultationModes: ["IN_PERSON", "VIDEO"],
    nextAvailableSlot: "Today, 4:30 PM",
    verifiedBadge: true,
    registrationNumber: "MIAP-28491",
    medicalCouncil: "Indian Association of Physiotherapists (IAP)",
    languages: ["English", "Malayalam", "Hindi", "Kannada"],
    clinicName: "ActiveLife Sports & Spine Rehab Center",
    clinicAddress: "Clubhouse Sports Pavilion, Mana Residency",
    distanceKm: 0.1,
    phone: "+91-98441-77889",
    hospitalAffiliations: ["Karnataka State Cricket Academy Consultant"],
    verifiedCommunityConsultations: 34,
    openNow: true,
    emergencyServicesAvailable: false,
    homeVisitAvailable: true,
    communityOffer: {
      title: "Free Postural Assessment for Remote Workers",
      badge: "Clubhouse Partner",
      discountPercent: 15,
      description: "Ergonomics and neck-spine alignment screening for tech and WFH residents.",
      validUntil: "2026-11-20"
    },
    clinicHours: [
      { day: "Mon - Sat", morning: "08:00 AM - 01:00 PM", evening: "04:30 PM - 08:30 PM" },
      { day: "Sunday", morning: "09:00 AM - 12:00 PM" }
    ],
    appointmentSlots: [
      { id: "s-32", time: "09:00 AM", period: "MORNING", available: true, mode: "IN_PERSON" },
      { id: "s-33", time: "04:30 PM", period: "EVENING", available: true, mode: "IN_PERSON" },
      { id: "s-34", time: "06:00 PM", period: "EVENING", available: true, mode: "VIDEO" }
    ],
    reviews: [
      {
        communication: 5,
        waitingTime: 5,
        professionalism: 5,
        clinicExperience: 5,
        wouldRecommend: true,
        comment: "Helped me recover from severe lumbar disc strain without surgery. Exceptional exercises guidance.",
        authorName: "Tower D Resident",
        date: "2026-09-19"
      }
    ]
  },
  {
    id: "physio-2",
    name: "Dr. Kavitha Rao (Mobility Plus)",
    specialty: "Geriatric & Neuro-Physiotherapy Specialist",
    category: "PHYSIOTHERAPIST",
    qualifications: ["BPT", "Certified Stroke Rehab Practitioner", "MIAP"],
    experienceYears: 16,
    rating: 4.86,
    reviewCount: 31,
    consultationFee: 700,
    consultationModes: ["IN_PERSON"],
    nextAvailableSlot: "Tomorrow, 10:00 AM",
    verifiedBadge: true,
    registrationNumber: "MIAP-31042",
    medicalCouncil: "Indian Association of Physiotherapists",
    languages: ["English", "Kannada", "Telugu", "Hindi"],
    clinicName: "Mobility Plus Elder Care & Rehab",
    clinicAddress: "Sarjapur Road, Near Bellandur Gate (0.8 km)",
    distanceKm: 0.8,
    phone: "+91-97400-33221",
    hospitalAffiliations: ["St. John's Medical College Alumnus"],
    verifiedCommunityConsultations: 22,
    openNow: true,
    emergencyServicesAvailable: false,
    homeVisitAvailable: true,
    clinicHours: [
      { day: "Mon - Fri", morning: "09:00 AM - 01:00 PM", evening: "03:30 PM - 07:00 PM" },
      { day: "Saturday", morning: "09:30 AM - 01:30 PM" },
      { day: "Sunday", isClosed: true }
    ],
    appointmentSlots: [
      { id: "s-35", time: "10:00 AM", period: "MORNING", available: true, mode: "IN_PERSON" },
      { id: "s-36", time: "04:00 PM", period: "EVENING", available: true, mode: "IN_PERSON" }
    ],
    reviews: []
  },
  {
    id: "physio-3",
    name: "Dr. Ananya Sen (ProMove Rehab)",
    specialty: "Orthopedic & Post-Operative Rehabilitation",
    category: "PHYSIOTHERAPIST",
    qualifications: ["BPT", "MPT (Orthopedics & Joint Mobilization)", "Dry Needling Certified"],
    experienceYears: 10,
    rating: 4.92,
    reviewCount: 39,
    consultationFee: 650,
    consultationModes: ["IN_PERSON", "VIDEO"],
    nextAvailableSlot: "Today, 5:30 PM",
    verifiedBadge: true,
    registrationNumber: "MIAP-34190",
    medicalCouncil: "Indian Association of Physiotherapists (IAP)",
    languages: ["English", "Hindi", "Bengali", "Kannada"],
    clinicName: "ProMove Ortho & Spine Care",
    clinicAddress: "Mana Wellness Hub & Doorstep Home Visits",
    distanceKm: 0.3,
    phone: "+91-98860-44552",
    hospitalAffiliations: ["Manipal Hospital Rehab Panel", "Apollo Spectra"],
    verifiedCommunityConsultations: 28,
    openNow: true,
    emergencyServicesAvailable: false,
    homeVisitAvailable: true,
    communityOffer: {
      title: "15% Off 5-Session Rehab Package",
      badge: "Mana Special",
      discountPercent: 15,
      description: "Post-surgery joint mobilization and dry needling therapy with free ergonomic home assessment.",
      validUntil: "2026-12-15"
    },
    clinicHours: [
      { day: "Mon - Sat", morning: "08:30 AM - 01:00 PM", evening: "04:00 PM - 08:00 PM" },
      { day: "Sunday", morning: "10:00 AM - 01:00 PM" }
    ],
    appointmentSlots: [
      { id: "s-37", time: "09:30 AM", period: "MORNING", available: true, mode: "IN_PERSON" },
      { id: "s-38", time: "05:30 PM", period: "EVENING", available: true, mode: "IN_PERSON" }
    ],
    reviews: []
  },

  // ── HOME-CARE PROVIDERS ──
  {
    id: "home-1",
    name: "Portea Medical Certified Homecare",
    specialty: "ICU Nursing, Post-Surgery Dressings & Elder Attendants",
    category: "HOME_CARE",
    qualifications: ["ISO Certified Home Healthcare", "Police Verified Staff"],
    experienceYears: 11,
    rating: 4.82,
    reviewCount: 64,
    consultationFee: 500,
    consultationModes: ["IN_PERSON"],
    nextAvailableSlot: "Attendants Available on 2-Hour Notice",
    verifiedBadge: true,
    registrationNumber: "QAI-HHC-2017-091",
    medicalCouncil: "Quality Access India / Home Healthcare Council",
    languages: ["English", "Hindi", "Kannada", "Tamil", "Telugu"],
    clinicName: "Portea Home Health Unit Sarjapur",
    clinicAddress: "Serving Mana Community On-Campus (0.2 km)",
    distanceKm: 0.2,
    phone: "1800-121-2323 / +91-99009-88112",
    hospitalAffiliations: ["Partnered with Manipal & Sakra Hospitals"],
    verifiedCommunityConsultations: 53,
    openNow: true,
    emergencyServicesAvailable: true,
    homeVisitAvailable: true,
    communityOffer: {
      title: "10% Discount on 12-Hour & 24-Hour Nursing Shifts",
      badge: "Mana Society Care Agreement",
      discountPercent: 10,
      description: "Dedicated nurse supervisor assigned for all Mana resident families.",
      validUntil: "2026-12-31"
    },
    clinicHours: [
      { day: "Monday - Sunday", is24x7: true }
    ],
    appointmentSlots: [
      { id: "s-37", time: "09:00 AM", period: "MORNING", available: true, mode: "IN_PERSON" },
      { id: "s-38", time: "02:00 PM", period: "AFTERNOON", available: true, mode: "IN_PERSON" },
      { id: "s-39", time: "06:00 PM", period: "EVENING", available: true, mode: "IN_PERSON" }
    ],
    reviews: [
      {
        communication: 5,
        waitingTime: 5,
        professionalism: 5,
        clinicExperience: 5,
        wouldRecommend: true,
        comment: "Nurse Sunita took outstanding care of my mother post hip-replacement surgery. Clean, compassionate, and punctual.",
        authorName: "Tower A Resident",
        date: "2026-09-30"
      }
    ]
  },
  {
    id: "home-2",
    name: "Care24 Geriatric & Palliative Care",
    specialty: "Elderly Assistance, Mobility Support & Bedside Nursing",
    category: "HOME_CARE",
    qualifications: ["Trained Caregiver Network", "Medical Background Verified"],
    experienceYears: 9,
    rating: 4.76,
    reviewCount: 41,
    consultationFee: 450,
    consultationModes: ["IN_PERSON"],
    nextAvailableSlot: "Available Today for Assessment",
    verifiedBadge: true,
    registrationNumber: "KHC-2018-319",
    medicalCouncil: "Healthcare Sector Skill Council",
    languages: ["English", "Hindi", "Kannada"],
    clinicName: "Care24 Sarjapur Care Cell",
    clinicAddress: "Kaikondrahalli Main Road (1.2 km)",
    distanceKm: 1.2,
    phone: "080-6922-4455",
    hospitalAffiliations: [],
    verifiedCommunityConsultations: 26,
    openNow: true,
    emergencyServicesAvailable: false,
    homeVisitAvailable: true,
    clinicHours: [
      { day: "Monday - Sunday", is24x7: true }
    ],
    appointmentSlots: [
      { id: "s-40", time: "10:00 AM", period: "MORNING", available: true, mode: "IN_PERSON" },
      { id: "s-41", time: "03:30 PM", period: "AFTERNOON", available: true, mode: "IN_PERSON" }
    ],
    reviews: []
  },

  // ── GYM TRAINERS & FITNESS COACHES ──
  {
    id: "trainer-1",
    name: "Coach Rajesh Sharma",
    specialty: "Strength & Hypertrophy Coach",
    category: "FITNESS_TRAINER",
    qualifications: ["ACE Certified Personal Trainer", "CSCS (Strength & Conditioning)", "CPR/AED Certified"],
    experienceYears: 10,
    rating: 4.95,
    reviewCount: 52,
    consultationFee: 500,
    consultationModes: ["IN_PERSON"],
    nextAvailableSlot: "Today, 6:30 AM",
    verifiedBadge: true,
    registrationNumber: "ACE-CPT-894102",
    medicalCouncil: "American Council on Exercise (ACE)",
    languages: ["English", "Hindi", "Kannada"],
    clinicName: "Mana Clubhouse Gymnasium",
    clinicAddress: "Clubhouse Level 1 (Tower A Ground Floor)",
    distanceKm: 0.1,
    phone: "+91-98801-77231",
    email: "rajesh.fit@managym.in",
    hospitalAffiliations: ["Mana Sports & Fitness Committee"],
    verifiedCommunityConsultations: 48,
    openNow: true,
    emergencyServicesAvailable: false,
    homeVisitAvailable: true,
    communityOffer: {
      title: "Free InBody Assessment & 1st PT Trial",
      badge: "Mana Fitness Partner",
      discountPercent: 20,
      promoCode: "MANAFIT20",
      description: "Complimentary body composition analysis and 1-on-1 form assessment for all Mana residents.",
      validUntil: "2026-12-31"
    },
    clinicHours: [
      { day: "Mon - Sat", morning: "06:00 AM - 11:30 AM", evening: "05:00 PM - 09:30 PM" },
      { day: "Sunday", morning: "07:00 AM - 12:00 PM" }
    ],
    appointmentSlots: [
      { id: "s-tr1", time: "06:30 AM", period: "MORNING", available: true, mode: "IN_PERSON" },
      { id: "s-tr2", time: "08:00 AM", period: "MORNING", available: true, mode: "IN_PERSON" },
      { id: "s-tr3", time: "06:00 PM", period: "EVENING", available: true, mode: "IN_PERSON" }
    ],
    reviews: []
  },
  {
    id: "trainer-2",
    name: "Coach Sneha Kapoor",
    specialty: "Functional HIIT & Postural Specialist",
    category: "FITNESS_TRAINER",
    qualifications: ["ACSM Certified Personal Trainer", "Pre & Post-Natal Fitness Certified", "TRX Master Instructor"],
    experienceYears: 7,
    rating: 4.91,
    reviewCount: 38,
    consultationFee: 450,
    consultationModes: ["IN_PERSON"],
    nextAvailableSlot: "Tomorrow, 7:00 AM",
    verifiedBadge: true,
    registrationNumber: "ACSM-CPT-44120",
    medicalCouncil: "American College of Sports Medicine (ACSM)",
    languages: ["English", "Hindi"],
    clinicName: "Mana Clubhouse Gym & Doorstep Training",
    clinicAddress: "Clubhouse Gymnasium & Apartment Home Training",
    distanceKm: 0.1,
    phone: "+91-99450-88321",
    email: "sneha.coach@managym.in",
    hospitalAffiliations: ["Mana Women Wellness Circle"],
    verifiedCommunityConsultations: 35,
    openNow: true,
    emergencyServicesAvailable: false,
    homeVisitAvailable: true,
    communityOffer: {
      title: "15% Off 10-Session Women's Core Pass",
      badge: "Resident Exclusive",
      discountPercent: 15,
      description: "Customized pelvic floor and core strengthening program for postpartum and desk-workers.",
      validUntil: "2026-12-31"
    },
    clinicHours: [
      { day: "Mon - Sat", morning: "07:00 AM - 11:00 AM", evening: "04:30 PM - 08:30 PM" },
      { day: "Sunday", morning: "08:00 AM - 11:30 AM" }
    ],
    appointmentSlots: [
      { id: "s-tr5", time: "07:00 AM", period: "MORNING", available: true, mode: "IN_PERSON" },
      { id: "s-tr6", time: "09:30 AM", period: "MORNING", available: true, mode: "IN_PERSON" }
    ],
    reviews: []
  },
  {
    id: "trainer-3",
    name: "Coach Marcus D'Souza",
    specialty: "Athletic Conditioning & Senior Mobility",
    category: "FITNESS_TRAINER",
    qualifications: ["K11 Master Trainer Diploma", "Calisthenics Level 2", "Functional Aging Specialist"],
    experienceYears: 12,
    rating: 4.88,
    reviewCount: 44,
    consultationFee: 550,
    consultationModes: ["IN_PERSON"],
    nextAvailableSlot: "Today, 5:00 PM",
    verifiedBadge: true,
    registrationNumber: "K11-MT-10928",
    medicalCouncil: "K11 School of Fitness Sciences",
    languages: ["English", "Hindi", "Konkani", "Kannada"],
    clinicName: "Mana Clubhouse Gym & Sports Turf",
    clinicAddress: "Clubhouse Gymnasium & Outdoor Turf",
    distanceKm: 0.1,
    phone: "+91-97411-33290",
    email: "marcus.pt@managym.in",
    hospitalAffiliations: ["Mana Sports Association"],
    verifiedCommunityConsultations: 41,
    openNow: true,
    emergencyServicesAvailable: false,
    homeVisitAvailable: true,
    communityOffer: {
      title: "Complimentary Senior Mobility Screening",
      badge: "Mana Elders Fit",
      discountPercent: 10,
      description: "Balance, gait, and joint agility screening for residents aged 55+.",
      validUntil: "2026-12-15"
    },
    clinicHours: [
      { day: "Mon - Sat", morning: "06:30 AM - 12:00 PM", evening: "04:00 PM - 09:00 PM" },
      { day: "Sunday", morning: "07:30 AM - 12:30 PM" }
    ],
    appointmentSlots: [
      { id: "s-tr8", time: "06:30 AM", period: "MORNING", available: true, mode: "IN_PERSON" },
      { id: "s-tr9", time: "11:00 AM", period: "MORNING", available: true, mode: "IN_PERSON" }
    ],
    reviews: []
  }
];

let familyMembersState: FamilyMemberDto[] = [
  {
    id: "fam-1",
    residentUserId: "user-1",
    fullName: "Sandeep Roy (Self)",
    relationship: "SELF",
    age: 34,
    gender: "MALE",
    bloodGroup: "O+",
    allergies: ["Penicillin"],
    consentToShareRecords: true
  },
  {
    id: "fam-2",
    residentUserId: "user-1",
    fullName: "Priyanka Roy",
    relationship: "SPOUSE",
    age: 32,
    gender: "FEMALE",
    bloodGroup: "B+",
    allergies: [],
    consentToShareRecords: true
  },
  {
    id: "fam-3",
    residentUserId: "user-1",
    fullName: "Aarav Roy",
    relationship: "CHILD",
    age: 5,
    gender: "MALE",
    bloodGroup: "O+",
    allergies: ["Peanuts (Mild)"],
    consentToShareRecords: true
  },
  {
    id: "fam-4",
    residentUserId: "user-1",
    fullName: "Bimal Roy",
    relationship: "PARENT",
    age: 68,
    gender: "MALE",
    bloodGroup: "O+",
    allergies: [],
    consentToShareRecords: true
  }
];

let appointmentsState: HealthAppointmentDto[] = [
  {
    id: "appt-101",
    doctorId: "doc-1",
    doctorName: "Dr. Rajesh Kumar",
    doctorSpecialty: "Cardiologist",
    patientId: "fam-4",
    patientName: "Bimal Roy (Father)",
    patientRelationship: "PARENT",
    bookedByUserId: "user-1",
    slotTime: "Today, 6:30 PM",
    mode: "IN_PERSON",
    status: "CONFIRMED",
    fee: 700,
    clinicAddress: "Mana Community Health & Wellness Center, Tower B Ground Floor",
    statusHistory: ["CONFIRMED on 06 Oct 2026", "Payment ₹700 Completed"],
    reviewSubmitted: false
  }
];

let auditLogsState: HealthAuditEntry[] = [
  {
    id: "aud-1",
    timestamp: "2026-10-06 18:00:00",
    accessorName: "Sandeep Roy (Resident Owner)",
    accessorRole: "RESIDENT",
    action: "VIEW_PRESCRIPTION",
    recordTitle: "Cardiology Prescription - Dr. Rajesh Kumar"
  }
];

let medicalRecordsState: MedicalRecordDto[] = [
  {
    id: "rec-1",
    patientId: "fam-4",
    patientName: "Bimal Roy",
    title: "Cardiology Consultation & ECG Report",
    type: "PRESCRIPTION",
    date: "2026-09-28",
    doctorOrLabName: "Dr. Rajesh Kumar",
    fileUrl: "https://vault.manacommunity.in/records/enc_rx_48291.pdf",
    notes: "Prescribed Telmisartan 40mg once daily; maintain BP log.",
    authorizedUserIds: ["user-1", "doc-1"]
  },
  {
    id: "rec-2",
    patientId: "fam-3",
    patientName: "Aarav Roy",
    title: "MMR & DTP Booster Vaccination Card",
    type: "VACCINATION",
    date: "2026-08-15",
    doctorOrLabName: "Dr. Ananya Sharma",
    fileUrl: "https://vault.manacommunity.in/records/enc_vax_59102.pdf",
    notes: "Next booster due at age 10.",
    authorizedUserIds: ["user-1", "doc-2"]
  }
];

export const SEED_LAB_PACKAGES: LabPackageDto[] = [
  {
    id: "pkg-1",
    name: "Full Body Checkup (Comprehensive)",
    price: 1999,
    originalPrice: 4500,
    testCount: 78,
    testsIncluded: ["Complete Hemogram (CBC)", "Lipid Profile Extended", "Liver Function (LFT)", "Kidney Function (KFT)", "HbA1c & Fasting Glucose", "Thyroid Profile (TSH)", "Vitamin D & B12"],
    homeCollectionAvailable: true,
    fastingRequired: true,
    reportTurnaroundHours: 24
  },
  {
    id: "pkg-2",
    name: "Senior Citizen Advanced Health Check",
    price: 2499,
    originalPrice: 5500,
    testCount: 85,
    testsIncluded: ["CBC", "Cardiac Risk Markers (hs-CRP)", "Renal & Electrolytes", "Arthritis (Uric Acid)", "HbA1c", "Urine Routine", "ECG at Home"],
    homeCollectionAvailable: true,
    fastingRequired: true,
    reportTurnaroundHours: 24
  },
  {
    id: "pkg-3",
    name: "Diabetes Care & Monitoring",
    price: 899,
    originalPrice: 1800,
    testCount: 22,
    testsIncluded: ["HbA1c", "Fasting & Post-Prandial Glucose", "Average Blood Glucose", "Microalbuminuria Urine"],
    homeCollectionAvailable: true,
    fastingRequired: true,
    reportTurnaroundHours: 12
  }
];

export const SEED_HOMECARE_PROVIDERS: HomecareProviderDto[] = [
  {
    id: "hc-1",
    name: "Sister Mary Varghese",
    role: "Nurse",
    experienceYears: 12,
    rating: 4.9,
    verifiedHealthcareBadge: true,
    licenseNumber: "INC-RN-88219",
    dailyRate: 1800,
    hourlyRate: 350,
    available: true,
    description: "Certified ICU and home recovery nurse. Expert in IV administration, wound dressing, and vitals monitoring."
  },
  {
    id: "hc-2",
    name: "Dr. Arvind Menon, PT",
    role: "Physiotherapist",
    experienceYears: 8,
    rating: 4.85,
    verifiedHealthcareBadge: true,
    licenseNumber: "IAP-L-4190",
    dailyRate: 1200,
    hourlyRate: 800,
    available: true,
    description: "Specialized in neuro-rehabilitation, stroke recovery, geriatric mobility, and post-knee replacement physical therapy."
  },
  {
    id: "hc-3",
    name: "Mana Care Elder Attendant Squad",
    role: "Elder Care",
    experienceYears: 10,
    rating: 4.75,
    verifiedHealthcareBadge: true,
    licenseNumber: "MCA-EC-004",
    dailyRate: 1400,
    hourlyRate: 200,
    available: true,
    description: "Trained and verified care attendants for assistance with daily living, mobility, medication reminders, and companionship."
  },
  {
    id: "hc-4",
    name: "Hospital Bed & 10L Oxygen Concentrator Rental",
    role: "Medical Equipment",
    experienceYears: 6,
    rating: 4.95,
    verifiedHealthcareBadge: true,
    licenseNumber: "MED-EQ-9921",
    dailyRate: 450,
    hourlyRate: 0,
    available: true,
    description: "Same-day doorstep delivery & setup of motorized ICU beds, oxygen concentrators, CPAP/BiPAP, and wheelchair rentals."
  }
];

export const SEED_EMERGENCY_CONTACTS: HealthEmergencyContactDto[] = [
  { id: "em-1", name: "Mana Community On-Call Ambulance", type: "AMBULANCE", phone: "+91-9876543210", distanceKm: 0.1, is24x7: true, address: "Gate 1 Security Room" },
  { id: "em-2", name: "Manipal Hospital Sarjapur (Emergency Trauma)", type: "HOSPITAL", phone: "080-22221111", distanceKm: 2.4, is24x7: true, address: "Sarjapur Main Road" },
  { id: "em-3", name: "Apollo 24x7 Pharmacy & First Aid", type: "PHARMACY", phone: "1860-500-0101", distanceKm: 0.8, is24x7: true, address: "Main Gate Commercial Plaza" },
  { id: "em-4", name: "Mana 24x7 Primary Health Clinic", type: "COMMUNITY_CLINIC", phone: "+91-9844001122", distanceKm: 0.0, is24x7: true, address: "Clubhouse Level 1" }
];

export const healthService = {
  async getDoctors(): Promise<DoctorDto[]> {
    try {
      const res = await api.get<DoctorDto[]>("/health/doctors");
      if (res.data && res.data.length > 0) return res.data;
    } catch {}
    return [...doctorsState];
  },

  async getDoctorById(id: string): Promise<DoctorDto | undefined> {
    const docs = await this.getDoctors();
    return docs.find(d => d.id === id);
  },

  async getFamilyMembers(): Promise<FamilyMemberDto[]> {
    try {
      const res = await api.get<FamilyMemberDto[]>("/health/family");
      if (res.data) return res.data;
    } catch {}
    return [...familyMembersState];
  },

  async addFamilyMember(member: Omit<FamilyMemberDto, "id" | "residentUserId">): Promise<FamilyMemberDto> {
    const newMember: FamilyMemberDto = {
      ...member,
      id: "fam-" + Date.now(),
      residentUserId: "user-1"
    };
    familyMembersState.push(newMember);
    return newMember;
  },

  async getAppointments(): Promise<HealthAppointmentDto[]> {
    try {
      const res = await api.get<HealthAppointmentDto[]>("/health/appointments");
      if (res.data) return res.data;
    } catch {}
    return [...appointmentsState];
  },

  async bookAppointment(data: {
    doctorId: string;
    patientId: string;
    slotTime: string;
    mode: ConsultationMode;
    syncToPersonalFinance?: boolean;
  }): Promise<HealthAppointmentDto> {
    const doc = doctorsState.find(d => d.id === data.doctorId);
    if (!doc) throw new Error("Doctor not found");
    const pat = familyMembersState.find(p => p.id === data.patientId);
    if (!pat) throw new Error("Patient not found");

    // Anti-double-booking check
    const existing = appointmentsState.find(a =>
      a.doctorId === data.doctorId &&
      a.slotTime === data.slotTime &&
      a.status !== "CANCELLED"
    );
    if (existing) {
      throw new Error("This time slot is already booked. Please choose another slot.");
    }

    const newAppt: HealthAppointmentDto = {
      id: "appt-" + Date.now(),
      doctorId: doc.id,
      doctorName: doc.name,
      doctorSpecialty: doc.specialty,
      patientId: pat.id,
      patientName: pat.fullName,
      patientRelationship: pat.relationship,
      bookedByUserId: "user-1",
      slotTime: data.slotTime,
      mode: data.mode,
      status: "CONFIRMED",
      fee: doc.consultationFee,
      clinicAddress: doc.clinicAddress,
      meetingLink: data.mode === "VIDEO" ? "https://meet.manacommunity.in/health/" + Date.now() : undefined,
      statusHistory: ["CONFIRMED on " + new Date().toLocaleDateString(), "Payment of ₹" + doc.consultationFee + " recorded"],
      reviewSubmitted: false
    };
    appointmentsState.unshift(newAppt);
    doc.verifiedCommunityConsultations++;

    // Smart Personal Finance integration
    if (data.syncToPersonalFinance !== false) {
      personalFinanceService.createTransaction({
        description: "Dr. Consultation - " + doc.name,
        type: "EXPENSE",
        amount: doc.consultationFee,
        categoryId: "cat-3",
        date: new Date().toISOString().split("T")[0],
        accountId: "acc-1",
        notes: "Mana Health appointment for " + pat.fullName
      }).catch(() => {});
    }

    return newAppt;
  },

  async cancelAppointment(apptId: string, reason?: string): Promise<HealthAppointmentDto> {
    const appt = appointmentsState.find(a => a.id === apptId);
    if (!appt) throw new Error("Appointment not found");
    appt.status = "CANCELLED";
    appt.statusHistory.push("CANCELLED: " + (reason || "Cancelled by patient") + " on " + new Date().toLocaleDateString());
    return appt;
  },

  async submitDoctorReview(apptId: string, doctorId: string, review: Omit<DoctorReview, "authorName" | "date">): Promise<void> {
    const appt = appointmentsState.find(a => a.id === apptId);
    if (!appt) throw new Error("Appointment not found");
    if (appt.reviewSubmitted) throw new Error("Review already submitted for this appointment");

    const doc = doctorsState.find(d => d.id === doctorId);
    if (doc) {
      const fullReview: DoctorReview = {
        ...review,
        authorName: "Verified Community Resident",
        date: new Date().toISOString().split("T")[0]
      };
      doc.reviews.unshift(fullReview);
      doc.reviewCount++;
      const totalScore = (review.communication + review.waitingTime + review.professionalism + review.clinicExperience) / 4;
      doc.rating = Number(((doc.rating * (doc.reviewCount - 1) + totalScore) / doc.reviewCount).toFixed(2));
    }
    appt.reviewSubmitted = true;
  },

  async getMedicalRecords(): Promise<MedicalRecordDto[]> {
    return [...medicalRecordsState];
  },

  async auditAccessRecord(recordId: string, action: string, accessorName?: string, accessorRole?: string): Promise<HealthAuditEntry> {
    // Resolve caller identity from the auth store when not explicitly provided.
    let resolvedName = accessorName;
    let resolvedRole = accessorRole ?? 'RESIDENT';
    if (!resolvedName) {
      try {
        const { useAuth } = await import('@/hooks/useAuth');
        const authState = useAuth.getState();
        const u = authState.user;
        resolvedName = u ? (u.name || u.fullName || u.email || 'Unknown User') : 'Unknown User';
        resolvedRole = authState.roles[0] ?? 'RESIDENT';
      } catch {
        resolvedName = 'Unknown User';
      }
    }
    const rec = medicalRecordsState.find(r => r.id === recordId);
    const entry: HealthAuditEntry = {
      id: "aud-" + Date.now(),
      timestamp: new Date().toISOString(),
      accessorName: resolvedName,
      accessorRole: resolvedRole,
      action,
      recordTitle: rec ? rec.title : "Medical Document"
    };
    auditLogsState.unshift(entry);
    return entry;
  },

  async getAuditLogs(): Promise<HealthAuditEntry[]> {
    return [...auditLogsState];
  },

  async getLabPackages(): Promise<LabPackageDto[]> {
    return [...SEED_LAB_PACKAGES];
  },

  async getHomecareProviders(): Promise<HomecareProviderDto[]> {
    return [...SEED_HOMECARE_PROVIDERS];
  },

  async getEmergencyContacts(): Promise<HealthEmergencyContactDto[]> {
    return [...SEED_EMERGENCY_CONTACTS];
  },

  async triageSymptom(query: string): Promise<AiTriageResponse> {
    const q = (query || "").toLowerCase();
    if (q.includes("chest pain") || q.includes("heart attack") || q.includes("severe breathless") || q.includes("unconscious")) {
      return {
        isEmergency: true,
        recommendedSpecialty: "Emergency Medicine / Cardiology",
        guidanceText: "WARNING: High-risk symptoms detected. Immediate emergency medical intervention or ambulance dispatch is recommended.",
        redFlags: ["Acute chest pain / pressure", "Severe respiratory distress", "Radiation to left arm or jaw"],
        suggestedQuestions: ["Call ambulance immediately via 🚨 Medical SOS", "Do not drive yourself"]
      };
    }
    if (q.includes("cough") || q.includes("cold") || q.includes("fever") || q.includes("throat")) {
      return {
        isEmergency: false,
        recommendedSpecialty: "General Physician / Pulmonologist",
        guidanceText: "Symptoms suggest an upper respiratory viral illness or acute bronchitis. A consultation with a General Physician is recommended.",
        redFlags: ["High fever > 102°F for > 3 days", "Shortness of breath on walking"],
        suggestedQuestions: ["How many days has the fever persisted?", "Is there sputum or throat irritation?", "Any history of asthma?"]
      };
    }
    if (q.includes("skin") || q.includes("rash") || q.includes("itching") || q.includes("acne")) {
      return {
        isEmergency: false,
        recommendedSpecialty: "Dermatologist",
        guidanceText: "Dermatological rash or allergic skin reaction detected. Schedule a video or clinic visit with a Dermatologist.",
        redFlags: ["Sudden spreading rash accompanied by facial swelling"],
        suggestedQuestions: ["When did the rash appear?", "Any new food, medication or topical product?"]
      };
    }
    if (q.includes("knee") || q.includes("joint") || q.includes("back pain") || q.includes("bone")) {
      return {
        isEmergency: false,
        recommendedSpecialty: "Orthopedic Surgeon / Physiotherapist",
        guidanceText: "Musculoskeletal discomfort reported. Consult an Orthopedic specialist or home physiotherapist.",
        redFlags: ["Inability to bear weight", "Sudden swelling after trauma"],
        suggestedQuestions: ["Is there joint stiffness in the morning?", "Did any specific movement trigger the pain?"]
      };
    }
    return {
      isEmergency: false,
      recommendedSpecialty: "General Physician",
      guidanceText: "Consult a General Physician for primary clinical examination and appropriate diagnostic test prescription.",
      redFlags: ["Unexplained sudden weight loss", "Severe unremitting pain"],
      suggestedQuestions: ["Tell your doctor about your daily symptoms and ongoing medications."]
    };
  },

  async getHealthCamps(): Promise<HealthCampDto[]> {
    return [...campsState];
  },

  async registerForCamp(campId: string, patientId: string, slotTime: string): Promise<HealthCampRegistrationDto> {
    const camp = campsState.find(c => c.id === campId);
    if (!camp) throw new Error("Camp not found");
    if (camp.availableSlots > 0) {
      camp.availableSlots -= 1;
    }
    return {
      id: "reg-" + Date.now(),
      campId,
      campTitle: camp.title,
      patientId,
      patientName: "Registered Family Member",
      slotTime,
      attendanceStatus: "REGISTERED"
    };
  },

  async getBenefitWallet(): Promise<HealthBenefitWalletDto> {
    return { ...SEED_BENEFIT_WALLET };
  },

  async getCareJourneys(): Promise<CareJourneyDto[]> {
    return [...SEED_CARE_JOURNEYS];
  }
};

export const SEED_CARE_JOURNEYS: CareJourneyDto[] = [
  {
    id: "journey-1",
    patientId: "fam-4",
    patientName: "M. K. Varma (Father)",
    patientRelationship: "PARENT",
    doctorId: "doc-1",
    doctorName: "Dr. Rajesh Kumar",
    doctorSpecialty: "Cardiologist",
    currentStage: "RESULTS_READY",
    appointmentId: "apt-1",
    appointmentTime: "2026-10-02, 05:30 PM",
    mode: "IN_PERSON",
    sharedReportIds: ["rec-1"],
    prescriptionId: "rx-9102",
    prescriptionDate: "2026-10-02",
    prescriptionSummary: "Ecosprin 75mg daily post dinner, Atorvastatin 20mg bedtime.",
    labPackageName: "Lipid Profile Extended & Serum Electrolytes",
    sampleCollected: true,
    resultsAvailable: true,
    resultReadyNotificationSent: true,
    resultDocumentId: "rec-1",
    clinicianRecommendedFollowUp: {
      isAppropriate: true,
      dueDate: "Tomorrow 5:30 PM",
      instructions: "Review post-statin lipid panel response and adjust dosage if target LDL < 70 mg/dL is attained.",
      status: "BOOKED"
    }
  },
  {
    id: "journey-2",
    patientId: "fam-3",
    patientName: "Aarav Varma",
    patientRelationship: "CHILD",
    doctorId: "doc-2",
    doctorName: "Dr. Ananya Sharma",
    doctorSpecialty: "Pediatrician",
    currentStage: "CONSULTATION_COMPLETED",
    appointmentId: "apt-2",
    appointmentTime: "2026-09-29, 04:00 PM",
    mode: "VIDEO",
    sharedReportIds: ["rec-2"],
    prescriptionId: "rx-8812",
    prescriptionDate: "2026-09-29",
    prescriptionSummary: "Saline nasal drops TID, Paracetamol 250mg syrup SOS for fever.",
    resultsAvailable: false,
    resultReadyNotificationSent: false,
    clinicianRecommendedFollowUp: {
      isAppropriate: true,
      dueDate: "2026-10-15",
      instructions: "Follow-up required only if nocturnal wheeze or high fever persists beyond day 5.",
      status: "PENDING"
    }
  }
];

export const SEED_HEALTH_CAMPS: HealthCampDto[] = [
  {
    id: "camp-1",
    title: "Senior Citizen Heart & Diabetes Checkup Drive",
    campCategory: "DIABETES_CARDIAC",
    partnerProviderName: "Manipal Hospital Cardiac Outreach",
    venue: "Clubhouse Multi-Purpose Hall A",
    date: "2026-10-18",
    startTime: "08:30 AM",
    endTime: "01:30 PM",
    availableSlots: 18,
    totalSlots: 60,
    isFree: true,
    feePerResident: 0,
    servicesIncluded: ["Fasting Blood Glucose", "HbA1c Spot Test", "ECG Onsite", "Vitals & BP", "Cardiologist 1-on-1 Consultation"],
    description: "Organized by Mana Community Health Committee & Manipal Hospital. Priority for residents aged 55+. Private digital reports delivered straight to your Health Vault.",
    aggregateStats: {
      totalRegistered: 42,
      totalAttended: 38,
      satisfactionRate: 98
    }
  },
  {
    id: "camp-2",
    title: "Community Flu & Pneumococcal Vaccination Camp",
    campCategory: "VACCINATION",
    partnerProviderName: "Apollo Clinics Sarjapur",
    venue: "Tower C Community Lounge",
    date: "2026-10-25",
    startTime: "10:00 AM",
    endTime: "04:00 PM",
    availableSlots: 32,
    totalSlots: 80,
    isFree: false,
    feePerResident: 850,
    servicesIncluded: ["Quadrivalent Flu Vaccine", "Post-Jab Observation", "Pediatric & Elder Dosages", "Digital Vaccine Certificate"],
    description: "Pre-winter influenza protection drive for kids, adults, and seniors. Subsidized community group discount negotiated by Mana RWA."
  },
  {
    id: "camp-3",
    title: "Kids Dental & Vision Screening Camp",
    campCategory: "DENTAL_EYE",
    partnerProviderName: "Little Stars & Clove Dental",
    venue: "Clubhouse Activity Room 2",
    date: "2026-11-01",
    startTime: "09:30 AM",
    endTime: "02:30 PM",
    availableSlots: 25,
    totalSlots: 50,
    isFree: true,
    feePerResident: 0,
    servicesIncluded: ["Pediatric Dental Checkup", "Visual Acuity & Refraction", "Fluoride Varnish Advice", "Personal Growth Chart Assessment"],
    description: "School-age vision screening and dental hygiene awareness for children aged 3 to 15."
  }
];

export const SEED_BENEFIT_WALLET: HealthBenefitWalletDto = {
  communityAllowance: 5000,
  usedAllowance: 1600,
  remainingAllowance: 3400,
  coveredServices: ["Community Camp Diagnostics", "Teleconsultations", "Annual Family Checkup Subsidy", "Clubhouse First Aid"],
  reimbursementActive: true,
  recentClaims: [
    { id: "clm-1", serviceName: "Dr. Ananya Sharma Video Consultation", amount: 600, status: "REIMBURSED", date: "2026-09-29" },
    { id: "clm-2", serviceName: "Flu Shot Camp Pre-Registration (Family of 2)", amount: 1000, status: "APPROVED", date: "2026-10-05" }
  ]
};

const campsState: HealthCampDto[] = [...SEED_HEALTH_CAMPS];