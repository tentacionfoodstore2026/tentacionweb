import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/useStore';
import { MapPin, Search, Loader2 } from 'lucide-react';

interface MapPickerProps {
  address: string;
  onChangeAddress: (address: string) => void;
  latitude?: number;
  longitude?: number;
  onChangeLocation?: (lat: number, lng: number) => void;
}

export const MapPicker: React.FC<MapPickerProps> = ({ address, onChangeAddress, latitude, longitude, onChangeLocation }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerInstance = useRef<any>(null);
  const { portalSettings } = useAuthStore();
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingGeocode, setLoadingGeocode] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
  const MAPBOX_STYLE = 'mapbox://styles/mapbox/streets-v12';

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

    const defaultLat = latitude || -18.4783;
    const defaultLng = longitude || -70.3126;

    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: MAPBOX_STYLE,
      center: [defaultLng, defaultLat], // Mapbox uses [lng, lat]
      zoom: latitude ? 15 : 12,
    });
    
    mapInstance.current = map;

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    const marker = new mapboxgl.Marker({
      draggable: true,
    })
      .setLngLat([defaultLng, defaultLat])
      .addTo(map);

    markerInstance.current = marker;

    const reverseGeocode = async (lat: number, lng: number) => {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
          headers: {
            'Accept-Language': 'es'
          }
        });
        const data = await response.json();
        if (data && data.display_name) {
          const parts = data.display_name.split(',');
          const cleanAddress = parts.slice(0, 4).map((p: string) => p.trim()).join(', ');
          onChangeAddress(cleanAddress);
        }
      } catch (err) {
        console.error('Error reverse geocoding:', err);
      }
    };

    marker.on('dragend', async () => {
      const lngLat = marker.getLngLat();
      map.panTo([lngLat.lng, lngLat.lat]);
      if (onChangeLocation) onChangeLocation(lngLat.lat, lngLat.lng);
      await reverseGeocode(lngLat.lat, lngLat.lng);
    });

    map.on('click', async (e: any) => {
      const { lng, lat } = e.lngLat;
      marker.setLngLat([lng, lat]);
      map.panTo([lng, lat]);
      if (onChangeLocation) onChangeLocation(lat, lng);
      await reverseGeocode(lat, lng);
    });

    const locateInitialPosition = async () => {
      if (latitude && longitude) return;
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
          const newCoords: [number, number] = [parseFloat(lon), parseFloat(lat)];
          marker.setLngLat(newCoords);
          map.flyTo({ center: newCoords, zoom: address ? 15 : 12 });
          if (onChangeLocation) onChangeLocation(parseFloat(lat), parseFloat(lon));
        }
      } catch (err) {
        console.error('Error initial geocoding:', err);
      }
    };

    locateInitialPosition();

    return () => {
      map.remove();
      mapInstance.current = null;
      markerInstance.current = null;
    };
  }, [isLoaded]);

  useEffect(() => {
    if (!mapInstance.current || !markerInstance.current || latitude === undefined || longitude === undefined) return;
    const currentLngLat = markerInstance.current.getLngLat();
    const diffLat = Math.abs(currentLngLat.lat - latitude);
    const diffLng = Math.abs(currentLngLat.lng - longitude);

    if (diffLat > 0.0001 || diffLng > 0.0001) {
      markerInstance.current.setLngLat([longitude, latitude]);
      mapInstance.current.panTo([longitude, latitude]);
    }
  }, [latitude, longitude]);

  const handleLocateAddress = async () => {
    if (!mapInstance.current || !markerInstance.current || !address) return;
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
        const newCoords: [number, number] = [parseFloat(lon), parseFloat(lat)];
        markerInstance.current.setLngLat(newCoords);
        mapInstance.current.flyTo({ center: newCoords, zoom: 15 });
        if (onChangeLocation) onChangeLocation(parseFloat(lat), parseFloat(lon));
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
