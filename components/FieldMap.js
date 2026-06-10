"use client";

import { useEffect, useRef } from "react";

const COLORS = { online: "#46a758", down: "#e5484d", attention: "#f5a623" };

export default function FieldMap({ sites, selectedId, onSelect, addMode, onMapClick, pendingPin }) {
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const LRef = useRef(null);
  const addModeRef = useRef(addMode);
  const onMapClickRef = useRef(onMapClick);
  addModeRef.current = addMode;
  onMapClickRef.current = onMapClick;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || mapRef.current) return;
      LRef.current = L;
      const map = L.map("map", { zoomControl: true, attributionControl: true });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: "abcd",
        maxZoom: 18,
      }).addTo(map);
      map.setView([31.95, -102.05], 10);
      map.on("click", (e) => {
        if (addModeRef.current && onMapClickRef.current) {
          onMapClickRef.current(e.latlng.lat, e.latlng.lng);
        }
      });
      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);
      draw();
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function draw() {
    const L = LRef.current;
    const layer = layerRef.current;
    if (!L || !layer) return;
    layer.clearLayers();
    for (const s of sites || []) {
      const color = COLORS[s.status] || "#8b8e99";
      const sel = s.id === selectedId;
      const enr = Array.isArray(s.crew_en_route) ? s.crew_en_route : s.crew_en_route ? [s.crew_en_route] : [];
      if (enr.length) {
        L.circleMarker([s.lat, s.lng], {
          radius: 14, color, weight: 1.5, dashArray: "3 4", fill: false, opacity: 0.8,
        }).addTo(layer);
      }
      const m = L.circleMarker([s.lat, s.lng], {
        radius: sel ? 10 : 7,
        color: sel ? "#ece9e2" : color,
        weight: sel ? 2.5 : 1.5,
        fillColor: color,
        fillOpacity: 0.9,
      }).addTo(layer);
      m.bindTooltip(
        `${s.name} — ${s.emergency ? "⚠ EMERGENCY · " : ""}${s.status.toUpperCase()}${
          enr.length ? " · EN ROUTE: " + enr.map((c) => `${c.name} [${c.team || "CREW"}]`).join(", ") : ""
        }`,
        { className: "sb-tip", direction: "top", offset: [0, -10] }
      );
      m.on("click", () => !addModeRef.current && onSelect && onSelect(s.id));
      if (s.emergency) {
        const warn = L.marker([s.lat, s.lng], {
          icon: L.divIcon({ className: "", html: '<div class="emg-icon">&#9888;</div>', iconSize: [28, 28], iconAnchor: [14, 36] }),
          interactive: false,
          keyboard: false,
        }).addTo(layer);
        warn.setZIndexOffset(1000);
      }
    }
  }

  useEffect(() => {
    draw();
    const L = LRef.current;
    const layer = layerRef.current;
    if (L && layer && pendingPin) {
      L.marker([pendingPin.lat, pendingPin.lng], {
        icon: L.divIcon({ className: "", html: '<div class="pending-pin">+</div>', iconSize: [26, 26], iconAnchor: [13, 13] }),
        interactive: false,
      }).addTo(layer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sites, selectedId, pendingPin]);

  return null;
}
