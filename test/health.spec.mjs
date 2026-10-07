import { test, describe } from "node:test";
import assert from "node:assert/strict";

// Domain Logic & State Machine for Mana Health

class HealthBookingEngine {
  constructor() {
    this.bookedSlots = new Set();
    this.appointments = [];
  }

  bookSlot({ id, doctorId, patientId, patientName, slotTime, mode, fee }) {
    const key = `${doctorId}@${slotTime}`;
    if (this.bookedSlots.has(key)) {
      throw new Error(`Slot ${slotTime} is already booked for doctor ${doctorId}`);
    }
    this.bookedSlots.add(key);
    const appt = {
      id,
      doctorId,
      patientId,
      patientName,
      slotTime,
      mode,
      status: "CONFIRMED",
      fee,
      meetingLink: mode === "VIDEO" ? `https://meet.manacommunity.in/health/${id}` : null,
      statusHistory: [`CONFIRMED at ${new Date().toISOString()}`]
    };
    this.appointments.push(appt);
    return appt;
  }

  cancelSlot(id, reason) {
    const appt = this.appointments.find(a => a.id === id);
    if (!appt) throw new Error("Appointment not found");
    if (appt.status === "CANCELLED") throw new Error("Already cancelled");
    const key = `${appt.doctorId}@${appt.slotTime}`;
    this.bookedSlots.delete(key);
    appt.status = "CANCELLED";
    appt.statusHistory.push(`CANCELLED: ${reason}`);
    return appt;
  }
}

class DoctorVerificationEngine {
  constructor() {
    this.registry = new Map();
  }

  registerDoctor({ id, name, specialty, registrationNumber, medicalCouncil, experienceYears }) {
    if (!registrationNumber) throw new Error("Medical registration number is mandatory");
    const doc = {
      id,
      name,
      specialty,
      registrationNumber,
      medicalCouncil,
      experienceYears,
      status: "SUBMITTED",
      verifiedBadge: false,
      verifiedCommunityConsultations: 0,
      reviews: []
    };
    this.registry.set(id, doc);
    return doc;
  }

  verifyDoctor(id, approved) {
    const doc = this.registry.get(id);
    if (!doc) throw new Error("Doctor not found");
    doc.status = approved ? "VERIFIED" : "REJECTED";
    doc.verifiedBadge = approved;
    return doc;
  }

  addReview(doctorId, review) {
    const doc = this.registry.get(doctorId);
    if (!doc) throw new Error("Doctor not found");
    doc.reviews.push(review);
    doc.verifiedCommunityConsultations++;
    return doc;
  }
}

class HealthPrivacyAuditEngine {
  constructor() {
    this.authorizations = new Map();
    this.auditLogs = [];
  }

  grantAccess(patientId, doctorOrUserId) {
    if (!this.authorizations.has(patientId)) this.authorizations.set(patientId, new Set());
    this.authorizations.get(patientId).add(doctorOrUserId);
  }

  checkAndAuditAccess({ accessorId, accessorRole, patientId, recordId, action }) {
    const isOwner = accessorId === patientId;
    const auths = this.authorizations.get(patientId) || new Set();
    const allowed = isOwner || auths.has(accessorId);

    const entry = {
      auditId: "aud-" + Date.now() + Math.random(),
      accessorId,
      accessorRole,
      patientId,
      recordId,
      action,
      timestamp: new Date().toISOString(),
      authorized: allowed
    };
    this.auditLogs.push(entry);
    return allowed;
  }
}

function aiSymptomTriage(query) {
  const q = (query || "").toLowerCase();
  if (q.includes("chest pain") || q.includes("heart attack") || q.includes("breathless")) {
    return {
      isEmergency: true,
      recommendedSpecialty: "Emergency Medicine / Cardiology",
      guidance: "Immediate emergency response or ambulance dispatch required.",
      redFlags: ["Acute chest pain / pressure", "Radiation to arm or neck"]
    };
  }
  if (q.includes("cough") || q.includes("fever") || q.includes("cold")) {
    return {
      isEmergency: false,
      recommendedSpecialty: "General Physician / Pulmonologist",
      guidance: "Upper respiratory symptoms. Consult a General Physician.",
      redFlags: ["High fever > 102F"]
    };
  }
  return {
    isEmergency: false,
    recommendedSpecialty: "General Physician",
    guidance: "Consult a General Physician for clinical evaluation.",
    redFlags: []
  };
}

