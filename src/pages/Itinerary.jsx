import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../config/apiConfig.js';
import { useToast } from '../context/ToastContext.jsx';

/* ─── helpers ─────────────────────────────────────────────────────────────── */
function StarRating({ rating, onChange }) {
  return (
    <span style={{ cursor: onChange ? 'pointer' : 'default' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <i
          key={i}
          className={`bi bi-star${i <= rating ? '-fill' : ''}`}
          style={{ color: '#f5a623', fontSize: 14, marginRight: 1 }}
          onClick={() => onChange && onChange(i)}
        />
      ))}
    </span>
  );
}

const TOUR_TYPES = ['Domestic', 'International', 'Honeymoon', 'Adventure', 'Group Tour', 'Corporate', 'Pilgrimage', 'Wildlife'];
const TOUR_TYPE_COLORS = {
  'Domestic':      { bg: '#d4edda', color: '#27ae60' },
  'International': { bg: '#dbeafe', color: '#2563eb' },
  'Honeymoon':     { bg: '#fce7f3', color: '#db2777' },
  'Adventure':     { bg: '#ffedd5', color: '#ea580c' },
  'Group Tour':    { bg: '#ede9fe', color: '#7c3aed' },
  'Corporate':     { bg: '#e0f2fe', color: '#0284c7' },
  'Pilgrimage':    { bg: '#fef9c3', color: '#854d0e' },
  'Wildlife':      { bg: '#dcfce7', color: '#15803d' },
};

const DEST_ICONS = {
  beach: '🏖️', mountain: '⛰️', city: '🌆', desert: '🏜️', forest: '🌲',
  historical: '🏛️', wildlife: '🦁', adventure: '🧗', spiritual: '🕌', cruise: '🚢',
};

