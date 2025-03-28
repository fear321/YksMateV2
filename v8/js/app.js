document.addEventListener('DOMContentLoaded', () => {
    console.log("Sayfa yüklendi, uygulama başlatılıyor...");
    
    // Önce localStorage'dan profil fotoğrafını yükle
    const cachedProfileImage = localStorage.getItem('userProfileImage');
    if (cachedProfileImage) {
        console.log("localStorage'dan profil fotoğrafı yükleniyor...");
        updateAvatarsWithImage(cachedProfileImage);
    }
    
    // Sidebar durumunu kontrol et
    if (localStorage.getItem('sidebarWidth') === '70') {
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        
        if (sidebar && mainContent) {
            sidebar.classList.add('sidebar-narrow');
            sidebar.classList.remove('sidebar-open');
            
            // Tema stillerini uygula
            if (typeof applyNarrowSidebarTheme === 'function') {
                applyNarrowSidebarTheme();
            }
            
            mainContent.classList.add('content-pushed-narrow');
            mainContent.classList.remove('content-pushed');
            document.body.classList.add('sidebar-narrow-active');
        }
    }
    
    // Service Worker'ı kaydet (PWA desteği için)
    registerServiceWorker();
    
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

// Service Worker'ı kaydet
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker başarıyla kaydedildi:', registration.scope);
                
                // Push aboneliği için
                subscribeToPushNotifications(registration);
            })
            .catch(error => {
                console.error('Service Worker kaydı başarısız oldu:', error);
            });
    }
}

// Push bildirimlerine abone ol
function subscribeToPushNotifications(registration) {
    const publicVapidKey = 'BLBz4TKo8W9wAbrZTTmgq9u_P9H5xPL-HtP_B-KgKxV9UG0SGASk8nxKzKa7zB8LJJUvdybFYt1lU2KpQKQQEYk';
    
    // Daha önce abone olunmuş mu kontrol et
    registration.pushManager.getSubscription()
        .then(existingSubscription => {
            if (existingSubscription) {
                console.log('Zaten push bildirimlerine abone olunmuş');
                return existingSubscription;
            }
            
            // Yeni abonelik oluştur
            return registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
            });
        })
        .then(subscription => {
            console.log('Push aboneliği başarılı:', subscription);
            
            // Abonelik bilgilerini sunucuya gönder
            // Bu örnekte Firebase kullanıyoruz, gerçek uygulamada kendi sunucunuza göndermeniz gerekir
            const user = firebase.auth().currentUser;
            if (user) {
                firebase.database().ref('users/' + user.uid + '/pushSubscription').set(
                    JSON.stringify(subscription)
                );
            }
        })
        .catch(error => {
            console.error('Push aboneliği başarısız oldu:', error);
            
            if (Notification.permission === 'denied') {
                console.warn('Bildirim izni reddedildi');
            }
        });
}

// Base64 URL'yi Uint8Array'e dönüştür
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// NOT: Otomatik kaydetme işlevleri firebase-config.js dosyasına taşındı
// Aşağıdaki işlevler kaldırıldı:
// - initializeAutoSave()
// - saveUserData()
// - collectUserData()

function initializeApp() {
    console.log("Uygulama bileşenleri başlatılıyor...");
    
    // Önce localStorage'dan profil fotoğrafını yükle
    loadProfileImageFromLocalStorage();
    
    // Tema yöneticisini başlat
    if (typeof themeManager === 'function') {
        themeManager();
    }
    
    // Kullanıcı bilgilerini ekranda göster
    displayUserInfo();
    
    // Font boyutunu başlat
    initializeFontSize();
    
    // Temayı başlat
    initializeTheme();
    
    // Sidebar'ı başlat
    initializeSidebar();
    
    // Bildirim sistemini başlat
    initializeNotifications();
    
    // Sayfa içi linkler
    initializeInPageLinks();
    
    // Çıkış yap butonunu header'a ekle
    addLogoutToHeader();
}

// LocalStorage'dan profil fotoğrafını yükler
function loadProfileImageFromLocalStorage() {
    const cachedProfileImage = localStorage.getItem('userProfileImage');
    if (cachedProfileImage) {
        console.log("localStorage'dan profil fotoğrafı yükleniyor...");
        // Sayfa yüklenir yüklenmez avatarları güncelle
        setTimeout(() => {
            updateAvatarsWithImage(cachedProfileImage);
        }, 100);
    }
}

