/**
 * @fileoverview Sistema de Logging Optimizado por Lotes (Batching).
 */

// =================================================================
// LOGGER CORE (CON BUFFER PARA PROCESAMIENTO POR LOTES)
// =================================================================

const Logger = {
  buffer: [],
  log: function(level, module, message, details = '') {
    // Escribir siempre en la consola para depuración en tiempo real.
    const formattedMessage = `[${module}] ${message} ${details || ''}`;
    if (level === 'ERROR') console.error(formattedMessage);
    else if (level === 'WARNING') console.warn(formattedMessage);
    else console.log(formattedMessage);
    
    // Añadir el log al buffer en lugar de escribirlo inmediatamente en la hoja.
    this.buffer.push([new Date(), level, module, message, details]);
  },
  flush: function() {
    if (this.buffer.length === 0) return; // No hacer nada si no hay logs que escribir.
    
    try {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      let sheet = spreadsheet.getSheetByName("LOGS");
      if (!sheet) {
        sheet = spreadsheet.insertSheet("LOGS");
        sheet.getRange(1, 1, 1, 5).setValues([['Timestamp', 'Nivel', 'Módulo', 'Mensaje', 'Detalles']]).setFontWeight('bold');
      }
      
      // Escribe todos los logs del buffer de una sola vez. Es mucho más rápido.
      sheet.getRange(sheet.getLastRow() + 1, 1, this.buffer.length, this.buffer[0].length)
           .setValues(this.buffer);
      
      // Limpia el buffer después de escribir.
      this.buffer = [];
      
    } catch (error) {
      console.error(`CRITICAL: Falló el volcado de logs a la hoja. Error: ${error.message}`);
    }
  }
};

// =================================================================
// FUNCIONES PÚBLICAS DE LOGGING (INTERFAZ PARA OTROS MÓDULOS)
// =================================================================

function logEvent(module, message, details) { Logger.log('INFO', module, message, details); }
function logError(module, message, details) { Logger.log('ERROR', module, message, details); }
function logWarning(module, message, details) { Logger.log('WARNING', module, message, details); }
function logSyncStart(service, account) { Logger.log('INFO', 'SYNC', `Iniciando sincronización: ${service}`, `Cuenta: ${account}`); }
function logSyncEnd(service, recordCount, duration, status) {
  const details = `${recordCount} registros, ${Math.round(duration/1000)}s, ${status}`;
  const level = status === 'SUCCESS' ? 'INFO' : 'ERROR';
  Logger.log(level, 'SYNC', `Sincronización finalizada: ${service}`, details);
}

/**
 * Vuelca todos los logs acumulados en el buffer a la hoja de cálculo.
 */
function flushLogs() {
  Logger.flush();
}

// =================================================================
// UTILIDADES DE ADMINISTRACIÓN Y ALERTAS
// =================================================================

/**
 * Limpia los registros de la hoja LOGS que son más antiguos que un número de días determinado.
 */
function cleanupLogs(daysToKeep = 30) {
  flushLogs();
  logEvent('LOGS', `Iniciando limpieza de logs más antiguos de ${daysToKeep} días.`);

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("LOGS");

    if (!sheet || sheet.getLastRow() < 2) {
      logWarning('LOGS', 'No hay logs que limpiar.');
      flushLogs();
      return;
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const data = sheet.getDataRange().getValues();
    const headers = data.shift(); // Quita la fila de cabecera.
    
    const firstRowToKeepIndex = data.findIndex(row => new Date(row[0]) > cutoffDate);

    if (firstRowToKeepIndex > 0) {
      sheet.deleteRows(2, firstRowToKeepIndex);
      logEvent('LOGS', `${firstRowToKeepIndex} entradas de log antiguas han sido eliminadas.`);
    
    } else if (firstRowToKeepIndex === -1 && data.length > 0) {
      sheet.getRange(2, 1, data.length, headers.length).clearContent();
      logEvent('LOGS', `Todos los ${data.length} logs antiguos han sido eliminados.`);
    
    } else {
      logEvent('LOGS', 'No se encontraron logs suficientemente antiguos para eliminar.');
    }

  } catch (error) {
    logError('LOGS', `Falló la operación de limpieza de logs: ${error.message}`);
  }
  
  flushLogs();
}


/**
 * Muestra una interfaz de usuario para preguntar cuántos días de logs mantener.
 */
function cleanupLogsUI() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Limpiar Logs Antiguos',
    'Ingresa el número de días de logs que deseas mantener (ej. 30). Se borrarán todos los registros más antiguos.',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() === ui.Button.OK) {
    const days = parseInt(response.getResponseText());
    if (isNaN(days) || days <= 0) {
      ui.alert('Error', 'Por favor, ingresa un número válido y positivo de días.', ui.ButtonSet.OK);
      return;
    }
    
    cleanupLogs(days);
    
    flushLogs(); 
    
    ui.alert('Éxito', 'La limpieza de logs antiguos ha finalizado. Revisa la hoja "LOGS" para ver el resultado.', ui.ButtonSet.OK);
  }
}