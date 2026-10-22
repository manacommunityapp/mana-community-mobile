const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api';

export type MovieLanguage = 'Hindi' | 'English' | 'Tamil' | 'Telugu' | 'Malayalam' | 'Kannada';
export type MovieGenre = 'Action' | 'Drama' | 'Comedy' | 'Thriller' | 'Romance' | 'Sci-Fi' | 'Horror' | 'Family' | 'Animation' | 'Fantasy';
export type SeatType = 'CLASSIC' | 'PREMIUM' | 'RECLINER';
export type SeatStatus = 'AVAILABLE' | 'OCCUPIED' | 'SELECTED' | 'BLOCKED';

export interface Movie {
  id: string;
  title: string;
  language: MovieLanguage;
  genre: MovieGenre[];
  rating: string;
  duration_mins: number;
  poster_emoji: string;
  backdrop_color: string;
  cast: string;
  director: string;
  release_date: string;
  certificate: 'U' | 'UA' | 'A';
  status: 'NOW_SHOWING' | 'COMING_SOON';
}

export interface Showtime {
  id: string;
  movie_id: string;
  theater: string;
  theater_screen: string;
  date: string;
  time: string;
  price_classic: number;
  price_premium: number;
  price_recliner: number;
  available_seats: number;
  total_seats: number;
  format: '2D' | '3D' | 'IMAX' | '4DX';
}

export interface SeatRow {
  row: string;
  seat_type: SeatType;
  seats: { number: number; status: SeatStatus }[];
}

export interface BookingResult {
  booking_id: string;
  upi_intent_url: string;
  phone_pe_url: string;
  transaction_ref: string;
  amount: number;
  seats: string[];
  qr_data: string;
}

// ── Fallback Data ────────────────────────────────────────────────────────────

const NOW_SHOWING: Movie[] = [
  { id: 'm1', title: 'Pushpa 2: The Rule', language: 'Telugu', genre: ['Action', 'Drama'], rating: '8.5', duration_mins: 179, poster_emoji: '🔥', backdrop_color: '#7C2D12', cast: 'Allu Arjun, Rashmika Mandanna', director: 'Sukumar', release_date: '2024-12-05', certificate: 'UA', status: 'NOW_SHOWING' },
  { id: 'm2', title: 'Devara', language: 'Telugu', genre: ['Action', 'Thriller'], rating: '7.8', duration_mins: 166, poster_emoji: '⚔️', backdrop_color: '#1E3A5F', cast: 'Jr. NTR, Janhvi Kapoor', director: 'Koratala Siva', release_date: '2024-09-27', certificate: 'UA', status: 'NOW_SHOWING' },
  { id: 'm3', title: 'Singham Again', language: 'Hindi', genre: ['Action', 'Comedy'], rating: '7.2', duration_mins: 162, poster_emoji: '👮', backdrop_color: '#1E293B', cast: 'Ajay Devgn, Deepika Padukone', director: 'Rohit Shetty', release_date: '2024-11-01', certificate: 'UA', status: 'NOW_SHOWING' },
  { id: 'm4', title: 'Venom: The Last Dance', language: 'English', genre: ['Action', 'Sci-Fi'], rating: '6.9', duration_mins: 109, poster_emoji: '🕷️', backdrop_color: '#1A1A2E', cast: 'Tom Hardy, Juno Temple', director: 'Kelly Marcel', release_date: '2024-10-25', certificate: 'UA', status: 'NOW_SHOWING' },
  { id: 'm5', title: 'Kanguva', language: 'Tamil', genre: ['Action', 'Fantasy'], rating: '5.8', duration_mins: 164, poster_emoji: '⚡', backdrop_color: '#4A044E', cast: 'Suriya, Disha Patani', director: 'Siva', release_date: '2024-11-14', certificate: 'UA', status: 'NOW_SHOWING' },
  { id: 'm6', title: 'Lucky Baskhar', language: 'Telugu', genre: ['Drama', 'Thriller'], rating: '8.2', duration_mins: 154, poster_emoji: '🎰', backdrop_color: '#14532D', cast: 'Dulquer Salmaan, Meenakshi Chaudhary', director: 'Venky Atluri', release_date: '2024-10-31', certificate: 'UA', status: 'NOW_SHOWING' },
];

const COMING_SOON: Movie[] = [
  { id: 'm7', title: 'Kalki 2898 AD – Part 2', language: 'Telugu', genre: ['Sci-Fi', 'Action'], rating: 'TBD', duration_mins: 180, poster_emoji: '🚀', backdrop_color: '#292524', cast: 'Prabhas, Deepika Padukone', director: 'Nag Ashwin', release_date: '2025-01-12', certificate: 'UA', status: 'COMING_SOON' },
  { id: 'm8', title: 'Deva', language: 'Hindi', genre: ['Action', 'Thriller'], rating: 'TBD', duration_mins: 150, poster_emoji: '🎯', backdrop_color: '#1C1917', cast: 'Shahid Kapoor, Pooja Hegde', director: 'Rosshan Andrrews', release_date: '2025-01-31', certificate: 'UA', status: 'COMING_SOON' },
  { id: 'm9', title: 'Mufasa: The Lion King', language: 'English', genre: ['Animation', 'Family'], rating: 'TBD', duration_mins: 118, poster_emoji: '🦁', backdrop_color: '#7C2D12', cast: 'Aaron Pierre, Kelvin Harrison Jr.', director: 'Barry Jenkins', release_date: '2024-12-20', certificate: 'U', status: 'COMING_SOON' },
];

