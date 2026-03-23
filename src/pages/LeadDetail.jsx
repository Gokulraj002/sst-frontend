import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../config/apiConfig.js';
import { useToast } from '../context/ToastContext.jsx';
import { formatCurrency, formatCurrencyL, formatDate, timeAgo } from '../utils/formatters.js';
import { LEAD_STAGES, LEAD_SOURCES } from '../utils/constants.js';

// ── Shared CRM constants ───────────────────────────────────────────────────────
const KANBAN_STAGES = [
  'New Enquiry', 'Qualified', 'Proposal Sent', 'Quotation Sent',
  'Follow-Up', 'Negotiation', 'Advance Paid', 'Converted', 'Lost',
];

const STAGE_CONFIG = {
  'New Enquiry':    { bg: '#eef4fb', color: '#2980b9',  icon: 'bi-star-fill' },
  'Qualified':      { bg: '#f5eef8', color: '#8e44ad',  icon: 'bi-patch-check-fill' },
  'Proposal Sent':  { bg: '#fef9e7', color: '#f39c12',  icon: 'bi-send-fill' },
  'Quotation Sent': { bg: '#fff8ee', color: '#e67e22',  icon: 'bi-file-earmark-text-fill' },
  'Follow-Up':      { bg: '#f0f9f4', color: '#27ae60',  icon: 'bi-arrow-repeat' },
  'Negotiation':    { bg: '#fdf2e9', color: '#e67e22',  icon: 'bi-chat-dots-fill' },
  'Advance Paid':   { bg: '#eafaf1', color: '#1e8449',  icon: 'bi-cash-coin' },
  'Converted':      { bg: '#e9f7ef', color: '#1e8449',  icon: 'bi-check-circle-fill' },
  'Lost':           { bg: '#fdf0f0', color: '#e74c3c',  icon: 'bi-x-circle-fill' },
};

const INTERACTION_TYPES = [
  { key: 'Call',     icon: 'bi-telephone-fill',  color: '#27ae60' },
  { key: 'WhatsApp', icon: 'bi-whatsapp',         color: '#25d366' },
  { key: 'Email',    icon: 'bi-envelope-fill',    color: '#8e44ad' },
  { key: 'Meeting',  icon: 'bi-people-fill',      color: '#f39c12' },
  { key: 'Visit',    icon: 'bi-building',         color: '#e67e22' },
  { key: 'Note',     icon: 'bi-sticky-fill',      color: '#2980b9' },
];

const OUTCOME_OPTIONS = {
  Call: [
    'Answered — Interested', 'Answered — Callback Requested', 'Answered — Needs More Info',
    'Answered — Price Issue', 'Answered — Timing Issue', 'Answered — Not Interested',
    'No Answer', 'Busy', 'Switched Off', 'Wrong Number',
  ],
  WhatsApp: [
    'Replied — Interested', 'Replied — Needs Time', 'Replied — Price Negotiation',
    'Replied — Not Interested', 'Delivered — No Reply', 'Read — No Reply',
    'Sent Itinerary', 'Sent Quote',
  ],
  Email: [
    'Replied — Interested', 'Replied — Needs Quote', 'Replied — Not Interested',
    'Opened — No Reply', 'No Reply', 'Bounced',
  ],
  Meeting: [
    'Very Interested — Will Book', 'Confirmed Booking', 'Price Negotiation',
    'Needs More Time', 'Will Decide Later', 'Not Interested',
  ],
  Visit: [
    'Booked', 'Very Interested', 'Needs Follow-up', 'Price Negotiation', 'Not Interested',
  ],
  Note: [],
};

const OUTCOME_COLORS = {
  'Answered — Interested': '#27ae60', 'Answered — Callback Requested': '#f39c12',
  'Answered — Needs More Info': '#2980b9', 'Answered — Price Issue': '#e67e22',
  'Answered — Timing Issue': '#e67e22', 'Answered — Not Interested': '#e74c3c',
  'No Answer': '#aaa', 'Busy': '#aaa', 'Switched Off': '#aaa', 'Wrong Number': '#c0392b',
  'Replied — Interested': '#27ae60', 'Replied — Needs Time': '#f39c12',
  'Replied — Price Negotiation': '#e67e22', 'Replied — Not Interested': '#e74c3c',
  'Delivered — No Reply': '#aaa', 'Read — No Reply': '#aaa',
  'Sent Itinerary': '#2980b9', 'Sent Quote': '#2980b9',
  'Replied — Needs Quote': '#f39c12', 'Opened — No Reply': '#aaa',
  'No Reply': '#aaa', 'Bounced': '#e74c3c',
  'Very Interested — Will Book': '#27ae60', 'Confirmed Booking': '#1e8449',
  'Price Negotiation': '#e67e22', 'Needs More Time': '#f39c12',
  'Will Decide Later': '#f39c12', 'Not Interested': '#e74c3c',
  'Booked': '#1e8449', 'Very Interested': '#27ae60', 'Needs Follow-up': '#f39c12',
};

