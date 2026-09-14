import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

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
  { to: '/settings/company', label: 'Company Settings' },
];

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

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
          <button type="button" className="sidebar-logout" onClick={handleLogout}>Logout</button>
        </nav>
      </aside>
      <div className="main-column">
        <header className="header">
          <span>Sales &amp; Purchase Management</span>
          {user?.email && <span className="header-user">{user.email}</span>}
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
