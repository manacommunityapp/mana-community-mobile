/**
 * Sports Category Eligibility and Age / Gender Validation Utility for Mobile
 */

export function normalizeGender(gender: string | null | undefined): string {
  if (!gender) return "";
  const g = String(gender).trim().toUpperCase();
  if (g === "MALE" || g === "M" || g === "MEN" || g === "MAN" || g === "BOY" || g === "BOYS") return "MALE";
  if (g === "FEMALE" || g === "F" || g === "WOMEN" || g === "WOMAN" || g === "GIRL" || g === "GIRLS" || g === "LADIES") return "FEMALE";
  if (g === "ALL" || g === "ANY" || g === "OPEN" || g === "MIXED") return "ALL";
  return "OTHER";
}

export function calculateAge(dobString: string | null | undefined): number | null {
  if (!dobString) return null;
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

export interface EligibilityResult {
  eligible: boolean;
  isGenderMismatch: boolean;
  isOverAge: boolean;
  isUnderAge: boolean;
  requiredGender: string | null;
  minAge: number | null;
  maxAge: number | null;
  warningMsg: string;
}

export function checkCategoryEligibility(
  categoryOrEvent: {
    name?: string | null;
    categoryName?: string | null;
    gender?: string | null;
    minAge?: number | null;
    maxAge?: number | null;
    description?: string | null;
  } | null | undefined,
  participantAge: number | null | undefined,
  participantGender: string | null | undefined
): EligibilityResult {
  if (!categoryOrEvent) {
    return {
      eligible: true,
      isGenderMismatch: false,
      isOverAge: false,
      isUnderAge: false,
      requiredGender: null,
      minAge: null,
      maxAge: null,
      warningMsg: "",
    };
  }

  const text = `${categoryOrEvent.categoryName || ""} ${categoryOrEvent.name || ""} ${categoryOrEvent.description || ""}`.toLowerCase();

  let minAge = categoryOrEvent.minAge != null ? categoryOrEvent.minAge : null;
  let maxAge = categoryOrEvent.maxAge != null ? categoryOrEvent.maxAge : null;

  if (minAge == null && maxAge == null) {
    const underMatch = text.match(/(?:under|u-?|below|<|<=)\s*(\d+)/i);
    const plusMatch = text.match(/(?:above|over|>|>=)\s*(\d+)|(\d+)\s*(?:\+|plus|above|and above|and over|over|>|>=)/i);
    const rangeMatch = text.match(/(?:between\s*)?(\d+)\s*(?:-|–|to)\s*(\d+)/i);

    if (rangeMatch) {
      minAge = parseInt(rangeMatch[1], 10);
      maxAge = parseInt(rangeMatch[2], 10);
    } else if (underMatch) {
      maxAge = parseInt(underMatch[1], 10);
    } else if (plusMatch) {
      minAge = parseInt(plusMatch[1] || plusMatch[2], 10);
    } else if (/\b(kids?|childrens?)\b/i.test(text)) {
      maxAge = 16;
    } else if (/\b(seniors?|veterans?)\b/i.test(text)) {
      minAge = 45;
    }
  }

  // Gender detection
  let requiredGender: string | null = null;
  const rawGender = normalizeGender(categoryOrEvent.gender);
  if (rawGender === "MALE") {
    requiredGender = "MALE";
  } else if (rawGender === "FEMALE") {
    requiredGender = "FEMALE";
  } else if (rawGender === "ALL") {
    requiredGender = "ALL";
  } else {
    const isFemale = /\b(womens?|woman|females?|girls?|ladies)('s)?\b/i.test(text);
    const isMale = !isFemale && /(?<![a-z])(mens?|man\b|males?|boys?|gentlemen)('s)?\b/i.test(text);
    const isMixed = /\b(mixed|mix)\b/i.test(text);

    if (isMixed) {
      requiredGender = "MIXED";
    } else if (isFemale) {
      requiredGender = "FEMALE";
    } else if (isMale) {
      requiredGender = "MALE";
    } else if (/\b(open|general|all)\b/i.test(text)) {
      requiredGender = "ALL";
    }
  }

  const pGender = normalizeGender(participantGender);
  let isGenderMismatch = false;

  if (pGender && requiredGender && requiredGender !== "MIXED" && requiredGender !== "ALL") {
    if (requiredGender === "MALE" && pGender !== "MALE") {
      isGenderMismatch = true;
    }
    if (requiredGender === "FEMALE" && pGender !== "FEMALE") {
      isGenderMismatch = true;
    }
  }

  const age = participantAge ?? 0;
  let isOverAge = false;
  let isUnderAge = false;
  let warningMsg = "";

  if (age > 0) {
    if (maxAge != null && age > maxAge) {
      isOverAge = true;
      warningMsg = `Participant age (${age} yrs) exceeds maximum age (${maxAge} yrs) for this category.`;
    } else if (minAge != null && age < minAge) {
      isUnderAge = true;
      warningMsg = `Participant age (${age} yrs) is below minimum age (${minAge} yrs) for this category.`;
    }
  }

  if (isGenderMismatch) {
    warningMsg = `Category requires ${requiredGender === "MALE" ? "Male" : "Female"} participant, but participant gender is ${pGender || "unspecified"}.`;
  }

  const eligible = !isGenderMismatch && !isOverAge && !isUnderAge;

  return {
    eligible,
    isGenderMismatch,
    isOverAge,
    isUnderAge,
    requiredGender,
    minAge,
    maxAge,
    warningMsg,
  };
}

export function getCategoryMatchScore(
  categoryOrEvent: {
    name?: string | null;
    categoryName?: string | null;
    gender?: string | null;
    minAge?: number | null;
    maxAge?: number | null;
  } | null | undefined,
  participantAge: number,
  participantGender: string
): number {
  if (!categoryOrEvent) return -1;
  const elig = checkCategoryEligibility(categoryOrEvent, participantAge, participantGender);
  if (!elig.eligible) return -1;

  let score = 10;

  // Specific gender match bonus
  if (elig.requiredGender === "MALE" || elig.requiredGender === "FEMALE") {
    score += 25;
  }

  // Exact age bracket bonuses
  if (elig.minAge != null && elig.maxAge != null) {
    score += 45;
    const span = Math.max(1, elig.maxAge - elig.minAge);
    score += Math.max(0, 10 - span);
  } else if (elig.maxAge != null) {
    score += 35;
    score += Math.max(0, 30 - elig.maxAge);
  } else if (elig.minAge != null) {
    score += 35;
  }

  return score;
}

export function findBestMatchingCategory<T extends { name?: string | null; categoryName?: string | null; gender?: string | null; minAge?: number | null; maxAge?: number | null }>(
  categories: T[],
  participantAge: number,
  participantGender: string
): T | undefined {
  if (!categories || categories.length === 0) return undefined;

  let bestItem: T | undefined;
  let bestScore = -1;

  for (const cat of categories) {
    const score = getCategoryMatchScore(cat, participantAge, participantGender);
    if (score > bestScore) {
      bestScore = score;
      bestItem = cat;
    }
  }

  return bestScore > -1 ? bestItem : undefined;
}

export function isRegistrationForMember(
  reg: { familyMemberId?: number | string | null; playerName?: string | null; relation?: string | null } | null | undefined,
  selectedMemberId: string | number | undefined,
  userFullName?: string | null,
  familyMembers: Array<{ id: number | string; name?: string | null; relation?: string | null }> = []
): boolean {
  if (!reg) return false;
  const isSelfTarget = !selectedMemberId || selectedMemberId === "self" || selectedMemberId === "SELF" || selectedMemberId === "member-self";

  const regPlayerName = (reg.playerName || "").trim().toLowerCase();
  const regRelation = (reg.relation || "").trim().toUpperCase();
  const regFamilyMemberId = reg.familyMemberId;
  const targetFullName = (userFullName || "").trim().toLowerCase();

  const isExplicitFamily =
    (regFamilyMemberId && regFamilyMemberId !== "self" && regFamilyMemberId !== "member-self") ||
    (regRelation && regRelation !== "SELF" && regRelation !== "HEAD");

  const isSelfReg = !isExplicitFamily || Boolean(targetFullName && regPlayerName === targetFullName && regRelation === "SELF");

  if (isSelfTarget) {
    return isSelfReg;
  }

  if (regFamilyMemberId && String(regFamilyMemberId) === String(selectedMemberId)) {
    return true;
  }

  const targetMember = familyMembers.find(m => String(m.id) === String(selectedMemberId));
  if (targetMember) {
    const targetMemberName = (targetMember.name || "").trim().toLowerCase();
    const targetMemberRelation = (targetMember.relation || "").trim().toUpperCase();
    if (targetMemberName && regPlayerName === targetMemberName) {
      return true;
    }
    if (targetMemberRelation && regRelation === targetMemberRelation) {
      return true;
    }
  }

  return false;
}