// Kullanıcı bilgilerini ekranda göster
function displayUserInfo() {
    console.log("Kullanıcı bilgileri yükleniyor...");
    
    // Önce localStorage'dan profil fotoğrafını yükle (eğer varsa)
    const cachedProfileImage = localStorage.getItem('userProfileImage');
    if (cachedProfileImage) {
        // Mevcut avatarları güncelle
        updateAvatarsWithImage(cachedProfileImage);
    }
    
    // Firebase yüklü ise ve kullanıcı giriş yapmışsa
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(function(user) {
            if (user) {
                // Kullanıcı adı elementini bul
                const userNameElements = document.querySelectorAll('#userName');
                
                // Kullanıcı sınav türü elementini bul
                const userExamTypeElements = document.querySelectorAll('#userExamType');
                
                // Avatar elementlerini bul
                const userAvatarElements = document.querySelectorAll('.user-avatar');
                
                // Veritabanından kullanıcı bilgilerini al
                firebase.database().ref('users/' + user.uid).once('value')
                    .then(function(snapshot) {
                        const userData = snapshot.val();
                        if (userData) {
                            // Kullanıcı adını güncelle
                            userNameElements.forEach(function(element) {
                                element.textContent = userData.name || userData.displayName || user.displayName || "Kullanıcı";
                            });
                            
                            // Sınav türünü güncelle
                            userExamTypeElements.forEach(function(element) {
                                const examType = userData.examType || "TYT";
                                element.textContent = examType;
                            });
                            
                            // Profil fotoğrafını güncelle ve localStorage'a kaydet
                            if (userData.profileImage) {
                                localStorage.setItem('userProfileImage', userData.profileImage);
                                updateAvatarsWithImage(userData.profileImage);
                            } else if (user.photoURL) {
                                localStorage.setItem('userProfileImage', user.photoURL);
                                updateAvatarsWithImage(user.photoURL);
                            } else {
                                // Eğer fotoğraf yoksa, varsayılan ikonu kullan
                                localStorage.removeItem('userProfileImage');
                                userAvatarElements.forEach(function(element) {
                                    // Mevcut içeriği temizle
                                    element.innerHTML = '';
                                    
                                    // Varsayılan ikon ekle
                                    const icon = document.createElement('i');
                                    icon.className = 'fas fa-user';
                                    element.appendChild(icon);
                                });
                            }
                        }
                    })
                    .catch(function(error) {
                        console.error("Kullanıcı bilgileri alınırken hata:", error);
                    });
            }
        });
    }
}

// Avatarları belirli bir görselle güncelle
function updateAvatarsWithImage(imageUrl) {
    const userAvatarElements = document.querySelectorAll('.user-avatar');
    
    userAvatarElements.forEach(function(element) {
        // Mevcut içeriği temizle
        element.innerHTML = '';
        
        // Yeni resim ekle
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = "Profil Fotoğrafı";
        img.className = "avatar-image-small";
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";
        img.style.zIndex = "10";
        img.onerror = function() {
            // Resim yüklenemezse varsayılan ikonu göster
            element.innerHTML = '';
            const icon = document.createElement('i');
            icon.className = 'fas fa-user';
            element.appendChild(icon);
        };
        element.appendChild(img);
    });
}

