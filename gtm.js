/**
 * @fileoverview Módulo de Sincronización de Google Tag Manager (GTM) - COMPLETO
 * @version 2.0 - Implementaciones completas
 */

// =================================================================
// CONSTANTES Y CONFIGURACIÓN DEL MÓDULO
// =================================================================

const GTM_TAGS_HEADERS = [
  'Container Name', 'Container ID', 'Workspace', 'Tag Name', 'Tag ID', 'Tag Type', 'Status',
  'Firing Triggers', 'Blocking Triggers', 'Firing Count', 'Blocking Count',
  'Key Parameters', 'Priority', 'Firing Option', 'Last Modified', 'Tag URL', 'Notes', 'Observaciones'
];

const GTM_VARIABLES_HEADERS = [
  'Container Name', 'Container ID', 'Workspace', 'Variable Name', 'Variable ID', 'Variable Type',
  'Key Parameters', 'Format Value', 'Disabling Triggers', 'Enabling Triggers', 'Last Modified', 'Notes', 'Observaciones'
];

const GTM_TRIGGERS_HEADERS = [
  'Container Name', 'Container ID', 'Workspace', 'Trigger Name', 'Trigger ID', 'Trigger Type',
  'Filters Summary', 'Wait for Tags', 'Check Validation', 'Wait Timeout', 'Event Names',
  'Last Modified', 'Notes', 'Observaciones'
];

// =================================================================
// FUNCIONES DE SINCRONIZACIÓN (EJECUTABLES DESDE EL MENÚ)
// =================================================================

function sincronizarGTMConUI() {
  const resultado = sincronizarGTMCore();
  const ui = SpreadsheetApp.getUi();
  
  if (resultado.estado === 'SUCCESS') {
    const detalles = resultado.detalles;
    const mensaje = `✅ GTM Sincronizado\n\n` +
      `📦 Contenedores encontrados: ${detalles.contenedoresEncontrados}\n` +
      `🎯 Contenedores procesados: ${detalles.contenedoresProcesados}\n\n` +
      `🏷️ Tags: ${detalles.tags}\n` +
      `🔧 Variables: ${detalles.variables}\n` +
      `⚡ Triggers: ${detalles.triggers}\n\n` +
      `Total: ${resultado.registros} elementos\n` +
      `Tiempo: ${Math.round(resultado.duracion / 1000)}s`;
    ui.alert('🎯 GTM Completado', mensaje, ui.ButtonSet.OK);
  } else {
    ui.alert('❌ Error en GTM', 
      `La sincronización falló: ${resultado.error}\n\nRevisa la hoja LOGS para más detalles.`,
      ui.ButtonSet.OK
    );
  }
}

// =================================================================
// LÓGICA CENTRAL DE SINCRONIZACIÓN
// =================================================================

