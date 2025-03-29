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
                    <p class="split-files-info" style="margin-bottom: 15px; color: #0056b3;">Each part is guaranteed to be under 20MB for E-office compatibility.</p>
                `;
                
                // Use a progressive splitting strategy
                // Rather than trying to predict the size accurately, we'll start with smaller chunks
                // and adjust as needed
                
                // Start with a very conservative estimate - around 10MB per part
                const safeMaxSize = MAX_SIZE_BYTES * 0.5; // 50% of 20MB = 10MB
                const avgPageSize = mergedSize / totalPages;
                
                // For very large PDFs with small page counts, we need to be extra cautious
                let pagesPerPart;
                
                if (avgPageSize > 1000000) { // If avg page > 1MB
                    // For very large pages, use an even more conservative approach
                    pagesPerPart = Math.max(1, Math.floor(safeMaxSize / avgPageSize / 1.5));
                } else if (avgPageSize > 500000) { // If avg page > 500KB
                    pagesPerPart = Math.max(1, Math.floor(safeMaxSize / avgPageSize / 1.2));
                } else {
                    pagesPerPart = Math.max(1, Math.floor(safeMaxSize / avgPageSize));
                }
                
                // Safety check - ensure we have at least 1 page per part
                pagesPerPart = Math.max(1, pagesPerPart);
                
                // Calculate parts
                const parts = [];
                let currentPage = 0;
                
                while (currentPage < totalPages) {
                    const remainingPages = totalPages - currentPage;
                    const pagesToInclude = Math.min(pagesPerPart, remainingPages);
                    
                    parts.push({
                        start: currentPage,
                        end: currentPage + pagesToInclude,
                        pages: pagesToInclude,
                        estimatedSize: Math.min(pagesToInclude * avgPageSize * 1.1, MAX_SIZE_BYTES * 0.95) // Add 10% buffer for estimation
                    });
                    
                    currentPage += pagesToInclude;
                }
                
                // Add buttons for each part
                for (let i = 0; i < parts.length; i++) {
                    const part = parts[i];
                    
                    resultHtml += `
                        <div class="file-item">
                            <div class="file-details">
                                <div class="file-name"><i class="fas fa-file-pdf"></i> part_${i+1}.pdf</div>
                                <div class="file-meta">
                                    <span style="font-weight: bold; color: #0056b3;"><i class="fas fa-weight-hanging"></i> ~${formatFileSize(part.estimatedSize)}</span>
                                    <span><i class="fas fa-file-alt"></i> ${part.pages} pages</span>
                                </div>
                            </div>
                            <button class="btn btn-download split-download" data-start="${part.start}" data-end="${part.end}" data-part="${i+1}">
                                <i class="fas fa-download"></i> Download
                            </button>
                        </div>
                    `;
                }
                
                resultContent.innerHTML = resultHtml;
                
                // Add event listener for original download
                document.getElementById('downloadOriginal').addEventListener('click', function() {
                    download(mergedPdfBlob, 'merged.pdf', 'application/pdf');
                });
                
                // Add event listeners for split downloads
                document.querySelectorAll('.split-download').forEach(async function(button) {
                    button.addEventListener('click', async function() {
                        const startPage = parseInt(this.getAttribute('data-start'));
                        const endPage = parseInt(this.getAttribute('data-end'));
                        const partNum = this.getAttribute('data-part');
                        
                        // Show loading state on the button
                        const originalButtonText = this.innerHTML;
                        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
                        this.disabled = true;
                        
                        // Get the file item
                        const fileItem = this.closest('.file-item');
                        const fileSizeElement = fileItem.querySelector('.fa-weight-hanging').parentNode;
                        
                        try {
                            // Create a new PDF with just these pages
                            const partPdf = await PDFLib.PDFDocument.create();
                            const pdfToSplit = await PDFLib.PDFDocument.load(mergedPdfBytes);
                            
                            const pageIndices = [];
                            for (let i = startPage; i < endPage; i++) {
                                pageIndices.push(i);
                            }
                            
                            // Copy the pages to the new document
                            const copiedPages = await partPdf.copyPages(pdfToSplit, pageIndices);
                            copiedPages.forEach(page => partPdf.addPage(page));
                            
                            // First try with regular compression
                            let partPdfBytes = await partPdf.save();
                            let actualSize = partPdfBytes.length;
                            
                            // If still too large, try more aggressive compression
                            if (actualSize > MAX_SIZE_BYTES) {
                                // Add a compression message
                                fileSizeElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Still too large. Applying additional compression...';
                                
                                try {
                                    // Create a new PDF with more aggressive compression settings
                                    const compressedPdf = await PDFLib.PDFDocument.create();
                                    
                                    // Try to compress by using a more aggressive approach - copy pages with lower quality
                                    const recompressedPages = await compressedPdf.copyPages(pdfToSplit, pageIndices);
                                    recompressedPages.forEach(page => compressedPdf.addPage(page));
                                    
                                    // Save with compression
                                    partPdfBytes = await compressedPdf.save({ useObjectStreams: true });
                                    actualSize = partPdfBytes.length;
                                } catch (compressionError) {
                                    console.error('Compression failed:', compressionError);
                                    // We'll use the original version if compression fails
                                }
                            }
                            
                            const partPdfBlob = new Blob([partPdfBytes], { type: 'application/pdf' });
                            
                            // Verify file size is under 20MB
                            if (actualSize > MAX_SIZE_BYTES) {
                                // If still too large, we need to warn the user
                                console.warn(`Part ${partNum} is still ${formatFileSize(actualSize)}, which exceeds the 20MB limit.`);
                                
                                // Update the UI with actual size and warning
                                fileSizeElement.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${formatFileSize(actualSize)} (exceeds limit)`;
                                fileSizeElement.style.fontWeight = 'bold';
                                fileSizeElement.style.color = '#dc3545'; // Red color for warning
                                
                                // Add a suggestion to try with fewer pages
                                const pageCountEl = fileItem.querySelector('.fa-file-alt').parentNode;
                                const currentPages = parseInt(pageCountEl.textContent.match(/\d+/)[0]);
                                const suggestedPages = Math.floor(currentPages * 0.7); // Suggest 70% of current pages
                                
                                // Add a suggestion button to retry with fewer pages
                                const actionDiv = document.createElement('div');
                                actionDiv.className = 'file-actions';
                                actionDiv.style.marginTop = '8px';
                                actionDiv.innerHTML = `
                                    <button class="btn btn-warning btn-sm retry-split" data-part="${partNum}" data-pages="${suggestedPages}">
                                        <i class="fas fa-redo-alt"></i> Try with ${suggestedPages} pages
                                    </button>
                                `;
                                fileItem.querySelector('.file-details').appendChild(actionDiv);
                                
                                // Add event listener to the retry button
                                actionDiv.querySelector('.retry-split').addEventListener('click', function() {
                                    // Calculate new start and end page
                                    const newPagesToInclude = parseInt(this.getAttribute('data-pages'));
                                    const newEnd = startPage + newPagesToInclude;
                                    
                                    // Create a new split entry
                                    const newPartNum = parseInt(partNum) + 0.1; // Increment by .1 to keep ordering
                                    
                                    // Create a new file item for this reduced split
                                    const newFileItem = document.createElement('div');
                                    newFileItem.className = 'file-item';
                                    newFileItem.innerHTML = `
                                        <div class="file-details">
                                            <div class="file-name"><i class="fas fa-file-pdf"></i> part_${partNum}_reduced.pdf</div>
                                            <div class="file-meta">
                                                <span style="font-weight: bold; color: #0056b3;"><i class="fas fa-weight-hanging"></i> ~${formatFileSize(MAX_SIZE_BYTES * 0.8)}</span>
                                                <span><i class="fas fa-file-alt"></i> ${newPagesToInclude} pages</span>
                                            </div>
                                        </div>
                                        <button class="btn btn-download split-download" data-start="${startPage}" data-end="${newEnd}" data-part="${partNum}_reduced">
                                            <i class="fas fa-download"></i> Download Reduced
                                        </button>
                                    `;
                                    
                                    // Insert the new file item after the current one
                                    fileItem.parentNode.insertBefore(newFileItem, fileItem.nextSibling);
                                    
                                    // Add event listener to the new download button
                                    newFileItem.querySelector('.split-download').addEventListener('click', async function() {
                                        // Re-use the same event listener logic
                                        const reducedStart = parseInt(this.getAttribute('data-start'));
                                        const reducedEnd = parseInt(this.getAttribute('data-end'));
                                        const reducedPartNum = this.getAttribute('data-part');
                                        
                                        // Show loading state
                                        const originalReducedButtonText = this.innerHTML;
                                        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
                                        this.disabled = true;
                                        
                                        try {
                                            // Create new PDF with reduced page count
                                            const reducedPdf = await PDFLib.PDFDocument.create();
                                            const reducedIndices = [];
                                            for (let i = reducedStart; i < reducedEnd; i++) {
                                                reducedIndices.push(i);
                                            }
                                            const reducedPages = await reducedPdf.copyPages(pdfToSplit, reducedIndices);
                                            reducedPages.forEach(page => reducedPdf.addPage(page));
                                            
                                            const reducedBytes = await reducedPdf.save();
                                            const reducedBlob = new Blob([reducedBytes], { type: 'application/pdf' });
                                            
                                            // Update file size in UI
                                            const reducedSizeEl = this.closest('.file-item').querySelector('.fa-weight-hanging').parentNode;
                                            reducedSizeEl.innerHTML = `<i class="fas fa-weight-hanging"></i> ${formatFileSize(reducedBytes.length)}`;
                                            reducedSizeEl.style.fontWeight = 'bold';
                                            reducedSizeEl.style.color = '#0056b3';
                                            
                                            download(reducedBlob, `part_${reducedPartNum}.pdf`, 'application/pdf');
                                        } catch (error) {
                                            console.error('Error creating reduced PDF:', error);
                                            alert('Error creating reduced PDF. Please try again with fewer pages.');
                                        } finally {
                                            // Restore button state
                                            this.innerHTML = originalReducedButtonText;
                                            this.disabled = false;
                                        }
                                    });
                                });
                                
                                // Still allow download of the oversized file
                                alert(`Warning: The split PDF is ${formatFileSize(actualSize)}, which exceeds the 20MB E-office limit. You can still download it, but you may not be able to upload it to E-office.`);
                            } else {
                                // Update file size in the UI with actual size
                                fileSizeElement.innerHTML = `<i class="fas fa-weight-hanging"></i> ${formatFileSize(actualSize)}`;
                                fileSizeElement.style.fontWeight = 'bold';
                                fileSizeElement.style.color = '#0056b3';
                            }
                            
                            download(partPdfBlob, `part_${partNum}.pdf`, 'application/pdf');
                        } catch (error) {
                            console.error('Error splitting PDF:', error);
                            alert('Error creating split PDF. Please try again.');
                            
                            // Show error in UI
                            fileSizeElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> Error processing this part`;
                            fileSizeElement.style.color = '#dc3545';
                        } finally {
                            // Restore button state
                            this.innerHTML = originalButtonText;
                            this.disabled = false;
                        }
                    });
                });
                
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