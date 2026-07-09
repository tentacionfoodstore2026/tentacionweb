import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/useStore';
import { MapPin, Search, Loader2 } from 'lucide-react';

interface MapPickerProps {
  address: string;
  onChangeAddress: (address: string) => void;
}

export const MapPicker: React.FC<MapPickerProps> = ({ address, onChangeAddress }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletInstance = useRef<any>(null);
  const markerInstance = useRef<any>(null);
  const { portalSettings } = useAuthStore();
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingGeocode, setLoadingGeocode] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Load Leaflet CSS and JS dynamically from CDN to avoid bundling/path issues with Vite
  useEffect(() => {
    if ((window as any).L) {
      setIsLoaded(true);
      return;
    }

    // Add Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.id = 'leaflet-css';
    document.head.appendChild(link);

    // Add Leaflet JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.id = 'leaflet-js';
    script.onload = () => {
      setIsLoaded(true);
    };
    script.onerror = () => {
      setMapError('No se pudo cargar el mapa. Por favor, revisa tu conexión.');
    };
    document.head.appendChild(script);

    return () => {
      // We keep scripts loaded on head for subsequent mounts, which is faster and cleaner
    };
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || leafletInstance.current) return;

    const L = (window as any).L;

    // Standard fix for Leaflet default icon paths in bundlers like Vite
    const DefaultIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
    L.Marker.prototype.options.icon = DefaultIcon;

    // Default coordinates: Arica, Chile (-18.4783, -70.3126)
    const defaultLat = -18.4783;
    const defaultLng = -70.3126;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: true
    }).setView([defaultLat, defaultLng], 13);
    
    leafletInstance.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    const marker = L.marker([defaultLat, defaultLng], {
      draggable: true
    }).addTo(map);
    markerInstance.current = marker;

    // Reverse Geocoding helper
    const reverseGeocode = async (lat: number, lng: number) => {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
          headers: {
            'Accept-Language': 'es'
          }
        });
        const data = await response.json();
        if (data && data.display_name) {
          // Format address to be cleaner (e.g. removing very long details at the end)
          const parts = data.display_name.split(',');
          // Take first 4 components of address for a cleaner input value
          const cleanAddress = parts.slice(0, 4).map((p: string) => p.trim()).join(', ');
          onChangeAddress(cleanAddress);
        }
      } catch (err) {
        console.error('Error reverse geocoding:', err);
      }
    };

    // Handle marker dragend
    marker.on('dragend', async () => {
      const position = marker.getLatLng();
      map.panTo(position);
      await reverseGeocode(position.lat, position.lng);
    });

    // Handle map click to place marker
    map.on('click', async (e: any) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      map.panTo([lat, lng]);
      await reverseGeocode(lat, lng);
    });

    // Initial positioning based on address or portal setting
    const locateInitialPosition = async () => {
      const initialSearchText = address || portalSettings?.address || 'Arica, Chile';
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(initialSearchText)}&limit=1`, {
          headers: {
            'Accept-Language': 'es'
          }
        });
        const data = await response.json();
        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          const newCoords = [parseFloat(lat), parseFloat(lon)];
          marker.setLatLng(newCoords);
          map.setView(newCoords, address ? 16 : 13);
        }
      } catch (err) {
        console.error('Error initial geocoding:', err);
      }
    };

    locateInitialPosition();
  }, [isLoaded]);

  // Geocodes the text input address and centers the map/marker on it
  const handleLocateAddress = async () => {
    if (!leafletInstance.current || !markerInstance.current || !address) return;
    setLoadingGeocode(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`, {
        headers: {
          'Accept-Language': 'es'
        }
      });
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const newCoords = [parseFloat(lat), parseFloat(lon)];
        markerInstance.current.setLatLng(newCoords);
        leafletInstance.current.setView(newCoords, 16);
      } else {
        alert('No se pudo encontrar la dirección especificada en el mapa. Intenta con una dirección más simple o arrastra el pin.');
      }
    } catch (err) {
      console.error('Error geocoding address:', err);
      alert('Ocurrió un error al buscar la dirección en el mapa.');
    } finally {
      setLoadingGeocode(false);
    }
  };

  if (mapError) {
    return (
      <div className="w-full p-4 text-sm text-red-600 bg-red-50 rounded-2xl border border-red-100">
        {mapError}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted flex items-center space-x-1.5">
          <MapPin size={12} className="text-primary animate-bounce" />
          <span>Arrastra el marcador o haz clic para precisar tu ubicación exacta</span>
        </span>
        <button
          type="button"
          onClick={handleLocateAddress}
          disabled={loadingGeocode || !address}
          className="text-xs bg-primary/10 hover:bg-primary/20 disabled:bg-dark/5 disabled:text-muted/50 text-primary px-3 py-1.5 rounded-xl transition-all font-medium flex items-center space-x-1 border border-primary/20 disabled:border-transparent cursor-pointer"
        >
          {loadingGeocode ? (
            <Loader2 size={12} className="animate-spin mr-1" />
          ) : (
            <Search size={12} className="mr-1" />
          )}
          <span>Ubicar dirección escrita</span>
        </button>
      </div>
      
      <div className="relative rounded-2xl border border-surface shadow-inner overflow-hidden" style={{ height: '280px' }}>
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
    </div>
  );
};
