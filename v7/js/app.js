document.addEventListener('DOMContentLoaded', () => {
    console.log("Sayfa yüklendi, uygulama başlatılıyor...");
    
    // Uygulama bileşenlerini başlat
    initializeApp();
    
    // Firebase yüklenene kadar bekle
    if (typeof firebase !== 'undefined' && firebase.app) {
        console.log("Firebase yüklendi");
        
        // NOT: Otomatik veri kaydetme işlemi artık firebase-config.js dosyasında
        // Sayfa kapatılmadan önce uyarı gösterme kodu kaldırıldı
        // Bunun yerine veriler otomatik olarak kaydedilecek
    } else {
        console.error("Firebase yüklenemedi!");
        alert("Sistem yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.");
    }
});

// NOT: Otomatik kaydetme işlevleri firebase-config.js dosyasına taşındı
// Aşağıdaki işlevler kaldırıldı:
// - initializeAutoSave()
// - saveUserData()
// - collectUserData()

function initializeApp() {
    initializeTheme();
    initializeSidebar();
    initializeNotifications();
    
    // Artık her sayfa ayrı bir HTML dosyası olduğu için
    // sayfa navigasyonu için özel bir işlem yapmaya gerek yok
    // initializePageNavigation();
    
    // Sayfa içi linkleri düzenle
    initializeInPageLinks();
}

// Tema yönetimi
function initializeTheme() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;
    
    // Eğer tema zaten theme-manager.js tarafından yönetiliyorsa, çıkış yap
    if (window.themeManagerLoaded) return;
    
    console.log("Basit tema yönetimi kullanılıyor. theme-manager.js yüklenmediyse bu yedek sistem çalışacak.");
    
    // theme ve selectedTheme anahtarlarını kontrol et
    let currentTheme = localStorage.getItem('selectedTheme');
    if (!currentTheme) {
        currentTheme = localStorage.getItem('theme') || 'light';
    }
    
    // Her iki anahtarı da senkronize tut
    localStorage.setItem('theme', currentTheme);
    localStorage.setItem('selectedTheme', currentTheme);
    
    // Temayı uygula
    document.body.className = `theme-${currentTheme}`;
    themeToggle.innerHTML = `<i class="fas fa-${currentTheme === 'light' ? 'moon' : 'sun'}"></i>`;
    
    // Tema değişikliği işlevi
    themeToggle.addEventListener('click', () => {
        const isLight = document.body.classList.contains('light-theme');
        const newTheme = isLight ? 'dark' : 'light';
        
        document.body.className = `theme-${newTheme}`;
        themeToggle.innerHTML = `<i class="fas fa-${newTheme === 'light' ? 'moon' : 'sun'}"></i>`;
        
        // Her iki localStorage anahtarını da güncelle
        localStorage.setItem('theme', newTheme);
        localStorage.setItem('selectedTheme', newTheme);
    });
}

// Sidebar yönetimi
function initializeSidebar() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    
    // Doğrulanmış elemanlar var mı?
    if (!sidebar) {
        console.error("Sidebar elemanı bulunamadı!");
        return;
    }
    
    // Overlay element yoksa oluştur
    let sidebarOverlay = document.querySelector('.sidebar-overlay');
    if (!sidebarOverlay) {
        sidebarOverlay = document.createElement('div');
        sidebarOverlay.className = 'sidebar-overlay';
        document.body.appendChild(sidebarOverlay);
    }
    
    // Sidebar'ı görünür yap - Desktop ekranda
    if (window.innerWidth > 992) {
        sidebar.style.left = '0';
        sidebar.classList.add('sidebar-open');
    }
    
    // Daraltma durumu varsa kaldır
    localStorage.removeItem('sidebarCollapsed');
    if (sidebar.classList.contains('collapsed')) {
        sidebar.classList.remove('collapsed');
    }
    
    // Sabit menü genişliği için ana içeriği ayarla
    const mainContent = document.querySelector('.main-content');
    if (mainContent && window.innerWidth > 992) {
        mainContent.style.marginLeft = '200px';
        mainContent.style.width = 'calc(100% - 200px)';
        mainContent.classList.add('content-pushed');
    }
    
    // Sayfa yüklendiğinde sidebar durumunu kontrol et
    window.addEventListener('DOMContentLoaded', function() {
        checkScreenSize();
    });
    
    // Ekran boyutu değiştiğinde kontrol et
    window.addEventListener('resize', checkScreenSize);
    
    // Kullanıcı sidebar dışında bir yere tıklarsa sidebar'ı kapat
    document.addEventListener('click', function(event) {
        // Mobil görünümde aktif ise
        if (window.innerWidth <= 992 && sidebar.classList.contains('active')) {
            // Tıklanan eleman sidebar veya sidebar-toggle değilse kapat
            if (!sidebar.contains(event.target) && 
                !event.target.closest('.sidebar-toggle') &&
                !event.target.closest('.sidebar')) {
                sidebar.classList.remove('active');
                if (sidebarOverlay) sidebarOverlay.classList.remove('active');
            }
        }
    });
    
    // Ekran boyutuna göre sidebar görünümünü ayarla
    function checkScreenSize() {
        const isMobile = window.innerWidth <= 992;
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        const sidebarOverlay = document.querySelector('.sidebar-overlay');
        
        if (isMobile) {
            // Mobil görünüm
            sidebar.classList.remove('sidebar-open');
            sidebar.style.left = '-250px';
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');
            if (mainContent) {
                mainContent.style.marginLeft = '0';
                mainContent.style.width = '100%';
                mainContent.classList.remove('content-pushed');
            }
        } else {
            // Masaüstü görünüm - her zaman tam genişlikte
            sidebar.classList.add('sidebar-open');
            sidebar.style.left = '0';
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');
            if (mainContent) {
                mainContent.style.marginLeft = '250px';
                mainContent.style.width = 'calc(100% - 250px)';
                mainContent.classList.add('content-pushed');
            }
        }
    }
    
    // Mobil menü toggle butonu
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
        });
    }
    
    // Overlay tıklama olayı
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', function() {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });
    }
    
    // Dokunma olayları için yardımcı değişkenler
    let touchStartX = 0;
    let touchEndX = 0;
    
    // Dokunma başlangıcı
    document.addEventListener('touchstart', function(e) {
        touchStartX = e.touches[0].clientX;
    }, false);
    
    // Dokunma hareketi
    document.addEventListener('touchmove', function(e) {
        if (!sidebar) return;
        
        touchEndX = e.touches[0].clientX;
        const swipeDistance = touchEndX - touchStartX;
        
        // Sadece mobil görünümde çalış
        if (window.innerWidth <= 992) {
            // Sağdan sola kaydırma (menüyü kapat)
            if (swipeDistance < -70 && sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
                if (sidebarOverlay) sidebarOverlay.classList.remove('active');
            }
            // Soldan sağa kaydırma (menüyü aç)
            else if (swipeDistance > 70 && !sidebar.classList.contains('active')) {
                sidebar.classList.add('active');
                if (sidebarOverlay) sidebarOverlay.classList.add('active');
            }
        }
    }, false);
    
    // Dokunma bitişi
    document.addEventListener('touchend', function() {
        touchStartX = 0;
        touchEndX = 0;
    }, false);
}

