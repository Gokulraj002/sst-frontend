import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../config/apiConfig.js';
import { useToast } from '../context/ToastContext.jsx';
import { formatCurrency, formatCurrencyL, formatDate, timeAgo } from '../utils/formatters.js';
import { LEAD_STAGES, LEAD_TEMPERATURES, LEAD_SOURCES } from '../utils/constants.js';

// ── Constants ──────────────────────────────────────────────────────────────────
const KANBAN_STAGES = [
  'New Enquiry', 'Qualified', 'Proposal Sent', 'Quotation Sent',
  'Follow-Up', 'Negotiation', 'Advance Paid', 'Converted', 'Lost',
];

const STAGE_CONFIG = {
  'New Enquiry':    { bg: '#eef4fb', text: '#1a5276', badge: '#2980b9',  icon: 'bi-star' },
  'Qualified':      { bg: '#f5eef8', text: '#6c3483', badge: '#8e44ad',  icon: 'bi-patch-check' },
  'Proposal Sent':  { bg: '#fef9e7', text: '#7d6608', badge: '#f39c12',  icon: 'bi-send' },
  'Quotation Sent': { bg: '#fefaf0', text: '#7d6608', badge: '#e67e22',  icon: 'bi-file-earmark-text' },
  'Follow-Up':      { bg: '#f0f9f4', text: '#1e8449', badge: '#27ae60',  icon: 'bi-arrow-repeat' },
  'Negotiation':    { bg: '#fdf2e9', text: '#a04000', badge: '#e67e22',  icon: 'bi-chat-dots' },
  'Advance Paid':   { bg: '#eafaf1', text: '#145a32', badge: '#27ae60',  icon: 'bi-cash-coin' },
  'Converted':      { bg: '#e9f7ef', text: '#145a32', badge: '#1e8449',  icon: 'bi-check-circle-fill' },
  'Lost':           { bg: '#fdf0f0', text: '#922b21', badge: '#e74c3c',  icon: 'bi-x-circle' },
};

const PAGE_SIZES = [25, 50, 100, 200];

function getBadge(temp) {
  if (!temp) return '';
  const t = temp.toLowerCase();
  if (t === 'hot')  return 'badge-hot';
  if (t === 'warm') return 'badge-warm';
  if (t === 'cold') return 'badge-cold';
  return '';
}

function isOverdue(d) {
  if (!d) return false;
  const today = new Date(); today.setHours(0,0,0,0);
  return new Date(d) < today;
}

// ── Debounce hook ─────────────────────────────────────────────────────────────
function useDebounce(value, ms = 400) {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return dv;
}

// ── Pagination Component ──────────────────────────────────────────────────────
function Pagination({ page, pages, total, limit, onPage, onLimit }) {
  if (pages <= 1 && total <= limit) return null;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  // Build page numbers to show
  const nums = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) nums.push(i);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 0' }}>
      <span style={{ fontSize: 13, color: '#888' }}>
        Showing {start}–{end} of <strong>{total}</strong> leads
      </span>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginLeft: 'auto' }}>
        <select
          value={limit}
          onChange={(e) => onLimit(Number(e.target.value))}
          style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 }}
        >
          {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} / page</option>)}
        </select>
        <button
          className="btn-act" style={{ padding: '4px 8px' }}
          onClick={() => onPage(1)} disabled={page === 1}
        >«</button>
        <button
          className="btn-act" style={{ padding: '4px 8px' }}
          onClick={() => onPage(page - 1)} disabled={page === 1}
        >‹</button>
        {nums.map((n) => (
          <button
            key={n}
            className="btn-act"
            style={{ padding: '4px 10px', background: n === page ? '#0D3B5E' : undefined, color: n === page ? '#fff' : undefined, fontWeight: n === page ? 700 : undefined }}
            onClick={() => onPage(n)}
          >{n}</button>
        ))}
        <button
          className="btn-act" style={{ padding: '4px 8px' }}
          onClick={() => onPage(page + 1)} disabled={page === pages}
        >›</button>
        <button
          className="btn-act" style={{ padding: '4px 8px' }}
          onClick={() => onPage(pages)} disabled={page === pages}
        >»</button>
      </div>
    </div>
  );
}

// ── CRM Activity Panel ────────────────────────────────────────────────────────
const INTERACTION_TYPES = [
  { key: 'Call',     icon: 'bi-telephone-fill',   color: '#27ae60', label: 'Call'     },
  { key: 'WhatsApp', icon: 'bi-whatsapp',          color: '#25d366', label: 'WhatsApp' },
  { key: 'Email',    icon: 'bi-envelope-fill',     color: '#8e44ad', label: 'Email'    },
  { key: 'Meeting',  icon: 'bi-people-fill',       color: '#f39c12', label: 'Meeting'  },
  { key: 'Visit',    icon: 'bi-building',          color: '#e67e22', label: 'Visit'    },
  { key: 'Note',     icon: 'bi-sticky-fill',       color: '#2980b9', label: 'Note'     },
];

const OUTCOME_OPTIONS = {
  Call: [
    'Answered — Interested',
    'Answered — Callback Requested',
    'Answered — Needs More Info',
    'Answered — Price Issue',
    'Answered — Timing Issue',
    'Answered — Not Interested',
    'No Answer',
    'Busy',
    'Switched Off',
    'Wrong Number',
  ],
  WhatsApp: [
    'Replied — Interested',
    'Replied — Needs Time',
    'Replied — Price Negotiation',
    'Replied — Not Interested',
    'Delivered — No Reply',
    'Read — No Reply',
    'Sent Itinerary',
    'Sent Quote',
  ],
  Email: [
    'Replied — Interested',
    'Replied — Needs Quote',
    'Replied — Not Interested',
    'Opened — No Reply',
    'No Reply',
    'Bounced',
  ],
  Meeting: [
    'Very Interested — Will Book',
    'Confirmed Booking',
    'Price Negotiation',
    'Needs More Time',
    'Will Decide Later',
    'Not Interested',
  ],
  Visit: [
    'Booked',
    'Very Interested',
    'Needs Follow-up',
    'Price Negotiation',
    'Not Interested',
  ],
  Note: [],
};

const OUTCOME_COLORS = {
  'Answered — Interested':         '#27ae60',
  'Answered — Callback Requested': '#f39c12',
  'Answered — Needs More Info':    '#2980b9',
  'Answered — Price Issue':        '#e67e22',
  'Answered — Timing Issue':       '#e67e22',
  'Answered — Not Interested':     '#e74c3c',
  'No Answer':                     '#aaa',
  'Busy':                          '#aaa',
  'Switched Off':                  '#aaa',
  'Wrong Number':                  '#c0392b',
  'Replied — Interested':          '#27ae60',
  'Replied — Needs Time':          '#f39c12',
  'Replied — Price Negotiation':   '#e67e22',
  'Replied — Not Interested':      '#e74c3c',
  'Delivered — No Reply':          '#aaa',
  'Read — No Reply':               '#aaa',
  'Sent Itinerary':                '#2980b9',
  'Sent Quote':                    '#2980b9',
  'Replied — Needs Quote':         '#f39c12',
  'Opened — No Reply':             '#aaa',
  'No Reply':                      '#aaa',
  'Bounced':                       '#e74c3c',
  'Very Interested — Will Book':   '#27ae60',
  'Confirmed Booking':             '#1e8449',
  'Price Negotiation':             '#e67e22',
  'Needs More Time':               '#f39c12',
  'Will Decide Later':             '#f39c12',
  'Not Interested':                '#e74c3c',
  'Booked':                        '#1e8449',
  'Very Interested':               '#27ae60',
  'Needs Follow-up':               '#f39c12',
};

