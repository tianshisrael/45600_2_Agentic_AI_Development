const TIME_RE = /\d{1,2}:\d{2}/;
const ISO_DATE_RE = /\d{4}-\d{2}-\d{2}/;

function parseUsdValue(text) {
  if (!text) return null;
  const match = String(text).match(/(?:US\$|USD|\$)\s*([\d,]+(?:\.\d+)?)/i);
  if (!match) return null;
  const value = Number.parseFloat(match[1].replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
}

function parseNisValue(text) {
  if (!text) return null;
  const match = String(text).match(/(?:NIS|ILS|₪)\s*([\d,]+)/i);
  if (!match) return null;
  const value = Number.parseFloat(match[1].replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
}

export function formatFlightPrices(flight) {
  if (flight.priceNis) {
    const usd = parseUsdValue(flight.priceUsd) ?? parseUsdValue(flight.price);
    return {
      nis: flight.priceNis,
      usd: usd != null ? `$${Math.round(usd).toLocaleString('en-US')}` : null,
    };
  }

  const raw = flight.price ?? '';
  const nisVal = parseNisValue(raw);
  const usdVal = parseUsdValue(raw);

  return {
    nis: nisVal != null ? `₪${Math.round(nisVal).toLocaleString('en-US')}` : null,
    usd: usdVal != null ? `$${Math.round(usdVal).toLocaleString('en-US')}` : null,
  };
}

export function formatDurationShort(duration) {
  if (!duration) return null;
  const text = String(duration).trim();
  const range = text.match(/(\d+)\s*[-–]\s*(\d+)\s*h/i);
  if (range) return `${range[1]}–${range[2]}h`;
  const hm = text.match(/(\d+)\s*h(?:our)?s?\s*(\d+)\s*m/i);
  if (hm) return `${hm[1]}h ${hm[2]}m`;
  const hours = text.match(/(\d+)\s*h(?:our|rs?)?/i);
  if (hours) return `${hours[1]}h`;
  return text.length > 20 ? `${text.slice(0, 18)}…` : text;
}

function pickTime(value) {
  if (!value || value === 'Not listed') return null;
  const text = String(value).trim();
  const clock = text.match(TIME_RE);
  if (clock) return clock[0];
  if (ISO_DATE_RE.test(text)) {
    const timePart = text.match(TIME_RE);
    return timePart?.[0] ?? null;
  }
  return null;
}

function pickDate(value) {
  if (!value || value === 'Not listed') return null;
  const text = String(value).trim();
  const iso = text.match(ISO_DATE_RE);
  return iso?.[0] ?? null;
}

export function formatFlightDate(iso) {
  if (!iso || !ISO_DATE_RE.test(iso)) return null;
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function flightTimeValue(flight, kind) {
  const timeKey = kind === 'dep' ? 'departureTime' : 'arrivalTime';
  return pickTime(flight[timeKey]) ?? pickTime(kind === 'dep' ? flight.departure : flight.arrival);
}

export function flightDateValue(flight, kind) {
  const dateKey = kind === 'dep' ? 'departureDate' : 'arrivalDate';
  return pickDate(flight[dateKey]);
}

function isRouteLabel(value) {
  if (!value || typeof value !== 'string') return false;
  if (pickTime(value)) return false;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return false;
  return true;
}

export function formatFlightRoute(flight) {
  const dep = isRouteLabel(flight.departure) ? flight.departure : null;
  const arr = isRouteLabel(flight.arrival) ? flight.arrival : null;
  if (dep && arr) return `${dep} → ${arr}`;
  return dep || arr || null;
}

function formatSegmentEndpoint(segment, kind) {
  const dateKey = kind === 'dep' ? 'departureDate' : 'arrivalDate';
  const timeKey = kind === 'dep' ? 'departureTime' : 'arrivalTime';
  const placeKey = kind === 'dep' ? 'departure' : 'arrival';
  const date = formatFlightDate(pickDate(segment[dateKey]));
  const time = pickTime(segment[timeKey]);
  const place = segment[placeKey];
  return { date, time, place };
}

export function FlightCard({ flight }) {
  const prices = formatFlightPrices(flight);
  const route = formatFlightRoute(flight);
  const depTime = flightTimeValue(flight, 'dep');
  const arrTime = flightTimeValue(flight, 'arr');
  const depDate = formatFlightDate(flightDateValue(flight, 'dep'));
  const arrDate = formatFlightDate(flightDateValue(flight, 'arr'));
  const durationLabel = formatDurationShort(flight.duration);
  const hasClockTimes = Boolean(depTime || arrTime || depDate || arrDate);
  const segments = Array.isArray(flight.segments) ? flight.segments.filter((s) => s?.flightNumber) : [];
  const isConnecting = segments.length > 1;

  return (
    <article className="flight-card">
      <header className="flight-card-head">
        <h4 className="flight-airline-name" title={flight.airline}>
          {flight.airline ?? 'Unknown airline'}
        </h4>
        {flight.flightNumber && (
          <span className="flight-number">{flight.flightNumber}</span>
        )}
      </header>

      {hasClockTimes ? (
        <div className="flight-times">
          <div className="flight-time-block">
            {depDate && <span className="flight-date-value">{depDate}</span>}
            <span className="flight-time-value">{depTime ?? '—'}</span>
            <span className="flight-time-label">Depart</span>
          </div>
          <div className="flight-time-connector" aria-hidden="true">
            <span className="flight-time-line" />
            {durationLabel && (
              <span className="flight-time-duration">{durationLabel}</span>
            )}
            <span className="flight-time-plane">✈</span>
          </div>
          <div className="flight-time-block flight-time-block--right">
            {arrDate && <span className="flight-date-value">{arrDate}</span>}
            <span className="flight-time-value">{arrTime ?? '—'}</span>
            <span className="flight-time-label">Arrive</span>
          </div>
        </div>
      ) : durationLabel ? (
        <div className="flight-duration-hero">
          <span className="flight-duration-hero-value">{durationLabel}</span>
          <span className="flight-duration-hero-label">Estimated flight time</span>
        </div>
      ) : (
        <p className="flight-times-missing">Times not listed in search results</p>
      )}

      {flight.dateNote && (
        <p className="flight-date-note">{flight.dateNote}</p>
      )}

      {route && <p className="flight-route-text">{route}</p>}

      {isConnecting && (
        <div className="flight-segments">
          <p className="flight-segments-title">Connection details</p>
          {segments.map((segment, index) => {
            const dep = formatSegmentEndpoint(segment, 'dep');
            const arr = formatSegmentEndpoint(segment, 'arr');
            return (
              <div key={`${segment.flightNumber}-${index}`} className="flight-segment">
                <div className="flight-segment-head">
                  <span className="flight-segment-num">{segment.flightNumber}</span>
                  {segment.airline && (
                    <span className="flight-segment-airline">{segment.airline}</span>
                  )}
                </div>
                <div className="flight-segment-times">
                  <span>
                    {dep.date && `${dep.date} `}
                    {dep.time ?? '—'}
                    {dep.place ? ` · ${dep.place}` : ''}
                  </span>
                  <span className="flight-segment-arrow">→</span>
                  <span>
                    {arr.date && `${arr.date} `}
                    {arr.time ?? '—'}
                    {arr.place ? ` · ${arr.place}` : ''}
                  </span>
                </div>
              </div>
            );
          })}
          {flight.layover && (
            <p className="flight-layover">Layover: {flight.layover}</p>
          )}
        </div>
      )}

      <footer className="flight-card-foot">
        <div className="flight-prices">
          {prices.nis && <span className="flight-price-nis">{prices.nis}</span>}
          {prices.usd && <span className="flight-price-usd">{prices.usd}</span>}
          {!prices.nis && !prices.usd && (
            <span className="flight-price-na">{flight.price ?? '—'}</span>
          )}
        </div>
        {flight.stops && (
          <div className="flight-meta">
            <span className="flight-chip flight-chip--muted">{flight.stops}</span>
          </div>
        )}
      </footer>
    </article>
  );
}
