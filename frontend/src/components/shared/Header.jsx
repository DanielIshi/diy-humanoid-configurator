import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../common/LanguageSwitcher';

function Header({ userMenu }) {
  const { t } = useTranslation();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <header className="max-w-6xl mx-auto px-6 pt-10 pb-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {t('configurator.title')}
          </h1>
          <p className="text-slate-300 mt-2">
            {t('configurator.subtitle')} (v0.7)
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          {userMenu}
        </div>
      </div>
      
      {!isAdmin && (
        <nav className="mt-4 flex flex-wrap gap-4 text-sm">
          <Link 
            to="/" 
            className={location.pathname === '/' ? 'text-emerald-400' : 'text-slate-300 hover:text-white'}
          >
            {t('navigation.configurator')}
          </Link>
          <Link 
            to="/advisor" 
            className={location.pathname === '/advisor' ? 'text-emerald-400' : 'text-slate-300 hover:text-white'}
          >
            {t('navigation.advisor')}
          </Link>
        </nav>
      )}
    </header>
  );
}

export default Header;