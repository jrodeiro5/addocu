/**
 * @fileoverview Módulo Central de Utilidades para Addocu v2.0
 * @version 3.0 - Adaptado para modelo open source completo
 */

// =================================================================
// CONFIGURACIÓN CENTRAL ADDOCU v2.0
// =================================================================

const ADDOCU_CONFIG = {
  services: {
    available: ['ga4', 'gtm', 'looker', 'lookerStudio']
  },
  apis: {
    ga4: {
      name: 'Google Analytics 4 Admin API',
      baseUrl: 'https://analyticsadmin.googleapis.com/v1alpha',
      testEndpoint: '/accounts'
    },
    gtm: {
      name: 'Google Tag Manager API',
      baseUrl: 'https://tagmanager.googleapis.com/tagmanager/v2',
      testEndpoint: '/accounts'
    },
    looker: {
      name: 'Looker Studio API',
      baseUrl: 'https://datastudio.googleapis.com/v1',
      testEndpoint: '/assets:search?assetTypes=REPORT&pageSize=1'
    },
    lookerStudio: {
      name: 'Looker Studio API',
      baseUrl: 'https://datastudio.googleapis.com/v1',
      testEndpoint: '/assets:search?assetTypes=REPORT&pageSize=1'
    }
  },
  limits: {
    requestTimeout: 60000, // 60 segundos
    maxRetries: 3,
    retryDelay: 1000
  }
};

// =================================================================
// AUTENTICACIÓN Y CONFIGURACIÓN DE USUARIO
// =================================================================

/**
 * Obtiene de forma segura la API Key desde las propiedades del usuario.
 * Solo necesaria para Looker Studio (funcionalidad opcional).
 * @returns {string} La API Key del usuario.
 */
function getAPIKey() {
  const userProperties = PropertiesService.getUserProperties();
  const apiKey = userProperties.getProperty('ADDOCU_LOOKER_API_KEY');

  if (!apiKey) {
    throw new Error('API Key de Looker Studio no configurada. Configúrala en "⚙️ Configurar Addocu".');
  }
  
  // Validación básica del formato
  if (!apiKey.startsWith('AIza') || apiKey.length < 20) {
    throw new Error('Formato de API Key inválido. Debe comenzar con "AIza" y tener al menos 20 caracteres.');
  }
  
  return apiKey;
}

/**
 * Obtiene la configuración completa del usuario.
 * @returns {Object} Configuración del usuario.
 */
function getUserConfig() {
  const userProperties = PropertiesService.getUserProperties();
  
  return {
    lookerApiKey: userProperties.getProperty('ADDOCU_LOOKER_API_KEY') || '',
    gtmFilter: userProperties.getProperty('ADDOCU_GTM_FILTER') || '',
    requestTimeout: parseInt(userProperties.getProperty('ADDOCU_REQUEST_TIMEOUT')) || 60,
    logLevel: userProperties.getProperty('ADDOCU_LOG_LEVEL') || 'INFO',
    userEmail: Session.getActiveUser().getEmail()
  };
}

/**
 * Prepara las credenciales para una llamada a la API.
 * @param {string} serviceName - El nombre del servicio ('ga4', 'gtm', 'looker').
 * @returns {Object} Un objeto con las cabeceras y datos de autenticación.
 */
function getAuthConfig(serviceName) {
  try {
    const config = getUserConfig();
    
    // Headers básicos para las APIs de Google
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Addocu/2.0 (Google Sheets Add-on)'
    };
    
    // GA4 y GTM requieren OAuth2 (REST API calls)
    if (serviceName === 'ga4' || serviceName === 'gtm') {
      const oauthToken = ScriptApp.getOAuthToken();
      if (!oauthToken) {
        throw new Error(`OAuth2 token requerido para ${serviceName}. Autoriza el script primero.`);
      }
      headers['Authorization'] = `Bearer ${oauthToken}`;
      
      return {
        headers: headers,
        authUser: config.userEmail,
        timeout: config.requestTimeout * 1000,
        serviceName: serviceName,
        authType: 'oauth2',
        oauthToken: oauthToken
      };
    }
    
    // Looker Studio ahora requiere OAuth2 (Google eliminó soporte para API Keys)
    if (serviceName === 'looker' || serviceName === 'lookerStudio') {
      // CAMBIO CRÍTICO: Looker Studio migrado a OAuth2 únicamente
      const oauthToken = ScriptApp.getOAuthToken();
      if (!oauthToken) {
        throw new Error(`OAuth2 token requerido para ${serviceName}. Looker Studio ya no acepta API Keys.`);
      }
      headers['Authorization'] = `Bearer ${oauthToken}`;
      
      return {
        headers: headers,
        authUser: config.userEmail,
        timeout: config.requestTimeout * 1000,
        serviceName: serviceName,
        authType: 'oauth2',
        oauthToken: oauthToken
      };
    }
    
    throw new Error(`Servicio no soportado: ${serviceName}`);
    
  } catch (error) {
    logError('AUTH', `Error en autenticación para ${serviceName}: ${error.message}`);
    throw error;
  }
}

