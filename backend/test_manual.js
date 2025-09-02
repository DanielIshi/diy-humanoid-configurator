import { ManualService } from './src/services/manualService.js';

// Mock logger für Test
const logger = {
  info: (msg, data) => console.log(`INFO: ${msg}`, data || ''),
  debug: (msg, data) => console.log(`DEBUG: ${msg}`, data || ''),
  error: (msg, data) => console.error(`ERROR: ${msg}`, data || '')
};

// Patch logger in service
const originalLogger = global.logger;
global.logger = logger;

// Test-Konfiguration erstellen
const testConfiguration = {
  id: 'test_config_001',
  components: {
    frame: {
      id: 'frame_aluminum',
      name: 'Aluminium Rahmen',
      selected: true,
      model: 'AL-2040',
      specifications: { material: 'aluminum', profile: '20x40mm' }
    },
    motor1: {
      id: 'servo_motor_sg90',
      name: 'Servo Motor SG90',
      selected: true,
      model: 'SG90',
      specifications: { torque: '1.8kg/cm', voltage: '4.8-6V' }
    },
    controller: {
      id: 'controller_arduino',
      name: 'Arduino Uno',
      selected: true,
      model: 'UNO R3',
      specifications: { microcontroller: 'ATmega328P' }
    },
    power: {
      id: 'power_supply_12v',
      name: '12V Netzteil',
      selected: true,
      model: 'PS-12V-5A',
      specifications: { voltage: '12V', current: '5A' }
    },
    sensor: {
      id: 'sensor_ultrasonic',
      name: 'Ultraschall Sensor',
      selected: true,
      model: 'HC-SR04',
      specifications: { range: '2-400cm' }
    }
  }
};

async function testManualSystem() {
  console.log('🔧 Teste Manual System...\n');

  try {
    const manualService = new ManualService();

    // Test 1: Validierung
    console.log('1️⃣ Teste Konfigurationsvalidierung...');
    const selectedComponents = manualService.extractSelectedComponents(testConfiguration);
    console.log(`   ✅ ${selectedComponents.length} Komponenten extrahiert`);

    // Test 2: Abhängigkeiten prüfen
    console.log('\n2️⃣ Teste Abhängigkeitsprüfung...');
    selectedComponents.forEach(comp => {
      const deps = manualService.dependencies.get(comp.id) || [];
      console.log(`   📦 ${comp.name}: ${deps.length > 0 ? deps.join(', ') : 'keine Abhängigkeiten'}`);
    });

    // Test 3: Schritt-Reihenfolge
    console.log('\n3️⃣ Teste Schritt-Reihenfolge...');
    const orderedSteps = manualService.orderSteps(selectedComponents);
    console.log('   📋 Optimale Reihenfolge:');
    orderedSteps.forEach((comp, index) => {
      console.log(`      ${index + 1}. ${comp.name} (${comp.id})`);
    });

    // Test 4: Werkzeugliste
    console.log('\n4️⃣ Teste Werkzeugliste...');
    const toolList = manualService.generateToolList(selectedComponents);
    console.log('   🔨 Benötigte Werkzeuge:');
    toolList.forEach(tool => {
      console.log(`      • ${tool.name} (${tool.category}${tool.essential ? ', essentiell' : ''})`);
    });

    // Test 5: Komplette Manual-Generierung
    console.log('\n5️⃣ Teste Manual-Generierung...');
    const manual = await manualService.generateManual(testConfiguration);
    
    console.log('   📖 Manual erfolgreich generiert:');
    console.log(`      • Titel: ${manual.metadata.title}`);
    console.log(`      • Schritte: ${manual.instructions.length}`);
    console.log(`      • Geschätzte Zeit: ${manual.metadata.estimatedTime.formatted.display}`);
    console.log(`      • Schwierigkeit: ${manual.metadata.difficulty}`);
    console.log(`      • Werkzeuge: ${manual.overview.requiredTools.length}`);
    console.log(`      • Sicherheitshinweise: ${manual.overview.safetyNotes.length}`);

    // Test 6: Beispiel-Schritt anzeigen
    console.log('\n6️⃣ Beispiel-Schritt:');
    const firstStep = manual.instructions[0];
    console.log(`   🎯 ${firstStep.title}`);
    console.log(`      • Beschreibung: ${firstStep.description}`);
    console.log(`      • Zeit: ${firstStep.estimatedTime}min`);
    console.log(`      • Phase: ${firstStep.phase}`);
    console.log(`      • Unterschritte: ${firstStep.steps?.length || 0}`);

    console.log('\n✅ Alle Tests erfolgreich! Manual-System ist funktionsfähig.');
    return true;

  } catch (error) {
    console.error('\n❌ Test fehlgeschlagen:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Test ausführen
testManualSystem().then(success => {
  process.exit(success ? 0 : 1);
});