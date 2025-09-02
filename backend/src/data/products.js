// Produktdaten synchron mit dem Frontend
// Diese Datei stellt sicher, dass Backend und Frontend dieselben Produktdaten verwenden

export const PARTS = {
  // Aktuatoren
  MG996R: {
    i18nKey: "MG996R",
    category: "SERVO",
    name: "Leichtes Metall‑Servo MG996R",
    unit: "Stk.",
    price: 6.2,
    link: "https://electropeak.com/mg996r-high-torque-digital-servo",
    tech: "MG996R (Metallgetriebe), ca. 9–11 kg·cm @ 6V",
    availability: "in-stock",
    supplier: "ElectroPeak"
  },
  DS3218: {
    i18nKey: "DS3218",
    category: "SERVO",
    name: "Starkes Servo DS3218 (20 kg)",
    unit: "Stk.",
    price: 12.9,
    link: "https://srituhobby.com/product/ds3218-20kg-metal-gear-servo-motor-waterproof-servo/",
    tech: "DS3218, wasserdicht, bis ~20 kg·cm",
    availability: "in-stock",
    supplier: "Sritu Hobby"
  },

  // Steuerung
  ARD_MEGA: {
    i18nKey: "ARD_MEGA",
    category: "CONTROLLER",
    name: "Arduino Mega 2560",
    unit: "Stk.",
    price: 38.0,
    link: "https://www.kubii.com/en/micro-controllers/2075-arduino-mega-2560-rev3-7630049200067.html",
    tech: "ATmega2560, 54 Digital‑I/O, 16 Analogeingänge",
    availability: "in-stock",
    supplier: "Kubii"
  },
  PCA9685: {
    i18nKey: "PCA9685",
    category: "CONTROLLER",
    name: "16‑Kanal Servo‑Treiber (PCA9685)",
    unit: "Stk.",
    price: 13.2,
    link: "https://eu.robotshop.com/products/pca9685-16-channel-12-bit-pwm-servo-driver",
    tech: "PCA9685, 12‑Bit PWM, I²C",
    availability: "in-stock",
    supplier: "RobotShop"
  },
  RPI5: {
    i18nKey: "RPI5",
    category: "CONTROLLER",
    name: "Raspberry Pi 5 (8 GB)",
    unit: "Stk.",
    price: 81.9,
    link: "https://www.welectron.com/Raspberry-Pi-5-8-GB-RAM_1",
    tech: "Broadcom SoC, 8 GB RAM",
    availability: "low-stock",
    supplier: "WElectron"
  },

  // Sensorik
  MPU6050: {
    i18nKey: "MPU6050",
    category: "SENSOR",
    name: "IMU MPU‑6050 (Gyro+Accel)",
    unit: "Stk.",
    price: 14.2,
    link: "https://eu.robotshop.com/products/6-dof-gyro-accelerometer-imu-mpu6050",
    tech: "6 DOF, I²C",
    availability: "in-stock",
    supplier: "RobotShop"
  },
  BNO055: {
    i18nKey: "BNO055",
    category: "SENSOR",
    name: "IMU BNO055 (9 DOF Fusion)",
    unit: "Stk.",
    price: 36.6,
    link: "https://eu.robotshop.com/products/bno055-9-dof-absolute-orientation-imu-fusion-breakout-board",
    tech: "Sensor‑Fusion, absolute Orientierung",
    availability: "in-stock",
    supplier: "RobotShop"
  },
  OAKDLITE: {
    i18nKey: "OAKDLITE",
    category: "SENSOR",
    name: "Luxonis OAK‑D Lite (DepthAI)",
    unit: "Stk.",
    price: 128.1,
    link: "https://eu.mouser.com/ProductDetail/Luxonis/OAK-D-Lite-FF",
    tech: "Stereo‑Depth + AI‑Beschleuniger",
    availability: "in-stock",
    supplier: "Mouser"
  },

  // Strom / Leistung
  UBEC6A: {
    i18nKey: "UBEC6A",
    category: "POWER",
    name: "Leichtgewichtiger Schaltregler (UBEC 5V/6A)",
    unit: "Stk.",
    price: 19.9,
    link: "https://mg-modellbau.de/Akkuweichen-usw/D-Power/D-Power-Antares-6A-UBEC-Regler.html",
    tech: "UBEC 5V/6A, Eingang 2–6S LiPo",
    availability: "in-stock",
    supplier: "MG Modellbau"
  },
  PSU12V10A: {
    i18nKey: "PSU12V10A",
    category: "POWER",
    name: "Netzteil 12 V / 10 A (Bench)",
    unit: "Stk.",
    price: 79.0,
    link: "https://www.optics-pro.com/power-supplies/pegasusastro-power-supply-12v-10a-europe-2-1mm/p,60252",
    tech: "~120 W, 2.1 mm Hohlstecker",
    availability: "in-stock",
    supplier: "Optics Pro"
  },
  LIPO4S5000: {
    i18nKey: "LIPO4S5000",
    category: "POWER",
    name: "LiPo‑Akku 4S 5000 mAh",
    unit: "Stk.",
    price: 70.0,
    link: "https://gensace.de/collections/4s-lipo-battery",
    tech: "14.8 V nominal, 5 Ah",
    availability: "in-stock",
    supplier: "Gens Ace"
  },

  // Sonstiges
  FILAMENT: {
    i18nKey: "FILAMENT",
    category: "MISC",
    name: "3D‑Druck‑Filament (1 kg Spule)",
    unit: "Spule",
    price: 20.0,
    link: "https://prusa3d.com/",
    tech: "PLA/PETG je nach Anwendung",
    availability: "in-stock",
    supplier: "Prusa Research"
  },
  FASTENERS: {
    i18nKey: "FASTENERS",
    category: "MISC",
    name: "Schrauben, Lager & Kleinteile (Set)",
    unit: "Set",
    price: 60.0,
    link: "#",
    tech: "M3/M4, Muttern, Lager, Kleinteile",
    availability: "in-stock",
    supplier: "Various"
  }
};

