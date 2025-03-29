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
                    <p class="split-files-info" style="margin-bottom: 15px; color: #0056b3;">Each part is guaranteed to be under 20MB for E-office uploads.</p>
                `;
                
                // Initialize result container with a loading indicator
                resultContent.innerHTML = resultHtml + `
                    <div id="splitStatus" class="alert alert-info text-center">
                        <i class="fas fa-spinner fa-spin"></i> Calculating optimal split points...
                    </div>
                `;
                
                try {
                    // Calculate optimal split strategy for even distribution
                    const splitStatus = document.getElementById('splitStatus');
                    
                    // Calculate optimal number of parts based on file size
                    const optimalNumParts = Math.ceil(mergedSize / (MAX_SIZE_BYTES * 0.9)); // Use 90% of limit for safety
                    const pdfToSplit = await PDFLib.PDFDocument.load(mergedPdfBytes);
                    
                    // Collect info about each page to make better splitting decisions
                    splitStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing PDF pages...';
                    
                    // Binary split approach - try different page distributions until we find working splits
                    // that stay under the size limit while distributing content evenly
                    const parts = [];
                    let remainingPages = [...Array(totalPages).keys()]; // 0 to totalPages-1
                    let partIndex = 1;
                    
                    // Determine how to distribute pages evenly
                    const targetPagesPerPart = Math.ceil(totalPages / optimalNumParts);
                    
                    while (remainingPages.length > 0) {
                        splitStatus.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Creating part ${partIndex} of approximately ${optimalNumParts}...`;
                        
                        // Start with a conservative approach - take fewer pages than the target
                        let pagesToTry = Math.min(targetPagesPerPart, remainingPages.length);
                        let pageIndices = remainingPages.slice(0, pagesToTry);
                        
                        // Binary search to find the maximum number of pages that fit under 20MB
                        let minPages = 1;
                        let maxPages = pagesToTry;
                        let currentSize = 0;
                        let currentBytes = null;
                        
                        while (minPages <= maxPages) {
                            const middlePoint = Math.floor((minPages + maxPages) / 2);
                            pageIndices = remainingPages.slice(0, middlePoint);
                            
                            // Create a test PDF with these pages
                            const testDoc = await PDFLib.PDFDocument.create();
                            const pagesToCopy = await testDoc.copyPages(pdfToSplit, pageIndices);
                            pagesToCopy.forEach(page => testDoc.addPage(page));
                            
                            // Check the size
                            const testBytes = await testDoc.save();
                            const testSize = testBytes.length;
                            
                            splitStatus.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Testing ${middlePoint} pages (${formatFileSize(testSize)})...`;
                            
                            if (testSize <= MAX_SIZE_BYTES) {
                                // This fits, try adding more pages
                                minPages = middlePoint + 1;
                                currentSize = testSize;
                                currentBytes = testBytes;
                            } else {
                                // Too big, try fewer pages
                                maxPages = middlePoint - 1;
                            }
                        }
                        
                        // maxPages now contains the maximum number of pages that fit under 20MB
                        const finalPageCount = maxPages;
                        pageIndices = remainingPages.slice(0, finalPageCount);
                        
                        // If we couldn't fit any pages, take just one page (special case for very large pages)
                        if (finalPageCount === 0) {
                            pageIndices = [remainingPages[0]];
                            
                            // Create a special part with just one page
                            const singlePageDoc = await PDFLib.PDFDocument.create();
                            const pageToCopy = await singlePageDoc.copyPages(pdfToSplit, [remainingPages[0]]);
                            singlePageDoc.addPage(pageToCopy[0]);
                            
                            const singlePageBytes = await singlePageDoc.save();
                            const singlePageSize = singlePageBytes.length;
                            
                            splitStatus.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Processing oversized page (${formatFileSize(singlePageSize)})...`;
                            
                            parts.push({
                                index: partIndex,
                                pages: 1,
                                size: singlePageSize,
                                data: singlePageBytes,
                                pageNumbers: [remainingPages[0] + 1] // +1 for human-readable page numbers
                            });
                            
                            // Remove this page from remaining pages
                            remainingPages.splice(0, 1);
                        } else {
                            // We found a good split point
                            // If we don't have current bytes (which might happen if our initial guess was too big)
                            // then create the PDF with the pages we determined
                            if (!currentBytes) {
                                const finalDoc = await PDFLib.PDFDocument.create();
                                const finalPages = await finalDoc.copyPages(pdfToSplit, pageIndices);
                                finalPages.forEach(page => finalDoc.addPage(page));
                                currentBytes = await finalDoc.save();
                                currentSize = currentBytes.length;
                            }
                            
                            // Create a new part with these pages
                            parts.push({
                                index: partIndex,
                                pages: pageIndices.length,
                                size: currentSize,
                                data: currentBytes,
                                pageNumbers: pageIndices.map(idx => idx + 1) // +1 for human-readable page numbers
                            });
                            
                            // Remove these pages from remaining pages
                            remainingPages.splice(0, pageIndices.length);
                        }
                        
                        partIndex++;
                    }
                    
                    // Done processing, now display all the parts
                    let partsHtml = '';
                    for (const part of parts) {
                        // Create page range text (e.g., "Pages 1-10")
                        const pageDesc = part.pageNumbers.length === 1 
                            ? `Page ${part.pageNumbers[0]}` 
                            : `Pages ${part.pageNumbers[0]}-${part.pageNumbers[part.pageNumbers.length - 1]}`;
                        
                        partsHtml += `
                            <div class="file-item">
                                <div class="file-details">
                                    <div class="file-name"><i class="fas fa-file-pdf"></i> part_${part.index}.pdf</div>
                                    <div class="file-meta">
                                        <span style="font-weight: bold; color: #0056b3;"><i class="fas fa-weight-hanging"></i> ${formatFileSize(part.size)}</span>
                                        <span><i class="fas fa-file-alt"></i> ${part.pages} pages (${pageDesc})</span>
                                    </div>
                                </div>
                                <button class="btn btn-download part-download" data-part-index="${part.index - 1}">
                                    <i class="fas fa-download"></i> Download
                                </button>
                            </div>
                        `;
                    }
                    
                    // Replace the status with the actual parts
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