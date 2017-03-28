// Lista de links a descargar
var visibleLinks = [],
sessionData = null;



// Obtiene el contenido de los xml y los comprime para descargar un zip
var contadorFiles = 0, listFiles = [], incremetos = 0;
function downloadCheckedLinks(tipo) {
  contadorFiles = 0;
  listFiles = [];
  incremetos = 100/visibleLinks.length;

  // obtiene los xml
  for (var i = 0; i < visibleLinks.length; ++i) {
      contadorFiles++;
      getXmlSat(visibleLinks[i], tipo);
  }
}

// Obtiene los datos de los xml
function getXmlSat (vLinks, tipo) {
  $.get(vLinks.url, function(data){
    listFiles.push({
      xml: data,
      name: vLinks.name+'.xml'
    });
    // manipula el % de la barra
    var bar = $("#barProgres .progress-bar"),
    valor = parseFloat(bar.attr("aria-valuenow"))+incremetos;
    bar.attr('aria-valuenow', valor).css('width', valor+"%").text(parseInt(valor/incremetos)+' / '+visibleLinks.length);
  }).always(function() {
    contadorFiles--;
    // cuando es el ultimo entra a generar el zip
    if (contadorFiles == 0) {
      if (tipo === 'excel')
        createExcel(listFiles);
      else
        createZip(listFiles);
    }
  });
}

// Crea el zip con todos los xml
function createZip (files) {
  // Registra el cargo
  insertCargo(function(){
    // Crea el zip
    var zip = new JSZip();
    for (var i = 0; i < files.length; ++i) {
      zip.file(files[i].name, files[i].xml);
    }
    content = zip.generate({type:"base64"});

    // Descarga el archivo con el gestor de chrome
    chrome.downloads.download({
      url: 'data:application/zip;base64,' + content,
      filename: "archivo.zip",
      saveAs: true
    },
    function(id) {
      console.log(id);
    });
  });
}

function downloadExcel () {
  // si ya estan descargados los xml solo procesa el archivo de excel
  if (listFiles.length > 0) {
    createExcel(listFiles);
  } else
    downloadCheckedLinks('excel');
  // chrome.windows.getCurrent(function (currentWindow) {
  //   chrome.tabs.query({active: true, windowId: currentWindow.id},
  //   function(activeTabs) {
  //     chrome.tabs.executeScript(activeTabs[0].id, {file: 'libs/jquery-2.1.1.min.js', allFrames: true});
  //     chrome.tabs.executeScript(activeTabs[0].id, {file: 'send_table.js', allFrames: true});
  //   });
  // });
}

