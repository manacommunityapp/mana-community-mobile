import api from './apiClient';
import type { EventGalleryItemResponse } from '@/types/events';

export const eventGalleryService = {
  async getAlbums(eventId: number): Promise<string[]> {
    try {
      const res = await api.get<string[]>(`/events/${eventId}/gallery/albums`);
      return res.data;
    } catch {
      return ['All', 'Ceremony', 'Performances', 'Dinner', 'Highlights'];
    }
  },

  async getByEvent(eventId: number, album?: string): Promise<EventGalleryItemResponse[]> {
    try {
      const url = album && album !== 'All' ? `/events/${eventId}/gallery?album=${encodeURIComponent(album)}` : `/events/${eventId}/gallery`;
      const res = await api.get<EventGalleryItemResponse[]>(url);
      return res.data;
    } catch {
      return [
        { id: 1, eventId, url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800', mediaUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800', caption: 'Stage setup & lighting decoration', albumName: 'Ceremony', uploadedBy: 'Admin', createdAt: '2026-10-02T19:00:00Z' },
        { id: 2, eventId, url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800', mediaUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800', caption: 'Opening lamp lighting ceremony', albumName: 'Ceremony', uploadedBy: 'Ramesh', createdAt: '2026-10-02T19:30:00Z' },
        { id: 3, eventId, url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800', mediaUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800', caption: 'Kids classical dance troupe', albumName: 'Performances', uploadedBy: 'Priya', createdAt: '2026-10-02T20:15:00Z' },
        { id: 4, eventId, url: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800', mediaUrl: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800', caption: 'Community feast celebration', albumName: 'Dinner', uploadedBy: 'Sanjay', createdAt: '2026-10-02T21:00:00Z' },
      ];
    }
  },

  async create(data: { eventId: number; url: string; caption?: string; albumName?: string; uploadedBy?: string; mediaId?: number | string; mediaType?: string }): Promise<EventGalleryItemResponse> {
    try {
      const res = await api.post<EventGalleryItemResponse>(`/events/${data.eventId}/gallery`, data);
      return res.data;
    } catch {
      return {
        id: Date.now(),
        eventId: data.eventId,
        url: data.url,
        mediaUrl: data.url,
        caption: data.caption,
        albumName: data.albumName,
        uploadedBy: data.uploadedBy || 'User',
        createdAt: new Date().toISOString(),
      };
    }
  },

  async uploadPhoto(data: { eventId: number; mediaUrl: string; caption?: string; albumName?: string; mediaId?: number | string }): Promise<EventGalleryItemResponse> {
    return this.create({
      eventId: data.eventId,
      url: data.mediaUrl,
      caption: data.caption,
      albumName: data.albumName,
      mediaId: data.mediaId,
    });
  },
};
