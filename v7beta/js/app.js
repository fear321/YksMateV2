document.addEventListener('DOMContentLoaded', () => {
    console.log("Sayfa yüklendi, uygulama başlatılıyor...");
    
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