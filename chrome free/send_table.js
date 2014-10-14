
var excel = "<table>",
widths = [300, 120, 350, 120, 350, 270, 270, 120, 120, 100, 100, 100];

excel += "<tr style='font-weight:bold;font-size:12px;'>";
$("#ContenedorDinamico table.encabezadoresultado tr th span").each(function(index, el) {
  if(index > 0){
    excel += "<td style='width:"+widths[index-1]+"px;border:1px solid #000;background-color: #cccccc;'>" + $(this).text() + "</td>";
  }
});
excel += '</tr>';

$("#DivPaginas table tbody tr").each(function(indextr, el) {
  excel += "<tr>";
  $(this).find("td span").each(function(index,data) {
    excel += "<td style='width:"+widths[index]+"px;border:1px solid #000;'>" + $(this).text() + "</td>";
  });
  excel += '</tr>';
});
excel += '</table>';

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

chrome.extension.sendRequest(excelFile);
