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
  ConsultationMode
} from "../types/health";
import { personalFinanceService } from "./personalFinanceService";

let doctorsState: DoctorDto[] = [
  {
    id: "doc-1",
    name: "Dr. Rajesh Kumar",
    specialty: "Cardiologist",
    qualifications: ["MBBS", "MD (Medicine)", "DM (Cardiology)"],
    experienceYears: 15,
    rating: 4.8,
    reviewCount: 42,
    consultationFee: 700,
    consultationModes: ["IN_PERSON", "VIDEO"],
    availableSlots: ["Today 6:30 PM", "Today 7:15 PM", "Tomorrow 10:00 AM", "Tomorrow 11:30 AM"],
    nextAvailableSlot: "Today, 6:30 PM",
    verifiedBadge: true,
    registrationNumber: "KMC-48291",
    medicalCouncil: "Karnataka Medical Council",
    languages: ["English", "Hindi", "Kannada"],
    clinicName: "Mana Community Health & Wellness Center",
    clinicAddress: "Tower B, Ground Floor, Mana Residency",
    hospitalAffiliations: ["Apollo Hospitals", "Manipal Heart Centre"],
    verifiedCommunityConsultations: 12,
    about: "Senior Interventional Cardiologist specializing in preventive cardiology, hypertension, and post-angioplasty care.",
    reviews: [
      {
        communication: 5,
        waitingTime: 4,
        professionalism: 5,
        clinicExperience: 5,
        wouldRecommend: true,
        comment: "Extremely attentive and explained ECG report with great clarity.",
        authorName: "Verified Community Resident",
        date: "2026-09-28"
      }
    ]
  },
  {
    id: "doc-2",
    name: "Dr. Ananya Sharma",
    specialty: "Pediatrician",
    qualifications: ["MBBS", "DCH", "DNB (Pediatrics)"],
    experienceYears: 11,
    rating: 4.9,
    reviewCount: 68,
    consultationFee: 600,
    consultationModes: ["IN_PERSON", "VIDEO", "PHONE"],
    availableSlots: ["Tomorrow 10:00 AM", "Tomorrow 11:00 AM", "Tomorrow 4:30 PM"],
    nextAvailableSlot: "Tomorrow, 10:00 AM",
    verifiedBadge: true,
    registrationNumber: "KMC-59102",
    medicalCouncil: "Karnataka Medical Council",
    languages: ["English", "Hindi"],
    clinicName: "Little Stars Child Clinic",
    clinicAddress: "Opp. Mana Community Gate 2",
    hospitalAffiliations: ["Cloudnine Hospitals"],
    verifiedCommunityConsultations: 24,
    about: "Dedicated pediatrician focused on neonatal care, childhood immunization, and pediatric nutrition.",
    reviews: []
  },
  {
    id: "doc-3",
    name: "Dr. Vikram Sethi",
    specialty: "Orthopedic Surgeon",
    qualifications: ["MBBS", "MS (Ortho)", "FACS"],
    experienceYears: 18,
    rating: 4.7,
    reviewCount: 35,
    consultationFee: 800,
    consultationModes: ["IN_PERSON"],
    availableSlots: ["Today 5:00 PM", "Tomorrow 12:00 PM"],
    nextAvailableSlot: "Today, 5:00 PM",
    verifiedBadge: true,
    registrationNumber: "MCI-31908",
    medicalCouncil: "Medical Council of India",
    languages: ["English", "Hindi", "Punjabi"],
    clinicName: "Sethi Bone & Joint Clinic",
    clinicAddress: "Sarjapur Main Road, 1.2 km away",
    hospitalAffiliations: ["Fortis Hospital"],
    verifiedCommunityConsultations: 9,
    about: "Expert in joint replacement, sports injuries, arthritis management, and spine health.",
    reviews: []
  },
  {
    id: "doc-4",
    name: "Dr. Meera Nambiar",
    specialty: "Dermatologist",
    qualifications: ["MBBS", "MD (Dermatology, Venereology & Leprosy)"],
    experienceYears: 9,
    rating: 4.85,
    reviewCount: 51,
    consultationFee: 650,
    consultationModes: ["IN_PERSON", "VIDEO"],
    availableSlots: ["Today 7:00 PM", "Tomorrow 3:00 PM"],
    nextAvailableSlot: "Today, 7:00 PM",
    verifiedBadge: true,
    registrationNumber: "TCMC-41092",
    medicalCouncil: "Travancore-Cochin Medical Council",
    languages: ["English", "Malayalam", "Hindi", "Tamil"],
    clinicName: "Glow Skin & Laser Clinic",
    clinicAddress: "Bellandur Outer Ring Road",
    hospitalAffiliations: ["Manipal Hospital"],
    verifiedCommunityConsultations: 16,
    about: "Specialist in clinical dermatology, allergy testing, pediatric skin conditions, and aesthetic care.",
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

  async auditAccessRecord(recordId: string, action: string): Promise<HealthAuditEntry> {
    const rec = medicalRecordsState.find(r => r.id === recordId);
    const entry: HealthAuditEntry = {
      id: "aud-" + Date.now(),
      timestamp: new Date().toISOString(),
      accessorName: "Sandeep Roy (Resident Owner)",
      accessorRole: "RESIDENT",
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
  }
};