import { NavLink, Outlet } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/customers', label: 'Customers' },
  { to: '/suppliers', label: 'Suppliers' },
  { to: '/products', label: 'Products' },
  { to: '/purchase-orders', label: 'Purchase Orders' },
  { to: '/sales-orders', label: 'Sales Orders' },
  { to: '/invoices', label: 'Invoices' },
  { to: '/customer-payments', label: 'Customer Payments' },
  { to: '/supplier-payments', label: 'Supplier Payments' },
  { to: '/reports/sales', label: 'Sales Report' },
  { to: '/reports/purchase-orders', label: 'Purchase Report' },
  { to: '/reports/product-sales-payments', label: 'Product Sales & Payment Report' },
];

export default function MainLayout() {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">Sales &amp; Purchase</div>
        <nav>
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main-column">
        <header className="header">Sales &amp; Purchase Management</header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
