import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import './App.css';
import {
  iconForTool,
  splitItinerary,
  ToolResultBody,
} from './toolDisplay.jsx';
import { FlightCard } from './flightDisplay.jsx';

const API_BASES = ['', 'http://localhost:3001'];

async function apiFetch(path, options = {}) {
  let lastError = null;
  for (const base of API_BASES) {
    try {
      const res = await fetch(`${base}${path}`, options);
      if (!res.ok) {
        lastError = new Error(`${path} → ${res.status}`);
        continue;
      }
      return await res.json();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error('API unavailable');
}

function FitRouteBounds({ from, to }) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds([from.lat, from.lng], [to.lat, to.lng]);
    map.fitBounds(bounds.pad(0.3));
  }, [map, from, to]);
  return null;
}

function coordsFromPlace(place) {
  if (!place || (place.lat == null && place.latitude == null)) return null;
  const lat = place.lat ?? place.latitude;
  const lng = place.long ?? place.lon ?? place.longitude;
  if (lat == null || lng == null) return null;
  return { lat: Number(lat), lng: Number(lng), name: place.name ?? '' };
}

function ToolsPanel({ tools, loading, error }) {
  if (loading) {
    return (
      <section className="tools-panel">
        <h3 className="tools-panel-title">Agent Tools</h3>
        <p className="tools-panel-hint">Loading tools…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="tools-panel tools-panel--error">
        <h3 className="tools-panel-title">Agent Tools</h3>
        <p className="tools-panel-error">
          {error} — перезапустите backend: остановите старый node на порту 3001 и снова <code>npm run dev</code>.
        </p>
      </section>
    );
  }

  return (
    <section className="tools-panel" aria-label="Agent tools">
      <h3 className="tools-panel-title">Agent Tools</h3>
      <p className="tools-panel-hint">
        {tools.length} tools available to the travel agent
      </p>
      <div className="tools-grid">
        {tools.map((tool) => (
          <article
            key={tool.id}
            className={`tool-card ${tool.configured ? 'tool-card--ready' : 'tool-card--muted'}`}
          >
            <div className="tool-card-header">
              <span className="tool-card-icon" aria-hidden="true">{iconForTool(tool.id)}</span>
              <div>
                <h4 className="tool-card-name">{tool.name}</h4>
                <span className="tool-card-id">{tool.id}</span>
              </div>
            </div>
            <p className="tool-card-desc">{tool.description}</p>
            <div className="tool-card-footer">
              <span className={`tool-badge tool-badge--${tool.category}`}>{tool.category}</span>
              <span className={`tool-status ${tool.configured ? 'tool-status--ok' : 'tool-status--warn'}`}>
                {tool.configured ? 'Ready' : 'Needs setup'}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ItineraryMessage({ text }) {
  const parts = splitItinerary(text);
  if (parts.length === 1) {
    return <p className="itinerary-text">{parts[0]}</p>;
  }
  return (
    <div className="itinerary-days">
      {parts.map((part, i) => (
        <p key={i} className="itinerary-day">{part}</p>
      ))}
    </div>
  );
}

function ToolTrace({ toolsUsed, compact = false }) {
  if (!toolsUsed?.length) return null;

  return (
    <div className={`tool-trace ${compact ? 'tool-trace--compact' : ''}`} aria-label="Tools used">
      <span className="tool-trace-label">Tools used ({toolsUsed.length})</span>
      <div className="tool-trace-list">
        {toolsUsed.map((t, i) => (
          <details key={`${t.id}-${i}`} className="tool-trace-item" open={!compact}>
            <summary className="tool-trace-chip">
              <span aria-hidden="true">{iconForTool(t.name)}</span>
              <span className="tool-trace-name">{t.label ?? t.name}</span>
              {t.args && (
                <span className="tool-trace-args">
                  {Object.values(t.args).filter(Boolean).join(' → ')}
                </span>
              )}
            </summary>
            <div className="tool-trace-body">
              <ToolResultBody name={t.name} result={t.result} />
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

function LocationPanel({ from, to }) {
  if (!from?.name && !to?.name) return null;

  const renderPlace = (label, place) => (
    <div className="location-card" key={label}>
      <div className="location-card-header">
        {place?.flag && (
          <img src={place.flag} alt="" className="location-flag" width={32} height={22} />
        )}
        <div>
          <span className="location-label">{label}</span>
          <strong className="location-name">{place?.name ?? '—'}</strong>
        </div>
      </div>
      <dl className="location-meta">
        <div>
          <dt>Latitude</dt>
          <dd>
            {place?.lat != null || place?.latitude != null
              ? Number(place.lat ?? place.latitude).toFixed(4)
              : '—'}
          </dd>
        </div>
        <div>
          <dt>Longitude</dt>
          <dd>
            {place?.long != null || place?.lon != null || place?.longitude != null
              ? Number(place.long ?? place.lon ?? place.longitude).toFixed(4)
              : '—'}
          </dd>
        </div>
        <div>
          <dt>Country</dt>
          <dd>{place?.country ?? '—'}</dd>
        </div>
      </dl>
    </div>
  );

  return (
    <section className="location-panel" aria-label="Route locations">
      <h3 className="location-panel-title">📍 Geocode &amp; flags</h3>
      <div className="location-grid">
        {renderPlace('From', from)}
        {renderPlace('To', to)}
      </div>
    </section>
  );
}

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('plan a trip to tokyo');
  const [loading, setLoading] = useState(false);
  const [flights, setFlights] = useState([]);
  const [route, setRoute] = useState(null);
  const [agentTools, setAgentTools] = useState([]);
  const [toolsLoading, setToolsLoading] = useState(true);
  const [toolsError, setToolsError] = useState(null);
  const [routeMeta, setRouteMeta] = useState({ from: null, to: null });
  const [lastToolsUsed, setLastToolsUsed] = useState([]);
  const [formData, setFormData] = useState({
    departure: 'tel aviv',
    destination: 'tokyo',
    style: 'food + culture, light walking',
    budget: 'high',
    interests: 'sails at rivers, small galleries, hidden viewpoints',
  });

  useEffect(() => {
    apiFetch('/api/tools')
      .then((data) => {
        setAgentTools(data.tools ?? []);
        setToolsError(null);
      })
      .catch((err) => {
        console.error('Failed to load tools:', err);
        setToolsError(err.message || 'Backend not reachable');
        setAgentTools([]);
      })
      .finally(() => setToolsLoading(false));
  }, []);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const data = await apiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, ...formData }),
      });

      if (data.success) {
        const payload = data.response;
        const messageText =
          typeof payload.message === 'string'
            ? payload.message
            : JSON.stringify(payload.message ?? '');

        const toolsUsed = data.toolsUsed ?? [];
        setLastToolsUsed(toolsUsed);

        const assistantMessage = {
          role: 'assistant',
          content: messageText,
          toolsUsed,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        setRouteMeta({ from: payload.from ?? null, to: payload.to ?? null });
        setFlights(Array.isArray(payload.flights) ? payload.flights : []);

        const fromCoords = coordsFromPlace(payload.from);
        const toCoords = coordsFromPlace(payload.to);
        if (fromCoords && toCoords) {
          setRoute({
            from: { ...fromCoords, flag: payload.from?.flag ?? null, country: payload.from?.country },
            to: { ...toCoords, flag: payload.to?.flag ?? null, country: payload.to?.country },
          });
        } else {
          setRoute(null);
        }
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'error',
          content: `Error: ${error.message}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="app">
      <div className="app-layout">
        <div className="container">
          <header className="header">
            <h1>🌍 Travel Planner Chat Bot</h1>
            <p>Plan your perfect 3-day trip with AI assistance</p>
          </header>

          <ToolsPanel tools={agentTools} loading={toolsLoading} error={toolsError} />

          <div className="travel-form">
            <h3>Trip Details (Optional)</h3>
            <div className="form-grid">
              <input
                type="text"
                name="departure"
                placeholder="Departure City"
                value={formData.departure}
                onChange={handleInputChange}
              />
              <input
                type="text"
                name="destination"
                placeholder="Destination City"
                value={formData.destination}
                onChange={handleInputChange}
              />
              <input
                type="text"
                name="style"
                placeholder="Travel Style (e.g., adventure, relaxed)"
                value={formData.style}
                onChange={handleInputChange}
              />
              <input
                type="text"
                name="budget"
                placeholder="Budget (low, medium, high)"
                value={formData.budget}
                onChange={handleInputChange}
              />
              <input
                type="text"
                name="interests"
                placeholder="Special Interests"
                value={formData.interests}
                onChange={handleInputChange}
                className="full-width"
              />
            </div>
          </div>

          <div className="chat-container">
            <div className="messages">
              {messages.length === 0 && (
                <div className="welcome-message">
                  <p>👋 Welcome! I'm your travel planning assistant.</p>
                  <p>
                    I can use {agentTools.length || 'several'} tools — flights, currency,
                    geocoding, and country flags — to build your itinerary.
                  </p>
                </div>
              )}
              {messages.map((msg, index) => (
                <div key={index} className={`message ${msg.role}`}>
                  <div className="message-content">
                    <strong>
                      {msg.role === 'user'
                        ? 'You'
                        : msg.role === 'error'
                          ? 'Error'
                          : 'Travel Agent'}
                      :
                    </strong>
                    {msg.role === 'assistant' ? (
                      <ItineraryMessage text={msg.content} />
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>
                  <div className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="message assistant loading">
                  <div className="message-content">
                    <strong>Travel Agent:</strong>
                    <p>Thinking… calling tools ✈️</p>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={sendMessage} className="input-form">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your trip or request an itinerary..."
                disabled={loading}
              />
              <button type="submit" disabled={loading || !input.trim()}>
                Send
              </button>
            </form>
          </div>
        </div>

        {(flights.length > 0 || routeMeta.from || routeMeta.to || lastToolsUsed.length > 0) && (
          <aside className="flights-sidebar">
            <LocationPanel from={routeMeta.from} to={routeMeta.to} />
            {lastToolsUsed.length > 0 && (
              <ToolTrace toolsUsed={lastToolsUsed} compact />
            )}
            <h3 className="flights-sidebar-title">✈️ Flights</h3>
            {flights.length === 0 ? (
              <p className="flights-empty">
                No structured flights returned. Add <code>TAVILY_API_KEY</code> in <code>lab_5/.env</code> for live flight search.
              </p>
            ) : (
            <div className="flights-list">
              {flights.map((flight, index) => (
                <FlightCard
                  key={`${flight.airline ?? ''}-${flight.flightNumber ?? ''}-${flight.departureDate ?? ''}-${flight.departureTime ?? ''}-${index}`}
                  flight={flight}
                />
              ))}
            </div>
            )}
          </aside>
        )}
      </div>

      {route && (
        <section className="route-map-section">
          <h3 className="route-map-title">📍 Route</h3>
          <div className="route-map-wrapper">
            <MapContainer
              center={[(route.from.lat + route.to.lat) / 2, (route.from.lng + route.to.lng) / 2]}
              zoom={3}
              className="route-map"
              scrollWheelZoom={true}
            >
              <FitRouteBounds from={route.from} to={route.to} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Polyline
                positions={[
                  [route.from.lat, route.from.lng],
                  [route.to.lat, route.to.lng],
                ]}
                pathOptions={{ color: '#2563eb', weight: 3 }}
              />
              {route.from.flag ? (
                <Marker
                  position={[route.from.lat, route.from.lng]}
                  icon={L.divIcon({
                    className: 'flag-marker',
                    html: `<img src="${route.from.flag}" alt="Origin" width="28" height="20" style="border-radius:2px;border:2px solid #059669;object-fit:cover;" />`,
                    iconSize: [28, 20],
                    iconAnchor: [14, 10],
                  })}
                >
                  <Popup>{route.from.name || 'Origin'}</Popup>
                </Marker>
              ) : (
                <CircleMarker
                  center={[route.from.lat, route.from.lng]}
                  pathOptions={{ color: '#059669', fillColor: '#10b981', fillOpacity: 1, weight: 2 }}
                  radius={8}
                >
                  <Popup>{route.from.name || 'Origin'}</Popup>
                </CircleMarker>
              )}
              {route.to.flag ? (
                <Marker
                  position={[route.to.lat, route.to.lng]}
                  icon={L.divIcon({
                    className: 'flag-marker',
                    html: `<img src="${route.to.flag}" alt="Destination" width="28" height="20" style="border-radius:2px;border:2px solid #dc2626;object-fit:cover;" />`,
                    iconSize: [28, 20],
                    iconAnchor: [14, 10],
                  })}
                >
                  <Popup>{route.to.name || 'Destination'}</Popup>
                </Marker>
              ) : (
                <CircleMarker
                  center={[route.to.lat, route.to.lng]}
                  pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 1, weight: 2 }}
                  radius={8}
                >
                  <Popup>{route.to.name || 'Destination'}</Popup>
                </CircleMarker>
              )}
            </MapContainer>
          </div>
        </section>
      )}
    </div>
  );
}

export default App;
