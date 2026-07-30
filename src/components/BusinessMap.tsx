import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

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
  const mapInstance = useRef<any>(null);
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
  const MAPBOX_STYLE = 'mapbox://styles/tentacionfoodtore/cms72tj9w007o01qohkangdd4';

  useEffect(() => {
    if ((window as any).mapboxgl) {
      setIsLoaded(true);
      return;
    }

    // Add Mapbox CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.css';
    link.id = 'mapbox-css';
    document.head.appendChild(link);

    // Add Mapbox JS
    const script = document.createElement('script');
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.js';
    script.async = true;
    script.id = 'mapbox-js';
    script.onload = () => {
      setIsLoaded(true);
    };
    script.onerror = () => {
      setMapError('No se pudo cargar Mapbox. Por favor, revisa tu conexión.');
    };
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstance.current) return;

    const mapboxgl = (window as any).mapboxgl;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const validBiz = businesses.filter(b => b.latitude && b.longitude);
    
    // Average center
    const centerLngLat: [number, number] =
      validBiz.length > 0
        ? [
            validBiz.reduce((a, b) => a + b.longitude, 0) / validBiz.length,
            validBiz.reduce((a, b) => a + b.latitude, 0) / validBiz.length,
          ]
        : [-70.3126, -18.4783]; // Arica, Chile fallback

    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: MAPBOX_STYLE,
      center: centerLngLat,
      zoom: 13,
    });

    mapInstance.current = map;

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    validBiz.forEach(biz => {
      // Create custom HTML element for marker
      const el = document.createElement('div');
      el.style.position = 'relative';
      el.style.width = '48px';
      el.style.height = '48px';
      el.style.borderRadius = '50%';
      el.style.border = '3px solid #FFC31F';
      el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.25)';
      el.style.background = '#fff';
      el.style.cursor = 'pointer';
      el.style.transition = 'transform 0.15s';
      el.onmouseover = () => { el.style.transform = 'scale(1.15)'; };
      el.onmouseout = () => { el.style.transform = 'scale(1)'; };

      const img = document.createElement('img');
      img.src = biz.image;
      img.alt = biz.name;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.borderRadius = '50%';
      img.style.objectFit = 'cover';
      img.onerror = () => { img.src = 'https://juksmchvbblljkhixcda.supabase.co/storage/v1/object/public/images/uploads/default.png'; };
      el.appendChild(img);

      const arrow = document.createElement('div');
      arrow.style.position = 'absolute';
      arrow.style.bottom = '-11px';
      arrow.style.left = '50%';
      arrow.style.transform = 'translateX(-50%)';
      arrow.style.width = '0';
      arrow.style.height = '0';
      arrow.style.borderLeft = '8px solid transparent';
      arrow.style.borderRight = '8px solid transparent';
      arrow.style.borderTop = '10px solid #FFC31F';
      el.appendChild(arrow);

      const popupHtml = `
        <div style="min-width:140px;text-align:center;font-family:Inter,sans-serif;padding: 5px 0;">
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
      `;

      const popup = new mapboxgl.Popup({ offset: 20 }).setHTML(popupHtml);

      new mapboxgl.Marker(el)
        .setLngLat([biz.longitude, biz.latitude])
        .setPopup(popup)
        .addTo(map);
    });

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [isLoaded, businesses]);

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

  if (mapError) {
    return (
      <div className="w-full p-4 text-sm text-red-600 bg-red-50 rounded-2xl border border-red-100">
        {mapError}
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-lg border border-surface" style={{ height: '400px' }}>
      {!isLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/80 z-20 space-y-2">
          <Loader2 className="text-primary animate-spin" size={28} />
          <span className="text-xs text-muted font-medium">Cargando mapa interactivo...</span>
        </div>
      )}
      <div
        ref={mapRef}
        className="w-full h-full z-10"
      />
    </div>
  );
};
