"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";
import { area as turfArea, booleanWithin, centroid, polygon as turfPolygon } from "@turf/turf";
import type { FeatureCollection, Geometry, GeoJsonProperties } from "geojson";
import styles from "./territory-editor.module.css";
import { describeWeatherCode, type WeatherForecast } from "@/data/weather";

type Coordinate = [number, number];
type Crop = "soybean" | "corn" | "tomato" | "other";
type EditorMode = "draw-farm" | "draw-field" | "move-field" | null;

type TerritoryShape = {
  id: string;
  kind: "farm" | "field";
  title: string;
  description: string;
  crop: Crop;
  plantingDate: string;
  coordinates: Coordinate[];
};

type TerritoryProject = {
  version: 1;
  farm: TerritoryShape | null;
  fields: TerritoryShape[];
  placeLabel: string;
};

export type TerritorySearchResult = {
  id: string;
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
  boundingBox?: number[];
  type: string;
};

const STORAGE_KEY = "quarenta-safras:territory-project:v1";
const EMPTY_PROJECT: TerritoryProject = { version: 1, farm: null, fields: [], placeLabel: "" };
const COLORS = ["#e7b842", "#9ed553", "#53b0dc", "#d86b42", "#b28add", "#56c9a1"];

const closed = (coordinates: Coordinate[]): Coordinate[] =>
  coordinates.length ? [...coordinates, coordinates[0]] : coordinates;

const shapePolygon = (shape: TerritoryShape) => turfPolygon([closed(shape.coordinates)]);
const hectares = (shape: TerritoryShape) => turfArea(shapePolygon(shape)) / 10_000;
const weatherKey = (shape: TerritoryShape | null) =>
  shape ? `${shape.id}:${shape.coordinates.map(([longitude, latitude]) => `${longitude.toFixed(6)},${latitude.toFixed(6)}`).join(";")}` : "";
const weatherNumber = (value: number | null, digits = 0) =>
  value == null ? "—" : value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const forecastDate = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", options);

function getSelected(project: TerritoryProject, selectedId: string | null) {
  if (selectedId === "farm") return project.farm;
  return project.fields.find((field) => field.id === selectedId) ?? null;
}

function projectFeatures(project: TerritoryProject, selectedId: string | null): FeatureCollection<Geometry, GeoJsonProperties> {
  const shapes = [project.farm, ...project.fields].filter((shape): shape is TerritoryShape => Boolean(shape));
  return {
    type: "FeatureCollection",
    features: shapes.map((shape, index) => ({
      type: "Feature",
      properties: {
        id: shape.id,
        kind: shape.kind,
        title: shape.title,
        color: shape.kind === "farm" ? "#dfff8d" : COLORS[Math.max(0, index - 1) % COLORS.length],
        selected: shape.id === selectedId,
      },
      geometry: { type: "Polygon", coordinates: [closed(shape.coordinates)] },
    })),
  };
}

function vertexFeatures(shape: TerritoryShape | null): FeatureCollection<Geometry, GeoJsonProperties> {
  return {
    type: "FeatureCollection",
    features: (shape?.coordinates ?? []).map((coordinate, index) => ({
      type: "Feature",
      properties: { index },
      geometry: { type: "Point", coordinates: coordinate },
    })),
  };
}

function draftFeatures(coordinates: Coordinate[]): FeatureCollection<Geometry, GeoJsonProperties> {
  const features: FeatureCollection<Geometry, GeoJsonProperties>["features"] = coordinates.map((coordinate) => ({
    type: "Feature",
    properties: {},
    geometry: { type: "Point", coordinates: coordinate },
  }));
  if (coordinates.length >= 2) {
    features.unshift({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates } });
  }
  return { type: "FeatureCollection", features };
}

type TerritoryEditorProps = {
  embedded?: boolean;
  onContinue?: () => void;
  continueLabel?: string;
  initialSearch?: string;
  initialLocation?: { latitude: number; longitude: number };
  onLocationSelected?: (result: TerritorySearchResult) => void | Promise<void>;
  onFarmAreaChange?: (areaHa: number | null) => void;
};

