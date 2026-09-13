import { UOM_OPTIONS, TAX_RATE_OPTIONS } from '@shared/constants.js';
import { computeLine } from '../utils/calculations.js';
import { formatCurrency } from '../utils/format.js';
import SearchableSelect from './SearchableSelect.jsx';

export default function LineItemsEditor({ items, products, onChange, priceField = 'salesPrice', gstType }) {
  function updateItem(index, patch) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addItem() {
    onChange([
      ...items,
      { productId: '', description: '', hsnCode: '', uom: UOM_OPTIONS[0], quantity: 1, rate: 0, discountAmount: 0, taxPercentage: TAX_RATE_OPTIONS[0] },
    ]);
  }

  function removeItem(index) {
    onChange(items.filter((_, i) => i !== index));
  }

  function handleProductChange(index, productId) {
    const product = products.find((p) => String(p.id) === String(productId));
    updateItem(index, {
      productId,
      description: product ? product.name : '',
      hsnCode: product ? (product.hsnCode || '') : '',
      uom: product ? product.uom : UOM_OPTIONS[0],
      rate: product ? product[priceField] : 0,
      taxPercentage: product ? product.taxPercentage : TAX_RATE_OPTIONS[0],
    });
  }

  return (
    <div className="line-items">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Description</th>
              <th>HSN Code</th>
              <th>UOM</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Discount</th>
              <th>Tax %</th>
              <th>Tax Amt</th>
              <th>Line Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const computed = computeLine(item, gstType);
              return (
                <tr key={index}>
                  <td>
                    <SearchableSelect
                      options={products}
                      value={item.productId}
                      onChange={(id) => handleProductChange(index, id)}
                      getLabel={(p) => `${p.productCode} - ${p.name}`}
                      getValue={(p) => p.id}
                      placeholder="Select product"
                    />
                  </td>
                  <td>
                    <input value={item.description || ''} onChange={(e) => updateItem(index, { description: e.target.value })} />
                  </td>
                  <td>
                    <input
                      value={item.hsnCode || ''}
                      maxLength={8}
                      placeholder="4/6/8 digits"
                      onChange={(e) => updateItem(index, { hsnCode: e.target.value.replace(/\D/g, '') })}
                    />
                  </td>
                  <td>
                    <select value={item.uom} onChange={(e) => updateItem(index, { uom: e.target.value })}>
                      {UOM_OPTIONS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input type="number" min="0" step="0.001" value={item.quantity}
                      onChange={(e) => updateItem(index, { quantity: e.target.value })} />
                  </td>
                  <td>
                    <input type="number" min="0" step="0.01" value={item.rate}
                      onChange={(e) => updateItem(index, { rate: e.target.value })} />
                  </td>
                  <td>
                    <input type="number" min="0" step="0.01" value={item.discountAmount || 0}
                      onChange={(e) => updateItem(index, { discountAmount: e.target.value })} />
                  </td>
                  <td>
                    <select value={item.taxPercentage} onChange={(e) => updateItem(index, { taxPercentage: Number(e.target.value) })}>
                      {TAX_RATE_OPTIONS.map((t) => (
                        <option key={t} value={t}>{t}%</option>
                      ))}
                    </select>
                  </td>
                  <td>{formatCurrency(computed.taxAmount)}</td>
                  <td>{formatCurrency(computed.lineTotal)}</td>
                  <td>
                    <button type="button" className="link-danger" onClick={() => removeItem(index)}>Remove</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button type="button" className="btn btn-secondary" onClick={addItem} style={{ marginTop: 10 }}>
        + Add line
      </button>
    </div>
  );
}
