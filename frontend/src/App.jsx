import { Route, Routes } from 'react-router-dom';
import MainLayout from './layouts/MainLayout.jsx';

import Dashboard from './pages/Dashboard.jsx';

import CustomerList from './pages/customers/CustomerList.jsx';
import CustomerForm from './pages/customers/CustomerForm.jsx';

import SupplierList from './pages/suppliers/SupplierList.jsx';
import SupplierForm from './pages/suppliers/SupplierForm.jsx';

import ProductList from './pages/products/ProductList.jsx';
import ProductForm from './pages/products/ProductForm.jsx';

import PurchaseOrderList from './pages/purchase-orders/PurchaseOrderList.jsx';
import PurchaseOrderForm from './pages/purchase-orders/PurchaseOrderForm.jsx';
import PurchaseOrderDetail from './pages/purchase-orders/PurchaseOrderDetail.jsx';

import SalesOrderList from './pages/sales-orders/SalesOrderList.jsx';
import SalesOrderForm from './pages/sales-orders/SalesOrderForm.jsx';
import SalesOrderDetail from './pages/sales-orders/SalesOrderDetail.jsx';

import InvoiceList from './pages/invoices/InvoiceList.jsx';
import InvoiceForm from './pages/invoices/InvoiceForm.jsx';
import InvoiceDetail from './pages/invoices/InvoiceDetail.jsx';
import InvoicePrint from './pages/invoices/InvoicePrint.jsx';

import CustomerPaymentList from './pages/customer-payments/CustomerPaymentList.jsx';
import CustomerPaymentForm from './pages/customer-payments/CustomerPaymentForm.jsx';

import SupplierPaymentList from './pages/supplier-payments/SupplierPaymentList.jsx';
import SupplierPaymentForm from './pages/supplier-payments/SupplierPaymentForm.jsx';

import SalesReport from './pages/reports/SalesReport.jsx';
import PurchaseReport from './pages/reports/PurchaseReport.jsx';
import ProductSalesPaymentReport from './pages/reports/ProductSalesPaymentReport.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/invoices/:id/print" element={<InvoicePrint />} />

      <Route element={<MainLayout />}>
        <Route path="/" element={<Dashboard />} />

        <Route path="/customers" element={<CustomerList />} />
        <Route path="/customers/new" element={<CustomerForm />} />
        <Route path="/customers/:id/edit" element={<CustomerForm />} />

        <Route path="/suppliers" element={<SupplierList />} />
        <Route path="/suppliers/new" element={<SupplierForm />} />
        <Route path="/suppliers/:id/edit" element={<SupplierForm />} />

        <Route path="/products" element={<ProductList />} />
        <Route path="/products/new" element={<ProductForm />} />
        <Route path="/products/:id/edit" element={<ProductForm />} />

        <Route path="/purchase-orders" element={<PurchaseOrderList />} />
        <Route path="/purchase-orders/new" element={<PurchaseOrderForm />} />
        <Route path="/purchase-orders/:id" element={<PurchaseOrderDetail />} />

        <Route path="/sales-orders" element={<SalesOrderList />} />
        <Route path="/sales-orders/new" element={<SalesOrderForm />} />
        <Route path="/sales-orders/:id" element={<SalesOrderDetail />} />

        <Route path="/invoices" element={<InvoiceList />} />
        <Route path="/invoices/new" element={<InvoiceForm />} />
        <Route path="/invoices/:id" element={<InvoiceDetail />} />

        <Route path="/customer-payments" element={<CustomerPaymentList />} />
        <Route path="/customer-payments/new" element={<CustomerPaymentForm />} />

        <Route path="/supplier-payments" element={<SupplierPaymentList />} />
        <Route path="/supplier-payments/new" element={<SupplierPaymentForm />} />

        <Route path="/reports/sales" element={<SalesReport />} />
        <Route path="/reports/purchase-orders" element={<PurchaseReport />} />
        <Route path="/reports/product-sales-payments" element={<ProductSalesPaymentReport />} />
      </Route>
    </Routes>
  );
}
