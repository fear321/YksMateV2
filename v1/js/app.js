// Sayfa yüklendiğinde çalışacak kodlar
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
    
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    document.body.className = `${currentTheme}-theme`;
    themeToggle.innerHTML = `<i class="fas fa-${currentTheme === 'light' ? 'moon' : 'sun'}"></i>`;
    
    themeToggle.addEventListener('click', () => {
        const newTheme = document.body.classList.contains('light-theme') ? 'dark' : 'light';
        document.body.className = `${newTheme}-theme`;
        themeToggle.innerHTML = `<i class="fas fa-${newTheme === 'light' ? 'moon' : 'sun'}"></i>`;
        localStorage.setItem('theme', newTheme);
    });
}

// Sidebar yönetimi
function initializeSidebar() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (!sidebarToggle || !sidebar) return;
    
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });
    
    // Mobil görünümde sidebar dışına tıklandığında sidebar'ı kapat
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 992 && 
            !e.target.closest('.sidebar') && 
            !e.target.closest('#sidebarToggle') && 
            sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
    });
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