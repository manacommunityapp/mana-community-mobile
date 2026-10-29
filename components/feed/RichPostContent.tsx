import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PostDto } from '@/types/api';
import { COLORS, RADIUS, SHADOWS, FONTS } from '@/constants/config';

interface RichPostContentProps {
  post: PostDto;
  onHashtagPress?: (hashtag: string) => void;
}

interface ActionRedirect {
  label: string;
  sublabel?: string;
  route: string;
  isExternal?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  borderColor: string;
}

// Regex to extract URL from text
const URL_REGEX = /(https?:\/\/[^\s]+)/gi;

function extractDomain(url?: string): string {
  if (!url) return '';
  try {
    const match = url.match(/^https?:\/\/([^/?#]+)(?:[/?#]|$)/i);
    return match ? match[1].replace(/^www\./, '') : url;
  } catch {
    return url;
  }
}

/**
 * Resolves whether this post links to or relates to an in-app module (Events, Sports, Marketplace, Facilities, etc.)
 * or an external link, and returns a clean, direct Action Button configuration.
 */
function resolveModuleAction(post: PostDto, activeLinkUrl: string | null): ActionRedirect | null {
  const typeStr = String(post.type || post.postType || '').toLowerCase();
  const rawContent = (post.content || '').toLowerCase();
  const titleStr = (post.title || '').toLowerCase();
  const linkStr = (activeLinkUrl || '').toLowerCase();
  const combined = `${rawContent} ${titleStr} ${linkStr} ${post.hashtags || ''}`.toLowerCase();

  // 1. Events Module
  if (
    typeStr === 'event' ||
    linkStr.includes('/events') ||
    combined.includes('#event') ||
    combined.includes('#events') ||
    (combined.includes('event') && (combined.includes('register') || combined.includes('rsvp') || combined.includes('invitation')))
  ) {
    const eventIdMatch = linkStr.match(/\/events\/(\d+)/);
    return {
      label: 'View Event & Passes',
      sublabel: 'RSVP, schedule & details',
      route: eventIdMatch ? `/events/${eventIdMatch[1]}` : '/tabs/events',
      icon: 'calendar',
      color: '#4F46E5',
      bg: '#EEF2FF',
      borderColor: '#C7D2FE',
    };
  }

  // 2. Sports Module
  if (
    typeStr === 'sports' ||
    linkStr.includes('/sports') ||
    combined.includes('#sports') ||
    combined.includes('#tournament') ||
    combined.includes('#badminton') ||
    combined.includes('#cricket') ||
    combined.includes('sports tournament') ||
    combined.includes('sports league')
  ) {
    return {
      label: 'Open Sports Hub',
      sublabel: 'Matches, teams & tournaments',
      route: '/sports',
      icon: 'trophy',
      color: '#059669',
      bg: '#ECFDF5',
      borderColor: '#A7F3D0',
    };
  }

  // 3. Marketplace & Buy/Sell
  if (
    typeStr === 'marketplace' ||
    typeStr === 'classified' ||
    linkStr.includes('/marketplace') ||
    linkStr.includes('/bazaar') ||
    combined.includes('#buysell') ||
    combined.includes('#marketplace') ||
    combined.includes('#forsale') ||
    post.price !== undefined
  ) {
    return {
      label: 'Browse Marketplace',
      sublabel: post.price ? `Listed for ₹${Number(post.price).toLocaleString('en-IN')}` : 'View listing & contact seller',
      route: '/tabs/marketplace',
      icon: 'storefront',
      color: '#7C3AED',
      bg: '#F5F3FF',
      borderColor: '#DDD6FE',
    };
  }

  // 4. Lost & Found
  if (
    typeStr === 'lost_found' ||
    linkStr.includes('/lost-found') ||
    combined.includes('#lostfound') ||
    combined.includes('#lostandfound') ||
    combined.includes('lost item') ||
    combined.includes('found item')
  ) {
    return {
      label: 'View in Lost & Found',
      sublabel: post.location ? `Reported at ${post.location}` : 'Contact security / finder',
      route: '/marketplace/lost-found',
      icon: 'search',
      color: '#D97706',
      bg: '#FFFBEB',
      borderColor: '#FDE68A',
    };
  }

  // 5. Facility & Amenities Booking
  if (
    linkStr.includes('/facilities') ||
    linkStr.includes('/bookings') ||
    combined.includes('#amenity') ||
    combined.includes('#clubhouse') ||
    combined.includes('facility booking') ||
    combined.includes('court booking') ||
    combined.includes('swimming pool slot')
  ) {
    return {
      label: 'Book Facility / Court',
      sublabel: 'Clubhouse, gym & slots',
      route: '/facilities',
      icon: 'fitness',
      color: '#0D9488',
      bg: '#F0FDFA',
      borderColor: '#99F6E4',
    };
  }

  // 6. Helpdesk & Tickets
  if (
    linkStr.includes('/helpdesk') ||
    linkStr.includes('/tickets') ||
    combined.includes('#helpdesk') ||
    combined.includes('#ticket') ||
    combined.includes('#plumber') ||
    combined.includes('#electrician') ||
    (combined.includes('complaint') && combined.includes('service'))
  ) {
    return {
      label: 'Open Smart Helpdesk',
      sublabel: 'Raise ticket or track status',
      route: '/helpdesk',
      icon: 'headset',
      color: '#0891B2',
      bg: '#ECFEFF',
      borderColor: '#A5F3FC',
    };
  }

  // 7. Maintenance Dues & Finance
  if (
    linkStr.includes('/finance') ||
    combined.includes('#maintenance') ||
    combined.includes('#dues') ||
    combined.includes('maintenance dues') ||
    combined.includes('pay dues')
  ) {
    return {
      label: 'Pay Maintenance Dues',
      sublabel: 'View society invoices & auto-pay',
      route: '/finance',
      icon: 'card',
      color: '#2563EB',
      bg: '#EFF6FF',
      borderColor: '#BFDBFE',
    };
  }

  // 8. Notices & Circulars
  if (
    typeStr === 'announcement' ||
    linkStr.includes('/notices') ||
    combined.includes('#notice') ||
    combined.includes('#circular') ||
    post.official
  ) {
    return {
      label: 'View Society Notices',
      sublabel: 'Official announcements & circulars',
      route: '/notices',
      icon: 'newspaper',
      color: '#4F46E5',
      bg: '#EEF2FF',
      borderColor: '#C7D2FE',
    };
  }

  // 9. Master Calendar
  if (
    linkStr.includes('/calendar') ||
    combined.includes('#calendar') ||
    combined.includes('master calendar')
  ) {
    return {
      label: 'Open Master Calendar',
      sublabel: 'Society schedule & poojas',
      route: '/calendar',
      icon: 'calendar-number',
      color: '#6366F1',
      bg: '#EEF2FF',
      borderColor: '#C7D2FE',
    };
  }

  // 10. External Web Link (when an actual URL is provided or extracted)
  if (activeLinkUrl && activeLinkUrl.startsWith('http')) {
    const domain = extractDomain(activeLinkUrl);
    return {
      label: post.linkTitle || `Open Link (${domain})`,
      sublabel: post.linkDescription || activeLinkUrl,
      route: activeLinkUrl,
      isExternal: true,
      icon: 'globe-outline',
      color: '#2563EB',
      bg: '#F8FAFC',
      borderColor: '#E2E8F0',
    };
  }

  return null;
}

export function RichPostContent({ post, onHashtagPress }: RichPostContentProps) {
  const router = useRouter();
  const rawContent = post.content || '';

  // Extract any URL
  const detectedUrls = rawContent.match(URL_REGEX);
  const activeLinkUrl = post.linkUrl || (detectedUrls ? detectedUrls[0] : null);

  // Clean raw URLs from the displayed text so users see a clean post without ugly links
  const cleanedContent = useMemo(() => {
    return rawContent.replace(URL_REGEX, '').trim();
  }, [rawContent]);

  const moduleAction = useMemo(() => {
    return resolveModuleAction(post, activeLinkUrl);
  }, [post, activeLinkUrl]);

  const handleActionPress = () => {
    if (!moduleAction) return;
    if (moduleAction.isExternal) {
      Linking.canOpenURL(moduleAction.route)
        .then((supported) => {
          if (supported) Linking.openURL(moduleAction.route);
        })
        .catch(() => {});
    } else {
      router.push(moduleAction.route as any);
    }
  };

  // Render text with clickable #hashtags and @mentions
  const renderFormattedText = () => {
    const displayText = cleanedContent || rawContent;
    const words = displayText.split(/(\s+)/);

    return (
      <Text style={styles.textContent}>
        {words.map((word, i) => {
          if (word.startsWith('#') && word.length > 1) {
            return (
              <Text
                key={i}
                style={styles.hashtag}
                onPress={() => onHashtagPress && onHashtagPress(word)}
              >
                {word}
              </Text>
            );
          }
          if (word.startsWith('@') && word.length > 1) {
            return (
              <Text key={i} style={styles.mention}>
                {word}
              </Text>
            );
          }
          return word;
        })}
      </Text>
    );
  };

  return (
    <View style={styles.container}>
      {/* Post Title if available */}
      {post.title ? (
        <Text style={styles.titleText}>{post.title}</Text>
      ) : null}

      {/* Main Clean Formatted Text (Raw links hidden) */}
      {renderFormattedText()}

      {/* Price Pill for Classifieds / Marketplace */}
      {post.price !== undefined && post.price !== null && (
        <View style={styles.priceRow}>
          <View style={styles.priceBadge}>
            <Ionicons name="pricetag" size={12} color="#059669" />
            <Text style={styles.priceText}>
              ₹{Number(post.price).toLocaleString('en-IN')}
            </Text>
          </View>
          {post.location ? (
            <View style={styles.locationBadge}>
              <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
              <Text style={styles.locationText}>{post.location}</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Location tag for Lost & Found */}
      {post.price === undefined && post.location ? (
        <View style={styles.locationBadge}>
          <Ionicons name="location-outline" size={13} color={COLORS.primary} />
          <Text style={styles.locationText}>Location: {post.location}</Text>
        </View>
      ) : null}

      {/* Action Button that redirects directly to the specific module */}
      {moduleAction && (
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: moduleAction.bg, borderColor: moduleAction.borderColor },
          ]}
          onPress={handleActionPress}
          activeOpacity={0.78}
        >
          <View style={[styles.actionIconWrap, { backgroundColor: '#fff' }]}>
            <Ionicons name={moduleAction.icon} size={18} color={moduleAction.color} />
          </View>

          <View style={styles.actionTextWrap}>
            <Text style={[styles.actionTitle, { color: moduleAction.color }]} numberOfLines={1}>
              {moduleAction.label}
            </Text>
            {moduleAction.sublabel ? (
              <Text style={styles.actionSublabel} numberOfLines={1}>
                {moduleAction.sublabel}
              </Text>
            ) : null}
          </View>

          <View style={styles.actionArrowWrap}>
            <Ionicons
              name={moduleAction.isExternal ? 'open-outline' : 'arrow-forward'}
              size={16}
              color={moduleAction.color}
            />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: FONTS.bold,
    marginBottom: 6,
    lineHeight: 20,
  },
  textContent: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 21,
    fontFamily: FONTS.regular,
  },
  hashtag: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  mention: {
    color: '#0891B2',
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  priceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  priceText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  locationText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
    ...SHADOWS.sm,
  },
  actionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  actionTextWrap: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },
  actionSublabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  actionArrowWrap: {
    paddingLeft: 4,
  },
});
