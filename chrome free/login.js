var paginas = [
"https://facturartebarato.com",
];

// Asigna los eventos y envia la peticion a la pagina del SAT
window.onload = function() {
  testLogin(paginas[0]);
};


function testLogin (urlb) {
  $.get(urlb+'/api/test-login?callback=?', function(data) {
    if (data.id > 0) {
      data.urlb = urlb;
      chrome.storage.local.set({'session': data}, function() {
        console.log('Settings saved');
      });
      window.location.href="popup.html";
    } else {
      $(".text-center.alert").removeClass('alert-info')
        .addClass('alert-danger')
        .html('Tiene que ingresar a <strong><a href="'+urlb+'panel/login/index">facturartebarato.com</a></strong> antes de abrir la extensión')
        .find('a').on('click', function(event) {
          chrome.tabs.create({
            url: $(this).attr('href')
          });
        });
    }
  });
}