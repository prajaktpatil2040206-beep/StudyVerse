import { useState, useRef, useCallback } from 'react';
import { FiSearch, FiDownload, FiCopy, FiTrash2, FiExternalLink, FiX, FiFileText, FiImage, FiLink, FiInfo, FiGlobe, FiBookOpen, FiZap } from 'react-icons/fi';
import './WebScraper.css';

const API_BASE = import.meta.env.PROD ? 'https://studyverse-rnc1.onrender.com/api' : 'http://localhost:8000/api';

const MODE_CHIPS = [
  { label: '📄 URL Mode', example: 'https://en.wikipedia.org/wiki/Artificial_intelligence', icon: <FiGlobe /> },
  { label: '🔍 Search Mode', example: 'latest artificial intelligence news 2025', icon: <FiSearch /> },
  { label: '📰 Article Search', example: 'Python programming language tutorial', icon: <FiBookOpen /> },
  { label: '🌐 News Sites', example: 'https://news.ycombinator.com', icon: <FiZap /> },
];

export default function WebScraper() {
  const [query, setQuery] = useState('');
  const [activeChip, setActiveChip] = useState(0);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [modalImg, setModalImg] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [activeTabs, setActiveTabs] = useState({});
  const logRef = useRef(null);

  const addLog = useCallback((msg, type = '') => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { msg, type, time }]);
    setTimeout(() => logRef.current?.scrollTo(0, logRef.current.scrollHeight), 50);
  }, []);

  const handleChip = (idx) => {
    setActiveChip(idx);
    setQuery(MODE_CHIPS[idx].example);
  };

  const switchTab = (siteIdx, tabName) => {
    setActiveTabs(prev => ({ ...prev, [siteIdx]: tabName }));
  };

  const getActiveTab = (siteIdx) => activeTabs[siteIdx] || 'meta';

  // ── Main Scrape ──
  const startScrape = async () => {
    const input = query.trim();
    if (!input) { setError('Please enter a URL or search query.'); return; }

    setError('');
    setResults([]);
    setStats(null);
    setLogs([]);
    setLoading(true);
    setProgress(10);

    const isURL = input.startsWith('http://') || input.startsWith('https://');
    addLog(isURL ? `Fetching URL: ${input}` : `Searching for: "${input}"`, 'info');
    setProgress(25);
    addLog('Connecting to scraper backend...', 'info');

    try {
      setProgress(40);
      const resp = await fetch(`${API_BASE}/scraper/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input })
      });

      setProgress(70);
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || `Server returned ${resp.status}`);
      }

      const data = await resp.json();
      const scraped = data.results || [];
      setProgress(90);

      addLog(`Scraped ${scraped.length} source(s)`, 'ok');
      scraped.forEach((d, i) => {
        const status = d.status === 'success' ? '✓' : '✗';
        addLog(`  ${status} ${d.domain} — ${(d.word_count || 0).toLocaleString()} words, ${(d.images || []).length} images`, d.status === 'success' ? 'ok' : 'err');
      });

      setResults(scraped);
      setStats({
        sites: scraped.length,
        words: scraped.reduce((s, d) => s + (d.word_count || 0), 0),
        images: scraped.reduce((s, d) => s + (d.images || []).length, 0),
        links: scraped.reduce((s, d) => s + (d.links || []).length, 0),
        paragraphs: scraped.reduce((s, d) => s + (d.paragraphs || []).length, 0),
      });
      setProgress(100);
    } catch (e) {
      setProgress(0);
      addLog('Error: ' + e.message, 'err');
      setError(e.message + ' — Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  // ── Download PDF ──
  const downloadPDF = async () => {
    if (!query.trim()) return;
    setPdfLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/scraper/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: query.trim() })
      });
      if (!resp.ok) throw new Error('PDF generation failed');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `studyverse_research_${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError('PDF download failed: ' + e.message);
    } finally {
      setPdfLoading(false);
    }
  };

  // ── Export JSON ──
  const exportJSON = () => {
    if (!results.length) return;
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `webscraper_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Copy All Text ──
  const copyAllText = () => {
    if (!results.length) return;
    let out = `StudyVerse Research Report\nQuery: ${query}\n${'='.repeat(60)}\n\n`;
    results.forEach((s, i) => {
      out += `\n[${i + 1}] ${s.title || s.domain}\n${s.url}\n${'-'.repeat(40)}\n`;
      if (s.description) out += `Description: ${s.description}\n`;
      if (s.paragraphs?.length) {
        out += `\nContent:\n`;
        s.paragraphs.slice(0, 5).forEach(p => { out += p + '\n\n'; });
      }
    });
    navigator.clipboard.writeText(out);
  };

  const clearResults = () => {
    setResults([]);
    setStats(null);
    setQuery('');
    setLogs([]);
    setError('');
  };

  return (
    <div className="page">
      <div className="container">
        {/* Header */}
        <div className="page-header" style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1>🔍 WebScraper Pro</h1>
          <p>Intelligent Web Intelligence Engine — Extract content, images & metadata from any site</p>
        </div>

        {/* Search Section */}
        <div className="scraper-search-section animate-fadeInUp">
          <label style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted)' }}>
            Enter URL or Search Query
          </label>
          <div className="scraper-search-wrap">
            <input
              className="input-field"
              type="text"
              placeholder="https://example.com  or  search query about any topic..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && startScrape()}
            />
            <button className="btn btn-primary btn-lg" onClick={startScrape} disabled={loading}>
              {loading ? (
                <><div className="loading-spinner" style={{ width: 20, height: 20, margin: 0 }} /> Scraping...</>
              ) : (
                <><FiSearch /> SCRAPE</>
              )}
            </button>
          </div>
          <div className="mode-chips">
            {MODE_CHIPS.map((chip, idx) => (
              <span
                key={idx}
                className={`chip ${activeChip === idx ? 'active' : ''}`}
                onClick={() => handleChip(idx)}
              >
                {chip.label}
              </span>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="card" style={{ background: 'rgba(225,112,85,0.1)', padding: '16px 24px', marginBottom: 24, color: '#E17055', fontSize: 14 }}>
            ⚠ {error}
          </div>
        )}

        {/* Progress */}
        {loading && (
          <div className="card" style={{ marginBottom: 24, padding: 24 }}>
            <div style={{ height: 4, background: 'var(--bg)', boxShadow: 'var(--neu-inset)', borderRadius: 99, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent-secondary))', borderRadius: 99, transition: 'width 0.4s ease' }} />
            </div>
            <div ref={logRef} style={{ maxHeight: 100, overflowY: 'auto', fontSize: 13 }}>
              {logs.map((l, i) => (
                <div key={i} style={{ color: l.type === 'ok' ? 'var(--accent-secondary)' : l.type === 'err' ? '#E17055' : l.type === 'info' ? 'var(--accent)' : 'var(--muted)', marginBottom: 4, animation: 'fadeInUp 0.3s ease' }}>
                  [{l.time}] {l.msg}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Bar */}
        {stats && (
          <div className="scraper-stats animate-fadeInUp">
            {[
              { label: 'Sites Scraped', value: stats.sites },
              { label: 'Words Extracted', value: stats.words.toLocaleString() },
              { label: 'Images Found', value: stats.images },
              { label: 'Links Discovered', value: stats.links },
              { label: 'Paragraphs', value: stats.paragraphs },
            ].map((s, i) => (
              <div className="stat-card" key={i} style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="stat-num">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        {results.length > 0 && (
          <div className="scraper-action-bar animate-fadeInUp">
            <button className="btn btn-primary" onClick={downloadPDF} disabled={pdfLoading}>
              <FiDownload /> {pdfLoading ? 'Generating PDF...' : 'Download PDF Report'}
            </button>
            <button className="btn" onClick={exportJSON}><FiFileText /> Export JSON</button>
            <button className="btn" onClick={copyAllText}><FiCopy /> Copy All Text</button>
            <button className="btn" onClick={clearResults}><FiTrash2 /> Clear</button>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="results-grid">
            {results.map((site, idx) => (
              <SiteCard
                key={idx}
                site={site}
                idx={idx}
                activeTab={getActiveTab(idx)}
                onTabSwitch={(tab) => switchTab(idx, tab)}
                onImageClick={setModalImg}
              />
            ))}
          </div>
        )}

        {/* Image Modal */}
        {modalImg && (
          <div className="img-modal-overlay" onClick={() => setModalImg(null)}>
            <div className="img-modal-content" onClick={e => e.stopPropagation()}>
              <button className="img-modal-close" onClick={() => setModalImg(null)}><FiX /></button>
              <img src={modalImg} alt="Preview" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Site Card Component ──
function SiteCard({ site, idx, activeTab, onTabSwitch, onImageClick }) {
  const tabs = [
    { key: 'meta', label: 'Meta', icon: <FiInfo size={14} />, count: 6 },
    { key: 'content', label: 'Content', icon: <FiFileText size={14} />, count: (site.paragraphs || []).length },
    { key: 'images', label: 'Images', icon: <FiImage size={14} />, count: (site.images || []).length },
    { key: 'links', label: 'Links', icon: <FiLink size={14} />, count: (site.links || []).length },
  ];

  return (
    <div className="site-card animate-fadeInUp" style={{ animationDelay: `${idx * 0.08}s` }}>
      {/* Header */}
      <div className="site-header">
        <div className="site-num">{idx + 1}</div>
        <div className="site-info">
          <div className="site-title">{site.title || site.domain || 'Untitled'}</div>
          <a className="site-url" href={site.url} target="_blank" rel="noopener noreferrer">
            {site.url} <FiExternalLink size={12} />
          </a>
          <div className="site-badges">
            <span className={`badge ${site.status === 'success' ? 'badge-success' : 'badge-warning'}`}>
              {site.status === 'success' ? '✓ OK' : '✗ Error'}
            </span>
            <span className="badge badge-primary">{(site.word_count || 0).toLocaleString()} words</span>
            <span className="badge">{(site.images || []).length} imgs</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-nav">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => onTabSwitch(tab.key)}
          >
            {tab.icon} {tab.label} <span className="tab-count">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'meta' && <MetaTab site={site} />}
      {activeTab === 'content' && <ContentTab site={site} />}
      {activeTab === 'images' && <ImagesTab site={site} onImageClick={onImageClick} />}
      {activeTab === 'links' && <LinksTab site={site} />}
    </div>
  );
}

// ── Tab Components ──
function MetaTab({ site }) {
  const fields = [
    ['Domain', site.domain],
    ['Title', site.title],
    ['Description', site.description],
    ['Author', site.author],
    ['Published', site.published_date],
    ['Keywords', site.keywords],
    ['Scraped At', site.scraped_at ? new Date(site.scraped_at).toLocaleString() : ''],
    ['Word Count', site.word_count ? site.word_count.toLocaleString() : '0'],
    ['Paragraphs', (site.paragraphs || []).length],
    ['Images', (site.images || []).length],
    ['Links', (site.links || []).length],
    ['Status', site.status],
  ].filter(([, v]) => v);

  return (
    <div className="tab-content active">
      <div className="meta-grid">
        {fields.map(([key, val], i) => (
          <div className="meta-item" key={i}>
            <div className="meta-key">{key}</div>
            <div className="meta-val">{String(val)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContentTab({ site }) {
  return (
    <div className="tab-content active">
      {(site.headings || []).length > 0 && (
        <div className="content-block">
          <div className="block-title"><FiFileText /> Article Structure</div>
          <ul className="heading-list">
            {site.headings.slice(0, 15).map((h, i) => (
              <li key={i} className={`${h.level}-item`}>{h.text}</li>
            ))}
          </ul>
        </div>
      )}
      {(site.paragraphs || []).length > 0 && (
        <div className="content-block">
          <div className="block-title"><FiFileText /> Paragraphs</div>
          {site.paragraphs.slice(0, 8).map((p, i) => (
            <div className="para-block" key={i}>{p}</div>
          ))}
        </div>
      )}
      {!(site.headings || []).length && !(site.paragraphs || []).length && (
        <div className="empty-state"><div className="empty-icon">📭</div>No content extracted</div>
      )}
    </div>
  );
}

function ImagesTab({ site, onImageClick }) {
  const imgs = site.images || [];
  if (!imgs.length) return <div className="tab-content active"><div className="empty-state"><div className="empty-icon">🖼</div>No images found</div></div>;

  return (
    <div className="tab-content active">
      <div className="image-grid">
        {imgs.map((img, i) => (
          <div className="image-card" key={i} onClick={() => onImageClick(img.src)} style={{ cursor: 'pointer' }}>
            <img
              src={img.src}
              alt={img.alt || 'Image'}
              loading="lazy"
              onError={e => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'flex'); }}
            />
            <div style={{ display: 'none', width: '100%', height: 140, alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13, background: 'var(--bg)', boxShadow: 'var(--neu-inset)', borderRadius: 'var(--radius-inner)' }}>
              ⚠ Cannot load
            </div>
            <div className="image-card-caption">{img.alt || img.src.split('/').pop()?.slice(0, 35) || 'Image'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LinksTab({ site }) {
  const links = site.links || [];
  if (!links.length) return <div className="tab-content active"><div className="empty-state"><div className="empty-icon">🔗</div>No links found</div></div>;

  return (
    <div className="tab-content active">
      <div className="link-list">
        {links.slice(0, 30).map((l, i) => (
          <div className="link-item" key={i}>
            <FiExternalLink size={14} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 3 }} />
            <div style={{ minWidth: 0 }}>
              <div className="link-text">{l.text || l.url}</div>
              <div className="link-href">
                <a href={l.url} target="_blank" rel="noopener noreferrer">{l.url.slice(0, 90)}</a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