/**
 * Verifica si un servicio está disponible para el usuario.
 * @param {string} serviceName - Nombre del servicio.
 * @returns {boolean} True si el servicio está disponible.
 */
function isServiceAvailable(serviceName) {
  // Todos los servicios disponibles en el modelo open source
  return ADDOCU_CONFIG.services.available.includes(serviceName);
}

/**
 * Lee la configuración de contenedores GTM desde las propiedades del usuario.
 * @returns {Array<string>} Un array con los IDs de los contenedores.
 */
function obtenerContenedoresObjetivoDesdeConfig() {
  const userProperties = PropertiesService.getUserProperties();
  const value = userProperties.getProperty('ADDOCU_GTM_FILTER');

  if (!value || value.trim() === '') {
    logEvent('GTM', 'No se ha definido filtro de contenedores. Se auditarán todos los contenedores accesibles.');
    return []; // Array vacío = todos los contenedores
  }
  
  // Limpiar y validar formato de contenedores GTM
  const containers = value.split(',')
    .map(id => id.trim())
    .filter(id => id.length > 0)
    .filter(id => id.startsWith('GTM-') || /^[0-9]+$/.test(id)); // GTM-XXXXXX o solo números
    
  logEvent('GTM', `Filtro de contenedores configurado: ${containers.join(', ')}`);
  return containers;
}

// =================================================================
// UTILIDADES DE RED Y DATOS
// =================================================================

/**
 * Realiza una petición HTTP con reintentos y mejores prácticas.
 * @param {string} url - URL de la petición.
 * @param {Object} options - Opciones de la petición.
 * @param {string} serviceName - Nombre del servicio para logging.
 * @param {number} maxRetries - Número máximo de reintentos.
 * @returns {Object} Respuesta parseada como JSON.
 */
