function doGet(e) {
  const params = e.parameter;
  const ss = SpreadsheetApp.openById("166QhFhCn8FMoPfO7_E4pTJREU5KJ8uSVk6LA7-7dUp4");
  const sheet = ss.getSheetByName("JOGO");
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  let jogos = data.slice(1).map(row => {
    let obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });

  if (params.ano) {
    jogos = jogos.filter(j => String(j["ANO"]) === params.ano);
  }
  if (params.adversario) {
    jogos = jogos.filter(j => 
      String(j["ADVERSARIO"]).toLowerCase().includes(params.adversario.toLowerCase())
    );
  }
  if (params.resultado) {
    jogos = jogos.filter(j => 
      String(j["RESULTADO"]).toLowerCase() === params.resultado.toLowerCase()
    );
  }
  if (params.mando) {
    jogos = jogos.filter(j => 
      String(j["MANDO"]).toLowerCase() === params.mando.toLowerCase()
    );
  }

  const page = parseInt(params.page) || 1;
  const limit = parseInt(params.limit) || 100;
  const start = (page - 1) * limit;
  const paginado = jogos.slice(start, start + limit);

  const resposta = {
    total: jogos.length,
    page: page,
    limit: limit,
    totalPages: Math.ceil(jogos.length / limit),
    data: paginado
  };

  return ContentService
    .createTextOutput(JSON.stringify(resposta))
    .setMimeType(ContentService.MimeType.JSON);
}