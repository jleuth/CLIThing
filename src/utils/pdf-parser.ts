import * as fs from 'fs';
import * as pdfParse from 'pdf-parse';

export async function parsePDF(buffer: any) {
  const data = await pdfParse(buffer);
  return data.text;
}

// Usage:
const buffer = fs.readFileSync('yourfile.pdf');
parsePDF(buffer).then(text => console.log(text));