// Yazı boyutu ayarlarını uygula
function initializeFontSize() {
    const appearanceData = JSON.parse(localStorage.getItem('appearanceData')) || {};
    const fontSize = appearanceData.fontSize || localStorage.getItem('fontSize') || 'medium';
    
    // HTML element'ine yazı boyutu özelliğini ekle
    document.documentElement.setAttribute('data-font-size', fontSize);
    console.log("Yazı boyutu uygulandı:", fontSize);
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
        mainContent.style.marginLeft = '230px';
        mainContent.style.width = 'calc(100% - 230px)';
        mainContent.classList.add('content-pushed');
    }
    
    // Sayfa yüklendiğinde sidebar durumunu kontrol et
    window.addEventListener('DOMContentLoaded', function() {
        checkScreenSize();
        checkSidebarPreference();
    });
    
    // Ekran boyutu değiştiğinde kontrol et
    window.addEventListener('resize', function() {
        checkScreenSize();
        
        // 1000px üstü ve altı geçişlerde sidebar durumunu yeniden kontrol et
        const windowWidth = window.innerWidth;
        if (windowWidth > 1000) {
            checkSidebarPreference();
        }
    });
    
    // Ekran boyutuna göre sidebar görünümünü ayarla
    function checkScreenSize() {
        const windowWidth = window.innerWidth;
        const isMobile = windowWidth <= 992;
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        const sidebarOverlay = document.querySelector('.sidebar-overlay');
        
        if (isMobile) {
            // Mobil görünüm
            sidebar.classList.remove('sidebar-open');
            sidebar.classList.remove('sidebar-narrow'); // Mobilde narrow sınıfını kaldır
            sidebar.style.left = '-230px';
            sidebar.style.width = '230px'; // Mobilde her zaman tam genişlik
            
            // Sidebar içeriğini sıfırla
            const userDetails = document.querySelectorAll('.user-details, .sidebar-nav a span');
            userDetails.forEach(el => el.style.display = 'block');
            
            const sidebarNavIcons = document.querySelectorAll('.sidebar-nav a i');
            sidebarNavIcons.forEach(icon => icon.style.marginRight = '10px');
            
            const sidebarNavLinks = document.querySelectorAll('.sidebar-nav a');
            sidebarNavLinks.forEach(link => link.style.justifyContent = 'flex-start');
            
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');
            if (mainContent) {
                mainContent.style.marginLeft = '0';
                mainContent.style.width = '100%';
                mainContent.classList.remove('dimmed');
                mainContent.classList.remove('content-pushed');
                mainContent.classList.remove('content-pushed-narrow');
                document.body.classList.remove('sidebar-narrow-active');
            }
        } else if (windowWidth <= 1000) {
            // Tablet görünüm - 993px-1000px arası
            sidebar.classList.add('sidebar-open');
            sidebar.classList.remove('sidebar-narrow'); // Tabletlerde narrow sınıfını kaldır
            sidebar.style.left = '0';
            sidebar.style.width = '230px';
            
            // Sidebar içeriğini sıfırla
            const userDetails = document.querySelectorAll('.user-details, .sidebar-nav a span');
            userDetails.forEach(el => el.style.display = 'block');
            
            const sidebarNavIcons = document.querySelectorAll('.sidebar-nav a i');
            sidebarNavIcons.forEach(icon => icon.style.marginRight = '10px');
            
            const sidebarNavLinks = document.querySelectorAll('.sidebar-nav a');
            sidebarNavLinks.forEach(link => link.style.justifyContent = 'flex-start');
            
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');
            if (mainContent) {
                mainContent.style.marginLeft = '230px';
                mainContent.style.width = 'calc(100% - 230px)';
                mainContent.classList.remove('dimmed');
                document.body.classList.remove('sidebar-narrow-active');
            }
        } else {
            // 1000px üstü için
            if (sidebar.classList.contains('sidebar-narrow')) {
                // Eğer daraltılmış sidebar ise, tema stillerini uygula
                applyNarrowSidebarTheme();
            }
        }
    }
    
    // Mobil menü toggle butonu
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            const windowWidth = window.innerWidth;
            const isMobile = windowWidth <= 992;
            
            // 1000px üzerinde ekran genişliği varsa
            if (windowWidth > 1000) {
                const mainContent = document.querySelector('.main-content');
                if (sidebar.classList.contains('sidebar-open')) {
                    // Sidebar zaten açık, daralt
                    localStorage.setItem('sidebarWidth', '70');
                    
                    // Sidebar sınıflarını değiştir
                    sidebar.classList.remove('sidebar-open');
                    sidebar.classList.add('sidebar-narrow');
                    
                    // Tüm tema stillerini temizle ve tekrar uygula
                    applyNarrowSidebarTheme();
                    
                    if (mainContent) {
                        mainContent.classList.remove('content-pushed');
                        mainContent.classList.add('content-pushed-narrow');
                        document.body.classList.add('sidebar-narrow-active');
                    }
                } else {
                    // Sidebar kapalı veya daraltılmış, tam genişlikte aç
                    localStorage.setItem('sidebarWidth', '230');
                    
                    // Önce stil özelliklerini temizle
                    sidebar.style.removeProperty('background-color');
                    sidebar.style.removeProperty('border-right');
                    
                    // Sonra sınıfları değiştir
                    sidebar.classList.remove('sidebar-narrow');
                    sidebar.classList.add('sidebar-open');
                    
                    if (mainContent) {
                        mainContent.classList.remove('content-pushed-narrow');
                        mainContent.classList.add('content-pushed');
                        document.body.classList.remove('sidebar-narrow-active');
                    }
                }
            } else {
                // Mevcut mobil davranışı
                sidebar.classList.toggle('active');
                
                // Sadece mobil görünümde overlay'i aktifleştir
                if (isMobile) {
                    if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
                    
                    // Sidebar açık/kapalı durumuna göre sidebarToggle butonunun içeriğini değiştir
                    const toggleIcon = sidebarToggle.querySelector('i');
                    if (toggleIcon) {
                        if (sidebar.classList.contains('active')) {
                            toggleIcon.className = 'fas fa-times';
                        } else {
                            toggleIcon.className = 'fas fa-bars';
                        }
                    }
                    
                    // Ekran boyutuna göre içeriği ayarla
                    const mainContent = document.querySelector('.main-content');
                    if (mainContent) {
                        if (sidebar.classList.contains('active')) {
                            mainContent.classList.add('dimmed');
                        } else {
                            mainContent.classList.remove('dimmed');
                        }
                    }
                }
            }
        });
    }
    
    // Overlay tıklama olayı
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', function() {
            const windowWidth = window.innerWidth;
            
            if (windowWidth <= 1000) {
                // 1000px ve altında sidebar tamamen gizlenir
                sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('active');
                
                // Sidebar toggle butonundaki ikonu güncelle
                const sidebarToggle = document.getElementById('sidebarToggle');
                if (sidebarToggle) {
                    const toggleIcon = sidebarToggle.querySelector('i');
                    if (toggleIcon) {
                        toggleIcon.className = 'fas fa-bars';
                    }
                }
                
                // Main content üzerindeki dimmed efektini kaldır
                const mainContent = document.querySelector('.main-content');
                if (mainContent) {
                    mainContent.classList.remove('dimmed');
                }
            } else {
                // 1000px üstünde sidebar daraltılır
                const mainContent = document.querySelector('.main-content');
                
                // Eğer sidebar zaten narrow değilse, narrow yap
                if (!sidebar.classList.contains('sidebar-narrow')) {
                    localStorage.setItem('sidebarWidth', '70');
                    
                    // Sidebar sınıflarını güncelle
                    sidebar.classList.remove('sidebar-open');
                    sidebar.classList.add('sidebar-narrow');
                    
                    // Tema stillerini uygula
                    applyNarrowSidebarTheme();
                    
                    // Main content sınıflarını güncelle
                    if (mainContent) {
                        mainContent.classList.remove('content-pushed');
                        mainContent.classList.add('content-pushed-narrow');
                        document.body.classList.add('sidebar-narrow-active');
                    }
                    
                    // Overlay'i gizle
                    sidebarOverlay.classList.remove('active');
                }
            }
        });
    }
    
    // Sidebar içindeki linkler için olay dinleyicileri ekle
    const sidebarLinks = sidebar.querySelectorAll('a');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Sadece mobil modda otomatik kapat
            if (window.innerWidth <= 992) {
                sidebar.classList.remove('active');
                if (sidebarOverlay) sidebarOverlay.classList.remove('active');
                
                // Main content üzerindeki dimmed efektini kaldır
                const mainContent = document.querySelector('.main-content');
                if (mainContent) {
                    mainContent.classList.remove('dimmed');
                }
                
                // Toggle butonunun ikonunu güncelle
                const sidebarToggle = document.getElementById('sidebarToggle');
                if (sidebarToggle) {
                    const toggleIcon = sidebarToggle.querySelector('i');
                    if (toggleIcon) {
                        toggleIcon.className = 'fas fa-bars';
                    }
                }
            }
        });
    });
    
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
                
                // Sidebar toggle butonundaki ikonu güncelle
                const sidebarToggle = document.getElementById('sidebarToggle');
                if (sidebarToggle) {
                    const toggleIcon = sidebarToggle.querySelector('i');
                    if (toggleIcon) {
                        toggleIcon.className = 'fas fa-bars';
                    }
                }
                
                // Main content üzerindeki dimmed efektini kaldır
                const mainContent = document.querySelector('.main-content');
                if (mainContent) {
                    mainContent.classList.remove('dimmed');
                }
            }
            // Soldan sağa kaydırma (menüyü aç)
            else if (swipeDistance > 70 && !sidebar.classList.contains('active')) {
                sidebar.classList.add('active');
                if (sidebarOverlay) sidebarOverlay.classList.add('active');
                
                // Sidebar toggle butonundaki ikonu güncelle
                const sidebarToggle = document.getElementById('sidebarToggle');
                if (sidebarToggle) {
                    const toggleIcon = sidebarToggle.querySelector('i');
                    if (toggleIcon) {
                        toggleIcon.className = 'fas fa-times';
                    }
                }
                
                // Main content dimmed efekti ekle
                const mainContent = document.querySelector('.main-content');
                if (mainContent) {
                    mainContent.classList.add('dimmed');
                }
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
        });
    }
    
    // Görev ekle butonu işleme
    const addTaskBtn = document.getElementById('addTaskBtn');
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', () => {
            // Görev ekleme modalını göster
            // TODO: Görev ekleme modalı oluştur
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

