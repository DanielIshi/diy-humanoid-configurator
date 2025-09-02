import { useTranslation } from 'react-i18next';

function SupportPage() {
  const { t } = useTranslation();

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-8">{t('navigation.support')}</h1>
      <div className="bg-slate-800 rounded-lg p-6">
        <p className="text-slate-300">
          {t('navigation.support')} {t('messages.loading')}
        </p>
      </div>
    </div>
  );
}

export default SupportPage;