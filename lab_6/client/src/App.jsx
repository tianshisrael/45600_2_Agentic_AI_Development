import { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import './App.css';

function FitRouteBounds({ from, to }) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds([from.lat, from.lng], [to.lat, to.lng]);
    map.fitBounds(bounds.pad(0.3));
  }, [map, from, to]);
  return null;
}

// Normalize from/to objects: API may return long or lon
function coordsFromPlace(place) {
  if (!place || (place.lat == null && place.latitude == null)) return null;
  const lat = place.lat ?? place.latitude;
  const lng = place.long ?? place.lon ?? place.longitude;
  if (lat == null || lng == null) return null;
  return { lat: Number(lat), lng: Number(lng), name: place.name ?? '' };
}

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('plan a trip to tokyo');
  const [loading, setLoading] = useState(false);
  const [flights, setFlights] = useState([]);
  const [route, setRoute] = useState(null); // { from: { lat, lng, name }, to: { lat, lng, name } }
  const [formData, setFormData] = useState({
    departure: 'tel aviv',
    destination: 'tokyo',
    style: 'food + culture, light walking',
    budget: 'high',
    interests: 'sails at rivers, small galleries, hidden viewpoints',
  });

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
      const { data } = await axios.post('http://localhost:3001/api/chat', {
        message: input,
        ...formData,
      });

      if (data.success) {
        const response = data.response;
        console.log(response);

        const messageText = typeof response.message === 'string' ? response.message : JSON.stringify(response.message ?? '');
        const assistantMessage = {
          role: 'assistant',
          content: messageText,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        if (Array.isArray(response.flights) && response.flights.length > 0) {
          setFlights(response.flights);
        }
        const fromCoords = coordsFromPlace(response.from);
        const toCoords = coordsFromPlace(response.to);
        if (fromCoords && toCoords) {
          setRoute({
            from: { ...fromCoords, flag: response.from?.flag ?? null },
            to: { ...toCoords, flag: response.to?.flag ?? null },
          });
        }
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        role: 'error',
        content: `Error: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="app">
      <div className="app-layout">
        <div className="container">
        <header className="header">
          <h1>🌍 Travel Planner Chat Bot</h1>
          <p>Plan your perfect 3-day trip with AI assistance</p>
        </header>

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
                <p>Fill in the trip details above or just start chatting to plan your perfect trip!</p>
              </div>
            )}
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.role}`}>
                <div className="message-content">
                  <strong>{msg.role === 'user' ? 'You' : msg.role === 'error' ? 'Error' : 'Travel Agent'}:</strong>
                  <p>{msg.content}</p>
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
                  <p>Thinking... ✈️</p>
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

        {flights.length > 0 && (
          <aside className="flights-sidebar">
            <h3 className="flights-sidebar-title">✈️ Flights</h3>
            <div className="flights-list">
              {flights.map((flight, index) => (
                <div key={index} className="flight-card">
                  <div className="flight-header">
                    <div className="flight-airline">{flight.airline ?? '—'}</div>
                    {flight.flightNumber && (
                      <div className="flight-number">{flight.flightNumber}</div>
                    )}
                  </div>
                  {(flight.startDate || flight.endDate) && (
                    <div className="flight-dates">
                      {flight.startDate && <span>{flight.startDate}</span>}
                      {flight.startDate && flight.endDate && (
                        <span className="flight-arrow">→</span>
                      )}
                      {flight.endDate && <span>{flight.endDate}</span>}
                    </div>
                  )}
                  <div className="flight-route">
                    <span className="flight-departure">{flight.departure ?? '—'}</span>
                    <span className="flight-arrow">→</span>
                    <span className="flight-arrival">{flight.arrival ?? '—'}</span>
                  </div>
                  <div className="flight-details">
                    <span className="flight-price">{flight.price ?? '—'}</span>
                    <span className="flight-duration">{flight.duration ?? '—'}</span>
                    <span className="flight-stops">{flight.stops ?? '—'}</span>
                  </div>
                </div>
              ))}
            </div>
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
                <CircleMarker center={[route.from.lat, route.from.lng]} pathOptions={{ color: '#059669', fillColor: '#10b981', fillOpacity: 1, weight: 2 }} radius={8}>
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
                <CircleMarker center={[route.to.lat, route.to.lng]} pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 1, weight: 2 }} radius={8}>
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

