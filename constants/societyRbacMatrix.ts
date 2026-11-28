export type SocietyPersona =
  | 'FLAT_OWNER'
  | 'TENANT'
  | 'FAMILY_MEMBER'
  | 'GUARD'
  | 'ESTATE_MANAGER'
  | 'MC_ADMIN'
  | 'PLATFORM_SUPER_ADMIN';

export type PersonaCapability =
  | 'APPROVE_VISITOR'
  | 'GATE_CHECKIN_SCAN'
  | 'BOOK_AMENITY'
  | 'RAISE_COMPLAINT'
  | 'VIEW_OWN_DUES'
  | 'PAY_MAINTENANCE_DUES'
  | 'VOTE_OWNER_AGM'
  | 'MANAGE_FLAT_OCCUPANCY'
  | 'MANAGE_HELPDESK_SLA'
  | 'MANAGE_SOCIETY_GOVERNANCE'
  | 'CROSS_SOCIETY_PLATFORM_ACCESS';

export interface MobileRbacActor {
  userId: number;
  rawRole: string;
  communityId: number | null;
  flatId?: number | null;
}

const CAPABILITY_MATRIX: Record<SocietyPersona, ReadonlySet<PersonaCapability>> = {
  FLAT_OWNER: new Set([
    'APPROVE_VISITOR',
    'BOOK_AMENITY',
    'RAISE_COMPLAINT',
    'VIEW_OWN_DUES',
    'PAY_MAINTENANCE_DUES',
    'VOTE_OWNER_AGM',
    'MANAGE_FLAT_OCCUPANCY',
  ]),
  TENANT: new Set([
    'APPROVE_VISITOR',
    'BOOK_AMENITY',
    'RAISE_COMPLAINT',
    'VIEW_OWN_DUES',
    'PAY_MAINTENANCE_DUES',
  ]),
  FAMILY_MEMBER: new Set(['APPROVE_VISITOR', 'BOOK_AMENITY', 'RAISE_COMPLAINT']),
  GUARD: new Set(['GATE_CHECKIN_SCAN']),
  ESTATE_MANAGER: new Set(['GATE_CHECKIN_SCAN', 'BOOK_AMENITY', 'RAISE_COMPLAINT', 'MANAGE_HELPDESK_SLA']),
  MC_ADMIN: new Set([
    'APPROVE_VISITOR',
    'GATE_CHECKIN_SCAN',
    'BOOK_AMENITY',
    'RAISE_COMPLAINT',
    'VIEW_OWN_DUES',
    'PAY_MAINTENANCE_DUES',
    'VOTE_OWNER_AGM',
    'MANAGE_FLAT_OCCUPANCY',
    'MANAGE_HELPDESK_SLA',
    'MANAGE_SOCIETY_GOVERNANCE',
  ]),
  PLATFORM_SUPER_ADMIN: new Set([
    'APPROVE_VISITOR',
    'GATE_CHECKIN_SCAN',
    'BOOK_AMENITY',
    'RAISE_COMPLAINT',
    'VIEW_OWN_DUES',
    'PAY_MAINTENANCE_DUES',
    'VOTE_OWNER_AGM',
    'MANAGE_FLAT_OCCUPANCY',
    'MANAGE_HELPDESK_SLA',
    'MANAGE_SOCIETY_GOVERNANCE',
    'CROSS_SOCIETY_PLATFORM_ACCESS',
  ]),
};

export function resolveMobileSocietyPersona(rawRole: string): SocietyPersona | null {
  switch ((rawRole || '').trim().toUpperCase()) {
    case 'OWNER':
    case 'FLAT_OWNER':
      return 'FLAT_OWNER';
    case 'TENANT':
    case 'RESIDENT':
    case 'MEMBER':
    case 'USER':
      return 'TENANT';
    case 'FAMILY':
    case 'FAMILY_MEMBER':
    case 'DEPENDENT':
      return 'FAMILY_MEMBER';
    case 'GUARD':
    case 'SECURITY_GUARD':
      return 'GUARD';
    case 'ESTATE_MANAGER':
    case 'COMMUNITY_MGMT_ADMIN':
    case 'HELPDESK_ADMIN':
    case 'BOOKINGS_ADMIN':
    case 'STAFF':
      return 'ESTATE_MANAGER';
    case 'MC_ADMIN':
    case 'COMMUNITY_ADMIN':
    case 'ADMIN':
      return 'MC_ADMIN';
    case 'SUPER_ADMIN':
    case 'PLATFORM_SUPER_ADMIN':
      return 'PLATFORM_SUPER_ADMIN';
    default:
      return null;
  }
}

export function canMobileActorPerform(
  actor: MobileRbacActor,
  targetCommunityId: number | null,
  targetFlatId: number | null,
  capability: PersonaCapability,
): boolean {
  const persona = resolveMobileSocietyPersona(actor.rawRole);
  if (!persona) return false;
  if (!CAPABILITY_MATRIX[persona].has(capability)) return false;

  if (persona !== 'PLATFORM_SUPER_ADMIN') {
    if (actor.communityId == null || targetCommunityId == null || actor.communityId !== targetCommunityId) {
      return false;
    }
  }

  if (persona === 'FLAT_OWNER' || persona === 'TENANT' || persona === 'FAMILY_MEMBER') {
    const flatScoped =
      capability === 'APPROVE_VISITOR' ||
      capability === 'BOOK_AMENITY' ||
      capability === 'RAISE_COMPLAINT' ||
      capability === 'VIEW_OWN_DUES' ||
      capability === 'PAY_MAINTENANCE_DUES' ||
      capability === 'VOTE_OWNER_AGM' ||
      capability === 'MANAGE_FLAT_OCCUPANCY';
    if (flatScoped && targetFlatId != null && (actor.flatId == null || actor.flatId !== targetFlatId)) {
      return false;
    }
  }

  return true;
}
