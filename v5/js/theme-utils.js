/**
 * Tema Yönetimi Yardımcı Fonksiyonları
 */

// Tema değişkenlerini tanımla
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

// Tema yönetimi sınıfı
class ThemeManager {
    constructor() {
        this.init();
    }

    init() {
        // Kayıtlı tema ve opaklık değerlerini yükle
        this.loadTheme();
        this.loadOpacity();
        this.setupThemeTransition();
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('selectedTheme') || 'light';
        this.applyTheme(savedTheme);
    }

    loadOpacity() {
        const savedOpacity = localStorage.getItem('selectedOpacity') || '100';
        document.body.style.opacity = savedOpacity / 100;
    }

    applyTheme(theme) {
        // Geçiş animasyonu için sınıf ekle
        document.body.classList.add('theme-transition');
        
        // Tema sınıfını body'e uygula
        document.body.className = `theme-${theme}`;
        
        // CSS değişkenlerini güncelle
        this.updateThemeVariables(theme);
        
        // Tema kartlarını güncelle (varsa)
        this.updateThemeCards(theme);
        
        // Geçiş animasyonunu kaldır
        setTimeout(() => {
            document.body.classList.remove('theme-transition');
        }, 300);
    }

    updateThemeVariables(theme) {
        const variables = themeVariables[theme];
        if (variables) {
            Object.entries(variables).forEach(([key, value]) => {
                document.documentElement.style.setProperty(key, value);
            });
        }
    }

    updateThemeCards(theme) {
        const themeCards = document.querySelectorAll('.theme-card');
        themeCards.forEach(card => {
            if (card.getAttribute('data-theme') === theme) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });
    }

    setupThemeTransition() {
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

    setTheme(theme) {
        localStorage.setItem('selectedTheme', theme);
        this.applyTheme(theme);
    }

    setOpacity(value) {
        localStorage.setItem('selectedOpacity', value);
        document.body.style.opacity = value / 100;
    }
}

// Sayfa yüklendiğinde tema yöneticisini başlat
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
}); 