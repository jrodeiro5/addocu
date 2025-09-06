/**
 * @fileoverview Módulo de Sincronización de Google Analytics 4.
 */

// =================================================================
// CONSTANTES Y CONFIGURACIÓN DEL MÓDULO
// =================================================================

const GA4_PROPERTIES_HEADERS = [
  'Property Name', 'Property ID', 'Property Path', 'Account Name', 'Account Path',
  'Currency Code', 'Time Zone', 'Created Time', 'Update Time', 'Industry Category',
  'Service Level', 'Analytics URL', 'Streams URL', 'Parent', 'Delete Time',
  'Data Retention', 'Reset User Data', 'Observaciones'
];
const GA4_DIMENSIONS_HEADERS = [
  'Property Name', 'Property ID', 'Display Name', 'Parameter Name', 'Scope',
  'Description', 'Disallow Ads Personalization', 'Archive Time', 'Property Created',
  'Property Updated', 'Observaciones'
];
const GA4_METRICS_HEADERS = [
  'Property Name', 'Property ID', 'Display Name', 'Parameter Name', 'Measurement Unit',
  'Scope', 'Description', 'Archive Time', 'Property Created', 'Property Updated',
  'Observaciones'
];
const GA4_STREAMS_HEADERS = [
  'Property Name', 'Property ID', 'Stream Name', 'Stream Type', 'Stream ID',
  'Measurement ID / Package / Bundle', 'Default URI', 'Stream Created',
  'Stream Updated', 'Property Created', 'Property Updated', 'Observaciones'
];

// =================================================================
// FUNCIONES DE SINCRONIZACIÓN (EJECUTABLES DESDE EL MENÚ)
// =================================================================

function sincronizarGA4ConUI() {
  const resultado = sincronizarGA4Core();
  const ui = SpreadsheetApp.getUi();
  if (resultado.estado === 'SUCCESS') {
    const detalles = resultado.detalles;
    const mensaje = `✅ GA4 Sincronizado Completamente\n\n` +
      `🏠 Propiedades: ${detalles.propiedades}\n` +
      `📏 Dimensiones: ${detalles.dimensiones}\n` +
      `📊 Métricas: ${detalles.metricas}\n` +
      `📄 Data Streams: ${detalles.streams}\n\n` +
      `Total: ${resultado.registros} elementos\n` +
      `Tiempo: ${Math.round(resultado.duracion / 1000)}s`;
    ui.alert('📈 GA4 Completado', mensaje, ui.ButtonSet.OK);
  } else {
    ui.alert(
      '❌ Error en GA4',
      `La sincronización falló: ${resultado.error}\n\nRevisa la hoja LOGS para más detalles.`,
      ui.ButtonSet.OK
    );
  }
}

// =================================================================
// LÓGICA CENTRAL DE SINCRONIZACIÓN (REUTILIZABLE)
// =================================================================

