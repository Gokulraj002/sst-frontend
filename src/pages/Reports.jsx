import React, { useState, useEffect, useCallback } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import api from '../config/apiConfig.js';
import { useToast } from '../context/ToastContext.jsx';
import { formatCurrency, formatCurrencyL, getStatusBadgeClass } from '../utils/formatters.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler);

export default function Reports() {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('revenue');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/reports/summary');
      setData(res.data);
    } catch { showToast('Failed to load reports', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="loading-overlay"><div className="spinner-border" style={{ color: '#0D3B5E' }} /></div>;
  if (!data) return <div className="empty-state"><i className="bi bi-bar-chart" /><p>No report data available.</p></div>;

  const chartColors = ['#0D3B5E', '#f5a623', '#27ae60', '#e74c3c', '#8e44ad', '#2980b9', '#e67e22', '#1abc9c'];

  const revenueChartData = {
    labels: data.chart_data?.revenue?.labels || [],
    datasets: [
      {
        label: 'Domestic (₹L)',
        data: data.chart_data?.revenue?.domestic || [],
        backgroundColor: 'rgba(13,59,94,0.8)',
        borderRadius: 4,
      },
      {
        label: 'International (₹L)',
        data: data.chart_data?.revenue?.international || [],
        backgroundColor: 'rgba(245,166,35,0.85)',
        borderRadius: 4,
      },
    ],
  };

  const leadSourceData = {
    labels: data.chart_data?.lead_sources?.labels || [],
    datasets: [{
      data: data.chart_data?.lead_sources?.data || [],
      backgroundColor: chartColors,
      borderWidth: 2,
      borderColor: '#fff',
    }],
  };

  const destData = {
    labels: data.chart_data?.top_destinations?.labels || [],
    datasets: [{
      label: 'Bookings',
      data: data.chart_data?.top_destinations?.data || [],
      backgroundColor: 'rgba(13,59,94,0.8)',
      borderRadius: 4,
    }],
  };

  const financeData = {
    labels: data.chart_data?.finance?.labels || [],
    datasets: [
      {
        label: 'Revenue (₹L)',
        data: data.chart_data?.finance?.revenue || [],
        borderColor: '#0D3B5E',
        backgroundColor: 'rgba(13,59,94,0.08)',
        fill: true, tension: 0.4, pointRadius: 4,
      },
      {
        label: 'Collections (₹L)',
        data: data.chart_data?.finance?.collection || [],
        borderColor: '#27ae60',
        backgroundColor: 'rgba(39,174,96,0.08)',
        fill: true, tension: 0.4, pointRadius: 4,
      },
    ],
  };

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      y: { grid: { color: '#f0f0f0' }, ticks: { font: { size: 11 } } },
    },
  };

  const pipeline = data.chart_data?.pipeline || {};
  const pipelineEntries = Object.entries(pipeline);

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title"><i className="bi bi-bar-chart-line me-2" style={{ color: '#f5a623' }} />Reports & MIS</h1>
        <button className="btn-act done" onClick={fetchData} disabled={loading}>
          <i className="bi bi-arrow-clockwise" /> Refresh
        </button>
      </div>

      <div className="row g-3 mb-4">
        {[
          { label: 'Total Revenue', value: formatCurrencyL(data.kpis?.total_revenue), cls: 'success' },
          { label: 'Total Bookings', value: data.kpis?.bookings_count || 0, cls: '' },
          { label: 'Active Leads', value: data.kpis?.leads_count || 0, cls: 'info' },
          { label: 'Pending Payments', value: formatCurrencyL(data.kpis?.pending_payments), cls: 'danger' },
          { label: 'Total Pax', value: data.kpis?.total_pax || 0, cls: 'accent' },
        ].map((k) => (
          <div className="col-6 col-md-4 col-lg" key={k.label}>
            <div className={`kpi-card ${k.cls}`}>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value">{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="tab-buttons mb-3">
        {[
          { key: 'revenue', label: 'Revenue', icon: 'bi-bar-chart' },
          { key: 'leads', label: 'Lead Sources', icon: 'bi-pie-chart' },
          { key: 'destinations', label: 'Top Destinations', icon: 'bi-geo-alt' },
          { key: 'finance', label: 'Finance Trend', icon: 'bi-graph-up' },
          { key: 'pipeline', label: 'Sales Pipeline', icon: 'bi-funnel' },
        ].map((t) => (
          <button key={t.key} className={`tab-btn ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
            <i className={`bi ${t.icon} me-1`} />{t.label}
          </button>
        ))}
      </div>

      <div className="s-card">
        {activeTab === 'revenue' && (
          <>
            <div className="s-card-title"><i className="bi bi-bar-chart" />FY 2025–26 Revenue by Tour Type</div>
            <div className="chart-container" style={{ height: 350 }}>
              <Bar data={revenueChartData} options={{ ...commonOptions, scales: { ...commonOptions.scales, y: { ...commonOptions.scales.y, ticks: { ...commonOptions.scales.y.ticks, callback: (v) => `₹${v}L` } } } }} />
            </div>
          </>
        )}
        {activeTab === 'leads' && (
          <>
            <div className="s-card-title"><i className="bi bi-pie-chart" />Lead Source Distribution</div>
            <div style={{ maxWidth: 500, margin: '0 auto' }}>
              <div className="chart-container" style={{ height: 350 }}>
                <Doughnut data={leadSourceData} options={{ responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { position: 'right', labels: { font: { size: 12 }, boxWidth: 14 } } } }} />
              </div>
            </div>
          </>
        )}
        {activeTab === 'destinations' && (
          <>
            <div className="s-card-title"><i className="bi bi-geo-alt" />Top Booking Destinations</div>
            <div className="chart-container" style={{ height: 350 }}>
              <Bar data={destData} options={{ ...commonOptions, indexAxis: 'y', plugins: { legend: { display: false } } }} />
            </div>
          </>
        )}
        {activeTab === 'finance' && (
          <>
            <div className="s-card-title"><i className="bi bi-graph-up" />Revenue vs Collections (Last 6 Months)</div>
            <div className="chart-container" style={{ height: 350 }}>
              <Line data={financeData} options={{ ...commonOptions, scales: { ...commonOptions.scales, y: { ...commonOptions.scales.y, ticks: { ...commonOptions.scales.y.ticks, callback: (v) => `₹${v}L` } } } }} />
            </div>
          </>
        )}
        {activeTab === 'pipeline' && (
          <>
            <div className="s-card-title"><i className="bi bi-funnel" />Sales Pipeline (Lead Stages)</div>
            <div className="row g-3 mt-1">
              {pipelineEntries.length === 0 ? (
                <div className="col-12"><div className="empty-state"><p>No pipeline data.</p></div></div>
              ) : pipelineEntries.map(([stage, count]) => (
                <div className="col-md-4 col-lg-3" key={stage}>
                  <div style={{
                    background: '#f8f9fa', borderRadius: 10, padding: '16px',
                    borderLeft: '4px solid #0D3B5E',
                  }}>
                    <div style={{ fontWeight: 700, fontSize: '22px', color: '#0D3B5E' }}>{count}</div>
                    <div style={{ fontSize: '12px', color: '#666', fontWeight: 600 }}>{stage}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Data Tables */}
      <div className="row g-3 mt-1">
        {/* Monthly Revenue Table */}
        {data.tables?.monthly_revenue && data.tables.monthly_revenue.length > 0 && (
          <div className="col-12 col-lg-6">
            <div className="s-card">
              <div className="s-card-title"><i className="bi bi-table" />Monthly Revenue Summary</div>
              <div className="table-wrapper">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Bookings</th>
                      <th>Revenue (₹)</th>
                      <th>Collections (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tables.monthly_revenue.map((row, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{row.month}</td>
                        <td>{row.bookings}</td>
                        <td style={{ color: '#27ae60', fontWeight: 700 }}>{formatCurrency(row.revenue)}</td>
                        <td style={{ color: '#2980b9', fontWeight: 700 }}>{formatCurrency(row.collections)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Top Destinations Table */}
        {data.tables?.top_destinations && data.tables.top_destinations.length > 0 && (
          <div className="col-12 col-lg-6">
            <div className="s-card">
              <div className="s-card-title"><i className="bi bi-geo-alt" />Top Destinations</div>
              <div className="table-wrapper">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Destination</th>
                      <th>Bookings</th>
                      <th>Revenue (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tables.top_destinations.map((row, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700, color: '#0D3B5E' }}>{i + 1}</td>
                        <td style={{ fontWeight: 600 }}>{row.destination}</td>
                        <td>{row.bookings}</td>
                        <td style={{ color: '#27ae60', fontWeight: 700 }}>{formatCurrency(row.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Lead Pipeline Table */}
        {data.tables?.lead_pipeline && data.tables.lead_pipeline.length > 0 && (
          <div className="col-12 col-lg-6">
            <div className="s-card">
              <div className="s-card-title"><i className="bi bi-funnel" />Lead Pipeline Summary</div>
              <div className="table-wrapper">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Stage</th>
                      <th>Count</th>
                      <th>Value (₹)</th>
                      <th>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tables.lead_pipeline.map((row, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{row.stage}</td>
                        <td>{row.count}</td>
                        <td style={{ color: '#27ae60', fontWeight: 700 }}>{formatCurrency(row.value)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ flex: 1, background: '#f0f0f0', borderRadius: 3, height: 6 }}>
                              <div style={{ width: `${row.pct || 0}%`, background: '#0D3B5E', height: '100%', borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700 }}>{row.pct || 0}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Recent Bookings Table */}
        {data.tables?.recent_bookings && data.tables.recent_bookings.length > 0 && (
          <div className="col-12 col-lg-6">
            <div className="s-card">
              <div className="s-card-title"><i className="bi bi-calendar3" />Recent Bookings</div>
              <div className="table-wrapper">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Booking</th>
                      <th>Client</th>
                      <th>Destination</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tables.recent_bookings.map((row, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700, color: '#0D3B5E' }}>{row.booking_no || row.id}</td>
                        <td>{row.client || row.client_name}</td>
                        <td>{row.destination}</td>
                        <td style={{ color: '#27ae60', fontWeight: 700 }}>{formatCurrency(row.amount || row.package_amount)}</td>
                        <td><span className={getStatusBadgeClass(row.status)}>{row.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
