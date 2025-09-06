/**
 * @fileoverview Módulo de Looker Studio v3.0 - OAUTH2 ÚNICAMENTE
 * Funciona igual que GA4 y GTM (sin API Keys)
 */

const LOOKER_STUDIO_HEADERS = [
  'Nombre', 'ID Asset', 'Herramienta', 'Tipo Asset', 'Fecha Creación',
  'Fecha Modificación', 'Fecha Eliminación', 'Owner Email', 'Owner Name',
  'Viewer Count', 'Es Público', 'Descripción', 'Tags', 'Locale', 'Tema',
  'URL Informe', 'URL Embed', 'Estado', 'Último Acceso', 'Data Sources',
  'ETag', 'Revision ID', 'Observaciones'
];

function sincronizarLookerStudioConUI() {
  const resultado = sincronizarLookerStudioCore();
  const ui = SpreadsheetApp.getUi();
  if (resultado.estado === 'SUCCESS') {
    ui.alert(
      '📊 Looker Studio Sincronizado',
      `✅ ${resultado.registros} informes sincronizados exitosamente.\n\nTiempo: ${Math.round(resultado.duracion / 1000)}s`,
      ui.ButtonSet.OK
    );
  } else {
    ui.alert(
      '❌ Error en Looker Studio',
      `La sincronización falló: ${resultado.error}\n\nRevisa la hoja LOGS para más detalles.`,
      ui.ButtonSet.OK
    );
  }
}

function sincronizarLookerStudioCore() {
  const startTime = Date.now();
  const serviceName = 'lookerStudio';
  
  try {
    logSyncStart(serviceName, Session.getActiveUser().getEmail());
    
    // USAR OAUTH2 ÚNICAMENTE (como GA4 y GTM)
    const informes = listarInformesLookerStudio();
    escribirInformesEnHoja(informes);
    
    const duration = Date.now() - startTime;
    logSyncEnd(serviceName, informes.length, duration, 'SUCCESS');
    
    return {
      registros: informes.length,
      estado: 'SUCCESS',
      duracion: duration
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logSyncEnd(serviceName, 0, duration, 'ERROR');
    logError('LOOKER', `Sincronización falló: ${error.message}`);
    return {
      registros: 0,
      estado: 'ERROR',
      duracion: duration,
      error: error.message
    };
  }
}

function listarInformesLookerStudio() {
  logEvent('LOOKER', 'Iniciando extracción con OAuth2 automático');
  
  // OAUTH2 AUTOMÁTICO (igual que GA4 y GTM)
  const oauthToken = ScriptApp.getOAuthToken();
  if (!oauthToken) {
    throw new Error('OAuth2 token requerido. El usuario debe autorizar el script.');
  }
  
  let pageToken = null;
  const todosLosInformes = [];
  let totalPaginas = 0;

  do {
    totalPaginas++;
    logEvent('LOOKER', `Procesando página ${totalPaginas}...`);
    
    // URL OFICIAL sin API Key
    const url = 'https://datastudio.googleapis.com/v1/assets:search' +
                `?assetTypes=REPORT&pageSize=100` +
                (pageToken ? `&pageToken=${pageToken}` : '');
    
    // OAUTH2 headers (igual que GA4/GTM)
    const options = { 
      method: 'GET', 
      headers: {
        'Authorization': `Bearer ${oauthToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Addocu/3.0 (Google Sheets Add-on)'
      },
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (statusCode !== 200) {
      logError('LOOKER', `Error HTTP ${statusCode}: ${responseText.substring(0, 200)}`);
      throw new Error(`Error ${statusCode}: ${responseText}`);
    }
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      logError('LOOKER', `Error parseando JSON: ${responseText.substring(0, 200)}`);
      throw new Error(`Respuesta no es JSON válido`);
    }

    if (data.assets && data.assets.length > 0) {
      logEvent('LOOKER', `Página ${totalPaginas}: Se encontraron ${data.assets.length} informes.`);
      const informesProcesados = data.assets.map(asset => procesarAssetDeInforme(asset));
      todosLosInformes.push(...informesProcesados);
    }
    
    pageToken = data.nextPageToken;
    if (pageToken) Utilities.sleep(500);
    
  } while (pageToken && totalPaginas < 50);

  logEvent('LOOKER', `Extracción completada: ${todosLosInformes.length} informes.`);
  return todosLosInformes;
}

function procesarAssetDeInforme(asset) {
  try {
    const ownerInfo = (typeof asset.owner === 'object') ? asset.owner : { email: asset.owner, displayName: asset.owner?.split('@')[0] };
    
    return {
      'Nombre': asset.title || 'Sin nombre',
      'ID Asset': asset.name || '',
      'Herramienta': 'Looker Studio',
      'Tipo Asset': asset.assetType || 'REPORT',
      'Fecha Creación': formatDate(asset.createTime),
      'Fecha Modificación': formatDate(asset.updateTime),
      'Fecha Eliminación': formatDate(asset.trashTime) || '',
      'Owner Email': ownerInfo.email || '',
      'Owner Name': ownerInfo.displayName || '',
      'Viewer Count': asset.viewerCount || 0,
      'Es Público': asset.isPublic || false,
      'Descripción': asset.description || '',
      'Tags': JSON.stringify(asset.tags || []),
      'Locale': asset.locale || '',
      'Tema': asset.theme || '',
      'URL Informe': asset.name ? `https://lookerstudio.google.com/reporting/${asset.name.split('/').pop()}` : '',
      'URL Embed': asset.embedUrl || '',
      'Estado': asset.status || 'ACTIVE',
      'Último Acceso': formatDate(asset.lastViewedTime) || '',
      'Data Sources': JSON.stringify(asset.dataSources || []),
      'ETag': asset.etag || '',
      'Revision ID': asset.revisionId || '',
      'Observaciones': construirObservacionesParaInforme(asset)
    };
  } catch (error) {
    logError('LOOKER', `Error procesando el asset ${asset.title || asset.name}: ${error.message}`);
    return { 'Nombre': asset.title || 'Error al procesar', 'Observaciones': error.message };
  }
}

function construirObservacionesParaInforme(asset) {
  const observaciones = [];
  if (asset.trashTime) observaciones.push(`⚠️ Eliminado: ${formatDate(asset.trashTime)}`);
  if (asset.isPublic) observaciones.push(`🌐 Público`);
  if (asset.updateTime && asset.updateTime !== asset.createTime) observaciones.push(`🔄 Modificado: ${formatDate(asset.updateTime)}`);
  return observaciones.join(' | ');
}

function escribirInformesEnHoja(informes) {
  if (!informes || informes.length === 0) {
    logWarning('LOOKER', 'No se encontraron informes para escribir en la hoja.');
    writeToSheet('LOOKER_STUDIO', LOOKER_STUDIO_HEADERS, [], true);
    return;
  }
  
  const datosParaHoja = informes.map(informe => 
    LOOKER_STUDIO_HEADERS.map(header => informe[header] || '')
  );
  
  writeToSheet('LOOKER_STUDIO', LOOKER_STUDIO_HEADERS, datosParaHoja, true);
}