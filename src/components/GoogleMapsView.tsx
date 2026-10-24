import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/indexedDB';
import type { Contact } from '../types';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  Pin, 
  InfoWindow 
} from '@vis.gl/react-google-maps';
import { 
  MapPin, 
  Navigation, 
  Search, 
  Building2, 
  Users, 
  Truck, 
  Phone, 
  ExternalLink, 
  FileText, 
  FileSpreadsheet, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Compass, 
  RefreshCw,
  Plus,
  Route as RouteIcon,
  Crosshair
} from 'lucide-react';

interface GoogleMapsViewProps {
  onOpenNewInvoiceForContact?: (contactId: string) => void;
  onOpenNewQuoteForContact?: (contactId: string) => void;
}

// Default warehouse coordinates: Panama City central hub
const CENTRAL_WAREHOUSE = {
  name: 'Almacén Central - Distribuidora El Imperio',
  address: 'Av. Empresarial Torre 2, Piso 8, Ciudad de Panamá',
  lat: 8.9824,
  lng: -79.5199,
};

// Preset coordinates for standard Panama zones if contact coordinates are not yet geocoded
const PANAMA_ZONES: { [key: string]: { lat: number; lng: number } } = {
  'san francisco': { lat: 8.9890, lng: -79.4980 },
  'costa del este': { lat: 9.0110, lng: -79.4670 },
  'bella vista': { lat: 8.9824, lng: -79.5199 },
  'obarrio': { lat: 8.9860, lng: -79.5150 },
  'el cangrejo': { lat: 8.9880, lng: -79.5240 },
  'calidonia': { lat: 8.9660, lng: -79.5350 },
  'betania': { lat: 9.0060, lng: -79.5320 },
  'albrook': { lat: 8.9740, lng: -79.5520 },
  'juan diaz': { lat: 9.0430, lng: -79.4520 },
  'rio abajo': { lat: 9.0120, lng: -79.4890 },
  'parque lefevre': { lat: 9.0080, lng: -79.4820 },
  'tocumen': { lat: 9.0800, lng: -79.3800 },
  'david': { lat: 8.4273, lng: -82.4309 },
  'colon': { lat: 9.3598, lng: -79.9014 },
  'chitre': { lat: 7.9622, lng: -80.4286 },
  'santiago': { lat: 8.1000, lng: -80.9833 },
  'panama': { lat: 8.9824, lng: -79.5199 },
};

function resolveContactCoordinates(contact: Contact, index: number): { lat: number; lng: number } {
  if (contact.lat && contact.lng) {
    return { lat: contact.lat, lng: contact.lng };
  }

  // Look for zone keyword in address or province/district
  const text = `${contact.address || ''} ${contact.district || ''} ${contact.corregimiento || ''} ${contact.province || ''}`.toLowerCase();
  
  for (const [zone, coords] of Object.entries(PANAMA_ZONES)) {
    if (text.includes(zone)) {
      // Add slight offset so overlapping markers in the same zone do not obscure each other
      const offsetLat = ((index % 5) - 2) * 0.003;
      const offsetLng = (((index * 3) % 5) - 2) * 0.003;
      return { lat: coords.lat + offsetLat, lng: coords.lng + offsetLng };
    }
  }

  // Default distribution spread around Panama City
  const angle = (index * 137.5 * Math.PI) / 180;
  const radius = 0.015 + (index * 0.004);
  return {
    lat: CENTRAL_WAREHOUSE.lat + Math.sin(angle) * radius,
    lng: CENTRAL_WAREHOUSE.lng + Math.cos(angle) * radius,
  };
}

