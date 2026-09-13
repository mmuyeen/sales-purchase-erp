import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listCustomers, deactivateCustomer } from '../../api/customers.js';

export default function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [active, setActive] = useState('true');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search) params.search = search;
      if (active !== 'all') params.active = active;
      const res = await listCustomers(params);
      setCustomers(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDeactivate(id) {
    if (!window.confirm('Deactivate this customer?')) return;
    try {
      await deactivateCustomer(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Customers</h1>
        <Link className="btn btn-primary" to="/customers/new">+ Add Customer</Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="filters-bar">
        <div className="form-field">
          <label>Search</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or code" onKeyDown={(e) => e.key === 'Enter' && load()} />
        </div>
        <div className="form-field">
          <label>Status</label>
          <select value={active} onChange={(e) => setActive(e.target.value)}>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
            <option value="all">All</option>
          </select>
        </div>
        <button className="btn btn-secondary" onClick={load}>Search</button>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th><th>Name</th><th>State</th><th>City</th><th>GST Number</th><th>Phone</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8}>Loading...</td></tr>}
            {!loading && customers.length === 0 && <tr><td colSpan={8}>No customers found.</td></tr>}
            {customers.map((c) => (
              <tr key={c.id}>
                <td>{c.customerCode}</td>
                <td>{c.name}</td>
                <td>{c.state}</td>
                <td>{c.city}</td>
                <td>{c.gstNumber || '-'}</td>
                <td>{c.phone || '-'}</td>
                <td>{c.isActive ? 'Active' : 'Inactive'}</td>
                <td>
                  <Link className="link-plain" to={`/customers/${c.id}/edit`}>Edit</Link>
                  {c.isActive && (
                    <>
                      {' | '}
                      <button className="link-danger" onClick={() => handleDeactivate(c.id)}>Deactivate</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