function makeShowtimes(movieId: string): Showtime[] {
  const dates = [0, 1, 2].map(d => {
    const dt = new Date(); dt.setDate(dt.getDate() + d);
    return dt.toISOString().split('T')[0];
  });
  const theaters = [
    { name: 'Mana Community Screen', screen: 'Screen 1' },
    { name: 'PVR Cinemas', screen: 'PVR Gold' },
    { name: 'INOX Multiplex', screen: 'INOX Screen 3' },
  ];
  const times = ['10:00 AM', '1:30 PM', '4:45 PM', '8:00 PM', '10:30 PM'];
  const result: Showtime[] = [];
  dates.forEach(date => {
    theaters.forEach((theater, ti) => {
      const timeSubset = times.slice(ti, ti + 3);
      timeSubset.forEach((time, idx) => {
        result.push({
          id: `st-${movieId}-${date}-${ti}-${idx}`,
          movie_id: movieId,
          theater: theater.name,
          theater_screen: theater.screen,
          date,
          time,
          price_classic: 180,
          price_premium: 280,
          price_recliner: 450,
          available_seats: 20 + Math.floor(Math.random() * 80),
          total_seats: 120,
          format: ti === 1 ? '3D' : ti === 2 ? 'IMAX' : '2D',
        });
      });
    });
  });
  return result;
}

function makeSeatLayout(): SeatRow[] {
  const rows: SeatRow[] = [];
  const occupied = new Set<string>();
  // randomly mark ~35% occupied
  for (let r = 0; r < 10; r++) {
    for (let s = 1; s <= 12; s++) {
      if (Math.random() < 0.35) occupied.add(`${r}-${s}`);
    }
  }
  'ABCDE'.split('').forEach((row, ri) => {
    rows.push({
      row,
      seat_type: 'CLASSIC',
      seats: Array.from({ length: 12 }, (_, si) => ({
        number: si + 1,
        status: occupied.has(`${ri}-${si + 1}`) ? 'OCCUPIED' : 'AVAILABLE',
      })),
    });
  });
  'FGHIJ'.split('').forEach((row, ri) => {
    rows.push({
      row,
      seat_type: 'PREMIUM',
      seats: Array.from({ length: 10 }, (_, si) => ({
        number: si + 1,
        status: occupied.has(`${ri + 5}-${si + 1}`) ? 'OCCUPIED' : 'AVAILABLE',
      })),
    });
  });
  return rows;
}

// ── Service ──────────────────────────────────────────────────────────────────

export const movieService = {
  async getMovies(): Promise<{ now_showing: Movie[]; coming_soon: Movie[] }> {
    try {
      const r = await fetch(`${API_BASE}/v1/movies`);
      if (r.ok) { const d = await r.json(); if (d?.now_showing?.length > 0) return d; }
    } catch {}
    return { now_showing: NOW_SHOWING, coming_soon: COMING_SOON };
  },

  async getShowtimes(movieId: string): Promise<Showtime[]> {
    try {
      const r = await fetch(`${API_BASE}/v1/movies/${movieId}/showtimes`);
      if (r.ok) { const d = await r.json(); if (Array.isArray(d) && d.length > 0) return d; }
    } catch {}
    return makeShowtimes(movieId);
  },

  async getSeatLayout(showtimeId: string): Promise<SeatRow[]> {
    try {
      const r = await fetch(`${API_BASE}/v1/movies/showtimes/${showtimeId}/seats`);
      if (r.ok) { const d = await r.json(); if (Array.isArray(d) && d.length > 0) return d; }
    } catch {}
    return makeSeatLayout();
  },

  async bookTickets(payload: {
    showtime_id: string;
    movie_id: string;
    seats: string[];
    seat_type: SeatType;
    amount: number;
  }): Promise<BookingResult> {
    try {
      const r = await fetch(`${API_BASE}/v1/movies/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (r.ok) { const d = await r.json(); if (d?.booking_id) return d; }
    } catch {}
    const bookingId = `BMS-MANA-${Date.now()}`;
    const tr = `MANA-MOVIE-${Date.now()}`;
    return {
      booking_id: bookingId,
      upi_intent_url: `upi://pay?pa=movies@setu&pn=Mana+Movies&am=${payload.amount.toFixed(2)}&cu=INR&tr=${tr}&tn=Movie+Ticket+${bookingId}`,
      phone_pe_url: `phonepe://pay?pa=movies@setu&pn=Mana+Movies&am=${payload.amount.toFixed(2)}&cu=INR&tr=${tr}`,
      transaction_ref: tr,
      amount: payload.amount,
      seats: payload.seats,
      qr_data: `${bookingId}|${payload.seats.join(',')}|${payload.amount}`,
    };
  },
};
