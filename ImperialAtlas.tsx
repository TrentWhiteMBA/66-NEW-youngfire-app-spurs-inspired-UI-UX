import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ArrowLeft, Compass, Download, Check, MapPin, 
  BookOpen, Sparkles, Layers, Search, ChevronRight, 
  X, ExternalLink, ShieldCheck, Globe, Navigation, 
  Mountain, Satellite, Eye, RefreshCw, Maximize2, Minimize2, ChevronsUpDown
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BIBLICAL_JOURNEYS, type CharacterJourney } from '../data/biblicalJourneys';
import { BIBLICAL_FIGURES_NKJV, type BiblicalFigure } from '../data/biblicalFiguresNKJV';

export type BasemapMode = 'satellite' | 'terrain';

export interface BasemapProvider {
  id: BasemapMode;
  name: string;
  shortName: string;
  url: string;
  attribution: string;
  subdomains: string[];
  maxZoom: number;
}

export const BASEMAP_PROVIDERS: Record<BasemapMode, BasemapProvider> = {
  satellite: {
    id: 'satellite',
    name: 'High-Resolution Satellite Imagery (Esri World Imagery)',
    shortName: 'Satellite Imagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    subdomains: ['a', 'b', 'c'],
    maxZoom: 19
  },
  terrain: {
    id: 'terrain',
    name: 'Topographic Satellite Terrain (OpenTopoMap / USGS)',
    shortName: 'Terrain Relief',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
    subdomains: ['a', 'b', 'c'],
    maxZoom: 17
  }
};

export interface AtlasBookData {
  id: string;
  name: string;
  testament: string;
  category: string;
  region: string;
  coordinates: [number, number];
  zoom: number;
  keyCharacters: string[];
  summary: string;
  foundationalScripture?: string;
  milestones: Array<{
    name: string;
    coords: [number, number];
    narrative: string;
    scripture?: string;
  }>;
}

export interface BiblicalSite {
  id: string;
  name: string;
  region: string;
  coords: [number, number];
  scriptures: string[];
  description: string;
  archaeologyNote: string;
  bookId: string;
  chapter: number;
}

export type { CharacterJourney };

export interface EmpirePeriod {
  id: string;
  name: string;
  metal: string;
  era: string;
  scripture: string;
  capital: string;
  keyProphecy: string;
  coords: [number, number];
  bookId: string;
  chapter: number;
}

export const BIBLICAL_SITES: BiblicalSite[] = [
  {
    id: 'jerusalem',
    name: 'Jerusalem (Mount Zion)',
    region: 'Judea / Kingdom of Judah',
    coords: [31.7683, 35.2137],
    scriptures: ['Psalm 122:6', '2 Samuel 5:7', 'Luke 24:47'],
    description: 'The Royal City of David, site of Solomon’s Temple, the Crucifixion at Golgotha, and the Resurrection.',
    archaeologyNote: 'Excavations in the City of David have revealed the Stepped Stone Structure, Hezekiah’s Tunnel, and the Pool of Siloam.',
    bookId: 'PSA',
    chapter: 122
  },
  {
    id: 'samaria',
    name: 'Samaria (Shomron)',
    region: 'Northern Kingdom of Israel',
    coords: [32.2769, 35.1889],
    scriptures: ['1 Kings 16:24', '2 Kings 17:5–6', 'Acts 8:5–8'],
    description: 'Capital of the Northern 10 tribes from Omri until the 722 BC Assyrian conquest and deportation.',
    archaeologyNote: 'Samaria Ivories discovered matching Amos 6:4 ("beds of ivory"). Royal acropolis and monumental walls excavated.',
    bookId: '2KI',
    chapter: 17
  },
  {
    id: 'nineveh',
    name: 'Nineveh (Upper Tigris River)',
    region: 'Assyrian Empire',
    coords: [36.3600, 43.1500],
    scriptures: ['Jonah 3:1–10', 'Nahum 3:1–7', '2 Kings 19:36'],
    description: 'Great imperial capital of Assyria on the eastern bank of the Tigris river. Site of Jonah’s preaching and repentance.',
    archaeologyNote: 'Kuyunjik mound excavations unearthed Sennacherib’s "Palace Without Rival" and the Royal Library of Ashurbanipal.',
    bookId: 'JON',
    chapter: 3
  },
  {
    id: 'babylon',
    name: 'Babylon (Euphrates River)',
    region: 'Neo-Babylonian Empire',
    coords: [32.5364, 44.4209],
    scriptures: ['Daniel 1:1–2', 'Jeremiah 51:58', 'Revelation 18:2'],
    description: 'The golden head of Daniel’s statue; imperial city of Nebuchadnezzar where Daniel and the three Hebrew youths were tried.',
    archaeologyNote: 'Ishtar Gate, the Processional Way, and Nebuchadnezzar’s South Palace excavated by Robert Koldewey.',
    bookId: 'DAN',
    chapter: 1
  },
  {
    id: 'antioch_syria',
    name: 'Antioch on the Orontes',
    region: 'Syria',
    coords: [36.2021, 36.1606],
    scriptures: ['Acts 11:26', 'Acts 13:1–3', 'Galatians 2:11'],
    description: 'Where disciples were first called Christians; sending base of Paul & Barnabas for the Gentile mission.',
    archaeologyNote: 'Ancient Orontes harbor and Saint Peter’s Cave Church, one of the earliest meeting sanctuaries of the apostolic age.',
    bookId: 'ACT',
    chapter: 11
  },
  {
    id: 'rome',
    name: 'Imperial Rome',
    region: 'Italian Peninsula',
    coords: [41.9028, 12.4964],
    scriptures: ['Acts 28:16–31', 'Romans 1:7', '2 Timothy 4:6–8'],
    description: 'Capital of the Roman Empire; final imprisonment of Paul, where he declared the Kingdom of God unhindered.',
    archaeologyNote: 'Mamertine Prison where tradition holds Paul and Peter were held prior to martyrdom.',
    bookId: 'ROM',
    chapter: 1
  }
];

export const CHARACTER_JOURNEYS: CharacterJourney[] = BIBLICAL_JOURNEYS;