// Bildirim yönetimi
function initializeNotifications() {
    const notificationBtn = document.querySelector('.notification-btn');
    const notificationDropdown = document.querySelector('.notification-dropdown');
    const markAllReadBtn = document.querySelector('.mark-all-read');
    
    if (!notificationBtn || !notificationDropdown) return;
    
    notificationBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notificationDropdown.style.display = notificationDropdown.style.display === 'block' ? 'none' : 'block';
    });
    
    // Bildirim dışına tıklandığında dropdown'ı kapat
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.notifications') && notificationDropdown) {
            notificationDropdown.style.display = 'none';
        }
    });
    
    // Tüm bildirimleri okundu olarak işaretle
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', () => {
            document.querySelectorAll('.notification-item.unread').forEach(item => {
                item.classList.remove('unread');
            });
            
            // Bildirim sayısını güncelle
            const badge = document.querySelector('.notification-badge');
            if (badge) {
                badge.textContent = '0';
            }
        });
    }
}

// Sayfa içi linkleri düzenle
function initializeInPageLinks() {
    // "Tümünü Gör" gibi sayfa içi linkler
    const inPageLinks = document.querySelectorAll('a[data-page]');
    
    inPageLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetPage = link.getAttribute('data-page');
            if (targetPage) {
                e.preventDefault();
                // Sayfa içi geçiş yerine doğrudan ilgili HTML sayfasına yönlendir
                window.location.href = `${targetPage}.html`;
            }
        });
    });
}

// Performans grafiği oluştur
function createPerformanceGraph(data) {
    // Performans grafiği için canvas elementi var mı kontrol et
    const performanceGraphElement = document.getElementById('performanceGraph');
    if (!performanceGraphElement) {
        console.log('Performans grafiği için canvas elementi bulunamadı');
        return null;
    }
    
    try {
        const ctx = performanceGraphElement.getContext('2d');
        
        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Net Sayısı',
                    data: data.values,
                    borderColor: getComputedStyle(document.body).getPropertyValue('--primary-color'),
                    tension: 0.4,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: getComputedStyle(document.body).getPropertyValue('--light-border')
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Performans grafiği oluşturulurken hata:', error);
        return null;
    }
}

// Deneme ekle butonu işleme
document.addEventListener('DOMContentLoaded', () => {
    const addExamBtn = document.getElementById('addExamBtn');
    if (addExamBtn) {
        addExamBtn.addEventListener('click', () => {
            // Deneme ekleme modalını göster
            // TODO: Deneme ekleme modalı oluştur
            alert('Deneme ekleme özelliği yakında eklenecek!');
        });
    }
    
    // Görev ekle butonu işleme
    const addTaskBtn = document.getElementById('addTaskBtn');
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', () => {
            // Görev ekleme modalını göster
            // TODO: Görev ekleme modalı oluştur
            alert('Görev ekleme özelliği yakında eklenecek!');
        });
    }
});

// Sınav türü metni alma fonksiyonu (eğer firebase-config.js'de yoksa)
function getExamTypeText(examType) {
    switch(examType) {
        case 'tyt': return 'TYT';
        case 'sayisal': return 'Sayısal';
        case 'sozel': return 'Sözel';
        case 'esitagirlik': return 'Eşit Ağırlık';
        case 'dil': return 'Dil';
        default: return 'TYT';
    }
} 