function fetchWithRetry(url, options = {}, serviceName = 'API', maxRetries = null) {
  if (maxRetries === null) {
    maxRetries = ADDOCU_CONFIG.limits.maxRetries;
  }
  
  let lastError = null;
  const startTime = Date.now();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logEvent('HTTP', `${serviceName}: Petición ${attempt}/${maxRetries} a ${getUrlForLogging(url)}`);
      
      // Configurar opciones por defecto
      const requestOptions = {
        method: 'GET',
        muteHttpExceptions: true,
        ...options
      };
      
      // Aplicar timeout si está configurado
      const config = getUserConfig();
      if (config.requestTimeout && config.requestTimeout > 0) {
        // Apps Script no soporta timeout personalizado, pero lo registramos
        logEvent('HTTP', `${serviceName}: Timeout configurado: ${config.requestTimeout}s`);
      }
      
      const response = UrlFetchApp.fetch(url, requestOptions);
      const statusCode = response.getResponseCode();
      const responseText = response.getContentText();
      const duration = Date.now() - startTime;

      // Detectar respuestas HTML (error común de permisos)
      if (responseText.trim().startsWith('<!DOCTYPE html>') || responseText.trim().startsWith('<html')) {
        logError('HTTP', `${serviceName}: Se recibió HTML en lugar de JSON. Posible error de permisos o API no habilitada.`);
        throw new Error(`Error ${statusCode}: Se recibió HTML en lugar de JSON. Revisa los permisos de la API y que esté habilitada en Google Cloud Console.`);
      }

      // Respuestas exitosas
      if (statusCode >= 200 && statusCode < 300) {
        logEvent('HTTP', `${serviceName}: Éxito (${statusCode}) en ${duration}ms`);
        
        if (!responseText || responseText.trim() === '') {
          return {}; // Respuesta vacía válida
        }
        
        try {
          return JSON.parse(responseText);
        } catch (parseError) {
          logWarning('HTTP', `${serviceName}: Respuesta no es JSON válido, devolviendo como texto`);
          return { rawResponse: responseText };
        }
      }
      
      // Rate limiting (429)
      if (statusCode === 429) {
        const waitTime = Math.pow(2, attempt) * ADDOCU_CONFIG.limits.retryDelay;
        logWarning('HTTP', `${serviceName}: Rate limit (429), esperando ${waitTime / 1000}s antes del siguiente intento`);
        Utilities.sleep(waitTime);
        lastError = new Error(`Rate limit excedido. Intento ${attempt}/${maxRetries}.`);
        continue;
      }

      // Errores de servidor (5xx) - reintentar
      if (statusCode >= 500) {
        const waitTime = attempt * ADDOCU_CONFIG.limits.retryDelay;
        logError('HTTP', `${serviceName}: Error de servidor (${statusCode}), reintentando en ${waitTime / 1000}s...`);
        lastError = new Error(`Error de servidor ${statusCode}. Respuesta: ${responseText.substring(0, 200)}`);
        if (attempt < maxRetries) {
          Utilities.sleep(waitTime);
          continue;
        }
      }
      
      // Errores de cliente (4xx) - no reintentar
      let errorMessage = `Error de API ${statusCode}`;
      try {
        const errorResponse = JSON.parse(responseText);
        if (errorResponse.error?.message) {
          errorMessage += `: ${errorResponse.error.message}`;
        }
      } catch (e) {
        errorMessage += `: ${responseText.substring(0, 200)}`;
      }
      
      throw new Error(errorMessage);
      
    } catch (e) {
      lastError = e;
      const duration = Date.now() - startTime;
      
      if (attempt === maxRetries) {
        logError('HTTP', `${serviceName}: Fallo definitivo tras ${maxRetries} intentos en ${duration}ms: ${e.message}`);
        throw new Error(`Fallo en ${serviceName} tras ${maxRetries} intentos: ${e.message}`);
      }
      
      logWarning('HTTP', `${serviceName}: Error en intento ${attempt}/${maxRetries}: ${e.message}`);
      
      // Esperar antes del siguiente intento (excepto para el último)
      if (attempt < maxRetries) {
        const waitTime = attempt * ADDOCU_CONFIG.limits.retryDelay;
        Utilities.sleep(waitTime);
      }
    }
  }
  
  throw lastError || new Error(`Error desconocido en ${serviceName}`);
}

/**
 * Construye una URL con parámetros de consulta (compatible con Google Apps Script).
 * @param {string} baseUrl - URL base.
 * @param {Object} params - Parámetros de consulta.
 * @returns {string} URL completa.
 */
