import AdminHeader from '../../components/admin/AdminHeader';
import PaymentSettings from '../../components/admin/PaymentSettings';
import PaymentProviderStatus from '../../components/admin/PaymentProviderStatus';
import OrderManagement from '../../components/admin/OrderManagement';
import { AdminProvider } from '../../contexts/AdminContext';

function AdminPage() {
  return (
    <AdminProvider>
      <div className="min-h-screen bg-gradient-to-b from-[#0d1224] to-[#080a16] text-slate-100">
        <AdminHeader />
        
        <main className="max-w-6xl mx-auto px-6 pb-24 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <PaymentSettings />
          <PaymentProviderStatus />
          <OrderManagement />
        </main>
      </div>
    </AdminProvider>
  );
}

export default AdminPage;