// Okunmamış mesaj ve bildirim sistemi
document.addEventListener('DOMContentLoaded', function() {
    console.log("Okunmamış mesaj ve bildirim sistemi başlatılıyor...");
    
    // Firebase bağlantısını kontrol et
    if (typeof firebase === 'undefined') {
        console.error("Firebase tanımlı değil!");
        return;
    }
    
    // Kullanıcı oturum açmış mı kontrol et
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            console.log("Kullanıcı oturum açmış, okunmamış mesaj sayısı takip ediliyor:", user.uid);
            
            // Okunmamış mesaj sayısını takip etmeye başla
            startUnreadMessagesCounter(user.uid);
            
            // Bildirim sistemini başlat
            startNotificationSystem(user.uid);
        }
    });
    
    // Okunmamış mesaj sayısını takip etme
    function startUnreadMessagesCounter(userId) {
        // Sidebar'daki mesajlar menü öğesini bul
        const messagesMenuItem = document.querySelector('.sidebar-nav a[href="messages.html"] i');
        if (!messagesMenuItem) {
            console.warn("Mesajlar menü öğesi bulunamadı");
            return;
        }
        
        // Mesajlar menü öğesinin yanına rozet ekle (eğer yoksa)
        let unreadBadge = messagesMenuItem.nextElementSibling;
        if (!unreadBadge || !unreadBadge.classList.contains('unread-messages-badge')) {
            unreadBadge = document.createElement('span');
            unreadBadge.className = 'unread-messages-badge';
            unreadBadge.style.backgroundColor = '#4a6cf7';
            unreadBadge.style.color = 'white';
            unreadBadge.style.borderRadius = '50%';
            unreadBadge.style.width = '18px';
            unreadBadge.style.height = '18px';
            unreadBadge.style.display = 'inline-flex';
            unreadBadge.style.alignItems = 'center';
            unreadBadge.style.justifyContent = 'center';
            unreadBadge.style.fontSize = '0.7rem';
            unreadBadge.style.marginLeft = '5px';
            unreadBadge.style.position = 'absolute';
            unreadBadge.style.right = '10px';
            unreadBadge.style.top = '50%';
            unreadBadge.style.transform = 'translateY(-50%)';
            unreadBadge.textContent = '0';
            unreadBadge.style.display = 'none'; // Başlangıçta gizli
            
            // Mesajlar menü öğesinin parent elementine ekle
            messagesMenuItem.parentElement.style.position = 'relative';
            messagesMenuItem.parentElement.appendChild(unreadBadge);
        }
        
        // Her saniyede bir okunmamış mesaj sayısını güncelle
        window.unreadMessagesCounter = setInterval(function() {
            updateUnreadMessagesCount(userId, unreadBadge);
        }, 1000);
        
        // Sayfa kapatıldığında zamanlayıcıyı temizle
        window.addEventListener('beforeunload', function() {
            if (window.unreadMessagesCounter) {
                clearInterval(window.unreadMessagesCounter);
            }
        });
    }
    
    // Okunmamış mesaj sayısını güncelleme
    function updateUnreadMessagesCount(userId, badgeElement) {
        // Kullanıcının arkadaşlarını al
        firebase.database().ref('users/' + userId + '/friends').once('value')
            .then((snapshot) => {
                const friends = snapshot.val();
                if (!friends) return;
                
                let totalUnreadCount = 0;
                let promises = [];
                
                // Her bir arkadaş için okunmamış mesaj sayısını hesapla
                Object.keys(friends).forEach(friendId => {
                    const chatId = [userId, friendId].sort().join('_');
                    
                    // Okunmamış mesajları say
                    const promise = firebase.database().ref('messages/' + chatId)
                        .orderByChild('senderId')
                        .equalTo(friendId)
                        .once('value')
                        .then((messagesSnapshot) => {
                            if (messagesSnapshot.exists()) {
                                let unreadCount = 0;
                                
                                messagesSnapshot.forEach((childSnapshot) => {
                                    const message = childSnapshot.val();
                                    if (!message.read) {
                                        unreadCount++;
                                    }
                                });
                                
                                totalUnreadCount += unreadCount;
                            }
                        });
                    
                    promises.push(promise);
                });
                
                // Tüm sorguların tamamlanmasını bekle
                Promise.all(promises).then(() => {
                    // Rozeti güncelle
                    if (totalUnreadCount > 0) {
                        badgeElement.textContent = totalUnreadCount > 99 ? '99+' : totalUnreadCount;
                        badgeElement.style.display = 'inline-flex';
                    } else {
                        badgeElement.style.display = 'none';
                    }
                    
                    // Bildirim sayısını da güncelle
                    updateNotificationBadge(totalUnreadCount);
                });
            })
            .catch(error => {
                console.error("Okunmamış mesaj sayısı hesaplanırken hata:", error);
            });
    }
    
    // Bildirim rozetini güncelleme
    function updateNotificationBadge(unreadCount) {
        const notificationBadge = document.querySelector('.notification-badge');
        if (notificationBadge) {
            if (unreadCount > 0) {
                notificationBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                notificationBadge.style.display = 'inline-flex';
            } else {
                notificationBadge.style.display = 'none';
            }
        }
    }
    
    // Bildirim sistemini başlatma
    function startNotificationSystem(userId) {
        // Bildirim butonunu bul
        const notificationBtn = document.querySelector('.notification-btn');
        if (!notificationBtn) {
            console.warn("Bildirim butonu bulunamadı");
            return;
        }
        
        // Tarayıcı bildirimlerine izin iste
        requestNotificationPermission();
        
        // Bildirim paneli oluştur (eğer yoksa)
        let notificationPanel = document.querySelector('.notification-panel');
        if (!notificationPanel) {
            notificationPanel = document.createElement('div');
            notificationPanel.className = 'notification-panel';
            
            // Bildirim panelini bildirim butonunun parent elementine ekle
            notificationBtn.parentElement.style.position = 'relative';
            notificationBtn.parentElement.appendChild(notificationPanel);
            
            // Bildirim butonuna tıklama olayı ekle
            notificationBtn.addEventListener('click', function() {
                if (notificationPanel.style.display === 'none' || !notificationPanel.style.display) {
                    notificationPanel.style.display = 'block';
                    // Bildirimleri yükle
                    loadNotifications(userId, notificationPanel);
                } else {
                    notificationPanel.style.display = 'none';
                }
            });
            
            // Dışarı tıklandığında bildirim panelini kapat
            document.addEventListener('click', function(event) {
                if (!notificationBtn.contains(event.target) && !notificationPanel.contains(event.target)) {
                    notificationPanel.style.display = 'none';
                }
            });
        }
        
        // Her 30 saniyede bir bildirimleri güncelle (5 saniye yerine)
        window.notificationUpdater = setInterval(function() {
            if (notificationPanel.style.display === 'block') {
                loadNotifications(userId, notificationPanel);
            }
            
            // Yeni mesajları kontrol et ve bildirim gönder
            checkForNewMessages(userId);
        }, 30000); // 5000 -> 30000
        
        // Sayfa kapatıldığında zamanlayıcıyı temizle
        window.addEventListener('beforeunload', function() {
            if (window.notificationUpdater) {
                clearInterval(window.notificationUpdater);
            }
        });
        
        // Son kontrol edilen mesaj zamanını sakla
        window.lastCheckedTime = Date.now();
        
        // Sayfa açıldığında hemen bir kez kontrol et
        setTimeout(() => {
            checkForNewMessages(userId);
        }, 2000);
    }
    
    // Tarayıcı bildirimlerine izin iste
    function requestNotificationPermission() {
        // Bildirim API'si var mı kontrol et
        if (!("Notification" in window)) {
            console.warn("Bu tarayıcı bildirim desteği sunmuyor");
            return Promise.resolve(false);
        }
        
        // İzin durumunu kontrol et
        if (Notification.permission === "granted") {
            console.log("Bildirim izni zaten verilmiş");
            return Promise.resolve(true);
        }
        
        if (Notification.permission !== "denied") {
            return Notification.requestPermission().then(function (permission) {
                if (permission === "granted") {
                    console.log("Bildirim izni verildi");
                    
                    // Service Worker'ı yeniden kaydet (push aboneliği için)
                    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                        navigator.serviceWorker.ready.then(registration => {
                            subscribeToPushNotifications(registration);
                        });
                    }
                    
                    return true;
                } else {
                    console.warn("Bildirim izni reddedildi");
                    return false;
                }
            });
        }
        
        return Promise.resolve(false);
    }
    
    // Yeni mesajları kontrol et ve bildirim gönder
    function checkForNewMessages(userId) {
        // Son kontrol zamanı
        const lastChecked = window.lastCheckedTime || Date.now();
        
        // Bildirimi gönderilmiş mesajların ID'lerini saklamak için
        if (!window.notifiedMessageIds) {
            window.notifiedMessageIds = new Set();
        }
        
        // Kullanıcının arkadaşlarını al
        firebase.database().ref('users/' + userId + '/friends').once('value')
            .then((snapshot) => {
                const friends = snapshot.val();
                if (!friends) return;
                
                let newMessages = {};
                let promises = [];
                
                // Her bir arkadaş için yeni mesajları kontrol et
                Object.keys(friends).forEach(friendId => {
                    const chatId = [userId, friendId].sort().join('_');
                    const friendData = friends[friendId];
                    
                    // Son kontrol zamanından sonra gelen mesajları al
                    const promise = firebase.database().ref('messages/' + chatId)
                        .orderByChild('timestamp')
                        .startAt(lastChecked)
                        .once('value')
                        .then((messagesSnapshot) => {
                            if (messagesSnapshot.exists()) {
                                messagesSnapshot.forEach((childSnapshot) => {
                                    const messageId = childSnapshot.key;
                                    const message = childSnapshot.val();
                                    
                                    // Sadece arkadaştan gelen ve daha önce bildirim gönderilmemiş mesajları kontrol et
                                    if (message.senderId === friendId && !window.notifiedMessageIds.has(messageId)) {
                                        // Mesajı deşifre et
                                        let messageContent = message.content;
                                        if (message.type === 'encrypted') {
                                            try {
                                                messageContent = atob(message.content); // Base64 decoding
                                            } catch (error) {
                                                console.error("Mesaj deşifre edilirken hata:", error);
                                                messageContent = "Mesaj okunamadı";
                                            }
                                        }
                                        
                                        // Arkadaş için mesaj listesi oluştur
                                        if (!newMessages[friendId]) {
                                            newMessages[friendId] = {
                                                name: friendData.name || 'İsimsiz Kullanıcı',
                                                messages: []
                                            };
                                        }
                                        
                                        // Mesajı listeye ekle
                                        newMessages[friendId].messages.push({
                                            id: messageId,
                                            content: messageContent,
                                            timestamp: message.timestamp
                                        });
                                        
                                        // Bildirimi gönderilmiş olarak işaretle
                                        window.notifiedMessageIds.add(messageId);
                                    }
                                });
                            }
                        });
                    
                    promises.push(promise);
                });
                
                // Tüm sorguların tamamlanmasını bekle
                Promise.all(promises).then(() => {
                    // Yeni mesaj varsa bildirim gönder
                    Object.keys(newMessages).forEach(friendId => {
                        const friend = newMessages[friendId];
                        if (friend.messages.length > 0) {
                            // Mesajları zamana göre sırala (en yeniler üstte)
                            friend.messages.sort((a, b) => b.timestamp - a.timestamp);
                            
                            // Son 3 mesajı al
                            const recentMessages = friend.messages.slice(0, 3);
                            
                            // Bildirim içeriğini oluştur
                            let notificationContent = '';
                            if (recentMessages.length === 1) {
                                notificationContent = recentMessages[0].content;
                            } else {
                                notificationContent = `${recentMessages.length} yeni mesaj: "${recentMessages[0].content}" ve diğerleri`;
                            }
                            
                            // Tarayıcı bildirimi gönder
                            sendBrowserNotification(friend.name, notificationContent, friendId);
                        }
                    });
                    
                    // Son kontrol zamanını güncelle
                    window.lastCheckedTime = Date.now();
                    
                    // Bildirim gönderilmiş mesaj ID'lerini sınırla (en son 100 mesajı tut)
                    if (window.notifiedMessageIds.size > 100) {
                        const idsArray = Array.from(window.notifiedMessageIds);
                        window.notifiedMessageIds = new Set(idsArray.slice(idsArray.length - 100));
                    }
                });
            })
            .catch(error => {
                console.error("Yeni mesajlar kontrol edilirken hata:", error);
            });
    }
    
    // Tarayıcı bildirimi gönder
    function sendBrowserNotification(title, message, friendId) {
        // Bildirim izni kontrol et
        if (Notification.permission === "granted") {
            // Service Worker aktif mi kontrol et
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                // Service Worker üzerinden bildirim gönder
                navigator.serviceWorker.ready.then(registration => {
                    // Bildirim için benzersiz bir tag oluştur
                    const notificationTag = `message-${friendId}-${Date.now()}`;
                    
                    const notificationOptions = {
                        body: message,
                        icon: '/assets/images/logo(192).png',
                        badge: '/assets/images/logo(192).png',
                        vibrate: [100, 50, 100, 50, 100],
                        data: {
                            url: `/messages.html?friend=${friendId}`,
                            timestamp: Date.now(),
                            senderId: friendId
                        },
                        actions: [
                            {
                                action: 'open',
                                title: 'Görüntüle'
                            },
                            {
                                action: 'close',
                                title: 'Kapat'
                            }
                        ],
                        tag: notificationTag,
                        renotify: false
                    };
                    
                    registration.showNotification(title, notificationOptions);
                });
            } else {
                // Fallback: Tarayıcı bildirimi
                const notification = new Notification(title, {
                    body: message,
                    icon: '/assets/images/logo(192).png',
                    tag: `message-${friendId}-${Date.now()}`
                });
                
                // Bildirime tıklandığında mesaj sayfasına yönlendir
                notification.onclick = function() {
                    window.focus();
                    window.location.href = `messages.html?friend=${friendId}`;
                };
            }
        } else if (Notification.permission !== "denied") {
            // İzin yoksa, izin iste
            requestNotificationPermission().then(granted => {
                if (granted) {
                    // İzin verildiyse bildirimi gönder
                    sendBrowserNotification(title, message, friendId);
                }
            });
        }
    }
    
    // Bildirimleri yükleme
    function loadNotifications(userId, panelElement) {
        // Kullanıcının arkadaşlarını al
        firebase.database().ref('users/' + userId + '/friends').once('value')
            .then((snapshot) => {
                const friends = snapshot.val();
                if (!friends) {
                    panelElement.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">Henüz bildirim bulunmuyor.</div>';
                    return;
                }
                
                let friendNotifications = {};
                let promises = [];
                
                // Her bir arkadaş için okunmamış mesajları al
                Object.keys(friends).forEach(friendId => {
                    const chatId = [userId, friendId].sort().join('_');
                    const friendData = friends[friendId];
                    
                    // Okunmamış mesajları al
                    const promise = firebase.database().ref('messages/' + chatId)
                        .orderByChild('senderId')
                        .equalTo(friendId)
                        .once('value')
                        .then((messagesSnapshot) => {
                            if (messagesSnapshot.exists()) {
                                let unreadMessages = [];
                                
                                messagesSnapshot.forEach((childSnapshot) => {
                                    const message = childSnapshot.val();
                                    if (!message.read) {
                                        // Mesajı deşifre et
                                        let messageContent = message.content;
                                        if (message.type === 'encrypted') {
                                            try {
                                                messageContent = atob(message.content); // Base64 decoding
                                            } catch (error) {
                                                console.error("Mesaj deşifre edilirken hata:", error);
                                                messageContent = "Mesaj okunamadı";
                                            }
                                        }
                                        
                                        // Okunmamış mesajı listeye ekle
                                        unreadMessages.push({
                                            content: messageContent,
                                            timestamp: message.timestamp
                                        });
                                    }
                                });
                                
                                // Eğer okunmamış mesaj varsa, arkadaş için bildirim oluştur
                                if (unreadMessages.length > 0) {
                                    // Mesajları zamana göre sırala (en yeniler üstte)
                                    unreadMessages.sort((a, b) => b.timestamp - a.timestamp);
                                    
                                    // Arkadaş için bildirim nesnesini oluştur
                                    friendNotifications[friendId] = {
                                        friendId: friendId,
                                        friendName: friendData.name || 'İsimsiz Kullanıcı',
                                        messages: unreadMessages,
                                        latestTimestamp: unreadMessages[0].timestamp
                                    };
                                }
                            }
                        });
                    
                    promises.push(promise);
                });
                
                // Tüm sorguların tamamlanmasını bekle
                Promise.all(promises).then(() => {
                    // Bildirimleri zamana göre sırala (en yeniler üstte)
                    const sortedNotifications = Object.values(friendNotifications).sort((a, b) => b.latestTimestamp - a.latestTimestamp);
                    
                    // Bildirim panelini güncelle
                    if (sortedNotifications.length === 0) {
                        panelElement.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">Henüz bildirim bulunmuyor.</div>';
                    } else {
                        let notificationHTML = '<div class="notification-panel-header"><h4>Bildirimler</h4></div>';
                        
                        sortedNotifications.forEach(notification => {
                            // Son 3 mesajı al
                            const recentMessages = notification.messages.slice(0, 3);
                            
                            // Mesaj içeriğini oluştur
                            let messageContent = '';
                            if (recentMessages.length === 1) {
                                messageContent = recentMessages[0].content;
                            } else {
                                messageContent = `${recentMessages[0].content} <span class="notification-count">+${recentMessages.length - 1} mesaj daha</span>`;
                            }
                            
                            notificationHTML += `
                                <div class="notification-item" onclick="window.location.href='messages.html?friend=${notification.friendId}'">
                                    <div class="notification-item-name">${notification.friendName}</div>
                                    <div class="notification-item-message">${messageContent}</div>
                                    <div class="notification-item-time">${formatTimestamp(notification.latestTimestamp)}</div>
                                </div>
                            `;
                        });
                        
                        notificationHTML += `
                            <div class="notification-panel-footer">
                                <a href="messages.html">Tüm mesajları görüntüle</a>
                            </div>
                        `;
                        
                        panelElement.innerHTML = notificationHTML;
                    }
                });
            })
            .catch(error => {
                console.error("Bildirimler yüklenirken hata:", error);
                panelElement.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">Bildirimler yüklenirken bir hata oluştu.</div>';
            });
    }
    
    // Zaman damgasını formatlama
    function formatTimestamp(timestamp) {
        const now = new Date();
        const date = new Date(timestamp);
        
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        
        if (diffSec < 60) {
            return 'Az önce';
        } else if (diffMin < 60) {
            return `${diffMin} dakika önce`;
        } else if (diffHour < 24) {
            return `${diffHour} saat önce`;
        } else if (diffDay < 7) {
            return `${diffDay} gün önce`;
        } else {
            return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
        }
    }
});

