import { useContext } from 'react';
import { ConfiguratorContext } from '../../contexts/ConfiguratorContext';
import Configurator from '../../components/customer/Configurator';
import CostPanel from '../../components/customer/CostPanel';
import GuidesCompiler from '../../components/customer/GuidesCompiler';

function ConfiguratorPage() {
  const { items } = useContext(ConfiguratorContext);

  return (
    <main className="max-w-6xl mx-auto px-6 pb-24 grid grid-cols-1 md:grid-cols-3 gap-6">
      <Configurator />
      <CostPanel />
      <div className="md:col-span-2">
        <GuidesCompiler items={items} />
      </div>
    </main>
  );
}

export default ConfiguratorPage;