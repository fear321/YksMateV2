// Firebase ve Gemini AI Yapılandırması
const API_KEY = "AIzaSyA_lLNKmZG-2R2g-svYAM77Cm24_2LPorg";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

// AI Asistan Sınıfı
class AIAssistant {
    constructor() {
        this.messageHistory = [];
        this.isProcessing = false;
        this.tokens = 0;
        this.initializeElements();
        this.initializeEventListeners();
        this.loadMessageHistory();
        this.testAPI();
    }

// API Test Fonksiyonu
    async testAPI() {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: "Merhaba"
                    }]
                }]
            })
        });

        const data = await response.json();
        console.log('API Test Sonucu:', data);
            
            if (!response.ok) {
                this.addMessage({
                    type: 'ai',
                    text: 'Üzgünüm, şu anda AI servisi kullanılamıyor. Lütfen daha sonra tekrar deneyin.',
                    timestamp: Date.now()
                });
            }
            
        return response.ok;
    } catch (error) {
        console.error('API Test Hatası:', error);
            this.addMessage({
                type: 'ai',
                text: 'Üzgünüm, AI servisine bağlanırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
                timestamp: Date.now()
            });
        return false;
    }
}

    // DOM elementlerini başlat
    initializeElements() {
        this.chatMessages = document.getElementById('aiChatMessages');
        this.messageInput = document.getElementById('aiMessageInput');
        this.sendButton = document.getElementById('sendMessageBtn');
        this.tokenCount = document.getElementById('tokenCount');
    }

    // Event dinleyicilerini başlat
    initializeEventListeners() {
    // Mesaj gönderme butonu için event listener
        this.sendButton.addEventListener('click', () => this.sendMessage());
    
        // Enter tuşu için event listener
        this.messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
                this.sendMessage();
            }
        });

        // Textarea yüksekliğini otomatik ayarla
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = this.messageInput.scrollHeight + 'px';
        });

        // Hızlı öneriler için event listener
        document.querySelectorAll('.quick-suggestions li').forEach(suggestion => {
            suggestion.addEventListener('click', () => {
                this.messageInput.value = suggestion.textContent;
                this.sendMessage();
            });
        });
    }

    // Mesaj geçmişini yükle
    loadMessageHistory() {
        const user = firebase.auth().currentUser;
        if (user) {
            firebase.database().ref('users/' + user.uid + '/aiMessages').once('value')
                .then(snapshot => {
                    const messages = snapshot.val();
                    if (messages) {
                        this.messageHistory = messages;
                        this.displayMessages();
                    }
                });
        } else {
            // Misafir kullanıcı için local storage'dan yükle
            const guestMessages = localStorage.getItem('aiMessages');
            if (guestMessages) {
                this.messageHistory = JSON.parse(guestMessages);
                this.displayMessages();
            }
        }
    }

    // Mesajları kaydet
    saveMessageHistory() {
        const user = firebase.auth().currentUser;
        if (user) {
            firebase.database().ref('users/' + user.uid + '/aiMessages').set(this.messageHistory);
        } else {
            // Misafir kullanıcı için local storage'a kaydet
            localStorage.setItem('aiMessages', JSON.stringify(this.messageHistory));
        }
    }

    // Mesajları görüntüle
    displayMessages() {
        this.chatMessages.innerHTML = ''; // Mevcut mesajları temizle
        this.messageHistory.forEach(message => {
            const messageHtml = this.createMessageElement(message);
            this.chatMessages.insertAdjacentHTML('beforeend', messageHtml);
        });
        this.scrollToBottom();
    }

    // Mesaj elementi oluştur
    createMessageElement(message) {
        if (message.type === 'user') {
            return `
                <div class="user-message">
                    <div class="message-content">
                        <p>${this.escapeHtml(message.text)}</p>
                        </div>
                    </div>
            `;
        } else {
            return `
                <div class="ai-message">
                    <div class="ai-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="message-content">
                        <p>${this.escapeHtml(message.text)}</p>
                        ${message.suggestions ? this.createSuggestionsElement(message.suggestions) : ''}
                    </div>
                    </div>
            `;
        }
    }

    // Öneriler elementi oluştur
    createSuggestionsElement(suggestions) {
        if (!suggestions || !suggestions.length) return '';
        
        return `
            <ul class="quick-suggestions">
                ${suggestions.map(suggestion => `
                    <li>${this.escapeHtml(suggestion)}</li>
                `).join('')}
            </ul>
        `;
    }

    // HTML karakterlerini escape et
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Mesaj gönder
    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || this.isProcessing) return;

        // Jeton kontrolü
        if (!this.checkTokens()) {
            this.showTokenWarning();
            return;
        }

        this.isProcessing = true;
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';

        // Kullanıcı mesajını ekle
        const userMessage = { type: 'user', text: message, timestamp: Date.now() };
        this.addMessage(userMessage);

        // AI yanıtını al
        await this.getAIResponse(message);

        this.isProcessing = false;
        this.updateTokenCount(-1); // Her mesaj için 1 jeton harca
        this.saveMessageHistory();
    }

    // Mesaj ekle
    addMessage(message) {
        this.messageHistory.push(message);
        const messageHtml = this.createMessageElement(message);
        this.chatMessages.insertAdjacentHTML('beforeend', messageHtml);
        this.scrollToBottom();
    }

    // AI yanıtını al
    async getAIResponse(userMessage) {
        // Yükleniyor mesajı
        const loadingMessage = {
            type: 'ai',
            text: 'Düşünüyorum...',
            timestamp: Date.now()
        };
        this.addMessage(loadingMessage);

        try {
            // İsim sorgusu kontrolü
            const lowerMessage = userMessage.toLowerCase();
            if (lowerMessage.includes('ismin ne') || 
                lowerMessage.includes('adın ne') || 
                lowerMessage.includes('kimsin') || 
                lowerMessage.includes('kendini tanıt') ||
                lowerMessage.includes('adınız ne')) {
                
                // Yükleniyor mesajını kaldır
                this.messageHistory.pop();
                this.chatMessages.lastElementChild.remove();
                
                // İsim yanıtını ekle
                const nameResponse = {
                    type: 'ai',
                    text: 'Merhaba! Ben MateAI, YKS hazırlık sürecinizde size yardımcı olmak için tasarlanmış yapay zeka asistanıyım. Size nasıl yardımcı olabilirim?',
                    timestamp: Date.now(),
                    suggestions: [
                        '📚 Konu tekrarı yapmak istiyorum',
                        '📝 Soru çözmek istiyorum',
                        '📊 Net analizimi yap',
                        '📅 Çalışma programı oluştur'
                    ]
                };
                
                this.addMessage(nameResponse);
                return;
            }

    const requestBody = {
        contents: [{
            parts: [{
                        text: `Sen MateAI adında bir YKS (Yükseköğretim Kurumları Sınavı) hazırlık asistanısın. 
                        Öğrencilere YKS hazırlık sürecinde yardımcı oluyorsun. 
                        Cevapların kısa, öz ve Türkçe olmalı.
                        Sana ismin sorulursa, adının MateAI olduğunu söylemelisin.
                        Kullanıcı sorusu: ${userMessage}`
            }]
        }]
    };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

            // Yükleniyor mesajını kaldır
            this.messageHistory.pop();
            this.chatMessages.lastElementChild.remove();

        if (!response.ok) {
            const errorData = await response.json();
            console.error('API Hata Detayı:', errorData);
            throw new Error(errorData.error?.message || 'API yanıt vermedi');
        }

        const data = await response.json();
        console.log('API Yanıtı:', data);
        
        if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
            throw new Error('Geçersiz API yanıtı');
        }

            // AI yanıtını ekle
            const aiResponse = {
                type: 'ai',
                text: data.candidates[0].content.parts[0].text,
                timestamp: Date.now()
            };
            
            this.addMessage(aiResponse);
            
    } catch (error) {
        console.error('API İstek Hatası:', error);
            
            // Hata mesajını ekle
            const errorResponse = {
                type: 'ai',
                text: `Üzgünüm, bir hata oluştu: ${error.message}. Lütfen tekrar deneyin.`,
                timestamp: Date.now(),
                suggestions: [
                    '📚 Konu tekrarı yapmak istiyorum',
                    '📝 Soru çözmek istiyorum',
                    '📊 Deneme analizimi yap',
                    '📅 Çalışma programı oluştur'
                ]
            };
            
            this.addMessage(errorResponse);
        }
    }

    // Jeton kontrolü
    checkTokens() {
        return this.tokens > 0;
    }

    // Jeton uyarısı göster
    showTokenWarning() {
        const warningMessage = {
            type: 'ai',
            text: 'Üzgünüm, yeterli jetonunuz kalmadı. Daha fazla jeton kazanmak için deneme sınavı çözebilir veya günlük görevleri tamamlayabilirsiniz.',
            timestamp: Date.now()
        };
        this.addMessage(warningMessage);
    }

    // Jeton sayısını güncelle
    updateTokenCount(change) {
        this.tokens += change;
        if (this.tokenCount) {
            this.tokenCount.textContent = `${this.tokens} Jeton`;
        }

        // Kullanıcı verilerini güncelle
        const user = firebase.auth().currentUser;
        if (user) {
            firebase.database().ref('users/' + user.uid + '/tokens').set(this.tokens);
        } else {
            // Misafir kullanıcı için local storage'ı güncelle
            const guestUser = JSON.parse(localStorage.getItem('guestUser') || '{}');
            guestUser.tokens = this.tokens;
            localStorage.setItem('guestUser', JSON.stringify(guestUser));
        }
    }

    // Sohbeti en alta kaydır
    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
}