function buildUrl(baseUrl, params = {}) {
  if (!params || Object.keys(params).length === 0) {
    return baseUrl;
  }
  
  const queryParams = [];
  
  Object.keys(params).forEach(key => {
    const value = params[key];
    if (value !== undefined && value !== null) {
      queryParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  });
  
  if (queryParams.length === 0) {
    return baseUrl;
  }
  
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}${queryParams.join('&')}`;
}

/**
 * Versión segura de URL para logging (oculta API keys) - Compatible con Google Apps Script.
 * @param {string} url - URL original.
 * @returns {string} URL sanitizada para logs.
 */
function getUrlForLogging(url) {
  try {
    // Buscar y ocultar API key manualmente
    let sanitizedUrl = url;
    
    // Buscar parámetro 'key=' y reemplazarlo
    const keyPattern = /([?&])key=([^&]*)/g;
    sanitizedUrl = sanitizedUrl.replace(keyPattern, '$1key=AIza***HIDDEN***');
    
    // Limitar longitud para logs
    return sanitizedUrl.length > 100 ? sanitizedUrl.substring(0, 100) + '...' : sanitizedUrl;
    
  } catch (e) {
    return url.substring(0, 100) + (url.length > 100 ? '...' : '');
  }
}

// =================================================================
// UTILIDADES DE FECHAS Y FORMATO
// =================================================================

/**
 * Formatea una fecha para mostrarla en las hojas de cálculo.
 * @param {string|Date} dateInput - Fecha en formato string o objeto Date.
 * @returns {string} Fecha formateada.
 */
function formatDate(dateInput) {
  if (!dateInput) return 'N/A';
  
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    if (isNaN(date.getTime())) {
      return typeof dateInput === 'string' ? dateInput : 'Fecha inválida';
    }
    
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Europe/Madrid'
    });
  } catch (e) {
    logWarning('FORMAT', `Error formateando fecha: ${e.message}`);
    return dateInput ? dateInput.toString() : 'N/A';
  }
}

/**
 * Formatea texto para mostrar en celdas (maneja valores null/undefined).
 * @param {*} value - Valor a formatear.
 * @returns {string} Valor formateado.
 */
function formatCellValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'object') return JSON.stringify(value);
  return value.toString();
}

/**
 * Trunca texto largo para evitar problemas en las celdas.
 * @param {string} text - Texto a truncar.
 * @param {number} maxLength - Longitud máxima.
 * @returns {string} Texto truncado.
 */
function truncateText(text, maxLength = 1000) {
  if (!text || typeof text !== 'string') return '';
  
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength - 3) + '...';
}

// =================================================================
// UTILIDADES DE HOJAS DE CÁLCULO
// =================================================================

/**
 * Escribe datos en una hoja de cálculo con formato mejorado.
 * @param {string} sheetName - Nombre de la hoja.
 * @param {Array} headers - Array con los nombres de las columnas.
 * @param {Array} data - Array bidimensional con los datos.
 * @param {boolean} clearFirst - Si limpiar la hoja primero.
 * @param {Object} options - Opciones adicionales de formato.
 */
function writeToSheet(sheetName, headers, data, clearFirst = true, options = {}) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName(sheetName);
    
    // Crear hoja si no existe
    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetName);
      logEvent('SHEET', `Hoja "${sheetName}" creada.`);
    }
    
    // Limpiar hoja si se solicita
    if (clearFirst) {
      sheet.clear();
    }
    
    // Escribir headers si se proporcionan
    if (headers && headers.length > 0) {
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setValues([headers]);
      
      // Formato del header
      headerRange
        .setFontWeight('bold')
        .setBackground('#4285F4')
        .setFontColor('white')
        .setBorder(true, true, true, true, true, true);
        
      sheet.setFrozenRows(1);
    }
    
    // Escribir datos si existen
    if (data && data.length > 0 && data[0].length > 0) {
      const startRow = clearFirst ? 2 : sheet.getLastRow() + 1;
      const numRows = data.length;
      const numColumns = data[0].length;
      
      // Asegurar que todos los datos son strings o números válidos
      const cleanData = data.map(row => 
        row.map(cell => formatCellValue(cell))
      );
      
      const dataRange = sheet.getRange(startRow, 1, numRows, numColumns);
      dataRange.setValues(cleanData);
      
      // Formato alternado para filas
      if (options.alternateColors !== false) {
        for (let i = 0; i < numRows; i++) {
          if (i % 2 === 1) { // Filas pares (índice impar)
            sheet.getRange(startRow + i, 1, 1, numColumns)
              .setBackground('#F8F9FA');
          }
        }
      }
      
      // Auto-resize columnas
      sheet.autoResizeColumns(1, numColumns);
      
      // Aplicar bordes
      if (options.borders !== false) {
        dataRange.setBorder(true, true, true, true, true, true);
      }
    }
    
    // Metadatos de la hoja
    if (options.addMetadata !== false) {
      addSheetMetadata(sheet, {
        generatedBy: 'Addocu v2.0',
        timestamp: new Date().toISOString(),
        recordCount: data ? data.length : 0,
        userEmail: Session.getActiveUser().getEmail()
      });
    }
    
    logEvent('SHEET', `${data ? data.length : 0} registros escritos en "${sheetName}".`);
    
  } catch (error) {
    logError('SHEET', `Error escribiendo en "${sheetName}": ${error.message}`);
    throw new Error(`No se pudo escribir en la hoja "${sheetName}": ${error.message}`);
  }
}

/**
 * Añade metadatos a una hoja en celdas ocultas.
 * @param {Sheet} sheet - Hoja de cálculo.
 * @param {Object} metadata - Metadatos a añadir.
 */
function addSheetMetadata(sheet, metadata) {
  try {
    // Usar columnas muy a la derecha para metadatos (columnas ZZ, ZA, etc.)
    const metaStartCol = 26 * 26 + 26; // Columna ZZ
    let row = 1;
    
    Object.keys(metadata).forEach(key => {
      sheet.getRange(row, metaStartCol).setValue(key);
      sheet.getRange(row, metaStartCol + 1).setValue(metadata[key]);
      row++;
    });
    
    // Ocultar estas columnas
    sheet.hideColumns(metaStartCol, 2);
    
  } catch (e) {
    // No crítico si falla
    logWarning('SHEET', `No se pudieron añadir metadatos: ${e.message}`);
  }
}

/**
 * Obtiene el número de registros de una hoja (excluyendo header).
 * @param {string} sheetName - Nombre de la hoja.
 * @returns {number} Número de registros.
 */
function getSheetRecordCount(sheetName) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) return 0;
    
    const lastRow = sheet.getLastRow();
    return Math.max(0, lastRow - 1); // -1 para excluir header
    
  } catch (e) {
    return 0;
  }
}

// =================================================================
// DIAGNÓSTICO Y VALIDACIÓN
// =================================================================

/**
 * Valida la conectividad y permisos de un servicio específico.
 * @param {string} serviceName - Nombre del servicio ('ga4', 'gtm', 'looker').
 * @returns {Object} Resultado de la validación.
 */
function validateService(serviceName) {
  try {
    
    const auth = getAuthConfig(serviceName);
    const apiConfig = ADDOCU_CONFIG.apis[serviceName];
    
    if (!apiConfig) {
      throw new Error(`Configuración no encontrada para el servicio: ${serviceName}`);
    }
    
    logEvent('VALIDATION', `Validando ${serviceName} con ${auth.authType}...`);
    
    let testUrl, requestOptions;
    
    if (auth.authType === 'oauth2') {
      // Para GA4 y GTM: usar OAuth2 solamente
      testUrl = apiConfig.baseUrl + apiConfig.testEndpoint;
      requestOptions = {
        method: 'GET',
        headers: auth.headers,
        muteHttpExceptions: true
      };
    } else if (auth.authType === 'apikey') {
      // Para Looker Studio: usar API Key
      testUrl = buildUrl(apiConfig.baseUrl + apiConfig.testEndpoint, {
        key: auth.apiKey,
        pageSize: 1
      });
      requestOptions = {
        method: 'GET',
        headers: auth.headers,
        muteHttpExceptions: true
      };
    } else {
      throw new Error(`Tipo de autenticación no soportado: ${auth.authType}`);
    }
    
    const response = UrlFetchApp.fetch(testUrl, requestOptions);
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    let estado = 'ERROR';
    let mensaje = '';
    let cuenta = 'N/A';
    
    if (statusCode === 200) {
      estado = 'OK';
      mensaje = 'Conectado correctamente';
      
      // Intentar extraer información de la cuenta
      try {
        const data = JSON.parse(responseText);
        if (serviceName === 'ga4' && data.accounts) {
          cuenta = `${data.accounts.length} cuentas GA4`;
        } else if (serviceName === 'gtm' && data.account) {
          cuenta = `${data.account.length} cuentas GTM`;
        } else if (serviceName === 'looker') {
          cuenta = 'Looker Studio accesible';
        }
      } catch (e) {
        // No crítico si no se puede parsear
      }
      
    } else if (statusCode === 403) {
      estado = 'PERMISSION_ERROR';
      if (auth.authType === 'oauth2') {
        mensaje = 'Sin permisos OAuth2. Verifica que la API esté habilitada y el script autorizado.';
      } else {
        mensaje = 'Sin permisos. Verifica que la API esté habilitada y la clave tenga permisos.';
      }
    } else if (statusCode === 401) {
      estado = 'AUTH_ERROR';
      if (auth.authType === 'oauth2') {
        mensaje = 'Error de autenticación OAuth2. El script necesita autorización.';
      } else {
        mensaje = 'Error de autenticación. Verifica tu API Key.';
      }
    } else if (statusCode === 404) {
      estado = 'API_NOT_FOUND';
      mensaje = 'API no encontrada. Verifica que esté habilitada en Google Cloud Console.';
    } else {
      estado = `HTTP_${statusCode}`;
      mensaje = `Error HTTP ${statusCode}`;
    }
    
    return {
      servicio: apiConfig.name,
      cuenta: cuenta,
      estado: estado,
      usuario: auth.authUser,
      timestamp: new Date(),
      mensaje: mensaje
    };
    
  } catch (error) {
    logError('VALIDATION', `Error validando ${serviceName}: ${error.message}`);
    
    return {
      servicio: ADDOCU_CONFIG.apis[serviceName]?.name || serviceName,
      cuenta: "N/A",
      estado: 'EXCEPTION',
      usuario: Session.getActiveUser().getEmail(),
      timestamp: new Date(),
      mensaje: error.message
    };
  }
}

/**
 * Ejecuta un diagnóstico completo de conectividad.
 * @returns {Array} Array con los resultados de cada servicio.
 */
function diagnosticarConexionesCompleto() {
  logEvent('DIAGNOSTIC', 'Iniciando diagnóstico completo de conectividad Addocu.');
  
  const servicesToTest = ['ga4', 'gtm', 'lookerStudio'];
  const resultados = [];
  
  servicesToTest.forEach(servicio => {
    try {
      const resultado = validateService(servicio);
      resultados.push([
        resultado.servicio,
        resultado.cuenta,
        resultado.estado,
        resultado.mensaje,
        resultado.usuario,
        formatDate(resultado.timestamp)
      ]);
      
      logEvent('DIAGNOSTIC', `${servicio}: ${resultado.estado} - ${resultado.mensaje}`);
      
    } catch (e) {
      logError('DIAGNOSTIC', `Error diagnosticando ${servicio}: ${e.message}`);
      resultados.push([
        servicio,
        'N/A',
        'ERROR',
        e.message,
        Session.getActiveUser().getEmail(),
        formatDate(new Date())
      ]);
    }
  });
  
  // Escribir resultados a hoja
  const headers = ['Servicio', 'Cuenta', 'Estado', 'Mensaje', 'Usuario', 'Timestamp'];
  writeToSheet('ADDOCU_DIAGNOSTIC', headers, resultados, true, {
    alternateColors: true,
    borders: true
  });
  
  logEvent('DIAGNOSTIC', `Diagnóstico completado para ${resultados.length} servicios.`);
  flushLogs();
  
  return resultados;
}

// =================================================================
// UTILIDADES DE TIEMPO Y PERFORMANCE
// =================================================================

/**
 * Marca el inicio de una operación para medir performance.
 * @param {string} operationName - Nombre de la operación.
 * @returns {number} Timestamp de inicio.
 */
function startTimer(operationName) {
  const startTime = Date.now();
  logEvent('TIMER', `Iniciando: ${operationName}`);
  return startTime;
}

/**
 * Marca el final de una operación y registra la duración.
 * @param {string} operationName - Nombre de la operación.
 * @param {number} startTime - Timestamp de inicio.
 * @returns {number} Duración en milisegundos.
 */
function endTimer(operationName, startTime) {
  const endTime = Date.now();
  const duration = endTime - startTime;
  logEvent('TIMER', `Completado: ${operationName} en ${duration}ms`);
  return duration;
}

/**
 * Ejecuta una función con medición de tiempo automática.
 * @param {string} operationName - Nombre de la operación.
 * @param {Function} func - Función a ejecutar.
 * @returns {*} Resultado de la función.
 */
function timeOperation(operationName, func) {
  const startTime = startTimer(operationName);
  try {
    const result = func();
    endTimer(operationName, startTime);
    return result;
  } catch (error) {
    endTimer(operationName, startTime);
    throw error;
  }
}

/**
 * Función helper para realizar llamadas API con OAuth2.
 * @param {string} url - URL de la API.
 * @param {string} method - Método HTTP (GET, POST, etc.).
 * @param {Object} payload - Datos para enviar (opcional).
 * @returns {Object} Respuesta parseada como JSON.
 */
function fetchConOAuth2(url, method = 'GET', payload = null) {
  try {
    const token = ScriptApp.getOAuthToken();
    if (!token) {
      throw new Error('No se pudo obtener el token OAuth2. Autoriza el script primero.');
    }
    
    const options = {
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Addocu/2.0 (Google Sheets Add-on)'
      },
      muteHttpExceptions: true
    };
    
    if (payload && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.payload = JSON.stringify(payload);
    }
    
    return fetchWithRetry(url, options, 'OAuth2-API');
    
  } catch (error) {
    logError('OAuth2', `Error en llamada OAuth2 a ${url}: ${error.message}`);
    throw error;
  }
}