/** Client-side icons (reliable in browser regardless of API encoding). */
export const TOOL_ICONS = {
  flight_finder: '✈️',
  currency_exchange: '💱',
  geocode_city: '📍',
  country_flag: '🏳️',
};

export function iconForTool(name) {
  return TOOL_ICONS[name] ?? '🔧';
}

export function parseToolResult(result) {
  if (!result) return null;
  try {
    return JSON.parse(result);
  } catch {
    return { raw: result };
  }
}

export function cleanAgentMessage(text) {
  return String(text ?? '')
    .replace(/\d+\.\s*[^\n]*\(open link\)[^\n]*/gi, '')
    .replace(/\(open link\)/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function splitItinerary(text) {
  const cleaned = cleanAgentMessage(text);
  const parts = cleaned.split(/(?=Day\s*\d+)/i).map((p) => p.trim()).filter(Boolean);
  return parts.length > 1 ? parts : [cleaned];
}

export function ToolResultBody({ name, result }) {
  const data = parseToolResult(result);

  if (!data) return <span className="tool-result-muted">No output</span>;

  if (data.error) {
    return <p className="tool-result-error">{data.error}</p>;
  }

  if (name === 'geocode_city' && data.lat != null) {
    return (
      <ul className="tool-result-list">
        <li><strong>{data.name}</strong></li>
        <li>Lat: {Number(data.lat).toFixed(4)}</li>
        <li>Lon: {Number(data.long ?? data.lon).toFixed(4)}</li>
        {data.country && <li>{data.country}</li>}
      </ul>
    );
  }

  if (name === 'country_flag' && data.flag) {
    return (
      <div className="tool-result-flag">
        <img src={data.flag} alt={data.country ?? 'Flag'} width={48} height={32} />
        <span>{data.country}</span>
      </div>
    );
  }

  if (name === 'currency_exchange' && data.formatted) {
    return <p className="tool-result-ok">{data.formatted}</p>;
  }

  if (name === 'flight_finder') {
    if (typeof data.raw === 'string') {
      return <p className="tool-result-muted">{data.raw.slice(0, 200)}…</p>;
    }
    return <pre className="tool-result-raw">{JSON.stringify(data, null, 2).slice(0, 400)}</pre>;
  }

  if (data.raw) return <p className="tool-result-muted">{data.raw}</p>;

  return <pre className="tool-result-raw">{JSON.stringify(data, null, 2)}</pre>;
}
