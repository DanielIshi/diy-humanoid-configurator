import { Link } from 'react-router-dom';

function AdminHeader() {
  return (
    <header className="max-w-6xl mx-auto px-6 pt-10 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Admin Panel - DIY Humanoid Configurator
          </h1>
          <p className="text-slate-300 mt-2">
            Bestellverwaltung & Systemeinstellungen (v0.7)
          </p>
        </div>
        <Link
          to="/"
          className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg border border-slate-600 transition-colors"
        >
          ← Zurück zum Konfigurator
        </Link>
      </div>
      
      <nav className="mt-4 flex gap-4 text-sm border-b border-slate-700/60 pb-2">
        <span className="text-emerald-400 border-b-2 border-emerald-400 pb-2">
          Bestellungen
        </span>
        <span className="text-slate-400">Analytics (coming soon)</span>
        <span className="text-slate-400">Preiskalkulationen (coming soon)</span>
      </nav>
    </header>
  );
}

export default AdminHeader;