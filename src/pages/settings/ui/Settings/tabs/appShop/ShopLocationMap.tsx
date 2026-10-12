import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";

/** Центр Бишкека — пока у магазина нет точки. */
const DEFAULT_CENTER: [number, number] = [42.8746, 74.5698];

type Props = {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  disabled?: boolean;
};

const round = (n: number) => Math.round(n * 1e6) / 1e6;

/**
 * Небольшая карта OpenStreetMap: точку можно перетащить или поставить кликом.
 * Leaflet грузится лениво — только когда открыта вкладка.
 */
export function ShopLocationMap({ lat, lng, onChange, disabled }: Props) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const onChangeRef = useRef(onChange);
  const disabledRef = useRef(disabled);
  const [failed, setFailed] = useState(false);
  onChangeRef.current = onChange;
  disabledRef.current = disabled;

  const hasPoint = lat !== null && lng !== null;

  const placeMarker = (L: typeof import("leaflet"), map: LeafletMap, at: [number, number]) => {
    if (markerRef.current) {
      markerRef.current.setLatLng(at);
      return;
    }
    const icon = L.divIcon({
      className: "appshop-map__pin",
      html: '<span class="appshop-map__pinDot"></span>',
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });
    const marker = L.marker(at, { draggable: !disabledRef.current, icon, keyboard: true }).addTo(map);
    marker.on("dragend", () => {
      const p = marker.getLatLng();
      onChangeRef.current(round(p.lat), round(p.lng));
    });
    markerRef.current = marker;
  };

  // Создание карты
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const L = await import("leaflet");
        await import("leaflet/dist/leaflet.css");
        if (cancelled || !boxRef.current) return;
        leafletRef.current = L;
        const start: [number, number] = hasPoint ? [lat as number, lng as number] : DEFAULT_CENTER;
        const map = L.map(boxRef.current, { center: start, zoom: hasPoint ? 16 : 12, scrollWheelZoom: false });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);
        if (hasPoint) placeMarker(L, map, start);
        map.on("click", (e: any) => {
          if (disabledRef.current) return;
          const p = e.latlng;
          placeMarker(L, map, [p.lat, p.lng]);
          onChangeRef.current(round(p.lat), round(p.lng));
        });
        mapRef.current = map;
        // Карта в скрытом/только что показанном контейнере — пересчитать размер.
        setTimeout(() => map.invalidateSize(), 0);
      } catch (e) {
        console.error(e);
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Координаты поменялись снаружи (ввод числами, «Найти по адресу», другой филиал)
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (!hasPoint) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    const at: [number, number] = [lat as number, lng as number];
    const cur = markerRef.current?.getLatLng();
    if (!cur || Math.abs(cur.lat - at[0]) > 1e-7 || Math.abs(cur.lng - at[1]) > 1e-7) {
      placeMarker(L, map, at);
      map.setView(at, Math.max(map.getZoom(), 16));
    }
  }, [lat, lng, hasPoint]);

  useEffect(() => {
    const m = markerRef.current as any;
    if (!m?.dragging) return;
    if (disabled) m.dragging.disable();
    else m.dragging.enable();
  }, [disabled]);

  if (failed) return null;
  return <div ref={boxRef} className="appshop-map" />;
}
