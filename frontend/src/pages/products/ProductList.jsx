import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listProducts, deactivateProduct } from '../../api/products.js';
import { formatCurrency } from '../../utils/format.js';

export default function ProductList() {
  const [products, setProducts] = useState([]);
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
      const res = await listProducts(params);
      setProducts(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDeactivate(id) {
    if (!window.confirm('Deactivate this product?')) return;
    try {
      await deactivateProduct(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Products</h1>
        <Link className="btn btn-primary" to="/products/new">+ Add Product</Link>
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
              <th>Code</th><th>Name</th><th>HSN Code</th><th>UOM</th><th>Tax %</th><th>Payment Term</th>
              <th>Purchase Price</th><th>Sales Price</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={10}>Loading...</td></tr>}
            {!loading && products.length === 0 && <tr><td colSpan={10}>No products found.</td></tr>}
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.productCode}</td>
                <td>{p.name}</td>
                <td>{p.hsnCode || '-'}</td>
                <td>{p.uom}</td>
                <td>{p.taxPercentage}%</td>
                <td>{p.paymentTerm || '-'}</td>
                <td>{formatCurrency(p.purchasePrice)}</td>
                <td>{formatCurrency(p.salesPrice)}</td>
                <td>{p.isActive ? 'Active' : 'Inactive'}</td>
                <td>
                  <Link className="link-plain" to={`/products/${p.id}/edit`}>Edit</Link>
                  {p.isActive && (
                    <>
                      {' | '}
                      <button className="link-danger" onClick={() => handleDeactivate(p.id)}>Deactivate</button>
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
