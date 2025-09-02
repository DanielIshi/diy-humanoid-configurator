import { Link, useLocation } from 'react-router-dom';

function Header() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <header className="max-w-6xl mx-auto px-6 pt-10 pb-4">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
        DIY Humanoid Configurator
      </h1>
      <p className="text-slate-300 mt-2">
        Konfigurieren, kalkulieren & verwalten. (v0.7)
      </p>
      
      {!isAdmin && (
        <nav className="mt-4 flex flex-wrap gap-4 text-sm">
          <Link 
            to="/" 
            className={location.pathname === '/' ? 'text-emerald-400' : 'text-slate-300 hover:text-white'}
          >
            Konfigurator
          </Link>
          <Link 
            to="/advisor" 
            className={location.pathname === '/advisor' ? 'text-emerald-400' : 'text-slate-300 hover:text-white'}
          >
            Berater & Guides
          </Link>
        </nav>
      )}
    </header>
  );
}

export default Header;