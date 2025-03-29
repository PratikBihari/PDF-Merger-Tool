document.addEventListener('DOMContentLoaded', function() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const mergeBtn = document.getElementById('mergeBtn');
    const loading = document.getElementById('loading');
    const resultContainer = document.getElementById('resultContainer');
    const resultContent = document.getElementById('resultContent');
    const pageCountSummary = document.getElementById('pageCountSummary');
    const newMergeBtn = document.getElementById('newMergeBtn');
    
    let selectedFiles = [];
    const MAX_SIZE_MB = 20;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
    
    // Format file size
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Update file list display
    function updateFileList() {
        fileList.innerHTML = '';
        
        if (selectedFiles.length === 0) {
            mergeBtn.disabled = true;
            return;
        }
        
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <div class="file-details">
                    <div class="file-name"><i class="fas fa-file-pdf"></i> ${file.name}</div>
                    <div class="file-meta">
                        <span><i class="fas fa-weight-hanging"></i> ${formatFileSize(file.size)}</span>
                    </div>
                </div>
                <button class="btn btn-danger remove-btn" data-index="${i}">
                    <i class="fas fa-trash"></i> Remove
                </button>
            `;
            fileList.appendChild(fileItem);
            
            // Add event listener to remove button
            const removeBtn = fileItem.querySelector('.remove-btn');
            removeBtn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                selectedFiles.splice(index, 1);
                updateFileList();
            });
        }
        
        mergeBtn.disabled = false;
    }
    
    // Handle file selection from input
    fileInput.addEventListener('change', function(e) {
        const files = e.target.files;
        
        for (let i = 0; i < files.length; i++) {
            if (files[i].type === 'application/pdf') {
                selectedFiles.push(files[i]);
            }
        }
        
        updateFileList();
    });
    
    // Handle dropzone click
    dropzone.addEventListener('click', function() {
        fileInput.click();
    });
    
    // Handle drag and drop
    dropzone.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropzone.classList.add('dropzone-active');
    });
    
    dropzone.addEventListener('dragleave', function() {
        dropzone.classList.remove('dropzone-active');
    });
    
    dropzone.addEventListener('drop', function(e) {
        e.preventDefault();
        dropzone.classList.remove('dropzone-active');
        
        const files = e.dataTransfer.files;
        
        for (let i = 0; i < files.length; i++) {
            if (files[i].type === 'application/pdf') {
                selectedFiles.push(files[i]);
            }
        }
        
        updateFileList();
    });
    
    // Handle merge button click
    mergeBtn.addEventListener('click', async function() {
        if (selectedFiles.length === 0) {
            return;
        }
        
        // Show loading indicator
        loading.style.display = 'block';
        mergeBtn.disabled = true;
        
        try {
            // Create a new PDF document
            const mergedPdf = await PDFLib.PDFDocument.create();
            let totalPages = 0;
            let uploadedPages = 0;
            
            // Process each file
            for (const file of selectedFiles) {
                // Convert File to ArrayBuffer
                const arrayBuffer = await file.arrayBuffer();
                
                // Load the PDF
                const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
                const pages = pdf.getPages();
                uploadedPages += pages.length;
                
                // Add pages to the merged PDF
                const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                copiedPages.forEach(page => {
                    mergedPdf.addPage(page);
                    totalPages++;
                });
            }
            
            // Save the merged PDF
            const mergedPdfBytes = await mergedPdf.save();
            const mergedPdfBlob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
            const mergedSize = mergedPdfBytes.length;
            
            // Display page count summary
            const pagesMatch = uploadedPages === totalPages;
            const pageAlertClass = pagesMatch ? 'alert-success' : 'alert-warning';
            const pageAlertIcon = pagesMatch ? 'fa-check-circle' : 'fa-exclamation-triangle';
            const pageAlertMessage = pagesMatch 
                ? 'Perfect! All pages were successfully merged for E-office upload.' 
                : 'Warning: The number of pages in the merged file doesn\'t match the total uploaded pages.';
            
            let pageCountHtml = `
                <div class="alert ${pageAlertClass}">
                    <i class="fas ${pageAlertIcon}"></i> ${pageAlertMessage}
                </div>
                <div class="page-count-item">
                    <div>Total Pages Uploaded:</div>
                    <div><strong>${uploadedPages}</strong></div>
                </div>
                <div class="page-count-item">
                    <div>Merged PDF Pages:</div>
                    <div><strong>${totalPages}</strong></div>
                </div>
            `;
            
            pageCountSummary.innerHTML = pageCountHtml;
            
            // Display result
            let resultHtml = '';
            
            if (mergedSize > MAX_SIZE_BYTES) {
                // Split PDF if it's too large
                resultHtml += `
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle"></i> The merged file exceeds the E-office 20MB limit, so it will be split into smaller parts for easier uploading.
                    </div>
                    <div class="file-item">
                        <div class="file-details">
                            <div class="file-name"><i class="fas fa-file-pdf"></i> merged.pdf (Original)</div>
                            <div class="file-meta">
                                <span><i class="fas fa-weight-hanging"></i> ${formatFileSize(mergedSize)}</span>
                                <span><i class="fas fa-file-alt"></i> ${totalPages} pages</span>
                            </div>
                        </div>
                        <button class="btn btn-download" id="downloadOriginal">
                            <i class="fas fa-download"></i> Download
                        </button>
                    </div>
                    <h3 class="section-title" style="margin-top: 25px; font-size: 1.3rem;">E-office Compatible Split Files</h3>
                    <p class="split-files-info" style="margin-bottom: 15px; color: #0056b3;">Each part is guaranteed to be under 18MB for E-office uploads.</p>
                `;
                
                // Show initial loading message
                resultContent.innerHTML = resultHtml + `
                    <div id="splitStatus" class="alert alert-info text-center">
                        <i class="fas fa-spinner fa-spin"></i> Creating E-office compatible splits...
                    </div>
                `;
                
                try {
                    // Set a strict 18MB limit for each part (safer than 20MB)
                    const SAFE_SIZE_LIMIT = 18 * 1024 * 1024;
                    
                    // Load the PDF for splitting
                    const pdfToSplit = await PDFLib.PDFDocument.load(mergedPdfBytes);
                    const totalPageCount = pdfToSplit.getPageCount();
                    const splitStatus = document.getElementById('splitStatus');
                    
                    // Array to store our split parts
                    const parts = [];
                    
                    // We'll process one page at a time to ensure precise size control
                    let currentPart = await PDFLib.PDFDocument.create();
                    let currentPartPages = 0;
                    let currentPartNumber = 1;
                    let pageStart = 1; // Human-readable page number (starting from 1)
                    
                    // Process each page
                    for (let i = 0; i < totalPageCount; i++) {
                        // Update status
                        splitStatus.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Processing page ${i+1} of ${totalPageCount}...`;
                        
                        // Test if adding this page would exceed our limit
                        const testDoc = await PDFLib.PDFDocument.create();
                        
                        // Copy all pages from current part
                        if (currentPartPages > 0) {
                            const currentPages = currentPart.getPages();
                            const copiedCurrentPages = await testDoc.copyPages(
                                currentPart,
                                [...Array(currentPartPages).keys()]
                            );
                            copiedCurrentPages.forEach(page => testDoc.addPage(page));
                        }
                        
                        // Try adding the new page
                        const [newPage] = await testDoc.copyPages(pdfToSplit, [i]);
                        testDoc.addPage(newPage);
                        
                        // Check the size
                        const testBytes = await testDoc.save();
                        const testSize = testBytes.length;
                        
                        // If this page would make the current part too large, finalize current part and start a new one
                        if (testSize > SAFE_SIZE_LIMIT && currentPartPages > 0) {
                            // Finalize current part without adding this page
                            const currentPartBytes = await currentPart.save();
                            const currentPartSize = currentPartBytes.length;
                            
                            // Save this part
                            parts.push({
                                number: currentPartNumber,
                                pages: currentPartPages,
                                size: currentPartSize,
                                data: currentPartBytes,
                                pageRange: `${pageStart}-${pageStart + currentPartPages - 1}`
                            });
                            
                            // Start a new part
                            currentPart = await PDFLib.PDFDocument.create();
                            currentPartPages = 0;
                            currentPartNumber++;
                            pageStart = i + 1;
                        }
                        
                        // Add this page to the current part
                        const [pageToAdd] = await currentPart.copyPages(pdfToSplit, [i]);
                        currentPart.addPage(pageToAdd);
                        currentPartPages++;
                        
                        // Special case: if this is a single page and it exceeds the limit
                        if (currentPartPages === 1) {
                            const singlePageBytes = await currentPart.save();
                            const singlePageSize = singlePageBytes.length;
                            
                            if (singlePageSize > SAFE_SIZE_LIMIT) {
                                splitStatus.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Warning: Page ${i+1} is ${formatFileSize(singlePageSize)} which exceeds our target limit.`;
                                
                                // We'll still include it, but with a warning
                                parts.push({
                                    number: currentPartNumber,
                                    pages: 1,
                                    size: singlePageSize,
                                    data: singlePageBytes,
                                    pageRange: `${pageStart}`,
                                    oversized: true
                                });
                                
                                // Start a new part
                                currentPart = await PDFLib.PDFDocument.create();
                                currentPartPages = 0;
                                currentPartNumber++;
                                pageStart = i + 2;
                            }
                        }
                    }
                    
                    // Don't forget to add the last part if it has any pages
                    if (currentPartPages > 0) {
                        const lastPartBytes = await currentPart.save();
                        const lastPartSize = lastPartBytes.length;
                        
                        parts.push({
                            number: currentPartNumber,
                            pages: currentPartPages,
                            size: lastPartSize,
                            data: lastPartBytes,
                            pageRange: currentPartPages === 1 ? `${pageStart}` : `${pageStart}-${pageStart + currentPartPages - 1}`
                        });
                    }
                    
                    // Build HTML for all parts
                    let partsHtml = '';
                    for (const part of parts) {
                        const isOversized = part.oversized;
                        const sizeClass = isOversized ? 'text-danger' : 'text-primary';
                        const sizeStyle = isOversized 
                            ? 'font-weight: bold; color: #dc3545;' 
                            : 'font-weight: bold; color: #0056b3;';
                        
                        const warningBadge = isOversized 
                            ? `<span class="badge bg-warning text-dark" style="margin-left: 5px;">Exceeds 18MB</span>` 
                            : '';
                        
                        partsHtml += `
                            <div class="file-item">
                                <div class="file-details">
                                    <div class="file-name">
                                        <i class="fas fa-file-pdf"></i> part_${part.number}.pdf${warningBadge}
                                    </div>
                                    <div class="file-meta">
                                        <span style="${sizeStyle}"><i class="fas fa-weight-hanging"></i> ${formatFileSize(part.size)}</span>
                                        <span><i class="fas fa-file-alt"></i> ${part.pages} pages (Pages ${part.pageRange})</span>
                                    </div>
                                </div>
                                <button class="btn btn-download part-download" data-part-index="${part.number - 1}">
                                    <i class="fas fa-download"></i> Download
                                </button>
                            </div>
                        `;
                    }
                    
                    // Replace loading indicator with parts
                    resultContent.innerHTML = resultHtml + partsHtml;
                    
                    // Add event listener for original download
                    document.getElementById('downloadOriginal').addEventListener('click', function() {
                        download(mergedPdfBlob, 'merged.pdf', 'application/pdf');
                    });
                    
                    // Add event listeners for part downloads
                    document.querySelectorAll('.part-download').forEach(function(button) {
                        button.addEventListener('click', function() {
                            const partIndex = parseInt(this.getAttribute('data-part-index'));
                            const part = parts[partIndex];
                            const partBlob = new Blob([part.data], { type: 'application/pdf' });
                            download(partBlob, `part_${part.number}.pdf`, 'application/pdf');
                        });
                    });
                    
                } catch (error) {
                    console.error('Error splitting PDF:', error);
                    resultContent.innerHTML = resultHtml + `
                        <div class="alert alert-danger">
                            <i class="fas fa-exclamation-circle"></i> Error creating PDF splits. Try downloading the original and splitting it manually.
                        </div>
                    `;
                    
                    // Still allow downloading the original
                    document.getElementById('downloadOriginal').addEventListener('click', function() {
                        download(mergedPdfBlob, 'merged.pdf', 'application/pdf');
                    });
                }
                
            } else {
                // Show download for single file if it's not too large
                resultHtml += `
                    <div class="alert alert-success">
                        <i class="fas fa-check-circle"></i> Your merged file is under 20MB and ready for E-office upload.
                    </div>
                    <div class="file-item">
                        <div class="file-details">
                            <div class="file-name"><i class="fas fa-file-pdf"></i> merged.pdf</div>
                            <div class="file-meta">
                                <span><i class="fas fa-weight-hanging"></i> ${formatFileSize(mergedSize)}</span>
                                <span><i class="fas fa-file-alt"></i> ${totalPages} pages</span>
                            </div>
                        </div>
                        <button class="btn btn-download" id="downloadMerged">
                            <i class="fas fa-download"></i> Download
                        </button>
                    </div>
                `;
                
                resultContent.innerHTML = resultHtml;
                
                // Add event listener for download
                document.getElementById('downloadMerged').addEventListener('click', function() {
                    download(mergedPdfBlob, 'merged.pdf', 'application/pdf');
                });
            }
            
            // Show result container
            resultContainer.style.display = 'block';
            
            // Add more info to the file list
            const fileListItems = selectedFiles.map((file, index) => {
                return `
                    <div class="file-item">
                        <div class="file-details">
                            <div class="file-name"><i class="fas fa-file-pdf"></i> ${file.name}</div>
                            <div class="file-meta">
                                <span><i class="fas fa-weight-hanging"></i> ${formatFileSize(file.size)}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            fileList.innerHTML = fileListItems;
            
        } catch (error) {
            console.error('Error merging PDFs:', error);
            alert('Error merging PDFs. Please try again or use a different browser.');
        } finally {
            // Hide loading indicator
            loading.style.display = 'none';
        }
    });
    
    // Handle new merge button
    newMergeBtn.addEventListener('click', function() {
        // Reset all state
        selectedFiles = [];
        fileList.innerHTML = '';
        resultContainer.style.display = 'none';
        mergeBtn.disabled = true;
    });
}); 