/* parse JSON or plain text day_wise */
function parseDays(dayWise) {
  if (!dayWise) return [];
  try {
    const parsed = JSON.parse(dayWise);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  // legacy plain text — split by "Day N:" pattern
  const lines = dayWise.split('\n').filter(Boolean);
  return lines.map((l, i) => ({ day: i + 1, title: '', description: l }));
}

function parseList(text) {
  if (!text) return [];
  try {
    const p = JSON.parse(text);
    if (Array.isArray(p)) return p;
  } catch {}
  return text.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
}

/* ─── Day Builder ─────────────────────────────────────────────────────────── */
function DayBuilder({ days, onChange }) {
  const addDay = () => onChange([...days, { day: days.length + 1, title: '', description: '' }]);
  const removeDay = (i) => {
    const updated = days.filter((_, idx) => idx !== i).map((d, idx) => ({ ...d, day: idx + 1 }));
    onChange(updated);
  };
  const setField = (i, field, val) => {
    const updated = [...days];
    updated[i] = { ...updated[i], [field]: val };
    onChange(updated);
  };

  return (
    <div>
      {days.map((d, i) => (
        <div key={i} style={{
          background: '#f8fafc', borderRadius: 10, padding: '14px 16px',
          marginBottom: 10, border: '1px solid #e2e8f0', position: 'relative',
        }}>
          <div className="d-flex align-items-center gap-2 mb-2">
            <div style={{
              background: '#0D3B5E', color: '#fff', borderRadius: 20,
              padding: '2px 12px', fontSize: 12, fontWeight: 700, flexShrink: 0,
            }}>
              Day {d.day}
            </div>
            <input
              className="form-control form-control-sm"
              placeholder="Day title (e.g. Arrival & Sightseeing)"
              value={d.title}
              onChange={(e) => setField(i, 'title', e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => removeDay(i)}
              style={{ flexShrink: 0 }}
            >
              <i className="bi bi-x" />
            </button>
          </div>
          <textarea
            className="form-control form-control-sm"
            rows={2}
            placeholder="Describe activities, meals, accommodation..."
            value={d.description}
            onChange={(e) => setField(i, 'description', e.target.value)}
          />
        </div>
      ))}
      <button type="button" className="btn btn-outline-primary btn-sm w-100" onClick={addDay}>
        <i className="bi bi-plus-circle me-1" /> Add Day
      </button>
    </div>
  );
}

/* ─── List Editor (inclusions/exclusions) ────────────────────────────────── */
function ListEditor({ items, onChange, addPlaceholder }) {
  const [input, setInput] = useState('');
  const add = () => {
    const val = input.trim();
    if (!val) return;
    onChange([...items, val]);
    setInput('');
  };
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  return (
    <div>
      <div className="d-flex gap-2 mb-2">
        <input
          className="form-control form-control-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={addPlaceholder}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
        />
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={add}>
          <i className="bi bi-plus" /> Add
        </button>
      </div>
      <div className="d-flex flex-wrap gap-1">
        {items.map((item, i) => (
          <span key={i} style={{
            background: '#e8f5e9', color: '#27ae60', borderRadius: 20,
            padding: '3px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4,
          }}>
            {item}
            <i className="bi bi-x" style={{ cursor: 'pointer' }} onClick={() => remove(i)} />
          </span>
        ))}
        {items.length === 0 && <span style={{ fontSize: 12, color: '#aaa' }}>No items added yet</span>}
      </div>
    </div>
  );
}

/* ─── Itinerary Modal ─────────────────────────────────────────────────────── */
function ItinModal({ show, onClose, onSave, initial }) {
  const empty = {
    title: '', destination: '', duration: '', tour_type: 'Domestic', rating: 4,
    day_wise: '[]', inclusions: '[]', exclusions: '[]', base_price: '',
  };

  const [form, setForm] = useState(empty);
  const [days, setDays] = useState([]);
  const [inclusions, setInclusions] = useState([]);
  const [exclusions, setExclusions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (!show) return;
    if (initial) {
      setForm({ ...empty, ...initial });
      setDays(parseDays(initial.day_wise));
      setInclusions(parseList(initial.inclusions));
      setExclusions(parseList(initial.exclusions));
    } else {
      setForm(empty);
      setDays([]);
      setInclusions([]);
      setExclusions([]);
    }
    setActiveTab('basic');
  }, [initial, show]);

  if (!show) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.title.trim()) return alert('Title is required');
    if (!form.destination.trim()) return alert('Destination is required');
    setSaving(true);
    await onSave({
      ...form,
      day_wise: JSON.stringify(days),
      inclusions: JSON.stringify(inclusions),
      exclusions: JSON.stringify(exclusions),
    });
    setSaving(false);
  };

  const tabStyle = (t) => ({
    padding: '8px 18px', borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer',
    background: activeTab === t ? '#0D3B5E' : 'transparent',
    color: activeTab === t ? '#fff' : '#666',
    border: 'none',
  });

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
          <div className="modal-header modal-header-custom">
            <h5 className="modal-title">
              <i className="bi bi-map me-2" />
              {initial?.id ? 'Edit Itinerary Template' : 'New Itinerary Template'}
            </h5>
            <button className="btn-close" onClick={onClose} />
          </div>

          {/* Tabs */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #eee', display: 'flex', gap: 8, background: '#f8fafc' }}>
            {[
              { key: 'basic', label: '📋 Basic Info' },
              { key: 'days', label: `🗓️ Day Plan (${days.length})` },
              { key: 'inc', label: `✅ Inclusions (${inclusions.length})` },
              { key: 'exc', label: `❌ Exclusions (${exclusions.length})` },
            ].map((t) => (
              <button key={t.key} style={tabStyle(t.key)} onClick={() => setActiveTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
            {activeTab === 'basic' && (
              <div className="row g-3">
                <div className="col-md-8">
                  <label className="form-label fw-semibold">Package Title <span style={{ color: 'red' }}>*</span></label>
                  <input className="form-control" value={form.title} onChange={set('title')} placeholder="e.g. 7D/6N Maldives Honeymoon Escape" />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold">Template Code</label>
                  <input className="form-control" value={form.template_code || ''} onChange={set('template_code')} placeholder="Auto-generated" />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold">Destination <span style={{ color: 'red' }}>*</span></label>
                  <input className="form-control" value={form.destination} onChange={set('destination')} placeholder="e.g. Maldives, Bali, Kerala" />
                </div>
                <div className="col-md-3">
                  <label className="form-label fw-semibold">Duration</label>
                  <input className="form-control" value={form.duration} onChange={set('duration')} placeholder="7D/6N" />
                </div>
                <div className="col-md-3">
                  <label className="form-label fw-semibold">Tour Type</label>
                  <select className="form-select" value={form.tour_type} onChange={set('tour_type')}>
                    {TOUR_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label fw-semibold">Base Price (₹)</label>
                  <input type="number" className="form-control" value={form.base_price || ''} onChange={set('base_price')} placeholder="0" min={0} />
                </div>
                <div className="col-12">
                  <label className="form-label fw-semibold">Rating</label>
                  <div className="d-flex align-items-center gap-3">
                    <StarRating
                      rating={parseInt(form.rating) || 4}
                      onChange={(r) => setForm((f) => ({ ...f, rating: r }))}
                    />
                    <span style={{ fontSize: 13, color: '#666' }}>{form.rating}/5 stars</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'days' && (
              <div>
                <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fffbeb', borderRadius: 8, border: '1px solid #fcd34d', fontSize: 13, color: '#92400e' }}>
                  <i className="bi bi-info-circle me-2" />
                  Build the day-by-day plan for this package. Each day should have a title and description of activities.
                </div>
                <DayBuilder days={days} onChange={setDays} />
              </div>
            )}

            {activeTab === 'inc' && (
              <div>
                <div style={{ marginBottom: 16, padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #86efac', fontSize: 13, color: '#166534' }}>
                  <i className="bi bi-check2-circle me-2" />
                  Add what's <strong>included</strong> in this package (hotel, meals, transfers, etc.)
                </div>
                <ListEditor
                  items={inclusions}
                  onChange={setInclusions}
                  addPlaceholder="e.g. Hotel Accommodation, Breakfast, Airport Transfers..."
                />
              </div>
            )}

            {activeTab === 'exc' && (
              <div>
                <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fff1f2', borderRadius: 8, border: '1px solid #fca5a5', fontSize: 13, color: '#991b1b' }}>
                  <i className="bi bi-x-circle me-2" />
                  Add what's <strong>NOT included</strong> in this package (flights, lunch, visa fees, etc.)
                </div>
                <ListEditor
                  items={exclusions}
                  onChange={setExclusions}
                  addPlaceholder="e.g. International Flights, Lunch & Dinner, Travel Insurance..."
                />
              </div>
            )}
          </div>

          <div className="modal-footer">
            <div style={{ fontSize: 12, color: '#888', flex: 1 }}>
              {days.length} days · {inclusions.length} inclusions · {exclusions.length} exclusions
            </div>
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <span className="spinner-border spinner-border-sm me-2" /> : null}
              {initial?.id ? 'Update Template' : 'Create Template'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Itinerary View / Preview ────────────────────────────────────────────── */
function ItinPreview({ item, onClose, onEdit, onDuplicate }) {
  if (!item) return null;
  const days = parseDays(item.day_wise);
  const inclusions = parseList(item.inclusions);
  const exclusions = parseList(item.exclusions);
  const typeStyle = TOUR_TYPE_COLORS[item.tour_type] || { bg: '#e5e7eb', color: '#374151' };

  const handlePrint = () => {
    const printContent = document.getElementById('itin-print-area').innerHTML;
    const w = window.open('', '_blank');
    w.document.write(`
      <html><head><title>${item.title} — Itinerary</title>
      <style>
        body { font-family: Georgia, serif; margin: 40px; color: #111; }
        h1 { color: #0D3B5E; } h2 { color: #0D3B5E; border-bottom: 2px solid #0D3B5E; padding-bottom: 6px; }
        .day-box { border-left: 4px solid #0D3B5E; padding-left: 16px; margin-bottom: 20px; }
        .day-num { background: #0D3B5E; color: white; padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block; margin-bottom: 6px; }
        .inc { color: #27ae60; } .exc { color: #e74c3c; }
        ul { padding-left: 20px; } li { margin-bottom: 4px; }
        .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
        @media print { .no-print { display: none; } }
      </style></head><body>${printContent}</body></html>
    `);
    w.document.close();
    w.print();
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content" style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
          <div className="modal-header modal-header-custom">
            <div>
              <h5 className="modal-title mb-1">{item.title}</h5>
              <div style={{ fontSize: 12, color: '#aaa' }}>
                {item.template_code} &nbsp;·&nbsp;
                <i className="bi bi-geo-alt me-1" />{item.destination} &nbsp;·&nbsp;
                <i className="bi bi-clock me-1" />{item.duration}
              </div>
            </div>
            <div className="d-flex gap-2 align-items-center">
              <button className="btn btn-sm btn-outline-light" onClick={handlePrint}>
                <i className="bi bi-printer me-1" /> Print / PDF
              </button>
              <button className="btn btn-sm btn-outline-light" onClick={() => onEdit(item)}>
                <i className="bi bi-pencil me-1" /> Edit
              </button>
              <button className="btn btn-sm btn-outline-light" onClick={() => onDuplicate(item)}>
                <i className="bi bi-copy me-1" /> Duplicate
              </button>
              <button className="btn-close btn-close-white" onClick={onClose} />
            </div>
          </div>

          <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: 28 }} id="itin-print-area">
            {/* Header info */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 24 }}>
              <div style={{ flex: 1 }}>
                <h1 style={{ color: '#0D3B5E', fontSize: 24, marginBottom: 8 }}>{item.title}</h1>
                <div className="meta" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 14, color: '#555' }}>
                  <span><i className="bi bi-geo-alt me-1" style={{ color: '#0D3B5E' }} /><strong>{item.destination}</strong></span>
                  <span><i className="bi bi-calendar3 me-1" style={{ color: '#0D3B5E' }} />{item.duration || '—'}</span>
                  <span>
                    <i className="bi bi-tag me-1" style={{ color: '#0D3B5E' }} />
                    <span style={{ background: typeStyle.bg, color: typeStyle.color, borderRadius: 12, padding: '1px 10px', fontSize: 12, fontWeight: 700 }}>
                      {item.tour_type}
                    </span>
                  </span>
                  <span>
                    <StarRating rating={parseInt(item.rating) || 4} />
                  </span>
                  {item.base_price && (
                    <span style={{ fontWeight: 700, color: '#27ae60', fontSize: 16 }}>
                      ₹{Number(item.base_price).toLocaleString('en-IN')} onwards
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Day-wise plan */}
            {days.length > 0 && (
              <>
                <h2 style={{ color: '#0D3B5E', borderBottom: '2px solid #0D3B5E', paddingBottom: 8, marginBottom: 20 }}>
                  <i className="bi bi-calendar3-week me-2" />Day-by-Day Itinerary
                </h2>
                {days.map((d, i) => (
                  <div key={i} style={{
                    borderLeft: '4px solid #0D3B5E', paddingLeft: 20,
                    marginBottom: 20, paddingBottom: 4,
                  }}>
                    <div style={{
                      background: '#0D3B5E', color: '#fff', borderRadius: 20,
                      padding: '2px 14px', fontSize: 12, fontWeight: 700,
                      display: 'inline-block', marginBottom: 8,
                    }}>
                      Day {d.day}{d.title ? ` — ${d.title}` : ''}
                    </div>
                    <div style={{ fontSize: 14, color: '#333', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                      {d.description || <em style={{ color: '#aaa' }}>No details added</em>}
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Inclusions / Exclusions */}
            <div className="row g-4 mt-1">
              <div className="col-md-6">
                <h2 style={{ color: '#27ae60', borderBottom: '2px solid #27ae60', paddingBottom: 8, marginBottom: 16, fontSize: 17 }}>
                  <i className="bi bi-check2-circle me-2" />Inclusions
                </h2>
                {inclusions.length === 0
                  ? <p style={{ color: '#aaa', fontSize: 13 }}>None specified</p>
                  : <ul style={{ paddingLeft: 20 }}>
                    {inclusions.map((item, i) => (
                      <li key={i} style={{ color: '#333', marginBottom: 6, fontSize: 14 }}>
                        <i className="bi bi-check2 me-2" style={{ color: '#27ae60' }} />{item}
                      </li>
                    ))}
                  </ul>
                }
              </div>
              <div className="col-md-6">
                <h2 style={{ color: '#e74c3c', borderBottom: '2px solid #e74c3c', paddingBottom: 8, marginBottom: 16, fontSize: 17 }}>
                  <i className="bi bi-x-circle me-2" />Exclusions
                </h2>
                {exclusions.length === 0
                  ? <p style={{ color: '#aaa', fontSize: 13 }}>None specified</p>
                  : <ul style={{ paddingLeft: 20 }}>
                    {exclusions.map((item, i) => (
                      <li key={i} style={{ color: '#333', marginBottom: 6, fontSize: 14 }}>
                        <i className="bi bi-x me-2" style={{ color: '#e74c3c' }} />{item}
                      </li>
                    ))}
                  </ul>
                }
              </div>
            </div>

            {/* Notes / T&C placeholder */}
            <div style={{ marginTop: 28, padding: '14px 18px', background: '#f8f9fa', borderRadius: 10, fontSize: 12, color: '#888' }}>
              <i className="bi bi-info-circle me-2" />
              This itinerary is subject to change. Final details will be confirmed at the time of booking.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Itinerary Card ──────────────────────────────────────────────────────── */
function ItinCard({ it, onView, onEdit, onDelete, onDuplicate }) {
  const days = parseDays(it.day_wise);
  const inclusions = parseList(it.inclusions);
  const typeStyle = TOUR_TYPE_COLORS[it.tour_type] || { bg: '#e5e7eb', color: '#374151' };

  return (
    <div className="s-card h-100" style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
      onClick={() => onView(it)}>
      {/* Top strip color */}
      <div style={{ height: 4, background: typeStyle.color, borderRadius: '8px 8px 0 0', margin: '-12px -12px 12px -12px' }} />

      <div className="d-flex justify-content-between align-items-start mb-2">
        <div style={{ flex: 1, paddingRight: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0D3B5E', marginBottom: 4, lineHeight: 1.3 }}>{it.title}</div>
          <div style={{ fontSize: 12, color: '#666', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span><i className="bi bi-geo-alt me-1" />{it.destination}</span>
            {it.duration && <span><i className="bi bi-clock me-1" />{it.duration}</span>}
          </div>
        </div>
        <span style={{
          padding: '3px 10px', borderRadius: 12, fontSize: 10, fontWeight: 700,
          background: typeStyle.bg, color: typeStyle.color, flexShrink: 0,
        }}>
          {it.tour_type}
        </span>
      </div>

      <div className="d-flex align-items-center gap-3 mb-2">
        <StarRating rating={parseInt(it.rating) || 4} />
        {it.base_price && (
          <span style={{ fontSize: 13, fontWeight: 700, color: '#27ae60' }}>
            ₹{Number(it.base_price).toLocaleString('en-IN')}+
          </span>
        )}
      </div>

      <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>
        <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>{it.template_code}</code>
        &nbsp; · &nbsp;
        {days.length > 0 ? `${days.length} day${days.length > 1 ? 's' : ''}` : 'No day plan'}
      </div>

      {inclusions.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          {inclusions.slice(0, 3).map((inc, i) => (
            <span key={i} style={{ fontSize: 11, color: '#27ae60', display: 'inline-block', marginRight: 6, marginBottom: 2 }}>
              <i className="bi bi-check2 me-1" />{inc}
            </span>
          ))}
          {inclusions.length > 3 && (
            <span style={{ fontSize: 11, color: '#888' }}>+{inclusions.length - 3} more</span>
          )}
        </div>
      )}

      <div className="d-flex gap-1 mt-auto" onClick={(e) => e.stopPropagation()}>
        <button className="btn-act view flex-fill" onClick={() => onView(it)} style={{ fontSize: 12 }}>
          <i className="bi bi-eye me-1" /> Preview
        </button>
        <button className="btn-act edit" title="Edit" onClick={() => onEdit(it)}><i className="bi bi-pencil" /></button>
        <button className="btn-act done" title="Duplicate" onClick={() => onDuplicate(it)} style={{ background: '#e8f5e9', color: '#27ae60' }}>
          <i className="bi bi-copy" />
        </button>
        <button className="btn-act del" title="Delete" onClick={() => onDelete(it.id, it.title)}><i className="bi bi-trash" /></button>
      </div>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────────────── */
export default function Itinerary() {
  const { showToast } = useToast();
  const [itineraries, setItineraries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalShow, setModalShow] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // grid | list

  const fetch = useCallback(async () => {
    try {
      const res = await api.get('/api/itineraries/list');
      setItineraries(res.data.itineraries || []);
    } catch { showToast('Failed to load itineraries', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSave = async (form) => {
    try {
      if (editItem?.id) {
        await api.post(`/api/itineraries/update/${editItem.id}`, form);
        showToast('Itinerary updated', 'success');
      } else {
        await api.post('/api/itineraries/add', form);
        showToast('Itinerary created', 'success');
      }
      setModalShow(false); setEditItem(null); fetch();
    } catch (err) { showToast(err?.response?.data?.error || err.message || 'Save failed', 'error'); }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    try {
      await api.post(`/api/itineraries/delete/${id}`);
      showToast('Deleted', 'success'); fetch();
    } catch { showToast('Delete failed', 'error'); }
  };

  const handleEdit = (it) => {
    setEditItem(it);
    setViewItem(null);
    setModalShow(true);
  };

  const handleDuplicate = async (it) => {
    if (!window.confirm(`Duplicate "${it.title}"?`)) return;
    try {
      const { id, template_code, created_at, ...rest } = it;
      await api.post('/api/itineraries/add', { ...rest, title: `${it.title} (Copy)`, template_code: '' });
      showToast('Duplicated!', 'success'); fetch();
    } catch { showToast('Duplicate failed', 'error'); }
  };

  const filtered = itineraries.filter((it) => {
    if (filterType && it.tour_type !== filterType) return false;
    if (search) {
      const s = search.toLowerCase();
      return it.title?.toLowerCase().includes(s)
        || it.destination?.toLowerCase().includes(s)
        || it.template_code?.toLowerCase().includes(s);
    }
    return true;
  });

  /* stats */
  const byType = TOUR_TYPES.reduce((acc, t) => {
    acc[t] = itineraries.filter((i) => i.tour_type === t).length;
    return acc;
  }, {});

  return (
    <div>
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="section-title">Itinerary Builder</h1>
          <p style={{ fontSize: 13, color: '#888', margin: '4px 0 0' }}>
            Travel package templates for quotes & bookings
          </p>
        </div>
        <button className="btn-add-new" onClick={() => { setEditItem(null); setModalShow(true); }}>
          <i className="bi bi-plus-lg" /> New Template
        </button>
      </div>

      {/* KPI Row */}
      <div className="row g-3 mb-3">
        <div className="col-6 col-md-2">
          <div className="kpi-card">
            <div className="kpi-label"><i className="bi bi-map me-1" />Total</div>
            <div className="kpi-value">{itineraries.length}</div>
          </div>
        </div>
        {['Domestic', 'International', 'Honeymoon', 'Adventure'].map((type) => (
          <div className="col-6 col-md-2" key={type}>
            <div className="kpi-card" style={{ cursor: 'pointer' }} onClick={() => setFilterType(filterType === type ? '' : type)}>
              <div className="kpi-label" style={{ color: TOUR_TYPE_COLORS[type]?.color }}>
                {type}
              </div>
              <div className="kpi-value">{byType[type] || 0}</div>
            </div>
          </div>
        ))}
        <div className="col-6 col-md-2">
          <div className="kpi-card">
            <div className="kpi-label">Others</div>
            <div className="kpi-value">
              {itineraries.filter((i) => !['Domestic', 'International', 'Honeymoon', 'Adventure'].includes(i.tour_type)).length}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search by title, destination, code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: 260 }}
        />
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {TOUR_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <div className="filter-bar-spacer" />
        <div className="d-flex gap-1">
          <button
            className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setViewMode('grid')}
            title="Grid View"
          >
            <i className="bi bi-grid-3x3-gap" />
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setViewMode('list')}
            title="List View"
          >
            <i className="bi bi-list-ul" />
          </button>
        </div>
        <button className="btn-act done" onClick={fetch}><i className="bi bi-arrow-clockwise" /> Refresh</button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="loading-overlay"><div className="spinner-border" style={{ color: '#0D3B5E' }} /></div>
      ) : filtered.length === 0 ? (
        <div className="s-card text-center py-5">
          <i className="bi bi-map" style={{ fontSize: 48, color: '#ddd', display: 'block', marginBottom: 12 }} />
          <div style={{ color: '#888', marginBottom: 16 }}>
            {search || filterType ? 'No itineraries match your filters.' : 'No itinerary templates yet.'}
          </div>
          <button className="btn btn-primary" onClick={() => { setEditItem(null); setModalShow(true); }}>
            <i className="bi bi-plus-lg me-2" /> Create First Template
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="row g-3">
          {filtered.map((it) => (
            <div className="col-md-6 col-lg-4 col-xl-3" key={it.id}>
              <ItinCard
                it={it}
                onView={setViewItem}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
              />
            </div>
          ))}
        </div>
      ) : (
        /* List view */
        <div className="s-card">
          <div className="table-wrapper">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Title</th>
                  <th>Destination</th>
                  <th>Duration</th>
                  <th>Type</th>
                  <th>Days</th>
                  <th>Rating</th>
                  <th>Base Price</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((it) => {
                  const days = parseDays(it.day_wise);
                  const typeStyle = TOUR_TYPE_COLORS[it.tour_type] || {};
                  return (
                    <tr key={it.id} style={{ cursor: 'pointer' }} onClick={() => setViewItem(it)}>
                      <td>
                        <code style={{ fontSize: 11, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
                          {it.template_code}
                        </code>
                      </td>
                      <td style={{ fontWeight: 600, maxWidth: 200 }}>{it.title}</td>
                      <td><i className="bi bi-geo-alt me-1 text-muted" />{it.destination}</td>
                      <td>{it.duration || '—'}</td>
                      <td>
                        <span style={{
                          background: typeStyle.bg, color: typeStyle.color,
                          borderRadius: 12, padding: '2px 10px', fontSize: 11, fontWeight: 700,
                        }}>
                          {it.tour_type}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>{days.length || '—'}</td>
                      <td><StarRating rating={parseInt(it.rating) || 4} /></td>
                      <td style={{ fontWeight: 700, color: '#27ae60' }}>
                        {it.base_price ? `₹${Number(it.base_price).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button className="btn-act view" title="Preview" onClick={() => setViewItem(it)}>
                          <i className="bi bi-eye" />
                        </button>
                        <button className="btn-act edit" title="Edit" onClick={() => handleEdit(it)}>
                          <i className="bi bi-pencil" />
                        </button>
                        <button className="btn-act done" title="Duplicate" onClick={() => handleDuplicate(it)}
                          style={{ background: '#e8f5e9', color: '#27ae60' }}>
                          <i className="bi bi-copy" />
                        </button>
                        <button className="btn-act del" title="Delete" onClick={() => handleDelete(it.id, it.title)}>
                          <i className="bi bi-trash" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {viewItem && (
        <ItinPreview
          item={viewItem}
          onClose={() => setViewItem(null)}
          onEdit={handleEdit}
          onDuplicate={handleDuplicate}
        />
      )}

      {/* Create / Edit Modal */}
      <ItinModal
        show={modalShow}
        onClose={() => { setModalShow(false); setEditItem(null); }}
        onSave={handleSave}
        initial={editItem}
      />
    </div>
  );
}
