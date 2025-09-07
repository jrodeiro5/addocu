/**
 * @fileoverview Coordinador Principal Addocu v2.0 - Add-on de Google Workspace
 * @version 3.0 - Modelo Open Source Completo
 */

// =================================================================
// ARRANQUE Y MENÚ DEL ADD-ON
// =================================================================

/**
 * Se ejecuta cuando un usuario instala el Add-on.
 * @param {Object} e - Objeto de evento de Google Apps Script.
 */
function onInstall(e) {
  onOpen(e);
  
  // Log de instalación
  logEvent('INSTALL', `Addocu instalado para usuario: ${Session.getActiveUser().getEmail()}`);
  flushLogs();
}

/**
 * Se ejecuta cuando un usuario abre una hoja de cálculo con el Add-on.
 * @param {Object} e - Objeto de evento de Google Apps Script.
 */
function onOpen(e) {
  SpreadsheetApp.getUi()
    .createAddonMenu()
    .addItem('⚙️ Configurar Addocu', 'abrirSidebarConfiguracion')
    .addSeparator()
    .addItem('🚀 Auditar Stack Completo', 'iniciarAuditoriaCompleta')
    .addSeparator()
    .addItem('📊 Auditar GA4', 'sincronizarGA4ConUI')
    .addItem('🏷️ Auditar GTM', 'sincronizarGTMConUI')
    .addItem('📈 Auditar Looker Studio', 'sincronizarLookerStudioConUI')
    .addItem('📋 Dashboard Interactivo', 'openHtmlDashboard')
    .addSubMenu(SpreadsheetApp.getUi().createMenu('🔧 Herramientas')
      .addItem('🔌 Probar Conexiones', 'diagnosticarConexiones')
      .addItem('🔒 Probar OAuth2', 'probarOAuth2')
      .addItem('🔍 Analizar Cambios', 'analizarCambiosRecientesUI')
      .addItem('🧹 Limpiar Logs', 'cleanupLogsUI')
      .addItem('📋 Generar Dashboard', 'generarDashboardManual')
    )
    .addToUi();
}

// =================================================================
// GESTIÓN DE INTERFACES DE USUARIO (HTML)
// =================================================================

/**
 * Muestra la nueva sidebar de configuración v2.0.
 */
