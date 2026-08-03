/**
 * FAQGenie AI - Intelligent Frontend FAQ Assistant Engine
 * Pure Vanilla JavaScript implementation integrated with Flask REST API Backend.
 * Features: Fetch API with async/await, real-time typing animation, status tracking,
 * health monitoring, modular JS architecture, speech synthesis, and modal drawers.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --------------------------------------------------------------------------
    // 1. Backend API Configuration & Service Module (Modular JS)
    // --------------------------------------------------------------------------
    const API_CONFIG = {
        BASE_URL: 'http://127.0.0.1:5000',
        CHAT_ENDPOINT: 'http://127.0.0.1:5000/api/chat',
        HEALTH_ENDPOINT: 'http://127.0.0.1:5000/api/health',
        TIMEOUT_MS: 10000
    };

    /**
     * ApiService - Encapsulates all backend HTTP communications using Fetch API & async/await
     */
    const ApiService = {
        /**
         * Send POST request to Flask backend /api/chat
         * @param {string} message - User question string
         * @returns {Promise<{answer: string}>} Response JSON object with answer string
         */
        async sendChatMessage(message) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

            try {
                const response = await fetch(API_CONFIG.CHAT_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ message: message }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    let errorMessage = `Server error (Status: ${response.status})`;
                    try {
                        const errorJson = await response.json();
                        if (errorJson && errorJson.error) {
                            errorMessage = errorJson.error;
                        }
                    } catch (e) {
                        // Response body wasn't JSON
                    }
                    throw new Error(errorMessage);
                }

                const data = await response.json();
                if (!data || typeof data.answer !== 'string') {
                    throw new Error('Invalid JSON format received from server.');
                }

                return data;
            } catch (error) {
                clearTimeout(timeoutId);
                if (error.name === 'AbortError') {
                    throw new Error('Request timed out. The server took too long to respond.');
                }
                throw error;
            }
        },

        /**
         * Perform health check against backend /api/health endpoint
         * @returns {Promise<boolean>} True if server is healthy
         */
        async checkHealth() {
            try {
                const response = await fetch(API_CONFIG.HEALTH_ENDPOINT, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' }
                });
                if (response.ok) {
                    const data = await response.json();
                    return data.status === 'healthy';
                }
                return false;
            } catch (error) {
                return false;
            }
        }
    };

    // --------------------------------------------------------------------------
    // 2. FAQ Knowledge Base Data (For Drawer & Suggestions)
    // --------------------------------------------------------------------------
    const faqDatabase = [
        {
            id: 'pass_reset',
            category: 'account',
            keywords: ['reset', 'password', 'forgot', 'change password', 'recover', 'login issue', 'passcode'],
            question: 'How can I reset my password?',
            answer: 'To reset your password:\n1. Click on the <strong>"Forgot Password?"</strong> link on the sign-in page.\n2. Enter your registered email address.\n3. Check your inbox for a secure reset link valid for 60 minutes.\n4. Create a new strong password containing at least 8 characters, numbers, and symbols.'
        },
        {
            id: 'work_hours',
            category: 'general',
            keywords: ['working hours', 'hours', 'open', 'schedule', 'business hours', 'availability', 'support time', 'time'],
            question: 'What are your working hours?',
            answer: 'Our AI Assistant <strong>FAQGenie</strong> is available <strong>24/7, 365 days a year</strong>! 🚀\n\nFor human support team assistance, our working hours are:\n• <strong>Monday – Friday:</strong> 8:00 AM – 8:00 PM EST\n• <strong>Saturday & Sunday:</strong> 10:00 AM – 4:00 PM EST'
        },
        {
            id: 'contact_support',
            category: 'support',
            keywords: ['contact', 'support', 'help', 'email', 'phone', 'reach out', 'customer care', 'representative', 'human'],
            question: 'How do I contact support?',
            answer: 'You can contact our support team through multiple channels:\n• <strong>Email:</strong> support@faqgenie.ai (Response within 2 hours)\n• <strong>Phone:</strong> +1 (800) 555-GENIE (Toll-free)\n• <strong>Live Agent Chat:</strong> Request a live human agent right here in this chat window during working hours.'
        },
        {
            id: 'pricing_plans',
            category: 'billing',
            keywords: ['subscription', 'plans', 'pricing', 'cost', 'pay', 'free trial', 'tiers', 'pro', 'enterprise'],
            question: 'What subscription plans do you offer?',
            answer: 'We offer flexible plans tailored to your needs:\n• <strong>Free Tier:</strong> Includes up to 100 AI responses/month.\n• <strong>Pro Plan ($19/mo):</strong> Unlimited AI queries, priority response speed, and custom branding.\n• <strong>Enterprise Plan:</strong> Custom integrations, dedicated SLA, and team analytics.'
        },
        {
            id: 'refund_policy',
            category: 'billing',
            keywords: ['refund', 'cancel', 'money back', 'guarantee', 'billing issue', 'charge'],
            question: 'What is your refund policy?',
            answer: 'We offer a hassle-free <strong>14-day money-back guarantee</strong> for all paid plans. If you are not completely satisfied, simply navigate to your Billing Dashboard or email billing@faqgenie.ai for a full refund.'
        },
        {
            id: 'security_privacy',
            category: 'account',
            keywords: ['security', 'privacy', 'data', 'safe', 'encryption', 'gdpr', 'confidential'],
            question: 'Is my data secure with FAQGenie AI?',
            answer: 'Yes! Security is our top priority. We use <strong>AES-256 bit end-to-end encryption</strong> for all communications. Your data is stored on SOC-2 Type II compliant servers and is never sold to third parties.'
        },
        {
            id: 'api_integration',
            category: 'general',
            keywords: ['api', 'integration', 'developer', 'webhook', 'embed', 'widget', 'code'],
            question: 'Can I integrate FAQGenie AI into my own website?',
            answer: 'Absolutely! You can embed FAQGenie AI into any website with a single line of JavaScript script tag or use our REST API & Webhooks for custom mobile or web apps.'
        }
    ];

    // Pool of questions for suggested chips refresh
    const poolQuestions = [
        "How can I reset my password?",
        "What are your working hours?",
        "How do I contact support?",
        "What subscription plans do you offer?",
        "What is your refund policy?",
        "Is my data secure with FAQGenie AI?",
        "Can I integrate FAQGenie AI into my website?"
    ];

    // --------------------------------------------------------------------------
    // 3. DOM Elements Selection
    // --------------------------------------------------------------------------
    const chatForm = document.getElementById('chatForm');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const charCounter = document.getElementById('charCounter');
    const chatWindow = document.getElementById('chatWindow');
    const chatMessages = document.getElementById('chatMessages');
    const typingIndicator = document.getElementById('typingIndicator');
    const statusText = document.getElementById('statusText');
    const statusBadge = document.getElementById('statusBadge');
    const suggestedChips = document.getElementById('suggestedChips');
    const refreshSuggestionsBtn = document.getElementById('refreshSuggestionsBtn');
    
    // Clear Modal Elements
    const clearChatBtn = document.getElementById('clearChatBtn');
    const confirmModal = document.getElementById('confirmModal');
    const cancelClearBtn = document.getElementById('cancelClearBtn');
    const confirmClearBtn = document.getElementById('confirmClearBtn');
    
    // Knowledge Base Modal Elements
    const openFaqModalBtn = document.getElementById('openFaqModalBtn');
    const faqModal = document.getElementById('faqModal');
    const closeFaqModalBtn = document.getElementById('closeFaqModalBtn');
    const faqAccordionList = document.getElementById('faqAccordionList');
    const faqSearchInput = document.getElementById('faqSearchInput');
    const faqCategoryTabs = document.getElementById('faqCategoryTabs');

    const toastContainer = document.getElementById('toastContainer');

    // --------------------------------------------------------------------------
    // 4. State Management
    // --------------------------------------------------------------------------
    let isTyping = false;
    let speechSynth = window.speechSynthesis || null;

    // --------------------------------------------------------------------------
    // 5. Input & Character Counter Logic
    // --------------------------------------------------------------------------
    const maxChars = 250;

    function updateInputState() {
        const text = messageInput.value;
        const length = text.length;
        
        charCounter.textContent = `${length} / ${maxChars}`;
        
        if (length > maxChars) {
            charCounter.style.color = '#ef4444';
        } else {
            charCounter.style.color = 'var(--text-muted)';
        }

        // Enable or disable send button
        const isValid = text.trim().length > 0 && length <= maxChars && !isTyping;
        sendBtn.disabled = !isValid;

        // Auto resize textarea
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
    }

    messageInput.addEventListener('input', updateInputState);

    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!sendBtn.disabled && !isTyping) {
                chatForm.dispatchEvent(new Event('submit'));
            }
        }
    });

    // --------------------------------------------------------------------------
    // 6. Sending Messages & Backend AI Response Handling (Fetch API & Async/Await)
    // --------------------------------------------------------------------------
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userQuery = messageInput.value.trim();
        if (!userQuery || isTyping) return;

        // Add user message to chat UI
        appendMessage('user', userQuery);
        
        // Reset input field & update state
        messageInput.value = '';
        updateInputState();

        // Process AI Bot Response via Flask API
        handleBotResponse(userQuery);
    });

    /**
     * Appends a new message bubble (User or AI) into the chat area
     */
    function appendMessage(sender, text) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const row = document.createElement('div');
        row.className = `message-row ${sender}-row`;

        if (sender === 'user') {
            row.innerHTML = `
                <div class="avatar user-avatar">
                    <i class="fa-solid fa-user"></i>
                </div>
                <div class="message-bubble user-bubble">
                    <div class="message-header">
                        <span class="sender-name">You</span>
                        <span class="message-time">${timeStr}</span>
                    </div>
                    <div class="message-content">${escapeHTML(text).replace(/\n/g, '<br>')}</div>
                </div>
            `;
        } else {
            row.innerHTML = `
                <div class="avatar ai-avatar">
                    <i class="fa-solid fa-bot"></i>
                </div>
                <div class="message-bubble ai-bubble">
                    <div class="message-header">
                        <span class="sender-name">FAQGenie AI</span>
                        <span class="message-time">${timeStr}</span>
                    </div>
                    <div class="message-content">${text.replace(/\n/g, '<br>')}</div>
                    <div class="message-actions">
                        <button class="action-btn copy-btn" title="Copy response">
                            <i class="fa-regular fa-copy"></i>
                        </button>
                        <button class="action-btn tts-btn" title="Listen to answer">
                            <i class="fa-solid fa-volume-high"></i>
                        </button>
                        <button class="action-btn thumbs-up" title="Helpful">
                            <i class="fa-regular fa-thumbs-up"></i>
                        </button>
                        <button class="action-btn thumbs-down" title="Not helpful">
                            <i class="fa-regular fa-thumbs-down"></i>
                        </button>
                    </div>
                </div>
            `;
        }

        chatMessages.appendChild(row);
        scrollToBottom();
        attachMessageActions(row);
    }

    /**
     * Handles async communication with Flask Backend /api/chat endpoint
     * @param {string} query - User message text
     */
    async function handleBotResponse(query) {
        setTypingState(true);

        try {
            // Send POST request to POST /api/chat using async/await Fetch API
            const responseData = await ApiService.sendChatMessage(query);
            
            // Display backend bot response inside existing chat interface
            appendMessage('ai', responseData.answer);
        } catch (error) {
            console.error('Error fetching response from FAQ server:', error);
            
            // Friendly error handling
            const friendlyErrorMessage = `I'm sorry, I couldn't retrieve an answer right now.<br><br>
            <span style="color: var(--text-muted); font-size: 0.88rem;">
                <i class="fa-solid fa-circle-exclamation" style="color: #f59e0b;"></i> 
                ${escapeHTML(error.message || 'Unable to connect to FAQ server.')}
            </span><br><br>
            Please ensure the Flask backend server is running and try again.`;

            appendMessage('ai', friendlyErrorMessage);
            showToast('Unable to connect to FAQ backend server.');
        } finally {
            // Re-enable input and hide typing animation
            setTypingState(false);
        }
    }

    /**
     * Toggle typing animation indicator, status badge, and send button states
     */
    function setTypingState(active) {
        isTyping = active;
        if (active) {
            typingIndicator.classList.remove('hidden');
            statusText.textContent = 'AI is typing...';
            statusBadge.style.borderColor = 'rgba(245, 158, 11, 0.4)';
            statusBadge.style.color = '#f59e0b';
            messageInput.disabled = true;
        } else {
            typingIndicator.classList.add('hidden');
            statusText.textContent = 'Online';
            statusBadge.style.borderColor = 'rgba(16, 185, 129, 0.25)';
            statusBadge.style.color = 'var(--status-online)';
            messageInput.disabled = false;
            messageInput.focus();
        }
        updateInputState();
        scrollToBottom();
    }

    /**
     * Auto-scroll chat window to newest messages
     */
    function scrollToBottom() {
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    /**
     * Initial health check on page load to verify Flask server availability
     */
    async function initBackendHealthCheck() {
        const isHealthy = await ApiService.checkHealth();
        if (isHealthy) {
            statusText.textContent = 'Online';
            statusBadge.style.borderColor = 'rgba(16, 185, 129, 0.25)';
            statusBadge.style.color = 'var(--status-online)';
        } else {
            statusText.textContent = 'Offline (Check Backend)';
            statusBadge.style.borderColor = 'rgba(239, 68, 68, 0.4)';
            statusBadge.style.color = '#ef4444';
        }
    }

    // --------------------------------------------------------------------------
    // 7. Interactive Suggested Questions & Chips
    // --------------------------------------------------------------------------
    suggestedChips.addEventListener('click', (e) => {
        const btn = e.target.closest('.chip-btn');
        if (!btn || isTyping) return;
        const questionText = btn.getAttribute('data-question');
        if (questionText) {
            messageInput.value = questionText;
            updateInputState();
            chatForm.dispatchEvent(new Event('submit'));
        }
    });

    refreshSuggestionsBtn.addEventListener('click', () => {
        const shuffled = [...poolQuestions].sort(() => 0.5 - Math.random()).slice(0, 4);
        suggestedChips.innerHTML = '';
        
        const icons = ['fa-key', 'fa-clock', 'fa-headset', 'fa-credit-card', 'fa-shield-halved', 'fa-code', 'fa-receipt'];
        
        shuffled.forEach((q, idx) => {
            const chip = document.createElement('button');
            chip.className = 'chip-btn';
            chip.setAttribute('data-question', q);
            chip.innerHTML = `<i class="fa-solid ${icons[idx % icons.length]}"></i> ${escapeHTML(q)}`;
            suggestedChips.appendChild(chip);
        });

        showToast('Suggestions refreshed!');
    });

    // Delegated listener for inline clickable question links
    chatMessages.addEventListener('click', (e) => {
        if (e.target.classList.contains('inline-q-link') && !isTyping) {
            e.preventDefault();
            const questionText = e.target.getAttribute('data-q');
            if (questionText) {
                messageInput.value = questionText;
                updateInputState();
                chatForm.dispatchEvent(new Event('submit'));
            }
        }
    });

    // --------------------------------------------------------------------------
    // 8. Message Actions (Copy, Speech Synthesis, Reactions)
    // --------------------------------------------------------------------------
    function attachMessageActions(rowElement) {
        const copyBtn = rowElement.querySelector('.copy-btn');
        const ttsBtn = rowElement.querySelector('.tts-btn');
        const thumbsUp = rowElement.querySelector('.thumbs-up');
        const thumbsDown = rowElement.querySelector('.thumbs-down');
        const contentArea = rowElement.querySelector('.message-content');

        if (copyBtn && contentArea) {
            copyBtn.addEventListener('click', () => {
                const text = contentArea.innerText;
                navigator.clipboard.writeText(text).then(() => {
                    showToast('Response copied to clipboard!');
                    copyBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
                    setTimeout(() => {
                        copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
                    }, 2000);
                });
            });
        }

        if (ttsBtn && contentArea) {
            ttsBtn.addEventListener('click', () => {
                if (!speechSynth) {
                    showToast('Speech synthesis not supported on your browser.');
                    return;
                }

                if (speechSynth.speaking) {
                    speechSynth.cancel();
                    ttsBtn.classList.remove('active');
                    ttsBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
                    return;
                }

                const cleanText = contentArea.innerText;
                const utterance = new SpeechSynthesisUtterance(cleanText);
                utterance.rate = 1.0;
                utterance.pitch = 1.0;

                utterance.onstart = () => {
                    ttsBtn.classList.add('active');
                    ttsBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
                };

                utterance.onend = () => {
                    ttsBtn.classList.remove('active');
                    ttsBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
                };

                speechSynth.speak(utterance);
            });
        }

        if (thumbsUp) {
            thumbsUp.addEventListener('click', () => {
                thumbsUp.classList.toggle('active');
                if (thumbsDown) thumbsDown.classList.remove('active');
                if (thumbsUp.classList.contains('active')) {
                    showToast('Thank you for your feedback! 👍');
                }
            });
        }

        if (thumbsDown) {
            thumbsDown.addEventListener('click', () => {
                thumbsDown.classList.toggle('active');
                if (thumbsUp) thumbsUp.classList.remove('active');
                if (thumbsDown.classList.contains('active')) {
                    showToast('Feedback noted. We will work to improve! 👎');
                }
            });
        }
    }

    // Attach listener to initial welcome message copy & tts buttons
    const initialAiRow = document.querySelector('.ai-row');
    if (initialAiRow) {
        attachMessageActions(initialAiRow);
    }

    // --------------------------------------------------------------------------
    // 9. Clear Chat Confirmation Modal
    // --------------------------------------------------------------------------
    clearChatBtn.addEventListener('click', () => {
        confirmModal.classList.remove('hidden');
    });

    cancelClearBtn.addEventListener('click', () => {
        confirmModal.classList.add('hidden');
    });

    confirmClearBtn.addEventListener('click', () => {
        confirmModal.classList.add('hidden');
        
        // Cancel any ongoing speech
        if (speechSynth && speechSynth.speaking) {
            speechSynth.cancel();
        }

        // Reset chat window back to initial state
        chatMessages.innerHTML = `
            <div class="message-row ai-row">
                <div class="avatar ai-avatar">
                    <i class="fa-solid fa-bot"></i>
                </div>
                <div class="message-bubble ai-bubble">
                    <div class="message-header">
                        <span class="sender-name">FAQGenie AI</span>
                        <span class="message-time">Just now</span>
                    </div>
                    <div class="message-content">
                        Chat history cleared. 🧹 How can I assist you today?
                    </div>
                    <div class="message-actions">
                        <button class="action-btn copy-btn" title="Copy response">
                            <i class="fa-regular fa-copy"></i>
                        </button>
                        <button class="action-btn tts-btn" title="Listen to answer">
                            <i class="fa-solid fa-volume-high"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        const resetRow = chatMessages.querySelector('.ai-row');
        if (resetRow) attachMessageActions(resetRow);

        showToast('Chat history cleared!');
    });

    // Close modal when clicking backdrop
    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) {
            confirmModal.classList.add('hidden');
        }
    });

    // --------------------------------------------------------------------------
    // 10. Knowledge Base Accordion Modal & Drawer
    // --------------------------------------------------------------------------
    openFaqModalBtn.addEventListener('click', () => {
        renderFaqAccordionList('all', '');
        faqModal.classList.remove('hidden');
    });

    closeFaqModalBtn.addEventListener('click', () => {
        faqModal.classList.add('hidden');
    });

    faqModal.addEventListener('click', (e) => {
        if (e.target === faqModal) {
            faqModal.classList.add('hidden');
        }
    });

    // Category Tabs Filter
    faqCategoryTabs.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab-btn')) {
            faqCategoryTabs.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            const category = e.target.getAttribute('data-category');
            renderFaqAccordionList(category, faqSearchInput.value);
        }
    });

    // Search Filter Input
    faqSearchInput.addEventListener('input', () => {
        const activeTab = faqCategoryTabs.querySelector('.tab-btn.active');
        const category = activeTab ? activeTab.getAttribute('data-category') : 'all';
        renderFaqAccordionList(category, faqSearchInput.value);
    });

    function renderFaqAccordionList(category = 'all', searchQuery = '') {
        const cleanSearch = searchQuery.toLowerCase().trim();
        faqAccordionList.innerHTML = '';

        const filtered = faqDatabase.filter(item => {
            const matchesCategory = category === 'all' || item.category === category;
            const matchesSearch = cleanSearch === '' || 
                item.question.toLowerCase().includes(cleanSearch) || 
                item.answer.toLowerCase().includes(cleanSearch) ||
                item.keywords.some(k => k.toLowerCase().includes(cleanSearch));
            
            return matchesCategory && matchesSearch;
        });

        if (filtered.length === 0) {
            faqAccordionList.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.9rem;">
                    <i class="fa-solid fa-folder-open" style="font-size: 2rem; margin-bottom: 0.5rem; display: block; opacity: 0.5;"></i>
                    No matching FAQs found for "${escapeHTML(searchQuery)}".
                </div>
            `;
            return;
        }

        filtered.forEach(item => {
            const faqCard = document.createElement('div');
            faqCard.className = 'faq-item';
            faqCard.innerHTML = `
                <div class="faq-item-question">
                    <span>${escapeHTML(item.question)}</span>
                    <i class="fa-solid fa-chevron-down chevron-icon"></i>
                </div>
                <div class="faq-item-answer">
                    <div>${item.answer.replace(/\n/g, '<br>')}</div>
                    <button class="btn btn-secondary ask-this-faq-btn" style="margin-top: 0.8rem; font-size: 0.78rem;" data-q="${escapeHTML(item.question)}">
                        <i class="fa-solid fa-paper-plane"></i> Ask in Chat
                    </button>
                </div>
            `;

            const questionBar = faqCard.querySelector('.faq-item-question');
            questionBar.addEventListener('click', () => {
                faqCard.classList.toggle('open');
            });

            const askBtn = faqCard.querySelector('.ask-this-faq-btn');
            askBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                faqModal.classList.add('hidden');
                messageInput.value = item.question;
                updateInputState();
                if (!isTyping) {
                    chatForm.dispatchEvent(new Event('submit'));
                }
            });

            faqAccordionList.appendChild(faqCard);
        });
    }

    // --------------------------------------------------------------------------
    // 11. Toast Notification System & Utility Functions
    // --------------------------------------------------------------------------
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<i class="fa-solid fa-circle-info" style="color: var(--text-accent);"></i> <span>${escapeHTML(message)}</span>`;
        
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(30px)';
            toast.style.transition = 'all 0.3s ease-out';
            setTimeout(() => toast.remove(), 350);
        }, 3000);
    }

    // Helper HTML Escaper
    function escapeHTML(str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Initialize initial input counter state & backend health check
    updateInputState();
    initBackendHealthCheck();
});
