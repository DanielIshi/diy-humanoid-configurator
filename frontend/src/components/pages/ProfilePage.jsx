import { useTranslation } from 'react-i18next';

function ProfilePage() {
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-8">{t('navigation.profile')}</h1>
      <div className="bg-slate-800 rounded-lg p-6">
        <p className="text-slate-300">
          {t('navigation.profile')} {t('messages.loading')}
        </p>
      </div>
    </div>
  );
}

export default ProfilePage;