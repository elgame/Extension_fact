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
  var xmlDoc = undefined, xml = undefined;
  for (var i = 0; i < files.length; ++i) {
    if ($.trim(files[i].xml).length > 0) {
      files[i].xml = files[i].xml.replace('<?xml version="1.0" encoding="utf-8"?>', '');
      // files[i].xml = files[i].xml.replace(/(cfdi:|implocal:)/, '');
      files[i].xml = $.trim(files[i].xml);
      xmlDoc = $.parseXML( files[i].xml );
      xml = $(xmlDoc).find('>:first-child');
      console.log(files[i]);
      console.log(xml.attr('subTotal'));
      console.log(xml.children());
      console.log(xml.children()[0]);
    }
  }
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