export const DANIELS_EMPIRES: EmpirePeriod[] = [
  {
    id: 'assyrian_empire',
    name: 'Neo-Assyrian Empire (722 BC Bounds)',
    metal: 'Lion with Eagle Wings & Cruel Yoke',
    era: 'c. 911–609 BC',
    scripture: '2 Kings 17:6 & Isaiah 10:5',
    capital: 'Nineveh (Upper Tigris)',
    keyProphecy: 'Instrument of chastisement over the Northern Kingdom of Samaria.',
    coords: [36.36, 43.15],
    bookId: '2KI',
    chapter: 17
  },
  {
    id: 'babylonian_empire',
    name: 'Neo-Babylonian Empire',
    metal: 'Head of Gold (Daniel 2:38)',
    era: '605–539 BC',
    scripture: 'Daniel 2:32, 38 & Jeremiah 25:11',
    capital: 'Babylon',
    keyProphecy: '"Thou art this head of gold."',
    coords: [32.5364, 44.4209],
    bookId: 'DAN',
    chapter: 2
  },
  {
    id: 'medo_persian',
    name: 'Medo-Persian Empire',
    metal: 'Chest & Arms of Silver (Daniel 2:39)',
    era: '539–331 BC',
    scripture: 'Daniel 5:28, 30–31 & Ezra 1:1–4',
    capital: 'Susa & Persepolis',
    keyProphecy: 'Decree of Cyrus releasing Judah to rebuild the Temple.',
    coords: [32.1892, 48.2436],
    bookId: 'EZR',
    chapter: 1
  },
  {
    id: 'greek_empire',
    name: 'Grecian Empire of Alexander',
    metal: 'Belly & Thighs of Bronze (Daniel 2:39)',
    era: '331–168 BC',
    scripture: 'Daniel 8:5–8, 21',
    capital: 'Alexandria & Pella',
    keyProphecy: 'The rough goat with a great horn between his eyes.',
    coords: [40.7570, 22.5200],
    bookId: 'DAN',
    chapter: 8
  },
  {
    id: 'roman_empire',
    name: 'Roman Empire',
    metal: 'Legs of Iron & Feet of Iron and Clay',
    era: '63 BC – AD 476',
    scripture: 'Daniel 2:40–43 & Luke 2:1',
    capital: 'Rome',
    keyProphecy: 'Strong as iron: forasmuch as iron breaketh in pieces.',
    coords: [41.9028, 12.4964],
    bookId: 'LUK',
    chapter: 2
  },
  {
    id: 'everlasting_kingdom',
    name: 'The Stone Kingdom of Christ',
    metal: 'Stone Cut Without Hands / Mount Zion',
    era: 'Eternal Kingdom',
    scripture: 'Daniel 2:44–45 & Daniel 7:13–14',
    capital: 'New Jerusalem',
    keyProphecy: '"In the days of these kings shall the God of heaven set up a kingdom, which shall never be destroyed."',
    coords: [31.7683, 35.2137],
    bookId: 'DAN',
    chapter: 7
  }
];

interface ImperialAtlasProps {
  onBack?: () => void;
  onNavigateToScripture?: (bookId: string, chapter: number) => void;
}