export const CATEGORIES = {
  SERVO: {
    key: "SERVO",
    i18nKey: "SERVO"
  },
  CONTROLLER: {
    key: "CONTROLLER",
    i18nKey: "CONTROLLER"
  },
  SENSOR: {
    key: "SENSOR",
    i18nKey: "SENSOR"
  },
  POWER: {
    key: "POWER",
    i18nKey: "POWER"
  },
  MISC: {
    key: "MISC",
    i18nKey: "MISC"
  }
};

// Lokalisierte Übersetzungen für verschiedene Sprachen
export const TRANSLATIONS = {
  de: {
    categories: {
      SERVO: "Servo",
      CONTROLLER: "Steuerung",
      SENSOR: "Sensor",
      POWER: "Stromversorgung",
      MISC: "Sonstiges"
    },
    products: {
      MG996R: {
        name: "Leichtes Metall-Servo MG996R",
        description: "Zuverlässiges Servo mit Metallgetriebe für präzise Bewegungen"
      },
      DS3218: {
        name: "Starkes Servo DS3218 (20 kg)",
        description: "Hochleistungs-Servo für schwere Lasten"
      },
      ARD_MEGA: {
        name: "Arduino Mega 2560",
        description: "Mikrocontroller-Platine mit vielen Ein-/Ausgängen"
      },
      PCA9685: {
        name: "16-Kanal Servo-Treiber (PCA9685)",
        description: "PWM-Controller für mehrere Servos"
      },
      RPI5: {
        name: "Raspberry Pi 5 (8 GB)",
        description: "Leistungsstarker Einplatinencomputer"
      },
      MPU6050: {
        name: "IMU MPU-6050 (Gyro+Accel)",
        description: "6-achsiger Bewegungssensor"
      },
      BNO055: {
        name: "IMU BNO055 (9 DOF Fusion)",
        description: "9-achsiger Orientierungssensor mit Sensor-Fusion"
      },
      OAKDLITE: {
        name: "Luxonis OAK-D Lite (DepthAI)",
        description: "KI-Kamera mit Tiefenerkennung"
      },
      UBEC6A: {
        name: "Leichtgewichtiger Schaltregler (UBEC 5V/6A)",
        description: "Effizienter Spannungsregler für mobile Anwendungen"
      },
      PSU12V10A: {
        name: "Netzteil 12 V / 10 A (Bench)",
        description: "Labornetzteil für Testzwecke"
      },
      LIPO4S5000: {
        name: "LiPo-Akku 4S 5000 mAh",
        description: "Hochleistungs-Lithium-Polymer-Akku"
      },
      FILAMENT: {
        name: "3D-Druck-Filament (1 kg Spule)",
        description: "Hochwertiges Filament für 3D-Drucker"
      },
      FASTENERS: {
        name: "Schrauben, Lager & Kleinteile (Set)",
        description: "Komplettset für Montage und Wartung"
      }
    }
  },
  en: {
    categories: {
      SERVO: "Servo Motors",
      CONTROLLER: "Controllers",
      SENSOR: "Sensors",
      POWER: "Power Supply",
      MISC: "Miscellaneous"
    },
    products: {
      MG996R: {
        name: "Lightweight Metal Servo MG996R",
        description: "Reliable servo with metal gearing for precise movements"
      },
      DS3218: {
        name: "Strong Servo DS3218 (20 kg)",
        description: "High-performance servo for heavy-duty applications"
      },
      ARD_MEGA: {
        name: "Arduino Mega 2560",
        description: "Microcontroller board with extensive I/O capabilities"
      },
      PCA9685: {
        name: "16-Channel Servo Driver (PCA9685)",
        description: "PWM controller for multiple servo management"
      },
      RPI5: {
        name: "Raspberry Pi 5 (8 GB)",
        description: "Powerful single-board computer"
      },
      MPU6050: {
        name: "IMU MPU-6050 (Gyro+Accel)",
        description: "6-axis motion tracking sensor"
      },
      BNO055: {
        name: "IMU BNO055 (9 DOF Fusion)",
        description: "9-axis orientation sensor with sensor fusion"
      },
      OAKDLITE: {
        name: "Luxonis OAK-D Lite (DepthAI)",
        description: "AI camera with depth perception"
      },
      UBEC6A: {
        name: "Lightweight Switch Mode Regulator (UBEC 5V/6A)",
        description: "Efficient voltage regulator for mobile applications"
      },
      PSU12V10A: {
        name: "Power Supply 12V / 10A (Bench)",
        description: "Lab power supply for testing purposes"
      },
      LIPO4S5000: {
        name: "LiPo Battery 4S 5000 mAh",
        description: "High-performance lithium polymer battery"
      },
      FILAMENT: {
        name: "3D Printing Filament (1 kg Spool)",
        description: "High-quality filament for 3D printers"
      },
      FASTENERS: {
        name: "Screws, Bearings & Hardware (Set)",
        description: "Complete set for assembly and maintenance"
      }
    }
  }
};

// Hilfsfunktionen für lokalisierte Daten
export const getLocalizedProduct = (partKey, language = 'de') => {
  const part = PARTS[partKey];
  if (!part) return null;

  const translations = TRANSLATIONS[language] || TRANSLATIONS.de;
  const productTranslation = translations.products[part.i18nKey] || {};

  return {
    ...part,
    name: productTranslation.name || part.name,
    description: productTranslation.description || '',
    categoryName: translations.categories[part.category] || part.category
  };
};

export const getLocalizedCategory = (categoryKey, language = 'de') => {
  const translations = TRANSLATIONS[language] || TRANSLATIONS.de;
  return translations.categories[categoryKey] || categoryKey;
};

export const getAllProducts = (language = 'de') => {
  return Object.keys(PARTS).map(key => getLocalizedProduct(key, language));
};

export const getProductsByCategory = (categoryKey, language = 'de') => {
  return Object.keys(PARTS)
    .filter(key => PARTS[key].category === categoryKey)
    .map(key => getLocalizedProduct(key, language));
};