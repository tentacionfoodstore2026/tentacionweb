import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';

export interface MapBusiness {
  id: string;
  name: string;
  image: string;
  latitude: number;
  longitude: number;
  address?: string;
}

interface BusinessMapProps {
  businesses: MapBusiness[];
}

export const BusinessMap: React.FC<BusinessMapProps> = ({ businesses }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    // Default center: use average of all business coords, or Chile fallback
    const validBiz = businesses.filter(b => b.latitude && b.longitude);
    const center: [number, number] =
      validBiz.length > 0
        ? [
            validBiz.reduce((a, b) => a + b.latitude, 0) / validBiz.length,
            validBiz.reduce((a, b) => a + b.longitude, 0) / validBiz.length,
          ]
        : [-18.4783, -70.3126]; // Arica, Chile fallback

    const map = L.map(mapRef.current, {
      center,
      zoom: 14,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    validBiz.forEach(biz => {
      // Create a custom divIcon with the business logo
      const icon = L.divIcon({
        className: '',
        iconSize: [48, 48],
        iconAnchor: [24, 48],
        popupAnchor: [0, -50],
        html: `
          <div style="
            width:48px;height:48px;border-radius:50%;
            border:3px solid #FFC31F;
            box-shadow:0 4px 16px rgba(0,0,0,0.25);
            overflow:hidden;background:#fff;cursor:pointer;
            transition:transform 0.15s;
          " onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">
            <img src="${biz.image}" alt="${biz.name}"
              style="width:100%;height:100%;object-fit:cover;"
              onerror="this.src='https://juksmchvbblljkhixcda.supabase.co/storage/v1/object/public/images/uploads/default.png'"
            />
          </div>
          <div style="
            position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);
            width:0;height:0;
            border-left:8px solid transparent;
            border-right:8px solid transparent;
            border-top:10px solid #FFC31F;
          "></div>
        `,
      });

      const marker = L.marker([biz.latitude, biz.longitude], { icon }).addTo(map);

      marker.bindPopup(`
        <div style="min-width:140px;text-align:center;font-family:Inter,sans-serif;">
          <img src="${biz.image}" alt="${biz.name}"
            style="width:60px;height:60px;border-radius:50%;object-fit:cover;margin:0 auto 8px;display:block;border:2px solid #FFC31F;"
            onerror="this.src=''"
          />
          <strong style="font-size:13px;color:#1F1F1F;">${biz.name}</strong>
          ${biz.address ? `<p style="font-size:11px;color:#4B4847;margin:4px 0 0;">${biz.address}</p>` : ''}
          <button
            onclick="window.dispatchEvent(new CustomEvent('navigate-business',{detail:'${biz.id}'}))"
            style="
              margin-top:10px;display:inline-block;
              background:#FFC31F;color:#1F1F1F;
              border:none;border-radius:8px;
              padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;
            "
          >Ver comercio →</button>
        </div>
      `, { maxWidth: 200 });
    });

    leafletMap.current = map;

    return () => {
      map.remove();
      leafletMap.current = null;
    };
  }, [businesses]);

  // Listen for the custom navigation event from popup buttons
  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      navigate(`/business/${id}`);
    };
    window.addEventListener('navigate-business', handler);
    return () => window.removeEventListener('navigate-business', handler);
  }, [navigate]);

  const validBiz = businesses.filter(b => b.latitude && b.longitude);

  if (validBiz.length === 0) {
    return (
      <div className="w-full h-72 bg-surface rounded-2xl border border-dashed border-muted/30 flex flex-col items-center justify-center text-muted">
        <span className="text-4xl mb-3">🗺️</span>
        <p className="font-medium">No hay ubicaciones disponibles aún</p>
        <p className="text-sm opacity-60">Los comercios deben tener coordenadas configuradas</p>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className="w-full rounded-2xl overflow-hidden shadow-lg border border-surface"
      style={{ height: '400px', zIndex: 1 }}
    />
  );
};