// Sayfa yüklendiğinde AI Asistanı başlat
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('aiChatMessages')) {
        const ai = new AIAssistant();

        // Kullanıcı oturumunu kontrol et
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                // Kullanıcı jeton sayısını al
                firebase.database().ref('users/' + user.uid + '/tokens').once('value')
                    .then(snapshot => {
                        ai.tokens = snapshot.val() || 10; // Başlangıçta 10 jeton ver
                        ai.updateTokenCount(0); // Jeton sayısını güncelle
                    });
            } else {
                // Misafir kullanıcı için local storage'dan jeton sayısını al
                const guestUser = JSON.parse(localStorage.getItem('guestUser') || '{}');
                ai.tokens = guestUser.tokens || 10; // Başlangıçta 10 jeton ver
                ai.updateTokenCount(0); // Jeton sayısını güncelle
            }
        });
    }
});

// Jeton Satın Alma Modalı
function showBuyTokensModal() {
    document.getElementById('buyTokensModal').style.display = 'block';
}

// Jeton Satın Alma
function buyTokens(amount, price) {
    // Burada ödeme işlemi yapılacak
    // Şimdilik sadece jeton sayısını güncelliyoruz
    const currentTokens = parseInt(document.getElementById('tokenCount').textContent);
    updateTokenCount(currentTokens + amount);
    
    // Modalı kapat
    document.getElementById('buyTokensModal').style.display = 'none';
}
