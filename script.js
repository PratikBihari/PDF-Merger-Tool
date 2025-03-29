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
                
                // Size-based splitting approach
                const safeMaxBytes = MAX_SIZE_BYTES * 0.95; // 95% of 20MB = 19MB (safety margin)
                
                // Create a processing indicator
                const processingDiv = document.createElement('div');
                processingDiv.className = 'alert alert-info text-center';
                processingDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing PDF splits...';
                resultContent.innerHTML = resultHtml;
                resultContent.appendChild(processingDiv);
                
                // Process the splits
                try {
                    // Load the merged PDF for splitting
                    const pdfToSplit = await PDFLib.PDFDocument.load(mergedPdfBytes);
                    const parts = []; // To store our split parts
                    let partIndex = 1;
                    let currentPartDoc = await PDFLib.PDFDocument.create();
                    let currentPartSize = 0;
                    let pagesInCurrentPart = 0;
                    
                    // Process each page individually
                    for (let i = 0; i < totalPages; i++) {
                        // Update processing indicator
                        processingDiv.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Processing page ${i+1} of ${totalPages}...`;
                        
                        // Copy single page
                        const [currentPage] = await currentPartDoc.copyPages(pdfToSplit, [i]);
                        currentPartDoc.addPage(currentPage);
                        pagesInCurrentPart++;
                        
                        // Save and check size
                        const currentBytes = await currentPartDoc.save();
                        currentPartSize = currentBytes.length;
                        
                        // If this part is approaching size limit (or it's the last page), finalize it
                        const isLastPage = (i === totalPages - 1);
                        
                        if (currentPartSize > safeMaxBytes || isLastPage) {
                            // If we're over size limit with more than one page, back up one page
                            if (currentPartSize > safeMaxBytes && pagesInCurrentPart > 1) {
                                // Create a new document with all pages except the last one
                                const revisedDoc = await PDFLib.PDFDocument.create();
                                const pageIndices = [];
                                for (let j = i - pagesInCurrentPart + 1; j < i; j++) {
                                    pageIndices.push(j);
                                }
                                
                                const revisedPages = await revisedDoc.copyPages(pdfToSplit, pageIndices);
                                revisedPages.forEach(page => revisedDoc.addPage(page));
                                
                                const revisedBytes = await revisedDoc.save();
                                
                                // Save this part
                                parts.push({
                                    index: partIndex,
                                    pages: pagesInCurrentPart - 1, // one less page
                                    pageRange: `${i - pagesInCurrentPart + 1}-${i-1}`,
                                    size: revisedBytes.length,
                                    data: revisedBytes
                                });
                                
                                // Process this page again in a new part
                                i--; // Back up to reprocess this page
                            } else {
                                // This part is good to go
                                parts.push({
                                    index: partIndex,
                                    pages: pagesInCurrentPart,
                                    pageRange: `${i - pagesInCurrentPart + 1}-${i}`,
                                    size: currentPartSize,
                                    data: currentBytes
                                });
                            }
                            
                            // Start a new part (unless this was the last page)
                            if (!isLastPage || (currentPartSize > safeMaxBytes && pagesInCurrentPart > 1)) {
                                partIndex++;
                                currentPartDoc = await PDFLib.PDFDocument.create();
                                pagesInCurrentPart = 0;
                            }
                        }
                    }
                    
                    // Remove processing indicator
                    resultContent.removeChild(processingDiv);
                    
                    // Display all parts
                    let partsHtml = '';
                    for (const part of parts) {
                        partsHtml += `
                            <div class="file-item">
                                <div class="file-details">
                                    <div class="file-name"><i class="fas fa-file-pdf"></i> part_${part.index}.pdf</div>
                                    <div class="file-meta">
                                        <span style="font-weight: bold; color: #0056b3;"><i class="fas fa-weight-hanging"></i> ${formatFileSize(part.size)}</span>
                                        <span><i class="fas fa-file-alt"></i> ${part.pages} pages</span>
                                    </div>
                                </div>
                                <button class="btn btn-download part-download" data-part-index="${part.index - 1}">
                                    <i class="fas fa-download"></i> Download
                                </button>
                            </div>
                        `;
                    }
                    
                    // Display the parts
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
                    processingDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> Error processing PDF splits.';
                    processingDiv.className = 'alert alert-danger text-center';
                    
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