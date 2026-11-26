import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOWS } from '@/constants/config';

export interface MapCoordinatePoint {
  lat?: number | null;
  lng?: number | null;
  address?: string;
}

export interface LiveRouteMapProps {
  pickup?: MapCoordinatePoint | null;
  destination?: MapCoordinatePoint | null;
  driver?: { lat?: number | null; lng?: number | null; label?: string } | null;
  serviceZone?: { lat: number; lng: number; radiusKm: number; name?: string } | null;
  followDriverDefault?: boolean;
  height?: number;
  statusBanner?: string;
}

function isValidCoord(lat?: number | null, lng?: number | null): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0)
  );
}

const LEAFLET_HTML = `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #map { width: 100%; height: 100%; background: #EEF2FF; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
    .fallback {
      position: absolute; inset: 0; display: none; flex-direction: column;
      align-items: center; justify-content: center; background: linear-gradient(135deg, #E0E7FF, #F8FAFC);
      color: #1E293B; padding: 16px; text-align: center;
    }
    .pin-dot { width: 16px; height: 16px; border-radius: 50%; background: #10B981; border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,.3); }
    .dest-pin { width: 18px; height: 18px; border-radius: 50% 50% 50% 0; background: #EF4444; transform: rotate(-45deg); border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,.35); }
    .driver-car {
      width: 28px; height: 28px; border-radius: 14px; background: #2563EB; color: #fff;
      display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700;
      border: 2.5px solid #fff; box-shadow: 0 3px 10px rgba(37,99,235,0.45);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="fallback" class="fallback">
    <div style="font-weight:700;margin-bottom:4px;">Live Route Telemetry</div>
    <div id="fbText" style="font-size:12px;color:#475569;"></div>
  </div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    (function() {
      var map, pickupMarker, destMarker, driverMarker, routeLine, approachLine, zoneCircle;
      var lastDriver = null, animFrame = null;

      function ensureMap() {
        if (typeof L === 'undefined') {
          document.getElementById('fallback').style.display = 'flex';
          return false;
        }
        if (!map) {
          map = L.map('map', { zoomControl: false, attributionControl: false }).setView([17.3850, 78.4867], 13);
          L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            subdomains: 'abcd'
          }).addTo(map);
        }
        return true;
      }

      function valid(p) {
        return p && typeof p.lat === 'number' && typeof p.lng === 'number' && isFinite(p.lat) && isFinite(p.lng) && !(p.lat === 0 && p.lng === 0);
      }

      function animateDriver(toLat, toLng, follow) {
        if (!driverMarker) {
          driverMarker = L.marker([toLat, toLng], {
            icon: L.divIcon({ className: '', html: '<div class="driver-car">D</div>', iconSize: [28, 28], iconAnchor: [14, 14] }),
            zIndexOffset: 1000
          }).addTo(map);
          lastDriver = { lat: toLat, lng: toLng };
          if (follow) map.panTo([toLat, toLng], { animate: true });
          return;
        }
        if (animFrame) cancelAnimationFrame(animFrame);
        var from = lastDriver || { lat: toLat, lng: toLng };
        var start = performance.now();
        var duration = 850;
        function step(now) {
          var t = Math.min(1, (now - start) / duration);
          var ease = t * (2 - t);
          var lat = from.lat + (toLat - from.lat) * ease;
          var lng = from.lng + (toLng - from.lng) * ease;
          driverMarker.setLatLng([lat, lng]);
          lastDriver = { lat: lat, lng: lng };
          if (follow && t >= 1) map.panTo([toLat, toLng], { animate: true });
          if (t < 1) animFrame = requestAnimationFrame(step);
        }
        animFrame = requestAnimationFrame(step);
      }

      window.__updateRouteMap = function(state) {
        if (!ensureMap()) {
          var txt = [];
          if (valid(state.pickup)) txt.push('Pickup: ' + state.pickup.lat.toFixed(4) + ', ' + state.pickup.lng.toFixed(4));
          if (valid(state.destination)) txt.push('Drop: ' + state.destination.lat.toFixed(4) + ', ' + state.destination.lng.toFixed(4));
          if (valid(state.driver)) txt.push('Driver: ' + state.driver.lat.toFixed(4) + ', ' + state.driver.lng.toFixed(4));
          document.getElementById('fbText').textContent = txt.join('  •  ') || 'Waiting for GPS coordinates';
          return;
        }

        var bounds = [];
        if (valid(state.pickup)) {
          var pLatLng = [state.pickup.lat, state.pickup.lng];
          bounds.push(pLatLng);
          if (!pickupMarker) {
            pickupMarker = L.marker(pLatLng, {
              icon: L.divIcon({ className: '', html: '<div class="pin-dot"></div>', iconSize: [16, 16], iconAnchor: [8, 8] })
            }).addTo(map);
          } else {
            pickupMarker.setLatLng(pLatLng);
          }
        }
        if (valid(state.destination)) {
          var dLatLng = [state.destination.lat, state.destination.lng];
          bounds.push(dLatLng);
          if (!destMarker) {
            destMarker = L.marker(dLatLng, {
              icon: L.divIcon({ className: '', html: '<div class="dest-pin"></div>', iconSize: [18, 18], iconAnchor: [9, 18] })
            }).addTo(map);
          } else {
            destMarker.setLatLng(dLatLng);
          }
        }

        if (valid(state.pickup) && valid(state.destination)) {
          var pts = [[state.pickup.lat, state.pickup.lng], [state.destination.lat, state.destination.lng]];
          if (!routeLine) {
            routeLine = L.polyline(pts, { color: '#4F46E5', weight: 4, opacity: 0.85, dashArray: '8 6' }).addTo(map);
          } else {
            routeLine.setLatLngs(pts);
          }
        }

        if (state.serviceZone && valid(state.serviceZone)) {
          var zPts = [state.serviceZone.lat, state.serviceZone.lng];
          if (!zoneCircle) {
            zoneCircle = L.circle(zPts, {
              radius: (state.serviceZone.radiusKm || 15) * 1000,
              color: '#4F46E5', weight: 1.5, fillColor: '#4F46E5', fillOpacity: 0.06
            }).addTo(map);
          }
        }

        if (valid(state.driver)) {
          bounds.push([state.driver.lat, state.driver.lng]);
          animateDriver(state.driver.lat, state.driver.lng, !!state.followDriver);
          if (valid(state.pickup)) {
            var aPts = [[state.driver.lat, state.driver.lng], [state.pickup.lat, state.pickup.lng]];
            if (!approachLine) {
              approachLine = L.polyline(aPts, { color: '#2563EB', weight: 3, opacity: 0.7 }).addTo(map);
            } else {
              approachLine.setLatLngs(aPts);
            }
          }
        }

        if (state.recenter || (!state.followDriver && bounds.length >= 2 && !window.__didFit)) {
          window.__didFit = true;
          map.fitBounds(bounds, { padding: [36, 36], maxZoom: 15 });
        } else if (bounds.length === 1 && !window.__didFit) {
          window.__didFit = true;
          map.setView(bounds[0], 14);
        }
      };

      function onMsg(e) {
        try { window.__updateRouteMap(JSON.parse(e.data)); } catch (_) {}
      }
      window.addEventListener('message', onMsg);
      document.addEventListener('message', onMsg);
    })();
  </script>
</body>
</html>`;

