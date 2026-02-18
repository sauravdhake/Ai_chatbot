import { indexTheDocument } from './src/indexDocs.js';
import path from 'path';

async function run() {
    console.log('--- Starting Indexing Process ---');
    const pdfPath = path.resolve('cg-knowledge-base.pdf');
    console.log(`Target PDF: ${pdfPath}`);

    try {
        await indexTheDocument(pdfPath);
        console.log('--- Indexing Completed Successfully ---');
    } catch (error) {
        console.error('--- Indexing Failed ---');
        console.error(error);
    }
}

run();
