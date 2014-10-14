
// Busca los links de descarga de los XML y los regresa al plugin
var links = [];
$("#DivPaginas table img.BtnDescarga").each(function(index, el) {
  var $this = $(this);

  links.push({
    url: $this.attr("onclick").replace("return AccionCfdi('", "").replace("','Recuperacion');", ""),
    name: $("td:nth-child(2) span", $this.parents("tr")).text(),
  });
});

chrome.extension.sendRequest(links);
