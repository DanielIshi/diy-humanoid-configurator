import { createContext, useContext } from 'react';
import { ConfiguratorContext } from './ConfiguratorContext';

export const AdminContext = createContext();

export function AdminProvider({ children }) {
  // Admin-spezifische Logik nutzt ConfiguratorContext als Basis
  const configuratorState = useContext(ConfiguratorContext);

  const value = {
    ...configuratorState,
    // Hier könnten zusätzliche admin-spezifische States/Functions hinzugefügt werden
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}