// Header'a çıkış yap butonu ekleme
function addLogoutToHeader() {
    // Sadece content-header içindeki header-actions elementini bul
    const contentHeaderActions = document.querySelectorAll('.content-header .header-actions');
    
    if (contentHeaderActions.length > 0) {
        contentHeaderActions.forEach(headerActions => {
            // Zaten bir logout butonu var mı kontrol et
            if (headerActions.querySelector('.header-logout-btn')) {
                return;
            }
            
            // Logout butonu oluştur
            const logoutBtn = document.createElement('button');
            logoutBtn.className = 'header-logout-btn';
            logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i>';
            logoutBtn.title = 'Çıkış Yap';
            
            // Çıkış yapma olayını ekle
            logoutBtn.addEventListener('click', () => {
                // Firebase yüklenmişse
                if (typeof firebase !== 'undefined' && firebase.auth) {
                    firebase.auth().signOut()
                        .then(() => {
                            console.log('Başarıyla çıkış yapıldı');
                            // Giriş sayfasına yönlendir
                            window.location.href = 'login.html';
                        })
                        .catch((error) => {
                            console.error('Çıkış yapılırken hata:', error);
                            alert('Çıkış yapılırken bir hata oluştu.');
                        });
                } else {
                    console.error('Firebase yüklenemedi');
                    alert('Sistem yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.');
                }
            });
            
            // Butonun yerleştirilmesi
            headerActions.appendChild(logoutBtn);
        });
    } else {
        console.warn('Content-header içinde header-actions elementi bulunamadı');
    }
    
    // Sidebar'dan ve diğer header-actions'lardan çıkış butonlarını kaldır (eğer varsa)
    // İlk olarak sidebar'daki çıkış bağlantılarını kaldır
    const sidebarLogoutButtons = document.querySelectorAll('.sidebar-nav a[href="login.html"], .sidebar-nav a[href="#logout"]');
    sidebarLogoutButtons.forEach(button => {
        if (button && button.closest('li')) {
            button.closest('li').remove();
        }
    });
    
    // Content-header dışındaki header-actions içindeki çıkış butonlarını kaldır
    const otherHeaderLogoutButtons = document.querySelectorAll('.header-actions:not(.content-header .header-actions) .header-logout-btn');
    otherHeaderLogoutButtons.forEach(button => {
        button.remove();
    });
}

