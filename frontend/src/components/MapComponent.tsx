import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Lot } from '../types';

interface MapComponentProps {
  lots: Lot[];
  selectedLotId?: number | null;
  onSelectLot: (lotId: number) => void;
  userCoords?: { lat: number; lng: number } | null;
}

export const MapComponent: React.FC<MapComponentProps> = ({
  lots,
  selectedLotId,
  onSelectLot,
  userCoords,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [id: number]: L.Marker }>({});

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Center of Mumbai: Bandra / Worli sea link latitude
      const map = L.map(mapContainerRef.current, {
        center: [19.0178, 72.8478],
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear old markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    // Custom Icon Generator
    const createCustomIcon = (isBookable: boolean, avail: number, isSelected: boolean) => {
      let bg = '#10B981'; // green
      if (!isBookable || avail === 0) bg = '#EF4444'; // red
      else if (avail < 15) bg = '#F59E0B'; // amber

      const border = isSelected ? '#FFFFFF' : '#0F172A';
      const scale = isSelected ? 1.25 : 1.0;

      return L.divIcon({
        className: 'custom-pin',
        html: `
          <div style="
            background-color: ${bg};
            width: ${28 * scale}px;
            height: ${28 * scale}px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 2px solid ${border};
            box-shadow: 0 4px 10px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <span style="transform: rotate(45deg); font-size: 10px; font-weight: bold; color: white;">P</span>
          </div>
        `,
        iconSize: [28 * scale, 28 * scale],
        iconAnchor: [14 * scale, 28 * scale],
      });
    };

    // Add lot markers
    lots.forEach((lot) => {
      if (!lot.lat || !lot.lng) return;

      const isSelected = lot.id === selectedLotId;
      const avail = lot.available_bays || 0;
      const icon = createCustomIcon(lot.bookable, avail, isSelected);

      const marker = L.marker([lot.lat, lot.lng], { icon }).addTo(map);

      const popupContent = `
        <div style="font-family: inherit; font-size: 12px; min-width: 180px; padding: 2px;">
          <div style="font-weight: bold; font-size: 13px; color: #0f172a; margin-bottom: 2px;">${lot.name}</div>
          <div style="color: #64748b; margin-bottom: 6px;">Ward ${lot.ward || 'Mumbai'} • ${lot.structure_type || 'Lot'}</div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-weight: bold; color: #2563eb;">₹${lot.calculated_price_per_hr || 60}/hr</span>
            <span style="background: ${lot.bookable && avail > 0 ? '#dcfce7' : '#fee2e2'}; color: ${lot.bookable && avail > 0 ? '#166534' : '#991b1b'}; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">
              ${lot.bookable ? `${avail} bays open` : 'Pay on site'}
            </span>
          </div>
          <button id="lot-btn-${lot.id}" style="
            width: 100%;
            background: #2563eb;
            color: white;
            border: none;
            padding: 6px 8px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 11px;
            cursor: pointer;
          ">
            View Details & Book
          </button>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`lot-btn-${lot.id}`);
        if (btn) {
          btn.onclick = () => onSelectLot(lot.id);
        }
      });

      marker.on('click', () => {
        onSelectLot(lot.id);
      });

      markersRef.current[lot.id] = marker;
    });

    // If selected lot changed, center on it
    if (selectedLotId && markersRef.current[selectedLotId]) {
      const marker = markersRef.current[selectedLotId];
      map.setView(marker.getLatLng(), 14, { animate: true });
      marker.openPopup();
    }
  }, [lots, selectedLotId]);

  return (
    <div className="w-full h-full min-h-[350px] relative rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
