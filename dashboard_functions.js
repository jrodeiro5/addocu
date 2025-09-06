/**
 * Validación de carga del módulo dashboard_functions.js
 * @returns {boolean} true si el módulo está cargado
 */
function isDashboardFunctionsLoaded() {
  logEvent('DASHBOARD_VALIDATION', 'Módulo dashboard_functions.js cargado correctamente');
  return true;
}

/**
 * Función para obtener datos del dashboard para el HTML interactivo.
 * Esta función es llamada desde dashboard.html
 * @returns {Object} Datos estructurados para el dashboard
 */
function getHtmlDashboardData() {
  try {
    logEvent('DASHBOARD_HTML', 'Iniciando recolección de datos para dashboard HTML');
    
    // Recolectar KPIs principales
    const kpis = {
      totalAssets: 0,
      totalReports: 0,
      totalProperties: 0,
      totalTags: 0,
      totalVariables: 0,
      totalTriggers: 0,
      totalContainers: 0,
      totalDimensions: 0,
      totalMetrics: 0,
      totalStreams: 0
    };
    
    // Contar elementos de cada servicio
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Looker Studio
    const lookerSheet = ss.getSheetByName('LOOKER_STUDIO');
    if (lookerSheet && lookerSheet.getLastRow() > 1) {
      kpis.totalReports = lookerSheet.getLastRow() - 1;
    }
    
    // GA4
    const ga4PropsSheet = ss.getSheetByName('GA4_PROPERTIES');
    if (ga4PropsSheet && ga4PropsSheet.getLastRow() > 1) {
      kpis.totalProperties = ga4PropsSheet.getLastRow() - 1;
    }
    
    const ga4DimsSheet = ss.getSheetByName('GA4_CUSTOM_DIMENSIONS');
    if (ga4DimsSheet && ga4DimsSheet.getLastRow() > 1) {
      kpis.totalDimensions = ga4DimsSheet.getLastRow() - 1;
    }
    
    const ga4MetricsSheet = ss.getSheetByName('GA4_CUSTOM_METRICS');
    if (ga4MetricsSheet && ga4MetricsSheet.getLastRow() > 1) {
      kpis.totalMetrics = ga4MetricsSheet.getLastRow() - 1;
    }
    
    const ga4StreamsSheet = ss.getSheetByName('GA4_DATA_STREAMS');
    if (ga4StreamsSheet && ga4StreamsSheet.getLastRow() > 1) {
      kpis.totalStreams = ga4StreamsSheet.getLastRow() - 1;
    }
    
    // GTM
    const gtmTagsSheet = ss.getSheetByName('GTM_TAGS');
    if (gtmTagsSheet && gtmTagsSheet.getLastRow() > 1) {
      kpis.totalTags = gtmTagsSheet.getLastRow() - 1;
    }
    
    const gtmVarsSheet = ss.getSheetByName('GTM_VARIABLES');
    if (gtmVarsSheet && gtmVarsSheet.getLastRow() > 1) {
      kpis.totalVariables = gtmVarsSheet.getLastRow() - 1;
    }
    
    const gtmTriggersSheet = ss.getSheetByName('GTM_TRIGGERS');
    if (gtmTriggersSheet && gtmTriggersSheet.getLastRow() > 1) {
      kpis.totalTriggers = gtmTriggersSheet.getLastRow() - 1;
    }
    
    // Contar contenedores únicos desde GTM_TAGS
    kpis.totalContainers = contarContenedoresUnicos();
    
    // Total de assets
    kpis.totalAssets = kpis.totalReports + kpis.totalProperties + kpis.totalTags + 
                      kpis.totalDimensions + kpis.totalMetrics + kpis.totalStreams + 
                      kpis.totalVariables + kpis.totalTriggers;
    
    // Análisis de calidad
    const calidad = analizarCalidadParaDashboard();
    
    // Datos para gráficos
    const charts = {
      elementosPorHerramienta: {
        categories: ['Looker Studio', 'Google Analytics 4', 'Google Tag Manager'],
        series: [{
          name: 'Assets',
          data: [
            kpis.totalReports,
            kpis.totalProperties + kpis.totalDimensions + kpis.totalMetrics + kpis.totalStreams,
            kpis.totalTags + kpis.totalVariables + kpis.totalTriggers
          ]
        }]
      },
      desgloseTagsGTM: generarDesgloseTagsGTM(),
      estadoTagsGTM: generarEstadoTagsGTM()
    };
    
    const resultado = {
      kpis: kpis,
      calidad: calidad,
      charts: charts,
      timestamp: new Date().toISOString(),
      usuario: Session.getActiveUser().getEmail()
    };
    
    logEvent('DASHBOARD_HTML', `Datos del dashboard generados correctamente. Total assets: ${kpis.totalAssets}`);
    
    return resultado;
    
  } catch (error) {
    logError('DASHBOARD_HTML', `Error generando datos del dashboard: ${error.message}`);
    
    return {
      error: true,
      message: error.message,
      kpis: {
        totalAssets: 0,
        totalReports: 0,
        totalProperties: 0,
        totalTags: 0,
        totalVariables: 0,
        totalTriggers: 0,
        totalContainers: 0
      },
      calidad: {},
      charts: {}
    };
  }
}

/**
 * Cuenta contenedores únicos desde la hoja GTM_TAGS
 * @returns {number} Número de contenedores únicos
 */
