import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, StatusBar, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { movieService, Movie, Showtime } from '@/services/movieService';
import { THEME, FONTS, SHADOWS } from '@/constants/config';

const LANG_FILTERS = ['All', 'Hindi', 'Telugu', 'Tamil', 'English', 'Malayalam'];

function MovieCard({ movie, onPress }: { movie: Movie; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        width: 140, borderRadius: 14, overflow: 'hidden',
        backgroundColor: '#fff', marginRight: 12,
        ...SHADOWS.card,
      }}
    >
      <View style={{ height: 160, backgroundColor: movie.backdrop_color, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 56 }}>{movie.poster_emoji}</Text>
        <View style={{
          position: 'absolute', top: 8, right: 8,
          backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
        }}>
          <Text style={{ color: '#FCD34D', fontFamily: FONTS.bold, fontSize: 11 }}>⭐ {movie.rating}</Text>
        </View>
        <View style={{
          position: 'absolute', bottom: 6, left: 6,
          backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1,
        }}>
          <Text style={{ color: '#fff', fontSize: 10, fontFamily: FONTS.medium }}>{movie.certificate}</Text>
        </View>
      </View>
      <View style={{ padding: 8 }}>
        <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: THEME.text, lineHeight: 16 }} numberOfLines={2}>{movie.title}</Text>
        <Text style={{ fontFamily: FONTS.regular, fontSize: 10, color: THEME.muted, marginTop: 3 }}>{movie.language} · {movie.duration_mins}m</Text>
        <Text style={{ fontFamily: FONTS.regular, fontSize: 10, color: THEME.muted }} numberOfLines={1}>{movie.genre.join(', ')}</Text>
      </View>
    </TouchableOpacity>
  );
}

function ShowtimeSelector({
  movie,
  showtimes,
  onSelect,
}: {
  movie: Movie;
  showtimes: Showtime[];
  onSelect: (st: Showtime) => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const dates = [...new Set(showtimes.map(s => s.date))].sort();
  const [selDate, setSelDate] = useState(dates[0] ?? today);

  const byDate = showtimes.filter(s => s.date === selDate);
  const theaters = [...new Set(byDate.map(s => s.theater))];

  function fmtDate(d: string) {
    const dt = new Date(d + 'T00:00:00');
    const diff = Math.round((dt.getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return dt.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Movie header */}
      <View style={{ backgroundColor: movie.backdrop_color, padding: 16, paddingTop: 52 }}>
        <TouchableOpacity style={{ marginBottom: 12 }} onPress={() => {}}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontFamily: FONTS.medium, fontSize: 13 }}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
          <View style={{ width: 70, height: 80, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 36 }}>{movie.poster_emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: '#fff', lineHeight: 22 }}>{movie.title}</Text>
            <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>{movie.language} · {movie.duration_mins}m · {movie.certificate}</Text>
            <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>{movie.genre.join(' · ')}</Text>
            <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>Dir: {movie.director}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: THEME.background }}>
        {/* Date selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {dates.map(d => (
            <TouchableOpacity
              key={d}
              onPress={() => setSelDate(d)}
              style={{
                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                backgroundColor: selDate === d ? THEME.primary : '#fff',
                borderWidth: 1.5, borderColor: selDate === d ? THEME.primary : '#E8E9F0',
              }}
            >
              <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: selDate === d ? '#fff' : THEME.text }}>{fmtDate(d)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Theaters + showtimes */}
        <View style={{ padding: 16, gap: 16 }}>
          {theaters.map(theater => {
            const slots = byDate.filter(s => s.theater === theater);
            return (
              <View key={theater} style={{ backgroundColor: '#fff', borderRadius: 14, padding: 14, ...SHADOWS.card }}>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: THEME.text }}>{theater}</Text>
                <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: THEME.muted, marginTop: 2 }}>{slots[0]?.theater_screen}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  {slots.map(slot => (
                    <TouchableOpacity
                      key={slot.id}
                      onPress={() => onSelect(slot)}
                      style={{
                        borderRadius: 8, borderWidth: 1.5, borderColor: '#E8E9F0',
                        paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#F5F5F7',
                      }}
                    >
                      <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: THEME.text }}>{slot.time}</Text>
                      <Text style={{ fontFamily: FONTS.medium, fontSize: 10, color: slot.format === 'IMAX' ? '#7C3AED' : slot.format === '3D' ? '#0284C7' : THEME.muted, marginTop: 2 }}>{slot.format}</Text>
                      <Text style={{ fontFamily: FONTS.regular, fontSize: 10, color: slot.available_seats < 20 ? '#DC2626' : '#16A34A', marginTop: 1 }}>
                        {slot.available_seats < 20 ? `${slot.available_seats} left!` : `${slot.available_seats} seats`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: THEME.muted, marginTop: 10 }}>
                  Classic ₹{slots[0]?.price_classic} · Premium ₹{slots[0]?.price_premium} · Recliner ₹{slots[0]?.price_recliner}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

