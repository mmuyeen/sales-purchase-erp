import { useEffect, useState } from 'react';
import { getDashboardSummary } from '../api/dashboard.js';
import { formatCurrency } from '../utils/format.js';

const CARDS = [
  { key: 'totalCustomers', label: 'Total Customers', format: (v) => v },
  { key: 'totalSuppliers', label: 'Total Suppliers', format: (v) => v },
  { key: 'totalProducts', label: 'Total Products', format: (v) => v },
  { key: 'salesToday', label: 'Sales Today', format: formatCurrency },
  { key: 'salesThisMonth', label: 'Sales This Month', format: formatCurrency },
  { key: 'purchaseOrdersThisMonth', label: 'Purchase Orders This Month', format: (v) => v },
  { key: 'outstandingCustomerAmount', label: 'Outstanding Customer Amount', format: formatCurrency },
  { key: 'outstandingSupplierAmount', label: 'Outstanding Supplier Amount', format: formatCurrency },
];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboardSummary()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <div className="page-header"><h1>Dashboard</h1></div>
      {error && <div className="alert alert-error">{error}</div>}
      {!data && !error && <p>Loading...</p>}
      {data && (
        <div className="dashboard-cards">
          {CARDS.map((card) => (
            <div className="card dashboard-card" key={card.key}>
              <div className="label">{card.label}</div>
              <div className="value">{card.format(data[card.key])}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
