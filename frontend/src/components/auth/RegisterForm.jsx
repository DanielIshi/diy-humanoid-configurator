import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

// Password strength checker
const checkPasswordStrength = (password) => {
  let score = 0;
  let feedback = [];

  if (password.length >= 8) score++;
  else feedback.push('Mindestens 8 Zeichen');

  if (/[A-Z]/.test(password)) score++;
  else feedback.push('Großbuchstabe');

  if (/[a-z]/.test(password)) score++;
  else feedback.push('Kleinbuchstabe');

  if (/\d/.test(password)) score++;
  else feedback.push('Zahl');

  if (/[^A-Za-z0-9]/.test(password)) score++;
  else feedback.push('Sonderzeichen');

  const strength = score <= 2 ? 'schwach' : score <= 3 ? 'mittel' : score <= 4 ? 'stark' : 'sehr stark';
  const color = score <= 2 ? 'red' : score <= 3 ? 'orange' : score <= 4 ? 'yellow' : 'green';

  return { score, strength, color, feedback };
};

export function RegisterForm({ onSuccess, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const { register, clearError } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Check password strength
    if (name === 'password') {
      const strength = checkPasswordStrength(value);
      setPasswordStrength(strength);
    }

    // Clear errors when user starts typing
    if (formError) setFormError('');
    clearError();
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setFormError('Name ist erforderlich');
      return false;
    }

    if (!formData.email.trim()) {
      setFormError('E-Mail ist erforderlich');
      return false;
    }

    if (formData.password.length < 8) {
      setFormError('Passwort muss mindestens 8 Zeichen lang sein');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setFormError('Passwörter stimmen nicht überein');
      return false;
    }

    if (!passwordStrength || passwordStrength.score < 3) {
      setFormError('Passwort ist zu schwach. Bitte wählen Sie ein stärkeres Passwort.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    if (!validateForm()) return;

    setIsLoading(true);
    setFormError('');

    try {
      await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password
      });
      
      if (onSuccess) onSuccess();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getStrengthColor = (color) => {
    switch (color) {
      case 'red': return 'bg-red-500';
      case 'orange': return 'bg-orange-500';
      case 'yellow': return 'bg-yellow-500';
      case 'green': return 'bg-green-500';
      default: return 'bg-gray-300';
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Account erstellen</h2>
          <p className="text-gray-600 mt-2">
            Registrieren Sie sich für Ihren kostenlosen Account
          </p>
        </div>

        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-md">
            <p className="text-sm text-red-700">{formError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Vollständiger Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Max Mustermann"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              E-Mail
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="ihre.email@beispiel.de"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Passwort
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Sicheres Passwort erstellen"
                disabled={isLoading}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                  </svg>
                )}
              </button>
            </div>
            
            {/* Password Strength Indicator */}
            {formData.password && passwordStrength && (
              <div className="mt-2">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xs text-gray-600">Passwortstärke:</span>
                  <span className={`text-xs font-medium ${passwordStrength.color === 'red' ? 'text-red-600' : 
                    passwordStrength.color === 'orange' ? 'text-orange-600' : 
                    passwordStrength.color === 'yellow' ? 'text-yellow-600' : 'text-green-600'}`}>
                    {passwordStrength.strength}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full transition-all duration-300 ${getStrengthColor(passwordStrength.color)}`}
                    style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                  ></div>
                </div>
                {passwordStrength.feedback.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Fehlt: {passwordStrength.feedback.join(', ')}
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Passwort bestätigen
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                formData.confirmPassword && formData.password !== formData.confirmPassword 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-gray-300'
              }`}
              placeholder="Passwort wiederholen"
              disabled={isLoading}
            />
            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <p className="text-xs text-red-600 mt-1">Passwörter stimmen nicht überein</p>
            )}
          </div>

          <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-md">
            <p className="mb-2">
              <strong>Passwort-Anforderungen:</strong>
            </p>
            <ul className="space-y-1">
              <li>• Mindestens 8 Zeichen</li>
              <li>• Mindestens ein Großbuchstabe</li>
              <li>• Mindestens ein Kleinbuchstabe</li>
              <li>• Mindestens eine Zahl</li>
              <li>• Mindestens ein Sonderzeichen</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={isLoading || !formData.name || !formData.email || !formData.password || !formData.confirmPassword || formData.password !== formData.confirmPassword}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition duration-200 flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Account wird erstellt...
              </>
            ) : (
              'Account erstellen'
            )}
          </button>
        </form>

        <div className="mt-6 text-center pt-4 border-t border-gray-200">
          <span className="text-sm text-gray-600">Bereits registriert? </span>
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-sm text-blue-600 hover:text-blue-500 font-medium transition duration-200"
          >
            Hier anmelden
          </button>
        </div>
      </div>
    </div>
  );
}