// Sidebar durumunu kontrol et
function checkSidebarPreference() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (window.innerWidth > 1000 && sidebar) {
        const sidebarWidth = localStorage.getItem('sidebarWidth');
        
        if (sidebarWidth === '70') {
            // Daraltılmış sidebar
            sidebar.classList.remove('sidebar-open');
            sidebar.classList.add('sidebar-narrow');
            
            // Tüm tema stillerini temizle ve tekrar uygula
            applyNarrowSidebarTheme();
            
            if (mainContent) {
                mainContent.classList.remove('content-pushed');
                mainContent.classList.add('content-pushed-narrow');
                document.body.classList.add('sidebar-narrow-active');
            }
            
            // Profil fotoğrafını yükle
            const cachedProfileImage = localStorage.getItem('userProfileImage');
            if (cachedProfileImage) {
                updateAvatarsWithImage(cachedProfileImage);
            }
        } else {
            // Tam genişlikte sidebar
            
            // Önce stil özelliklerini temizle
            sidebar.style.removeProperty('background-color');
            sidebar.style.removeProperty('border-right');
            
            // Sonra sınıfları değiştir
            sidebar.classList.remove('sidebar-narrow');
            sidebar.classList.add('sidebar-open');
            
            if (mainContent) {
                mainContent.classList.remove('content-pushed-narrow');
                mainContent.classList.add('content-pushed');
                document.body.classList.remove('sidebar-narrow-active');
            }
            
            // Profil fotoğrafını yükle
            const cachedProfileImage = localStorage.getItem('userProfileImage');
            if (cachedProfileImage) {
                updateAvatarsWithImage(cachedProfileImage);
            }
        }
    }
}

