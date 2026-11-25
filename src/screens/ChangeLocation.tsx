import { useEffect, useRef, useState } from "react";
import { latLng, map, tileLayer, type Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { PinIcon } from "../icons.tsx";
import { findLocation, type FoundLocation } from "../location/location-detail.ts";

interface ChangeLocationProps {
  location: FoundLocation;
  onCancel: () => void;
  onConfirm: (location: FoundLocation) => void;
}

export function ChangeLocation({ location, onCancel, onConfirm }: ChangeLocationProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const mapElement = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<LeafletMap | null>(null);
  const confirming = useRef(false);
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [moved, setMoved] = useState(false);
  const [saving, setSaving] = useState(false);
  const { latitude, longitude } = location.detail;

  useEffect(() => {
    const modal = dialog.current!;
    const focused = document.activeElement;
    modal.showModal();
    const original = latLng(latitude, longitude);
    const picker = map(mapElement.current!, { scrollWheelZoom: false }).setView(original, 17);
    mapInstance.current = picker;
    const tiles = tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      referrerPolicy: "strict-origin-when-cross-origin",
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    });
    let hasTiles = false;
    tiles.on("tileload", () => { hasTiles = true; });
    tiles.on("loading", () => {
      hasTiles = false;
      setMapStatus("loading");
    });
    tiles.on("load", () => setMapStatus(hasTiles ? "ready" : "unavailable"));
    tiles.addTo(picker);
    picker.on("movestart", () => setMoved(false));
    picker.on("moveend", () => setMoved(picker.getCenter().wrap().distanceTo(original) >= 1));
    return () => {
      mapInstance.current = null;
      picker.remove();
      modal.close();
      if (focused instanceof HTMLElement && focused.isConnected) focused.focus();
    };
  }, [latitude, longitude]);

  async function confirm() {
    const picker = mapInstance.current;
    if (!picker || confirming.current) return;
    confirming.current = true;
    setSaving(true);
    const center = picker.getCenter().wrap();
    const found = await findLocation({ latitude: center.lat, longitude: center.lng, accuracyMeters: null });
    // The user can cancel while the name is loading.
    if (mapInstance.current === picker) onConfirm(found);
  }

  return (
    <dialog
      className="location-picker"
      ref={dialog}
      aria-labelledby="change-location-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <div className="stack location-picker-content">
        <h2 className="h-l" id="change-location-title">Change location</h2>
        <p className="small" id="change-location-help">Move the map until the pin points to the problem. You can also use the arrow keys.</p>
        <div className="location-picker-map-wrap" inert={saving}>
          <div className="location-picker-map" ref={mapElement} role="region" aria-label="Location map" aria-describedby="change-location-help" />
          <span className="location-picker-pin" aria-hidden="true"><PinIcon /></span>
        </div>
        <p className="small" role="status">
          {saving ? "Finding a name for this location…"
            : mapStatus === "unavailable" ? "Map tiles are unavailable. Cancel to keep the current location."
            : mapStatus === "loading" ? "Loading the map…"
            : moved ? "Use this location to confirm the pin."
            : location.location ?? "FixFinder couldn't put this location into words."}
        </p>
        <button type="button" className="btn primary" disabled={saving || !moved || mapStatus !== "ready"} onClick={() => void confirm()}>
          Use this location
        </button>
        <button type="button" className="btn text" onClick={onCancel}>Cancel</button>
      </div>
    </dialog>
  );
}
