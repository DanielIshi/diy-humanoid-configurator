import { useTranslation } from 'react-i18next';

function PrivacyPage() {
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-8">{t('legal.privacy')}</h1>
      <div className="bg-slate-800 rounded-lg p-6 prose prose-invert max-w-none">
        <p className="text-slate-300">
          {t('legal.privacy')} {t('messages.loading')}
        </p>
      </div>
    </div>
  );
}

export default PrivacyPage;