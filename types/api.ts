// ── Auth ───────────────────────────────────────────────────────
export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface LoginResponse {
  userId: string;
  message: string;
  token: string;
  refreshToken: string;
  fullName: string;
  email: string;
  role: string;
  communityId: number;
  dateOfBirth?: string;
  enabledModules?: string[];
  occupancyStatus?: string;
  userType?: string;
  residentType?: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  inviteCode: string;
  dateOfBirth?: string;
  gender: string;
  flatNo: string;
  block: string;
  userType?: string;
  occupancyStatus?: string;
  residentType?: string;
  aadharNumber?: string;
  emailOtpCode?: string;
}

// ── User / Profile ─────────────────────────────────────────────
export interface UserProfileResponse {
  id: number;
  fullName?: string;
  name: string;
  email: string;
  phone?: string;
  mobile?: string;
  flatNo?: string;
  flatNumber?: string;
  block?: string;
  tower?: string;
  profession?: string;
  bio?: string;
  profilePicUrl?: string;
  profilePhoto?: string;
  role: string;
  roles?: string[];
  kycStatus?: string;
  gender?: string;
  dateOfBirth?: string;
  residentType?: string;
  occupancyStatus?: string;
  userType?: string;
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  isActive?: boolean;
  verifiedAt?: string;
  createdAt: string;
  communityId?: number;
  communityName?: string;
  enabledModules?: string[];
  permissions?: string[];
}

// ── Community ──────────────────────────────────────────────────
export interface CommunityDto {
  id: number;
  name: string;
  type: string;
  address: string;
  city: string;
  state: string;
  memberCount: number;
  inviteCode: string;
}

// ── Posts / Feed ───────────────────────────────────────────────
export type PostType = 'post' | 'announcement' | 'poll' | 'event' | 'job' | 'marketplace';

export interface PostDto {
  id: number;
  authorId: number;
  authorName: string;
  authorPhoto?: string;
  authorFlat?: string;
  communityId: number;
  content: string;
  type: PostType;
  mediaUrls?: string[];
  likeCount: number;
  commentCount: number;
  liked: boolean;
  createdAt: string;
  poll?: PollDto;
}

export interface PollDto {
  options:            PollOptionDto[];
  votedOptionId?:     number;          // single-vote compat
  votedOptionIds?:    number[];        // multi-vote
  totalVotes:         number;
  deadline?:          string;          // ISO – null means no deadline
  isActive:           boolean;
  allowMultipleVotes: boolean;
  isAnonymous:        boolean;
}

export interface PollOptionDto {
  id:        number;
  text:      string;
  voteCount: number;
}

export interface CreatePollRequest {
  question:           string;
  options:            string[];   // 2–6 texts
  deadline?:          string;     // ISO datetime
  allowMultipleVotes: boolean;
  isAnonymous:        boolean;
}

export interface CommentDto {
  id: number;
  postId: number;
  authorId: number;
  authorName: string;
  authorPhoto?: string;
  content: string;
  createdAt: string;
}

export interface CreatePostRequest {
  content: string;
  type: PostType;
  mediaUrls?: string[];
}

// ── Events ─────────────────────────────────────────────────────
export type EventType = 'COMMUNITY' | 'SOCIAL' | 'SPORTS' | 'CULTURAL' | 'RELIGIOUS' | 'MEETING' | 'WORKSHOP' | 'OTHER';
export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
export type EventPriceType = 'FREE' | 'PAID' | 'DONATION';
export type EventLocationType = 'PHYSICAL' | 'ONLINE' | 'HYBRID';