function sincronizarGA4Core() {
  const startTime = Date.now();
  const serviceName = 'ga4';
  const resultados = { propiedades: 0, dimensiones: 0, metricas: 0, streams: 0 };

  try {
    getAuthConfig(serviceName); // Solo para verificar que el servicio esté habilitado
    logSyncStart('GA4_Complete', 'Analytics Admin Service');

    // 1. OBTENER CUENTAS Y PROPIEDADES (UNA SOLA VEZ)
    logEvent('GA4', 'Fase 1: Extrayendo todas las cuentas y propiedades...');
    const propiedades = obtenerCuentasYPropiedadesGA4();
    resultados.propiedades = propiedades.length;
    escribirDatosEnHoja('GA4_PROPERTIES', GA4_PROPERTIES_HEADERS, propiedades.map(p => procesarPropiedadGA4(p.property, p.account)));

    // 2. OBTENER SUB-RECURSOS REUTILIZANDO LA LISTA DE PROPIEDADES
    logEvent('GA4', 'Fase 2: Extrayendo dimensiones personalizadas...');
    const dimensiones = obtenerSubRecursosGA4(propiedades, 'customDimensions', procesarDimensionGA4);
    resultados.dimensiones = dimensiones.length;
    escribirDatosEnHoja('GA4_CUSTOM_DIMENSIONS', GA4_DIMENSIONS_HEADERS, dimensiones);

    logEvent('GA4', 'Fase 3: Extrayendo métricas personalizadas...');
    const metricas = obtenerSubRecursosGA4(propiedades, 'customMetrics', procesarMetricaGA4);
    resultados.metricas = metricas.length;
    escribirDatosEnHoja('GA4_CUSTOM_METRICS', GA4_METRICS_HEADERS, metricas);

    logEvent('GA4', 'Fase 4: Extrayendo data streams...');
    const streams = obtenerSubRecursosGA4(propiedades, 'dataStreams', procesarStreamGA4);
    resultados.streams = streams.length;
    escribirDatosEnHoja('GA4_DATA_STREAMS', GA4_STREAMS_HEADERS, streams);

    const totalElementos = Object.values(resultados).reduce((sum, count) => sum + count, 0);
    const duration = Date.now() - startTime;
    logSyncEnd('GA4_Complete', totalElementos, duration, 'SUCCESS');

    return {
      registros: totalElementos,
      estado: 'SUCCESS',
      duracion: duration,
      detalles: resultados
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    logSyncEnd('GA4_Complete', 0, duration, 'ERROR');
    logError('GA4', `Sincronización completa falló: ${error.message}`);

    if (error.message.includes('403') || error.message.includes('401')) {
      error.message += ' | SOLUCIÓN: Verifica que la "Google Analytics Admin API" esté habilitada en Google Cloud Console y que el script tenga permisos OAuth2.';
    }

    return {
      registros: 0, estado: 'ERROR', duracion: duration, error: error.message
    };
  }
}

// =================================================================
// FUNCIONES DE EXTRACCIÓN DE DATOS (HELPERS)
// =================================================================

function obtenerCuentasYPropiedadesGA4() {
  try {
    const auth = getAuthConfig('ga4');
    const options = { method: 'GET', headers: auth.headers, muteHttpExceptions: true };
    
    // Obtener cuentas usando REST API
    const accountsUrl = 'https://analyticsadmin.googleapis.com/v1alpha/accounts?pageSize=200';
    const accountsResponse = fetchWithRetry(accountsUrl, options, 'GA4-Accounts');
    
    if (!accountsResponse.accounts || accountsResponse.accounts.length === 0) {
      logWarning('GA4', 'No se encontraron cuentas de GA4 accesibles.');
      return [];
    }

    const allProperties = [];
    for (const account of accountsResponse.accounts) {
      try {
        // Obtener propiedades usando REST API
        const propertiesUrl = `https://analyticsadmin.googleapis.com/v1alpha/properties?filter=parent:${account.name}&pageSize=200`;
        const propertiesResponse = fetchWithRetry(propertiesUrl, options, 'GA4-Properties');
        
        if (propertiesResponse.properties) {
          for (const property of propertiesResponse.properties) {
            allProperties.push({ property, account });
          }
        }
        
        Utilities.sleep(300); // Pausa entre cuentas
        
      } catch (e) {
        logWarning('GA4', `No se pudieron obtener propiedades para la cuenta ${account.displayName}: ${e.message}`);
      }
    }
    return allProperties;
  } catch (error) {
    logError('GA4', `Error obteniendo cuentas y propiedades GA4: ${error.message}`);
    throw error;
  }
}

function obtenerSubRecursosGA4(propiedades, resourceType, procesador) {
  const todosLosRecursos = [];
  const auth = getAuthConfig('ga4');
  const options = { method: 'GET', headers: auth.headers, muteHttpExceptions: true };
  
  for (const { property, account } of propiedades) {
    try {
      let url, resourceKey;
      
      // Determinar la URL y clave de recurso según el tipo
      switch (resourceType) {
        case 'customDimensions':
          url = `https://analyticsadmin.googleapis.com/v1alpha/${property.name}/customDimensions?pageSize=200`;
          resourceKey = 'customDimensions';
          break;
        case 'customMetrics':
          url = `https://analyticsadmin.googleapis.com/v1alpha/${property.name}/customMetrics?pageSize=200`;
          resourceKey = 'customMetrics';
          break;
        case 'dataStreams':
          url = `https://analyticsadmin.googleapis.com/v1alpha/${property.name}/dataStreams?pageSize=200`;
          resourceKey = 'dataStreams';
          break;
        default:
          throw new Error(`Tipo de recurso no soportado: ${resourceType}`);
      }
      
      const response = fetchWithRetry(url, options, `GA4-${resourceType}`);
      
      if (response[resourceKey]) {
        for (const item of response[resourceKey]) {
          todosLosRecursos.push(procesador(item, property, account));
        }
      }
      
      Utilities.sleep(200); // Pausa entre propiedades
      
    } catch (e) {
      logWarning('GA4', `No se pudieron obtener '${resourceType}' para la propiedad ${property.displayName}: ${e.message}`);
    }
  }
  return todosLosRecursos;
}

// =================================================================
// FUNCIONES DE PROCESAMIENTO DE DATOS (TRANSFORMACIÓN)
// =================================================================

function procesarPropiedadGA4(property, account) {
  const propertyId = property.name.split('/').pop();
  return {
    'Property Name': property.displayName || 'Sin nombre',
    'Property ID': propertyId,
    'Property Path': property.name,
    'Account Name': account.displayName,
    'Account Path': account.name,
    'Currency Code': property.currencyCode || 'N/A',
    'Time Zone': property.timeZone || 'N/A',
    'Created Time': formatDate(property.createTime),
    'Update Time': formatDate(property.updateTime),
    'Industry Category': property.industryCategory || 'N/A',
    'Service Level': property.serviceLevel || 'STANDARD',
    'Analytics URL': `https://analytics.google.com/analytics/web/#/p${propertyId}`,
    'Streams URL': `https://analytics.google.com/analytics/web/#/a${account.name.split('/').pop()}p${propertyId}/admin/streams`,
    'Parent': property.parent || account.name,
    'Delete Time': formatDate(property.deleteTime) || '',
    'Data Retention': property.dataRetentionSettings?.eventDataRetention || 'N/A',
    'Reset User Data': property.dataRetentionSettings?.resetUserDataOnNewActivity || false,
    'Observaciones': `Cuenta: ${account.displayName} | Nivel: ${property.serviceLevel}`
  };
}

function procesarDimensionGA4(dimension, property) {
  return {
    'Property Name': property.displayName,
    'Property ID': property.name.split('/').pop(),
    'Display Name': dimension.displayName,
    'Parameter Name': dimension.parameterName,
    'Scope': dimension.scope,
    'Description': dimension.description || '',
    'Disallow Ads Personalization': dimension.disallowAdsPersonalization || false,
    'Archive Time': dimension.archiveTime ? 'Archivada' : 'Activa',
    'Property Created': formatDate(property.createTime),
    'Property Updated': formatDate(property.updateTime),
    'Observaciones': `${dimension.scope} | ${dimension.archiveTime ? '🗄️ Archivada' : '✅ Activa'}`
  };
}

function procesarMetricaGA4(metric, property) {
  return {
    'Property Name': property.displayName,
    'Property ID': property.name.split('/').pop(),
    'Display Name': metric.displayName,
    'Parameter Name': metric.parameterName,
    'Measurement Unit': metric.measurementUnit,
    'Scope': metric.scope,
    'Description': metric.description || '',
    'Archive Time': metric.archiveTime ? 'Archivada' : 'Activa',
    'Property Created': formatDate(property.createTime),
    'Property Updated': formatDate(property.updateTime),
    'Observaciones': `${metric.measurementUnit} | ${metric.archiveTime ? '🗄️ Archivada' : '✅ Activa'}`
  };
}

function procesarStreamGA4(stream, property) {
  return {
    'Property Name': property.displayName,
    'Property ID': property.name.split('/').pop(),
    'Stream Name': stream.displayName,
    'Stream Type': stream.type,
    'Stream ID': stream.name.split('/').pop(),
    'Measurement ID / Package / Bundle': stream.webStreamData?.measurementId || stream.androidAppStreamData?.packageName || stream.iosAppStreamData?.bundleId || '',
    'Default URI': stream.webStreamData?.defaultUri || '',
    'Stream Created': formatDate(stream.createTime),
    'Stream Updated': formatDate(stream.updateTime),
    'Property Created': formatDate(property.createTime),
    'Property Updated': formatDate(property.updateTime),
    'Observaciones': `Tipo: ${stream.type} | Creado: ${formatDate(stream.createTime)}`
  };
}

// =================================================================
// FUNCIÓN DE ESCRITURA DE DATOS
// =================================================================

function escribirDatosEnHoja(sheetName, headers, dataObjects) {
  if (!dataObjects || dataObjects.length === 0) {
    logWarning('GA4', `No hay datos para escribir en la hoja ${sheetName}.`);
    writeToSheet(sheetName, headers, [], true); // Escribe solo las cabeceras
    return;
  }
  const dataAsArrays = dataObjects.map(obj => headers.map(header => obj[header] || ''));
  writeToSheet(sheetName, headers, dataAsArrays, true);
}