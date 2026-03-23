import React, { useState, useEffect, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import api from '../config/apiConfig.js';
import { formatCurrency, formatCurrencyL, formatDate, getStatusBadgeClass } from '../utils/formatters.js';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
);

function KPICard({ label, value, icon, variant = '', trend = null, trendLabel = '' }) {
  return (
    <div className={`kpi-card ${variant}`}>
      <div className="d-flex justify-content-between align-items-start">
        <div>
          <div className="kpi-label">{label}</div>
          <div className="kpi-value">{value}</div>
          {trend !== null && (
            <div className={`kpi-trend ${trend >= 0 ? 'positive' : 'negative'}`}>
              <i className={`bi bi-arrow-${trend >= 0 ? 'up' : 'down'}`} />
              {trendLabel}
            </div>
          )}
        </div>
        <div
          style={{
            width: 44, height: 44, borderRadius: '10px',
            background: 'rgba(13,59,94,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <i className={`bi ${icon}`} style={{ fontSize: '20px', color: '#0D3B5E' }} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      let res;
      try {
        res = await api.get('/api/dashboard/stats');
      } catch {
        res = await api.get('/api/dashboard');
      }
      setData(res.data);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner-border" style={{ color: '#0D3B5E' }} role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="empty-state">
        <i className="bi bi-exclamation-circle" />
        <p>Failed to load dashboard data. Please ensure the backend server is running.</p>
      </div>
    );
  }

  const { kpis = {}, chart_data = {}, upcoming_bookings = [], pending_tasks = [], leads = [] } = data;

  // Revenue Chart
  const revenueChartData = {
    labels: chart_data.revenue?.labels || [],
    datasets: [
      {
        label: 'Domestic (₹L)',
        data: chart_data.revenue?.domestic || [],
        backgroundColor: 'rgba(13,59,94,0.8)',
        borderRadius: 4,
      },
      {
        label: 'International (₹L)',
        data: chart_data.revenue?.international || [],
        backgroundColor: 'rgba(245,166,35,0.85)',
        borderRadius: 4,
      },
    ],
  };

  const revenueChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      y: { grid: { color: '#f0f0f0' }, ticks: { font: { size: 11 }, callback: (v) => `₹${v}L` } },
    },
  };

  // Lead Sources Doughnut
  const sourceColors = ['#0D3B5E','#f5a623','#27ae60','#e74c3c','#8e44ad','#2980b9','#e67e22','#1abc9c'];
  const leadSourceData = {
    labels: chart_data.lead_sources?.labels || [],
    datasets: [{
      data: chart_data.lead_sources?.data || [],
      backgroundColor: sourceColors,
      borderWidth: 2,
      borderColor: '#fff',
    }],
  };

  // Finance Trend Line
  const financeData = {
    labels: chart_data.finance?.labels || [],
    datasets: [
      {
        label: 'Revenue (₹L)',
        data: chart_data.finance?.revenue || [],
        borderColor: '#0D3B5E',
        backgroundColor: 'rgba(13,59,94,0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
      },
      {
        label: 'Collections (₹L)',
        data: chart_data.finance?.collection || [],
        borderColor: '#27ae60',
        backgroundColor: 'rgba(39,174,96,0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
      },
    ],
  };

  const hotLeads = leads.filter((l) => l.temperature === 'Hot').slice(0, 5);

  return (
    <div>
      {/* Section Header with Refresh */}
      <div className="section-header">
        <h1 className="section-title">
          <i className="bi bi-speedometer2 me-2" style={{ color: '#f5a623' }} />Dashboard
        </h1>
        <button className="btn-act done" onClick={() => fetchData(true)} disabled={refreshing}>
          {refreshing
            ? <><span className="spinner-border spinner-border-sm me-1" />Refreshing...</>
            : <><i className="bi bi-arrow-clockwise" /> Refresh</>}
        </button>
      </div>

      {/* KPI Row */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-4 col-lg-2">
          <KPICard label="Total Revenue" value={formatCurrencyL(kpis.total_revenue || kpis.revenue)} icon="bi-cash-stack" variant="success" />
        </div>
        <div className="col-6 col-md-4 col-lg-2">
          <KPICard label="Active Leads" value={kpis.leads_count || kpis.active_leads || 0} icon="bi-funnel" variant="info" />
        </div>
        <div className="col-6 col-md-4 col-lg-2">
          <KPICard label="Bookings This Month" value={kpis.bookings_count || kpis.bookings_this_month || 0} icon="bi-calendar-check" trend={kpis.booking_trend} trendLabel={`${Math.abs(kpis.booking_trend || 0)} vs last month`} />
        </div>
        <div className="col-6 col-md-4 col-lg-2">
          <KPICard label="Due Tasks" value={kpis.due_tasks || kpis.pending_tasks || 0} icon="bi-check2-square" variant="warning" />
        </div>
        <div className="col-6 col-md-4 col-lg-2">
          <KPICard label="Pending Invoices" value={kpis.pending_invoices || 0} icon="bi-receipt" variant="danger" />
        </div>
        <div className="col-6 col-md-4 col-lg-2">
          <KPICard label="Unread Notifications" value={kpis.unread_notifications || kpis.notifications || 0} icon="bi-bell" variant="purple" />
        </div>
      </div>

      {/* Charts Row */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-lg-7">
          <div className="s-card">
            <div className="s-card-title">
              <i className="bi bi-bar-chart-line" />
              FY 2025–26 Revenue (Domestic vs International)
            </div>
            <div className="chart-container">
              <Bar data={revenueChartData} options={revenueChartOptions} />
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-5">
          <div className="s-card">
            <div className="s-card-title">
              <i className="bi bi-pie-chart" />
              Lead Sources
            </div>
            <div className="chart-container">
              <Doughnut
                data={leadSourceData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right',
                      labels: { font: { size: 11 }, boxWidth: 14 },
                    },
                  },
                  cutout: '60%',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Finance Trend + Hot Leads */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-lg-7">
          <div className="s-card">
            <div className="s-card-title">
              <i className="bi bi-graph-up" />
              Revenue vs Collections (Last 6 Months)
            </div>
            <div className="chart-container">
              <Line
                data={financeData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } },
                  scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                    y: { grid: { color: '#f0f0f0' }, ticks: { font: { size: 11 }, callback: (v) => `₹${v}L` } },
                  },
                }}
              />
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-5">
          <div className="s-card">
            <div className="s-card-title">
              <i className="bi bi-lightning-charge" />
              Hot Leads
            </div>
            {hotLeads.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px' }}>
                <p>No hot leads at the moment.</p>
              </div>
            ) : (
              <div>
                {hotLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="d-flex align-items-start gap-2 mb-3 pb-3"
                    style={{ borderBottom: '1px solid #f0f0f0' }}
                  >
                    <div
                      style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: '#ffe0e0', color: '#e74c3c',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '13px', flexShrink: 0,
                      }}
                    >
                      {lead.client_name?.[0] || 'L'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#0D3B5E' }}>
                        {lead.client_name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#666' }}>
                        {lead.destination} &bull; {lead.pax} pax
                      </div>
                      <div style={{ fontSize: '11px', color: '#27ae60', fontWeight: 700 }}>
                        {formatCurrency(lead.budget)}
                      </div>
                    </div>
                    <span className="badge-hot">{lead.temperature}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Bookings + Pending Tasks */}
      <div className="row g-3">
        <div className="col-12 col-lg-7">
          <div className="s-card">
            <div className="s-card-title">
              <i className="bi bi-calendar3" />
              Upcoming Departures (Next 14 Days)
            </div>
            {upcoming_bookings.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px' }}>
                <p>No upcoming departures in the next 14 days.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Booking</th>
                      <th>Client</th>
                      <th>Destination</th>
                      <th>Depart</th>
                      <th>Pax</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcoming_bookings.map((b) => (
                      <tr key={b.id}>
                        <td style={{ fontWeight: 700, color: '#0D3B5E' }}>{b.booking_no}</td>
                        <td>{b.client}</td>
                        <td>{b.destination}</td>
                        <td>{formatDate(b.depart_date)}</td>
                        <td>{b.pax}</td>
                        <td><span className={getStatusBadgeClass(b.status)}>{b.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="col-12 col-lg-5">
          <div className="s-card">
            <div className="s-card-title">
              <i className="bi bi-check2-square" />
              Pending Tasks
            </div>
            {pending_tasks.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px' }}>
                <p>All tasks are completed!</p>
              </div>
            ) : (
              <div>
                {pending_tasks.map((task) => (
                  <div
                    key={task.id}
                    className="d-flex align-items-start gap-2 mb-3 pb-3"
                    style={{ borderBottom: '1px solid #f0f0f0' }}
                  >
                    <div
                      style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        marginTop: '6px',
                        background: task.priority === 'High' ? '#e74c3c' : task.priority === 'Medium' ? '#f5a623' : '#27ae60',
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#2c3e50', marginBottom: '2px' }}>
                        {task.task}
                      </div>
                      <div style={{ fontSize: '11px', color: '#888' }}>
                        {task.assigned_to} &bull; Due: {formatDate(task.due_date)}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px',
                        background: task.status === 'In Progress' ? '#e7f3ff' : '#fff3cd',
                        color: task.status === 'In Progress' ? '#2980b9' : '#856404',
                      }}
                    >
                      {task.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