// Crea el archivo de excel con los datos de los xmls
function createExcel (files) {
  var xmlDoc = undefined, xml = undefined,
  emisor = undefined, receptor = undefined, impuestos = undefined, complemento = undefined,
  $tabla = { header: {}, rows: [] };
  for (var i = 0; i < files.length; ++i) {
    if ($.trim(files[i].xml).length > 0) {
      files[i].xml = files[i].xml.replace('<?xml version="1.0" encoding="utf-8"?>', '');
      // files[i].xml = files[i].xml.replace(/(cfdi:|implocal:)/, '');
      files[i].xml = $.trim(files[i].xml);
      xmlDoc = $.parseXML( files[i].xml );
      xml = $(xmlDoc).find('>:first-child');

      emisor      = undefined;
      receptor    = undefined;
      impuestos   = undefined;
      complemento = undefined;

      xml.children().each(function(index, el) {
        if ($(this).prop("tagName") == 'cfdi:Emisor') emisor = $(this);
        else if ($(this).prop("tagName") == 'cfdi:Receptor') receptor = $(this);
        else if ($(this).prop("tagName") == 'cfdi:Impuestos') impuestos = $(this);
        else if ($(this).prop("tagName") == 'cfdi:Complemento') complemento = $(this);
      });

      $row = {};
      // Emisor
      $tabla.header.Emisor_Nombre = 'Emisor Nombre';
      $tabla.header.Emisor_RFC    = 'Emisor RFC';
      $row.Emisor_Nombre = emisor.attr('nombre');
      $row.Emisor_RFC    = emisor.attr('rfc');
      // Receptor
      $tabla.header.Receptor_Nombre = 'Receptor Nombre';
      $tabla.header.Receptor_RFC    = 'Receptor RFC';
      $row.Receptor_Nombre = receptor.attr('nombre');
      $row.Receptor_RFC    = receptor.attr('rfc');
      // Factura
      $tabla.header.Fecha = 'Fecha';
      $tabla.header.Serie = 'Serie';
      $tabla.header.Folio = 'Folio';
      $tabla.header.Tipo  = 'Tipo';
      $row.Fecha = xml.attr('fecha');
      $row.Serie = xml.attr('serie');
      $row.Folio = xml.attr('folio');
      $row.Tipo  = xml.attr('tipoDeComprobante');
      // Totales
      $tabla.header.SubTotal  = 'SubTotal';
      $tabla.header.Descuento = 'Descuento';
      $tabla.header.Total     = 'Total';
      $row.SubTotal  = xml.attr('subTotal');
      $row.Descuento = xml.attr('descuento');
      $row.Total     = xml.attr('total');

      // Impuestos federales
      if (impuestos) {
        var retenciones = undefined, traslados = undefined;
        impuestos.children().each(function(index, el) {
          if ($(this).prop("tagName") == 'cfdi:Retenciones') retenciones = $(this);
          else if ($(this).prop("tagName") == 'cfdi:Traslados') traslados = $(this);
        });

        if (retenciones) {
          retenciones.children().each(function(index, el) {
            $tabla.header['Retencion_'+$(this).attr('impuesto').replace(' ', '')] = 'Retencion '+$(this).attr('impuesto');
            $row['Retencion_'+$(this).attr('impuesto').replace(' ', '')]  = $(this).attr('importe');
          });
        }
        $tabla.header['Total_Impuestos_Retenidos'] = 'Total Impuestos Retenidos';
        $row['Total_Impuestos_Retenidos']  = parseFloat(impuestos.attr('totalImpuestosRetenidos'))||0;

        if (traslados) {
          traslados.children().each(function(index, el) {
            $tabla.header['Traslado_'+$(this).attr('impuesto').replace(' ', '')+'_'+$(this).attr('tasa')] =
                'Traslado '+$(this).attr('impuesto')+' '+$(this).attr('tasa');
            $row['Traslado_'+$(this).attr('impuesto').replace(' ', '')+'_'+$(this).attr('tasa')] = $(this).attr('importe');
          });
        }
        $tabla.header['Total_Impuestos_Trasladados'] = 'Total Impuestos Trasladados';
        $row['Total_Impuestos_Trasladados']  = parseFloat(impuestos.attr('totalImpuestosTrasladados'))||0;
      }

      // Impuestos locales
      if (complemento) {
        var retenciones = [], traslados = [], impuestosLocales = undefined;
        complemento.children().each(function(index, el) {
          if ($(this).prop("tagName") == 'implocal:ImpuestosLocales') {
            impuestosLocales = $(this);
            impuestosLocales.children().each(function(index2, el2) {
              if ($(this).prop("tagName") == 'implocal:RetencionesLocales')
                retenciones.push($(this));
              else if ($(this).prop("tagName") == 'implocal:TrasladosLocales')
                traslados.push($(this));
            });
          }
        });

        if (retenciones.length > 0) {
          retenciones.each(function(index, el) {
            var nm = $.trim($(this).attr('ImpLocRetenido').replace(/ret\./i, ''));
            $tabla.header['RetencionL_'+nm.replace(' ', '')+'_'+$(this).attr('TasadeRetencion')] = 'RetencionL '+nm+' '+$(this).attr('TasadeRetencion');
            $row['RetencionL_'+nm.replace(' ', '')+'_'+$(this).attr('TasadeRetencion')]  = $(this).attr('Importe');
          });
          $tabla.header['Total_RetencionesL'] = 'Total RetencionesL';
          $row['Total_RetencionesL']  = parseFloat(impuestosLocales.attr('TotaldeRetenciones'))||0;
        }

        if (traslados.length > 0) {
          traslados.each(function(index, el) {
            $tabla.header['TrasladoL_'+$(this).attr('ImpLocTrasladado').replace(' ', '')+'_'+$(this).attr('TasadeTraslado')] =
                'TrasladoL '+$(this).attr('ImpLocTrasladado')+' '+$(this).attr('TasadeTraslado');
            $row['TrasladoL_'+$(this).attr('ImpLocTrasladado').replace(' ', '')+'_'+$(this).attr('TasadeTraslado')] = $(this).attr('Importe');
          });
        }
        $tabla.header['Total_TrasladosL'] = 'Total TrasladosL';
        $row['Total_TrasladosL']  = parseFloat(impuestos.attr('TotaldeTraslados'))||0;
      }

      $tabla.rows.push($row);
    }
  }

  var excel = "<table>";
  excel += "<tr style='font-weight:bold;font-size:12px;'>";
  $.each($tabla.header, function(index, el) {
    excel += "<td style='border:1px solid #000;background-color: #cccccc;'>" + el + "</td>";
  });
  excel += '</tr>';

  $.each($tabla.rows, function(index, el) {
    excel += "<tr>";
    $.each(el, function(index2, el2) {
      excel += "<td>" + (el2? el2: '') + "</td>";
    });
    excel += '</tr>';
  });

  var excelFile = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:x='urn:schemas-microsoft-com:office:excel' xmlns='http://www.w3.org/TR/REC-html40'>";
            excelFile += "<head>";
            excelFile += "<!--[if gte mso 9]>";
            excelFile += "<xml>";
            excelFile += "<x:ExcelWorkbook>";
            excelFile += "<x:ExcelWorksheets>";
            excelFile += "<x:ExcelWorksheet>";
            excelFile += "<x:Name>";
            excelFile += "{worksheet}";
            excelFile += "</x:Name>";
            excelFile += "<x:WorksheetOptions>";
            excelFile += "<x:DisplayGridlines/>";
            excelFile += "</x:WorksheetOptions>";
            excelFile += "</x:ExcelWorksheet>";
            excelFile += "</x:ExcelWorksheets>";
            excelFile += "</x:ExcelWorkbook>";
            excelFile += "</xml>";
            excelFile += "<![endif]-->";
            excelFile += "</head>";
            excelFile += "<body>";
            excelFile += excel;
            excelFile += "</body>";
            excelFile += "</html>";

  downloadFileExcel(excelFile);
}