export function LiveRouteMap({
  pickup,
  destination,
  driver,
  serviceZone,
  followDriverDefault = true,
  height = 220,
  statusBanner,
}: LiveRouteMapProps) {
  const webRef = useRef<any>(null);
  const [followDriver, setFollowDriver] = useState(followDriverDefault);
  const [recenterTick, setRecenterTick] = useState(0);

  const hasPickup = isValidCoord(pickup?.lat, pickup?.lng);
  const hasDest = isValidCoord(destination?.lat, destination?.lng);
  const hasDriver = isValidCoord(driver?.lat, driver?.lng);

  const payload = useMemo(
    () => ({
      pickup: hasPickup ? { lat: pickup!.lat, lng: pickup!.lng } : null,
      destination: hasDest ? { lat: destination!.lat, lng: destination!.lng } : null,
      driver: hasDriver ? { lat: driver!.lat, lng: driver!.lng, label: driver?.label } : null,
      serviceZone: serviceZone ? { lat: serviceZone.lat, lng: serviceZone.lng, radiusKm: serviceZone.radiusKm } : null,
      followDriver,
      recenter: recenterTick > 0,
    }),
    [hasPickup, hasDest, hasDriver, pickup?.lat, pickup?.lng, destination?.lat, destination?.lng, driver?.lat, driver?.lng, driver?.label, serviceZone, followDriver, recenterTick],
  );

  const pushUpdate = (data = payload) => {
    const json = JSON.stringify(data);
    const serialized = json.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    webRef.current?.injectJavaScript?.(`window.__updateRouteMap && window.__updateRouteMap(JSON.parse('${serialized}')); true;`);
    webRef.current?.postMessage?.(json);
  };

  useEffect(() => {
    pushUpdate(payload);
  }, [payload]);

  return (
    <View style={[s.wrapper, { height }]}>
      <WebView
        ref={webRef}
        source={{ html: LEAFLET_HTML }}
        style={s.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        onLoadEnd={() => pushUpdate(payload)}
        scrollEnabled={false}
      />

      <View style={s.topOverlay}>
        <View style={s.telemetryPill}>
          <Ionicons name={hasDriver ? 'navigate-circle' : 'map-outline'} size={14} color={COLORS.primary} />
          <Text style={s.telemetryText} numberOfLines={1}>
            {statusBanner ||
              (hasDriver
                ? `Live Driver ${driver!.lat!.toFixed(4)}, ${driver!.lng!.toFixed(4)}`
                : hasPickup
                ? 'Interactive Route Map Ready'
                : 'Select pickup & dropoff points')}
          </Text>
        </View>
      </View>

      <View style={s.controlsCol}>
        {hasDriver && (
          <TouchableOpacity
            style={[s.controlBtn, followDriver && s.controlBtnActive]}
            onPress={() => setFollowDriver((v) => !v)}
            activeOpacity={0.85}
          >
            <Ionicons name="locate" size={16} color={followDriver ? '#fff' : COLORS.primary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={s.controlBtn}
          onPress={() => setRecenterTick((t) => t + 1)}
          activeOpacity={0.85}
        >
          <Ionicons name="scan-outline" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#EEF2FF',
    ...SHADOWS.sm,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 54,
    pointerEvents: 'none',
  },
  telemetryPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    ...SHADOWS.sm,
  },
  telemetryText: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
  },
  controlsCol: {
    position: 'absolute',
    top: 10,
    right: 10,
    gap: 6,
  },
  controlBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  controlBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
});