const ACTION_META = {
  'Call':          { icon: 'bi-telephone-fill',       color: '#27ae60' },
  'Called':        { icon: 'bi-telephone-fill',       color: '#27ae60' },
  'WhatsApp':      { icon: 'bi-whatsapp',             color: '#25d366' },
  'Email':         { icon: 'bi-envelope-fill',        color: '#8e44ad' },
  'Email Sent':    { icon: 'bi-envelope-fill',        color: '#8e44ad' },
  'Meeting':       { icon: 'bi-people-fill',          color: '#f39c12' },
  'Visit':         { icon: 'bi-building',             color: '#e67e22' },
  'Note':          { icon: 'bi-sticky-fill',          color: '#2980b9' },
  'Follow-up':     { icon: 'bi-calendar-check-fill',  color: '#e67e22' },
  'Stage Changed': { icon: 'bi-arrow-right-circle-fill', color: '#0D3B5E' },
  'Created':       { icon: 'bi-plus-circle-fill',     color: '#1e8449' },
  'Converted':     { icon: 'bi-check-circle-fill',    color: '#27ae60' },
};

function isOverdue(d) {
  if (!d) return false;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return new Date(d) < t;
}

// ── Edit Lead Modal (inline) ───────────────────────────────────────────────────
function EditModal({ show, lead, employees, onClose, onSaved }) {
  const { showToast } = useToast();
  const empty = {
    client_name: '', phone: '', destination: '', pax: 1, budget: '',
    source: 'WhatsApp', assigned_to: '', temperature: 'Warm',
    stage: 'New Enquiry', follow_up_date: '', travel_date: '', notes: '',
  };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (lead && show) {
      setForm({
        client_name:    lead.client_name || '',
        phone:          lead.phone || '',
        destination:    lead.destination || '',
        pax:            lead.pax || 1,
        budget:         lead.budget || '',
        source:         lead.source || 'WhatsApp',
        assigned_to:    lead.assigned_to || '',
        temperature:    lead.temperature || 'Warm',
        stage:          lead.stage || 'New Enquiry',
        follow_up_date: lead.follow_up_date ? String(lead.follow_up_date).split('T')[0] : '',
        travel_date:    lead.travel_date    ? String(lead.travel_date).split('T')[0]    : '',
        notes:          lead.notes || '',
      });
    }
  }, [lead, show]);

  if (!show) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.client_name.trim()) { showToast('Client name is required', 'error'); return; }
    setSaving(true);
    try {
      const res = await api.post(`/api/leads/update/${lead.id}`, form);
      showToast('Lead updated', 'success');
      onSaved(res.data.lead);
      onClose();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Save failed', 'error');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header modal-header-custom">
            <h5 className="modal-title">Edit Lead — {lead?.lead_no}</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Client Name *</label>
                <input className="form-control" value={form.client_name} onChange={set('client_name')} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Phone</label>
                <input className="form-control" value={form.phone} onChange={set('phone')} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Pax</label>
                <input type="number" className="form-control" value={form.pax} min={1} onChange={set('pax')} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Destination</label>
                <input className="form-control" value={form.destination} onChange={set('destination')} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Budget (₹)</label>
                <input type="number" className="form-control" value={form.budget} onChange={set('budget')} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Source</label>
                <select className="form-select" value={form.source} onChange={set('source')}>
                  {LEAD_SOURCES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Assigned To</label>
                {employees?.length > 0 ? (
                  <select className="form-select" value={form.assigned_to} onChange={set('assigned_to')}>
                    <option value="">— Unassigned —</option>
                    {employees.map((e) => <option key={e.id} value={e.name}>{e.name}{e.designation ? ` — ${e.designation}` : ''}</option>)}
                  </select>
                ) : (
                  <input className="form-control" value={form.assigned_to} onChange={set('assigned_to')} />
                )}
              </div>
              <div className="col-md-4">
                <label className="form-label">Temperature</label>
                <select className="form-select" value={form.temperature} onChange={set('temperature')}>
                  {['Hot', 'Warm', 'Cold'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Stage</label>
                <select className="form-select" value={form.stage} onChange={set('stage')}>
                  {KANBAN_STAGES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Follow-up Date</label>
                <input type="date" className="form-control" value={form.follow_up_date} onChange={set('follow_up_date')} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Travel Date</label>
                <input type="date" className="form-control" value={form.travel_date} onChange={set('travel_date')} />
              </div>
              <div className="col-12">
                <label className="form-label">Notes</label>
                <textarea className="form-control" rows={3} value={form.notes} onChange={set('notes')} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Update Lead'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Log Interaction Form ───────────────────────────────────────────────────────
function LogInteractionForm({ leadId, onLogged }) {
  const { showToast } = useToast();
  const [type, setType] = useState('Call');
  const [outcome, setOutcome] = useState('');
  const [detail, setDetail] = useState('');
  const [nextFollowUp, setNextFollowUp] = useState('');
  const [durationMins, setDurationMins] = useState('');
  const [stageUpdate, setStageUpdate] = useState('');
  const [tempUpdate, setTempUpdate] = useState('');
  const [showExtra, setShowExtra] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setOutcome(''); }, [type]);

  const outcomeList = OUTCOME_OPTIONS[type] || [];
  const curType = INTERACTION_TYPES.find((t) => t.key === type);
  const canSubmit = outcome || detail.trim();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const payload = {
        action: type,
        detail: detail.trim() || `${type}: ${outcome}`,
        outcome: outcome || null,
        next_follow_up: nextFollowUp || null,
        duration_mins: durationMins ? parseInt(durationMins, 10) : null,
        stage_updated_to: stageUpdate || null,
        temperature: tempUpdate || null,
      };
      const r = await api.post(`/api/leads/activity/${leadId}`, payload);
      onLogged(r.data);
      setDetail(''); setOutcome(''); setNextFollowUp('');
      setDurationMins(''); setStageUpdate(''); setTempUpdate(''); setShowExtra(false);
      showToast('Interaction logged', 'success');
    } catch { showToast('Failed to save', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="s-card" style={{ padding: 20 }}>
      <div className="s-card-title" style={{ marginBottom: 16 }}>
        <i className="bi bi-plus-circle-fill" style={{ color: '#0D3B5E' }} />Log Interaction
      </div>

      {/* Type selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {INTERACTION_TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => setType(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', borderRadius: 24,
              border: `2px solid ${type === t.key ? t.color : '#e0e0e0'}`,
              background: type === t.key ? `${t.color}15` : '#fff',
              color: type === t.key ? t.color : '#888',
              fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <i className={`bi ${t.icon}`} />{t.key}
          </button>
        ))}
      </div>

      {/* Customer response */}
      {outcomeList.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#999', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Customer Response
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {outcomeList.map((o) => {
              const oc = OUTCOME_COLORS[o] || '#888';
              const sel = outcome === o;
              return (
                <button
                  key={o}
                  onClick={() => setOutcome(sel ? '' : o)}
                  style={{
                    padding: '5px 12px', borderRadius: 16,
                    border: `1px solid ${sel ? oc : '#ddd'}`,
                    background: sel ? `${oc}18` : '#fafafa',
                    color: sel ? oc : '#555',
                    fontSize: 12, fontWeight: sel ? 700 : 400, cursor: 'pointer',
                    transition: 'all 0.12s',
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
        className="form-control"
        style={{ marginBottom: 10, fontSize: 13 }}
        placeholder={`Notes for this ${type.toLowerCase()}... (optional if response selected)`}
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
      />

      {/* Extra options */}
      <button
        onClick={() => setShowExtra((v) => !v)}
        style={{ background: 'none', border: 'none', color: '#0D3B5E', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '2px 0', marginBottom: 10 }}
      >
        <i className={`bi bi-chevron-${showExtra ? 'up' : 'down'} me-1`} />
        {showExtra ? 'Less options' : 'More options'} — Stage · Temperature · Follow-up · Duration
      </button>

      {showExtra && (
        <div style={{ background: '#f8f9fa', borderRadius: 10, padding: 14, marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#777', display: 'block', marginBottom: 5 }}>UPDATE STAGE</label>
              <select className="form-select form-select-sm" value={stageUpdate} onChange={(e) => setStageUpdate(e.target.value)}>
                <option value="">— No change —</option>
                {KANBAN_STAGES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#777', display: 'block', marginBottom: 5 }}>UPDATE TEMPERATURE</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[['Hot','#e74c3c'],['Warm','#f39c12'],['Cold','#2980b9']].map(([t, c]) => (
                  <button key={t} onClick={() => setTempUpdate(tempUpdate === t ? '' : t)}
                    style={{
                      flex: 1, padding: '5px 0', borderRadius: 6, border: `1px solid ${tempUpdate === t ? c : '#ddd'}`,
                      fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      background: tempUpdate === t ? c : '#fff',
                      color: tempUpdate === t ? '#fff' : '#666',
                    }}>{t}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#777', display: 'block', marginBottom: 5 }}>NEXT FOLLOW-UP DATE</label>
              <input type="date" className="form-control form-control-sm" value={nextFollowUp}
                onChange={(e) => setNextFollowUp(e.target.value)}
                min={new Date().toISOString().split('T')[0]} />
            </div>
            {(type === 'Call' || type === 'Meeting') && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#777', display: 'block', marginBottom: 5 }}>DURATION (MINS)</label>
                <input type="number" className="form-control form-control-sm" value={durationMins}
                  onChange={(e) => setDurationMins(e.target.value)} placeholder="e.g. 15" min={1} />
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={handleSubmit} disabled={saving || !canSubmit}
        style={{
          padding: '9px 24px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13,
          background: canSubmit ? (curType?.color || '#0D3B5E') : '#e0e0e0',
          color: canSubmit ? '#fff' : '#aaa', cursor: canSubmit ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', gap: 8,
        }}
      >
        {saving
          ? <><span className="spinner-border spinner-border-sm" />Saving...</>
          : <><i className={`bi ${curType?.icon}`} />Log {type}</>
        }
      </button>
    </div>
  );
}

// ── Main LeadDetail Page ───────────────────────────────────────────────────────
export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actLoading, setActLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [filterType, setFilterType] = useState('All');

  const fetchLead = useCallback(async () => {
    try {
      const res = await api.get(`/api/leads/get/${id}`);
      setLead(res.data.lead);
    } catch { showToast('Failed to load lead', 'error'); }
    finally { setLoading(false); }
  }, [id]);

  const fetchActivities = useCallback(async () => {
    setActLoading(true);
    try {
      const res = await api.get(`/api/leads/activity/${id}`);
      setActivities(res.data.activities || []);
    } catch { setActivities([]); }
    finally { setActLoading(false); }
  }, [id]);

  useEffect(() => {
    fetchLead();
    fetchActivities();
    api.get('/api/employees/staff').then((r) => setEmployees(r.data.employees || [])).catch(() => {});
  }, [fetchLead, fetchActivities]);

  const handleLogged = (data) => {
    if (data.activity) setActivities((prev) => [data.activity, ...prev]);
    if (data.lead) setLead(data.lead);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete lead "${lead?.client_name}"? This cannot be undone.`)) return;
    try {
      await api.post(`/api/leads/delete/${id}`);
      showToast('Lead deleted', 'success');
      navigate('/leads');
    } catch { showToast('Delete failed', 'error'); }
  };

  const handleConvert = async () => {
    if (!window.confirm(`Convert "${lead?.client_name}" to a booking?`)) return;
    try {
      const res = await api.post(`/api/leads/convert/${id}`);
      showToast(`Converted to Booking ${res.data.booking_no}`, 'success');
      fetchLead();
      fetchActivities();
    } catch (err) { showToast(err?.response?.data?.error || 'Conversion failed', 'error'); }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div className="spinner-border" style={{ color: '#0D3B5E' }} />
    </div>
  );

  if (!lead) return (
    <div className="empty-state">
      <i className="bi bi-exclamation-circle" />
      <p>Lead not found.</p>
      <Link to="/leads" className="btn btn-primary mt-2">Back to Leads</Link>
    </div>
  );

  const sc = STAGE_CONFIG[lead.stage] || { bg: '#f0f0f0', color: '#888', icon: 'bi-circle' };
  const overdueFU = isOverdue(lead.follow_up_date) && lead.stage !== 'Converted' && lead.stage !== 'Lost';

  // Interaction stats
  const totalInteractions = activities.filter((a) => !['Created', 'Converted'].includes(a.action)).length;
  const byType = INTERACTION_TYPES.reduce((acc, t) => {
    acc[t.key] = activities.filter((a) => a.action === t.key || (t.key === 'Call' && a.action === 'Called')).length;
    return acc;
  }, {});
  const lastContact = activities.find((a) => !['Created', 'Converted', 'Stage Changed'].includes(a.action));

  // Positive outcomes
  const positiveKeywords = ['Interested', 'Will Book', 'Confirmed', 'Booked', 'Advance'];
  const positiveCount = activities.filter((a) => a.outcome && positiveKeywords.some((k) => a.outcome.includes(k))).length;
  const negativeCount = activities.filter((a) => a.outcome && (a.outcome.includes('Not Interested') || a.outcome.includes('Switched Off') || a.outcome.includes('Wrong Number'))).length;

  // Stage journey
  const stageOrder = KANBAN_STAGES;
  const currentStageIdx = stageOrder.indexOf(lead.stage);

  // Filtered activities
  const filteredActs = filterType === 'All'
    ? activities
    : activities.filter((a) => a.action === filterType || (filterType === 'Call' && a.action === 'Called'));

  return (
    <div>
      {/* ── Breadcrumb + Header ── */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#888' }}>
        <Link to="/leads" style={{ color: '#0D3B5E', fontWeight: 600, textDecoration: 'none' }}>
          <i className="bi bi-arrow-left me-1" />Lead Management
        </Link>
        <span>/</span>
        <span style={{ color: '#333' }}>{lead.client_name}</span>
        <span style={{ color: '#bbb' }}>({lead.lead_no})</span>
      </div>

      {/* ── Lead Header Card ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0D3B5E 0%, #1a5276 100%)',
        borderRadius: 14, padding: '24px 28px', color: '#fff', marginBottom: 20,
        boxShadow: '0 4px 20px rgba(13,59,94,0.18)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.3 }}>{lead.client_name}</div>
            <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap', fontSize: 13, opacity: 0.85 }}>
              <span><i className="bi bi-hash me-1" />{lead.lead_no}</span>
              {lead.phone && <span><i className="bi bi-telephone me-1" />{lead.phone}</span>}
              {lead.destination && <span><i className="bi bi-geo-alt me-1" />{lead.destination}</span>}
              {lead.pax > 0 && <span><i className="bi bi-people me-1" />{lead.pax} pax</span>}
            </div>

            {/* Stage + Temp badges */}
            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: sc.bg, color: sc.color,
                padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              }}>
                <i className={`bi ${sc.icon}`} />{lead.stage}
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: lead.temperature === 'Hot' ? '#e74c3c' : lead.temperature === 'Warm' ? '#f39c12' : '#2980b9',
                color: '#fff', padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              }}>
                <i className={`bi ${lead.temperature === 'Hot' ? 'bi-fire' : lead.temperature === 'Warm' ? 'bi-thermometer-half' : 'bi-thermometer-low'}`} />
                {lead.temperature}
              </span>
              {lead.budget > 0 && (
                <span style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                  <i className="bi bi-currency-rupee me-1" />{formatCurrency(lead.budget)}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowEdit(true)}
              style={{ padding: '8px 18px', borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <i className="bi bi-pencil" />Edit
            </button>
            {lead.stage !== 'Converted' && lead.stage !== 'Lost' && (
              <button
                onClick={handleConvert}
                style={{ padding: '8px 18px', borderRadius: 8, background: '#27ae60', border: 'none', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <i className="bi bi-check-circle-fill" />Convert to Booking
              </button>
            )}
            <button
              onClick={handleDelete}
              style={{ padding: '8px 18px', borderRadius: 8, background: 'rgba(231,76,60,0.25)', border: '1px solid rgba(231,76,60,0.5)', color: '#ff9a8b', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <i className="bi bi-trash" />Delete
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>

        {/* ═══ LEFT COLUMN ═══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Lead Info */}
          <div className="s-card" style={{ padding: 20 }}>
            <div className="s-card-title" style={{ marginBottom: 16 }}>
              <i className="bi bi-person-lines-fill" style={{ color: '#0D3B5E' }} />Lead Information
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
              {[
                { label: 'Source', value: lead.source, icon: 'bi-share' },
                { label: 'Assigned To', value: lead.assigned_to || '—', icon: 'bi-person-check' },
                { label: 'Travel Date', value: formatDate(lead.travel_date), icon: 'bi-calendar-event' },
                {
                  label: 'Follow-up Date',
                  value: lead.follow_up_date ? formatDate(lead.follow_up_date) : '—',
                  icon: 'bi-calendar-check',
                  extra: overdueFU ? <span style={{ marginLeft: 6, color: '#e74c3c', fontWeight: 700, fontSize: 11 }}>● Overdue</span> : null,
                },
                { label: 'Created', value: formatDate(lead.created_at), icon: 'bi-clock' },
                { label: 'Budget', value: lead.budget > 0 ? formatCurrency(lead.budget) : '—', icon: 'bi-currency-rupee' },
              ].map((f) => (
                <div key={f.label} style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0', borderRight: '1px solid #f0f0f0' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>
                    <i className={`bi ${f.icon} me-1`} />{f.label}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>
                    {f.value}{f.extra}
                  </div>
                </div>
              ))}
            </div>
            {lead.notes && (
              <div style={{ padding: '14px 16px', borderTop: '1px solid #f0f0f0' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>
                  <i className="bi bi-sticky me-1" />Notes
                </div>
                <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>{lead.notes}</div>
              </div>
            )}
          </div>

          {/* Stage Progress */}
          <div className="s-card" style={{ padding: 20 }}>
            <div className="s-card-title" style={{ marginBottom: 16 }}>
              <i className="bi bi-signpost-split-fill" style={{ color: '#0D3B5E' }} />Lead Journey
            </div>
            <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', paddingBottom: 4, gap: 0 }}>
              {stageOrder.filter(s => s !== 'Lost').map((s, i) => {
                const cfg = STAGE_CONFIG[s] || {};
                const isActive = lead.stage === s;
                const isPast = currentStageIdx > stageOrder.indexOf(s) && lead.stage !== 'Lost';
                const isLost = lead.stage === 'Lost';
                const done = isPast || isActive;
                return (
                  <React.Fragment key={s}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80, flexShrink: 0 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: isLost ? '#fdf0f0' : done ? cfg.color : '#f0f0f0',
                        color: isLost ? '#e74c3c' : done ? '#fff' : '#bbb',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 15, boxShadow: isActive ? `0 0 0 3px ${cfg.color}40` : 'none',
                        transition: 'all 0.2s',
                      }}>
                        <i className={`bi ${cfg.icon || 'bi-circle'}`} />
                      </div>
                      <div style={{
                        fontSize: 10, fontWeight: isActive ? 800 : 500,
                        color: isActive ? cfg.color : '#aaa',
                        marginTop: 5, textAlign: 'center', lineHeight: 1.2,
                        maxWidth: 72,
                      }}>{s}</div>
                    </div>
                    {i < stageOrder.filter(s => s !== 'Lost').length - 1 && (
                      <div style={{ flex: 1, height: 2, background: done && !isActive ? (STAGE_CONFIG[stageOrder[i+1]]?.color || '#0D3B5E') : '#e0e0e0', minWidth: 12, marginBottom: 20 }} />
                    )}
                  </React.Fragment>
                );
              })}
              {lead.stage === 'Lost' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 60, flexShrink: 0, marginLeft: 8 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#e74c3c', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
                    <i className="bi bi-x-circle-fill" />
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#e74c3c', marginTop: 5 }}>Lost</div>
                </div>
              )}
            </div>
          </div>

          {/* Log Interaction Form */}
          <LogInteractionForm leadId={id} onLogged={handleLogged} />

          {/* Timeline */}
          <div className="s-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div className="s-card-title" style={{ margin: 0 }}>
                <i className="bi bi-clock-history" style={{ color: '#0D3B5E' }} />
                Interaction Timeline
                <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 600, color: '#888' }}>({activities.length} entries)</span>
              </div>
              {/* Filter by type */}
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {['All', ...INTERACTION_TYPES.map(t => t.key)].map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    style={{
                      padding: '3px 10px', borderRadius: 12,
                      border: '1px solid #ddd', fontSize: 11, fontWeight: filterType === t ? 700 : 500,
                      background: filterType === t ? '#0D3B5E' : '#fff',
                      color: filterType === t ? '#fff' : '#666',
                      cursor: 'pointer',
                    }}
                  >{t}</button>
                ))}
              </div>
            </div>

            {actLoading ? (
              <div style={{ textAlign: 'center', padding: 30 }}>
                <span className="spinner-border spinner-border-sm" style={{ color: '#0D3B5E' }} />
              </div>
            ) : filteredActs.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#ccc', padding: '40px 0' }}>
                <i className="bi bi-clock-history" style={{ fontSize: 32, display: 'block', marginBottom: 10 }} />
                <div>{filterType === 'All' ? 'No interactions yet — log your first one above.' : `No ${filterType} interactions found.`}</div>
              </div>
            ) : (
              <div>
                {filteredActs.map((a, idx) => {
                  const meta = ACTION_META[a.action] || { icon: 'bi-circle-fill', color: '#aaa' };
                  const oc = a.outcome ? (OUTCOME_COLORS[a.outcome] || '#888') : null;
                  const isLast = idx === filteredActs.length - 1;
                  return (
                    <div key={a.id} style={{ display: 'flex', gap: 14, marginBottom: isLast ? 0 : 20 }}>
                      {/* Icon + line */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: '50%',
                          background: `${meta.color}15`, color: meta.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 16, border: `2px solid ${meta.color}25`, flexShrink: 0,
                        }}>
                          <i className={`bi ${meta.icon}`} />
                        </div>
                        {!isLast && <div style={{ width: 2, flex: 1, background: '#f0f0f0', marginTop: 4, minHeight: 16 }} />}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, paddingBottom: isLast ? 0 : 4 }}>
                        {/* Top row: action + time + duration */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>{a.action}</span>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
                            {a.duration_mins && (
                              <span style={{ fontSize: 11, color: '#aaa', fontWeight: 600 }}>
                                <i className="bi bi-stopwatch me-1" />{a.duration_mins} min
                              </span>
                            )}
                            <span style={{ fontSize: 11, color: '#bbb' }}>{timeAgo(a.created_at)}</span>
                          </div>
                        </div>

                        {/* Outcome badge */}
                        {a.outcome && (
                          <div style={{ marginTop: 5 }}>
                            <span style={{
                              display: 'inline-block', padding: '3px 12px', borderRadius: 20,
                              background: `${oc}15`, color: oc,
                              fontSize: 12, fontWeight: 700, border: `1px solid ${oc}35`,
                            }}>
                              {a.outcome}
                            </span>
                          </div>
                        )}

                        {/* Detail note */}
                        {a.detail && a.detail !== `${a.action}: ${a.outcome}` && (
                          <div style={{
                            fontSize: 13, color: '#555', marginTop: 6, lineHeight: 1.55,
                            background: '#f8f9fa', borderRadius: 7, padding: '8px 12px',
                            borderLeft: `3px solid ${meta.color}40`,
                          }}>{a.detail}</div>
                        )}

                        {/* Stage / follow-up changes */}
                        <div style={{ display: 'flex', gap: 14, marginTop: 6, flexWrap: 'wrap' }}>
                          {a.stage_updated_to && (
                            <span style={{ fontSize: 11, color: '#0D3B5E', fontWeight: 700 }}>
                              <i className="bi bi-arrow-right-circle-fill me-1" />Stage → {a.stage_updated_to}
                            </span>
                          )}
                          {a.next_follow_up && (
                            <span style={{ fontSize: 11, color: '#27ae60', fontWeight: 700 }}>
                              <i className="bi bi-calendar-check-fill me-1" />Follow-up: {formatDate(a.next_follow_up)}
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: 11, color: '#bbb', marginTop: 5 }}>
                          <i className="bi bi-person me-1" />{a.done_by}
                          <span style={{ marginLeft: 8, color: '#e0e0e0' }}>·</span>
                          <span style={{ marginLeft: 8 }}>{new Date(a.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ═══ RIGHT SIDEBAR ═══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Quick stats */}
          <div className="s-card" style={{ padding: 16 }}>
            <div className="s-card-title" style={{ marginBottom: 14 }}>
              <i className="bi bi-bar-chart-fill" style={{ color: '#0D3B5E' }} />Interaction Summary
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {[
                { label: 'Total', value: totalInteractions, icon: 'bi-chat-dots-fill', color: '#0D3B5E' },
                { label: 'Positive', value: positiveCount, icon: 'bi-hand-thumbs-up-fill', color: '#27ae60' },
                { label: 'No Response', value: activities.filter(a => a.outcome && ['No Answer','Busy','Switched Off','No Reply','Delivered — No Reply','Read — No Reply'].includes(a.outcome)).length, icon: 'bi-telephone-x-fill', color: '#aaa' },
                { label: 'Negative', value: negativeCount, icon: 'bi-hand-thumbs-down-fill', color: '#e74c3c' },
              ].map((s) => (
                <div key={s.label} style={{ background: `${s.color}10`, borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
            {/* By type breakdown */}
            {INTERACTION_TYPES.map(({ key, icon, color }) => {
              const cnt = byType[key] || 0;
              if (cnt === 0) return null;
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
                    <i className={`bi ${icon}`} />
                  </div>
                  <span style={{ fontSize: 13, color: '#555', flex: 1 }}>{key}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color }}>{cnt}</span>
                </div>
              );
            })}
            {totalInteractions === 0 && (
              <div style={{ textAlign: 'center', color: '#ccc', fontSize: 12, padding: '10px 0' }}>No interactions logged yet</div>
            )}
          </div>

          {/* Follow-up card */}
          <div className="s-card" style={{ padding: 16, background: overdueFU ? '#fff8f8' : lead.follow_up_date ? '#f8fffe' : '#fafafa' }}>
            <div className="s-card-title" style={{ marginBottom: 10, color: overdueFU ? '#e74c3c' : '#0D3B5E' }}>
              <i className={`bi ${overdueFU ? 'bi-exclamation-triangle-fill' : 'bi-calendar-check-fill'}`} style={{ color: overdueFU ? '#e74c3c' : '#27ae60' }} />
              {overdueFU ? 'Overdue Follow-up' : 'Next Follow-up'}
            </div>
            {lead.follow_up_date ? (
              <>
                <div style={{ fontSize: 20, fontWeight: 800, color: overdueFU ? '#e74c3c' : '#27ae60' }}>
                  {formatDate(lead.follow_up_date)}
                </div>
                {overdueFU && <div style={{ fontSize: 12, color: '#e74c3c', marginTop: 4 }}>Action required — overdue</div>}
              </>
            ) : (
              <div style={{ fontSize: 12, color: '#aaa' }}>No follow-up scheduled. Set one when logging an interaction.</div>
            )}
          </div>

          {/* Last contact */}
          {lastContact && (
            <div className="s-card" style={{ padding: 16 }}>
              <div className="s-card-title" style={{ marginBottom: 10 }}>
                <i className="bi bi-clock-fill" style={{ color: '#0D3B5E' }} />Last Contact
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: `${ACTION_META[lastContact.action]?.color || '#888'}15`,
                  color: ACTION_META[lastContact.action]?.color || '#888',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0,
                }}>
                  <i className={`bi ${ACTION_META[lastContact.action]?.icon || 'bi-chat'}`} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>{lastContact.action}</div>
                  {lastContact.outcome && (
                    <div style={{ fontSize: 11, marginTop: 3, color: OUTCOME_COLORS[lastContact.outcome] || '#888', fontWeight: 600 }}>
                      {lastContact.outcome}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#bbb', marginTop: 3 }}>{timeAgo(lastContact.created_at)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Lead meta */}
          <div className="s-card" style={{ padding: 16 }}>
            <div className="s-card-title" style={{ marginBottom: 12 }}>
              <i className="bi bi-info-circle-fill" style={{ color: '#0D3B5E' }} />Lead Details
            </div>
            {[
              { label: 'Lead #', value: lead.lead_no },
              { label: 'Source', value: lead.source },
              { label: 'Assigned', value: lead.assigned_to || 'Unassigned' },
              { label: 'Travel Date', value: formatDate(lead.travel_date) },
              { label: 'Pax', value: `${lead.pax} person${lead.pax > 1 ? 's' : ''}` },
              { label: 'Budget', value: lead.budget > 0 ? formatCurrency(lead.budget) : '—' },
              { label: 'Created', value: formatDate(lead.created_at) },
            ].map((f) => (
              <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f5f5f5', fontSize: 12 }}>
                <span style={{ color: '#999', fontWeight: 600 }}>{f.label}</span>
                <span style={{ color: '#333', fontWeight: 600, textAlign: 'right', maxWidth: 160 }}>{f.value}</span>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Edit Modal */}
      <EditModal
        show={showEdit}
        lead={lead}
        employees={employees}
        onClose={() => setShowEdit(false)}
        onSaved={(updated) => { setLead(updated); fetchActivities(); }}
      />
    </div>
  );
}