// Narrow sidebar için tema stillerini uygula
function applyNarrowSidebarTheme() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    
    // Önce tüm stilleri temizle
    sidebar.style.removeProperty('background-color');
    sidebar.style.removeProperty('border-right');
    
    // Tema sınıflarını kontrol et
    const isDarkTheme = document.body.classList.contains('dark-theme');
    const isPurpleTheme = document.body.classList.contains('purple-theme'); 
    const isBlueTheme = document.body.classList.contains('blue-theme');
    const isGreenTheme = document.body.classList.contains('green-theme');
    
    // Tema değişkenine göre stil uygula
    if (isDarkTheme) {
        sidebar.style.setProperty('background-color', 'var(--dark-card-bg)', 'important');
        sidebar.style.setProperty('border-right', '1px solid var(--dark-border)', 'important');
    } else if (isPurpleTheme) {
        sidebar.style.setProperty('background-color', 'var(--purple-card-bg)', 'important');
        sidebar.style.setProperty('border-right', '1px solid var(--purple-border)', 'important');
    } else if (isBlueTheme) {
        sidebar.style.setProperty('background-color', 'var(--blue-card-bg)', 'important');
        sidebar.style.setProperty('border-right', '1px solid var(--blue-border)', 'important');
    } else if (isGreenTheme) {
        sidebar.style.setProperty('background-color', 'var(--green-card-bg)', 'important');
        sidebar.style.setProperty('border-right', '1px solid var(--green-border)', 'important');
    } else {
        // Varsayılan light tema
        sidebar.style.setProperty('background-color', 'var(--light-card-bg)', 'important');
        sidebar.style.setProperty('border-right', '1px solid var(--light-border)', 'important');
    }
} 