function abrirSidebarConfiguracion() {
  try {
    const html = HtmlService.createHtmlOutputFromFile('configuracion')
      .setTitle('Configuración Addocu')
      .setWidth(320); // Ancho optimizado para Google Sheets
    
    SpreadsheetApp.getUi().showSidebar(html);
    
    logEvent('CONFIG', 'Sidebar de configuración abierta');
  } catch (e) {
    logError('CONFIG', `Error abriendo sidebar: ${e.message}`);
    SpreadsheetApp.getUi().alert(
      'Error', 
      `No se pudo abrir la configuración. Error: ${e.message}`, 
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Abre el dashboard HTML interactivo.
 */
function openHtmlDashboard() {
  try {
    const html = HtmlService.createHtmlOutputFromFile('dashboard_interactivo')
      .setWidth(1400)
      .setHeight(850);
    
    SpreadsheetApp.getUi().showModalDialog(html, '📊 Dashboard Interactivo Addocu');
    
    logEvent('DASHBOARD', 'Dashboard HTML abierto');
  } catch (e) {
    logError('DASHBOARD', `Error abriendo dashboard: ${e.message}`);
    SpreadsheetApp.getUi().alert(
      'Error al Abrir Dashboard', 
      `No se pudo abrir el dashboard. Error: ${e.message}`, 
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

// =================================================================
// COMUNICACIÓN CON LA SIDEBAR V2.0
// =================================================================

/**
 * Lee la configuración completa del usuario actual (OAuth2 + Looker API Key).
 * @returns {Object} Configuración del usuario con API Key de Looker, servicios, etc.
 */
function leerConfiguracionUsuario() {
  try {
    const userProperties = PropertiesService.getUserProperties();
    
    const config = {
      // API Configuration (NOTA: Looker Studio ahora usa OAuth2, no API Key)
      lookerApiKey: userProperties.getProperty('ADDOCU_LOOKER_API_KEY') || '', // Mantenido para compatibilidad
      gtmFilter: userProperties.getProperty('ADDOCU_GTM_FILTER') || '',
      
      // Advanced Filters
      ga4Properties: userProperties.getProperty('ADDOCU_GA4_PROPERTIES_FILTER') || '',
      gtmWorkspaces: userProperties.getProperty('ADDOCU_GTM_WORKSPACES_FILTER') || '',
      
      // Service Configuration
      syncFrequency: userProperties.getProperty('ADDOCU_SYNC_FREQUENCY') || 'manual',
      requestTimeout: parseInt(userProperties.getProperty('ADDOCU_REQUEST_TIMEOUT')) || 60,
      
      // Services Status - Todos disponibles
      syncLooker: userProperties.getProperty('ADDOCU_SYNC_LOOKER') !== 'false', // Default true
      syncGA4: userProperties.getProperty('ADDOCU_SYNC_GA4') !== 'false', // Default true
      syncGTM: userProperties.getProperty('ADDOCU_SYNC_GTM') !== 'false', // Default true
      
      // OAuth2 Information
      oauth2Ready: true, // OAuth2 siempre disponible
      userEmail: Session.getActiveUser().getEmail(),
      
      // Alert Configuration
      alertEmail: userProperties.getProperty('ADDOCU_ALERT_EMAIL') || '',
      alertErrors: userProperties.getProperty('ADDOCU_ALERT_ERRORS') !== 'false', // Default true
      alertChanges: userProperties.getProperty('ADDOCU_ALERT_CHANGES') === 'true',
      alertSuccess: userProperties.getProperty('ADDOCU_ALERT_SUCCESS') === 'true',
      alertWarnings: userProperties.getProperty('ADDOCU_ALERT_WARNINGS') === 'true',
      weeklySummary: userProperties.getProperty('ADDOCU_WEEKLY_SUMMARY') === 'true',
      
      // Advanced Configuration
      logLevel: userProperties.getProperty('ADDOCU_LOG_LEVEL') || 'INFO',
      logRetention: parseInt(userProperties.getProperty('ADDOCU_LOG_RETENTION')) || 30,
      
      // User Status - Open Source
      isFirstTime: userProperties.getProperty('ADDOCU_FIRST_TIME') !== 'false',
      isPro: true // Todos los usuarios tienen acceso completo
    };
    
    return config;
    
  } catch (e) {
    logError('CONFIG', `Error leyendo configuración: ${e.message}`);
    return { oauth2Ready: true, userEmail: Session.getActiveUser().getEmail() };
  }
}

/**
 * Guarda la configuración del usuario (OAuth2 + API Key opcional de Looker + Filtros).
 * @param {Object} config - Objeto con la configuración a guardar.
 * @returns {Object} Resultado de la operación.
 */
function guardarConfiguracionUsuario(config) {
  try {
    const userProperties = PropertiesService.getUserProperties();
    
    // Mapear las propiedades de configuración
    if (config.lookerApiKey !== undefined) {
      if (config.lookerApiKey.trim()) {
        userProperties.setProperty('ADDOCU_LOOKER_API_KEY', config.lookerApiKey.trim());
      } else {
        userProperties.deleteProperty('ADDOCU_LOOKER_API_KEY');
      }
    }
    
    if (config.gtmFilter !== undefined) {
      userProperties.setProperty('ADDOCU_GTM_FILTER', config.gtmFilter);
    }
    
    // Guardar filtros avanzados
    if (config.ga4Properties !== undefined) {
      if (config.ga4Properties.trim()) {
        userProperties.setProperty('ADDOCU_GA4_PROPERTIES_FILTER', config.ga4Properties.trim());
      } else {
        userProperties.deleteProperty('ADDOCU_GA4_PROPERTIES_FILTER');
      }
    }
    
    if (config.gtmWorkspaces !== undefined) {
      if (config.gtmWorkspaces.trim()) {
        userProperties.setProperty('ADDOCU_GTM_WORKSPACES_FILTER', config.gtmWorkspaces.trim());
      } else {
        userProperties.deleteProperty('ADDOCU_GTM_WORKSPACES_FILTER');
      }
    }
    
    // Marcar como no primer uso (OAuth2 siempre está listo)
    userProperties.setProperty('ADDOCU_FIRST_TIME', 'false');
    
    logEvent('CONFIG', `Configuración guardada: ${Object.keys(config).join(', ')}`);
    
    return { success: true };
    
  } catch (e) {
    logError('CONFIG', `Error guardando configuración: ${e.message}`);
    return { success: false, error: e.message };
  }
}

/**
 * Wrapper para la función de diagnóstico completo (compatible con sidebar).
 * @returns {Array} Array con el estado de cada servicio.
 */
function probarConexionCompleta() {
  return diagnosticarConexionesCompleto();
}

/**
 * Ejecuta una auditoría con filtros avanzados.
 * @param {Object} auditConfig - Configuración de auditoría con servicios y filtros.
 * @returns {Object} Resultado de la auditoría.
 */
function ejecutarAuditoriaConFiltros(auditConfig) {
  const startTime = Date.now();
  logEvent('AUDIT_FILTERED', `Iniciando auditoría con filtros: ${JSON.stringify(auditConfig)}`);
  
  try {
    const servicios = auditConfig.services || [];
    const filtros = auditConfig.filters || {};
    const resultados = {};
    let totalRegistros = 0;
    
    // Guardar filtros en configuración del usuario
    if (filtros.ga4Properties || filtros.gtmWorkspaces) {
      const userProperties = PropertiesService.getUserProperties();
      if (filtros.ga4Properties && filtros.ga4Properties.length > 0) {
        userProperties.setProperty('ADDOCU_GA4_PROPERTIES_FILTER', filtros.ga4Properties.join(','));
      }
      if (filtros.gtmWorkspaces && filtros.gtmWorkspaces.length > 0) {
        userProperties.setProperty('ADDOCU_GTM_WORKSPACES_FILTER', filtros.gtmWorkspaces.join(','));
      }
      logEvent('AUDIT_FILTERED', `Filtros guardados: GA4=${filtros.ga4Properties?.length || 0}, GTM=${filtros.gtmWorkspaces?.length || 0}`);
    }
    
    // Auditar GA4 con filtros
    if (servicios.includes('ga4')) {
      logEvent('AUDIT_FILTERED', 'Iniciando auditoría GA4 con filtros de propiedades');
      const resultadoGA4 = sincronizarGA4Core();
      resultados.ga4 = resultadoGA4;
      totalRegistros += resultadoGA4.registros || 0;
    }
    
    // Auditar GTM con filtros
    if (servicios.includes('gtm')) {
      logEvent('AUDIT_FILTERED', 'Iniciando auditoría GTM con filtros de workspaces');
      const resultadoGTM = sincronizarGTMCore();
      resultados.gtm = resultadoGTM;
      totalRegistros += resultadoGTM.registros || 0;
    }
    
    // Auditar Looker Studio
    if (servicios.includes('looker')) {
      logEvent('AUDIT_FILTERED', 'Iniciando auditoría Looker Studio');
      const resultadoLooker = sincronizarLookerStudioCore();
      resultados.looker = resultadoLooker;
      totalRegistros += resultadoLooker.registros || 0;
    }
    
    // Generar dashboard ejecutivo
    generarDashboardEjecutivo(resultados);
    
    const duration = Date.now() - startTime;
    logEvent('AUDIT_FILTERED', `Auditoría con filtros completada en ${Math.round(duration / 1000)}s. Total: ${totalRegistros} registros`);
    
    flushLogs();
    
    return {
      success: true,
      servicios: servicios,
      filtros: filtros,
      resultados: resultados,
      totalRegistros: totalRegistros,
      duracion: duration
    };
    
  } catch (e) {
    const duration = Date.now() - startTime;
    logError('AUDIT_FILTERED', `Error en auditoría con filtros: ${e.message}`);
    flushLogs();
    
    return {
      success: false,
      error: e.message,
      duracion: duration
    };
  }
}

/**
 * Ejecuta una auditoría completa de los servicios especificados.
 * @param {Array} servicios - Array con los servicios a auditar ['ga4', 'gtm', 'looker'].
 * @returns {Object} Resultado de la auditoría.
 */
function ejecutarAuditoriaCompleta(servicios) {
  const startTime = Date.now();
  logEvent('AUDIT', `Iniciando auditoría completa: ${servicios.join(', ')}`);
  
  try {
    const resultados = {};
    let totalRegistros = 0;
    
    // Auditar GA4 (Gratis)
    if (servicios.includes('ga4')) {
      logEvent('AUDIT', 'Iniciando auditoría GA4');
      const resultadoGA4 = sincronizarGA4Core();
      resultados.ga4 = resultadoGA4;
      totalRegistros += resultadoGA4.registros || 0;
    }
    
    // Auditar GTM
    if (servicios.includes('gtm')) {
      logEvent('AUDIT', 'Iniciando auditoría GTM');
      const resultadoGTM = sincronizarGTMCore();
      resultados.gtm = resultadoGTM;
      totalRegistros += resultadoGTM.registros || 0;
    }
    
    // Auditar Looker Studio
    if (servicios.includes('looker')) {
      logEvent('AUDIT', 'Iniciando auditoría Looker Studio');
      const resultadoLooker = sincronizarLookerStudioCore();
      resultados.looker = resultadoLooker;
      totalRegistros += resultadoLooker.registros || 0;
    }
    
    // Generar dashboard ejecutivo
    generarDashboardEjecutivo(resultados);
    
    const duration = Date.now() - startTime;
    logEvent('AUDIT', `Auditoría completada en ${Math.round(duration / 1000)}s. Total: ${totalRegistros} registros`);
    
    flushLogs();
    
    return {
      success: true,
      servicios: servicios,
      resultados: resultados,
      totalRegistros: totalRegistros,
      duracion: duration
    };
    
  } catch (e) {
    const duration = Date.now() - startTime;
    logError('AUDIT', `Error en auditoría: ${e.message}`);
    flushLogs();
    
    return {
      success: false,
      error: e.message,
      duracion: duration
    };
  }
}



// =================================================================
// ORQUESTACIÓN DE SINCRONIZACIÓN CON UI
// =================================================================

/**
 * Función para iniciar auditoría completa desde el menú.
 */
function iniciarAuditoriaCompleta() {
  const config = leerConfiguracionUsuario();
  
  const servicios = ['ga4']; // GA4 siempre incluido (gratis)
  
  if (config.syncGTM) {
    servicios.push('gtm');
  }
  
  if (config.syncLooker) {
    servicios.push('looker');
  }
  
  const ui = SpreadsheetApp.getUi();
  ui.alert(
    '🚀 Auditoría de Stack de Marketing (Open Source)',
    `Iniciando auditoría de: ${servicios.map(s => s.toUpperCase()).join(', ')}\n\n` +
    'Este proceso puede tardar varios minutos dependiendo del tamaño de tu setup.\n\n' +
    'Todas las funcionalidades disponibles gratuitamente!',
    ui.ButtonSet.OK
  );
  
  const resultado = ejecutarAuditoriaCompleta(servicios);
  
  if (resultado.success) {
    const mensaje = `✅ Auditoría completada en ${Math.round(resultado.duracion / 1000)} segundos\n\n` +
      `Total de elementos auditados: ${resultado.totalRegistros}\n\n` +
      'Revisa las hojas generadas para ver los detalles completos.';
    
    ui.alert('🎉 Auditoría Finalizada', mensaje, ui.ButtonSet.OK);
  } else {
    ui.alert(
      '❌ Error en la Auditoría',
      `Ocurrió un error: ${resultado.error}\n\nRevisa la hoja "LOGS" para más detalles.`,
      ui.ButtonSet.OK
    );
  }
}

/**
 * Sincronizar solo GA4 (función gratuita con OAuth2).
 */
function sincronizarGA4ConUI() {
  const ui = SpreadsheetApp.getUi();
  ui.alert(
    '📊 Auditoría GA4',
    'Iniciando auditoría completa de Google Analytics 4 con OAuth2...',
    ui.ButtonSet.OK
  );
  
  try {
    const resultado = sincronizarGA4Core();
    
    if (resultado.estado === 'SUCCESS') {
      ui.alert(
        '✅ GA4 Sincronizado',
        `Auditoría completada: ${resultado.registros} elementos procesados\n\n` +
        'Revisa las hojas GA4_* para ver los detalles.',
        ui.ButtonSet.OK
      );
    } else {
      ui.alert(
        '❌ Error en GA4',
        `Error: ${resultado.error}\n\nRevisa la hoja LOGS para más información.`,
        ui.ButtonSet.OK
      );
    }
  } catch (e) {
    logError('GA4_UI', `Error en sincronización GA4: ${e.message}`);
    ui.alert('Error', `No se pudo sincronizar GA4: ${e.message}`, ui.ButtonSet.OK);
  }
}

/**
 * Sincronizar GTM (función con OAuth2).
 */
function sincronizarGTMConUI() {
  
  const ui = SpreadsheetApp.getUi();
  ui.alert(
    '🏷️ Auditoría GTM',
    'Iniciando auditoría completa de Google Tag Manager...',
    ui.ButtonSet.OK
  );
  
  try {
    const resultado = sincronizarGTMCore();
    
    if (resultado.estado === 'SUCCESS') {
      ui.alert(
        '✅ GTM Sincronizado',
        `Auditoría completada: ${resultado.registros} elementos procesados\n\n` +
        'Revisa las hojas GTM_* para ver los detalles.',
        ui.ButtonSet.OK
      );
    } else {
      ui.alert(
        '❌ Error en GTM',
        `Error: ${resultado.error}\n\nRevisa la hoja LOGS para más información.`,
        ui.ButtonSet.OK
      );
    }
  } catch (e) {
    logError('GTM_UI', `Error en sincronización GTM: ${e.message}`);
    ui.alert('Error', `No se pudo sincronizar GTM: ${e.message}`, ui.ButtonSet.OK);
  }
}

/**
 * Sincronizar Looker Studio (función con OAuth2).
 */
function sincronizarLookerStudioConUI() {
  
  const ui = SpreadsheetApp.getUi();
  ui.alert(
    '📈 Auditoría Looker Studio',
    'Iniciando auditoría completa de Looker Studio con OAuth2...\n\nNOTA: Looker Studio ahora requiere OAuth2 (las API Keys ya no son soportadas por Google).',
    ui.ButtonSet.OK
  );
  
  try {
    const resultado = sincronizarLookerStudioCore();
    
    if (resultado.estado === 'SUCCESS') {
      ui.alert(
        '✅ Looker Studio Sincronizado',
        `Auditoría completada: ${resultado.registros} elementos procesados\n\n` +
        'Revisa la hoja LOOKER_STUDIO para ver los detalles.',
        ui.ButtonSet.OK
      );
    } else {
      ui.alert(
        '❌ Error en Looker Studio',
        `Error: ${resultado.error}\n\nRevisa la hoja LOGS para más información.`,
        ui.ButtonSet.OK
      );
    }
  } catch (e) {
    logError('LOOKER_UI', `Error en sincronización Looker Studio: ${e.message}`);
    ui.alert('Error', `No se pudo sincronizar Looker Studio: ${e.message}`, ui.ButtonSet.OK);
  }
}

// =================================================================
// DASHBOARD Y ANÁLISIS
// =================================================================

/**
 * Genera dashboard ejecutivo manual.
 */
function generarDashboardManual() {
  try {
    logEvent('DASHBOARD', 'Generando dashboard ejecutivo manual');
    
    // Generar dashboard con datos actuales
    generarDashboardEjecutivo({});
    
    SpreadsheetApp.getUi().alert(
      '📊 Dashboard Generado',
      'El dashboard ejecutivo ha sido actualizado en la hoja DASHBOARD.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
  } catch (e) {
    logError('DASHBOARD', `Error generando dashboard: ${e.message}`);
    SpreadsheetApp.getUi().alert(
      'Error',
      `No se pudo generar el dashboard: ${e.message}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Genera y actualiza la hoja DASHBOARD con un resumen ejecutivo.
 */
function generarDashboardEjecutivo(resultados) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let dashboardSheet = ss.getSheetByName('DASHBOARD');
    
    if (!dashboardSheet) {
      dashboardSheet = ss.insertSheet('DASHBOARD', 0);
    }
    
    dashboardSheet.clear();
    
    // Header del dashboard - Escribir fila por fila para evitar errores de dimensiones
    dashboardSheet.getRange(1, 1).setValue('🚀 ADDOCU - DASHBOARD EJECUTIVO (OPEN SOURCE)');
    dashboardSheet.getRange(2, 1).setValue(`Generado: ${new Date().toLocaleString('es-ES')}`);
    dashboardSheet.getRange(3, 1).setValue('');
    dashboardSheet.getRange(4, 1).setValue('📊 RESUMEN DE AUDITORÍA');
    
    // Headers de la tabla de servicios
    const tableHeaders = ['Servicio', 'Estado', 'Elementos', 'Última Actualización'];
    dashboardSheet.getRange(5, 1, 1, 4).setValues([tableHeaders]);
    
    // Datos de servicios
    const serviciosData = [
      ['Google Analytics 4', obtenerEstadoServicio('GA4'), contarElementosGA4(), obtenerUltimaActualizacion('GA4')],
      ['Google Tag Manager', obtenerEstadoServicio('GTM'), contarElementosGTM(), obtenerUltimaActualizacion('GTM')],
      ['Looker Studio', obtenerEstadoServicio('LOOKER'), contarElementosLooker(), obtenerUltimaActualizacion('LOOKER')]
    ];
    
    dashboardSheet.getRange(6, 1, serviciosData.length, 4).setValues(serviciosData);
    
    // Formato
    dashboardSheet.getRange(1, 1).setFontSize(16).setFontWeight('bold');
    dashboardSheet.getRange(4, 1).setFontSize(14).setFontWeight('bold');
    dashboardSheet.getRange(5, 1, 1, 4).setFontWeight('bold').setBackground('#E8F0FE');
    
    // Auto-resize columnas
    dashboardSheet.autoResizeColumns(1, 4);
    
    logEvent('DASHBOARD', 'Dashboard ejecutivo actualizado');
    
  } catch (e) {
    logError('DASHBOARD', `Error generando dashboard ejecutivo: ${e.message}`);
  }
}

// =================================================================
// UTILIDADES DE DASHBOARD
// =================================================================

function obtenerEstadoServicio(servicio) {
  const config = leerConfiguracionUsuario();
  
  switch (servicio) {
    case 'GA4':
      return '✅ Disponible (OAuth2)';
    case 'GTM':
      return '✅ Disponible (OAuth2)';
    case 'LOOKER':
      return '✅ Disponible (OAuth2) - API Keys obsoletas';
    default:
      return '❓ Desconocido';
  }
}

function contarElementosGA4() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ['GA4_PROPERTIES', 'GA4_CUSTOM_DIMENSIONS', 'GA4_CUSTOM_METRICS', 'GA4_DATA_STREAMS'];
    
    let total = 0;
    sheets.forEach(sheetName => {
      const sheet = ss.getSheetByName(sheetName);
      if (sheet) {
        total += Math.max(0, sheet.getLastRow() - 1); // -1 para excluir header
      }
    });
    
    return total;
  } catch (e) {
    return 0;
  }
}

function contarElementosGTM() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ['GTM_TAGS', 'GTM_TRIGGERS', 'GTM_VARIABLES'];
    
    let total = 0;
    sheets.forEach(sheetName => {
      const sheet = ss.getSheetByName(sheetName);
      if (sheet) {
        total += Math.max(0, sheet.getLastRow() - 1);
      }
    });
    
    return total;
  } catch (e) {
    return 0;
  }
}

function contarElementosLooker() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('LOOKER_STUDIO');
    
    return sheet ? Math.max(0, sheet.getLastRow() - 1) : 0;
  } catch (e) {
    return 0;
  }
}

function obtenerUltimaActualizacion(servicio) {
  try {
    const userProperties = PropertiesService.getUserProperties();
    const timestamp = userProperties.getProperty(`ADDOCU_LAST_SYNC_${servicio}`);
    
    if (timestamp) {
      return new Date(parseInt(timestamp)).toLocaleString('es-ES');
    }
    
    return 'Nunca';
  } catch (e) {
    return 'Error';
  }
}

// =================================================================
// HERRAMIENTAS Y DIAGNÓSTICOS
// =================================================================

/**
 * Diagnostica las conexiones OAuth2 y API Key y muestra el resultado.
 */
function diagnosticarConexiones() {
  try {
    const resultados = diagnosticarConexionesCompleto();
    
    let mensaje = '🔒 DIAGNÓSTICO DE CONECTIVIDAD OAuth2\n\n';
    resultados.forEach(resultado => {
      const status = resultado[2] === 'OK' ? '✅' : '❌';
      mensaje += `${status} ${resultado[0]}: ${resultado[2]}\n`;
      if (resultado[1] && resultado[1] !== 'N/A') {
        mensaje += `   ${resultado[1]}\n`;
      }
      if (resultado[3]) {
        mensaje += `   ${resultado[3]}\n`;
      }
    });
    
    const oauth2Results = resultados.filter(r => 
      r[0].includes('Analytics') || r[0].includes('Tag Manager')
    );
    const oauth2Ok = oauth2Results.every(r => r[2] === 'OK');
    
    if (oauth2Ok) {
      mensaje += '\n🎉 OAuth2 funcionando correctamente para GA4 y GTM!';
    } else {
      mensaje += '\n⚠️ OAuth2 necesita autorización. Ejecuta una auditoría para autorizar automáticamente.';
    }
    
    SpreadsheetApp.getUi().alert('Diagnóstico de Conectividad', mensaje, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (e) {
    SpreadsheetApp.getUi().alert(
      'Error en Diagnóstico',
      `No se pudo completar el diagnóstico: ${e.message}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Prueba específicamente OAuth2 para GA4 y GTM.
 */
function probarOAuth2() {
  try {
    const token = ScriptApp.getOAuthToken();
    
    if (!token) {
      SpreadsheetApp.getUi().alert(
        '⚠️ OAuth2 No Autorizado',
        'El script no tiene permisos OAuth2. Ejecuta "Auditar GA4" para autorizar automáticamente.',
        SpreadsheetApp.getUi().ButtonSet.OK
      );
      return;
    }
    
    // Probar GA4
    const ga4Result = validateService('ga4');
    
    // Probar GTM
    const gtmResult = validateService('gtm');
    
    const mensaje = `🔒 PRUEBA OAUTH2\n\n` +
      `✅ Token OAuth2: Disponible\n` +
      `📈 GA4: ${ga4Result.estado} - ${ga4Result.mensaje}\n` +
      `🏷️ GTM: ${gtmResult.estado} - ${gtmResult.mensaje}\n\n` +
      `Usuario: ${Session.getActiveUser().getEmail()}`;
    
    SpreadsheetApp.getUi().alert('Prueba OAuth2', mensaje, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (e) {
    SpreadsheetApp.getUi().alert(
      'Error OAuth2',
      `Error probando OAuth2: ${e.message}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Función de UI para iniciar el análisis de cambios recientes.
 */
function analizarCambiosRecientesUI() {
  
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Analizar Cambios Recientes',
    'Introduce el número de días hacia atrás que quieres analizar (ej. 7).',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) return;

  const dias = parseInt(response.getResponseText());
  if (isNaN(dias) || dias <= 0) {
    ui.alert('Error', 'Por favor, introduce un número válido y positivo.', ui.ButtonSet.OK);
    return;
  }
  
  // TODO: Implementar análisis de cambios recientes
  ui.alert(
    'Función en Desarrollo',
    `El análisis de cambios recientes para los últimos ${dias} días estará disponible próximamente.`,
    ui.ButtonSet.OK
  );
}

/**
 * Limpia los logs antiguos.
 */
function cleanupLogsUI() {
  const ui = SpreadsheetApp.getUi();
  const result = ui.alert(
    'Limpiar Logs',
    '¿Estás seguro de que quieres limpiar todos los logs antiguos?',
    ui.ButtonSet.YES_NO
  );
  
  if (result === ui.Button.YES) {
    try {
      // TODO: Implementar limpieza de logs basada en configuración de retención
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const logsSheet = ss.getSheetByName('LOGS');
      
      if (logsSheet) {
        logsSheet.clear();
        // Recrear header
        logsSheet.getRange(1, 1, 1, 4).setValues([['Timestamp', 'Nivel', 'Módulo', 'Mensaje']]);
        logsSheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#E8F0FE');
      }
      
      ui.alert('✅ Logs Limpiados', 'Los logs han sido limpiados correctamente.', ui.ButtonSet.OK);
      
      logEvent('MAINTENANCE', 'Logs limpiados manualmente');
      
    } catch (e) {
      ui.alert('Error', `No se pudieron limpiar los logs: ${e.message}`, ui.ButtonSet.OK);
    }
  }
}

// =================================================================
// FUNCIONES CORE DE SINCRONIZACIÓN (para sidebar)
// =================================================================

/**
 * Función principal de sincronización GA4 (llamada desde sidebar).
 * @returns {Object} Resultado de la sincronización.
 */
function sincronizarGA4() {
  try {
    logEvent('GA4_SYNC', 'Iniciando sincronización GA4 desde sidebar');
    
    const resultado = sincronizarGA4Core();
    
    return {
      success: resultado.estado === 'SUCCESS',
      error: resultado.error || null,
      registros: resultado.registros || 0
    };
    
  } catch (e) {
    logError('GA4_SYNC', `Error en sincronización GA4: ${e.message}`);
    return {
      success: false,
      error: e.message,
      registros: 0
    };
  }
}

/**
 * Función core de sincronización GA4 con OAuth2.
 * @returns {Object} Resultado detallado de la sincronización.
 */
function sincronizarGA4Core() {
  const startTime = Date.now();
  logEvent('GA4_CORE', 'Iniciando sincronización core de GA4 con OAuth2');
  
  try {
    // Verificar autenticación OAuth2
    const oauthToken = ScriptApp.getOAuthToken();
    if (!oauthToken) {
      throw new Error('No se pudo obtener el token OAuth2. Autoriza el script primero.');
    }
    
    let totalRegistros = 0;
    
    // 1. Sincronizar cuentas GA4
    const cuentas = sincronizarCuentasGA4();
    totalRegistros += cuentas.length;
    
    // 2. Sincronizar propiedades GA4
    const propiedades = sincronizarPropiedadesGA4(cuentas);
    totalRegistros += propiedades.length;
    
    // 3. Sincronizar dimensiones personalizadas
    const dimensiones = sincronizarDimensionesGA4(propiedades);
    totalRegistros += dimensiones.length;
    
    // 4. Sincronizar métricas personalizadas
    const metricas = sincronizarMetricasGA4(propiedades);
    totalRegistros += metricas.length;
    
    // 5. Sincronizar flujos de datos
    const streams = sincronizarDataStreamsGA4(propiedades);
    totalRegistros += streams.length;
    
    const duration = Date.now() - startTime;
    
    // Actualizar timestamp de última sincronización
    const userProperties = PropertiesService.getUserProperties();
    userProperties.setProperty('ADDOCU_LAST_SYNC_GA4', Date.now().toString());
    
    logEvent('GA4_CORE', `Sincronización GA4 completada en ${Math.round(duration / 1000)}s. Total: ${totalRegistros} registros`);
    
    flushLogs();
    
    return {
      estado: 'SUCCESS',
      registros: totalRegistros,
      duracion: duration,
      detalles: {
        cuentas: cuentas.length,
        propiedades: propiedades.length,
        dimensiones: dimensiones.length,
        metricas: metricas.length,
        streams: streams.length
      }
    };
    
  } catch (e) {
    const duration = Date.now() - startTime;
    logError('GA4_CORE', `Error en sincronización GA4: ${e.message}`);
    flushLogs();
    
    return {
      estado: 'ERROR',
      error: e.message,
      registros: 0,
      duracion: duration
    };
  }
}

/**
 * Sincroniza las cuentas de GA4 usando OAuth2.
 * @returns {Array} Array de cuentas.
 */
function sincronizarCuentasGA4() {
  try {
    const auth = getAuthConfig('ga4');
    const url = 'https://analyticsadmin.googleapis.com/v1beta/accounts';
    
    const response = fetchConOAuth2(url);
    const cuentas = response.accounts || [];
    
    // Escribir a hoja
    const headers = ['Account Name', 'Account ID', 'Display Name', 'Region Code', 'Create Time', 'Update Time'];
    const data = cuentas.map(cuenta => [
      cuenta.name || '',
      cuenta.name ? cuenta.name.split('/')[1] : '',
      cuenta.displayName || '',
      cuenta.regionCode || '',
      formatDate(cuenta.createTime),
      formatDate(cuenta.updateTime)
    ]);
    
    writeToSheet('GA4_ACCOUNTS', headers, data, true);
    
    logEvent('GA4_ACCOUNTS', `${cuentas.length} cuentas GA4 sincronizadas`);
    return cuentas;
    
  } catch (e) {
    logError('GA4_ACCOUNTS', `Error sincronizando cuentas GA4: ${e.message}`);
    return [];
  }
}

/**
 * Sincroniza las propiedades de GA4.
 * @param {Array} cuentas - Array de cuentas GA4.
 * @returns {Array} Array de propiedades.
 */
function sincronizarPropiedadesGA4(cuentas) {
  try {
    const todasPropiedades = [];
    
    cuentas.forEach(cuenta => {
      try {
        const url = `https://analyticsadmin.googleapis.com/v1beta/${cuenta.name}/properties`;
        const response = fetchConOAuth2(url);
        const propiedades = response.properties || [];
        
        propiedades.forEach(prop => {
          prop.parentAccount = cuenta.name;
          todasPropiedades.push(prop);
        });
        
      } catch (e) {
        logWarning('GA4_PROPERTIES', `Error en cuenta ${cuenta.name}: ${e.message}`);
      }
    });
    
    // Escribir a hoja
    const headers = ['Property Name', 'Property ID', 'Display Name', 'Parent Account', 'Industry Category', 'Time Zone', 'Currency Code', 'Create Time'];
    const data = todasPropiedades.map(prop => [
      prop.name || '',
      prop.name ? prop.name.split('/')[1] : '',
      prop.displayName || '',
      prop.parentAccount || '',
      prop.industryCategory || '',
      prop.timeZone || '',
      prop.currencyCode || '',
      formatDate(prop.createTime)
    ]);
    
    writeToSheet('GA4_PROPERTIES', headers, data, true);
    
    logEvent('GA4_PROPERTIES', `${todasPropiedades.length} propiedades GA4 sincronizadas`);
    return todasPropiedades;
    
  } catch (e) {
    logError('GA4_PROPERTIES', `Error sincronizando propiedades GA4: ${e.message}`);
    return [];
  }
}

/**
 * Sincroniza las dimensiones personalizadas de GA4.
 * @param {Array} propiedades - Array de propiedades GA4.
 * @returns {Array} Array de dimensiones.
 */
function sincronizarDimensionesGA4(propiedades) {
  try {
    const todasDimensiones = [];
    
    propiedades.forEach(propiedad => {
      try {
        const url = `https://analyticsadmin.googleapis.com/v1beta/${propiedad.name}/customDimensions`;
        const response = fetchConOAuth2(url);
        const dimensiones = response.customDimensions || [];
        
        dimensiones.forEach(dim => {
          dim.parentProperty = propiedad.name;
          dim.propertyDisplayName = propiedad.displayName;
          todasDimensiones.push(dim);
        });
        
      } catch (e) {
        logWarning('GA4_DIMENSIONS', `Error en propiedad ${propiedad.name}: ${e.message}`);
      }
    });
    
    // Escribir a hoja
    const headers = ['Dimension Name', 'Parameter Name', 'Display Name', 'Description', 'Scope', 'Property', 'Property Display Name'];
    const data = todasDimensiones.map(dim => [
      dim.name || '',
      dim.parameterName || '',
      dim.displayName || '',
      dim.description || '',
      dim.scope || '',
      dim.parentProperty || '',
      dim.propertyDisplayName || ''
    ]);
    
    writeToSheet('GA4_CUSTOM_DIMENSIONS', headers, data, true);
    
    logEvent('GA4_DIMENSIONS', `${todasDimensiones.length} dimensiones personalizadas GA4 sincronizadas`);
    return todasDimensiones;
    
  } catch (e) {
    logError('GA4_DIMENSIONS', `Error sincronizando dimensiones GA4: ${e.message}`);
    return [];
  }
}

/**
 * Sincroniza las métricas personalizadas de GA4.
 * @param {Array} propiedades - Array de propiedades GA4.
 * @returns {Array} Array de métricas.
 */
function sincronizarMetricasGA4(propiedades) {
  try {
    const todasMetricas = [];
    
    propiedades.forEach(propiedad => {
      try {
        const url = `https://analyticsadmin.googleapis.com/v1beta/${propiedad.name}/customMetrics`;
        const response = fetchConOAuth2(url);
        const metricas = response.customMetrics || [];
        
        metricas.forEach(metric => {
          metric.parentProperty = propiedad.name;
          metric.propertyDisplayName = propiedad.displayName;
          todasMetricas.push(metric);
        });
        
      } catch (e) {
        logWarning('GA4_METRICS', `Error en propiedad ${propiedad.name}: ${e.message}`);
      }
    });
    
    // Escribir a hoja
    const headers = ['Metric Name', 'Parameter Name', 'Display Name', 'Description', 'Measurement Unit', 'Scope', 'Property', 'Property Display Name'];
    const data = todasMetricas.map(metric => [
      metric.name || '',
      metric.parameterName || '',
      metric.displayName || '',
      metric.description || '',
      metric.measurementUnit || '',
      metric.scope || '',
      metric.parentProperty || '',
      metric.propertyDisplayName || ''
    ]);
    
    writeToSheet('GA4_CUSTOM_METRICS', headers, data, true);
    
    logEvent('GA4_METRICS', `${todasMetricas.length} métricas personalizadas GA4 sincronizadas`);
    return todasMetricas;
    
  } catch (e) {
    logError('GA4_METRICS', `Error sincronizando métricas GA4: ${e.message}`);
    return [];
  }
}

/**
 * Sincroniza los flujos de datos de GA4.
 * @param {Array} propiedades - Array de propiedades GA4.
 * @returns {Array} Array de data streams.
 */
function sincronizarDataStreamsGA4(propiedades) {
  try {
    const todosStreams = [];
    
    propiedades.forEach(propiedad => {
      try {
        const url = `https://analyticsadmin.googleapis.com/v1beta/${propiedad.name}/dataStreams`;
        const response = fetchConOAuth2(url);
        const streams = response.dataStreams || [];
        
        streams.forEach(stream => {
          stream.parentProperty = propiedad.name;
          stream.propertyDisplayName = propiedad.displayName;
          todosStreams.push(stream);
        });
        
      } catch (e) {
        logWarning('GA4_STREAMS', `Error en propiedad ${propiedad.name}: ${e.message}`);
      }
    });
    
    // Escribir a hoja
    const headers = ['Stream Name', 'Stream ID', 'Display Name', 'Type', 'Web Stream Data', 'Property', 'Property Display Name', 'Create Time'];
    const data = todosStreams.map(stream => [
      stream.name || '',
      stream.name ? stream.name.split('/').pop() : '',
      stream.displayName || '',
      stream.type || '',
      stream.webStreamData ? JSON.stringify(stream.webStreamData) : '',
      stream.parentProperty || '',
      stream.propertyDisplayName || '',
      formatDate(stream.createTime)
    ]);
    
    writeToSheet('GA4_DATA_STREAMS', headers, data, true);
    
    logEvent('GA4_STREAMS', `${todosStreams.length} flujos de datos GA4 sincronizados`);
    return todosStreams;
    
  } catch (e) {
    logError('GA4_STREAMS', `Error sincronizando data streams GA4: ${e.message}`);
    return [];
  }
}

/**
 * Función core de sincronización GTM con OAuth2 (coordinador).
 * @returns {Object} Resultado de la sincronización.
 */
function sincronizarGTMCore() {
  // La función real ya está implementada en gtm.js
  // Esta es solo una referencia desde el coordinador
  const startTime = Date.now();
  
  try {
    logEvent('GTM_COORD', 'Iniciando sincronización GTM desde coordinador');
    
    // Verificar autenticación
    const auth = getAuthConfig('gtm');
    if (!auth.oauthToken) {
      throw new Error('OAuth2 token no disponible para GTM');
    }
    
    // Ejecutar la sincronización real desde gtm.js
    const resultado = timeOperation('GTM_Core_Sync', () => {
      // Llamar a la función global implementada en gtm.js
      return global_sincronizarGTMCore ? global_sincronizarGTMCore() : sincronizarGTMConUI_Internal();
    });
    
    const duration = Date.now() - startTime;
    logEvent('GTM_COORD', `Coordinación GTM completada en ${Math.round(duration / 1000)}s`);
    
    return resultado;
    
  } catch (e) {
    const duration = Date.now() - startTime;
    logError('GTM_COORD', `Error en coordinación GTM: ${e.message}`);
    
    return {
      estado: 'ERROR',
      error: e.message,
      registros: 0,
      duracion: duration
    };
  }
}

/**
 * Función interna para ejecutar la sincronización GTM real.
 * @returns {Object} Resultado de la sincronización.
 */
function sincronizarGTMConUI_Internal() {
  try {
    // Ejecutar la lógica real de sincronización GTM
    const startTime = Date.now();
    const serviceName = 'gtm';
    const resultados = { 
      contenedoresEncontrados: 0, 
      contenedoresProcesados: 0, 
      tags: 0, 
      variables: 0, 
      triggers: 0, 
      errores: [] 
    };

    // Verificar autenticación
    const authConfig = getAuthConfig(serviceName);
    logSyncStart('GTM_Sync', authConfig.authUser);

    // Obtener contenedores
    const todosLosContenedores = obtenerTodosLosContenedoresGTM() || [];
    resultados.contenedoresEncontrados = todosLosContenedores.length;
    
    if (todosLosContenedores.length === 0) {
      const duration = Date.now() - startTime;
      return { estado: 'SUCCESS', registros: 0, duracion: duration, detalles: resultados };
    }

    // Filtrar contenedores según configuración
    const contenedoresObjetivo = obtenerContenedoresObjetivoDesdeConfig();
    const contenedoresAProcesar = contenedoresObjetivo.length > 0
      ? todosLosContenedores.filter(c => contenedoresObjetivo.includes(c.name))
      : todosLosContenedores;

    if (contenedoresAProcesar.length === 0) {
      const duration = Date.now() - startTime;
      return { estado: 'SUCCESS', registros: 0, duracion: duration, detalles: resultados };
    }

    // Recolectar datos de todos los contenedores
    const datosAgregados = recolectarDatosDeContenedores(contenedoresAProcesar, resultados.errores);
    
    // Escribir datos a las hojas
    escribirDatosAgregadosGTM(datosAgregados);
    
    // Actualizar resultados
    resultados.tags = datosAgregados.tags.length;
    resultados.variables = datosAgregados.variables.length;
    resultados.triggers = datosAgregados.triggers.length;
    resultados.contenedoresProcesados = contenedoresAProcesar.length - resultados.errores.length;

    const totalElementos = resultados.tags + resultados.variables + resultados.triggers;
    const duration = Date.now() - startTime;
    
    return { estado: 'SUCCESS', registros: totalElementos, duracion: duration, detalles: resultados };

  } catch (error) {
    logError('GTM_INTERNAL', `Error en sincronización GTM interna: ${error.message}`);
    return { estado: 'ERROR', registros: 0, duracion: 0, error: error.message };
  }
}

/**
 * Función core de sincronización Looker Studio con OAuth2.
 * @returns {Object} Resultado de la sincronización.
 */
function sincronizarLookerStudioCore() {
  const startTime = Date.now();
  logEvent('LOOKER_CORE', 'Iniciando sincronización core de Looker Studio con OAuth2');
  
  try {
    // Verificar que tenemos OAuth2 (API Keys ya no son soportadas)
    const auth = getAuthConfig('lookerStudio');
    
    if (auth.authType !== 'oauth2') {
      throw new Error('Looker Studio API requiere OAuth2. Las API Keys ya no son soportadas por Google.');
    }
    
    if (!auth.oauthToken) {
      throw new Error('OAuth2 token requerido para Looker Studio. Autoriza el script primero.');
    }
    
    // Llamar a la función de looker_studio.js
    const resultado = timeOperation('Looker_Studio_Sync', () => {
      return typeof sincronizarLookerStudioCore !== 'undefined' ? 
        sincronizarLookerStudioCore() : 
        { estado: 'ERROR', error: 'Módulo Looker Studio no disponible', registros: 0 };
    });
    
    const duration = Date.now() - startTime;
    
    // Actualizar timestamp de última sincronización
    if (resultado.estado === 'SUCCESS') {
      const userProperties = PropertiesService.getUserProperties();
      userProperties.setProperty('ADDOCU_LAST_SYNC_LOOKER', Date.now().toString());
    }
    
    logEvent('LOOKER_CORE', `Sincronización Looker Studio completada en ${Math.round(duration / 1000)}s`);
    
    return {
      estado: resultado.estado || 'SUCCESS',
      registros: resultado.registros || 0,
      duracion: duration,
      error: resultado.error
    };
    
  } catch (e) {
    const duration = Date.now() - startTime;
    logError('LOOKER_CORE', `Error en sincronización Looker Studio: ${e.message}`);
    
    return {
      estado: 'ERROR',
      error: e.message,
      registros: 0,
      duracion: duration
    };
  }
}