export default function MoviesScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [langFilter, setLangFilter] = useState('All');
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['movies'],
    queryFn: () => movieService.getMovies(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: showtimes, isLoading: stLoading } = useQuery({
    queryKey: ['showtimes', selectedMovie?.id],
    queryFn: () => movieService.getShowtimes(selectedMovie!.id),
    enabled: !!selectedMovie,
    staleTime: 2 * 60 * 1000,
  });

  const handleShowtimeSelect = useCallback((st: Showtime) => {
    if (!selectedMovie) return;
    router.push({
      pathname: '/movies/book',
      params: {
        showtimeId: st.id,
        movieId: selectedMovie.id,
        movieTitle: selectedMovie.title,
        movieEmoji: selectedMovie.poster_emoji,
        backdropColor: selectedMovie.backdrop_color,
        theater: st.theater,
        date: st.date,
        time: st.time,
        format: st.format,
        priceClassic: st.price_classic,
        pricePremium: st.price_premium,
      },
    } as any);
  }, [selectedMovie, router]);

  // If movie selected, show showtimes
  if (selectedMovie) {
    if (stLoading) {
      return (
        <View style={{ flex: 1, backgroundColor: THEME.background, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={THEME.primary} size="large" />
        </View>
      );
    }
    return (
      <View style={{ flex: 1, backgroundColor: THEME.background }}>
        <StatusBar barStyle="light-content" />
        <ShowtimeSelector
          movie={selectedMovie}
          showtimes={showtimes ?? []}
          onSelect={handleShowtimeSelect}
        />
        {/* Provide back from within ShowtimeSelector via state */}
        <TouchableOpacity
          onPress={() => setSelectedMovie(null)}
          style={{
            position: 'absolute', top: Platform.OS === 'ios' ? 52 : 16, left: 16,
            backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
          }}
        >
          <Text style={{ color: '#fff', fontFamily: FONTS.semiBold, fontSize: 13 }}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const nowShowing = (data?.now_showing ?? []).filter(m =>
    (langFilter === 'All' || m.language === langFilter) &&
    m.title.toLowerCase().includes(search.toLowerCase())
  );
  const comingSoon = (data?.coming_soon ?? []).filter(m =>
    (langFilter === 'All' || m.language === langFilter) &&
    m.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={{ flex: 1, backgroundColor: THEME.background }}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={{ backgroundColor: '#1A1A2E', paddingTop: Platform.OS === 'ios' ? 52 : 20, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontFamily: FONTS.medium, fontSize: 14 }}>← Back</Text>
          </TouchableOpacity>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: '#fff' }}>🎬 Movies</Text>
          <View style={{ width: 40 }} />
        </View>
        {/* Search */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, paddingHorizontal: 12, height: 38 }}>
          <Text style={{ color: 'rgba(255,255,255,0.5)', marginRight: 8 }}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search movies..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            style={{ flex: 1, color: '#fff', fontFamily: FONTS.regular, fontSize: 14 }}
          />
        </View>
      </View>

      {/* Language filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ backgroundColor: '#1A1A2E', paddingBottom: 12 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {LANG_FILTERS.map(lang => (
          <TouchableOpacity
            key={lang}
            onPress={() => setLangFilter(lang)}
            style={{
              paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
              backgroundColor: langFilter === lang ? '#FCD34D' : 'rgba(255,255,255,0.1)',
            }}
          >
            <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: langFilter === lang ? '#1A1A2E' : '#fff' }}>{lang}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={THEME.primary} size="large" />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Now Showing */}
          {nowShowing.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: THEME.text, marginBottom: 12, paddingHorizontal: 16 }}>Now Showing</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                {nowShowing.map(movie => (
                  <MovieCard key={movie.id} movie={movie} onPress={() => setSelectedMovie(movie)} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Coming Soon */}
          {comingSoon.length > 0 && (
            <View style={{ marginTop: 24 }}>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: THEME.text, marginBottom: 12, paddingHorizontal: 16 }}>Coming Soon</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                {comingSoon.map(movie => (
                  <MovieCard key={movie.id} movie={movie} onPress={() => {}} />
                ))}
              </ScrollView>
            </View>
          )}

          {nowShowing.length === 0 && comingSoon.length === 0 && (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 48 }}>🎬</Text>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: THEME.text, marginTop: 12 }}>No movies found</Text>
              <Text style={{ fontFamily: FONTS.regular, fontSize: 14, color: THEME.muted, marginTop: 6 }}>Try a different search or language</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
