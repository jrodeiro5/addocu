/**
 * @fileoverview Módulo de Dashboard Avanzado y Reporting de Calidad.
 */

// =================================================================
// FUNCIÓN PRINCIPAL (LLAMADA DESDE EL MENÚ)
// =================================================================

/**
 * Genera o actualiza el Dashboard Avanzado.
 */
function actualizarDashboardAvanzado() {
  const ui = SpreadsheetApp.getUi();
  logEvent('DASHBOARD_V3', 'Iniciando generación de Dashboard Avanzado...');
  
  try {
    const datosParaDashboard = recolectarDatosParaDashboard();
    renderizarDashboardAvanzado(datosParaDashboard);
    
    flushLogs();
    ui.alert('✅ Dashboard Avanzado Generado', 'El nuevo panel de control ha sido creado y actualizado con éxito.', ui.ButtonSet.OK);

  } catch (error) {
    logError('DASHBOARD_V3', `No se pudo generar el dashboard avanzado: ${error.message}`);
    flushLogs();
    ui.alert('❌ Error', `No se pudo generar el dashboard avanzado: ${error.message}`, ui.ButtonSet.OK);
  }
}


// =================================================================
// LÓGICA DE RENDERIZADO DEL DASHBOARD
// =================================================================

/**
 * Dibuja y rellena la hoja del Dashboard con todos los datos y formatos.
 * @param {Object} data El objeto que contiene todas las estadísticas pre-calculadas.
 */
function renderizarDashboardAvanzado(data) {
  // Sin cambios, toda esta lógica sigue siendo válida.
  // ... (código original de renderizarDashboardAvanzado)
}


// =================================================================
// LÓGICA DE RECOLECCIÓN DE DATOS PARA EL DASHBOARD
// =================================================================

/**
 * Orquesta la recolección de todas las estadísticas necesarias para construir el dashboard.
 * @returns {Object} Un objeto anidado con todos los datos.
 */
function recolectarDatosParaDashboard() {
  // Sin cambios, toda esta lógica sigue siendo válida.
  // ... (código original de recolectarDatosParaDashboard)
}

/**
 * Obtiene las últimas entradas del historial para calcular tendencias.
 */
function getDatosHistoricos(kpisActuales) {
  // Sin cambios, toda esta lógica sigue siendo válida.
  // ... (código original de getDatosHistoricos)
}

/**
 * Guarda una "foto" de los KPIs actuales en la hoja de HISTORIAL.
 */
function registrarSnapshotHistorico(kpis) {
  // Sin cambios, toda esta lógica sigue siendo válida.
  // ... (código original de registrarSnapshotHistorico)
}

/**
 * Orquesta el análisis de calidad de datos en todas las plataformas.
 */
function analizarCalidadDeDatos() {
  // Sin cambios, toda esta lógica sigue siendo válida.
  // ... (código original de analizarCalidadDeDatos)
}


// =================================================================
// HELPERS ESPECÍFICOS DE ANÁLISIS DE CALIDAD
// =================================================================

function analizarCalidadGTM() {
  // Sin cambios, toda esta lógica sigue siendo válida.
  // ... (código original de analizarCalidadGTM)
}

function analizarCalidadLooker() {
  // Sin cambios, toda esta lógica sigue siendo válida.
  // ... (código original de analizarCalidadLooker)
}

function analizarCalidadGA4() {
  // Sin cambios, toda esta lógica sigue siendo válida.
  // ... (código original de analizarCalidadGA4)
}

// =================================================================
// HELPERS PARA CÁLCULO DE ESTADÍSTICAS Y FORMATO
// =================================================================

function getGa4Stats() {
  // Sin cambios, toda esta lógica sigue siendo válida.
  // ... (código original de getGa4Stats)
}

function getLookerStudioStats() {
  // Sin cambios, toda esta lógica sigue siendo válida.
  // ... (código original de getLookerStudioStats)
}
function getGtmStats(totalTags) {
  // Sin cambios, toda esta lógica sigue siendo válida.
  // ... (código original de getGtmStats)
}
function contarRegistros(sheetName) {
  // Sin cambios, toda esta lógica sigue siendo válida.
  // ... (código original de contarRegistros)
}

function calcularHealthScore(calidad, kpis) {
  // Sin cambios, toda esta lógica sigue siendo válida.
  // ... (código original de calcularHealthScore)
}

function formatKpiConTendencia(valorActual, historial) {
  // Sin cambios, toda esta lógica sigue siendo válida.
  // ... (código original de formatKpiConTendencia)
}