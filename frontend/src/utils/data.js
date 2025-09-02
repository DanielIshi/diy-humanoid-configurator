// Produktdaten und Konfigurationen für DIY Humanoid Configurator

export const PARTS = {
  // Aktuatoren
  MG996R: {
    name: "Leichtes Metall‑Servo MG996R",
    unit: "Stk.",
    price: 6.2,
    link: "https://electropeak.com/mg996r-high-torque-digital-servo",
    tech: "MG996R (Metallgetriebe), ca. 9–11 kg·cm @ 6V"
  },
  DS3218: {
    name: "Starkes Servo DS3218 (20 kg)",
    unit: "Stk.",
    price: 12.9,
    link: "https://srituhobby.com/product/ds3218-20kg-metal-gear-servo-motor-waterproof-servo/",
    tech: "DS3218, wasserdicht, bis ~20 kg·cm"
  },

  // Steuerung
  ARD_MEGA: {
    name: "Arduino Mega 2560",
    unit: "Stk.",
    price: 38.0,
    link: "https://www.kubii.com/en/micro-controllers/2075-arduino-mega-2560-rev3-7630049200067.html",
    tech: "ATmega2560, 54 Digital‑I/O, 16 Analogeingänge"
  },
  PCA9685: {
    name: "16‑Kanal Servo‑Treiber (PCA9685)",
    unit: "Stk.",
    price: 13.2,
    link: "https://eu.robotshop.com/products/pca9685-16-channel-12-bit-pwm-servo-driver",
    tech: "PCA9685, 12‑Bit PWM, I²C"
  },
  RPI5: {
    name: "Raspberry Pi 5 (8 GB)",
    unit: "Stk.",
    price: 81.9,
    link: "https://www.welectron.com/Raspberry-Pi-5-8-GB-RAM_1",
    tech: "Broadcom SoC, 8 GB RAM"
  },

  // Sensorik
  MPU6050: {
    name: "IMU MPU‑6050 (Gyro+Accel)",
    unit: "Stk.",
    price: 14.2,
    link: "https://eu.robotshop.com/products/6-dof-gyro-accelerometer-imu-mpu6050",
    tech: "6 DOF, I²C"
  },
  BNO055: {
    name: "IMU BNO055 (9 DOF Fusion)",
    unit: "Stk.",
    price: 36.6,
    link: "https://eu.robotshop.com/products/bno055-9-dof-absolute-orientation-imu-fusion-breakout-board",
    tech: "Sensor‑Fusion, absolute Orientierung"
  },
  OAKDLITE: {
    name: "Luxonis OAK‑D Lite (DepthAI)",
    unit: "Stk.",
    price: 128.1,
    link: "https://eu.mouser.com/ProductDetail/Luxonis/OAK-D-Lite-FF",
    tech: "Stereo‑Depth + AI‑Beschleuniger"
  },

  // Strom / Leistung
  UBEC6A: {
    name: "Leichtgewichtiger Schaltregler (UBEC 5V/6A)",
    unit: "Stk.",
    price: 19.9,
    link: "https://mg-modellbau.de/Akkuweichen-usw/D-Power/D-Power-Antares-6A-UBEC-Regler.html",
    tech: "UBEC 5V/6A, Eingang 2–6S LiPo"
  },
  PSU12V10A: {
    name: "Netzteil 12 V / 10 A (Bench)",
    unit: "Stk.",
    price: 79.0,
    link: "https://www.optics-pro.com/power-supplies/pegasusastro-power-supply-12v-10a-europe-2-1mm/p,60252",
    tech: "~120 W, 2.1 mm Hohlstecker"
  },
  LIPO4S5000: {
    name: "LiPo‑Akku 4S 5000 mAh",
    unit: "Stk.",
    price: 70.0,
    link: "https://gensace.de/collections/4s-lipo-battery",
    tech: "14.8 V nominal, 5 Ah"
  },

  // Sonstiges
  FILAMENT: {
    name: "3D‑Druck‑Filament (1 kg Spule)",
    unit: "Spule",
    price: 20.0,
    link: "https://prusa3d.com/",
    tech: "PLA/PETG je nach Anwendung"
  },
  FASTENERS: {
    name: "Schrauben, Lager & Kleinteile (Set)",
    unit: "Set",
    price: 60.0,
    link: "#",
    tech: "M3/M4, Muttern, Lager, Kleinteile"
  }
};

export const PRESETS = {
  starter: {
    label: "Starter – Oberkörper (ca. 12 DOF)",
    items: { MG996R: 12, ARD_MEGA: 1, PCA9685: 1, RPI5: 1, MPU6050: 1, UBEC6A: 1, PSU12V10A: 1, FILAMENT: 3, FASTENERS: 1 },
    notes: "Arme/Hand/Kopf (kein Gehen). Optional: OAK‑D Lite für Vision."
  },
  walker: {
    label: "Walker‑Light – kleiner Biped (ca. 18 DOF)",
    items: { DS3218: 18, ARD_MEGA: 1, PCA9685: 2, RPI5: 1, BNO055: 1, OAKDLITE: 1, UBEC6A: 1, LIPO4S5000: 1, FILAMENT: 5, FASTENERS: 1 },
    notes: "Einfaches Gehen möglich, langsame Gaits; Standzeit & Drehmoment begrenzt."
  },
  inmoov: {
    label: "InMoov‑Scale – großer Oberkörper (30+ DOF)",
    items: { MG996R: 30, DS3218: 2, ARD_MEGA: 1, PCA9685: 2, RPI5: 1, MPU6050: 1, OAKDLITE: 1, UBEC6A: 1, PSU12V10A: 1, FILAMENT: 12, FASTENERS: 1 },
    notes: "Lebensgroßer Oberkörper; Beine sind gesondertes (schwieriges) Projekt."
  }
};

export const GUIDES = {
  MG996R: "Montage mit M3‑Schrauben; nicht überlasten; ideal für Finger/Handgelenk.",
  DS3218: "Geeignet für Hüft/Schulter leichter Builds; stabile 6 V Versorgung.",
  ARD_MEGA: "Nutze getrennte 5 V Versorgung für Servos; GND verbinden.",
  PCA9685: "I²C‑Adresse prüfen; externe 5–6 V Servostromversorgung anschließen.",
  RPI5: "System kühlen; nutze 64‑Bit OS; I²C aktivieren.",
  MPU6050: "Montage vibrationsarm; Kalibrierung im Code durchführen.",
  BNO055: "Fusion‑Modus wählen; absolute Orientierung möglich.",
  OAKDLITE: "USB3 an RPi5; DepthAI‑Beispiele testen (Objekt/Hand‑Tracking).",
  UBEC6A: "Achtung Polarität; Ausgang 5 V stabil auf Servoschiene einspeisen.",
  PSU12V10A: "Ausreichende Leistung für Bench‑Tests; Überspannung vermeiden.",
  LIPO4S5000: "Nur mit geeigneter Sicherung; Balancer‑Laden; Brandschutz beachten.",
  FILAMENT: "PLA für Prototypen, PETG/ABS für belastete Teile.",
  FASTENERS: "Sortierte Kisten; Loctite bei vibrierenden Baugruppen."
};