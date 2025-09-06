/**
 * @fileoverview Funciones adicionales para soporte de la Sidebar v2.0
 * @version 2.0 - Funciones específicas para la nueva interfaz
 */

// =================================================================
// FUNCIONES ESPECÍFICAS PARA LA SIDEBAR V2.0
// =================================================================

/**
 * Función llamada desde la sidebar para leer configuración avanzada.
 * Expuesta específicamente para la nueva interfaz HTML.
 */
function leerConfiguracionAvanzada() {
  try {
    return leerConfiguracionUsuario();
  } catch (error) {
    logError('SIDEBAR', `Error leyendo configuración avanzada: ${error.message}`);
    return {
      error: error.message,
      isFirstTime: true,
      isPro: false
    };
  }
}

/**
 * Función llamada desde la sidebar para guardar configuración avanzada.
 * Maneja tanto configuración básica como avanzada.
 */
function guardarConfiguracionAvanzada(config) {
  try {
    return guardarConfiguracionUsuario(config);
  } catch (error) {
    logError('SIDEBAR', `Error guardando configuración avanzada: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Función para resetear configuración desde la sidebar.
 */
function resetearConfiguracion() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    // Confirmar acción destructiva
    const response = ui.alert(
      '⚠️ Confirmar Reset',
      '¿Estás seguro de que quieres resetear TODA la configuración?\n\nEsta acción no se puede deshacer.',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
      return { success: false, cancelled: true };
    }
    
    const userProperties = PropertiesService.getUserProperties();
    const allProperties = userProperties.getProperties();
    
    // Eliminar todas las propiedades de Addocu
    Object.keys(allProperties).forEach(key => {
      if (key.startsWith('ADDOCU_')) {
        userProperties.deleteProperty(key);
      }
    });
    
    // Reestablecer configuración por defecto
    establecerConfiguracionPorDefectoV2();
    
    logEvent('RESET', 'Configuración reseteada desde sidebar');
    flushLogs();
    
    return { success: true };
    
  } catch (error) {
    logError('SIDEBAR', `Error en reset de configuración: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// =================================================================
// FUNCIONES DE ONBOARDING Y QUICK SETUP
// =================================================================

/**
 * Función para el Quick Setup - configuración rápida guiada.
 */
function ejecutarQuickSetup(apiKey) {
  try {
    logEvent('ONBOARDING', 'Iniciando Quick Setup');
    
    // Paso 1: Validar y guardar API Key
    if (!apiKey || !apiKey.startsWith('AIza') || apiKey.length < 20) {
      return {
        success: false,
        step: 1,
        error: 'API Key inválida. Debe comenzar con "AIza" y tener al menos 20 caracteres.'
      };
    }
    
    // Guardar API Key
    const saveResult = guardarConfiguracionUsuario({ apiKey: apiKey });
    if (!saveResult.success) {
      return {
        success: false,
        step: 1,
        error: saveResult.error
      };
    }
    
    // Paso 2: Probar conexiones automáticamente
    logEvent('ONBOARDING', 'Probando conexiones automáticamente');
    const connectionResults = probarConexionCompleta(apiKey);
    
    // Paso 3: Configurar servicios por defecto
    const defaultServices = {
      syncGA4: true, // Siempre habilitado (gratis)
      syncGTM: false, // Pro feature
      syncLooker: false, // Pro feature
      isFirstTime: false // Marcar como configurado
    };
    
    guardarConfiguracionUsuario(defaultServices);
    
    logEvent('ONBOARDING', 'Quick Setup completado exitosamente');
    
    return {
      success: true,
      apiKey: apiKey,
      connections: connectionResults,
      message: '¡Configuración completada! Ya puedes auditar tu stack de marketing.'
    };
    
  } catch (error) {
    logError('ONBOARDING', `Error en Quick Setup: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Función para obtener estadísticas de onboarding.
 */
function obtenerEstadisticasOnboarding() {
  try {
    const config = leerConfiguracionUsuario();
    
    return {
      isFirstTime: config.isFirstTime,
      hasApiKey: !!config.apiKey,
      enabledServices: {
        ga4: config.syncGA4,
        gtm: config.syncGTM,
        looker: config.syncLooker
      },
      isPro: config.isPro,
      completionPercentage: calcularPorcentajeCompletacion(config)
    };
    
  } catch (error) {
    return {
      isFirstTime: true,
      hasApiKey: false,
      enabledServices: { ga4: false, gtm: false, looker: false },
      isPro: false,
      completionPercentage: 0
    };
  }
}

/**
 * Calcula el porcentaje de completación de la configuración.
 */
function calcularPorcentajeCompletacion(config) {
  let completed = 0;
  let total = 3;
  
  // Paso 1: API Key configurada
  if (config.apiKey) completed++;
  
  // Paso 2: Al menos una conexión probada (verificar si hay logs de conexión recientes)
  // Por simplicidad, asumimos que si no es primera vez, ya se probó
  if (!config.isFirstTime) completed++;
  
  // Paso 3: Al menos un servicio habilitado
  if (config.syncGA4 || config.syncGTM || config.syncLooker) completed++;
  
  return Math.round((completed / total) * 100);
}

// =================================================================
// FUNCIONES DE VALIDACIÓN AVANZADA
// =================================================================

/**
 * Validación avanzada de API Key con detalles específicos.
 */
function validarApiKeyAvanzada(apiKey) {
  try {
    const validacion = {
      format: false,
      length: false,
      prefix: false,
      connection: null,
      permissions: {}
    };
    
    // Validar formato básico
    if (apiKey && typeof apiKey === 'string') {
      validacion.length = apiKey.length >= 20;
      validacion.prefix = apiKey.startsWith('AIza');
      validacion.format = validacion.length && validacion.prefix;
    }
    
    // Si el formato es correcto, probar conexiones
    if (validacion.format) {
      try {
        const connectionResults = probarConexionCompleta(apiKey);
        validacion.connection = connectionResults;
        
        // Analizar permisos por servicio
        connectionResults.forEach(result => {
          validacion.permissions[result.servicio] = result.estado === 'OK';
        });
        
      } catch (error) {
        validacion.connection = { error: error.message };
      }
    }
    
    return validacion;
    
  } catch (error) {
    logError('VALIDATION', `Error en validación avanzada: ${error.message}`);
    return {
      format: false,
      length: false,
      prefix: false,
      connection: { error: error.message },
      permissions: {}
    };
  }
}

// =================================================================
// FUNCIONES DE ANALYTICS Y MÉTRICAS
// =================================================================

/**
 * Obtiene métricas de uso para mostrar en la sidebar.
 */
function obtenerMetricasUso() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const config = leerConfiguracionUsuario();
    
    const metricas = {
      totalAuditorias: 0,
      ultimaAuditoria: null,
      elementosTotales: 0,
      serviciosConfigurados: 0,
      tiempoUso: null
    };
    
    // Contar hojas generadas como proxy de auditorías
    const sheets = ss.getSheets();
    const addocuSheets = sheets.filter(sheet => {
      const name = sheet.getName();
      return name.startsWith('GA4_') || name.startsWith('GTM_') || name.startsWith('LOOKER_') || name === 'DASHBOARD';
    });
    
    metricas.totalAuditorias = addocuSheets.length;
    
    // Contar elementos totales
    metricas.elementosTotales = addocuSheets.reduce((total, sheet) => {
      return total + Math.max(0, sheet.getLastRow() - 1); // -1 para excluir header
    }, 0);
    
    // Servicios configurados
    if (config.syncGA4) metricas.serviciosConfigurados++;
    if (config.syncGTM && config.isPro) metricas.serviciosConfigurados++;
    if (config.syncLooker && config.isPro) metricas.serviciosConfigurados++;
    
    // Tiempo de uso estimado (desde primera configuración)
    const userProperties = PropertiesService.getUserProperties();
    const migrationDate = userProperties.getProperty('ADDOCU_MIGRATION_DATE');
    const firstConfigDate = userProperties.getProperty('ADDOCU_FIRST_CONFIG_DATE');
    
    if (migrationDate || firstConfigDate) {
      const startDate = new Date(migrationDate || firstConfigDate);
      const daysSinceStart = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      metricas.tiempoUso = daysSinceStart;
    }
    
    return metricas;
    
  } catch (error) {
    logError('METRICS', `Error obteniendo métricas: ${error.message}`);
    return {
      totalAuditorias: 0,
      ultimaAuditoria: null,
      elementosTotales: 0,
      serviciosConfigurados: 0,
      tiempoUso: null,
      error: error.message
    };
  }
}

/**
 * Registra evento de uso para analytics interno.
 */
function registrarEventoUso(evento, detalles = {}) {
  try {
    const timestamp = new Date().toISOString();
    const userEmail = Session.getActiveUser().getEmail();
    
    logEvent('USAGE', `${evento}: ${JSON.stringify(detalles)}`);
    
    // Guardar métricas de uso en propiedades del usuario
    const userProperties = PropertiesService.getUserProperties();
    const usageKey = `ADDOCU_USAGE_${evento.toUpperCase()}`;
    const currentCount = parseInt(userProperties.getProperty(usageKey) || '0');
    userProperties.setProperty(usageKey, String(currentCount + 1));
    
    // Registrar último uso
    userProperties.setProperty('ADDOCU_LAST_USAGE', timestamp);
    
  } catch (error) {
    // No crítico si falla el registro de uso
    console.warn('Error registrando evento de uso:', error.message);
  }
}

// =================================================================
// FUNCIONES DE SOPORTE Y AYUDA
// =================================================================

/**
 * Obtiene información de soporte y debug para enviar al equipo.
 */
function obtenerInformacionSoporte() {
  try {
    const config = leerConfiguracionUsuario();
    const userProperties = PropertiesService.getUserProperties();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Información no sensible para soporte
    const supportInfo = {
      version: 'Addocu v2.0',
      timestamp: new Date().toISOString(),
      user: {
        email: Session.getActiveUser().getEmail(),
        locale: Session.getActiveUserLocale(),
        timezone: Session.getScriptTimeZone()
      },
      configuration: {
        hasApiKey: !!config.apiKey,
        apiKeyFormat: config.apiKey ? `${config.apiKey.substring(0, 8)}...` : 'No configurada',
        services: {
          ga4: config.syncGA4,
          gtm: config.syncGTM,
          looker: config.syncLooker
        },
        isPro: config.isPro,
        isFirstTime: config.isFirstTime,
        logLevel: config.logLevel
      },
      spreadsheet: {
        id: ss.getId(),
        name: ss.getName(),
        sheetsCount: ss.getSheets().length,
        locale: ss.getSpreadsheetLocale(),
        timeZone: ss.getSpreadsheetTimeZone()
      },
      migration: {
        completed: userProperties.getProperty('ADDOCU_MIGRATION_V2_COMPLETED') === 'true',
        date: userProperties.getProperty('ADDOCU_MIGRATION_DATE')
      }
    };
    
    return supportInfo;
    
  } catch (error) {
    return {
      version: 'Addocu v2.0',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Genera un ID de soporte único para tracking de issues.
 */
function generarIdSoporte() {
  const timestamp = Date.now();
  const userEmail = Session.getActiveUser().getEmail();
  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, 
    `${timestamp}-${userEmail}`, Utilities.Charset.UTF_8)
    .map(byte => (byte + 256).toString(16).substring(1))
    .join('')
    .substring(0, 8);
  
  return `ADDOCU-${hash.toUpperCase()}`;
}