export function TerritoryEditor({
  embedded = false,
  onContinue,
  continueLabel = "Usar esta localização →",
  initialSearch = "",
  initialLocation,
  onLocationSelected,
  onFarmAreaChange,
}: TerritoryEditorProps) {
  const initialLocationRef = useRef(initialLocation);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const projectRef = useRef<TerritoryProject>(EMPTY_PROJECT);
  const selectedIdRef = useRef<string | null>(null);
  const modeRef = useRef<EditorMode>(null);
  const draftRef = useRef<Coordinate[]>([]);
  const vertexDragRef = useRef<{ shapeId: string; index: number; original: Coordinate[] } | null>(null);
  const shapeDragRef = useRef<{ id: string; start: Coordinate; original: Coordinate[] } | null>(null);

  const [project, setProject] = useState<TerritoryProject>(EMPTY_PROJECT);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<EditorMode>(null);
  const [draft, setDraft] = useState<Coordinate[]>([]);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("Pesquise um lugar ou navegue pelo mundo.");
  const [search, setSearch] = useState(initialSearch);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<TerritorySearchResult[]>([]);
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherTargetKey, setWeatherTargetKey] = useState("");

  const applyProject = useCallback((next: TerritoryProject | ((current: TerritoryProject) => TerritoryProject)) => {
    setProject((current) => {
      const resolved = typeof next === "function" ? next(current) : next;
      projectRef.current = resolved;
      return resolved;
    });
  }, []);

  const chooseSelected = useCallback((id: string | null) => {
    selectedIdRef.current = id;
    setSelectedId(id);
    setWeather(null);
  }, []);

  const chooseMode = useCallback((nextMode: EditorMode) => {
    modeRef.current = nextMode;
    setMode(nextMode);
    if (nextMode !== "draw-farm" && nextMode !== "draw-field") {
      draftRef.current = [];
      setDraft([]);
    }
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as TerritoryProject;
          if (parsed.version === 1) {
            projectRef.current = parsed;
            setProject(parsed);
            if (parsed.farm) chooseSelected("farm");
          }
        }
      } catch {
        setNotice("O cadastro local anterior não pôde ser carregado.");
      } finally {
        setReady(true);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [chooseSelected]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  }, [project, ready]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const probe = document.createElement("canvas");
    if (!probe.getContext("webgl2") && !probe.getContext("webgl")) {
      setNotice("O mapa não está disponível neste navegador. A localização informada continua salva e você pode seguir.");
      return;
    }
    const startingLocation = initialLocationRef.current;
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      center: startingLocation ? [startingLocation.longitude, startingLocation.latitude] : [-55.7106, -12.5425],
      zoom: startingLocation ? 10 : 4.5,
      minZoom: 1.35,
      maxZoom: 17,
      style: {
        version: 8,
        sources: {
          satellite: {
            type: "raster",
            tiles: ["https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/g/{z}/{y}/{x}.jpg"],
            tileSize: 256,
            maxzoom: 17,
            attribution: "EOX · Contains modified Copernicus Sentinel data 2025 (CC BY-NC-SA 4.0)",
          },
          highResolutionImagery: {
            type: "raster",
            tiles: ["https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
            tileSize: 256,
            minzoom: 12,
            maxzoom: 19,
            attribution: "Esri World Imagery · fontes variam conforme a localização",
          },
          labels: {
            type: "raster",
            tiles: ["https://tiles.maps.eox.at/wmts/1.0.0/overlay_bright_3857/default/g/{z}/{y}/{x}.png"],
            tileSize: 256,
            maxzoom: 17,
            attribution: "© OpenStreetMap contributors · EOX",
          },
          dem: {
            type: "raster-dem",
            tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
            tileSize: 256,
            maxzoom: 15,
            encoding: "terrarium",
            attribution: "Mapzen terrain tiles",
          },
        },
        layers: [
          { id: "satellite", type: "raster", source: "satellite" },
          {
            id: "high-resolution-imagery",
            type: "raster",
            source: "highResolutionImagery",
            minzoom: 12,
            paint: { "raster-opacity": ["interpolate", ["linear"], ["zoom"], 12, 0, 13, 1], "raster-fade-duration": 500 },
          },
          { id: "labels", type: "raster", source: "labels", paint: { "raster-opacity": 0.7 } },
        ],
        sky: {
          "sky-color": "#a7ced5",
          "horizon-color": "#edf2e6",
          "fog-color": "#dce9dc",
          "sky-horizon-blend": 0.65,
        },
      },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-left");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

    const setShapeCoordinates = (shapeId: string, coordinates: Coordinate[]) => {
      const current = projectRef.current;
      const next = {
        ...current,
        farm: current.farm?.id === shapeId ? { ...current.farm, coordinates } : current.farm,
        fields: current.fields.map((field) => (field.id === shapeId ? { ...field, coordinates } : field)),
      };
      projectRef.current = next;
      setProject(next);
    };

    map.on("load", () => {
      map.addSource("territories", { type: "geojson", data: projectFeatures(projectRef.current, selectedIdRef.current) });
      map.addSource("vertices", { type: "geojson", data: vertexFeatures(getSelected(projectRef.current, selectedIdRef.current)) });
      map.addSource("draft", { type: "geojson", data: draftFeatures([]) });
      map.addLayer({
        id: "territory-fill",
        type: "fill",
        source: "territories",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": ["case", ["==", ["get", "kind"], "farm"], 0.12, ["case", ["get", "selected"], 0.54, 0.34]],
        },
      });
      map.addLayer({
        id: "territory-line",
        type: "line",
        source: "territories",
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["case", ["get", "selected"], 5, 3],
          "line-dasharray": [2, 1],
        },
      });
      map.addLayer({
        id: "territory-label",
        type: "symbol",
        source: "territories",
        layout: { "text-field": ["get", "title"], "text-size": 13, "text-font": ["Open Sans Bold"] },
        paint: { "text-color": "#ffffff", "text-halo-color": "#14200f", "text-halo-width": 2 },
      });
      map.addLayer({
        id: "vertex-points",
        type: "circle",
        source: "vertices",
        paint: { "circle-radius": 7, "circle-color": "#ffffff", "circle-stroke-color": "#315c28", "circle-stroke-width": 3 },
      });
      map.addLayer({
        id: "draft-line",
        type: "line",
        source: "draft",
        filter: ["==", ["geometry-type"], "LineString"],
        paint: { "line-color": "#f3ffbd", "line-width": 4, "line-dasharray": [1.5, 1] },
      });
      map.addLayer({
        id: "draft-points",
        type: "circle",
        source: "draft",
        filter: ["==", ["geometry-type"], "Point"],
        paint: { "circle-radius": 7, "circle-color": "#ffffff", "circle-stroke-color": "#315c28", "circle-stroke-width": 3 },
      });
    });

    map.on("click", (event) => {
      const currentMode = modeRef.current;
      if (currentMode !== "draw-farm" && currentMode !== "draw-field") return;
      const next = [...draftRef.current, [event.lngLat.lng, event.lngLat.lat] as Coordinate];
      draftRef.current = next;
      setDraft(next);
    });

    map.on("click", "territory-fill", (event) => {
      if (modeRef.current === "draw-farm" || modeRef.current === "draw-field") return;
      const id = event.features?.[0]?.properties?.id as string | undefined;
      if (id) chooseSelected(id);
    });

    map.on("mousedown", "vertex-points", (event) => {
      if (modeRef.current === "move-field") return;
      const selected = getSelected(projectRef.current, selectedIdRef.current);
      const index = Number(event.features?.[0]?.properties?.index);
      if (!selected || !Number.isInteger(index)) return;
      vertexDragRef.current = { shapeId: selected.id, index, original: selected.coordinates };
      map.dragPan.disable();
    });

    map.on("mousedown", "territory-fill", (event) => {
      if (modeRef.current !== "move-field") return;
      const id = event.features?.[0]?.properties?.id as string | undefined;
      const field = projectRef.current.fields.find((item) => item.id === id);
      if (!field) return;
      shapeDragRef.current = {
        id: field.id,
        start: [event.lngLat.lng, event.lngLat.lat],
        original: field.coordinates,
      };
      chooseSelected(field.id);
      map.dragPan.disable();
    });

    map.on("mousemove", (event) => {
      if (vertexDragRef.current) {
        const drag = vertexDragRef.current;
        const selected = getSelected(projectRef.current, drag.shapeId);
        if (!selected) return;
        const coordinates = selected.coordinates.map((coordinate, index) =>
          index === drag.index ? ([event.lngLat.lng, event.lngLat.lat] as Coordinate) : coordinate,
        );
        setShapeCoordinates(drag.shapeId, coordinates);
        return;
      }
      if (shapeDragRef.current) {
        const drag = shapeDragRef.current;
        const deltaLongitude = event.lngLat.lng - drag.start[0];
        const deltaLatitude = event.lngLat.lat - drag.start[1];
        setShapeCoordinates(
          drag.id,
          drag.original.map(([longitude, latitude]) => [longitude + deltaLongitude, latitude + deltaLatitude]),
        );
      }
    });

    map.on("mouseup", () => {
      const vertexDrag = vertexDragRef.current;
      const shapeDrag = shapeDragRef.current;
      vertexDragRef.current = null;
      shapeDragRef.current = null;
      map.dragPan.enable();

      const movedId = vertexDrag?.shapeId ?? shapeDrag?.id;
      if (!movedId) return;
      const current = projectRef.current;
      if (movedId === "farm") {
        const movedFarm = current.farm;
        const keepsEveryFieldInside =
          movedFarm != null && current.fields.every((field) => booleanWithin(shapePolygon(field), shapePolygon(movedFarm)));
        if (keepsEveryFieldInside) return;
        if (vertexDrag?.original) setShapeCoordinates("farm", vertexDrag.original);
        setNotice("O perímetro da fazenda não pode excluir um talhão já cadastrado.");
        return;
      }
      const field = current.fields.find((item) => item.id === movedId);
      if (!field || !current.farm || booleanWithin(shapePolygon(field), shapePolygon(current.farm))) return;
      const original = vertexDrag?.original ?? shapeDrag?.original;
      if (original) setShapeCoordinates(movedId, original);
      setNotice("O talhão precisa permanecer dentro do perímetro da fazenda.");
    });

    map.on("mouseenter", "territory-fill", () => {
      if (modeRef.current === "move-field") map.getCanvas().style.cursor = "move";
    });
    map.on("mouseleave", "territory-fill", () => {
      if (modeRef.current !== "draw-farm" && modeRef.current !== "draw-field") map.getCanvas().style.cursor = "";
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [chooseSelected]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    (map.getSource("territories") as GeoJSONSource | undefined)?.setData(projectFeatures(project, selectedId));
    (map.getSource("vertices") as GeoJSONSource | undefined)?.setData(vertexFeatures(getSelected(project, selectedId)));
  }, [project, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    (map.getSource("draft") as GeoJSONSource | undefined)?.setData(draftFeatures(draft));
    map.getCanvas().style.cursor = mode === "draw-farm" || mode === "draw-field" ? "crosshair" : "";
  }, [draft, mode]);

  const selected = useMemo(() => getSelected(project, selectedId), [project, selectedId]);
  const farmArea = project.farm ? hectares(project.farm) : 0;

  useEffect(() => {
    onFarmAreaChange?.(project.farm ? farmArea : null);
  }, [farmArea, onFarmAreaChange, project.farm]);

  const activeWeatherTarget = selected ?? project.farm;
  const activeWeatherKey = weatherKey(activeWeatherTarget);
  const visibleWeather = activeWeatherKey === weatherTargetKey ? weather : null;
  const weatherOverview = useMemo(() => {
    if (!visibleWeather) return null;
    const values = visibleWeather.days;
    const sum = (selector: (day: WeatherForecast["days"][number]) => number | null) =>
      values.reduce((total, day) => total + (selector(day) ?? 0), 0);
    const available = (selector: (day: WeatherForecast["days"][number]) => number | null) =>
      values.map(selector).filter((value): value is number => value != null);
    const temperaturesMin = available((day) => day.temperatureMinC);
    const temperaturesMax = available((day) => day.temperatureMaxC);
    const probabilities = available((day) => day.precipitationProbabilityPct);
    return {
      rainMm: sum((day) => day.precipitationMm),
      et0Mm: sum((day) => day.et0Mm),
      minC: temperaturesMin.length ? Math.min(...temperaturesMin) : null,
      maxC: temperaturesMax.length ? Math.max(...temperaturesMax) : null,
      rainProbabilityPct: probabilities.length ? Math.max(...probabilities) : null,
    };
  }, [visibleWeather]);

  const startDrawing = (nextMode: Exclude<EditorMode, "move-field" | null>) => {
    if (nextMode === "draw-field" && !project.farm) {
      setNotice("Desenhe primeiro o perímetro da fazenda.");
      return;
    }
    draftRef.current = [];
    setDraft([]);
    chooseMode(nextMode);
    setNotice(nextMode === "draw-farm" ? "Marque o perímetro da fazenda." : "Marque o perímetro do novo talhão.");
  };

  const finishDrawing = () => {
    if (draft.length < 3) {
      setNotice("Marque pelo menos três pontos para concluir o polígono.");
      return;
    }
    if (mode === "draw-farm") {
      const farm: TerritoryShape = {
        id: "farm",
        kind: "farm",
        title: project.farm?.title ?? "Minha propriedade",
        description: project.farm?.description ?? "Perímetro informado pelo produtor",
        crop: "other",
        plantingDate: "",
        coordinates: draft,
      };
      const keptFields = project.fields.filter((field) => booleanWithin(shapePolygon(field), shapePolygon(farm)));
      applyProject({ ...project, farm, fields: keptFields });
      chooseSelected("farm");
      setNotice(
        keptFields.length === project.fields.length
          ? "Perímetro da fazenda cadastrado."
          : "Perímetro atualizado; talhões que ficaram fora da fazenda foram removidos.",
      );
    } else if (mode === "draw-field" && project.farm) {
      const field: TerritoryShape = {
        id: `field-${Date.now()}`,
        kind: "field",
        title: `Talhão ${project.fields.length + 1}`,
        description: "",
        crop: "soybean",
        plantingDate: "",
        coordinates: draft,
      };
      if (!booleanWithin(shapePolygon(field), shapePolygon(project.farm))) {
        setNotice("O talhão precisa estar completamente dentro da fazenda.");
        return;
      }
      applyProject({ ...project, fields: [...project.fields, field] });
      chooseSelected(field.id);
      setNotice("Talhão criado. Agora informe título, cultura, descrição e data.");
    }
    draftRef.current = [];
    setDraft([]);
    chooseMode(null);
  };

  const updateSelected = (changes: Partial<TerritoryShape>) => {
    if (!selected) return;
    applyProject((current) => ({
      ...current,
      farm: selected.id === "farm" && current.farm ? { ...current.farm, ...changes } : current.farm,
      fields: current.fields.map((field) => (field.id === selected.id ? { ...field, ...changes } : field)),
    }));
  };

  const removeSelected = () => {
    if (!selected) return;
    if (selected.kind === "farm") {
      applyProject({ ...project, farm: null, fields: [] });
      setNotice("Cadastro da propriedade e seus talhões removido.");
    } else {
      applyProject({ ...project, fields: project.fields.filter((field) => field.id !== selected.id) });
      setNotice("Talhão removido.");
    }
    chooseSelected(null);
  };

  const searchPlaces = async (event: React.FormEvent) => {
    event.preventDefault();
    if (search.trim().length < 2) return;
    setSearching(true);
    setResults([]);
    try {
      const response = await fetch(`/api/territory-search?q=${encodeURIComponent(search.trim())}`);
      const body = (await response.json()) as { results?: TerritorySearchResult[] };
      if (!response.ok) throw new Error("search unavailable");
      setResults(body.results ?? []);
      if (!body.results?.length) setNotice("Nenhum local encontrado.");
    } catch {
      setNotice("Não foi possível buscar esse lugar agora. Tente novamente.");
    } finally {
      setSearching(false);
    }
  };

  const goToPlace = (result: TerritorySearchResult) => {
    const map = mapRef.current;
    if (!map) return;
    if (result.boundingBox?.length === 4) {
      const [south, north, west, east] = result.boundingBox;
      map.fitBounds(
        [
          [west, south],
          [east, north],
        ],
        { padding: 80, maxZoom: 15, duration: 1_400 },
      );
    } else {
      map.flyTo({ center: [result.longitude, result.latitude], zoom: 14, duration: 1_400 });
    }
    setSearch(result.name);
    setResults([]);
    applyProject({ ...projectRef.current, placeLabel: result.displayName });
    setNotice(`Local selecionado: ${result.displayName}`);
    void onLocationSelected?.(result);
  };

  const toggleTerrain = () => {
    const map = mapRef.current;
    if (!map) return;
    const enabling = map.getTerrain() == null;
    map.setTerrain(enabling ? { source: "dem", exaggeration: 1.35 } : null);
    map.easeTo({ pitch: enabling ? 62 : 0, bearing: enabling ? -18 : 0, duration: 900 });
    setNotice(enabling ? "Terreno 3D ativo: arraste com o botão direito para girar." : "Visão 2D ativa.");
  };

  const loadWeather = async () => {
    const target = selected ?? project.farm;
    if (!target) {
      setNotice("Cadastre a fazenda ou selecione um talhão para consultar o tempo.");
      return;
    }
    const point = centroid(shapePolygon(target)).geometry.coordinates as Coordinate;
    const requestedTargetKey = weatherKey(target);
    setWeatherLoading(true);
    try {
      const response = await fetch(`/api/weather?latitude=${point[1]}&longitude=${point[0]}`);
      const body = (await response.json()) as WeatherForecast & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Previsão indisponível");
      setWeather(body);
      setWeatherTargetKey(requestedTargetKey);
      setNotice(`Previsão atualizada para o centro de ${target.title}.`);
    } catch {
      setNotice("Não foi possível consultar a previsão agora. Tente novamente.");
    } finally {
      setWeatherLoading(false);
    }
  };

  return (
    <main className={`${styles.shell} ${embedded ? styles.embedded : ""}`}>
      <header className={styles.header}>
        {!embedded && <div className={styles.brand}>
          <span className={styles.brandMark} />
          <div><strong>Quarenta Safras</strong><small>Cadastro geolocalizado do agro</small></div>
        </div>}
        <form className={styles.search} onSubmit={searchPlaces}>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cidade, bairro ou endereço no mundo" aria-label="Pesquisar cidade, bairro ou endereço" />
          <button type="submit" disabled={searching}>{searching ? "Buscando…" : "Buscar"}</button>
          {results.length > 0 && (
            <div className={styles.results}>
              {results.map((result) => (
                <button type="button" key={result.id} onClick={() => goToPlace(result)}>
                  <strong>{result.name}</strong><small>{result.displayName}</small>
                </button>
              ))}
            </div>
          )}
        </form>
        {embedded
          ? onContinue && <button className={styles.continue} type="button" onClick={onContinue}>{continueLabel}</button>
          : <Link className={styles.back} href="/">Planejamento</Link>}
      </header>

      <section className={styles.workspace}>
        <div className={styles.mapArea}>
          <div ref={mapContainerRef} className={styles.map} aria-label="Mapa de satélite global para cadastro da propriedade" />
          <div className={styles.tools}>
            <button className={mode === "draw-farm" ? styles.active : ""} onClick={() => startDrawing("draw-farm")}>Desenhar fazenda</button>
            <button className={mode === "draw-field" ? styles.active : ""} onClick={() => startDrawing("draw-field")}>Novo talhão</button>
            <button className={mode === "move-field" ? styles.active : ""} disabled={!selected || selected.kind !== "field"} onClick={() => chooseMode(mode === "move-field" ? null : "move-field")}>Mover talhão</button>
            <button onClick={toggleTerrain}>Alternar 2D/3D</button>
            {(mode === "draw-farm" || mode === "draw-field") && <button className={styles.finish} disabled={draft.length < 3} onClick={finishDrawing}>Concluir polígono</button>}
          </div>
          <div className={styles.notice}>{notice}</div>
          <div className={styles.attribution}>Satélite global Sentinel‑2 · alta resolução Esri em zoom próximo · terreno Mapzen</div>
        </div>

        <aside className={styles.sidebar}>
          <section className={styles.summary}>
            <div><span>Área da fazenda</span><strong>{project.farm ? `${farmArea.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ha` : "—"}</strong></div>
            <div><span>Talhões</span><strong>{project.fields.length}</strong></div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelTitle}><div><h2>Cadastro territorial</h2><p>{project.placeLabel || "Local ainda não identificado"}</p></div></div>
            <div className={styles.fieldList}>
              {project.farm && <button className={selectedId === "farm" ? styles.selectedRow : ""} onClick={() => chooseSelected("farm")}><span className={styles.farmDot} /><span><b>{project.farm.title}</b><small>{farmArea.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ha</small></span></button>}
              {project.fields.map((field, index) => (
                <button key={field.id} className={selectedId === field.id ? styles.selectedRow : ""} onClick={() => chooseSelected(field.id)}>
                  <span className={styles.dot} style={{ background: COLORS[index % COLORS.length] }} />
                  <span><b>{field.title}</b><small>{hectares(field).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ha · {field.crop}</small></span>
                </button>
              ))}
              {!project.farm && <p className={styles.empty}>Pesquise o local e desenhe o perímetro da fazenda para começar.</p>}
            </div>
          </section>

          {selected && (
            <section className={styles.panel}>
              <div className={styles.panelTitle}><div><h2>{selected.kind === "farm" ? "Propriedade" : "Dados do talhão"}</h2><p>{hectares(selected).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} hectares</p></div></div>
              <label>Título<input value={selected.title} onChange={(event) => updateSelected({ title: event.target.value })} /></label>
              {selected.kind === "field" && <label>Cultura<select value={selected.crop} onChange={(event) => updateSelected({ crop: event.target.value as Crop })}><option value="soybean">Soja</option><option value="corn">Milho</option><option value="tomato">Tomate</option><option value="other">Outra</option></select></label>}
              <label>Descrição<textarea value={selected.description} onChange={(event) => updateSelected({ description: event.target.value })} /></label>
              {selected.kind === "field" && (
                <label>
                  Data de plantio
                  <input
                    type="date"
                    value={selected.plantingDate}
                    onInput={(event) => updateSelected({ plantingDate: event.currentTarget.value })}
                  />
                </label>
              )}
              <div className={styles.editorActions}><button onClick={() => chooseMode(null)}>Salvar localmente</button><button className={styles.danger} onClick={removeSelected}>Remover</button></div>
            </section>
          )}

          <section className={`${styles.panel} ${styles.weatherPanel}`}>
            <div className={styles.panelTitle}><div><h2>Previsão meteorológica</h2><p>Ponto central do {selected?.kind === "field" ? "talhão selecionado" : "perímetro da fazenda"}</p></div><button onClick={loadWeather} disabled={weatherLoading || !project.farm}>{weatherLoading ? "Consultando…" : visibleWeather ? "Atualizar" : "Consultar"}</button></div>
            {visibleWeather && weatherOverview ? (
              <>
                <div className={styles.weatherLocation}><span>📍 {visibleWeather.location.latitude.toFixed(3)}, {visibleWeather.location.longitude.toFixed(3)}</span><span>Atualizada {new Date(visibleWeather.generatedAt).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</span></div>
                <div className={styles.weatherOverview}>
                  <div><span>Chuva · 7 dias</span><strong>{weatherNumber(weatherOverview.rainMm, 1)} mm</strong></div>
                  <div><span>Maior chance</span><strong>{weatherNumber(weatherOverview.rainProbabilityPct)}%</strong></div>
                  <div><span>Faixa térmica</span><strong>{weatherNumber(weatherOverview.minC)}°–{weatherNumber(weatherOverview.maxC)}°</strong></div>
                  <div><span>ET₀ · 7 dias</span><strong>{weatherNumber(weatherOverview.et0Mm, 1)} mm</strong></div>
                </div>
                <div className={styles.signals}>{visibleWeather.signals.map((signal) => <div key={signal.code} data-severity={signal.severity}><i aria-hidden="true">{signal.severity === "attention" ? "!" : signal.severity === "favorable" ? "✓" : "i"}</i><span><b>{signal.title}</b><small>{signal.detail}</small></span></div>)}</div>
                <div className={styles.forecast} aria-label="Previsão para os próximos sete dias">{visibleWeather.days.map((day) => {
                  const condition = describeWeatherCode(day.weatherCode);
                  const rainProbability = day.precipitationProbabilityPct ?? 0;
                  return <article key={day.date}>
                    <header><span><b>{forecastDate(day.date, { weekday: "short" })}</b><small>{forecastDate(day.date, { day: "2-digit", month: "2-digit" })}</small></span><em title={condition.label}>{condition.icon}</em></header>
                    <p>{condition.label}</p>
                    <strong>{weatherNumber(day.temperatureMaxC)}° <span>{weatherNumber(day.temperatureMinC)}°</span></strong>
                    <div className={styles.rainLine}><span style={{ width: `${Math.max(4, rainProbability)}%` }} /></div>
                    <dl><div><dt>Chuva</dt><dd>{weatherNumber(day.precipitationMm, 1)} mm · {weatherNumber(day.precipitationProbabilityPct)}%</dd></div><div><dt>Rajada</dt><dd>{weatherNumber(day.windGustKmh)} km/h</dd></div><div><dt>ET₀</dt><dd>{weatherNumber(day.et0Mm, 1)} mm</dd></div></dl>
                  </article>;
                })}</div>
                <p className={styles.disclaimer}><strong>Como interpretar:</strong> {visibleWeather.disclaimer} Fonte: {visibleWeather.source}; fuso {visibleWeather.location.timezone}.</p>
              </>
            ) : <p className={styles.empty}>{weather && activeWeatherKey !== weatherTargetKey ? "A área selecionada mudou. Consulte novamente para usar a coordenada atual." : "Selecione uma área e consulte a previsão de sete dias."}</p>}
          </section>
        </aside>
      </section>
    </main>
  );
}
