// ── Auth ───────────────────────────────────────────────────────
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserProfileResponse;
}

export interface RegisterRequest {
  name: string;
  email: string;
  mobile: string;
  password: string;
  communityCode?: string;
  flatNumber?: string;
  tower?: string;
}

// ── User / Profile ─────────────────────────────────────────────
export interface UserProfileResponse {
  id: number;
  name: string;
  email: string;
  mobile?: string;
  flatNumber?: string;
  tower?: string;
  profession?: string;
  bio?: string;
  profilePhoto?: string;
  role: string;
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  verifiedAt?: string;
  createdAt: string;
  communityId?: number;
  communityName?: string;
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
export interface EventDto {
  id: number;
  title: string;
  description: string;
  category: string;
  communityId: number;
  organizerName: string;
  startAt: string;
  endAt: string;
  venue: string;
  capacity: number;
  rsvpCount: number;
  rsvped: boolean;
  createdAt: string;
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

// ── Job Board ───────────────────────────────────────────────────
export type JobCategory =
  | 'HOME_REPAIRS' | 'CLEANING'   | 'CHILDCARE' | 'TUTORING'
  | 'PET_CARE'     | 'TRANSPORT'  | 'TECH_HELP' | 'COOKING'
  | 'FITNESS'      | 'MOVING'     | 'GARDEN'    | 'CREATIVE'
  | 'ERRANDS'      | 'OTHER';

export type JobType    = 'ONE_TIME' | 'RECURRING' | 'PART_TIME' | 'FULL_TIME';
export type PayType    = 'HOURLY'   | 'FIXED'     | 'NEGOTIABLE'| 'VOLUNTEER';
export type JobStatus  = 'OPEN'     | 'FILLED'    | 'CLOSED'    | 'EXPIRED';

export interface JobDto {
  id:                   number;
  posterId:             number;
  posterName:           string;
  posterFlat?:          string;
  title:                string;
  description:          string;
  category:             JobCategory;
  jobType:              JobType;
  payType:              PayType;
  payAmount?:           number;
  location?:            string;
  status:               JobStatus;
  applicationCount:     number;
  hasApplied:           boolean;
  myApplicationStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  communityId:          number;
  createdAt:            string;
  expiresAt?:           string;
}

export interface JobApplicationDto {
  id:             number;
  jobId:          number;
  applicantId:    number;
  applicantName:  string;
  applicantFlat?: string;
  coverMessage:   string;
  status:         'PENDING' | 'ACCEPTED' | 'REJECTED';
  appliedAt:      string;
}

export interface CreateJobRequest {
  title:       string;
  description: string;
  category:    JobCategory;
  jobType:     JobType;
  payType:     PayType;
  payAmount?:  number;
  location?:   string;
  expiresAt?:  string;
  showFlat:    boolean;
}

export interface ApplyJobRequest {
  coverMessage: string;
}

// ── Onboarding ──────────────────────────────────────────────────
export interface CommunityPreviewDto {
  id:          number;
  name:        string;
  city:        string;
  state:       string;
  area?:       string;
  memberCount: number;
  inviteCode:  string;
}

export type GovtIdType =
  | 'AADHAAR' | 'PAN' | 'PASSPORT'
  | 'VOTER_ID' | 'DRIVING_LICENSE';

export interface KycSubmitRequest {
  govtIdType:        GovtIdType;
  govtIdNumber:      string;
  documentFrontUrl:  string;
  documentBackUrl?:  string;
}

// ── Cricket Scorecard ──────────────────────────────────────────
export interface BattingEntryDto {
  id:         number;
  playerId:   number;
  playerName: string;
  runs:       number;
  balls:      number;
  fours:      number;
  sixes:      number;
  strikeRate: number;
  dismissal:  string;
  isNotOut:   boolean;
  position:   number;
}

export interface BowlingEntryDto {
  id:         number;
  playerId:   number;
  playerName: string;
  overs:      number;
  maidens:    number;
  runs:       number;
  wickets:    number;
  economy:    number;
  wides:      number;
  noBalls:    number;
}

export interface InningsDto {
  id:              number;
  inningsNumber:   1 | 2;
  battingTeamId:   number;
  battingTeamName: string;
  totalRuns:       number;
  wickets:         number;
  overs:           string;
  extras:          number;
  batting:         BattingEntryDto[];
  bowling:         BowlingEntryDto[];
}

export interface CricketScorecardDto {
  matchId:        number;
  matchTitle:     string;
  firstInnings:   InningsDto;
  secondInnings?: InningsDto;
  result?:        string;
  manOfMatch?:    { playerId: number; playerName: string; contribution: string };
}

export interface SportStatDto {
  sport:           SportType;
  matchesPlayed:   number;
  wins:            number;
  losses:          number;
  draws:           number;
  winRate:         number;
  tournaments:     number;
  trophies:        number;
  totalRuns?:      number;
  highestScore?:   number;
  battingAverage?: number;
  totalWickets?:   number;
  bestBowling?:    string;
  goals?:          number;
  assists?:        number;
}

export interface PlayerProfileDto {
  userId:          number;
  name:            string;
  flatNo?:         string;
  profilePicUrl?:  string;
  sportStats:      SportStatDto[];
  badges:          BadgeDto[];
  communityRating: number;
  ratingCount:     number;
  totalMatches:    number;
  totalTrophies:   number;
  recentMatches:   { matchId: number; result: string; sport: SportType; date: string }[];
}

export interface BadgeDto {
  id:          string;
  name:        string;
  description: string;
  emoji:       string;
  category:    'achievement' | 'milestone' | 'participation';
  earnedAt?:   string;
  isEarned:    boolean;
  rarity:      'common' | 'rare' | 'epic' | 'legendary';
}

export type LeaderboardCategory =
  | 'WINS' | 'RUNS' | 'WICKETS' | 'GOALS' | 'MATCHES_PLAYED' | 'TROPHIES' | 'RATING';

export interface LeaderboardEntryDto {
  rank:          number;
  userId:        number;
  name:          string;
  flatNo?:       string;
  value:         number;
  displayValue:  string;
  topBadge?:     BadgeDto;
  isCurrentUser: boolean;
}

export interface MatchPhotoDto {
  id:           number;
  matchId:      number;
  uploadedById: number;
  uploaderName: string;
  imageUrl:     string;
  caption?:     string;
  likeCount:    number;
  isLiked:      boolean;
  createdAt:    string;
}

export type PlayerReaction = 'BEST_PLAYER' | 'CLUTCH' | 'TEAM_PLAYER' | 'GOOD_SPORT' | 'CONSISTENT';

export interface MatchRatingPlayerDto {
  playerId:      number;
  playerName:    string;
  flatNo?:       string;
  averageRating: number;
  ratingCount:   number;
  topReaction?:  PlayerReaction;
  isManOfMatch:  boolean;
}

export interface MatchRatingSummaryDto {
  matchId:    number;
  canRate:    boolean;
  hasRated:   boolean;
  players:    MatchRatingPlayerDto[];
  manOfMatch?: { playerId: number; playerName: string; voteCount: number };
}

export interface SubmitRatingsRequest {
  ratings: {
    playerId:     number;
    stars:        number;
    reaction?:    PlayerReaction;
    isManOfMatch: boolean;
  }[];
}