function contarContenedoresUnicos() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const gtmTagsSheet = ss.getSheetByName('GTM_TAGS');
    
    if (!gtmTagsSheet || gtmTagsSheet.getLastRow() <= 1) {
      return 0;
    }
    
    const data = gtmTagsSheet.getDataRange().getValues();
    const headers = data[0];
    const containerIndex = headers.indexOf('Container ID');
    
    if (containerIndex === -1) {
      return 0;
    }
    
    const contenedores = new Set();
    for (let i = 1; i < data.length; i++) {
      const containerId = data[i][containerIndex];
      if (containerId && containerId.trim()) {
        contenedores.add(containerId.trim());
      }
    }
    
    return contenedores.size;
    
  } catch (e) {
    logWarning('DASHBOARD_HTML', `Error contando contenedores únicos: ${e.message}`);
    return 0;
  }
}

/**
 * Analiza la calidad de datos para el dashboard
 * @returns {Object} Análisis de calidad simplificado
 */
function analizarCalidadParaDashboard() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const calidad = {
      activadoresHuerfanos: [],
      tagsSinActivador: [],
      erroresDetectados: 0
    };
    
    // Análisis básico de GTM Tags
    const gtmTagsSheet = ss.getSheetByName('GTM_TAGS');
    if (gtmTagsSheet && gtmTagsSheet.getLastRow() > 1) {
      const data = gtmTagsSheet.getDataRange().getValues();
      const headers = data[0];
      const triggerIndex = headers.indexOf('Firing Triggers') || headers.indexOf('Triggers');
      
      if (triggerIndex !== -1) {
        for (let i = 1; i < data.length; i++) {
          const triggers = data[i][triggerIndex];
          if (!triggers || triggers.toString().trim() === '' || triggers.toString().trim() === '[]') {
            calidad.tagsSinActivador.push(data[i][0] || `Tag ${i}`);
          }
        }
      }
    }
    
    calidad.erroresDetectados = calidad.activadoresHuerfanos.length + calidad.tagsSinActivador.length;
    
    return calidad;
    
  } catch (e) {
    logWarning('DASHBOARD_HTML', `Error en análisis de calidad: ${e.message}`);
    return { activadoresHuerfanos: [], tagsSinActivador: [], erroresDetectados: 0 };
  }
}

/**
 * Genera desglose de tipos de tags GTM para gráfico
 * @returns {Object} Datos para gráfico de tipos de tags
 */
function generarDesgloseTagsGTM() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const gtmTagsSheet = ss.getSheetByName('GTM_TAGS');
    
    if (!gtmTagsSheet || gtmTagsSheet.getLastRow() <= 1) {
      return { labels: ['Sin datos'], series: [1] };
    }
    
    const data = gtmTagsSheet.getDataRange().getValues();
    const headers = data[0];
    const typeIndex = headers.indexOf('Type') || headers.indexOf('Tag Type') || headers.indexOf('Tipo');
    
    if (typeIndex === -1) {
      return { labels: ['Sin datos'], series: [1] };
    }
    
    const tiposCounts = {};
    for (let i = 1; i < data.length; i++) {
      const tipo = data[i][typeIndex] || 'Desconocido';
      tiposCounts[tipo] = (tiposCounts[tipo] || 0) + 1;
    }
    
    // Tomar los top 6 tipos
    const sorted = Object.entries(tiposCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 6);
    
    return {
      labels: sorted.map(([label]) => label),
      series: sorted.map(([,count]) => count)
    };
    
  } catch (e) {
    logWarning('DASHBOARD_HTML', `Error generando desglose de tags: ${e.message}`);
    return { labels: ['Error'], series: [1] };
  }
}

/**
 * Genera estado de tags GTM (activos vs pausados)
 * @returns {Object} Datos para gráfico de estado
 */
function generarEstadoTagsGTM() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const gtmTagsSheet = ss.getSheetByName('GTM_TAGS');
    
    if (!gtmTagsSheet || gtmTagsSheet.getLastRow() <= 1) {
      return { labels: ['Sin datos'], series: [1] };
    }
    
    const data = gtmTagsSheet.getDataRange().getValues();
    const headers = data[0];
    const statusIndex = headers.indexOf('Status') || headers.indexOf('State') || headers.indexOf('Estado');
    
    let activos = 0;
    let pausados = 0;
    
    if (statusIndex !== -1) {
      for (let i = 1; i < data.length; i++) {
        const status = data[i][statusIndex] || '';
        if (status.toString().toLowerCase().includes('pause') || 
            status.toString().toLowerCase().includes('disable') ||
            status.toString().toLowerCase().includes('pausado')) {
          pausados++;
        } else {
          activos++;
        }
      }
    } else {
      // Si no hay columna de estado, asumir todos activos
      activos = data.length - 1;
    }
    
    return {
      labels: ['Activos', 'Pausados'],
      series: [activos, pausados]
    };
    
  } catch (e) {
    logWarning('DASHBOARD_HTML', `Error generando estado de tags: ${e.message}`);
    return { labels: ['Error'], series: [1] };
  }
}

/**
 * Función para sincronización manual completa (llamada desde el dashboard)
 * @returns {Object} Resultado de la sincronización
 */
function sincronizarTodoManual() {
  try {
    logEvent('DASHBOARD_SYNC', 'Iniciando sincronización manual completa desde dashboard');
    
    const resultado = ejecutarAuditoriaCompleta(['ga4', 'gtm', 'looker']);
    
    logEvent('DASHBOARD_SYNC', `Sincronización manual completada: ${resultado.success ? 'SUCCESS' : 'ERROR'}`);
    
    return resultado;
    
  } catch (e) {
    logError('DASHBOARD_SYNC', `Error en sincronización manual: ${e.message}`);
    return {
      success: false,
      error: e.message
    };
  }
}