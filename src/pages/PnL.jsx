import React, { useState, useEffect } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import api from '../config/apiConfig.js';
import { useToast } from '../context/ToastContext.jsx';
import { formatCurrency, formatCurrencyL } from '../utils/formatters.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

export default function PnL() {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/api/pnl/summary');
        setData(res.data);
      } catch { showToast('Failed to load P&L data', 'error'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return <div className="loading-overlay"><div className="spinner-border" style={{ color: '#0D3B5E' }} /></div>;
  if (!data) return <div className="empty-state"><i className="bi bi-graph-up-arrow" /><p>No P&L data available.</p></div>;

  const { revenue = 0, payables = 0, expenses = 0, profit = 0, pending = 0 } = data;
  const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0;

  const pnlBar = {
    labels: ['Revenue', 'Payables', 'Expenses', 'Net Profit'],
    datasets: [{
      label: 'Amount (₹L)',
      data: [
        (revenue / 100000).toFixed(2),
        (payables / 100000).toFixed(2),
        (expenses / 100000).toFixed(2),
        (profit / 100000).toFixed(2),
      ],
      backgroundColor: ['rgba(13,59,94,0.85)', 'rgba(231,76,60,0.85)', 'rgba(245,166,35,0.85)', 'rgba(39,174,96,0.85)'],
      borderRadius: 6,
    }],
  };

  const monthly = data.monthly || [];
  const financeChart = {
    labels: monthly.map((m) => m.month),
    datasets: [
      {
        label: 'Revenue (₹L)',
        data: monthly.map((m) => m.revenue),
        borderColor: '#0D3B5E',
        backgroundColor: 'rgba(13,59,94,0.08)',
        fill: true, tension: 0.4, pointRadius: 4,
      },
      {
        label: 'Expenses (₹L)',
        data: monthly.map((m) => m.expenses),
        borderColor: '#e74c3c',
        backgroundColor: 'rgba(231,76,60,0.08)',
        fill: true, tension: 0.4, pointRadius: 4,
      },
      {
        label: 'Profit (₹L)',
        data: monthly.map((m) => m.profit),
        borderColor: '#27ae60',
        backgroundColor: 'rgba(39,174,96,0.08)',
        fill: true, tension: 0.4, pointRadius: 4,
      },
    ],
  };

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">P&L Statement</h1>
        <div style={{ fontSize: '13px', color: '#888' }}>Profit Margin: <strong style={{ color: margin > 20 ? '#27ae60' : '#f5a623' }}>{margin}%</strong></div>
      </div>

      <div className="row g-3 mb-4">
        {[
          { label: 'Total Revenue', value: formatCurrencyL(revenue), cls: 'success', icon: 'bi-cash-stack' },
          { label: 'Vendor Payables', value: formatCurrencyL(payables), cls: 'danger', icon: 'bi-credit-card' },
          { label: 'Expenses', value: formatCurrencyL(expenses), cls: 'warning', icon: 'bi-receipt' },
          { label: 'Net Profit', value: formatCurrencyL(profit), cls: profit > 0 ? 'success' : 'danger', icon: 'bi-graph-up-arrow' },
          { label: 'Pending Receivables', value: formatCurrencyL(pending), cls: 'info', icon: 'bi-hourglass-split' },
        ].map((k) => (
          <div className="col-6 col-md-4 col-lg" key={k.label}>
            <div className={`kpi-card ${k.cls}`}>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <div className="kpi-label">{k.label}</div>
                  <div className="kpi-value">{k.value}</div>
                </div>
                <i className={`bi ${k.icon}`} style={{ fontSize: '22px', color: '#0D3B5E', opacity: 0.5 }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-3 mb-4">
        <div className="col-12 col-lg-5">
          <div className="s-card">
            <div className="s-card-title"><i className="bi bi-bar-chart" />P&L Overview</div>
            <div className="chart-container" style={{ height: 280 }}>
              <Bar
                data={pnlBar}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                    y: { grid: { color: '#f0f0f0' }, ticks: { font: { size: 11 }, callback: (v) => `₹${v}L` } },
                  },
                }}
              />
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-7">
          <div className="s-card">
            <div className="s-card-title"><i className="bi bi-graph-up" />Monthly Revenue, Expenses & Profit (₹L)</div>
            <div className="chart-container" style={{ height: 280 }}>
              <Line
                data={financeChart}
                options={{
                  responsive: true, maintainAspectRatio: false,
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
      </div>

      {/* Monthly Breakdown Table */}
      {monthly.length > 0 && (
        <div className="s-card mb-3">
          <div className="s-card-title"><i className="bi bi-calendar3" />Monthly Breakdown (Last 6 Months)</div>
          <div className="table-wrapper">
            <table className="erp-table">
              <thead>
                <tr><th>Month</th><th>Revenue (₹)</th><th>Expenses (₹)</th><th>Profit (₹)</th><th>Margin</th></tr>
              </thead>
              <tbody>
                {monthly.map((m) => {
                  const rev = m.revenue * 100000;
                  const exp = m.expenses * 100000;
                  const prof = m.profit * 100000;
                  const mg = rev > 0 ? ((prof / rev) * 100).toFixed(1) : 0;
                  return (
                    <tr key={m.month}>
                      <td style={{ fontWeight: 700 }}>{m.month}</td>
                      <td style={{ color: '#27ae60', fontWeight: 600 }}>{formatCurrency(rev)}</td>
                      <td style={{ color: '#e74c3c', fontWeight: 600 }}>{formatCurrency(exp)}</td>
                      <td style={{ color: prof >= 0 ? '#27ae60' : '#e74c3c', fontWeight: 700 }}>{formatCurrency(prof)}</td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                          background: mg >= 15 ? '#d4edda' : mg >= 5 ? '#fff3cd' : '#f8d7da',
                          color: mg >= 15 ? '#27ae60' : mg >= 5 ? '#856404' : '#e74c3c',
                        }}>
                          {mg}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* P&L Summary Table */}
      <div className="s-card">
        <div className="s-card-title"><i className="bi bi-table" />P&L Summary</div>
        <div className="table-wrapper">
          <table className="erp-table">
            <thead>
              <tr><th>Category</th><th>Description</th><th>Amount</th><th>% of Revenue</th></tr>
            </thead>
            <tbody>
              <tr style={{ background: '#d4edda20' }}>
                <td style={{ fontWeight: 700, color: '#27ae60' }}>Revenue</td>
                <td>Total Booking Revenue</td>
                <td style={{ fontWeight: 700, color: '#27ae60' }}>{formatCurrency(revenue)}</td>
                <td style={{ fontWeight: 700, color: '#27ae60' }}>100%</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700, color: '#e74c3c' }}>Payables</td>
                <td>Vendor Payments (Paid)</td>
                <td style={{ fontWeight: 700, color: '#e74c3c' }}>{formatCurrency(payables)}</td>
                <td style={{ color: '#e74c3c' }}>{revenue > 0 ? ((payables / revenue) * 100).toFixed(1) : 0}%</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700, color: '#e67e22' }}>Expenses</td>
                <td>Approved Operational Expenses</td>
                <td style={{ fontWeight: 700, color: '#e67e22' }}>{formatCurrency(expenses)}</td>
                <td style={{ color: '#e67e22' }}>{revenue > 0 ? ((expenses / revenue) * 100).toFixed(1) : 0}%</td>
              </tr>
              <tr style={{ background: '#f8f9fa', borderTop: '2px solid #e2e8f0' }}>
                <td style={{ fontWeight: 800, color: '#0D3B5E', fontSize: '14px' }}>Net Profit</td>
                <td style={{ fontWeight: 600 }}>Revenue − Payables − Expenses</td>
                <td style={{ fontWeight: 800, fontSize: '15px', color: profit >= 0 ? '#27ae60' : '#e74c3c' }}>{formatCurrency(profit)}</td>
                <td style={{ fontWeight: 800, color: profit >= 0 ? '#27ae60' : '#e74c3c' }}>{margin}%</td>
              </tr>
              <tr style={{ background: '#e7f3ff20' }}>
                <td style={{ fontWeight: 700, color: '#2980b9' }}>Pending</td>
                <td>Outstanding Receivables</td>
                <td style={{ fontWeight: 700, color: '#2980b9' }}>{formatCurrency(pending)}</td>
                <td style={{ color: '#2980b9' }}>{revenue > 0 ? ((pending / revenue) * 100).toFixed(1) : 0}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