describe("Mana Health - Comprehensive Unit Tests", () => {
  test("1. Doctor Verification Lifecycle & Badge Rule", () => {
    const engine = new DoctorVerificationEngine();
    const doc = engine.registerDoctor({
      id: "doc-1",
      name: "Dr. Rajesh Kumar",
      specialty: "Cardiologist",
      registrationNumber: "KMC-48291",
      medicalCouncil: "Karnataka Medical Council",
      experienceYears: 15
    });

    assert.equal(doc.status, "SUBMITTED");
    assert.equal(doc.verifiedBadge, false);

    engine.verifyDoctor("doc-1", true);
    assert.equal(doc.status, "VERIFIED");
    assert.equal(doc.verifiedBadge, true);
  });

  test("2. Anti-Double-Booking Protection & Concurrency Locking", () => {
    const booking = new HealthBookingEngine();
    const appt = booking.bookSlot({
      id: "appt-101",
      doctorId: "doc-1",
      patientId: "pat-father",
      patientName: "Bimal Roy",
      slotTime: "Today 6:30 PM",
      mode: "VIDEO",
      fee: 700
    });

    assert.equal(appt.status, "CONFIRMED");
    assert.ok(appt.meetingLink.includes("https://meet.manacommunity.in"));

    // Attempt double booking same slot
    assert.throws(() => {
      booking.bookSlot({
        id: "appt-102",
        doctorId: "doc-1",
        patientId: "pat-self",
        patientName: "Sandeep Roy",
        slotTime: "Today 6:30 PM",
        mode: "IN_PERSON",
        fee: 700
      });
    }, /already booked/);
  });

  test("3. Slot Release on Cancellation", () => {
    const booking = new HealthBookingEngine();
    booking.bookSlot({
      id: "appt-201",
      doctorId: "doc-2",
      patientId: "pat-child",
      patientName: "Aarav Roy",
      slotTime: "Tomorrow 10:00 AM",
      mode: "IN_PERSON",
      fee: 600
    });

    booking.cancelSlot("appt-201", "Resident rescheduled");
    
    // Now re-booking the slot should succeed
    const newAppt = booking.bookSlot({
      id: "appt-202",
      doctorId: "doc-2",
      patientId: "pat-spouse",
      patientName: "Priyanka Roy",
      slotTime: "Tomorrow 10:00 AM",
      mode: "IN_PERSON",
      fee: 600
    });
    assert.equal(newAppt.status, "CONFIRMED");
  });

  test("4. Multi-Dimensional Verified Reviews & Trust Metrics", () => {
    const verification = new DoctorVerificationEngine();
    verification.registerDoctor({
      id: "doc-3",
      name: "Dr. Vikram Sethi",
      specialty: "Orthopedic",
      registrationNumber: "MCI-31908",
      medicalCouncil: "MCI",
      experienceYears: 18
    });
    verification.verifyDoctor("doc-3", true);

    verification.addReview("doc-3", {
      communication: 5,
      waitingTime: 4,
      professionalism: 5,
      clinicExperience: 5,
      wouldRecommend: true
    });

    const doc = verification.registry.get("doc-3");
    assert.equal(doc.verifiedCommunityConsultations, 1);
    assert.equal(doc.reviews.length, 1);
    assert.equal(doc.reviews[0].wouldRecommend, true);
  });

  test("5. Medical Records Privacy Boundary & Access Audits", () => {
    const privacy = new HealthPrivacyAuditEngine();
    const patientId = "resident-sandeep";

    // Resident accessing own record
    const selfAccess = privacy.checkAndAuditAccess({
      accessorId: patientId,
      accessorRole: "RESIDENT",
      patientId,
      recordId: "rx-9921",
      action: "VIEW_PRESCRIPTION"
    });
    assert.equal(selfAccess, true);

    // Society Admin attempting to access resident record -> DENIED
    const adminAccess = privacy.checkAndAuditAccess({
      accessorId: "admin-society",
      accessorRole: "COMMUNITY_ADMIN",
      patientId,
      recordId: "rx-9921",
      action: "VIEW_PRESCRIPTION"
    });
    assert.equal(adminAccess, false);

    // Explicit consent granted to Dr. Rajesh
    privacy.grantAccess(patientId, "doc-rajesh");
    const doctorAccess = privacy.checkAndAuditAccess({
      accessorId: "doc-rajesh",
      accessorRole: "DOCTOR",
      patientId,
      recordId: "rx-9921",
      action: "VIEW_PRESCRIPTION"
    });
    assert.equal(doctorAccess, true);

    assert.equal(privacy.auditLogs.length, 3, "All 3 access attempts are recorded");
  });

  test("6. Safe AI Symptom Triage Navigation & Red-Flag Alerts", () => {
    const emResult = aiSymptomTriage("Sudden crushing chest pain radiating to neck");
    assert.equal(emResult.isEmergency, true);
    assert.ok(emResult.redFlags.length > 0);

    const routineResult = aiSymptomTriage("Mild sore throat and dry cough");
    assert.equal(routineResult.isEmergency, false);
    assert.equal(routineResult.recommendedSpecialty, "General Physician / Pulmonologist");
  });
});