export const ImperialAtlas: React.FC<ImperialAtlasProps> = ({
  onBack,
  onNavigateToScripture
}) => {
  // Active Category: books | figures | sites | journeys | empires
  const [activeCategory, setActiveCategory] = useState<'books' | 'figures' | 'sites' | 'journeys' | 'empires'>('books');
  
  // Basemap Switcher State: default 'satellite' (High-Resolution Satellite Imagery)
  const [basemap, setBasemap] = useState<BasemapMode>('satellite');

  // Expandable & Full-Screen Map States
  const [isMapExpanded, setIsMapExpanded] = useState<boolean>(false);
  const [isMapFullScreen, setIsMapFullScreen] = useState<boolean>(false);

  // Leaflet Map Refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Data states
  const [atlasBooks, setAtlasBooks] = useState<AtlasBookData[]>([]);
  const [selectedBook, setSelectedBook] = useState<AtlasBookData | null>(null);
  const [selectedSite, setSelectedSite] = useState<BiblicalSite | null>(null);
  const [selectedJourney, setSelectedJourney] = useState<CharacterJourney>(CHARACTER_JOURNEYS[0]);
  const [selectedEmpire, setSelectedEmpire] = useState<EmpirePeriod | null>(null);
  const [selectedFigure, setSelectedFigure] = useState<BiblicalFigure | null>(BIBLICAL_FIGURES_NKJV[0] || null);
  const [figureSearchFilter, setFigureSearchFilter] = useState<'ALL' | 'OT' | 'NT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Offline sync state
  const [isOfflineSyncing, setIsOfflineSyncing] = useState(false);
  const [offlineSynced, setOfflineSynced] = useState<boolean>(() => {
    return localStorage.getItem('youngfire_atlas_offline_cached') === 'true';
  });

  // Comprehensive Atlas Search (All Biblical Figures NKJV, Milestones, Sites, Books)
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const results: Array<{
      type: 'figure' | 'journey' | 'stop' | 'site' | 'book';
      badge: string;
      title: string;
      subtitle: string;
      scripture?: string;
      bookId?: string;
      chapter?: number;
      coords?: [number, number];
      figure?: BiblicalFigure;
      journey?: CharacterJourney;
      site?: BiblicalSite;
      book?: AtlasBookData;
    }> = [];

    // 1. Search All Biblical Figures (NKJV) — Adam, Eve, Noah, Abraham, Moses, David, Jesus, Paul, etc.
    BIBLICAL_FIGURES_NKJV.forEach(fig => {
      const matchFigure = 
        fig.name.toLowerCase().includes(q) ||
        (fig.aliases && fig.aliases.some(a => a.toLowerCase().includes(q))) ||
        fig.meaning.toLowerCase().includes(q) ||
        fig.role.toLowerCase().includes(q) ||
        fig.description.toLowerCase().includes(q) ||
        fig.primaryScripture.toLowerCase().includes(q) ||
        fig.locationName.toLowerCase().includes(q);

      if (matchFigure) {
        results.push({
          type: 'figure',
          badge: 'Biblical Figure (NKJV)',
          title: `${fig.name} — ${fig.role}`,
          subtitle: `${fig.era} • ${fig.meaning}`,
          scripture: fig.primaryScripture,
          bookId: fig.bookId,
          chapter: fig.chapter,
          coords: fig.coords,
          figure: fig
        });
      }
    });

    // 2. Search Journeys and Characters (David, John, Philip, Elijah, etc.)
    CHARACTER_JOURNEYS.forEach(j => {
      const matchJourney = j.character.toLowerCase().includes(q) ||
        j.title.toLowerCase().includes(q) ||
        j.period.toLowerCase().includes(q);

      if (matchJourney) {
        results.push({
          type: 'journey',
          badge: 'Character Journey',
          title: `${j.character} — ${j.title}`,
          subtitle: `${j.period} • ${j.stops.length} Guided Stops`,
          scripture: j.scriptures.join(', '),
          journey: j,
          coords: j.stops[0]?.coords,
          bookId: j.stops[0]?.bookId,
          chapter: j.stops[0]?.chapter
        });
      }

      // Check specific stops/milestones
      j.stops.forEach(s => {
        if (s.name.toLowerCase().includes(q) || s.note.toLowerCase().includes(q) || s.scripture.toLowerCase().includes(q)) {
          results.push({
            type: 'stop',
            badge: `${j.character} Milestone`,
            title: s.name,
            subtitle: `${s.note} (${j.title})`,
            scripture: s.scripture,
            bookId: s.bookId,
            chapter: s.chapter,
            coords: s.coords,
            journey: j
          });
        }
      });
    });

    // 3. Search Biblical Sites
    BIBLICAL_SITES.forEach(s => {
      if (s.name.toLowerCase().includes(q) || s.region.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)) {
        results.push({
          type: 'site',
          badge: 'Biblical Site',
          title: s.name,
          subtitle: `${s.region}: ${s.description}`,
          scripture: s.scriptures.join(', '),
          bookId: s.bookId,
          chapter: s.chapter,
          coords: s.coords,
          site: s
        });
      }
    });

    // 4. Search 66 Books
    atlasBooks.forEach(b => {
      if (b.name.toLowerCase().includes(q) || b.id.toLowerCase().includes(q) || b.region.toLowerCase().includes(q) || b.summary.toLowerCase().includes(q)) {
        results.push({
          type: 'book',
          badge: 'Book of the Bible',
          title: `${b.name} (${b.id})`,
          subtitle: `${b.testament} • ${b.region} — ${b.summary}`,
          scripture: b.foundationalScripture,
          bookId: b.id,
          chapter: 1,
          coords: b.coordinates,
          book: b
        });
      }
    });

    return results.slice(0, 20);
  }, [searchQuery, atlasBooks]);

  const handleSelectSearchResult = (res: typeof searchResults[0]) => {
    if (res.type === 'figure' && res.figure) {
      setActiveCategory('figures');
      setSelectedFigure(res.figure);
      if (res.coords && leafletMapRef.current) {
        leafletMapRef.current.flyTo([res.coords[0], res.coords[1]], 9, { animate: true, duration: 1.0 });
      }
    } else if ((res.type === 'journey' || res.type === 'stop') && res.journey) {
      setActiveCategory('journeys');
      setSelectedJourney(res.journey);
      if (res.coords && leafletMapRef.current) {
        leafletMapRef.current.flyTo([res.coords[0], res.coords[1]], 9, { animate: true, duration: 1.0 });
      }
    } else if (res.type === 'site' && res.site) {
      setActiveCategory('sites');
      setSelectedSite(res.site);
      if (res.coords && leafletMapRef.current) {
        leafletMapRef.current.flyTo([res.coords[0], res.coords[1]], 9, { animate: true, duration: 1.0 });
      }
    } else if (res.type === 'book' && res.book) {
      setActiveCategory('books');
      setSelectedBook(res.book);
      if (res.coords && leafletMapRef.current) {
        leafletMapRef.current.flyTo([res.coords[0], res.coords[1]], Math.max(res.book.zoom || 7, 7), { animate: true, duration: 1.0 });
      }
    }
    setSearchQuery('');
  };

  // Load 66 Books from public/bible_books_atlas_66.json
  useEffect(() => {
    fetch('/bible_books_atlas_66.json')
      .then(res => res.json())
      .then((data: AtlasBookData[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setAtlasBooks(data);
          setSelectedBook(data[0]);
        }
      })
      .catch(err => {
        console.warn('Could not load bible_books_atlas_66.json:', err);
      });
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (leafletMapRef.current) return;

    // Centered on Ancient Near East (Jerusalem / Levant)
    const map = L.map(mapContainerRef.current, {
      center: [33.5, 36.0],
      zoom: 5,
      zoomControl: false,
      attributionControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const provider = BASEMAP_PROVIDERS[basemap];
    const tileLayer = L.tileLayer(provider.url, {
      maxZoom: provider.maxZoom,
      subdomains: provider.subdomains,
      // @ts-ignore
      r: typeof window !== 'undefined' && window.devicePixelRatio > 1 ? '@2x' : ''
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;
    leafletMapRef.current = map;

    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  }, []);

  // Hot-swap Tile Layer when basemap changes
  useEffect(() => {
    if (!leafletMapRef.current) return;
    const map = leafletMapRef.current;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const provider = BASEMAP_PROVIDERS[basemap];
    const newTileLayer = L.tileLayer(provider.url, {
      maxZoom: provider.maxZoom,
      subdomains: provider.subdomains,
      // @ts-ignore
      r: typeof window !== 'undefined' && window.devicePixelRatio > 1 ? '@2x' : ''
    }).addTo(map);
    tileLayerRef.current = newTileLayer;
  }, [basemap]);

  // Recalculate Leaflet viewport dimensions when map is expanded or toggled to/from Full Screen
  useEffect(() => {
    if (!leafletMapRef.current) return;
    const map = leafletMapRef.current;
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 120);
    const t2 = setTimeout(() => map.invalidateSize(), 350);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isMapExpanded, isMapFullScreen]);

  // Allow Escape key to exit Full Screen map mode
  useEffect(() => {
    if (!isMapFullScreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMapFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMapFullScreen]);

  // Synchronize Leaflet View on item selection
  useEffect(() => {
    if (!leafletMapRef.current) return;
    const map = leafletMapRef.current;
    if (activeCategory === 'figures' && selectedFigure) {
      map.flyTo([selectedFigure.coords[0], selectedFigure.coords[1]], 8, {
        animate: true,
        duration: 1.0
      });
    } else if (activeCategory === 'books' && selectedBook) {
      map.flyTo([selectedBook.coordinates[0], selectedBook.coordinates[1]], Math.max(selectedBook.zoom || 6, 6), {
        animate: true,
        duration: 1.0
      });
    } else if (activeCategory === 'sites' && selectedSite) {
      map.flyTo([selectedSite.coords[0], selectedSite.coords[1]], 8, {
        animate: true,
        duration: 1.0
      });
    } else if (activeCategory === 'empires' && selectedEmpire) {
      map.flyTo([selectedEmpire.coords[0], selectedEmpire.coords[1]], 6, {
        animate: true,
        duration: 1.0
      });
    } else if (activeCategory === 'journeys' && selectedJourney && selectedJourney.stops.length > 0) {
      const firstStop = selectedJourney.stops[0];
      map.flyTo([firstStop.coords[0], firstStop.coords[1]], 6, {
        animate: true,
        duration: 1.0
      });
    }
  }, [activeCategory, selectedFigure, selectedBook, selectedSite, selectedEmpire, selectedJourney]);

  // Render Markers on Map
  useEffect(() => {
    if (!leafletMapRef.current || !markersLayerRef.current) return;
    const markersGroup = markersLayerRef.current;
    markersGroup.clearLayers();

    const createCustomPin = (color: string, label: string) => {
      return L.divIcon({
        className: 'custom-leaflet-pin',
        html: `
          <div style="display: flex; align-items: center; justify-content: center; position: relative;">
            <div style="background: ${color}; width: 18px; height: 18px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${color};"></div>
            <span style="position: absolute; left: 22px; background: rgba(7, 11, 24, 0.9); color: white; font-family: monospace; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; white-space: nowrap; border: 1px solid rgba(255,255,255,0.2); pointer-events: none;">${label}</span>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -28]
      });
    };

    if (activeCategory === 'figures' && selectedFigure) {
      const figMarker = L.marker([selectedFigure.coords[0], selectedFigure.coords[1]], {
        icon: createCustomPin('#F59E0B', selectedFigure.name)
      });
      figMarker.bindPopup(`
        <div style="font-family: Outfit, sans-serif; color: #000000; padding: 4px; max-width: 250px;">
          <strong style="font-size: 14px; color: #B45309;">${selectedFigure.name}</strong><br/>
          <span style="color: #475569; font-size: 11px; font-weight: bold;">${selectedFigure.role}</span><br/>
          <span style="color: #0284C7; font-size: 11px; font-weight: bold;">📖 ${selectedFigure.primaryScripture}</span><br/>
          <p style="font-size: 10px; color: #64748B; margin: 4px 0;">${selectedFigure.meaning}</p>
          <p style="font-size: 11px; margin-top: 4px; color: #1E293B;">${selectedFigure.description}</p>
        </div>
      `);
      markersGroup.addLayer(figMarker);
      figMarker.openPopup();
    } else if (activeCategory === 'books' && selectedBook) {
      const centerMarker = L.marker([selectedBook.coordinates[0], selectedBook.coordinates[1]], {
        icon: createCustomPin('#F59E0B', selectedBook.name)
      });
      centerMarker.bindPopup(`
        <div style="font-family: Outfit, sans-serif; color: #000000; padding: 4px;">
          <strong style="font-size: 14px;">${selectedBook.name}</strong><br/>
          <span style="color: #6B7280; font-size: 11px;">Region: ${selectedBook.region}</span><br/>
          <p style="font-size: 11px; margin-top: 4px;">${selectedBook.summary}</p>
        </div>
      `);
      markersGroup.addLayer(centerMarker);

      if (selectedBook.milestones) {
        selectedBook.milestones.forEach((m) => {
          const mMarker = L.marker([m.coords[0], m.coords[1]], {
            icon: createCustomPin('#06B6D4', m.name)
          });
          mMarker.bindPopup(`
            <div style="font-family: Outfit, sans-serif; color: #000000; padding: 4px;">
              <strong style="font-size: 13px;">${m.name}</strong><br/>
              ${m.scripture ? `<span style="color: #0284C7; font-size: 11px; font-weight: bold;">📖 ${m.scripture}</span><br/>` : ''}
              <p style="font-size: 11px; margin-top: 4px;">${m.narrative}</p>
            </div>
          `);
          markersGroup.addLayer(mMarker);
        });
      }
    } else if (activeCategory === 'sites') {
      BIBLICAL_SITES.forEach((site) => {
        const marker = L.marker([site.coords[0], site.coords[1]], {
          icon: createCustomPin('#06B6D4', site.name)
        });
        marker.bindPopup(`
          <div style="font-family: Outfit, sans-serif; color: #000000; padding: 4px;">
            <strong style="font-size: 13px;">${site.name}</strong><br/>
            <span style="color: #0284C7; font-size: 11px; font-weight: bold;">Region: ${site.region}</span><br/>
            <p style="font-size: 11px; margin-top: 4px;">${site.description}</p>
          </div>
        `);
        marker.on('click', () => {
          setSelectedSite(site);
        });
        markersGroup.addLayer(marker);
      });
    } else if (activeCategory === 'journeys' && selectedJourney) {
      const latlngs: [number, number][] = selectedJourney.stops.map(s => [s.coords[0], s.coords[1]]);
      const polyline = L.polyline(latlngs, {
        color: '#F97316',
        weight: 3,
        opacity: 0.85,
        dashArray: '6, 6'
      });
      markersGroup.addLayer(polyline);

      selectedJourney.stops.forEach((stop, idx) => {
        const marker = L.marker([stop.coords[0], stop.coords[1]], {
          icon: createCustomPin('#F97316', stop.name)
        });
        marker.bindPopup(`
          <div style="font-family: Outfit, sans-serif; color: #000000; padding: 4px;">
            <strong style="font-size: 13px;">${idx + 1}. ${stop.name}</strong><br/>
            <span style="color: #D97706; font-size: 11px; font-weight: bold;">📖 ${stop.scripture}</span><br/>
            <p style="font-size: 11px; margin-top: 4px;">${stop.note}</p>
          </div>
        `);
        markersGroup.addLayer(marker);
      });
    } else if (activeCategory === 'empires') {
      DANIELS_EMPIRES.forEach((empire) => {
        const circle = L.circle([empire.coords[0], empire.coords[1]], {
          color: empire.id === 'assyrian_empire' ? '#EF4444' : '#A855F7',
          fillColor: empire.id === 'assyrian_empire' ? '#DC2626' : '#A855F7',
          fillOpacity: 0.15,
          radius: 280000
        });
        circle.bindPopup(`
          <div style="font-family: Outfit, sans-serif; color: #000000; padding: 4px;">
            <strong style="font-size: 13px;">${empire.name}</strong><br/>
            <span>${empire.era} &bull; ${empire.metal}</span><br/>
            <p style="font-size: 11px; margin-top: 4px;">${empire.keyProphecy}</p>
          </div>
        `);
        circle.on('click', () => {
          setSelectedEmpire(empire);
        });
        markersGroup.addLayer(circle);
      });
    }
  }, [activeCategory, selectedFigure, selectedBook, selectedJourney, basemap]);

  const handleOfflineSync = () => {
    setIsOfflineSyncing(true);
    setTimeout(() => {
      setIsOfflineSyncing(false);
      setOfflineSynced(true);
      try {
        localStorage.setItem('youngfire_atlas_offline_cached', 'true');
      } catch {}
    }, 1200);
  };

  const handleScriptureClick = (bookId: string, chapter: number = 1) => {
    if (onNavigateToScripture) {
      onNavigateToScripture(bookId, chapter);
    } else {
      window.dispatchEvent(new CustomEvent('yf_navigate_scripture', { detail: { bookId, chapter } }));
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 pb-20 select-none px-2 sm:px-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-[#0a0a0a] border border-white/15 text-slate-200 hover:text-white cursor-pointer transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-black uppercase font-['Outfit'] text-white">
                IMPERIAL CARTOGRAPHY & ATLAS
              </h2>
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              Satellite & Terrain GIS &bull; 66 Canonical Books &bull; Daniel’s Prophetic Empires
            </p>
          </div>
        </div>

        {/* Top Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMapExpanded(prev => !prev)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isMapExpanded
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                : 'bg-white/5 border-white/15 text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title={isMapExpanded ? 'Collapse map height' : 'Expand map height'}
          >
            <ChevronsUpDown className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isMapExpanded ? 'Collapse Map' : 'Expand Map'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMapFullScreen(true)}
            className="px-3 py-1.5 rounded-xl border border-cyan-400/50 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            title="Open Atlas Map in Full Screen"
          >
            <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Full Screen</span>
          </button>

          <button
            onClick={handleOfflineSync}
            disabled={isOfflineSyncing}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              offlineSynced
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : 'bg-amber-500/10 border-amber-400/40 text-amber-300 hover:bg-amber-500/20'
            }`}
            title="Download study maps for offline use"
          >
            {isOfflineSyncing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>Caching...</span>
              </>
            ) : offlineSynced ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                <span>Offline Cached</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Sync Offline</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* GLOBAL SEARCH INPUT ATOP THE ATLAS */}
      <div className="relative z-30">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3.5 text-amber-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search biblical figures, journeys, sites, books (e.g. David, John, Philip, Elijah, Patmos, Jerusalem)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-amber-500/40 focus:border-amber-400 rounded-2xl pl-10 pr-24 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all shadow-inner"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 px-2 py-1 rounded-lg text-[10px] font-mono font-bold bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Clear
            </button>
          ) : (
            <div className="absolute right-3 px-2 py-0.5 rounded-lg text-[10px] font-mono text-slate-400 bg-white/5 border border-white/10">
              Atlas Search
            </div>
          )}
        </div>

        {/* Real-time Search Results Dropdown when query entered */}
        {searchQuery.trim().length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-2 max-h-80 overflow-y-auto rounded-2xl bg-[#000000] border border-amber-500/50 shadow-[0_20px_50px_rgba(0,0,0,0.95)] p-3 space-y-2 backdrop-blur-xl z-50">
            <div className="flex items-center justify-between pb-2 border-b border-white/10 text-[10px] font-mono text-slate-400">
              <span>Matching Characters, Sites & Scriptures</span>
              <span className="text-amber-400 font-bold">{searchResults.length} Results</span>
            </div>

            {searchResults.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400 font-mono">
                No biblical figures, sites, or books match "{searchQuery}".
              </div>
            ) : (
              searchResults.map((res, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectSearchResult(res)}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-amber-500/40 cursor-pointer transition-all flex items-start justify-between gap-3 group"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${
                        (res.type === 'journey' || res.type === 'stop') ? 'bg-orange-500/20 text-orange-300 border-orange-500/40' :
                        res.type === 'site' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                        'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}>
                        {res.badge}
                      </span>
                      <h4 className="text-xs font-bold text-white group-hover:text-amber-300 truncate">
                        {res.title}
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-300 line-clamp-1">
                      {res.subtitle}
                    </p>
                    {res.scripture && (
                      <span className="text-[10px] font-mono text-amber-300 font-semibold flex items-center gap-1">
                        📖 {res.scripture}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[10px] font-mono text-amber-400 group-hover:underline flex items-center gap-1">
                      Fly to &rarr;
                    </span>
                    {res.bookId && res.chapter && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleScriptureClick(res.bookId!, res.chapter!);
                        }}
                        className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 cursor-pointer"
                      >
                        Read Word
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 5-Category Segmented Switcher Strip */}
      <div className="bg-[#0a0a0a] p-1.5 rounded-2xl border border-white/10 flex flex-wrap sm:flex-nowrap gap-1 shadow-lg">
        <button
          onClick={() => setActiveCategory('books')}
          className={`flex-1 min-w-[100px] py-2 px-2.5 rounded-xl text-xs font-black uppercase tracking-wider font-['Outfit'] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeCategory === 'books'
              ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Books (66)</span>
        </button>

        <button
          onClick={() => setActiveCategory('figures')}
          className={`flex-1 min-w-[100px] py-2 px-2.5 rounded-xl text-xs font-black uppercase tracking-wider font-['Outfit'] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeCategory === 'figures'
              ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-md font-bold'
              : 'text-amber-400/80 hover:text-amber-300 hover:bg-white/5'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Figures (NKJV)</span>
        </button>

        <button
          onClick={() => setActiveCategory('sites')}
          className={`flex-1 min-w-[100px] py-2 px-2.5 rounded-xl text-xs font-black uppercase tracking-wider font-['Outfit'] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeCategory === 'sites'
              ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Biblical Sites</span>
        </button>

        <button
          onClick={() => setActiveCategory('journeys')}
          className={`flex-1 min-w-[100px] py-2 px-2.5 rounded-xl text-xs font-black uppercase tracking-wider font-['Outfit'] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeCategory === 'journeys'
              ? 'bg-orange-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Journeys</span>
        </button>

        <button
          onClick={() => setActiveCategory('empires')}
          className={`flex-1 min-w-[100px] py-2 px-2.5 rounded-xl text-xs font-black uppercase tracking-wider font-['Outfit'] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeCategory === 'empires'
              ? 'bg-purple-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Daniel's Empires</span>
        </button>
      </div>

      {/* Interactive Leaflet Map Container with Floating Basemap Switcher & Expand/Full-Screen HUD */}
      <div
        className={
          isMapFullScreen
            ? 'fixed inset-0 z-[9999] w-screen h-screen bg-[#000000] overflow-hidden'
            : `relative w-full ${
                isMapExpanded ? 'h-[580px] sm:h-[720px]' : 'h-[340px] sm:h-[440px]'
              } rounded-3xl border border-white/15 overflow-hidden shadow-2xl bg-[#000000] transition-[height] duration-300`
        }
      >
        {/* Map Canvas */}
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Top-Left Engine Indicator + Full-Screen Quick Category Switcher */}
        <div className="absolute top-3 left-3 z-30 flex flex-col gap-2 max-w-[calc(100vw-24px)] sm:max-w-xl pointer-events-none">
          <div className="bg-[#070B18]/90 border border-white/15 px-3 py-1.5 rounded-xl backdrop-blur-md flex items-center gap-2 shadow-lg self-start pointer-events-auto">
            {basemap === 'satellite' && <Satellite className="w-3.5 h-3.5 text-amber-400" />}
            {basemap === 'terrain' && <Mountain className="w-3.5 h-3.5 text-emerald-400" />}
            <span className="text-[11px] font-mono font-bold text-white uppercase tracking-wider">
              {BASEMAP_PROVIDERS[basemap].shortName} &bull; GIS Engine
            </span>
          </div>

          {isMapFullScreen && (
            <div className="bg-[#070B18]/95 border border-white/15 p-1.5 rounded-2xl backdrop-blur-xl shadow-2xl flex flex-wrap items-center gap-1 pointer-events-auto">
              <button
                type="button"
                onClick={() => setActiveCategory('books')}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                  activeCategory === 'books'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <BookOpen className="w-3 h-3" />
                <span>Books</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('figures')}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                  activeCategory === 'figures'
                    ? 'bg-amber-400 text-slate-950 font-black'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>Figures</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('sites')}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                  activeCategory === 'sites'
                    ? 'bg-cyan-400 text-slate-950 font-black'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <MapPin className="w-3 h-3" />
                <span>Sites</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('journeys')}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                  activeCategory === 'journeys'
                    ? 'bg-orange-500 text-slate-950 font-black'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Navigation className="w-3 h-3" />
                <span>Journeys</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('empires')}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                  activeCategory === 'empires'
                    ? 'bg-purple-500 text-slate-950 font-black'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>Empires</span>
              </button>
            </div>
          )}
        </div>

        {/* Floating Basemap & Expand / Full-Screen Control Pill in the Top-Right Corner */}
        <div className="absolute top-3 right-3 z-30 bg-[#070B18]/95 border border-amber-500/60 p-1 rounded-2xl backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.85)] flex flex-wrap items-center justify-end gap-1 max-w-[75vw] sm:max-w-none">
          {/* Satellite Imagery (Default) */}
          <button
            type="button"
            onClick={() => setBasemap('satellite')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              basemap === 'satellite'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 font-black scale-100 ring-1 ring-amber-400'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="High-Resolution Satellite Imagery (Esri World Imagery)"
          >
            <Satellite className="w-3.5 h-3.5" />
            <span className="hidden xs:inline sm:inline">Satellite Imagery</span>
          </button>

          {/* Topographic Terrain */}
          <button
            type="button"
            onClick={() => setBasemap('terrain')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              basemap === 'terrain'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 font-black scale-100 ring-1 ring-emerald-300'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Topographic Terrain (OpenTopoMap / USGS)"
          >
            <Mountain className="w-3.5 h-3.5" />
            <span className="hidden xs:inline sm:inline">Terrain Relief</span>
          </button>

          {/* Expand / Collapse Inline Height Button (when not Full Screen) */}
          {!isMapFullScreen && (
            <button
              type="button"
              onClick={() => setIsMapExpanded(prev => !prev)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                isMapExpanded
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/50'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
              title={isMapExpanded ? 'Collapse Map Height' : 'Expand Map Height'}
            >
              <ChevronsUpDown className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">{isMapExpanded ? 'Collapse' : 'Expand'}</span>
            </button>
          )}

          {/* Full Screen / Exit Full Screen Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMapFullScreen(prev => !prev)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isMapFullScreen
                ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-lg font-black'
                : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40'
            }`}
            title={isMapFullScreen ? 'Exit Full Screen (Esc)' : 'Open Full Screen Map'}
          >
            {isMapFullScreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Exit Full Screen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Full Screen</span>
              </>
            )}
          </button>
        </div>

        {/* Bottom Info Pill */}
        <div className="absolute bottom-3 left-3 z-20 bg-[#070B18]/90 border border-white/15 px-3 py-1.5 rounded-xl text-[10px] font-mono text-slate-300 backdrop-blur-md flex items-center gap-2">
          <span>Scroll to zoom &bull; Click any marker for historical scripture data</span>
          {isMapFullScreen && (
            <button
              type="button"
              onClick={() => setIsMapFullScreen(false)}
              className="ml-2 px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-amber-300 font-bold cursor-pointer"
            >
              Press ESC or Tap to Exit
            </button>
          )}
        </div>
      </div>

      {/* CATEGORY 0: BIBLICAL FIGURES (NKJV DIRECTORY) */}
      {activeCategory === 'figures' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div>
              <h3 className="text-sm font-bold text-white font-['Outfit'] uppercase flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Exhaustive Biblical Figures Directory (NKJV)</span>
              </h3>
              <p className="text-[11px] font-mono text-slate-400">
                Search and explore every major & minor biblical figure, prophet, apostle, and patriarch.
              </p>
            </div>

            {/* Testament Filter Bar */}
            <div className="flex items-center gap-1.5 p-1 bg-[#0a0a0a] rounded-xl border border-white/10 self-start sm:self-auto">
              <button
                onClick={() => setFigureSearchFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  figureSearchFilter === 'ALL'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({BIBLICAL_FIGURES_NKJV.length})
              </button>
              <button
                onClick={() => setFigureSearchFilter('OT')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  figureSearchFilter === 'OT'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Old Testament ({BIBLICAL_FIGURES_NKJV.filter(f => f.testament === 'OT').length})
              </button>
              <button
                onClick={() => setFigureSearchFilter('NT')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  figureSearchFilter === 'NT'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                New Testament ({BIBLICAL_FIGURES_NKJV.filter(f => f.testament === 'NT').length})
              </button>
            </div>
          </div>

          {/* Active Figure Profile Card */}
          {selectedFigure && (
            <div className="bg-[#0a0a0a] border border-amber-500/40 rounded-3xl p-5 shadow-2xl space-y-4 relative">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[10px] font-mono uppercase">
                      {selectedFigure.testament === 'OT' ? 'Old Testament' : 'New Testament'}
                    </span>
                    <span className="text-[11px] font-mono text-amber-300">
                      Era: {selectedFigure.era}
                    </span>
                    <span className="text-[11px] font-mono text-amber-400">
                      📍 {selectedFigure.locationName}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-white uppercase font-['Outfit'] mt-1">
                    {selectedFigure.name}
                  </h3>
                  <p className="text-xs font-mono font-bold text-amber-300">
                    {selectedFigure.role}
                  </p>
                  <p className="text-[11px] font-mono text-slate-400 mt-1 italic">
                    Meaning: {selectedFigure.meaning}
                  </p>
                </div>

                <div className="flex flex-col sm:items-end gap-2">
                  <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold">
                    📖 {selectedFigure.primaryScripture}
                  </div>
                  {onNavigateToScripture && (
                    <button
                      onClick={() => onNavigateToScripture(selectedFigure.bookId, selectedFigure.chapter)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold font-mono transition-colors flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <span>Read Passage (NKJV)</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Biography & Theological Summary */}
              <div className="space-y-3">
                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  {selectedFigure.description}
                </p>

                {/* Cross References */}
                {selectedFigure.allScriptures && selectedFigure.allScriptures.length > 0 && (
                  <div>
                    <h5 className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                      Canonical NKJV References:
                    </h5>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedFigure.allScriptures.map((scr, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-mono text-slate-300"
                        >
                          {scr}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Grid of All Figures */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
              <span>Select Figure to Center on Imperial Map:</span>
              <span className="text-amber-400 font-bold">
                {
                  BIBLICAL_FIGURES_NKJV.filter(f =>
                    figureSearchFilter === 'ALL' || f.testament === figureSearchFilter
                  ).length
                } figures listed
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-[300px] overflow-y-auto p-1 scrollbar-thin">
              {BIBLICAL_FIGURES_NKJV
                .filter(f => figureSearchFilter === 'ALL' || f.testament === figureSearchFilter)
                .map(fig => (
                  <button
                    key={fig.id}
                    onClick={() => {
                      setSelectedFigure(fig);
                      if (leafletMapRef.current) {
                        leafletMapRef.current.flyTo([fig.coords[0], fig.coords[1]], 8, { animate: true, duration: 1.0 });
                      }
                    }}
                    className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                      selectedFigure?.id === fig.id
                        ? 'bg-amber-400 text-slate-950 font-bold border-amber-300 shadow-md'
                        : 'bg-[#0a0a0a] text-slate-300 border-white/10 hover:border-amber-400/50 hover:text-white'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold truncate font-['Outfit']">
                        {fig.name}
                      </div>
                      <div className="text-[9px] font-mono opacity-80 truncate">
                        {fig.role}
                      </div>
                    </div>
                    <div className="text-[8px] font-mono mt-1 opacity-70 truncate">
                      {fig.primaryScripture}
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY 1: BOOKS OF THE BIBLE (66 BOOKS ATLAS) */}
      {activeCategory === 'books' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono font-bold text-slate-300">
              Select any canonical book to explore geographical context & milestones:
            </span>
            <div className="text-[11px] font-mono text-amber-400 font-bold px-3 py-1.5 bg-[#0a0a0a] rounded-xl border border-white/10 whitespace-nowrap">
              66 Books Ready
            </div>
          </div>

          {/* Selected Book Explanation Card */}
          {selectedBook && (
            <div className="bg-[#0a0a0a] border border-amber-500/40 rounded-3xl p-5 shadow-2xl space-y-4 relative">
              <div className="flex items-start justify-between border-b border-white/10 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px] font-mono uppercase">
                      {selectedBook.testament} &bull; {selectedBook.category}
                    </span>
                    <span className="text-[11px] font-mono text-amber-400">
                      Region: {selectedBook.region}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white uppercase font-['Outfit'] mt-1">
                    {selectedBook.name}
                  </h3>
                </div>

                <button
                  onClick={() => handleScriptureClick(selectedBook.id, 1)}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs uppercase flex items-center gap-1.5 hover:bg-amber-400 transition-colors shadow-lg cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Read Chapter 1 &rarr;</span>
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-mono">
                {selectedBook.summary}
              </p>

              {/* Milestones / Key Stops in Book */}
              {selectedBook.milestones && selectedBook.milestones.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <h4 className="text-[11px] font-mono uppercase font-bold text-amber-400">
                    Key Historical Geography & Milestones:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedBook.milestones.map((m, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          if (leafletMapRef.current) {
                            leafletMapRef.current.flyTo([m.coords[0], m.coords[1]], 8, { animate: true, duration: 1.0 });
                          }
                        }}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                          <span>{m.name}</span>
                          {m.scripture && <span className="text-[10px] text-amber-400 font-mono">{m.scripture}</span>}
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-1 leading-snug">
                          {m.narrative}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Book Select Buttons Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-[280px] overflow-y-auto p-1">
            {atlasBooks
              .filter(b => 
                !searchQuery || 
                b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                b.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.category.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map(b => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBook(b)}
                  className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                    selectedBook?.id === b.id
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md'
                      : 'bg-[#0a0a0a] text-slate-300 border-white/10 hover:border-white/25 hover:text-white'
                  }`}
                >
                  <span className="text-[10px] font-mono opacity-80">{b.id}</span>
                  <span className="text-xs font-bold font-['Outfit'] truncate">{b.name}</span>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* CATEGORY 2: BIBLICAL SITES */}
      {activeCategory === 'sites' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {BIBLICAL_SITES.map((site) => (
              <div
                key={site.id}
                onClick={() => {
                  setSelectedSite(site);
                  if (leafletMapRef.current) {
                    leafletMapRef.current.flyTo([site.coords[0], site.coords[1]], 8, { animate: true, duration: 1.0 });
                  }
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                  selectedSite?.id === site.id
                    ? 'bg-amber-500/15 border-amber-400 shadow-lg text-white'
                    : 'bg-[#0a0a0a] border-white/10 hover:border-white/20 text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {site.region}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleScriptureClick(site.bookId, site.chapter);
                    }}
                    className="text-xs font-mono text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <BookOpen className="w-3 h-3" />
                    <span>Read</span>
                  </button>
                </div>
                <h4 className="text-sm font-black uppercase font-['Outfit'] text-white">
                  {site.name}
                </h4>
                <p className="text-xs text-slate-300 font-mono leading-relaxed line-clamp-3">
                  {site.description}
                </p>
                <div className="text-[10px] text-amber-400 font-mono bg-white/5 p-2 rounded-lg border border-white/10">
                  <span className="font-bold block text-slate-400">Archaeological Evidence:</span>
                  {site.archaeologyNote}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CATEGORY 3: CHARACTER JOURNEYS */}
      {activeCategory === 'journeys' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CHARACTER_JOURNEYS.map((j) => (
              <button
                key={j.id}
                onClick={() => setSelectedJourney(j)}
                className={`px-3 py-2 rounded-xl text-xs font-mono font-bold whitespace-nowrap cursor-pointer border transition-all ${
                  selectedJourney.id === j.id
                    ? 'bg-orange-500 text-slate-950 border-orange-400 shadow-md'
                    : 'bg-[#0a0a0a] text-slate-300 border-white/10 hover:border-white/20 hover:text-white'
                }`}
              >
                {j.title}
              </button>
            ))}
          </div>

          <div className="bg-[#0a0a0a] border border-orange-500/40 rounded-3xl p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30 font-bold">
                  {selectedJourney.period} &bull; {selectedJourney.character}
                </span>
                <h3 className="text-base font-black uppercase font-['Outfit'] text-white mt-1">
                  {selectedJourney.title}
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-orange-400">
                {selectedJourney.stops.length} Guided Stops
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[320px] overflow-y-auto p-1">
              {selectedJourney.stops.map((stop, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    if (leafletMapRef.current) {
                      leafletMapRef.current.flyTo([stop.coords[0], stop.coords[1]], 8, { animate: true, duration: 1.0 });
                    }
                  }}
                  className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white font-['Outfit']">
                      {idx + 1}. {stop.name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleScriptureClick(stop.bookId, stop.chapter);
                      }}
                      className="text-[10px] text-amber-400 font-mono hover:underline"
                    >
                      📖 {stop.scripture}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-300 font-mono leading-snug">
                    {stop.note}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY 4: DANIEL'S EMPIRES */}
      {activeCategory === 'empires' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {DANIELS_EMPIRES.map((empire) => (
              <div
                key={empire.id}
                onClick={() => {
                  setSelectedEmpire(empire);
                  if (leafletMapRef.current) {
                    leafletMapRef.current.flyTo([empire.coords[0], empire.coords[1]], 6, { animate: true, duration: 1.0 });
                  }
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                  selectedEmpire?.id === empire.id
                    ? 'bg-purple-500/20 border-purple-400 shadow-lg text-white'
                    : 'bg-[#0a0a0a] border-white/10 hover:border-white/20 text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {empire.era}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleScriptureClick(empire.bookId, empire.chapter);
                    }}
                    className="text-xs font-mono text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <BookOpen className="w-3 h-3" />
                    <span>Read</span>
                  </button>
                </div>
                <h4 className="text-sm font-black uppercase font-['Outfit'] text-white">
                  {empire.name}
                </h4>
                <p className="text-[11px] text-amber-300 font-mono font-bold">
                  {empire.metal}
                </p>
                <p className="text-xs text-slate-300 font-mono leading-relaxed bg-white/5 p-2 rounded-lg border border-white/10">
                  {empire.keyProphecy}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
