class ConversationGame {
    constructor() {
        this.currentPageIndex = 0;
        this.pageSequence = [];
        this.pdfContainer = document.getElementById('pdf-container');
        this.loadingEl = document.getElementById('loading');
        this.errorEl = document.getElementById('error');
        this.progressFill = document.getElementById('progress-fill');
        this.clickHint = document.getElementById('click-hint');
        this.totalPages = 203; // Based on the PDF description
        
        this.init();
    }

    init() {
        try {
            this.setupPageSequence();
            this.setupEventListeners();
            this.showCurrentPage();
            this.hideLoading();
            
            // Register service worker
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('./sw.js').catch(console.error);
            }
        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.showError();
        }
    }

    setupPageSequence() {
        // Create the page sequence as specified:
        // 1. Start with page 1
        // 2. Then page 4 (manual)
        // 3. Then pages 5-203 in random order
        
        this.pageSequence = [1, 4]; // Start with page 1, then manual (page 4)
        
        // Create array of pages 5 to totalPages and shuffle them
        const gamePages = [];
        for (let i = 5; i <= this.totalPages; i++) {
            gamePages.push(i);
        }
        
        // Shuffle the game pages using Fisher-Yates algorithm
        for (let i = gamePages.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [gamePages[i], gamePages[j]] = [gamePages[j], gamePages[i]];
        }
        
        // Add shuffled pages to sequence
        this.pageSequence = this.pageSequence.concat(gamePages);
        
        console.log('Page sequence created:', this.pageSequence.slice(0, 10) + '...');
    }

    setupEventListeners() {
        // Handle clicks anywhere on the document (outside iframe)
        document.addEventListener('click', (e) => {
            e.preventDefault();
            this.nextPage();
        });

        // Handle touch events for mobile
        document.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.nextPage();
        });

        // Handle keyboard events
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowRight' || e.code === 'Enter') {
                e.preventDefault();
                this.nextPage();
            }
        });

        // Handle clicks on the PDF container specifically
        this.pdfContainer.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.nextPage();
        });

        // Handle resize
        window.addEventListener('resize', () => {
            this.showCurrentPage();
        });

        // Don't add overlay here - it will be added after PDF loads
    }

    addClickOverlay() {
        // Remove existing overlay if present
        const existingOverlay = document.getElementById('click-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
        
        const overlay = document.createElement('div');
        overlay.id = 'click-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 5;
            cursor: pointer;
            background: transparent;
        `;
        overlay.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Overlay clicked, advancing to next page');
            this.nextPage();
        });
        
        this.pdfContainer.style.position = 'relative'; // Ensure container is positioned
        this.pdfContainer.appendChild(overlay);
        console.log('Click overlay added');
    }

    showCurrentPage() {
        if (this.currentPageIndex >= this.pageSequence.length) {
            return;
        }

        const pageNum = this.pageSequence[this.currentPageIndex];
        
        try {
            // Clear previous content
            this.pdfContainer.innerHTML = '';
            
            // Create iframe to display specific page of PDF
            const iframe = document.createElement('iframe');
            iframe.src = `./conversation-cards.pdf#page=${pageNum}`;
            iframe.style.cssText = `
                width: 100%;
                height: 100vh;
                border: none;
                background: white;
            `;
            iframe.title = `Conversation Card Page ${pageNum}`;
            
            // Handle iframe load errors
            iframe.onerror = () => {
                this.showPDFAlternative(pageNum);
            };
            
            this.pdfContainer.appendChild(iframe);
            
            // Re-add click overlay after adding iframe
            this.addClickOverlay();
            
            // Update progress
            this.updateProgress();
            
            console.log(`Showing page ${pageNum} (${this.currentPageIndex + 1}/${this.pageSequence.length})`);
            
        } catch (error) {
            console.error('Failed to show page:', error);
            this.showPDFAlternative(pageNum);
        }
    }

    showPDFAlternative(pageNum) {
        // Fallback: show PDF in object tag or provide download link
        this.pdfContainer.innerHTML = `
            <div style="
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                height: 100vh;
                text-align: center;
                padding: 20px;
                background: white;
                color: black;
            ">
                <h2>Page ${pageNum}</h2>
                <p>PDF viewer not supported in this browser.</p>
                <object data="./conversation-cards.pdf#page=${pageNum}" type="application/pdf" style="width: 90%; height: 70%; margin: 20px;">
                    <p>
                        <a href="./conversation-cards.pdf#page=${pageNum}" target="_blank" style="
                            background: #4caf50;
                            color: white;
                            padding: 10px 20px;
                            text-decoration: none;
                            border-radius: 5px;
                            display: inline-block;
                            margin-top: 20px;
                        ">View PDF Page ${pageNum}</a>
                    </p>
                </object>
                <p style="margin-top: 20px; font-size: 14px; opacity: 0.7;">
                    Click anywhere to continue to next page
                </p>
            </div>
        `;
    }

    nextPage() {
        if (this.currentPageIndex < this.pageSequence.length - 1) {
            this.currentPageIndex++;
            this.showCurrentPage();
        } else {
            // Game finished, show completion message
            this.showCompletion();
        }
    }

    updateProgress() {
        const progress = ((this.currentPageIndex + 1) / this.pageSequence.length) * 100;
        this.progressFill.style.width = `${progress}%`;
    }

    showCompletion() {
        this.pdfContainer.innerHTML = '';
        this.clickHint.style.display = 'none';
        
        const completionEl = document.createElement('div');
        completionEl.innerHTML = `
            <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
                z-index: 20;
                background: rgba(0, 0, 0, 0.9);
                padding: 40px;
                border-radius: 10px;
                max-width: 80%;
            ">
                <h2 style="color: #4caf50; margin-bottom: 20px;">Game Complete!</h2>
                <p style="margin-bottom: 20px;">You've seen all the conversation cards.</p>
                <button onclick="location.reload()" style="
                    padding: 15px 30px;
                    background: #4caf50;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: bold;
                ">Start New Game</button>
            </div>
        `;
        
        document.getElementById('app').appendChild(completionEl);
    }

    hideLoading() {
        this.loadingEl.style.display = 'none';
    }

    showError() {
        this.loadingEl.style.display = 'none';
        this.errorEl.style.display = 'block';
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.conversationGame = new ConversationGame();
});