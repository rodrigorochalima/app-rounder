const fs = require('node:fs');
const pdfParse = require('pdf-parse');

const pdfPath = '/home/ubuntu/upload/Resumo_Passagem_De_UTI_—_Round_Assistencial.pdf';
pdfParse(fs.readFileSync(pdfPath))
  .then((result) => {
    console.log(JSON.stringify({ pages: result.numpages, textLength: result.text.trim().length }));
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