const ACTION_ICONS = {
  'Call':          'bi-telephone-fill',
  'Called':        'bi-telephone-fill',
  'WhatsApp':      'bi-whatsapp',
  'Email':         'bi-envelope-fill',
  'Email Sent':    'bi-envelope-fill',
  'Meeting':       'bi-people-fill',
  'Visit':         'bi-building',
  'Note':          'bi-sticky-fill',
  'Follow-up':     'bi-calendar-check',
  'Stage Changed': 'bi-arrow-right-circle-fill',
  'Created':       'bi-plus-circle-fill',
  'Converted':     'bi-check-circle-fill',
};
const ACTION_COLORS = {
  'Call':          '#27ae60', 'Called': '#27ae60',
  'WhatsApp':      '#25d366',
  'Email':         '#8e44ad', 'Email Sent': '#8e44ad',
  'Meeting':       '#f39c12',
  'Visit':         '#e67e22',
  'Note':          '#2980b9',
  'Follow-up':     '#e67e22',
  'Stage Changed': '#0D3B5E',
  'Created':       '#1e8449',
  'Converted':     '#27ae60',
};

function ActivityPanel({ lead: initialLead, onClose, onLeadUpdated }) {
  const { showToast } = useToast();
  const [lead, setLead] = useState(initialLead);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [interactionType, setInteractionType] = useState('Call');
  const [outcome, setOutcome] = useState('');
  const [detail, setDetail] = useState('');
  const [nextFollowUp, setNextFollowUp] = useState('');
  const [durationMins, setDurationMins] = useState('');
  const [stageUpdate, setStageUpdate] = useState('');
  const [tempUpdate, setTempUpdate] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => { setLead(initialLead); }, [initialLead]);

  useEffect(() => {
    if (!lead) return;
    setLoading(true);
    api.get(`/api/leads/activity/${lead.id}`)
      .then((r) => setActivities(r.data.activities || []))
      .catch(() => setActivities([]))
      .finally(() => setLoading(false));
  }, [lead?.id]);

  // Reset outcome when type changes
  useEffect(() => { setOutcome(''); }, [interactionType]);

  const canSubmit = outcome || detail.trim();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const payload = {
        action: interactionType,
        detail: detail.trim() || (outcome ? `${interactionType}: ${outcome}` : ''),
        outcome: outcome || null,
        next_follow_up: nextFollowUp || null,
        duration_mins: durationMins ? parseInt(durationMins, 10) : null,
        stage_updated_to: stageUpdate || null,
        temperature: tempUpdate || null,
      };
      const r = await api.post(`/api/leads/activity/${lead.id}`, payload);
      setActivities((prev) => [r.data.activity, ...prev]);
      if (r.data.lead) {
        setLead(r.data.lead);
        if (onLeadUpdated) onLeadUpdated(r.data.lead);
      }
      // Reset form
      setDetail(''); setOutcome(''); setNextFollowUp('');
      setDurationMins(''); setStageUpdate(''); setTempUpdate('');
      setShowAdvanced(false);
      showToast('Interaction logged', 'success');
    } catch { showToast('Failed to save', 'error'); }
    finally { setSaving(false); }
  };

  if (!lead) return null;

  const currentType = INTERACTION_TYPES.find((t) => t.key === interactionType);
  const outcomeList = OUTCOME_OPTIONS[interactionType] || [];

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1099 }}
        onClick={onClose}
      />
      {/* Panel */}
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: 440,
        background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.18)',
        zIndex: 1100, display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>

        {/* ── Header ── */}
        <div style={{ padding: '16px 20px', background: '#0D3B5E', color: '#fff', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{lead.client_name}</div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                {lead.lead_no} · {lead.phone}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>×</button>
          </div>
          {/* Lead quick stats */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <span style={{ background: 'rgba(255,255,255,0.15)', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
              <i className="bi bi-geo-alt me-1" />{lead.destination || 'No destination'}
            </span>
            {lead.budget > 0 && (
              <span style={{ background: 'rgba(255,255,255,0.15)', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                <i className="bi bi-currency-rupee me-1" />{formatCurrencyL(lead.budget)}
              </span>
            )}
            <span style={{
              padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: lead.temperature === 'Hot' ? '#e74c3c' : lead.temperature === 'Warm' ? '#f39c12' : '#2980b9',
            }}>
              {lead.temperature}
            </span>
            <span style={{ background: 'rgba(255,255,255,0.15)', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
              {lead.stage}
            </span>
          </div>
          {lead.follow_up_date && (
            <div style={{ marginTop: 8, fontSize: 11, opacity: 0.8 }}>
              <i className="bi bi-calendar-event me-1" />
              Follow-up: <strong>{formatDate(lead.follow_up_date)}</strong>
              {isOverdue(lead.follow_up_date) && <span style={{ color: '#ff6b6b', marginLeft: 6 }}>● Overdue</span>}
            </div>
          )}
        </div>

        {/* ── Log Interaction Form ── */}
        <div style={{ padding: '16px', borderBottom: '1px solid #eee', flexShrink: 0, background: '#fafafa' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Log Interaction
          </div>

          {/* Interaction type pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {INTERACTION_TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => setInteractionType(t.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 20,
                  border: `2px solid ${interactionType === t.key ? t.color : '#e0e0e0'}`,
                  background: interactionType === t.key ? `${t.color}15` : '#fff',
                  color: interactionType === t.key ? t.color : '#777',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <i className={`bi ${t.icon}`} style={{ fontSize: 13 }} />{t.label}
              </button>
            ))}
          </div>

          {/* Customer response outcome */}
          {outcomeList.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 6 }}>CUSTOMER RESPONSE *</div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {outcomeList.map((o) => {
                  const oc = OUTCOME_COLORS[o] || '#888';
                  const sel = outcome === o;
                  return (
                    <button
                      key={o}
                      onClick={() => setOutcome(sel ? '' : o)}
                      style={{
                        padding: '4px 10px', borderRadius: 14,
                        border: `1px solid ${sel ? oc : '#ddd'}`,
                        background: sel ? `${oc}20` : '#fff',
                        color: sel ? oc : '#666',
                        fontSize: 11, fontWeight: sel ? 700 : 500, cursor: 'pointer',
                      }}
                    >{o}</button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          <textarea
            rows={2}
            style={{ width: '100%', border: '1px solid #ddd', borderRadius: 6, padding: '8px 10px', fontSize: 13, resize: 'none', marginBottom: 8 }}
            placeholder={`Additional notes for this ${interactionType.toLowerCase()}... (optional)`}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
          />

          {/* Advanced options toggle */}
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            style={{ background: 'none', border: 'none', color: '#0D3B5E', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '2px 0', marginBottom: 8 }}
          >
            <i className={`bi bi-chevron-${showAdvanced ? 'up' : 'down'} me-1`} />
            {showAdvanced ? 'Hide' : 'Show'} quick updates (Stage · Temperature · Follow-up · Duration)
          </button>

          {showAdvanced && (
            <div style={{ background: '#f0f4f8', borderRadius: 8, padding: 12, marginBottom: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#666', display: 'block', marginBottom: 4 }}>UPDATE STAGE</label>
                  <select
                    className="form-select form-select-sm"
                    value={stageUpdate}
                    onChange={(e) => setStageUpdate(e.target.value)}
                  >
                    <option value="">— No change —</option>
                    {KANBAN_STAGES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#666', display: 'block', marginBottom: 4 }}>UPDATE TEMPERATURE</label>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {['Hot','Warm','Cold'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setTempUpdate(tempUpdate === t ? '' : t)}
                        style={{
                          flex: 1, padding: '4px 0', borderRadius: 6, border: '1px solid #ddd',
                          fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          background: tempUpdate === t ? (t === 'Hot' ? '#e74c3c' : t === 'Warm' ? '#f39c12' : '#2980b9') : '#fff',
                          color: tempUpdate === t ? '#fff' : '#555',
                        }}
                      >{t}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#666', display: 'block', marginBottom: 4 }}>NEXT FOLLOW-UP DATE</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={nextFollowUp}
                    onChange={(e) => setNextFollowUp(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                {(interactionType === 'Call' || interactionType === 'Meeting') && (
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#666', display: 'block', marginBottom: 4 }}>
                      DURATION (MINS)
                    </label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={durationMins}
                      onChange={(e) => setDurationMins(e.target.value)}
                      placeholder="e.g. 15"
                      min={1} max={480}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            style={{
              width: '100%', padding: '9px 0', borderRadius: 8,
              background: canSubmit ? (currentType?.color || '#0D3B5E') : '#ddd',
              color: canSubmit ? '#fff' : '#aaa',
              border: 'none', fontWeight: 700, fontSize: 13, cursor: canSubmit ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
            onClick={handleSubmit}
            disabled={saving || !canSubmit}
          >
            {saving
              ? <><span className="spinner-border spinner-border-sm me-2" />Saving...</>
              : <><i className={`bi ${currentType?.icon}`} />Log {interactionType}</>
            }
          </button>
        </div>

        {/* ── Activity Timeline ── */}
        <div style={{ flex: 1, padding: '12px 16px', overflowY: 'auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#999', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
            Interaction History ({activities.length})
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 30 }}>
              <span className="spinner-border spinner-border-sm" style={{ color: '#0D3B5E' }} />
            </div>
          ) : activities.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#ccc', padding: '40px 0' }}>
              <i className="bi bi-clock-history" style={{ fontSize: 28, display: 'block', marginBottom: 10 }} />
              <div style={{ fontSize: 13 }}>No interactions recorded yet</div>
            </div>
          ) : activities.map((a, idx) => {
            const icon = ACTION_ICONS[a.action] || 'bi-circle-fill';
            const color = ACTION_COLORS[a.action] || '#aaa';
            const outcomeColor = a.outcome ? (OUTCOME_COLORS[a.outcome] || '#888') : null;
            const isLast = idx === activities.length - 1;
            return (
              <div key={a.id} style={{ display: 'flex', gap: 10, marginBottom: isLast ? 0 : 16 }}>
                {/* Timeline dot + line */}
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', width: 32 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: `${color}18`, color, fontSize: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `2px solid ${color}30`,
                  }}>
                    <i className={`bi ${icon}`} />
                  </div>
                  {!isLast && <div style={{ width: 2, flex: 1, background: '#eee', marginTop: 4 }} />}
                </div>

                {/* Content */}
                <div style={{ flex: 1, paddingBottom: isLast ? 0 : 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#333' }}>{a.action}</span>
                    {a.duration_mins && (
                      <span style={{ fontSize: 10, color: '#aaa', fontWeight: 600 }}>
                        <i className="bi bi-stopwatch me-1" />{a.duration_mins}m
                      </span>
                    )}
                  </div>

                  {/* Outcome badge */}
                  {a.outcome && (
                    <div style={{ marginTop: 4 }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 10px', borderRadius: 12,
                        background: `${outcomeColor}18`, color: outcomeColor,
                        fontSize: 11, fontWeight: 700, border: `1px solid ${outcomeColor}40`,
                      }}>
                        {a.outcome}
                      </span>
                    </div>
                  )}

                  {/* Notes */}
                  {a.detail && a.detail !== `${a.action}: ${a.outcome}` && (
                    <div style={{ fontSize: 12, color: '#555', marginTop: 4, lineHeight: 1.5 }}>{a.detail}</div>
                  )}

                  {/* Stage / follow-up changes */}
                  {a.stage_updated_to && (
                    <div style={{ fontSize: 11, color: '#0D3B5E', marginTop: 4, fontWeight: 600 }}>
                      <i className="bi bi-arrow-right-circle me-1" />Stage → {a.stage_updated_to}
                    </div>
                  )}
                  {a.next_follow_up && (
                    <div style={{ fontSize: 11, color: '#27ae60', marginTop: 3, fontWeight: 600 }}>
                      <i className="bi bi-calendar-check me-1" />Follow-up set: {formatDate(a.next_follow_up)}
                    </div>
                  )}

                  <div style={{ fontSize: 10, color: '#bbb', marginTop: 5 }}>
                    <i className="bi bi-person me-1" />{a.done_by} · {timeAgo(a.created_at)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ── Lead Modal ────────────────────────────────────────────────────────────────
function LeadModal({ show, onClose, onSave, initial, employees }) {
  const empty = {
    client_name: '', phone: '', destination: '', pax: 1, budget: '',
    source: 'WhatsApp', assigned_to: '', temperature: 'Warm',
    stage: 'New Enquiry', follow_up_date: '', travel_date: '', notes: '',
  };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!show) return;
    setForm(initial ? {
      client_name:    initial.client_name || '',
      phone:          initial.phone || '',
      destination:    initial.destination || '',
      pax:            initial.pax || 1,
      budget:         initial.budget || '',
      source:         initial.source || 'WhatsApp',
      assigned_to:    initial.assigned_to || '',
      temperature:    initial.temperature || 'Warm',
      stage:          initial.stage || 'New Enquiry',
      follow_up_date: initial.follow_up_date ? String(initial.follow_up_date).split('T')[0] : '',
      travel_date:    initial.travel_date    ? String(initial.travel_date).split('T')[0]    : '',
      notes:          initial.notes || '',
    } : empty);
  }, [show, initial]);

  if (!show) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const overdueFU = form.follow_up_date && isOverdue(form.follow_up_date);

  const submit = async () => {
    if (!form.client_name.trim()) { alert('Client name is required'); return; }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="modal show d-block" tabIndex="-1"
      style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header modal-header-custom">
            <h5 className="modal-title">
              <i className={`bi ${initial?.id ? 'bi-pencil-square' : 'bi-plus-circle'} me-2`} />
              {initial?.id ? `Edit Lead — ${initial.lead_no || ''}` : 'New Lead'}
            </h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">Client Name <span className="text-danger">*</span></label>
                <input className="form-control" value={form.client_name} onChange={set('client_name')} placeholder="Full name" />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Phone</label>
                <input className="form-control" value={form.phone} onChange={set('phone')} placeholder="10-digit mobile" maxLength={15} />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Destination</label>
                <input className="form-control" value={form.destination} onChange={set('destination')} placeholder="e.g. Maldives, Bali" />
              </div>
              <div className="col-md-3">
                <label className="form-label fw-semibold">Pax</label>
                <input type="number" className="form-control" value={form.pax} min={1} onChange={set('pax')} />
              </div>
              <div className="col-md-3">
                <label className="form-label fw-semibold">Budget (₹)</label>
                <input type="number" className="form-control" value={form.budget} onChange={set('budget')} placeholder="0" />
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold">Source</label>
                <select className="form-select" value={form.source} onChange={set('source')}>
                  {LEAD_SOURCES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold">Temperature</label>
                <select className="form-select" value={form.temperature} onChange={set('temperature')}>
                  {LEAD_TEMPERATURES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold">Stage</label>
                <select className="form-select" value={form.stage} onChange={set('stage')}>
                  {LEAD_STAGES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Assigned To</label>
                {employees?.length > 0 ? (
                  <select className="form-select" value={form.assigned_to} onChange={set('assigned_to')}>
                    <option value="">— Select staff —</option>
                    {employees.map((u) => (
                      <option key={u.id} value={u.name}>
                        {u.name}{u.designation ? ` — ${u.designation}` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input className="form-control" value={form.assigned_to} onChange={set('assigned_to')} placeholder="Staff name (add employees in HR module)" />
                )}
              </div>
              <div className="col-md-3">
                <label className="form-label fw-semibold">
                  Follow-up Date
                  {overdueFU && <span style={{ color: '#e74c3c', fontSize: 11, marginLeft: 6, fontWeight: 700 }}>⚠ Overdue</span>}
                </label>
                <input type="date" className="form-control" value={form.follow_up_date} onChange={set('follow_up_date')}
                  style={overdueFU ? { borderColor: '#e74c3c', background: '#fff5f5' } : {}} />
              </div>
              <div className="col-md-3">
                <label className="form-label fw-semibold">Travel Date</label>
                <input type="date" className="form-control" value={form.travel_date} onChange={set('travel_date')} />
              </div>
              <div className="col-12">
                <label className="form-label fw-semibold">Notes</label>
                <textarea className="form-control" rows={3} value={form.notes} onChange={set('notes')}
                  placeholder="Customer requirements, budget details..." />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" onClick={submit} disabled={saving}>
              {saving ? <><span className="spinner-border spinner-border-sm me-2" />Saving...</> : (initial?.id ? 'Update Lead' : 'Add Lead')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Convert Modal ─────────────────────────────────────────────────────────────
function ConvertModal({ show, lead, onClose, onConverted }) {
  const { showToast } = useToast();
  const [converting, setConverting] = useState(false);
  if (!show || !lead) return null;

  const go = async () => {
    setConverting(true);
    try {
      const r = await api.post(`/api/leads/convert/${lead.id}`);
      showToast(`Booking ${r.data.booking_no} created!`, 'success');
      onConverted(lead.id);
    } catch (err) {
      showToast(err?.response?.data?.error || 'Conversion failed', 'error');
      setConverting(false);
    }
  };

  return (
    <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header" style={{ background: '#27ae60', color: '#fff' }}>
            <h5 className="modal-title"><i className="bi bi-check-circle me-2" />Convert to Booking</h5>
            <button className="btn-close btn-close-white" onClick={onClose} disabled={converting} />
          </div>
          <div className="modal-body">
            <div style={{ background: '#f0f9f4', borderRadius: 8, padding: 16, marginBottom: 12, fontSize: 13 }}>
              <div className="row g-2">
                <div className="col-6"><span className="text-muted">Lead #:</span> <strong>{lead.lead_no}</strong></div>
                <div className="col-6"><span className="text-muted">Client:</span> <strong>{lead.client_name}</strong></div>
                <div className="col-6"><span className="text-muted">Destination:</span> {lead.destination || '—'}</div>
                <div className="col-6"><span className="text-muted">Budget:</span> <strong style={{ color: '#27ae60' }}>{formatCurrency(lead.budget)}</strong></div>
              </div>
            </div>
            <p style={{ fontSize: 13, color: '#666', margin: 0 }}>
              <i className="bi bi-info-circle me-1 text-primary" />
              A <strong>Confirmed Booking</strong> will be created and this lead will be marked <strong>Converted</strong>.
            </p>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose} disabled={converting}>Cancel</button>
            <button className="btn" style={{ background: '#27ae60', color: '#fff', fontWeight: 600 }} onClick={go} disabled={converting}>
              {converting ? <><span className="spinner-border spinner-border-sm me-2" />Converting...</> : <><i className="bi bi-check-circle me-1" />Convert to Booking</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Bulk Actions Bar ──────────────────────────────────────────────────────────
function BulkBar({ selected, leads, employees, onBulkStage, onBulkAssign, onBulkDelete, onClear }) {
  const [stageVal, setStageVal] = useState('');
  const [assignVal, setAssignVal] = useState('');

  if (selected.length === 0) return null;

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 200,
      background: '#0D3B5E', color: '#fff', padding: '10px 16px',
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      borderRadius: 8, marginBottom: 10,
    }}>
      <span style={{ fontWeight: 700, fontSize: 14 }}>
        <i className="bi bi-check2-square me-2" />{selected.length} selected
      </span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Bulk Stage */}
        <select value={stageVal} onChange={(e) => setStageVal(e.target.value)}
          style={{ padding: '4px 8px', borderRadius: 4, border: 'none', fontSize: 12 }}>
          <option value="">Move to Stage...</option>
          {LEAD_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button
          style={{ padding: '4px 10px', borderRadius: 4, border: 'none', background: '#27ae60', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          onClick={() => { if (stageVal) { onBulkStage(stageVal); setStageVal(''); } }}
          disabled={!stageVal}
        >Apply</button>

        {/* Bulk Assign */}
        {employees?.length > 0 && (
          <>
            <select value={assignVal} onChange={(e) => setAssignVal(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: 4, border: 'none', fontSize: 12 }}>
              <option value="">Assign to...</option>
              {employees.map((u) => <option key={u.id} value={u.name}>{u.name}{u.designation ? ` (${u.designation})` : ''}</option>)}
            </select>
            <button
              style={{ padding: '4px 10px', borderRadius: 4, border: 'none', background: '#2980b9', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              onClick={() => { if (assignVal) { onBulkAssign(assignVal); setAssignVal(''); } }}
              disabled={!assignVal}
            >Assign</button>
          </>
        )}

        <button
          style={{ padding: '4px 10px', borderRadius: 4, border: 'none', background: '#e74c3c', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          onClick={onBulkDelete}
        ><i className="bi bi-trash me-1" />Delete</button>
      </div>
      <button
        style={{ marginLeft: 'auto', background: 'none', border: '1px solid rgba(255,255,255,0.4)', color: '#fff', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}
        onClick={onClear}
      >Clear</button>
    </div>
  );
}

// ── Kanban Card ───────────────────────────────────────────────────────────────
function KanbanCard({ lead, onEdit, onDelete, onConvert, onActivity, onDragStart }) {
  const cfg = STAGE_CONFIG[lead.stage] || STAGE_CONFIG['New Enquiry'];
  const overdue = isOverdue(lead.follow_up_date) && lead.stage !== 'Converted' && lead.stage !== 'Lost';
  const canConvert = lead.stage !== 'Converted' && lead.stage !== 'Lost';

  return (
    <div
      className="kanban-card"
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      style={{ borderLeftColor: cfg.badge, cursor: 'grab', background: overdue ? '#fffafa' : '#fff', outline: overdue ? '1px solid #f5c6cb' : 'none' }}
    >
      <div className="kanban-card-name">{lead.client_name}</div>
      <div style={{ fontSize: '10px', color: '#aaa', marginBottom: 3 }}>{lead.lead_no}</div>

      {lead.phone && <div className="kanban-card-meta"><i className="bi bi-telephone me-1" />{lead.phone}</div>}
      {lead.destination && (
        <div style={{ fontSize: '11px', color: '#2980b9', fontWeight: 600, marginBottom: 3 }}>
          <i className="bi bi-geo-alt me-1" />{lead.destination}
        </div>
      )}
      {lead.pax > 0 && <div className="kanban-card-meta"><i className="bi bi-people me-1" />{lead.pax} Pax</div>}

      <div className="d-flex justify-content-between align-items-center mt-2 mb-1">
        {lead.budget > 0
          ? <span style={{ fontSize: 12, fontWeight: 700, color: '#27ae60' }}>{formatCurrencyL(lead.budget)}</span>
          : <span />}
        <span className={getBadge(lead.temperature)}>{lead.temperature}</span>
      </div>

      {lead.assigned_to && <div className="kanban-card-meta"><i className="bi bi-person me-1" />{lead.assigned_to}</div>}

      {lead.follow_up_date && (
        <div className="kanban-card-meta" style={overdue ? { color: '#e74c3c', fontWeight: 700 } : {}}>
          <i className={`bi ${overdue ? 'bi-exclamation-circle-fill' : 'bi-calendar-event'} me-1`} />
          FU: {formatDate(lead.follow_up_date)}{overdue && ' ⚠'}
        </div>
      )}

      <div className="d-flex gap-1 mt-2">
        <button className="btn-act edit" style={{ flex: 1, fontSize: 11 }} onClick={() => onEdit(lead)} title="Edit">
          <i className="bi bi-pencil" /> Edit
        </button>
        <button className="btn-act" style={{ fontSize: 11, background: '#eef4fb', color: '#2980b9', border: '1px solid #bee3f8' }} onClick={() => onActivity(lead)} title="Activity Log">
          <i className="bi bi-clock-history" />
        </button>
        {canConvert && (
          <button className="btn-act done" title="Convert to Booking"
            style={{ background: '#e8f8f0', color: '#27ae60', border: '1px solid #27ae60' }}
            onClick={() => onConvert(lead)}>
            <i className="bi bi-check-circle" />
          </button>
        )}
        <button className="btn-act del" title="Delete" onClick={() => onDelete(lead.id, lead.client_name)}>
          <i className="bi bi-trash" />
        </button>
      </div>
    </div>
  );
}

// ── Kanban Column ─────────────────────────────────────────────────────────────
function KanbanColumn({ stage, leads, pipeline, onEdit, onDelete, onConvert, onActivity, onDragStart, onDragOver, onDrop }) {
  const cfg = STAGE_CONFIG[stage] || {};
  const [isDragOver, setIsDragOver] = useState(false);
  const pipelineInfo = pipeline?.find((p) => p.stage === stage);
  const totalValue = parseFloat(pipelineInfo?.value || 0);

  return (
    <div
      className="kanban-column"
      style={{ background: isDragOver ? '#e8f4fd' : cfg.bg, border: isDragOver ? '2px dashed #2980b9' : '2px dashed transparent', transition: 'all 0.2s' }}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); onDragOver(e); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => { setIsDragOver(false); onDrop(e, stage); }}
    >
      <div className="kanban-column-title" style={{ color: cfg.text }}>
        <i className={`bi ${cfg.icon}`} style={{ fontSize: 12 }} />
        <span style={{ flex: 1 }}>{stage}</span>
        <span className="kanban-column-count" style={{ background: cfg.badge }}>{leads.length}</span>
      </div>
      {totalValue > 0 && (
        <div style={{ fontSize: 11, color: cfg.text, fontWeight: 700, marginBottom: 6, textAlign: 'center', background: `${cfg.badge}15`, borderRadius: 4, padding: '2px 6px' }}>
          Pipeline: {formatCurrencyL(totalValue)}
        </div>
      )}
      {leads.length === 0 && (
        <div style={{ textAlign: 'center', color: '#ccc', fontSize: 12, padding: '20px 8px', border: '1px dashed #e0e0e0', borderRadius: 6 }}>
          <i className="bi bi-arrow-down-circle me-1" />Drop here
        </div>
      )}
      {leads.map((lead) => (
        <KanbanCard
          key={lead.id} lead={lead}
          onEdit={onEdit} onDelete={onDelete} onConvert={onConvert}
          onActivity={onActivity} onDragStart={onDragStart}
        />
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Leads() {
  const { showToast } = useToast();

  // Data
  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });
  const [pipeline, setPipeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]); // active staff for dropdowns

  // View
  const [view, setView] = useState('kanban');
  const [activeTab, setActiveTab] = useState('board'); // board | analytics

  // Basic Filters
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterTemp, setFilterTemp] = useState('');
  const [filterAssigned, setFilterAssigned] = useState('');
  const [filterSource, setFilterSource] = useState('');

  // Advanced Filters
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [followUpStatus, setFollowUpStatus] = useState(''); // overdue|today|this_week|none
  const [travelFrom, setTravelFrom] = useState('');
  const [travelTo, setTravelTo] = useState('');

  const [sort, setSort] = useState('id');
  const [order, setOrder] = useState('desc');
  const debouncedSearch = useDebounce(search, 400);

  // Modals
  const [modalShow, setModalShow] = useState(false);
  const [editLead, setEditLead] = useState(null);
  const [convertLead, setConvertLead] = useState(null);
  const [activityLead, setActivityLead] = useState(null);

  // Bulk select
  const [selected, setSelected] = useState([]);

  // Drag
  const dragIdRef = useRef(null);

  // ── Fetch employees (active staff) for dropdowns ──────────────────────────
  useEffect(() => {
    api.get('/api/employees/staff')
      .then((r) => setEmployees(r.data.employees || []))
      .catch(() => {}); // silently fail — dropdowns fall back to text input
  }, []);

  // ── Fetch Leads ────────────────────────────────────────────────────────────
  const fetchLeads = useCallback(async (opts = {}) => {
    setLoading(true);
    try {
      const pg    = opts.page   ?? pagination.page;
      const lmt   = opts.limit  ?? pagination.limit;

      const params = new URLSearchParams();
      params.set('page',   pg);
      params.set('limit',  lmt);
      params.set('sort',   opts.sort  ?? sort);
      params.set('order',  opts.order ?? order);

      // Basic filters
      const s = opts.search   ?? debouncedSearch;
      const st = opts.stage   ?? filterStage;
      const tm = opts.temp    ?? filterTemp;
      const as = opts.assigned ?? filterAssigned;
      const sc = opts.source  ?? filterSource;
      if (s)   params.set('search',   s);
      if (st)  params.set('stage',    st);
      if (tm)  params.set('temp',     tm);
      if (as)  params.set('assigned', as);
      if (sc)  params.set('source',   sc);

      // Advanced filters
      if (dateFrom)       params.set('date_from',        dateFrom);
      if (dateTo)         params.set('date_to',          dateTo);
      if (budgetMin)      params.set('budget_min',       budgetMin);
      if (budgetMax)      params.set('budget_max',       budgetMax);
      if (followUpStatus) params.set('follow_up_status', followUpStatus);
      if (travelFrom)     params.set('travel_from',      travelFrom);
      if (travelTo)       params.set('travel_to',        travelTo);

      // Use kanban endpoint for kanban view (returns more leads, no pagination)
      const endpoint = view === 'kanban' ? `/api/leads/kanban?${params}` : `/api/leads/list?${params}`;
      const res = await api.get(endpoint);
      const data = res.data;

      setLeads(data.leads || []);
      if (data.pagination) setPagination(data.pagination);
      if (data.pipeline)   setPipeline(data.pipeline);
      setSelected([]);
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to load leads', 'error');
    } finally {
      setLoading(false);
    }
  }, [
    debouncedSearch, filterStage, filterTemp, filterAssigned, filterSource,
    dateFrom, dateTo, budgetMin, budgetMax, followUpStatus, travelFrom, travelTo,
    sort, order, view, pagination.page, pagination.limit,
  ]);

  useEffect(() => {
    fetchLeads({ page: 1 });
  }, [
    debouncedSearch, filterStage, filterTemp, filterAssigned, filterSource,
    dateFrom, dateTo, budgetMin, budgetMax, followUpStatus, travelFrom, travelTo,
    sort, order, view,
  ]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState(null);
  useEffect(() => {
    if (activeTab === 'analytics') {
      api.get('/api/leads/stats').then((r) => setStats(r.data.stats)).catch(() => {});
    }
  }, [activeTab]);

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const handleSave = async (form) => {
    try {
      if (editLead?.id) {
        await api.post(`/api/leads/update/${editLead.id}`, form);
        showToast('Lead updated', 'success');
      } else {
        await api.post('/api/leads/add', form);
        showToast('Lead added', 'success');
      }
      setModalShow(false); setEditLead(null);
      fetchLeads({ page: 1 });
    } catch (err) {
      showToast(err?.response?.data?.error || 'Save failed', 'error');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete lead for "${name}"?`)) return;
    try {
      await api.post(`/api/leads/delete/${id}`);
      showToast('Lead deleted', 'success');
      setLeads((p) => p.filter((l) => l.id !== id));
    } catch (err) { showToast(err?.response?.data?.error || 'Delete failed', 'error'); }
  };

  const handleConverted = (leadId) => {
    setLeads((p) => p.map((l) => l.id === leadId ? { ...l, stage: 'Converted' } : l));
    setConvertLead(null);
  };

  // ── Bulk ───────────────────────────────────────────────────────────────────
  const toggleSelect = (id) => setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const toggleAll = () => setSelected(selected.length === leads.length ? [] : leads.map((l) => l.id));

  const bulkStage = async (stage) => {
    if (!window.confirm(`Move ${selected.length} leads to "${stage}"?`)) return;
    try {
      await api.post('/api/leads/bulk-update', { ids: selected, stage });
      showToast(`${selected.length} leads moved to "${stage}"`, 'success');
      fetchLeads({ page: 1 });
    } catch (err) { showToast(err?.response?.data?.error || 'Bulk update failed', 'error'); }
  };

  const bulkAssign = async (assigned_to) => {
    try {
      await api.post('/api/leads/bulk-update', { ids: selected, assigned_to });
      showToast(`${selected.length} leads assigned to ${assigned_to}`, 'success');
      fetchLeads({ page: 1 });
    } catch (err) { showToast(err?.response?.data?.error || 'Bulk assign failed', 'error'); }
  };

  const bulkDelete = async () => {
    if (!window.confirm(`Delete ${selected.length} leads? Cannot be undone.`)) return;
    try {
      await api.post('/api/leads/bulk-delete', { ids: selected });
      showToast(`${selected.length} leads deleted`, 'success');
      fetchLeads({ page: 1 });
    } catch (err) { showToast(err?.response?.data?.error || 'Bulk delete failed', 'error'); }
  };

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const params = new URLSearchParams({ stage: filterStage, temp: filterTemp, search: debouncedSearch });
    window.open(`/api/leads/export?${params}`, '_blank');
  };

  // ── Sort ───────────────────────────────────────────────────────────────────
  const handleSort = (col) => {
    if (sort === col) setOrder((o) => o === 'asc' ? 'desc' : 'asc');
    else { setSort(col); setOrder('desc'); }
  };
  const sortIcon = (col) => sort === col ? (order === 'asc' ? ' ↑' : ' ↓') : '';

  // ── Drag-and-drop ──────────────────────────────────────────────────────────
  const handleDragStart = (e, id) => { dragIdRef.current = id; e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver  = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const handleDrop = async (e, newStage) => {
    e.preventDefault();
    const id = dragIdRef.current; dragIdRef.current = null;
    if (!id) return;
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.stage === newStage) return;
    const prev = leads;
    setLeads((p) => p.map((l) => l.id === id ? { ...l, stage: newStage } : l));
    try {
      await api.post(`/api/leads/update/${id}`, { stage: newStage });
      showToast(`Moved to "${newStage}"`, 'success');
    } catch { setLeads(prev); showToast('Failed to update stage', 'error'); }
  };

  // ── KPIs from pipeline ─────────────────────────────────────────────────────
  const totalLeads  = pagination.total || leads.length;
  const pipelineTotal = pipeline.reduce((s, p) => s + parseFloat(p.value || 0), 0);
  const convertedRow = pipeline.find((p) => p.stage === 'Converted');
  const overdueCount = leads.filter((l) => isOverdue(l.follow_up_date) && l.stage !== 'Converted' && l.stage !== 'Lost').length;

  const byStage = (stage) => leads.filter((l) => l.stage === stage);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="section-header">
        <h1 className="section-title">
          <i className="bi bi-funnel me-2" style={{ color: '#f5a623' }} />Lead Management
        </h1>
        <div className="d-flex gap-2 flex-wrap">
          <button className="btn-act done" onClick={() => fetchLeads({ page: 1 })} title="Refresh">
            <i className="bi bi-arrow-clockwise" />
          </button>
          <button className="btn-act" style={{ background: '#eef4fb', color: '#0D3B5E', border: '1px solid #bee3f8' }} onClick={handleExport} title="Export CSV">
            <i className="bi bi-download me-1" />Export
          </button>
          <button className="btn-add-new" onClick={() => { setEditLead(null); setModalShow(true); }}>
            <i className="bi bi-plus-lg" /> Add Lead
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="row g-3 mb-3">
        {[
          { label: 'Total Leads',     value: totalLeads,                          icon: 'bi-funnel',            cls: '' },
          { label: 'Pipeline Value',  value: formatCurrencyL(pipelineTotal),      icon: 'bi-currency-rupee',    cls: '' },
          { label: 'Hot Leads',       value: leads.filter((l)=>l.temperature==='Hot').length,  icon: 'bi-fire', cls: 'danger' },
          { label: 'Converted',       value: parseInt(convertedRow?.count || 0),  icon: 'bi-check-circle',      cls: 'success' },
          { label: 'Overdue Follow-ups', value: overdueCount,                     icon: 'bi-exclamation-circle',cls: overdueCount > 0 ? 'danger' : '' },
          { label: 'This Page',       value: leads.length,                        icon: 'bi-table',             cls: 'info' },
        ].map((k) => (
          <div className="col-6 col-md-4 col-lg-2" key={k.label}>
            <div className={`kpi-card ${k.cls}`}>
              <div className="kpi-label"><i className={`bi ${k.icon} me-1`} />{k.label}</div>
              <div className="kpi-value">{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Overdue Alert */}
      {overdueCount > 0 && (
        <div style={{ background: '#fff5f5', border: '1px solid #f5c6cb', borderRadius: 8, padding: '10px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="bi bi-exclamation-triangle-fill" style={{ color: '#e74c3c', fontSize: 18 }} />
          <span style={{ color: '#721c24', fontWeight: 600, fontSize: 14 }}>
            {overdueCount} lead{overdueCount !== 1 ? 's have' : ' has'} overdue follow-up dates on this page.
          </span>
          <button
            style={{ marginLeft: 'auto', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
            onClick={() => { setView('table'); setFilterStage(''); setFilterTemp(''); }}
          >View Table</button>
        </div>
      )}

      {/* Tabs */}
      <div className="tab-buttons mb-3" style={{ borderBottom: '2px solid #eee', paddingBottom: 0 }}>
        {[
          { key: 'board',     label: 'Pipeline Board', icon: 'bi-kanban' },
          { key: 'analytics', label: 'Analytics',      icon: 'bi-bar-chart-line' },
        ].map((t) => (
          <button key={t.key} className={`tab-btn ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
            <i className={`bi ${t.icon} me-1`} />{t.label}
          </button>
        ))}
      </div>

      {activeTab === 'analytics' ? (
        /* ── Analytics Tab ── */
        <AnalyticsPanel stats={stats} pipeline={pipeline} />
      ) : (
        <>
          {/* Filter Bar */}
          <div className="filter-bar">
            <div className="tab-buttons mb-0">
              <button className={`tab-btn ${view === 'kanban' ? 'active' : ''}`} onClick={() => setView('kanban')}>
                <i className="bi bi-kanban me-1" />Kanban
              </button>
              <button className={`tab-btn ${view === 'table' ? 'active' : ''}`} onClick={() => setView('table')}>
                <i className="bi bi-table me-1" />Table
              </button>
            </div>

            <input
              type="text" placeholder="Search name, phone, destination, source..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: 220 }}
            />
            <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)}>
              <option value="">All Stages</option>
              {LEAD_STAGES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select value={filterTemp} onChange={(e) => setFilterTemp(e.target.value)}>
              <option value="">All Temps</option>
              {LEAD_TEMPERATURES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
              <option value="">All Sources</option>
              {LEAD_SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
            {employees.length > 0 && (
              <select value={filterAssigned} onChange={(e) => setFilterAssigned(e.target.value)}>
                <option value="">All Staff</option>
                {employees.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
            )}

            <button
              className={`btn btn-sm ${showAdvanced ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setShowAdvanced((v) => !v)}
              title="Advanced Filters"
            >
              <i className="bi bi-sliders me-1" />Filters
              {(dateFrom || dateTo || budgetMin || budgetMax || followUpStatus || travelFrom || travelTo) && (
                <span style={{ background: '#e74c3c', color: '#fff', borderRadius: 10, padding: '1px 5px', fontSize: 10, marginLeft: 4, fontWeight: 700 }}>
                  {[dateFrom, dateTo, budgetMin, budgetMax, followUpStatus, travelFrom, travelTo].filter(Boolean).length}
                </span>
              )}
            </button>

            {(dateFrom || dateTo || budgetMin || budgetMax || followUpStatus || filterStage || filterTemp || filterSource || filterAssigned) && (
              <button
                className="btn btn-sm btn-outline-danger"
                onClick={() => {
                  setFilterStage(''); setFilterTemp(''); setFilterSource(''); setFilterAssigned('');
                  setDateFrom(''); setDateTo(''); setBudgetMin(''); setBudgetMax('');
                  setFollowUpStatus(''); setTravelFrom(''); setTravelTo('');
                  setSearch('');
                }}
                title="Clear all filters"
              >
                <i className="bi bi-x-lg" /> Clear All
              </button>
            )}

            <div className="filter-bar-spacer" />
            <span style={{ fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>
              {pagination.total} leads
            </span>
          </div>

          {/* Advanced Filter Panel */}
          {showAdvanced && (
            <div style={{
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
              padding: '16px 20px', marginBottom: 12,
            }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0D3B5E', marginBottom: 12 }}>
                <i className="bi bi-sliders me-2" />Advanced Filters
              </div>
              <div className="row g-3">
                {/* Created Date Range */}
                <div className="col-md-3">
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Created From
                  </label>
                  <input type="date" className="form-control form-control-sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div className="col-md-3">
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Created To
                  </label>
                  <input type="date" className="form-control form-control-sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
                {/* Budget Range */}
                <div className="col-md-3">
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Budget Min (₹)
                  </label>
                  <input type="number" className="form-control form-control-sm" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} placeholder="e.g. 50000" />
                </div>
                <div className="col-md-3">
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Budget Max (₹)
                  </label>
                  <input type="number" className="form-control form-control-sm" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} placeholder="e.g. 500000" />
                </div>
                {/* Follow-up Status */}
                <div className="col-md-3">
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Follow-up Status
                  </label>
                  <select className="form-select form-select-sm" value={followUpStatus} onChange={(e) => setFollowUpStatus(e.target.value)}>
                    <option value="">All</option>
                    <option value="overdue">🔴 Overdue</option>
                    <option value="today">🟡 Due Today</option>
                    <option value="this_week">🟢 This Week</option>
                    <option value="none">⚪ Not Set</option>
                  </select>
                </div>
                {/* Travel Date Range */}
                <div className="col-md-3">
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Travel From
                  </label>
                  <input type="date" className="form-control form-control-sm" value={travelFrom} onChange={(e) => setTravelFrom(e.target.value)} />
                </div>
                <div className="col-md-3">
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Travel To
                  </label>
                  <input type="date" className="form-control form-control-sm" value={travelTo} onChange={(e) => setTravelTo(e.target.value)} />
                </div>
                {/* Quick Filter Chips */}
                <div className="col-md-3 d-flex align-items-end">
                  <div className="d-flex flex-wrap gap-1">
                    {[
                      { label: '🔴 Overdue', action: () => { setFollowUpStatus('overdue'); setFilterStage(''); } },
                      { label: '📅 Today', action: () => setFollowUpStatus('today') },
                      { label: '🔥 Hot', action: () => setFilterTemp('Hot') },
                      { label: '🏆 Converted', action: () => setFilterStage('Converted') },
                    ].map((q) => (
                      <button key={q.label} className="btn btn-sm btn-outline-secondary"
                        style={{ fontSize: 11, padding: '2px 8px' }} onClick={q.action}>
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bulk bar */}
          <BulkBar
            selected={selected} leads={leads} employees={employees}
            onBulkStage={bulkStage} onBulkAssign={bulkAssign}
            onBulkDelete={bulkDelete} onClear={() => setSelected([])}
          />

          {loading ? (
            <div className="loading-overlay"><div className="spinner-border" style={{ color: '#0D3B5E' }} /></div>
          ) : view === 'kanban' ? (
            /* ── Kanban Board ── */
            <div className="kanban-board">
              {KANBAN_STAGES.map((stage) => (
                <KanbanColumn
                  key={stage} stage={stage} leads={byStage(stage)} pipeline={pipeline}
                  onEdit={(l) => { setEditLead(l); setModalShow(true); }}
                  onDelete={handleDelete}
                  onConvert={(l) => setConvertLead(l)}
                  onActivity={(l) => setActivityLead(l)}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                />
              ))}
            </div>
          ) : (
            /* ── Table View ── */
            <div className="s-card">
              <div className="table-wrapper">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}>
                        <input type="checkbox" checked={selected.length === leads.length && leads.length > 0} onChange={toggleAll} />
                      </th>
                      <th style={{ cursor:'pointer' }} onClick={() => handleSort('id')}>Lead #{sortIcon('id')}</th>
                      <th style={{ cursor:'pointer' }} onClick={() => handleSort('client_name')}>Client{sortIcon('client_name')}</th>
                      <th>Phone</th>
                      <th>Destination</th>
                      <th>Pax</th>
                      <th style={{ cursor:'pointer' }} onClick={() => handleSort('budget')}>Budget{sortIcon('budget')}</th>
                      <th>Source</th>
                      <th>Temp</th>
                      <th style={{ cursor:'pointer' }} onClick={() => handleSort('stage')}>Stage{sortIcon('stage')}</th>
                      <th style={{ cursor:'pointer' }} onClick={() => handleSort('follow_up_date')}>Follow-up{sortIcon('follow_up_date')}</th>
                      <th>Travel Date</th>
                      <th>Assigned</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.length === 0 ? (
                      <tr><td colSpan={14}>
                        <div className="empty-state"><i className="bi bi-funnel" /><p>No leads found.</p></div>
                      </td></tr>
                    ) : leads.map((l) => {
                      const overdue = isOverdue(l.follow_up_date) && l.stage !== 'Converted' && l.stage !== 'Lost';
                      const sc = STAGE_CONFIG[l.stage] || {};
                      return (
                        <tr key={l.id} style={overdue ? { background: '#fff9f9' } : selected.includes(l.id) ? { background: '#eef4fb' } : {}}>
                          <td>
                            <input type="checkbox" checked={selected.includes(l.id)} onChange={() => toggleSelect(l.id)} />
                          </td>
                          <td style={{ fontWeight: 700, color: '#0D3B5E', whiteSpace: 'nowrap' }}>
                            {l.lead_no || `L-${l.id}`}
                          </td>
                          <td style={{ fontWeight: 600, maxWidth: 150 }}>
                            <Link to={`/leads/${l.id}`} style={{ color: '#0D3B5E', textDecoration: 'none' }} title="View lead detail">
                              {l.client_name}
                            </Link>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>{l.phone}</td>
                          <td style={{ maxWidth: 120 }}>{l.destination}</td>
                          <td className="text-center">{l.pax}</td>
                          <td style={{ color: '#27ae60', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            {l.budget > 0 ? formatCurrency(l.budget) : '—'}
                          </td>
                          <td>{l.source}</td>
                          <td><span className={getBadge(l.temperature)}>{l.temperature}</span></td>
                          <td>
                            <span style={{ background: sc.bg, color: sc.text, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                              {l.stage}
                            </span>
                          </td>
                          <td style={{ whiteSpace: 'nowrap', color: overdue ? '#e74c3c' : undefined, fontWeight: overdue ? 700 : undefined }}>
                            {overdue && <i className="bi bi-exclamation-circle-fill me-1" />}
                            {formatDate(l.follow_up_date)}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>{formatDate(l.travel_date)}</td>
                          <td>{l.assigned_to || '—'}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <button className="btn-act edit" onClick={() => { setEditLead(l); setModalShow(true); }} title="Edit"><i className="bi bi-pencil" /></button>
                            <button className="btn-act" style={{ background: '#eef4fb', color: '#2980b9', border: '1px solid #bee3f8' }} onClick={() => setActivityLead(l)} title="Activity Log"><i className="bi bi-clock-history" /></button>
                            {l.stage !== 'Converted' && l.stage !== 'Lost' && (
                              <button className="btn-act done" style={{ background: '#e8f8f0', color: '#27ae60', border: '1px solid #27ae60' }} onClick={() => setConvertLead(l)} title="Convert to Booking">
                                <i className="bi bi-check-circle" />
                              </button>
                            )}
                            <button className="btn-act del" onClick={() => handleDelete(l.id, l.client_name)} title="Delete"><i className="bi bi-trash" /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '0 8px' }}>
                <Pagination
                  page={pagination.page}
                  pages={pagination.pages}
                  total={pagination.total}
                  limit={pagination.limit}
                  onPage={(p) => fetchLeads({ page: p })}
                  onLimit={(l) => fetchLeads({ page: 1, limit: l })}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <LeadModal
        show={modalShow}
        onClose={() => { setModalShow(false); setEditLead(null); }}
        onSave={handleSave}
        initial={editLead}
        employees={employees}
      />
      <ConvertModal
        show={!!convertLead} lead={convertLead}
        onClose={() => setConvertLead(null)}
        onConverted={handleConverted}
      />

      {/* Activity Panel */}
      {activityLead && (
        <ActivityPanel
          lead={activityLead}
          onClose={() => setActivityLead(null)}
          onLeadUpdated={(updatedLead) => {
            setActivityLead(updatedLead);
            fetchLeads();
          }}
        />
      )}
    </div>
  );
}

// ── Analytics Panel ───────────────────────────────────────────────────────────
function AnalyticsPanel({ stats, pipeline }) {
  if (!stats) {
    return (
      <div className="loading-overlay"><div className="spinner-border" style={{ color: '#0D3B5E' }} /></div>
    );
  }

  const maxStageCount = Math.max(...(stats.by_stage || []).map((s) => parseInt(s.count)));
  const maxSourceCount = Math.max(...(stats.by_source || []).map((s) => parseInt(s.count)));

  return (
    <div className="row g-3">
      {/* Summary KPIs */}
      <div className="col-12">
        <div className="row g-3">
          {[
            { label: 'Total Leads',      value: stats.total,            icon: 'bi-funnel',         color: '#0D3B5E' },
            { label: 'Pipeline Value',   value: formatCurrencyL(stats.pipeline_value), icon: 'bi-currency-rupee', color: '#27ae60' },
            { label: 'Conversion Rate',  value: `${stats.conversion_rate}%`, icon: 'bi-percent',  color: '#8e44ad' },
            { label: 'Overdue',          value: stats.overdue,          icon: 'bi-exclamation-triangle', color: '#e74c3c' },
            { label: 'This Month',       value: stats.this_month,       icon: 'bi-calendar-month', color: '#2980b9' },
          ].map((k) => (
            <div className="col-6 col-md-4 col-lg" key={k.label}>
              <div className="s-card" style={{ textAlign: 'center', padding: '14px 10px' }}>
                <i className={`bi ${k.icon}`} style={{ fontSize: 22, color: k.color }} />
                <div style={{ fontSize: 22, fontWeight: 800, color: k.color, marginTop: 4 }}>{k.value}</div>
                <div style={{ fontSize: 12, color: '#888' }}>{k.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stage Breakdown */}
      <div className="col-md-6">
        <div className="s-card">
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: '#0D3B5E' }}>
            <i className="bi bi-bar-chart me-2" />Stage Breakdown
          </div>
          {(stats.by_stage || []).map((s) => {
            const cfg = STAGE_CONFIG[s.stage] || {};
            const pct = maxStageCount > 0 ? (parseInt(s.count) / maxStageCount) * 100 : 0;
            return (
              <div key={s.stage} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 13 }}>
                  <span style={{ fontWeight: 600, color: cfg.text || '#555' }}>{s.stage}</span>
                  <span style={{ color: '#888' }}>
                    {s.count} leads · <span style={{ color: '#27ae60', fontWeight: 700 }}>{formatCurrencyL(s.value)}</span>
                  </span>
                </div>
                <div style={{ height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: cfg.badge || '#ccc', borderRadius: 4, transition: 'width 0.5s' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Source Breakdown */}
      <div className="col-md-6">
        <div className="s-card">
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: '#0D3B5E' }}>
            <i className="bi bi-pie-chart me-2" />Lead Sources
          </div>
          {(stats.by_source || []).map((s) => {
            const pct = maxSourceCount > 0 ? (parseInt(s.count) / maxSourceCount) * 100 : 0;
            return (
              <div key={s.source} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                  <span style={{ fontWeight: 600 }}>{s.source}</span>
                  <span style={{ color: '#888' }}>{s.count}</span>
                </div>
                <div style={{ height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: '#2980b9', borderRadius: 4 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Team Performance */}
      <div className="col-md-6">
        <div className="s-card">
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: '#0D3B5E' }}>
            <i className="bi bi-people me-2" />Team Performance
          </div>
          {(stats.by_assigned || []).filter((a) => a.assigned_to).map((a, i) => (
            <div key={a.assigned_to} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: '#0D3B5E15',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: '#0D3B5E', flexShrink: 0,
              }}>
                {a.assigned_to.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{a.assigned_to}</div>
                <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3, marginTop: 3 }}>
                  <div style={{ height: '100%', width: `${(parseInt(a.count) / (stats.by_assigned[0]?.count || 1)) * 100}%`, background: i === 0 ? '#27ae60' : '#2980b9', borderRadius: 3 }} />
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#555', minWidth: 30, textAlign: 'right' }}>{a.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Temperature */}
      <div className="col-md-6">
        <div className="s-card">
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: '#0D3B5E' }}>
            <i className="bi bi-thermometer me-2" />Lead Temperature
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {(stats.by_temperature || []).map((t) => {
              const colors = { Hot: '#e74c3c', Warm: '#f39c12', Cold: '#2980b9' };
              const color = colors[t.temperature] || '#888';
              const pct = stats.total > 0 ? ((parseInt(t.count) / stats.total) * 100).toFixed(1) : 0;
              return (
                <div key={t.temperature} style={{ textAlign: 'center', flex: 1, minWidth: 80 }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color }}>{t.count}</div>
                  <div style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>{t.temperature}</div>
                  <div style={{ fontSize: 11, color }}>{pct}%</div>
                  <div style={{ height: 40, background: `${color}20`, borderRadius: 6, marginTop: 6, display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
                    <div style={{ width: '100%', height: `${pct}%`, background: color, borderRadius: 4 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