export interface EventDto {
  id: number;
  title: string;
  description: string;
  type: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  locationType: string;
  location: string;
  priceType: string;
  price: number | null;
  capacity: number | null;
  maxAttendees: number | null;
  imageUrl: string | null;
  organizerName: string;
  organizerContact: string | null;
  venue: string;
  city: string | null;
  category: string;
  status: string;
  notes: string | null;
  registrationDeadline: string | null;
  registrationCount: number;
  isRegistered: boolean;
  createdById: number;
  createdByName: string;
  communityId: number;
  attendees: number;
  createdAt: string;
  // Legacy compatibility
  startAt?: string;
  endAt?: string;
  rsvpCount?: number;
  rsvped?: boolean;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  type?: string;
  startDate: string;
  endDate?: string;
  startTime: string;
  endTime?: string;
  locationType?: string;
  location?: string;
  priceType?: string;
  price?: number;
  capacity?: number;
  imageUrl?: string;
  organizerName?: string;
  organizerContact?: string;
  venue?: string;
  city?: string;
  category?: string;
  status?: string;
  notes?: string;
  maxAttendees?: number;
  registrationDeadline?: string;
}

export interface EventRegistrationDto {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  eventId: number;
  status: string;
  checkedIn: boolean;
  registeredAt: string;
}

// ── Chat ───────────────────────────────────────────────────────
export interface ConversationDto {
  id: number;
  type: 'DIRECT' | 'GROUP';
  name?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  participants: ChatParticipantDto[];
}

export interface ChatParticipantDto {
  userId: number;
  name: string;
  photo?: string;
  online: boolean;
}

export interface ChatMessageDto {
  id: number;
  conversationId: number;
  senderId: number;
  senderName: string;
  senderPhoto?: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  createdAt: string;
  readAt?: string;
}