export const GoogleMapsView: React.FC<GoogleMapsViewProps> = ({
  onOpenNewInvoiceForContact,
  onOpenNewQuoteForContact,
}) => {
  // Read stored API key or environment variable
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('imperio_google_maps_api_key') ||
      (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ||
      '';
  });
  const [tempKeyInput, setTempKeyInput] = useState<string>(apiKey);
  const [showKeyConfig, setShowKeyConfig] = useState<boolean>(!apiKey);

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'client' | 'provider' | 'with_balance'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedForRoute, setSelectedForRoute] = useState<string[]>([]);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(CENTRAL_WAREHOUSE);
  const [mapZoom, setMapZoom] = useState<number>(12);

  // Load contacts from indexedDB
  const contacts = useLiveQuery(() => db.contacts.toArray(), []) || [];

  // Filter contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const matchesSearch = 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.address && c.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.rucOrCedula && c.rucOrCedula.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesType = true;
      if (filterType === 'client') matchesType = c.type === 'client' || c.type === 'both';
      if (filterType === 'provider') matchesType = c.type === 'provider' || c.type === 'both';
      if (filterType === 'with_balance') matchesType = (c.balance || 0) > 0;

      return matchesSearch && matchesType;
    });
  }, [contacts, searchQuery, filterType]);

  // Handle saving API key
  const handleSaveApiKey = () => {
    const cleanKey = tempKeyInput.trim();
    setApiKey(cleanKey);
    localStorage.setItem('imperio_google_maps_api_key', cleanKey);
    setShowKeyConfig(false);
  };

  // Toggle contact in delivery route
  const toggleRouteStop = (contactId: string) => {
    setSelectedForRoute(prev => 
      prev.includes(contactId) ? prev.filter(id => id !== contactId) : [...prev, contactId]
    );
  };

  // Generate Google Maps External Navigation URL
  const getGoogleMapsRouteUrl = () => {
    if (selectedForRoute.length === 0) return '#';
    const routeContacts = selectedForRoute
      .map(id => contacts.find(c => c.id === id))
      .filter((c): c is Contact => !!c);

    const origin = `${CENTRAL_WAREHOUSE.lat},${CENTRAL_WAREHOUSE.lng}`;
    const destinationContact = routeContacts[routeContacts.length - 1];
    const destinationCoords = resolveContactCoordinates(destinationContact, 0);
    const destination = `${destinationCoords.lat},${destinationCoords.lng}`;

    const waypoints = routeContacts
      .slice(0, -1)
      .map((c, i) => {
        const coords = resolveContactCoordinates(c, i);
        return `${coords.lat},${coords.lng}`;
      })
      .join('|');

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    if (waypoints) {
      url += `&waypoints=${encodeURIComponent(waypoints)}`;
    }
    return url;
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Mapa y Rutas de Entrega
            </h1>
            <span className="px-2.5 py-0.5 bg-sky-100 text-sky-800 text-xs font-bold rounded-full border border-sky-200">
              Google Maps Platform
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Geolocalización interactiva de clientes, proveedores, puntos de entrega y planificación de rutas comerciales.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowKeyConfig(!showKeyConfig)}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Key className="w-3.5 h-3.5 text-amber-500" />
            <span>Configurar API Key</span>
            {apiKey ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="API Key configurada" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-500" title="Pendiente de API Key" />
            )}
          </button>
        </div>
      </div>

      {/* API Key Banner / Config drawer */}
      {showKeyConfig && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-md border border-slate-700">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Configuración de Google Maps Platform</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Para visualizar mapas interactivos, geolocalizar clientes y calcular rutas en tiempo real, ingresa tu clave de Google Maps Platform. 
                Para pruebas y desarrollo sin costo, puedes obtener al instante una <strong>Maps Demo Key</strong> gratuita sin necesidad de ingresar tarjeta de crédito.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="password"
                placeholder="Pega tu Google Maps API Key aquí..."
                value={tempKeyInput}
                onChange={(e) => setTempKeyInput(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs px-3 py-2 rounded-lg outline-hidden focus:border-emerald-500 min-w-[280px]"
              />
              <button
                onClick={handleSaveApiKey}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg transition-colors shadow-xs"
              >
                Guardar Clave
              </button>
              <a
                href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                target="_blank"
                rel="noreferrer noopener"
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-lg text-center flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Obtener Demo Key Gratis</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Controls + Interactive Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Contacts List & Route Planner */}
        <div className="space-y-4 lg:col-span-1 flex flex-col h-full">
          
          {/* Search and Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar cliente, dirección o RUC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs pl-9 pr-3 py-2 rounded-lg outline-hidden focus:border-sky-500"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  filterType === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos ({contacts.length})
              </button>
              <button
                onClick={() => setFilterType('client')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  filterType === 'client' ? 'bg-sky-600 text-white' : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                }`}
              >
                Clientes
              </button>
              <button
                onClick={() => setFilterType('provider')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  filterType === 'provider' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                Proveedores
              </button>
              <button
                onClick={() => setFilterType('with_balance')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  filterType === 'with_balance' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                Con Saldo
              </button>
            </div>
          </div>

          {/* Delivery Route Planner Card */}
          {selectedForRoute.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-700" />
                  <span className="font-bold text-xs text-emerald-900">
                    Ruta de Entrega ({selectedForRoute.length} paradas)
                  </span>
                </div>
                <button
                  onClick={() => setSelectedForRoute([])}
                  className="text-[10px] text-emerald-700 hover:underline font-bold"
                >
                  Limpiar
                </button>
              </div>

              <div className="text-[11px] text-emerald-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  <span>Inicio: Almacén Central (Distribuidora)</span>
                </div>
                {selectedForRoute.map((id, idx) => {
                  const c = contacts.find(contact => contact.id === id);
                  return (
                    <div key={id} className="flex items-center justify-between pl-3 border-l-2 border-emerald-300 ml-1">
                      <span className="truncate max-w-[180px]">{idx + 1}. {c?.name || 'Cliente'}</span>
                      <button 
                        onClick={() => toggleRouteStop(id)}
                        className="text-rose-600 hover:text-rose-800 text-[10px] font-bold"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>

              <a
                href={getGoogleMapsRouteUrl()}
                target="_blank"
                rel="noreferrer noopener"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Navegar Ruta en Google Maps</span>
              </a>
            </div>
          )}

          {/* Contacts List with Geolocation details */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs flex-1 overflow-hidden flex flex-col min-h-[300px] max-h-[520px]">
            <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="font-bold text-xs text-slate-700">
                Puntos Registrados ({filteredContacts.length})
              </span>
              <button
                onClick={() => {
                  setMapCenter(CENTRAL_WAREHOUSE);
                  setMapZoom(12);
                }}
                className="text-[11px] text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1"
                title="Centrar en el Almacén Central"
              >
                <Compass className="w-3 h-3" />
                <span>Almacén Central</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
              {filteredContacts.map((contact, idx) => {
                const coords = resolveContactCoordinates(contact, idx);
                const isSelected = selectedContact?.id === contact.id;
                const isInRoute = selectedForRoute.includes(contact.id);

                return (
                  <div
                    key={contact.id}
                    onClick={() => {
                      setSelectedContact(contact);
                      setMapCenter(coords);
                      setMapZoom(15);
                    }}
                    className={`p-3 text-xs cursor-pointer transition-colors ${
                      isSelected ? 'bg-sky-50/70 border-l-4 border-sky-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-slate-900 truncate">
                        {contact.name}
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        contact.type === 'client' ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {contact.type === 'client' ? 'Cliente' : 'Proveedor'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{contact.address || 'Panamá, Rep. de Panamá'}</span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span className="font-mono text-slate-600">
                        {contact.phone || 'Sin tel.'}
                      </span>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleRouteStop(contact.id)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                            isInRoute 
                              ? 'bg-emerald-600 text-white' 
                              : 'bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700'
                          }`}
                          title="Añadir a ruta de entrega"
                        >
                          {isInRoute ? 'En Ruta ✓' : '+ Ruta'}
                        </button>

                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address || contact.name + ' Panamá')}`}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded transition-colors"
                          title="Ver en Google Maps externo"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredContacts.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No se encontraron contactos en esta búsqueda.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Google Maps Interactive Canvas */}
        <div className="lg:col-span-2 flex flex-col bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden min-h-[580px]">
          
          {/* Top Bar for Map */}
          <div className="p-3 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-600" />
                Visualizador Geoespacial
              </span>
              <span className="text-[11px] text-slate-400">|</span>
              <span className="text-[11px] text-slate-500">
                Lat: {mapCenter.lat.toFixed(4)}, Lng: {mapCenter.lng.toFixed(4)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setMapCenter(CENTRAL_WAREHOUSE);
                  setMapZoom(12);
                }}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs"
              >
                <Building2 className="w-3 h-3 text-emerald-600" />
                <span>Almacén Central</span>
              </button>
            </div>
          </div>

          {/* Interactive Map Area using @vis.gl/react-google-maps */}
          <div className="flex-1 w-full relative min-h-[520px] h-[550px]">
            {apiKey ? (
              <APIProvider apiKey={apiKey}>
                <Map
                  mapId="DEMO_MAP_ID"
                  internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
                  center={mapCenter}
                  zoom={mapZoom}
                  onCenterChanged={(ev) => setMapCenter(ev.detail.center)}
                  onZoomChanged={(ev) => setMapZoom(ev.detail.zoom)}
                  style={{ width: '100%', height: '100%' }}
                  gestureHandling={'greedy'}
                  disableDefaultUI={false}
                >
                  {/* Central Warehouse Marker */}
                  <AdvancedMarker
                    position={{ lat: CENTRAL_WAREHOUSE.lat, lng: CENTRAL_WAREHOUSE.lng }}
                    title={CENTRAL_WAREHOUSE.name}
                  >
                    <Pin background={'#059669'} glyphColor={'#FFFFFF'} borderColor={'#047857'} />
                  </AdvancedMarker>

                  {/* Contacts Markers */}
                  {filteredContacts.map((contact, idx) => {
                    const coords = resolveContactCoordinates(contact, idx);
                    const isClient = contact.type === 'client' || contact.type === 'both';
                    const hasDebt = (contact.balance || 0) > 0;
                    
                    const pinBg = hasDebt ? '#e11d48' : isClient ? '#0284c7' : '#d97706';
                    const pinBorder = hasDebt ? '#be123c' : isClient ? '#0369a1' : '#b45309';

                    return (
                      <AdvancedMarker
                        key={contact.id}
                        position={coords}
                        title={contact.name}
                        onClick={() => setSelectedContact(contact)}
                      >
                        <Pin 
                          background={pinBg} 
                          glyphColor={'#FFFFFF'} 
                          borderColor={pinBorder} 
                        />
                      </AdvancedMarker>
                    );
                  })}

                  {/* InfoWindow for selected contact */}
                  {selectedContact && (
                    <InfoWindow
                      position={resolveContactCoordinates(selectedContact, 0)}
                      onCloseClick={() => setSelectedContact(null)}
                    >
                      <div className="p-2 max-w-xs text-slate-800 font-sans">
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                          <h4 className="font-bold text-xs text-slate-900 truncate">
                            {selectedContact.name}
                          </h4>
                          <span className={`text-[9px] font-bold px-1 rounded ${
                            selectedContact.type === 'client' ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {selectedContact.type === 'client' ? 'Cliente' : 'Proveedor'}
                          </span>
                        </div>

                        <div className="mt-1.5 space-y-1 text-[11px] text-slate-600">
                          <div><strong>RUC/Cédula:</strong> {selectedContact.rucOrCedula || 'N/A'} {selectedContact.dv ? `DV: ${selectedContact.dv}` : ''}</div>
                          <div><strong>Dirección:</strong> {selectedContact.address || 'Panamá'}</div>
                          {selectedContact.phone && <div><strong>Tel:</strong> {selectedContact.phone}</div>}
                          {selectedContact.balance > 0 && (
                            <div className="text-rose-600 font-bold">
                              Saldo Pendiente: ${selectedContact.balance.toFixed(2)}
                            </div>
                          )}
                        </div>

                        {/* Actions in InfoWindow */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                          {onOpenNewInvoiceForContact && (
                            <button
                              onClick={() => onOpenNewInvoiceForContact(selectedContact.id)}
                              className="px-2 py-1 bg-slate-900 text-white rounded text-[10px] font-bold hover:bg-slate-800 transition-colors flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3" />
                              <span>Facturar</span>
                            </button>
                          )}
                          {onOpenNewQuoteForContact && (
                            <button
                              onClick={() => onOpenNewQuoteForContact(selectedContact.id)}
                              className="px-2 py-1 bg-sky-600 text-white rounded text-[10px] font-bold hover:bg-sky-700 transition-colors flex items-center gap-1"
                            >
                              <FileSpreadsheet className="w-3 h-3" />
                              <span>Cotizar</span>
                            </button>
                          )}
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedContact.address || selectedContact.name + ' Panamá')}`}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1"
                          >
                            <Navigation className="w-3 h-3" />
                            <span>Ruta GPS</span>
                          </a>
                        </div>
                      </div>
                    </InfoWindow>
                  )}
                </Map>
              </APIProvider>
            ) : (
              /* Fallback view when API key is not yet configured */
              <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-600 mb-4 shadow-xs">
                  <MapPin className="w-8 h-8" />
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  Google Maps Platform Listo para Conectar
                </h3>
                <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">
                  Para cargar el mapa interactivo satelital con los pines de tus clientes en tiempo real, ingresa tu clave de Google Maps Platform o genera una <strong>Maps Demo Key gratuita</strong>.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    onClick={() => setShowKeyConfig(true)}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-2"
                  >
                    <Key className="w-4 h-4 text-emerald-400" />
                    <span>Ingresar Clave de Google Maps</span>
                  </button>
                  <a
                    href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-2"
                  >
                    <span>Obtener Demo Key Gratuita</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left max-w-xl w-full">
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <div className="font-bold text-xs text-slate-800 flex items-center gap-1 mb-1">
                      <Pin className="w-3 h-3 text-sky-600" /> Clientes y Proveedores
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Visualiza todos tus contactos geolocalizados en el mapa de Panamá.
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <div className="font-bold text-xs text-slate-800 flex items-center gap-1 mb-1">
                      <Truck className="w-3 h-3 text-emerald-600" /> Rutas de Entrega
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Calcula paradas de despacho directo hacia Google Maps y Waze.
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <div className="font-bold text-xs text-slate-800 flex items-center gap-1 mb-1">
                      <FileText className="w-3 h-3 text-purple-600" /> Facturación In Situ
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Emite facturas y cotizaciones directamente desde la ubicación del cliente.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Status Bar */}
          <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <span>Almacén Central</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
                <span>Clientes</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                <span>Proveedores</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                <span>Con Saldo Pendiente</span>
              </span>
            </div>

            <div className="text-[11px] text-slate-400">
              Ubicación Base: Ciudad de Panamá, Rep. de Panamá
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
