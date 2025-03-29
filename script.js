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
                    <p class="split-files-info" style="margin-bottom: 15px; color: #0056b3;">Each file is under 18MB for seamless E-office uploading.</p>
                `;
                
                // Show initial processing message
                resultContent.innerHTML = resultHtml + `
                    <div id="splitStatus" class="alert alert-info text-center">
                        <i class="fas fa-spinner fa-spin"></i> Preparing PDF splits...
                    </div>
                `;
                
                try {
                    // Define safe size limit (18MB)
                    const SAFE_SIZE_LIMIT = 18 * 1024 * 1024;
                    
                    // Get the status element for updates
                    const splitStatus = document.getElementById('splitStatus');
                    
                    // First calculate how many parts we need based on file size
                    const estimatedParts = Math.ceil(mergedSize / SAFE_SIZE_LIMIT);
                    splitStatus.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Creating ${estimatedParts} optimized splits...`;
                    
                    // Load PDF for analysis
                    const pdfToSplit = await PDFLib.PDFDocument.load(mergedPdfBytes);
                    
                    // Create an array to hold our split parts
                    const parts = [];
                    
                    // If the PDF is very small or has only one page, handle specially
                    if (totalPages === 1) {
                        if (mergedSize <= SAFE_SIZE_LIMIT) {
                            // Just one small page, use the original
                            parts.push({
                                index: 1,
                                pages: 1,
                                pageRange: "1",
                                size: mergedSize,
                                data: mergedPdfBytes
                            });
                        } else {
                            // One large page that exceeds our limit
                            parts.push({
                                index: 1,
                                pages: 1,
                                pageRange: "1",
                                size: mergedSize,
                                data: mergedPdfBytes,
                                oversized: true
                            });
                        }
                    } else {
                        // Multiple pages - start splitting
                        
                        // Use average page size as initial guide
                        const avgPageSize = mergedSize / totalPages;
                        // Initial estimate of pages per part
                        let pagesPerPart = Math.floor(SAFE_SIZE_LIMIT / avgPageSize * 0.9); // 90% buffer
                        // Ensure at least 1 page per part
                        pagesPerPart = Math.max(1, pagesPerPart);
                        
                        let partIndex = 1;
                        let processedPages = 0;
                        
                        // Process pages until we've covered the whole document
                        while (processedPages < totalPages) {
                            splitStatus.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Creating part ${partIndex}...`;
                            
                            // Calculate how many pages to try in this part
                            let pagesToTry = Math.min(pagesPerPart, totalPages - processedPages);
                            const pageIndices = [];
                            for (let i = 0; i < pagesToTry; i++) {
                                pageIndices.push(processedPages + i);
                            }
                            
                            // Create test document with these pages
                            const testDoc = await PDFLib.PDFDocument.create();
                            const pagesToAdd = await testDoc.copyPages(pdfToSplit, pageIndices);
                            pagesToAdd.forEach(page => testDoc.addPage(page));
                            
                            const testBytes = await testDoc.save();
                            const testSize = testBytes.length;
                            
                            // Check if we need to reduce pages to stay under limit
                            if (testSize > SAFE_SIZE_LIMIT && pagesToTry > 1) {
                                // Binary search to find maximum number of pages under limit
                                let low = 1;
                                let high = pagesToTry - 1;
                                let finalPageCount = 0;
                                let finalBytes = null;
                                
                                while (low <= high) {
                                    const mid = Math.floor((low + high) / 2);
                                    splitStatus.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Optimizing part ${partIndex} (testing ${mid} pages)...`;
                                    
                                    // Test with mid pages
                                    const binaryDoc = await PDFLib.PDFDocument.create();
                                    const binaryIndices = [];
                                    for (let i = 0; i < mid; i++) {
                                        binaryIndices.push(processedPages + i);
                                    }
                                    
                                    const binaryPages = await binaryDoc.copyPages(pdfToSplit, binaryIndices);
                                    binaryPages.forEach(page => binaryDoc.addPage(page));
                                    
                                    const binaryBytes = await binaryDoc.save();
                                    const binarySize = binaryBytes.length;
                                    
                                    if (binarySize <= SAFE_SIZE_LIMIT) {
                                        // This fits, try adding more
                                        low = mid + 1;
                                        finalPageCount = mid;
                                        finalBytes = binaryBytes;
                                    } else {
                                        // Too large, try fewer pages
                                        high = mid - 1;
                                    }
                                }
                                
                                // Use the optimal page count we found
                                if (finalPageCount > 0) {
                                    parts.push({
                                        index: partIndex,
                                        pages: finalPageCount,
                                        pageRange: `${processedPages + 1}-${processedPages + finalPageCount}`,
                                        size: finalBytes.length,
                                        data: finalBytes
                                    });
                                    
                                    processedPages += finalPageCount;
                                } else {
                                    // If even one page is too large
                                    const singleDoc = await PDFLib.PDFDocument.create();
                                    const [singlePage] = await singleDoc.copyPages(pdfToSplit, [processedPages]);
                                    singleDoc.addPage(singlePage);
                                    
                                    const singleBytes = await singleDoc.save();
                                    
                                    parts.push({
                                        index: partIndex,
                                        pages: 1,
                                        pageRange: `${processedPages + 1}`,
                                        size: singleBytes.length,
                                        data: singleBytes,
                                        oversized: singleBytes.length > SAFE_SIZE_LIMIT
                                    });
                                    
                                    processedPages += 1;
                                }
                            } else if (testSize <= SAFE_SIZE_LIMIT || pagesToTry === 1) {
                                // Current selection fits or we can't reduce further
                                parts.push({
                                    index: partIndex,
                                    pages: pagesToTry,
                                    pageRange: pagesToTry === 1 ? 
                                        `${processedPages + 1}` : 
                                        `${processedPages + 1}-${processedPages + pagesToTry}`,
                                    size: testSize,
                                    data: testBytes,
                                    oversized: testSize > SAFE_SIZE_LIMIT && pagesToTry === 1
                                });
                                
                                processedPages += pagesToTry;
                            }
                            
                            partIndex++;
                            
                            // Adjust pages per part based on what we learned
                            if (pagesToTry > 1 && testSize > SAFE_SIZE_LIMIT) {
                                // If we had to reduce pages, adjust our estimate
                                pagesPerPart = Math.max(1, Math.floor(pagesPerPart * 0.8));
                            }
                        }
                    }
                    
                    // Generate HTML for splits
                    let partsHtml = '';
                    
                    for (const part of parts) {
                        const isOversized = part.oversized;
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
                                        <i class="fas fa-file-pdf"></i> part_${part.index}.pdf${warningBadge}
                                    </div>
                                    <div class="file-meta">
                                        <span style="${sizeStyle}"><i class="fas fa-weight-hanging"></i> ${formatFileSize(part.size)}</span>
                                        <span><i class="fas fa-file-alt"></i> ${part.pages} pages (Pages ${part.pageRange})</span>
                                    </div>
                                </div>
                                <button class="btn btn-download part-download" data-part-index="${part.index - 1}">
                                    <i class="fas fa-download"></i> Download
                                </button>
                            </div>
                        `;
                    }
                    
                    // Display parts
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
                            download(partBlob, `part_${part.index}.pdf`, 'application/pdf');
                        });
                    });
                    
                } catch (error) {
                    console.error('Error splitting PDF:', error);
                    resultContent.innerHTML = resultHtml + `
                        <div class="alert alert-danger">
                            <i class="fas fa-exclamation-circle"></i> Error creating PDF splits. Try downloading the original and splitting it manually.
                        </div>
                    `;
                    
                    // Allow downloading original
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