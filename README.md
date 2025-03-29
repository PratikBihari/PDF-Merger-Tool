# PDF Merger Tool

A web-based application for merging and splitting PDF files, designed for Western Coalfields Limited E-office users.

## Features

- **Merge PDFs**: Combine multiple PDF files into a single document without compromising quality.
- **Size Verification**: Automatically checks if the merged PDF is within E-office's 20MB limit.
- **Split Functionality**: For files exceeding 20MB, the tool splits them into parts of appropriate sizes.
- **Page Count Verification**: Confirms that all pages from source documents are included in the merged file.
- **Client-Side Processing**: All PDF operations are performed in the browser - no data is sent to any server.
- **Fast and Secure**: Works offline once loaded and preserves document privacy.

## How to Use

1. Visit [https://pratikbihari.github.io/PDF-Merger-Tool/](https://pratikbihari.github.io/PDF-Merger-Tool/)
2. Drag and drop PDF files or click to select them
3. Click "Merge PDFs" to process the files
4. Download the merged file (or split files if over 20MB)
5. Start a new merge when done

## Technical Details

This application uses:
- PDF-Lib.js for PDF manipulation
- Modern JavaScript ES6+ features
- Client-side processing for data privacy

## About

Designed by Pratik Bihari for Western Coalfields Limited MM Department to streamline document handling for E-office uploads.

## License

This project is for internal use by Western Coalfields Limited. 