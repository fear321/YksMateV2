/**
 * Tema Yöneticisi
 * Kullanıcı tema tercihlerini yönetir ve uygular
 */
document.addEventListener('DOMContentLoaded', function() {
    // Tema kartları
    const themeCards = document.querySelectorAll('.theme-card');
    
    // Parlaklık kontrolü (eski opaklık)
    const opacitySlider = document.getElementById('opacitySlider');
    const opacityValue = document.getElementById('opacityValue');
    
    // Yeni saydamlık kontrolü
    const transparencySlider = document.getElementById('transparencySlider');
    const transparencyValue = document.getElementById('transparencyValue');
    
    // Tema toggle butonu
    const themeToggle = document.getElementById('themeToggle');
    
    // Diğer ayarlar
    const darkModeToggle = document.getElementById('darkModeToggle');
    const notificationsToggle = document.getElementById('notificationsToggle');
    const soundEffectsToggle = document.getElementById('soundEffectsToggle');
    const languageSelect = document.getElementById('languageSelect');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    
    // Kayıtlı ayarları yükle
    loadSettings();
    
    // Tema kartlarına tıklama olayı ekle
    if (themeCards.length > 0) {
        themeCards.forEach(card => {
            card.addEventListener('click', function() {
                const theme = this.getAttribute('data-theme');
                applyTheme(theme);
                
                // Aktif kartı işaretle
                themeCards.forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                
                // Tema tercihini kaydet
                localStorage.setItem('selectedTheme', theme);
                localStorage.setItem('theme', theme); // Her iki anahtarda da kaydet
                
                // Karanlık mod toggle'ının durumunu güncelle
                if (darkModeToggle) {
                    darkModeToggle.checked = theme === 'dark';
                }
                
                // Tema toggle ikonu güncelle
                updateThemeToggleIcon(theme);
            });
        });
    }
    
    // Header'daki tema toggle butonuna tıklama olayı ekle 
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            // Mevcut temayı doğru şekilde kontrol et
            const currentBodyClass = document.body.className;
            const currentTheme = currentBodyClass.includes('dark') ? 'dark' : 'light';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            applyTheme(newTheme);
            
            // LocalStorage'a kaydet
            localStorage.setItem('selectedTheme', newTheme);
            localStorage.setItem('theme', newTheme); // Her iki anahtarda da kaydet
            
            // Tema toggle ikonu güncelle
            updateThemeToggleIcon(newTheme);
            
            // Karanlık mod toggle'ının durumunu güncelle
            if (darkModeToggle) {
                darkModeToggle.checked = newTheme === 'dark';
            }
            
            // Tema kartlarını güncelle
            if (themeCards.length > 0) {
                themeCards.forEach(card => {
                    card.classList.remove('active');
                    if (card.getAttribute('data-theme') === newTheme) {
                        card.classList.add('active');
                    }
                });
            }
        });
    }
    
    // Karanlık mod toggle butonu olayı
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', function() {
            const newTheme = this.checked ? 'dark' : 'light';
            
            applyTheme(newTheme);
            
            // LocalStorage'a kaydet
            localStorage.setItem('selectedTheme', newTheme); 
            localStorage.setItem('theme', newTheme); // Her iki anahtarda da kaydet
            
            // Tema toggle ikonu güncelle
            updateThemeToggleIcon(newTheme);
            
            // Tema kartlarını güncelle
            if (themeCards.length > 0) {
                themeCards.forEach(card => {
                    card.classList.remove('active');
                    if (card.getAttribute('data-theme') === newTheme) {
                        card.classList.add('active');
                    }
                });
            }
        });
    }
    
    // Parlaklık ayarı (eski opaklık)
    if (opacitySlider && opacityValue) {
        opacitySlider.addEventListener('input', function() {
            const value = this.value;
            opacityValue.textContent = `${value}%`;
            document.body.style.filter = `brightness(${value / 100})`;
            localStorage.setItem('selectedBrightness', value);
        });
    }
    
    // Saydamlık ayarı
    if (transparencySlider && transparencyValue) {
        transparencySlider.addEventListener('input', function() {
            const value = this.value;
            transparencyValue.textContent = `${value}%`;
            document.body.style.opacity = value / 100;
            localStorage.setItem('selectedTransparency', value);
        });
    }
    
    // Ayarları kaydet butonu
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', function() {
            saveSettings();
            alert('Ayarlar başarıyla kaydedildi!');
        });
    }
    
    /**
     * Tema toggle ikonunu güncelle
     * @param {string} theme - Tema adı
     */
    function updateThemeToggleIcon(theme) {
        if (themeToggle) {
            themeToggle.innerHTML = `<i class="fas fa-${theme === 'dark' ? 'sun' : 'moon'}"></i>`;
        }
    }
    
    /**
     * Kayıtlı ayarları yükler
     */
    function loadSettings() {
        // Hem selectedTheme hem de theme anahtarlarını kontrol et
        let savedTheme = localStorage.getItem('selectedTheme');
        if (!savedTheme) {
            savedTheme = localStorage.getItem('theme');
        }
        
        // Varsayılan tema
        if (!savedTheme) {
            savedTheme = 'light';
        }
        
        // Tema uygula
        applyTheme(savedTheme);
        
        // Tema toggle ikonu güncelle
        updateThemeToggleIcon(savedTheme);
        
        // Parlaklık ayarı
        const savedBrightness = localStorage.getItem('selectedBrightness') || '100';
        if (opacitySlider && opacityValue) {
            opacitySlider.value = savedBrightness;
            opacityValue.textContent = `${savedBrightness}%`;
            document.body.style.filter = `brightness(${savedBrightness / 100})`;
        }
        
        // Saydamlık ayarı
        const savedTransparency = localStorage.getItem('selectedTransparency') || '100';
        if (transparencySlider && transparencyValue) {
            transparencySlider.value = savedTransparency;
            transparencyValue.textContent = `${savedTransparency}%`;
            document.body.style.opacity = savedTransparency / 100;
        }
        
        // Arkaplan fotoğrafı
        const savedBackground = localStorage.getItem('backgroundImage');
        if (savedBackground) {
            document.body.style.backgroundImage = `url(${savedBackground})`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundAttachment = 'fixed';
            document.body.style.backgroundPosition = 'center';
            document.body.classList.add('has-background');
            
            // Arkaplan opaklığı
            const savedBackgroundOpacity = localStorage.getItem('backgroundOpacity') || '50';
            applyBackgroundOpacity(savedBackgroundOpacity);
            
            // Arkaplan bulanıklığı
            const savedBackgroundBlur = localStorage.getItem('backgroundBlur') || '0';
            applyBackgroundBlur(savedBackgroundBlur);
        }
        
        // Diğer ayarlar
        if (darkModeToggle) {
            darkModeToggle.checked = savedTheme === 'dark';
        }
        
        if (notificationsToggle) {
            notificationsToggle.checked = localStorage.getItem('notifications') !== 'false';
        }
        
        if (soundEffectsToggle) {
            soundEffectsToggle.checked = localStorage.getItem('soundEffects') !== 'false';
        }
        
        if (languageSelect) {
            languageSelect.value = localStorage.getItem('language') || 'tr';
        }
        
        // Firebase'den kullanıcı ayarlarını yükle
        loadUserSettings();
    }
    
    /**
     * Arkaplan opaklığını uygular
     * @param {string} opacity - Opaklık değeri (0-100)
     */
    function applyBackgroundOpacity(opacity) {
        // Arkaplan için bir pseudo-element oluştur
        const style = document.createElement('style');
        style.id = 'backgroundOpacityStyle';
        
        // Varsa önceki stili kaldır
        const existingStyle = document.getElementById('backgroundOpacityStyle');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        // Yeni stili ekle
        style.textContent = `
            body::before {
                content: '';
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: var(--bg-primary);
                opacity: ${1 - opacity/100};
                z-index: -1;
                pointer-events: none;
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Arkaplan bulanıklığını uygular
     * @param {string} blur - Bulanıklık değeri (0-20px)
     */
    function applyBackgroundBlur(blur) {
        // Arkaplan bulanıklığı için bir stil oluştur
        const style = document.createElement('style');
        style.id = 'backgroundBlurStyle';
        
        // Varsa önceki stili kaldır
        const existingStyle = document.getElementById('backgroundBlurStyle');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        // Yeni stili ekle
        style.textContent = `
            body.has-background {
                position: relative;
            }
            
            body.has-background::after {
                content: '';
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: -2;
                backdrop-filter: blur(${blur}px);
                -webkit-backdrop-filter: blur(${blur}px);
                pointer-events: none;
            }
            
            /* Sidebar için bulanıklık efekti */
            .sidebar {
                backdrop-filter: blur(${blur}px);
                -webkit-backdrop-filter: blur(${blur}px);
                background-color: rgba(var(--bg-primary-rgb, 255, 255, 255), 0.7) !important;
            }
            
            .dark-theme .sidebar {
                background-color: rgba(30, 30, 46, 0.7) !important;
            }
            
            .purple-theme .sidebar {
                background-color: rgba(245, 240, 245, 0.7) !important;
            }
            
            .blue-theme .sidebar {
                background-color: rgba(240, 245, 249, 0.7) !important;
            }
            
            .green-theme .sidebar {
                background-color: rgba(240, 249, 245, 0.7) !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Temayı uygular
     * @param {string} theme - Tema adı
     */
    function applyTheme(theme) {
        // Geçiş animasyonu için sınıf ekle
        document.body.classList.add('theme-transition');
        
        // Tema sınıfını body'e uygula - tutarlı format kullan
        document.body.className = `${theme}-theme`;
        
        // CSS değişkenlerini güncelle
        updateThemeVariables(theme);
        
        // Aktif tema kartını işaretle (eğer sayfa tema kartları içeriyorsa)
        if (themeCards.length > 0) {
            themeCards.forEach(card => {
                if (card.getAttribute('data-theme') === theme) {
                    card.classList.add('active');
                } else {
                    card.classList.remove('active');
                }
            });
        }

        // Geçiş animasyonunu kaldır
        setTimeout(() => {
            document.body.classList.remove('theme-transition');
        }, 300);
        
        // Her iki localStorage anahtarına da kaydet
        localStorage.setItem('selectedTheme', theme);
        localStorage.setItem('theme', theme);
    }
    
    /**
     * Tema CSS değişkenlerini günceller
     * @param {string} theme - Tema adı
     */
    function updateThemeVariables(theme) {
        const themeVariables = {
            light: {
                '--primary-color': '#4b2138',
                '--primary-dark': '#3a1a2b',
                '--primary-light': '#5c2845',
                '--accent-color': '#4b2138',
                '--accent-dark': '#3a1a2b',
                '--accent-light': '#5c2845',
                '--accent-gradient': 'linear-gradient(45deg, #4b2138, #5c2845)',
                '--bg-primary': '#ffffff',
                '--bg-secondary': '#f8f9fa',
                '--text-primary': '#2c3e50',
                '--text-secondary': '#6c757d',
                '--border-color': '#e9ecef',
                '--hover-color': 'rgba(75, 33, 56, 0.1)',
                '--danger-color': '#dc3545',
                '--success-color': '#28a745',
                '--warning-color': '#ffc107',
                '--info-color': '#17a2b8',
                '--sidebar-bg': '#ffffff',
                '--sidebar-hover': 'rgba(75, 33, 56, 0.1)',
                '--sidebar-active': 'rgba(75, 33, 56, 0.15)',
                '--sidebar-text': '#2c3e50',
                '--sidebar-active-text': '#4b2138',
                '--sidebar-border': '#e9ecef'
            },
            purple: {
                '--primary-color': '#7c37a6',
                '--primary-dark': '#5a2878',
                '--primary-light': '#9645c7',
                '--accent-color': '#9645c7',
                '--accent-dark': '#7c37a6',
                '--accent-light': '#b164e6',
                '--accent-gradient': 'linear-gradient(45deg, #7c37a6, #9645c7)',
                '--bg-primary': '#ffffff',
                '--bg-secondary': '#f8f9fa',
                '--text-primary': '#2c3e50',
                '--text-secondary': '#6c757d',
                '--border-color': '#e9ecef',
                '--hover-color': 'rgba(124, 55, 166, 0.1)',
                '--danger-color': '#dc3545',
                '--success-color': '#28a745',
                '--warning-color': '#ffc107',
                '--info-color': '#17a2b8',
                '--sidebar-bg': '#ffffff',
                '--sidebar-hover': 'rgba(124, 55, 166, 0.1)',
                '--sidebar-active': 'rgba(124, 55, 166, 0.15)',
                '--sidebar-text': '#2c3e50',
                '--sidebar-active-text': '#7c37a6',
                '--sidebar-border': '#e9ecef'
            },
            blue: {
                '--primary-color': '#1da1f2',
                '--primary-dark': '#1991da',
                '--primary-light': '#4db5f5',
                '--accent-color': '#1da1f2',
                '--accent-dark': '#1991da',
                '--accent-light': '#4db5f5',
                '--accent-gradient': 'linear-gradient(45deg, #1da1f2, #4db5f5)',
                '--bg-primary': '#ffffff',
                '--bg-secondary': '#f8f9fa',
                '--text-primary': '#2c3e50',
                '--text-secondary': '#6c757d',
                '--border-color': '#e9ecef',
                '--hover-color': 'rgba(29, 161, 242, 0.1)',
                '--danger-color': '#dc3545',
                '--success-color': '#28a745',
                '--warning-color': '#ffc107',
                '--info-color': '#17a2b8',
                '--sidebar-bg': '#ffffff',
                '--sidebar-hover': 'rgba(29, 161, 242, 0.1)',
                '--sidebar-active': 'rgba(29, 161, 242, 0.15)',
                '--sidebar-text': '#2c3e50',
                '--sidebar-active-text': '#1da1f2',
                '--sidebar-border': '#e9ecef'
            },
            green: {
                '--primary-color': '#2e7d32',
                '--primary-dark': '#1b5e20',
                '--primary-light': '#388e3c',
                '--accent-color': '#388e3c',
                '--accent-dark': '#2e7d32',
                '--accent-light': '#43a047',
                '--accent-gradient': 'linear-gradient(45deg, #2e7d32, #388e3c)',
                '--bg-primary': '#ffffff',
                '--bg-secondary': '#f8f9fa',
                '--text-primary': '#2c3e50',
                '--text-secondary': '#6c757d',
                '--border-color': '#e9ecef',
                '--hover-color': 'rgba(46, 125, 50, 0.1)',
                '--danger-color': '#dc3545',
                '--success-color': '#28a745',
                '--warning-color': '#ffc107',
                '--info-color': '#17a2b8',
                '--sidebar-bg': '#ffffff',
                '--sidebar-hover': 'rgba(46, 125, 50, 0.1)',
                '--sidebar-active': 'rgba(46, 125, 50, 0.15)',
                '--sidebar-text': '#2c3e50',
                '--sidebar-active-text': '#2e7d32',
                '--sidebar-border': '#e9ecef'
            },
            dark: {
                '--primary-color': '#bb86fc',
                '--primary-dark': '#9965c9',
                '--primary-light': '#c99fff',
                '--accent-color': '#bb86fc',
                '--accent-dark': '#9965c9',
                '--accent-light': '#c99fff',
                '--accent-gradient': 'linear-gradient(45deg, #bb86fc, #c99fff)',
                '--bg-primary': '#121212',
                '--bg-secondary': '#1e1e1e',
                '--text-primary': '#ffffff',
                '--text-secondary': '#a0a0a0',
                '--border-color': '#2d2d2d',
                '--hover-color': 'rgba(187, 134, 252, 0.1)',
                '--danger-color': '#cf6679',
                '--success-color': '#03dac6',
                '--warning-color': '#ffb74d',
                '--info-color': '#64b5f6',
                '--sidebar-bg': '#1e1e1e',
                '--sidebar-hover': 'rgba(187, 134, 252, 0.1)',
                '--sidebar-active': 'rgba(187, 134, 252, 0.15)',
                '--sidebar-text': '#ffffff',
                '--sidebar-active-text': '#bb86fc',
                '--sidebar-border': '#2d2d2d'
            }
        };

        const variables = themeVariables[theme];
        if (variables) {
            Object.entries(variables).forEach(([key, value]) => {
                document.documentElement.style.setProperty(key, value);
            });
        }
    }
    
    /**
     * Tüm ayarları kaydeder
     */
    function saveSettings() {
        // Tema ve parlaklık/saydamlık ayarları zaten tıklama olaylarında kaydediliyor
        
        // Diğer ayarları kaydet
        if (darkModeToggle) {
            localStorage.setItem('darkMode', darkModeToggle.checked);
        }
        
        if (notificationsToggle) {
            localStorage.setItem('notifications', notificationsToggle.checked);
        }
        
        if (soundEffectsToggle) {
            localStorage.setItem('soundEffects', soundEffectsToggle.checked);
        }
        
        if (languageSelect) {
            localStorage.setItem('language', languageSelect.value);
        }
        
        // Firebase'e ayarları kaydet
        saveUserSettings();
    }
    
    /**
     * Firebase'den kullanıcı ayarlarını yükler
     */
    function loadUserSettings() {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged(function(user) {
                if (user) {
                    firebase.database().ref(`users/${user.uid}/settings`).once('value')
                        .then(snapshot => {
                            if (snapshot.exists()) {
                                const settings = snapshot.val();
                                
                                // Tema ayarı
                                if (settings.theme) {
                                    applyTheme(settings.theme);
                                    localStorage.setItem('selectedTheme', settings.theme);
                                    localStorage.setItem('theme', settings.theme);
                                }
                                
                                // Parlaklık ayarı
                                if (settings.brightness && opacitySlider && opacityValue) {
                                    opacitySlider.value = settings.brightness;
                                    opacityValue.textContent = `${settings.brightness}%`;
                                    document.body.style.filter = `brightness(${settings.brightness / 100})`;
                                    localStorage.setItem('selectedBrightness', settings.brightness);
                                }
                                
                                // Saydamlık ayarı
                                if (settings.transparency && transparencySlider && transparencyValue) {
                                    transparencySlider.value = settings.transparency;
                                    transparencyValue.textContent = `${settings.transparency}%`;
                                    document.body.style.opacity = settings.transparency / 100;
                                    localStorage.setItem('selectedTransparency', settings.transparency);
                                }
                                
                                // Diğer ayarlar
                                if (darkModeToggle && settings.darkMode !== undefined) {
                                    darkModeToggle.checked = settings.darkMode;
                                    localStorage.setItem('darkMode', settings.darkMode);
                                }
                                
                                if (notificationsToggle && settings.notifications !== undefined) {
                                    notificationsToggle.checked = settings.notifications;
                                    localStorage.setItem('notifications', settings.notifications);
                                }
                                
                                if (soundEffectsToggle && settings.soundEffects !== undefined) {
                                    soundEffectsToggle.checked = settings.soundEffects;
                                    localStorage.setItem('soundEffects', settings.soundEffects);
                                }
                                
                                if (languageSelect && settings.language) {
                                    languageSelect.value = settings.language;
                                    localStorage.setItem('language', settings.language);
                                }
                            }
                        })
                        .catch(error => {
                            console.error('Ayarlar yüklenirken hata:', error);
                        });
                }
            });
        }
    }
    
    /**
     * Firebase'e kullanıcı ayarlarını kaydeder
     */
    function saveUserSettings() {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            const user = firebase.auth().currentUser;
            if (user) {
                const settings = {
                    theme: localStorage.getItem('selectedTheme'),
                    brightness: localStorage.getItem('selectedBrightness'),
                    transparency: localStorage.getItem('selectedTransparency'),
                    darkMode: localStorage.getItem('darkMode') === 'true',
                    notifications: localStorage.getItem('notifications') !== 'false',
                    soundEffects: localStorage.getItem('soundEffects') !== 'false',
                    language: localStorage.getItem('language') || 'tr'
                };
                
                firebase.database().ref(`users/${user.uid}/settings`).update(settings)
                    .catch(error => {
                        console.error('Ayarlar kaydedilirken hata:', error);
                    });
            }
        }
    }

    /**
     * Tema geçiş animasyonunu ayarlar
     */
    function setupThemeTransition() {
        const style = document.createElement('style');
        style.textContent = `
            .theme-transition {
                transition: background-color 0.3s ease,
                            color 0.3s ease,
                            border-color 0.3s ease,
                            box-shadow 0.3s ease !important;
            }
            .theme-transition * {
                transition: background-color 0.3s ease,
                            color 0.3s ease,
                            border-color 0.3s ease,
                            box-shadow 0.3s ease !important;
            }
        `;
        document.head.appendChild(style);
    }

    // Tema geçiş animasyonunu kur
    setupThemeTransition();
    
    // Global değişken ile theme-manager.js'nin yüklendiğini işaretle
    window.themeManagerLoaded = true;
}); 