// ── Notifications ──────────────────────────────────────────────
export interface NotificationDto {
  id: number;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

// ── Paginated Response ─────────────────────────────────────────
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

// ── API Error ──────────────────────────────────────────────────
export interface ApiError {
  status: number;
  message: string;
  timestamp: string;
}

// ── Auction ────────────────────────────────────────────────────
export type AuctionStatus = 'UPCOMING' | 'LIVE' | 'ENDING_SOON' | 'ENDED' | 'CANCELLED';

export interface AuctionDto {
  id:               number;
  title:            string;
  description:      string;
  imageUrls:        string[];
  communityId:      number;
  sellerId:         number;
  sellerName:       string;
  sellerFlat?:      string;
  startTime:        string;
  endTime:          string;
  startingPrice:    number;
  reservePrice?:    number;
  reserveMet:       boolean;
  currentBid:       number;
  currentBidder?:   string;
  currentBidderId?: number;
  bidCount:         number;
  status:           AuctionStatus;
  category:         string;
  condition:        string;
  winnerId?:        number;
  winnerName?:      string;
  finalPrice?:      number;
  createdAt:        string;
}

export interface BidDto {
  id:          number;
  auctionId:   number;
  bidderId:    number;
  bidderName:  string;
  bidderFlat?: string;
  amount:      number;
  isWinning:   boolean;
  createdAt:   string;
}

// ── Real-time auction events (from STOMP) ──────────────────────
export type AuctionEventType =
  | 'BID_PLACED'
  | 'AUCTION_EXTENDED'
  | 'AUCTION_ENDED'
  | 'AUCTION_STARTED'
  | 'RESERVE_MET'
  | 'OUTBID';

export interface AuctionEvent {
  type:          AuctionEventType;
  auctionId:     number;
  // BID_PLACED / OUTBID
  bidderId?:     number;
  bidderName?:   string;
  bidderFlat?:   string;
  amount?:       number;
  timestamp?:    string;
  // AUCTION_EXTENDED
  newEndTime?:   string;
  // AUCTION_ENDED
  winnerId?:     number;
  winnerName?:   string;
  finalAmount?:  number;
}

export interface PlaceBidRequest {
  amount: number;
}

// ── Marketplace (append to existing) ──────────────────────────
export type MarketplaceCategory =
  | 'ALL' | 'FURNITURE' | 'ELECTRONICS' | 'CLOTHING' | 'BOOKS'
  | 'SPORTS' | 'KITCHEN' | 'GARDEN' | 'SERVICES' | 'FREE' | 'OTHER';

export type ListingCondition = 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR' | 'POOR';
export type ListingStatus    = 'ACTIVE' | 'SOLD' | 'EXPIRED' | 'DRAFT';

export interface MarketplaceListingDto {
  id:           number;
  sellerId:     number;
  sellerName:   string;
  sellerFlat?:  string;
  sellerPhoto?: string;
  title:        string;
  description:  string;
  price:        number;             // 0 = free
  isFree:       boolean;
  isNegotiable: boolean;
  category:     MarketplaceCategory;
  condition:    ListingCondition;
  status:       ListingStatus;
  imageUrls:    string[];
  viewCount:    number;
  savedCount:   number;
  isSaved:      boolean;
  communityId:  number;
  createdAt:    string;
  updatedAt:    string;
  soldAt?:      string;
}

export interface CreateListingRequest {
  title:        string;
  description:  string;
  price:        number;
  isFree:       boolean;
  isNegotiable: boolean;
  category:     MarketplaceCategory;
  condition:    ListingCondition;
  imageUrls:    string[];
}

export interface MarketplaceFilters {
  category?:    MarketplaceCategory;
  search?:      string;
  minPrice?:    number;
  maxPrice?:    number;
  condition?:   ListingCondition;
  freeOnly?:    boolean;
}

// ── Admin (append to existing Admin types) ─────────────────────
export interface AdminStatsDto {
  totalMembers:     number;
  pendingApprovals: number;
  activeMembers:    number;
  suspendedMembers: number;
  postsToday:       number;
  totalPosts:       number;
  eventsThisWeek:   number;
  pendingReports:   number;
  newMembersThisMonth: number;
}

export interface AdminMemberDto {
  id:          number;
  name:        string;
  email:       string;
  mobile?:     string;
  flatNumber?: string;
  tower?:      string;
  role:        string;
  status:      'ACTIVE' | 'PENDING' | 'SUSPENDED';
  joinedAt:    string;
  verifiedAt?: string;
  lastActiveAt?: string;
}

export interface ReportDto {
  id:             number;
  reporterId:     number;
  reporterName:   string;
  targetType:     'POST' | 'COMMENT' | 'USER';
  targetId:       number;
  targetContent?: string;
  targetAuthor?:  string;
  reason:         string;
  status:         'PENDING' | 'RESOLVED' | 'DISMISSED';
  createdAt:      string;
}

export interface AnnouncementDto {
  id:        number;
  title:     string;
  content:   string;
  priority:  'NORMAL' | 'URGENT';
  pinned:    boolean;
  authorId:  number;
  authorName: string;
  createdAt: string;
  expiresAt?: string;
}

export interface CreateAnnouncementRequest {
  title:     string;
  content:   string;
  priority:  'NORMAL' | 'URGENT';
  pinned?:   boolean;
  expiresAt?: string;
}

export interface CommunitySettingsDto {
  id:           number;
  name:         string;
  description?: string;
  address:      string;
  city:         string;
  state:        string;
  inviteCode:   string;
  maxMembers:   number;
  features: {
    marketplace: boolean;
    sports:      boolean;
    auction:     boolean;
    jobs:        boolean;
    polls:       boolean;
    commute:     boolean;
  };
}

// ── Sports ─────────────────────────────────────────────────────
export type SportType =
  | 'CRICKET' | 'FOOTBALL' | 'BADMINTON' | 'TABLE_TENNIS'
  | 'BASKETBALL' | 'VOLLEYBALL' | 'CHESS' | 'CARROM' | 'OTHER';

export type TournamentFormat  = 'KNOCKOUT' | 'ROUND_ROBIN' | 'LEAGUE' | 'SWISS';
export type TournamentStatus  = 'UPCOMING' | 'REGISTRATION_OPEN' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
export type MatchStatus       = 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED' | 'POSTPONED';

export interface TournamentDto {
  id:                     number;
  name:                   string;
  sport:                  SportType;
  description?:           string;
  format:                 TournamentFormat;
  status:                 TournamentStatus;
  startDate:              string;
  endDate:                string;
  registrationDeadline?:  string;
  maxTeams:               number;
  registeredTeamsCount:   number;
  teamSize:               number;
  organizerName:          string;
  communityId:            number;
  prizes?:                string;
  rules?:                 string;
  venue?:                 string;
  myTeamRegistered:       boolean;
  createdAt:              string;
}

export interface TeamMemberDto {
  userId: number;
  name:   string;
  flat?:  string;
  role:   'CAPTAIN' | 'PLAYER' | 'SUBSTITUTE';
}

export interface TeamDto {
  id:            number;
  name:          string;
  captainId:     number;
  captainName:   string;
  tournamentId:  number;
  sport:         SportType;
  members:       TeamMemberDto[];
  status:        'PENDING' | 'APPROVED' | 'ELIMINATED' | 'WINNER' | 'RUNNER_UP';
  wins:          number;
  losses:        number;
  draws:         number;
  points:        number;
  goalsFor:      number;
  goalsAgainst:  number;
  logoEmoji:     string;
  isMyTeam:      boolean;
  isCaptain:     boolean;
}

export interface MatchDto {
  id:               number;
  tournamentId:     number;
  tournamentName:   string;
  sport:            SportType;
  homeTeamId:       number;
  homeTeamName:     string;
  homeTeamEmoji:    string;
  awayTeamId:       number;
  awayTeamName:     string;
  awayTeamEmoji:    string;
  homeScore:        number;
  awayScore:        number;
  status:           MatchStatus;
  scheduledAt:      string;
  startedAt?:       string;
  endedAt?:         string;
  venue?:           string;
  round?:           string;
  matchNumber?:     number;
  // Badminton / Table Tennis
  homeSetsWon?:     number;
  awaySetsWon?:     number;
  // Football / Basketball
  currentPeriod?:   string;
  elapsedMinutes?:  number;
  // Cricket
  homeOvers?:       string;
  homeWickets?:     number;
  awayOvers?:       string;
  awayWickets?:     number;
}

export interface MatchEventDto {
  id:          number;
  matchId:     number;
  type:        'GOAL' | 'WICKET' | 'POINT' | 'CARD' | 'SET_WON' | 'HALF_TIME' | 'FULL_TIME' | 'COMMENTARY';
  teamName?:   string;
  playerName?: string;
  description: string;
  minute?:     number;
  over?:       string;
  timestamp:   string;
}

export interface StandingDto {
  position:       number;
  teamId:         number;
  teamName:       string;
  teamEmoji:      string;
  played:         number;
  won:            number;
  drawn:          number;
  lost:           number;
  goalsFor:       number;
  goalsAgainst:   number;
  goalDifference: number;
  points:         number;
}

export interface RegisterTeamRequest {
  teamName:      string;
  tournamentId:  number;
  memberUserIds: number[];
  logoEmoji:     string;
}

export interface LiveScoreEvent {
  type:            'SCORE_UPDATE' | 'MATCH_EVENT' | 'MATCH_STARTED' | 'MATCH_ENDED';
  matchId:         number;
  homeScore?:      number;
  awayScore?:      number;
  event?:          MatchEventDto;
  status?:         MatchStatus;
  currentPeriod?:  string;
  elapsedMinutes?: number;
  homeOvers?:      string;
  homeWickets?:    number;
  awayOvers?:      string;
  awayWickets?:    number;
  homeSetsWon?:    number;
  awaySetsWon?:    number;
}

export interface BallEventRequest {
  matchId:            number;
  inningsNumber:      number;
  batsmanId?:         number;
  nonStrikerId?:      number;
  bowlerId?:          number;
  runsScored:         number;
  isBoundary?:        boolean;
  isSix?:             boolean;
  extrasType?:        string;
  extrasRuns?:        number;
  isWicket?:          boolean;
  dismissalType?:     string;
  dismissedPlayerId?: number;
  fielderId?:         number;
}

export interface GenericScoreRequest {
  matchId:        number;
  teamId:         number;
  eventType:      string;
  periodNumber?:  number;
  pointsAwarded?: number;
  playerId?:      number;
  matchMinute?:   number;
}

// ── Sports Dashboard & Event Registrations ──────────────────────
export interface DashboardStatsDto {
  yourRegistrations: number;
  liveEvents: number;
  openRegistrations: number;
  upcomingTournaments: number;
}

export interface DashboardEventCardDto {
  id: number;
  uuid: string | null;
  name: string;
  eventDateStart: string | null;
  eventDateEnd: string | null;
  sportName: string | null;
  categoryName: string | null;
  venueName: string | null;
  maxParticipants: number | null;
  registeredCount?: number | null;
  registrationStatus: string | null;
  auctionStatus: string | null;
  teamSport: boolean;
  myRegistrationId: number | null;
  myRegistrationStatus: string | null;
}

export interface DashboardTournamentCardDto {
  id: number;
  name: string;
  bannerImage: string | null;
  eventDateStart: string | null;
  eventDateEnd: string | null;
  registrationStatus: string | null;
  communityId: number | null;
  communityName: string | null;
  events: DashboardEventCardDto[];
}

export interface DashboardUpcomingEventDto {
  id: number;
  name: string;
  sportName: string | null;
  venueName: string | null;
  categoryName: string | null;
  registrationStatus: string | null;
  eventDateStart: string | null;
  startTime: string | null;
  tournamentId?: number | null;
  tournamentName?: string | null;
  familyMemberId?: number | null;
  playerName?: string | null;
  relation?: string | null;
}

export interface DashboardMyRegistrationDto {
  id: number;
  eventId: number | null;
  eventName: string | null;
  eventDateStart: string | null;
  sportName: string | null;
  categoryName: string | null;
  eventRegistrationStatus: string | null;
  status: string | null;
  matchType: string | null;
  captainNomination: boolean | null;
  captainConfirmation: boolean | null;
  familyMemberId?: number | null;
  playerName?: string | null;
  relation?: string | null;
}

export interface SportsDashboardResponseDto {
  stats: DashboardStatsDto;
  openRegistrations: DashboardEventCardDto[];
  closedRegistrations: DashboardEventCardDto[];
  myUpcomingEvents: DashboardUpcomingEventDto[];
  myRegistrations: DashboardMyRegistrationDto[];
  openTournaments: DashboardTournamentCardDto[];
}

export interface SportsFamilyMemberRef {
  id: number;
  name: string;
  relation?: string;
  gender?: string;
  age?: number;
}

export interface SportsRegistrationResponseDto {
  id: number;
  status: string;
  matchType?: string;
  playerName?: string;
  email?: string;
  relation?: string;
  flatNumber?: string;
  age?: number;
  role?: string;
  captainNomination?: boolean;
  captainConfirmation?: boolean;
  proposedTeamName?: string;
  familyMember?: SportsFamilyMemberRef;
  partnerFamilyMember?: SportsFamilyMemberRef;
  registeredAt?: string;
}

export interface SportsEventRegistrationRequest {
  eventId: number;
  familyMemberId?: number;
  playerName: string;
  email?: string;
  flatNumber?: string;
  relation?: string;
  age?: number;
  gender?: string;
  matchType?: string;
  role?: string;
  categoryId?: number;
  partnerUserId?: number;
  partnerFamilyMemberId?: number;
}

// ── Commute / Carpool ─────────────────────────────────────────
export type CommuteRideType   = 'OFFER' | 'REQUEST';
export type CommuteRideStatus = 'ACTIVE' | 'FULL' | 'COMPLETED' | 'CANCELLED';
export type CommuteBookingStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED';

export interface CommuteRideDto {
  id:              number;
  driverId:        number;
  driverName:      string;
  driverFlat?:     string;
  driverPhoto?:    string;
  driverRating:    number;
  fromLocation:    string;
  toLocation:      string;
  fromLat?:        number;
  fromLng?:        number;
  toLat?:          number;
  toLng?:          number;
  departureTime:   string;
  rideType:        CommuteRideType;
  totalSeats:      number;
  availableSeats:  number;
  pricePerSeat?:   number;
  free:            boolean;
  vehicleType?:    string;
  vehicleNumber?:  string;
  notes?:          string;
  status:          CommuteRideStatus;
  recurring:       boolean;
  recurringDays?:  string;
  recurringTime?:  string;
  ladiesOnly:      boolean;
  distanceKm?:     number;
  bookingCount:    number;
  isMyRide:        boolean;
  hasBooked:       boolean;
  myBookingStatus?: CommuteBookingStatus;
  bookings?:       CommuteBookingDto[];
  createdAt:       string;
}

export interface CommuteBookingDto {
  id:              number;
  passengerId:     number;
  passengerName:   string;
  passengerFlat?:  string;
  passengerPhoto?: string;
  seatsBooked:     number;
  pickupNote?:     string;
  status:          CommuteBookingStatus;
  createdAt:       string;
}

export interface CreateCommuteRideRequest {
  fromLocation:    string;
  toLocation:      string;
  fromLat?:        number;
  fromLng?:        number;
  toLat?:          number;
  toLng?:          number;
  departureTime:   string;
  rideType:        CommuteRideType;
  totalSeats:      number;
  pricePerSeat?:   number;
  free:            boolean;
  vehicleType?:    string;
  vehicleNumber?:  string;
  notes?:          string;
  recurring:       boolean;
  recurringDays?:  string;
  recurringTime?:  string;
  ladiesOnly:      boolean;
}

export interface CreateCommuteBookingRequest {
  seatsBooked: number;
  pickupNote?: string;
}

export interface CommuteStatsDto {
  activeRides:    number;
  myOfferedRides: number;
  myBookedRides:  number;
}

// ── Commute Ratings ──
export interface CommuteRatingDto {
  id:          number;
  rideId:      number;
  raterId:     number;
  raterName:   string;
  ratedId:     number;
  ratedName:   string;
  score:       number;
  comment?:    string;
  createdAt:   string;
}

export interface CreateCommuteRatingRequest {
  score:      number;
  comment?:   string;
  ratedUserId?: number;
}

// ── Commute Vehicles ──
export interface CommuteVehicleDto {
  id:          number;
  vehicleType: string;
  model?:      string;
  color?:      string;
  numberPlate: string;
  isDefault:   boolean;
  createdAt:   string;
}

export interface CreateCommuteVehicleRequest {
  vehicleType: string;
  model?:      string;
  color?:      string;
  numberPlate: string;
  isDefault:   boolean;
}

// ── Commute Favourite Routes ──
export interface CommuteFavouriteRouteDto {
  id:           number;
  label:        string;
  fromLocation: string;
  toLocation:   string;
  fromLat?:     number;
  fromLng?:     number;
  toLat?:       number;
  toLng?:       number;
  createdAt:    string;
}

export interface CreateCommuteFavouriteRouteRequest {
  label:        string;
  fromLocation: string;
  toLocation:   string;
  fromLat?:     number;
  fromLng?:     number;
  toLat?:       number;
  toLng?:       number;
}

// ── Commute User Profile ──
export interface CommuteUserProfileDto {
  userId:        number;
  name:          string;
  flat?:         string;
  photo?:        string;
  averageRating: number;
  totalRatings:  number;
  ridesOffered:  number;
  ridesBooked:   number;
  kycVerified:   boolean;
}
