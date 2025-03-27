/**
 * Tema Yöneticisi
 * Kullanıcı tema tercihlerini yönetir ve uygular
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log("Tema yöneticisi başlatılıyor...");
    
    // Tema bilgisini localStorage'dan al
    const savedTheme = localStorage.getItem('theme');
    const appearanceData = JSON.parse(localStorage.getItem('appearanceData')) || {};
    const currentTheme = appearanceData.theme || savedTheme || 'light';
    
    console.log("Yüklenen tema:", currentTheme);
    
    // Yazı boyutu ayarlarını uygula
    applyFontSize();
    
    // Temayı doğrudan uygula
    applyTheme(currentTheme);
    updateThemeToggleIcon(currentTheme);
    
    // Tema seçim butonunu güncelle
    const themeRadio = document.querySelector(`input[name="theme"][value="${currentTheme}"]`);
    if (themeRadio) {
        themeRadio.checked = true;
    }

    // Tema seçenekleri için radio butonlarını dinle
    const themeRadios = document.querySelectorAll('input[name="theme"]');
    themeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            const selectedTheme = this.value;
            applyTheme(selectedTheme);
            updateThemeToggleIcon(selectedTheme);
            saveThemeToStorage(selectedTheme);
        });
    });

    // Tema toggle butonu için olay dinleyicisi
    const themeToggleBtn = document.getElementById('themeToggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', function() {
            const currentBodyClass = document.body.className;
            let currentTheme = 'light';
            
            if (currentBodyClass.includes('light-theme')) {
                currentTheme = 'light';
            } else if (currentBodyClass.includes('dark-theme')) {
                currentTheme = 'dark';
            }
            
            // Sadece açık ve koyu tema arasında geçiş yap
            let newTheme = currentTheme === 'light' ? 'dark' : 'light';
            
            console.log("Tema değiştiriliyor:", currentTheme, "->", newTheme);
            
            applyTheme(newTheme);
            updateThemeToggleIcon(newTheme);
            saveThemeToStorage(newTheme);
            
            // Radio butonunu güncelle
            const radio = document.querySelector(`input[name="theme"][value="${newTheme}"]`);
            if (radio) {
                radio.checked = true;
            }
        });
    }

    // Tema toggle ikonunu güncelle
    function updateThemeToggleIcon(theme) {
        const toggleBtn = document.getElementById('themeToggle');
        if (toggleBtn) {
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                if (theme === 'light') {
                    icon.className = 'fas fa-moon';
                } else {
                    icon.className = 'fas fa-sun';
                }
            }
        }
    }
    
    // Temayı uygula
    function applyTheme(theme) {
        console.log("Tema uygulanıyor:", theme);
        
        // Tema sınıflarını temizle
        document.body.classList.remove('light-theme', 'dark-theme');
        
        // Yeni tema sınıfını ekle
        document.body.classList.add(`${theme}-theme`);
        
        // Koyu tema için özel stil uygulamaları
        if (theme === 'dark') {
            applyDarkThemeStyles();
        }
    }
    
    // Koyu tema için özel stil uygulamaları
    function applyDarkThemeStyles() {
        // Tüm öğelerin arkaplan rengini #0a0a0a yap
        const darkElements = [
            'html',
            'body',
            '.container',
            '.dashboard-container',
            '.main-content',
            '.sidebar',
            '.card',
            '.settings-content',
            '.settings-tabs',
            '.content-header',
            'input',
            'select',
            'textarea',
            '.search-bar',
            '.notification-btn',
            '.btn-outline',
            '.theme-card',
            '.modal',
            '.dropdown-menu',
            '.task-item',
            '.calendar-day',
            '.note-card',
            '.exam-card',
            '.profile-card',
            '.community-post',
            '.comment-box',
            '.page-content',
            '.settings-page',
            '.settings-container',
            '.form-group',
            '.checkbox-group',
            '.danger-zone',
            '.theme-options',
            '.theme-option',
            '.theme-label',
            '.theme-preview',
            '.theme-card-header',
            '.theme-card-title',
            '.settings-form',
            '.btn-primary',
            '.btn-outline',
            '.btn-danger',
            '.notification-badge',
            '.user-info',
            '.user-avatar',
            '.user-details',
            '.sidebar-footer',
            '.sidebar-nav',
            '.sidebar-toggle',
            '.content-header',
            '.header-actions',
            '.page-title',
            '.task-notification'
        ];
        
        // CSS kuralı oluştur
        let styleElement = document.getElementById('dark-theme-styles');
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = 'dark-theme-styles';
            document.head.appendChild(styleElement);
        }
        
        // Tüm öğeler için stil kuralları
        let cssRules = '';
        darkElements.forEach(selector => {
            cssRules += `.dark-theme ${selector} { background-color: #0a0a0a !important; }\n`;
        });
        
        // Gradient arka planları kaldır
        cssRules += `.dark-theme .main-content { background-image: none !important; }\n`;
        cssRules += `.dark-theme body { background: #0a0a0a !important; }\n`;
        cssRules += `.dark-theme html { background: #0a0a0a !important; }\n`;
        cssRules += `.dark-theme .container { background: #0a0a0a !important; }\n`;
        cssRules += `.dark-theme .dashboard-container { background: #0a0a0a !important; }\n`;
        
        // Tüm öğelerin arkaplan rengini ayarla
        cssRules += `.dark-theme * { background-color: #0a0a0a !important; }\n`;
        
        // Stil kurallarını uygula
        styleElement.textContent = cssRules;
        
        console.log("Koyu tema stilleri uygulandı");
    }
    
    // Temayı localStorage'a kaydet
    function saveThemeToStorage(theme) {
        console.log("Tema kaydediliyor:", theme);
        
        // Her tema değişikliğinde localStorage'a kaydet
        localStorage.setItem('theme', theme);
        
        // appearanceData nesnesini de güncelle
        const appearanceData = JSON.parse(localStorage.getItem('appearanceData')) || {};
        appearanceData.theme = theme;
        localStorage.setItem('appearanceData', JSON.stringify(appearanceData));
    }
    
    // Görünüm ayarlarını kaydet
    const saveAppearanceBtn = document.getElementById('saveAppearanceBtn');
    if (saveAppearanceBtn) {
        saveAppearanceBtn.addEventListener('click', function() {
            const theme = document.querySelector('input[name="theme"]:checked')?.value || currentTheme;
            const fontSize = document.getElementById('fontSize')?.value || 'medium';
            
            console.log("Görünüm ayarları kaydediliyor. Tema:", theme, "Yazı boyutu:", fontSize);
            
            // Temayı uygula
            applyTheme(theme);
            updateThemeToggleIcon(theme);
            saveThemeToStorage(theme);
            
            // Yazı boyutunu uygula
            document.documentElement.setAttribute('data-font-size', fontSize);
            
            // Yazı boyutunu localStorage'a kaydet
            localStorage.setItem('fontSize', fontSize);
            
            // appearanceData nesnesini güncelle
            const appearanceData = JSON.parse(localStorage.getItem('appearanceData')) || {};
            appearanceData.fontSize = fontSize;
            appearanceData.theme = theme;
            localStorage.setItem('appearanceData', JSON.stringify(appearanceData));
        });
    }
    
    // Yazı boyutu uygulama fonksiyonu
    function applyFontSize() {
        const appearanceData = JSON.parse(localStorage.getItem('appearanceData')) || {};
        const fontSize = appearanceData.fontSize || localStorage.getItem('fontSize') || 'medium';
        
        // HTML element'ine yazı boyutu özelliğini ekle
        document.documentElement.setAttribute('data-font-size', fontSize);
        console.log("Yazı boyutu uygulandı:", fontSize);
        
        // Yazı boyutunun değişimini dinleme (Font size değişikliğini takip et)
        listenForFontSizeChanges();
    }
    
    // Yazı boyutu değişimini takip etme
    function listenForFontSizeChanges() {
        // LocalStorage değişikliklerini dinle
        window.addEventListener('storage', function(event) {
            // Yazı boyutu değiştiğinde güncelle
            if (event.key === 'fontSize' || event.key === 'appearanceData') {
                const appearanceData = JSON.parse(localStorage.getItem('appearanceData')) || {};
                const fontSize = appearanceData.fontSize || localStorage.getItem('fontSize') || 'medium';
                
                // HTML element'ine yazı boyutu özelliğini ekle
                document.documentElement.setAttribute('data-font-size', fontSize);
                console.log("Yazı boyutu güncellendi (storage event):", fontSize);
            }
        });
        
        // Periyodik olarak yazı boyutunu kontrol et (bazı sayfalar için ek önlem)
        setInterval(function() {
            const appearanceData = JSON.parse(localStorage.getItem('appearanceData')) || {};
            const fontSize = appearanceData.fontSize || localStorage.getItem('fontSize') || 'medium';
            const currentFontSize = document.documentElement.getAttribute('data-font-size');
            
            // Eğer mevcut yazı boyutu ayarlardan farklıysa güncelle
            if (currentFontSize !== fontSize) {
                document.documentElement.setAttribute('data-font-size', fontSize);
                console.log("Yazı boyutu periyodik güncelleme:", fontSize);
            }
        }, 2000); // 2 saniyede bir kontrol et
    }
    
    // Sayfa yüklendiğinde koyu tema uygulanmışsa, özel stilleri uygula
    if (document.body.classList.contains('dark-theme')) {
        applyDarkThemeStyles();
    }
    
    // Global değişken ile theme-manager.js'nin yüklendiğini işaretle
    window.themeManagerLoaded = true;
}); 