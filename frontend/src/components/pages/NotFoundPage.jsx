import { useTranslation } from 'react-i18next';

function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="max-w-6xl mx-auto px-6 py-24 text-center">
      <h1 className="text-2xl font-bold mb-4">{t('messages.pageNotFound')}</h1>
      <p className="text-slate-300 mb-8">
        {t('messages.pageNotFound')}
      </p>
      <button
        onClick={() => window.history.back()}
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition duration-200"
      >
        {t('actions.back')}
      </button>
    </div>
  );
}

export default NotFoundPage;