function downloadFileExcel (html) {
  var content = $.base64.encode(html);

  // Registra el cargo
  insertCargo(function(){
    // Descarga el archivo con el gestor de chrome
    chrome.downloads.download({
      url: 'data:application/vnd.ms-excel;base64,' + content,
      filename: "archivo.xls",
      saveAs: true
    },
    function(id) {
      console.log(id);
    });
  });

}

// Agrega el cargo al usuario de facturarte de un xls o xml
function insertCargo (callback) {
  $.post(sessionData.urlb+'/api/v1/sat_download',
    function(data, textStatus, xhr) {
      console.log(data);
      if (data.msg.error) {
        errorCargo();
      } else
        callback.call(this);
  }).fail(function() {
    errorCargo();
  });
}

function errorCargo () {
  $("#rowcontent, .btnsshow").hide();
  $("#msgs").show();
  $("#msgs .text-center.alert").removeClass('alert-info')
        .addClass('alert-danger')
        .html('La sesión caduco, tiene que ingresar a <strong><a href="'+sessionData.urlb+'/panel/login/index">facturartebarato.com</a></strong> antes de abrir la extensión')
        .find('a').on('click', function(event) {
          chrome.tabs.create({
            url: $(this).attr('href')
          });
        });
}

// Recibe la respuesta (los links obtenidos de la pagina del SAT)
// al insertar los scrips a la pagina del SAT
chrome.extension.onRequest.addListener(function(links) {
  if (typeof links === 'string') {
    downloadFileExcel(links);
  } else {
    if (links.length > 0) {
      $("#barProgres .progress-bar").text('0/'+links.length);
      $("#seEncontraron").text('Se encontraron '+links.length+' CFDIs');
      visibleLinks = links;

      for (var i = 0; i < visibleLinks.length; ++i) {
        visibleLinks[i].url = "https://portalcfdi.facturaelectronica.sat.gob.mx/"+visibleLinks[i].url;
      }

      $("#msgs").hide();
      $(".btnsshow").removeClass('hidden');
    }else {
      $("#msgs .text-center.alert").removeClass('alert-info')
        .addClass('alert-danger')
        .html("<stron>No se encontraron resultados</stron> o no se encuentra en la pagina del SAT");
    }
  }
});

// Asigna los eventos y envia la peticion a la pagina del SAT
window.onload = function() {
  chrome.storage.local.get('session', function(items){
    sessionData = items.session;
    $("#usuario_session").text(sessionData.username);
  });
  document.getElementById('descargaCfdi').onclick = downloadCheckedLinks;
  document.getElementById('descargaExcel').onclick = downloadExcel;

  chrome.windows.getCurrent(function (currentWindow) {
    chrome.tabs.query({active: true, windowId: currentWindow.id},
    function(activeTabs) {
      chrome.tabs.executeScript(activeTabs[0].id, {file: 'libs/jquery-2.1.1.min.js', allFrames: true});
      chrome.tabs.executeScript(activeTabs[0].id, {file: 'send_links.js', allFrames: true});
    });
  });

  window.setTimeout(function(){
    if (visibleLinks.length == 0) {
      $("#msgs .text-center.alert").removeClass('alert-info')
        .addClass('alert-danger')
        .html("<stron>No se encontraron resultados</stron> o no se encuentra en la pagina del SAT");
    }
  }, 5000);

};
