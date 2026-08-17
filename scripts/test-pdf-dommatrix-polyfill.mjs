import { readFile } from 'node:fs/promises';

// Simula o runtime serverless onde DOMMatrix não existe globalmente.
delete globalThis.DOMMatrix;
const matrixModule = await import('@thednp/dommatrix');
const DOMMatrixPolyfill = matrixModule.default || matrixModule.DOMMatrix || matrixModule;
globalThis.DOMMatrix = DOMMatrixPolyfill;

const { PDFParse } = await import('pdf-parse');
const pdfPath = '/home/ubuntu/upload/Resumo_Passagem_De_UTI_—_Round_Assistencial.pdf';
const parser = new PDFParse({ data: await readFile(pdfPath) });
try {
  const result = await parser.getText();
  console.log(JSON.stringify({ pages: result.total, textLength: result.text?.trim().length || 0 }));
} finally {
  await parser.destroy();
}
