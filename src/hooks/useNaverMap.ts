"use client";

import { useEffect, useRef, useState } from "react";

// Naver Maps API 타입 선언 (CDN 로딩, window.naver.maps)
declare global {
  interface Window {
    naver?: {
      maps: NaverMapsApi;
    };
  }
}

interface NaverLatLng {
  lat(): number;
  lng(): number;
}

interface NaverMap {
  setCenter(latlng: NaverLatLng): void;
  setZoom(zoom: number): void;
  panTo(latlng: NaverLatLng): void;
}

interface NaverMarker {
  setMap(map: NaverMap | null): void;
  getPosition(): NaverLatLng;
}

interface NaverMapsApi {
  Map: new (el: HTMLElement, options: Record<string, unknown>) => NaverMap;
  LatLng: new (lat: number, lng: number) => NaverLatLng;
  Marker: new (options: Record<string, unknown>) => NaverMarker;
  Event: {
    addListener(target: unknown, event: string, handler: (...args: unknown[]) => void): void;
    removeListener(handle: unknown): void;
  };
}

export interface UseNaverMapOptions {
  /** 초기 중심 좌표 — 기본 서울 시청 */
  initialLat?: number;
  initialLng?: number;
  initialZoom?: number;
}

export function useNaverMap(opts: UseNaverMapOptions = {}) {
  const { initialLat = 37.5666, initialLng = 126.9784, initialZoom = 14 } = opts;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<NaverMap | null>(null);
  const markersRef = useRef<NaverMarker[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const init = () => {
      if (!window.naver?.maps) return;
      const naver = window.naver.maps;
      mapRef.current = new naver.Map(containerRef.current!, {
        center: new naver.LatLng(initialLat, initialLng),
        zoom: initialZoom,
      });
      setReady(true);
    };

    if (window.naver?.maps) {
      init();
    } else {
      // 스크립트가 로딩 중일 수 있음 — 100ms 폴링 (최대 5초)
      let tries = 0;
      const id = setInterval(() => {
        tries += 1;
        if (window.naver?.maps) {
          clearInterval(id);
          init();
        } else if (tries > 50) {
          clearInterval(id);
          console.warn("Naver Maps script load timeout");
        }
      }, 100);
      return () => clearInterval(id);
    }
  }, [initialLat, initialLng, initialZoom]);

  function clearMarkers() {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
  }

  function addMarker(lat: number, lng: number, onClick?: () => void) {
    if (!window.naver?.maps || !mapRef.current) return;
    const naver = window.naver.maps;
    const marker = new naver.Marker({
      position: new naver.LatLng(lat, lng),
      map: mapRef.current,
    });
    if (onClick) {
      naver.Event.addListener(marker, "click", onClick);
    }
    markersRef.current.push(marker);
    return marker;
  }

  function panTo(lat: number, lng: number) {
    if (!window.naver?.maps || !mapRef.current) return;
    mapRef.current.panTo(new window.naver.maps.LatLng(lat, lng));
  }

  return { containerRef, ready, clearMarkers, addMarker, panTo };
}