function sincronizarGTMCore() {
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

  try {
    // Verificar autenticación
    const authConfig = getAuthConfig(serviceName);
    logSyncStart('GTM_Sync', authConfig.authUser);

    // Obtener contenedores
    const todosLosContenedores = obtenerTodosLosContenedoresGTM() || [];
    resultados.contenedoresEncontrados = todosLosContenedores.length;
    
    logEvent('GTM', `📦 Contenedores encontrados: ${todosLosContenedores.length}`);
    
    if (todosLosContenedores.length === 0) {
      logWarning('GTM', 'No se encontraron contenedores GTM accesibles');
      const duration = Date.now() - startTime;
      logSyncEnd('GTM_Sync', 0, duration, 'SUCCESS');
      return { estado: 'SUCCESS', registros: 0, duracion: duration, detalles: resultados };
    }

    // Filtrar contenedores según configuración
    const contenedoresObjetivo = obtenerContenedoresObjetivoDesdeConfig();
    const contenedoresAProcesar = contenedoresObjetivo.length > 0
      ? todosLosContenedores.filter(c => contenedoresObjetivo.includes(c.name))
      : todosLosContenedores;

    logEvent('GTM', `🎯 Contenedores a procesar: ${contenedoresAProcesar.length} de ${todosLosContenedores.length}`);

    if (contenedoresAProcesar.length === 0) {
      logWarning('GTM', 'No hay contenedores que procesar después del filtro');
      const duration = Date.now() - startTime;
      logSyncEnd('GTM_Sync', 0, duration, 'SUCCESS');
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
    
    logEvent('GTM', `✅ Sincronización completada: ${totalElementos} elementos`);
    logSyncEnd('GTM_Sync', totalElementos, duration, 'SUCCESS');
    
    return { estado: 'SUCCESS', registros: totalElementos, duracion: duration, detalles: resultados };

  } catch (error) {
    const duration = Date.now() - startTime;
    logSyncEnd('GTM_Sync', 0, duration, 'ERROR');
    logError('GTM', `❌ Error en sincronización: ${error.message}`, error.stack);
    return { estado: 'ERROR', registros: 0, duracion: duration, error: error.message };
  }
}

// =================================================================
// FUNCIONES DE EXTRACCIÓN DE CONTENEDORES Y WORKSPACES
// =================================================================

/**
 * Obtiene todos los contenedores GTM accesibles para el usuario
 */
function obtenerTodosLosContenedoresGTM() {
  try {
    const auth = getAuthConfig('gtm');
    const options = { method: 'GET', headers: auth.headers, muteHttpExceptions: true };
    
    logEvent('GTM', '🔍 Obteniendo cuentas GTM...');
    
    // Primero obtener las cuentas (sin API key, solo OAuth2)
    const accountsUrl = 'https://tagmanager.googleapis.com/tagmanager/v2/accounts';
    const accountsResponse = fetchWithRetry(accountsUrl, options, 'GTM-Accounts');
    
    if (!accountsResponse.account || accountsResponse.account.length === 0) {
      logWarning('GTM', 'No se encontraron cuentas GTM accesibles');
      return [];
    }

    logEvent('GTM', `📋 Cuentas encontradas: ${accountsResponse.account.length}`);

    // Obtener contenedores de todas las cuentas
    const todosLosContenedores = [];
    
    for (const account of accountsResponse.account) {
      try {
        logEvent('GTM', `📂 Procesando cuenta: ${account.name} (${account.accountId})`);
        
        const containersUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${account.accountId}/containers`;
        const containersResponse = fetchWithRetry(containersUrl, options, 'GTM-Containers');
        
        if (containersResponse.container && containersResponse.container.length > 0) {
          logEvent('GTM', `📦 Contenedores en ${account.name}: ${containersResponse.container.length}`);
          
          // Añadir info de cuenta a cada contenedor
          containersResponse.container.forEach(container => {
            container.accountName = account.name;
            container.accountId = account.accountId;
          });
          
          todosLosContenedores.push(...containersResponse.container);
        }
        
        Utilities.sleep(500); // Pausa entre cuentas
        
      } catch (error) {
        logError('GTM', `Error procesando cuenta ${account.name}: ${error.message}`);
        continue; // Continuar con la siguiente cuenta
      }
    }

    logEvent('GTM', `✅ Total contenedores encontrados: ${todosLosContenedores.length}`);
    return todosLosContenedores;
    
  } catch (error) {
    logError('GTM', `Error obteniendo contenedores GTM: ${error.message}`);
    throw new Error(`No se pudieron obtener los contenedores GTM: ${error.message}`);
  }
}

/**
 * Obtiene los workspaces especificados de un contenedor (con filtros)
 */
function obtenerWorkspacesGTM(container) {
  try {
    const auth = getAuthConfig('gtm');
    const options = { method: 'GET', headers: auth.headers, muteHttpExceptions: true };
    
    // Obtener filtros de workspaces desde configuración
    const userProperties = PropertiesService.getUserProperties();
    const filtrosWorkspaces = userProperties.getProperty('ADDOCU_GTM_WORKSPACES_FILTER') || '';
    const workspacesObjetivo = filtrosWorkspaces ? 
      filtrosWorkspaces.split(',').map(w => w.trim()).filter(w => w.length > 0) : [];
    
    const workspacesUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${container.accountId}/containers/${container.containerId}/workspaces`;
    const workspacesResponse = fetchWithRetry(workspacesUrl, options, 'GTM-Workspaces');
    
    if (!workspacesResponse.workspace || workspacesResponse.workspace.length === 0) {
      throw new Error(`No se encontraron workspaces para ${container.name}`);
    }

    let workspacesSeleccionados = [];
    
    if (workspacesObjetivo.length > 0) {
      // Aplicar filtros de workspaces
      logEvent('GTM', `Aplicando filtro de workspaces para ${container.name}: ${workspacesObjetivo.join(', ')}`);
      
      workspacesSeleccionados = workspacesResponse.workspace.filter(ws => {
        return workspacesObjetivo.some(filtro => 
          ws.name.toLowerCase().includes(filtro.toLowerCase()) ||
          filtro.toLowerCase().includes(ws.name.toLowerCase())
        );
      });
      
      if (workspacesSeleccionados.length === 0) {
        logWarning('GTM', `No se encontraron workspaces que coincidan con el filtro en ${container.name}. Usando Default Workspace.`);
        // Fallback al default si no hay coincidencias
        const defaultWorkspace = workspacesResponse.workspace.find(ws => 
          ws.name === 'Default Workspace' || ws.name.toLowerCase().includes('default')
        ) || workspacesResponse.workspace[0];
        workspacesSeleccionados = [defaultWorkspace];
      }
    } else {
      // Sin filtros: usar solo el workspace por defecto
      const defaultWorkspace = workspacesResponse.workspace.find(ws => 
        ws.name === 'Default Workspace' || ws.name.toLowerCase().includes('default')
      );
      
      if (defaultWorkspace) {
        workspacesSeleccionados = [defaultWorkspace];
      } else {
        workspacesSeleccionados = [workspacesResponse.workspace[0]];
        logWarning('GTM', `No se encontró 'Default Workspace' en ${container.name}, usando: ${workspacesResponse.workspace[0].name}`);
      }
    }

    logEvent('GTM', `🔧 Workspaces seleccionados en ${container.name}: ${workspacesSeleccionados.map(w => w.name).join(', ')}`);
    return workspacesSeleccionados;
    
  } catch (error) {
    logError('GTM', `Error obteniendo workspaces para ${container.name}: ${error.message}`);
    throw error;
  }
}

/**
 * Obtiene el workspace por defecto de un contenedor (funcionalidad legacy)
 */
function obtenerDefaultWorkspaceGTM(container) {
  const workspaces = obtenerWorkspacesGTM(container);
  return workspaces[0]; // Retorna el primer workspace seleccionado
}

// =================================================================
// RECOLECCIÓN DE DATOS
// =================================================================

function recolectarDatosDeContenedores(contenedores, errores) {
  const datos = { tags: [], variables: [], triggers: [] };
  let procesados = 0;

  for (const container of contenedores) {
    try {
      logEvent('GTM', `📦 [${procesados + 1}/${contenedores.length}] Procesando: ${container.name}`);
      
      const workspaces = obtenerWorkspacesGTM(container);
      if (!workspaces || workspaces.length === 0) {
        throw new Error(`No se pudieron obtener workspaces para ${container.name}`);
      }

      // Procesar todos los workspaces seleccionados
      for (const workspace of workspaces) {
        try {
          logEvent('GTM', `🔧 Procesando workspace: ${workspace.name} en ${container.name}`);
          
          const recursos = obtenerRecursosDeWorkspace(workspace, container);
          
          // Agregar datos con logging detallado
          logEvent('GTM', `📊 ${container.name}/${workspace.name}: ${recursos.tags.length} tags, ${recursos.variables.length} variables, ${recursos.triggers.length} triggers`);
          
          datos.tags.push(...recursos.tags);
          datos.variables.push(...recursos.variables);
          datos.triggers.push(...recursos.triggers);
          
          Utilities.sleep(500); // Pausa entre workspaces
          
        } catch (workspaceError) {
          const errorMsg = `${container.name}/${workspace.name}: ${workspaceError.message}`;
          errores.push(errorMsg);
          logError('GTM', `❌ Error procesando workspace: ${errorMsg}`);
        }
      }
      
      procesados++;
      Utilities.sleep(1000); // Pausa para no saturar la API
      
    } catch (error) {
      const errorMsg = `${container.name}: ${error.message}`;
      errores.push(errorMsg);
      logError('GTM', `❌ Error procesando contenedor: ${errorMsg}`);
      Utilities.sleep(2000); // Pausa más larga en caso de error
    }
  }

  logEvent('GTM', `🎯 Recolección completada: ${procesados} contenedores procesados, ${errores.length} errores`);
  return datos;
}

function obtenerRecursosDeWorkspace(workspace, container) {
  const auth = getAuthConfig('gtm');
  const options = { method: 'GET', headers: auth.headers, muteHttpExceptions: true };
  
  try {
    // Obtener Tags
    logEvent('GTM', `🏷️ Obteniendo tags de ${container.name}`);
    const tagsUrl = `https://tagmanager.googleapis.com/tagmanager/v2/${workspace.path}/tags`;
    const tagsResponse = fetchWithRetry(tagsUrl, options, 'GTM-Tags');
    Utilities.sleep(300);
    
    // Obtener Variables
    logEvent('GTM', `🔧 Obteniendo variables de ${container.name}`);
    const variablesUrl = `https://tagmanager.googleapis.com/tagmanager/v2/${workspace.path}/variables`;
    const variablesResponse = fetchWithRetry(variablesUrl, options, 'GTM-Variables');
    Utilities.sleep(300);
    
    // Obtener Triggers
    logEvent('GTM', `⚡ Obteniendo triggers de ${container.name}`);
    const triggersUrl = `https://tagmanager.googleapis.com/tagmanager/v2/${workspace.path}/triggers`;
    const triggersResponse = fetchWithRetry(triggersUrl, options, 'GTM-Triggers');
    Utilities.sleep(300);
    
    return {
      tags: (tagsResponse.tag || []).map(t => procesarTagGTM(t, container, workspace)),
      variables: (variablesResponse.variable || []).map(v => procesarVariableGTM(v, container, workspace)),
      triggers: (triggersResponse.trigger || []).map(tr => procesarTriggerGTM(tr, container, workspace))
    };
    
  } catch (error) {
    logError('GTM', `Error obteniendo recursos de workspace ${workspace.name}: ${error.message}`);
    throw error;
  }
}

// =================================================================
// PROCESADORES DE DATOS (IMPLEMENTACIONES COMPLETAS)
// =================================================================

/**
 * Procesa un tag de GTM y extrae información detallada
 */
function procesarTagGTM(tag, container, workspace) {
  try {
    // Información básica
    const tagData = {
      'Container Name': container.name || 'N/A',
      'Container ID': container.containerId || 'N/A',
      'Workspace': workspace.name || 'N/A',
      'Tag Name': tag.name || 'N/A',
      'Tag ID': tag.tagId || 'N/A',
      'Tag Type': tag.type || 'N/A',
      'Status': tag.paused ? 'Pausado' : 'Activo',
      'Last Modified': formatDate(tag.fingerprint) || 'N/A',
      'Notes': tag.notes || 'N/A'
    };

    // Triggers de disparo
    if (tag.firingTriggerId && tag.firingTriggerId.length > 0) {
      tagData['Firing Triggers'] = tag.firingTriggerId.join(', ');
      tagData['Firing Count'] = tag.firingTriggerId.length;
    } else {
      tagData['Firing Triggers'] = 'Sin triggers';
      tagData['Firing Count'] = 0;
    }

    // Triggers de bloqueo
    if (tag.blockingTriggerId && tag.blockingTriggerId.length > 0) {
      tagData['Blocking Triggers'] = tag.blockingTriggerId.join(', ');
      tagData['Blocking Count'] = tag.blockingTriggerId.length;
    } else {
      tagData['Blocking Triggers'] = 'N/A';
      tagData['Blocking Count'] = 0;
    }

    // Parámetros clave del tag
    if (tag.parameter && tag.parameter.length > 0) {
      const keyParams = tag.parameter.slice(0, 3).map(p => `${p.key}=${p.value}`);
      tagData['Key Parameters'] = keyParams.join('; ');
    } else {
      tagData['Key Parameters'] = 'N/A';
    }

    // Configuraciones adicionales
    tagData['Priority'] = tag.priority || 'N/A';
    tagData['Firing Option'] = tag.tagFiringOption || 'N/A';
    
    // URL del tag (si está disponible)
    tagData['Tag URL'] = tag.liveOnly ? 'Live Only' : 'N/A';
    
    // Observaciones automáticas
    const observaciones = [];
    if (tag.paused) observaciones.push('Tag pausado');
    if (!tag.firingTriggerId || tag.firingTriggerId.length === 0) observaciones.push('Sin triggers de disparo');
    if (tag.blockingTriggerId && tag.blockingTriggerId.length > 0) observaciones.push('Tiene triggers de bloqueo');
    
    tagData['Observaciones'] = observaciones.join('; ') || 'N/A';

    return tagData;
    
  } catch (error) {
    logError('GTM', `Error procesando tag ${tag.name}: ${error.message}`);
    return {
      'Container Name': container.name || 'N/A',
      'Container ID': container.containerId || 'N/A',
      'Tag Name': tag.name || 'N/A',
      'Tag ID': tag.tagId || 'N/A',
      'Observaciones': `Error procesando: ${error.message}`
    };
  }
}

/**
 * Procesa una variable de GTM y extrae información detallada
 */
function procesarVariableGTM(variable, container, workspace) {
  try {
    const variableData = {
      'Container Name': container.name || 'N/A',
      'Container ID': container.containerId || 'N/A',  
      'Workspace': workspace.name || 'N/A',
      'Variable Name': variable.name || 'N/A',
      'Variable ID': variable.variableId || 'N/A',
      'Variable Type': variable.type || 'N/A',
      'Last Modified': formatDate(variable.fingerprint) || 'N/A',
      'Notes': variable.notes || 'N/A'
    };

    // Parámetros de la variable
    if (variable.parameter && variable.parameter.length > 0) {
      const keyParams = variable.parameter.slice(0, 3).map(p => `${p.key}=${p.value}`);
      variableData['Key Parameters'] = keyParams.join('; ');
    } else {
      variableData['Key Parameters'] = 'N/A';
    }

    // Formato de valor
    variableData['Format Value'] = variable.formatValue || 'N/A';

    // Triggers de habilitación y deshabilitación
    if (variable.enablingTriggerId && variable.enablingTriggerId.length > 0) {
      variableData['Enabling Triggers'] = variable.enablingTriggerId.join(', ');
    } else {
      variableData['Enabling Triggers'] = 'N/A';
    }

    if (variable.disablingTriggerId && variable.disablingTriggerId.length > 0) {
      variableData['Disabling Triggers'] = variable.disablingTriggerId.join(', ');
    } else {
      variableData['Disabling Triggers'] = 'N/A';
    }

    // Observaciones automáticas
    const observaciones = [];
    if (variable.enablingTriggerId && variable.enablingTriggerId.length > 0) {
      observaciones.push('Variable condicional');
    }
    if (variable.type === 'jsm') observaciones.push('JavaScript personalizado');
    if (variable.type === 'c') observaciones.push('Constante');
    
    variableData['Observaciones'] = observaciones.join('; ') || 'N/A';

    return variableData;
    
  } catch (error) {
    logError('GTM', `Error procesando variable ${variable.name}: ${error.message}`);
    return {
      'Container Name': container.name || 'N/A',
      'Container ID': container.containerId || 'N/A',
      'Variable Name': variable.name || 'N/A',
      'Variable ID': variable.variableId || 'N/A',
      'Observaciones': `Error procesando: ${error.message}`
    };
  }
}

/**
 * Procesa un trigger de GTM y extrae información detallada
 */
function procesarTriggerGTM(trigger, container, workspace) {
  try {
    const triggerData = {
      'Container Name': container.name || 'N/A',
      'Container ID': container.containerId || 'N/A',
      'Workspace': workspace.name || 'N/A', 
      'Trigger Name': trigger.name || 'N/A',
      'Trigger ID': trigger.triggerId || 'N/A',
      'Trigger Type': trigger.type || 'N/A',
      'Last Modified': formatDate(trigger.fingerprint) || 'N/A',
      'Notes': trigger.notes || 'N/A'
    };

    // Filtros del trigger
    if (trigger.filter && trigger.filter.length > 0) {
      const filterSummary = trigger.filter.map(f => {
        const condition = f.parameter?.find(p => p.key === 'arg0')?.value || 'N/A';
        const operator = f.type || 'N/A';
        const value = f.parameter?.find(p => p.key === 'arg1')?.value || 'N/A';
        return `${condition} ${operator} ${value}`;
      }).join(' & ');
      triggerData['Filters Summary'] = filterSummary;
    } else {
      triggerData['Filters Summary'] = 'Sin filtros';
    }

    // Configuraciones avanzadas
    triggerData['Wait for Tags'] = trigger.waitForTags ? 'Sí' : 'No';
    triggerData['Check Validation'] = trigger.checkValidation ? 'Sí' : 'No';
    triggerData['Wait Timeout'] = trigger.waitForTagsTimeout || 'N/A';

    // Nombres de eventos (para triggers de eventos personalizados)
    if (trigger.eventName) {
      triggerData['Event Names'] = Array.isArray(trigger.eventName) 
        ? trigger.eventName.join(', ') 
        : trigger.eventName;
    } else {
      triggerData['Event Names'] = 'N/A';
    }

    // Observaciones automáticas
    const observaciones = [];
    if (trigger.type === 'customEvent') observaciones.push('Evento personalizado');
    if (trigger.type === 'pageview') observaciones.push('Vista de página');
    if (trigger.waitForTags) observaciones.push('Espera otros tags');
    if (!trigger.filter || trigger.filter.length === 0) observaciones.push('Sin filtros - se dispara siempre');
    
    triggerData['Observaciones'] = observaciones.join('; ') || 'N/A';

    return triggerData;
    
  } catch (error) {
    logError('GTM', `Error procesando trigger ${trigger.name}: ${error.message}`);
    return {
      'Container Name': container.name || 'N/A',
      'Container ID': container.containerId || 'N/A',
      'Trigger Name': trigger.name || 'N/A', 
      'Trigger ID': trigger.triggerId || 'N/A',
      'Observaciones': `Error procesando: ${error.message}`
    };
  }
}

// =================================================================
// FUNCIONES DE ESCRITURA
// =================================================================

function escribirDatosAgregadosGTM(datosAgregados) {
  try {
    logEvent('GTM', '📝 Escribiendo datos en hojas...');
    
    writeToSheetFromObjects('GTM_TAGS', GTM_TAGS_HEADERS, datosAgregados.tags, true);
    writeToSheetFromObjects('GTM_VARIABLES', GTM_VARIABLES_HEADERS, datosAgregados.variables, true);
    writeToSheetFromObjects('GTM_TRIGGERS', GTM_TRIGGERS_HEADERS, datosAgregados.triggers, true);
    
    logEvent('GTM', '✅ Datos escritos correctamente en todas las hojas');
    
  } catch (error) {
    logError('GTM', `Error escribiendo datos: ${error.message}`);
    throw error;
  }
}

function writeToSheetFromObjects(sheetName, headers, dataObjects, clearFirst) {
  if (!dataObjects || dataObjects.length === 0) {
    logWarning('GTM', `No hay datos para la hoja ${sheetName}`);
    return;
  }
  
  try {
    // Convertir objetos a arrays usando los headers como orden
    const dataAsArrays = dataObjects.map(obj => 
      headers.map(header => obj[header] || 'N/A')
    );
    
    writeToSheet(sheetName, headers, dataAsArrays, clearFirst);
    logEvent('GTM', `✅ Hoja ${sheetName}: ${dataObjects.length} registros`);
    
  } catch (error) {
    logError('GTM', `Error escribiendo en ${sheetName}: ${error.message}`);
    throw error;
  }
}