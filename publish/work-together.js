// Birlikte Çalışma Sayfası JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Firebase referanslarını oluştur
    const auth = firebase.auth();
    const database = firebase.database();
    
    // Referanslar
    const roomsRef = database.ref('rooms');
    const activeRoomsRef = database.ref('rooms/active_workrooms');
    const userPresenceRef = database.ref('rooms/user_presence');
    
    // DOM Elementleri
    const createRoomForm = document.getElementById('createRoomForm');
    const roomNameInput = document.getElementById('roomName');
    const roomModeSelect = document.getElementById('roomMode');
    const examDurationInput = document.getElementById('examDuration');
    const roomVisibilitySelect = document.getElementById('roomVisibility');
    const activeRoomsContainer = document.getElementById('activeRooms');
    const workTogetherContainer = document.getElementById('workTogetherContainer');
    const createRoomContainer = document.getElementById('createRoomContainer');
    const roomListContainer = document.getElementById('roomListContainer');
    const roomTitleElement = document.getElementById('roomTitle');
    const leaveRoomBtn = document.getElementById('leaveRoomBtn');
    const timerDisplay = document.getElementById('timerDisplay');
    const startTimerBtn = document.getElementById('startTimerBtn');
    const resetTimerBtn = document.getElementById('resetTimerBtn');
    const usersListContainer = document.getElementById('usersList');
    const userCountElement = document.getElementById('userCount');
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');
    const chatMessagesContainer = document.getElementById('chatMessages');
    
    // Kullanıcı ve çalışma odası bilgileri
    let currentUser = null;
    let currentUserName = null; // Kullanıcı adı için
    let currentRoom = null;
    let timerInterval = null;
    let timerRunning = false;
    let timerSeconds = 1500; // 25 dakika (Pomodoro varsayılan)
    let syncTimerRef = null;
    let participantsListener = null; // Katılımcı değişikliklerini dinlemek için
    
    // Kullanıcı oturum durumunu kontrol et
    auth.onAuthStateChanged(function(user) {
        if (user) {
            currentUser = user;
            
            // Dashboard konteynerini görünür yap
            const dashboardContainer = document.getElementById('dashboardContainer');
            if (dashboardContainer) {
                dashboardContainer.style.display = "flex";
            }
            
            // Aktif odaları listele
            loadActiveRooms();
            
            // Kullanıcı aktif oturumunu kontrol et - localStorage ve Firebase'i birlikte
            checkForActiveUserSession();
            
            // Bildirimleri kontrol et
            checkForNotifications();
        } else {
            // Giriş sayfasına yönlendir
            window.location.href = 'login.html';
        }
    });
    
    // Form submit olayı
    createRoomForm.addEventListener('submit', function(e) {
        e.preventDefault();
        createNewRoom();
    });
    
    // Odadan ayrılma butonu
    leaveRoomBtn.addEventListener('click', function() {
        leaveRoom();
    });
    
    // Zamanlayıcı kontrolleri
    startTimerBtn.addEventListener('click', function() {
        toggleTimer();
    });
    
    resetTimerBtn.addEventListener('click', function() {
        resetTimer();
    });
    
    // Mesaj gönderme
    chatSendBtn.addEventListener('click', function() {
        sendMessage();
    });
    
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Aktif odaları listele
    function loadActiveRooms() {
        console.log("loadActiveRooms fonksiyonu çağrıldı");
        
        // Artık sadece active_workrooms düğümünü dinle
        activeRoomsRef.on('value', function(snapshot) {
            console.log("active_workrooms düğümünden odalar alındı:", snapshot.val());
            
            // Odaları temizle
            activeRoomsContainer.innerHTML = '';
            
            if (!snapshot.exists()) {
                console.log("Aktif oda bulunamadı");
                activeRoomsContainer.innerHTML = '<p class="no-rooms">Aktif oda bulunamadı. Yeni bir oda oluşturabilirsiniz.</p>';
                return;
            }
            
            const rooms = snapshot.val();
            let roomCount = 0;
            
            for (let roomId in rooms) {
                const room = rooms[roomId];
                
                // Geçersiz oda adı kontrolü
                if (!room || !room.name || room.name === 'undefined' || typeof room.name === 'undefined') {
                    console.log("Geçersiz oda adı, gösterilmiyor:", roomId);
                    continue;
                }
                
                // Katılımcı sayısını hesapla
                let participants = room.participants || {};
                let activeParticipants = 0;
                
                for (let userId in participants) {
                    if (participants[userId].status !== 'left') {
                        activeParticipants++;
                    }
                }
                
                // Katılımcısı olmayan odaları listeden çıkar
                if (activeParticipants === 0) {
                    console.log("Aktif katılımcısı olmayan oda, gösterilmiyor:", roomId);
                    continue;
                }
                
                // Maksimum katılımcı sayısı
                const maxParticipants = room.maxParticipants || 10;
                
                // Oda HTML'ini oluştur
                const roomHTML = `
                    <div class="room-card">
                        <div class="room-info">
                            <h3 class="room-name">${room.name || 'İsimsiz Oda'}</h3>
                            <p class="room-creator">
                                <i class="fas fa-crown"></i> ${room.ownerName || 'Bilinmeyen'}
                            </p>
                            <p class="room-details">
                                <span class="mode">${room.mode || 'Standart'} Mod</span>
                                <span class="participant-count">
                                    <i class="fas fa-users"></i> ${activeParticipants}/${maxParticipants}
                                </span>
                            </p>
                        </div>
                        <div class="room-actions">
                            <button class="join-room-btn" data-room-id="${roomId}">Katıl</button>
                        </div>
                    </div>
                `;
                
                // Odayı listeye ekle
                activeRoomsContainer.innerHTML += roomHTML;
                roomCount++;
            }
            
            console.log(`${roomCount} adet oda listelendi`);
            
            // Oda bulunamadıysa mesaj göster
            if (roomCount === 0) {
                activeRoomsContainer.innerHTML = '<p class="no-rooms">Aktif oda bulunamadı. Yeni bir oda oluşturabilirsiniz.</p>';
            }
            
            // Katıl butonlarına event listener ekle
            document.querySelectorAll('.join-room-btn').forEach(function(button) {
                button.addEventListener('click', function() {
                    const roomId = this.getAttribute('data-room-id');
                    joinRoom(roomId);
                });
            });
        });
    }
    
    // Yeni oda oluştur
    function createNewRoom() {
        console.log("createNewRoom fonksiyonu çağrıldı");
        
        let roomName = roomNameInput.value.trim();
        let roomMode = roomModeSelect.value;
        let roomVisibility = roomVisibilitySelect.value;
        
        console.log("Oda bilgileri:", { roomName, roomMode, roomVisibility });
        
        if (!roomName) {
            alert('Lütfen bir oda adı girin.');
            return;
        }
        
        // Kimlik doğrulama kontrolü
        if (!firebase.auth().currentUser) {
            alert('Oturum açık değil. Lütfen giriş yapın ve tekrar deneyin.');
            return;
        }
        
        // Önce kullanıcı bilgilerini doğrudan veritabanından al
        database.ref(`users/${currentUser.uid}`).once('value')
            .then(function(snapshot) {
                let userName = 'İsimsiz Kullanıcı';
                
                // Kullanıcı adını doğrudan users/[uid]/name yolundan al (user-name-sync.js ile aynı mantıkta)
                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    if (userData && userData.name) {
                        userName = userData.name;
                        console.log("Kullanıcı adı doğrudan veritabanından alındı:", userName);
                    } else {
                        console.log("Veritabanında name özelliği bulunamadı, varsayılan isim kullanılacak");
                    }
                } else {
                    console.log("Kullanıcı verisi bulunamadı, varsayılan isim kullanılacak");
                }
                
                let roomData = {
                    name: roomName,
                    mode: roomMode,
                    visibility: roomVisibility,
                    ownerId: currentUser.uid,
                    ownerName: userName, // Veritabanından alınan kullanıcı adını kullan
                    createdAt: firebase.database.ServerValue.TIMESTAMP,
                    participants: {},
                    timer: {
                        running: false,
                        seconds: roomMode === 'pomodoro' ? 1500 : (roomMode === 'exam' ? (parseInt(examDurationInput.value) || 135) * 60 : 0),
                        startTime: null,
                        lastUpdate: firebase.database.ServerValue.TIMESTAMP
                    }
                };
                
                console.log("Oluşturulacak oda verisi:", roomData);
                
                // Sınav modu için süre ekle
                if (roomMode === 'exam') {
                    roomData.examDuration = parseInt(examDurationInput.value) || 135;
                }
                
                // Yeni bir oda referansı oluştur (sadece active_workrooms altına ekle)
                const newRoomRef = activeRoomsRef.push();
                const newRoomId = newRoomRef.key;
                console.log("Yeni oda ID'si oluşturuldu:", newRoomId);
                
                // Katılımcı olarak kullanıcıyı ekle
                roomData.participants[currentUser.uid] = {
                    name: userName, // Veritabanından alınan kullanıcı adını burada da kullan
                    joined: firebase.database.ServerValue.TIMESTAMP,
                    status: 'active'
                };
                
                // Oda verilerini doğrudan active_workrooms altına kaydet
                console.log("Oda verileri active_workrooms altına kaydediliyor...");
                newRoomRef.set(roomData)
                    .then(function() {
                        console.log("Oda active_workrooms altına kaydedildi");
                        
                        // Oda oluşturuldu bildirimi göster
                        showNotification('success', 'Oda Oluşturuldu!', `"${roomName}" odası başarıyla oluşturuldu.`);
                        
                        // Formu sıfırla
                        roomNameInput.value = '';
                        if (roomMode === 'exam') {
                            examDurationInput.value = '135';
                        }
                        
                        // Odaya katıl
                        joinRoom(newRoomId);
                    })
                    .catch(function(error) {
                        console.error("Oda oluşturma hatası: ", error);
                        alert("Oda oluşturulurken bir hata oluştu: " + error.message);
                    });
            })
            .catch(function(error) {
                console.error("Kullanıcı profili alınırken hata:", error);
                alert("Kullanıcı profili alınırken bir hata oluştu: " + error.message);
            });
    }
    
    // Bildirim göster
    function showNotification(type, title, message) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        notification.innerHTML = `
            <div class="notification-header">
                <h3>${title}</h3>
                <button class="notification-close"><i class="fas fa-times"></i></button>
            </div>
            <div class="notification-content">
                    <p>${message}</p>
            </div>
        `;
        
        // Notification container kontrol et veya oluştur
        let container = document.querySelector('.notification-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
        
        // Bildirim ekle
        container.appendChild(notification);
        
        // Kapat butonu
        notification.querySelector('.notification-close').addEventListener('click', function() {
            notification.classList.add('notification-closing');
            setTimeout(() => {
                notification.remove();
            }, 300);
        });
        
        // 5 saniye sonra otomatik kapat
        setTimeout(() => {
            if (document.contains(notification)) {
                notification.classList.add('notification-closing');
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }
        }, 5000);
    }
    
    // Aksiyon butonlu bildirim göster
    function showNotificationWithAction(type, title, message, actionText, actionCallback, rejectText, rejectCallback, uniqueId) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        // Benzersiz ID varsa bildirime ekle
        if (uniqueId) {
            notification.dataset.notificationId = uniqueId;
        }
        
        // İkinci aksiyon butonu var mı kontrol et
        const hasSecondAction = rejectText && typeof rejectCallback === 'function';
        
        notification.innerHTML = `
            <div class="notification-header">
                <h3>${title}</h3>
                <button class="notification-close"><i class="fas fa-times"></i></button>
            </div>
            <div class="notification-content">
                <p>${message}</p>
            </div>
            <div class="notification-actions">
                ${hasSecondAction ? `<button class="btn-reject notification-reject">${rejectText}</button>` : ''}
                <button class="btn-primary notification-action">${actionText}</button>
            </div>
        `;
        
        // Notification container kontrol et veya oluştur
        let container = document.querySelector('.notification-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notification-container';
            document.body.appendChild(container);
            
            // Bildirim stillerini ekle (konteyner oluşturulduğunda)
            applyNotificationStyles();
        }
        
        // Mevcut bildirim varsa kaldır (aynı ID)
        if (uniqueId) {
            const existingNotification = document.querySelector(`.notification[data-notification-id="${uniqueId}"]`);
            if (existingNotification) {
                existingNotification.remove();
            }
        }
        
        // Bildirim ekle
        container.prepend(notification); // Yeni bildirimi en üste ekle
        
        // Kapat butonu
        notification.querySelector('.notification-close').addEventListener('click', function() {
            notification.classList.add('notification-closing');
            setTimeout(() => {
                notification.remove();
            }, 300);
        });
        
        // Ana aksiyon butonu
        notification.querySelector('.notification-action').addEventListener('click', function() {
            // Aksiyon geri çağırma fonksiyonunu çalıştır
            if (typeof actionCallback === 'function') {
                actionCallback();
            }
            
            // Bildirimi kapat
            notification.classList.add('notification-closing');
            setTimeout(() => {
                notification.remove();
            }, 300);
        });
        
        // İkinci aksiyon butonu (varsa)
        if (hasSecondAction) {
            notification.querySelector('.notification-reject').addEventListener('click', function() {
                // Reddet geri çağırma fonksiyonunu çalıştır
                rejectCallback();
                
                // Bildirimi kapat
                notification.classList.add('notification-closing');
                setTimeout(() => {
                    notification.remove();
                }, 300);
            });
        }
        
        // 15 saniye sonra otomatik kapat (aksiyonlu bildirimlerde daha uzun süre)
        setTimeout(() => {
            if (document.contains(notification)) {
                notification.classList.add('notification-closing');
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }
        }, 15000);
        
        // Ses çal
        try {
            const audio = new Audio('/assets/sounds/notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(e => console.log("Bildirim sesi çalınamadı:", e));
        } catch (error) {
            console.log("Bildirim sesi çalınamadı:", error);
        }
        
        return notification;
    }
    
    // Odaya katıl
    function joinRoom(roomId) {
        console.log("joinRoom fonksiyonu çağrıldı, roomId:", roomId);
        
        // Doğrudan active_workrooms altında odayı ara
        activeRoomsRef.child(roomId).once('value', function(snapshot) {
            console.log("Active room snapshot:", snapshot.val());
            
            if (!snapshot.exists()) {
                alert("Bu oda artık mevcut değil.");
                return;
            }
            
            processRoomJoin(roomId, snapshot.val());
        });
    }
    
    // Odaya katılım işlemini gerçekleştir
    function processRoomJoin(roomId, room) {
        currentRoom = {
            id: roomId,
            ...room
        };
        
        // Odayı localStorage'a kaydet
        saveRoomSession(roomId, room.name);
        
        // Kullanıcı adını veritabanından al ve sonra katılımcı olarak ekle
        database.ref(`users/${currentUser.uid}`).once('value')
            .then(function(snapshot) {
                let userName = 'İsimsiz Kullanıcı';
                
                // Kullanıcı adını doğrudan users/[uid]/name yolundan al (user-name-sync.js ile aynı mantıkta)
                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    if (userData && userData.name) {
                        userName = userData.name;
                        console.log("Kullanıcı adı doğrudan veritabanından alındı:", userName);
                        
                        // Global değişkene ata
                        currentUserName = userName;
                    } else {
                        console.log("Veritabanında name özelliği bulunamadı, varsayılan isim kullanılacak");
                    }
                } else {
                    console.log("Kullanıcı verisi bulunamadı, varsayılan isim kullanılacak");
                }
                
                // Katılımcı olarak ekle
                let participantData = {
                    name: userName, // Veritabanından alınan kullanıcı adı
                    joined: firebase.database.ServerValue.TIMESTAMP,
                    status: 'active'
                };
                
                console.log("Kullanıcı odaya katılımcı olarak ekleniyor");
                
                // Sadece activeRoomsRef'te katılımcıyı güncelle
                activeRoomsRef.child(`${roomId}/participants/${currentUser.uid}`).set(participantData)
                    .then(function() {
                        console.log("Kullanıcı odaya eklendi");
                        
                        // Kullanıcı varlığı izleme
                        setupPresenceTracking(roomId);
                        
                        // Oda arayüzünü göster
                        showRoomInterface(room);
                        
                        // Katılımcıları dinle
                        listenForParticipants(roomId);
                        
                        // Mesajları dinle
                        listenForMessages(roomId);
                        
                        // Zamanlayıcıyı ayarla
                        setupTimer(room.mode, room.examDuration);
                        
                        // Zamanlayıcı senkronizasyonunu başlat (eğer timer özelliği varsa)
                        if (room.timer) {
                            setupTimerSync(roomId);
                        }
                        
                        // Odaya katılım bildirimi göster
                        showNotification('success', 'Odaya Katıldınız', `"${room.name}" odasına başarıyla katıldınız.`);
                    })
                    .catch(function(error) {
                        console.error("Odaya katılma hatası: ", error);
                        alert("Odaya katılırken bir hata oluştu: " + error.message);
                        clearRoomSession(); // Hata durumunda oturum bilgisini temizle
                    });
            })
            .catch(function(error) {
                console.error("Kullanıcı profili alınırken hata:", error);
                alert("Kullanıcı profili alınırken bir hata oluştu: " + error.message);
            });
    }
    
    // Kullanıcı varlığı izleme
    function setupPresenceTracking(roomId) {
        console.log("setupPresenceTracking fonksiyonu çağrıldı, roomId:", roomId);
        
        // Firebase presence (varlık) sistemini kullan
        const userStatusDatabaseRef = database.ref(`rooms/user_presence/${currentUser.uid}`);
        const roomUserRef = activeRoomsRef.child(`${roomId}/participants/${currentUser.uid}`);
        
        // İstemci (client) durumunu takip eden referans
        const isOfflineForDatabase = {
            status: 'offline',
            room_id: null,
            last_seen: firebase.database.ServerValue.TIMESTAMP,
        };
        
        const isOnlineForDatabase = {
            status: 'online',
            room_id: roomId,
            last_seen: firebase.database.ServerValue.TIMESTAMP,
        };
        
        // Bağlantı durumu referansı
        const connectedRef = firebase.database().ref('.info/connected');
        
        connectedRef.on('value', function(snapshot) {
            console.log("Bağlantı durumu değişti:", snapshot.val());
            
            if (snapshot.val() === false) {
                return;
            }
            
            // Önce kullanıcının odada olduğunu güncelle
            roomUserRef.update({
                status: 'active',
                last_active: firebase.database.ServerValue.TIMESTAMP
            });
            
            // Kullanıcı bağlantısı kesildiğinde sadece odadan çıkar
            roomUserRef.onDisconnect().update({
                status: 'left',
                left_at: firebase.database.ServerValue.TIMESTAMP
            });
            
            // Kullanıcı durumunu aktif olarak güncelle
            userStatusDatabaseRef.set(isOnlineForDatabase);
            
            // Bağlantı kesildiğinde varlık bilgisini güncelle
            userStatusDatabaseRef.onDisconnect().update(isOfflineForDatabase);
            
            // Odada kullanıcı kalmadığında odayı temizlemeyi ayarla
            activeRoomsRef.child(`${roomId}/participants`).onDisconnect().once('value', function(snapshot) {
                // Bu işlem bağlantı kesildiğinde çalışacak
                const participants = snapshot.val() || {};
                
                // Aktif kullanıcı sayısını kontrol et
                let activeParticipants = 0;
                for (let userId in participants) {
                    if (participants[userId].status !== 'left') {
                        activeParticipants++;
                    }
                }
                
                // Sadece bu kullanıcı kaldıysa odayı temizle
                if (activeParticipants <= 1) {
                    activeRoomsRef.child(roomId).remove();
                    database.ref(`workroom_messages/${roomId}`).remove();
                }
            });
        });
    }
    
    // Oda arayüzünü göster
    function showRoomInterface(room) {
        createRoomContainer.style.display = 'none';
        roomListContainer.style.display = 'none';
        workTogetherContainer.style.display = 'block';
        
        roomTitleElement.textContent = room.name;
        
        // Oda sahibiyse katılımcı ekleme butonunu göster
        if (room.ownerId === currentUser.uid) {
            addParticipantButton();
        }
    }
    
    // Oda arayüzüne katılımcı ekleme butonu ekle
    function addParticipantButton() {
        const roomHeaderButtons = document.querySelector('.room-header-buttons');
        if (!roomHeaderButtons) return;
        
        // Mevcut buton varsa kaldır
        const existingButton = document.getElementById('addParticipantBtn');
        if (existingButton) existingButton.remove();
        
        // Buton oluştur
        const addButton = document.createElement('button');
        addButton.id = 'addParticipantBtn';
        addButton.className = 'btn-primary add-participant-btn';
        addButton.innerHTML = '<i class="fas fa-user-plus"></i> Davet Et';
        
        // Butona olay dinleyicisi ekle
        addButton.addEventListener('click', function(e) {
            e.preventDefault();
            showAddParticipantDialog();
        });
        
        // Butonu butonlar alanına ekle
        roomHeaderButtons.insertBefore(addButton, roomHeaderButtons.firstChild);
        
        // Buton stillerini güncelle
        updateParticipantButtonStyles();
    }
    
    // Katılımcı ekleme butonu stillerini güncelle
    function updateParticipantButtonStyles() {
        // Varolan stil elemanını kontrol et
        let styleElement = document.getElementById('participant-button-styles');
        
        // Yoksa yeni oluştur
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = 'participant-button-styles';
            document.head.appendChild(styleElement);
        }
        
        // CSS stillerini tanımla
        styleElement.textContent = `
            .add-participant-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 16px;
                font-size: 14px;
                font-weight: 600;
                background-color: #4a6cf7;
                color: white;
                border: none;
                border-radius: 20px;
                cursor: pointer;
                transition: all 0.2s ease;
                animation: pulse 2s infinite;
            }
            
            .add-participant-btn:hover {
                background-color: #3a5ce6;
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                animation: none;
            }
            
            @keyframes pulse {
                0% {
                    box-shadow: 0 0 0 0 rgba(74, 108, 247, 0.4);
                }
                70% {
                    box-shadow: 0 0 0 10px rgba(74, 108, 247, 0);
                }
                100% {
                    box-shadow: 0 0 0 0 rgba(74, 108, 247, 0);
                }
            }
            
            /* Karanlık tema uyumluluğu */
            .dark-theme .add-participant-btn {
                background-color: #5a72ed;
                color: white;
            }
            
            .dark-theme .add-participant-btn:hover {
                background-color: #4a62dd;
            }
        `;
    }
    
    // Katılımcıları dinle
    function listenForParticipants(roomId) {
        // Önceki listener'ı temizle
        if (participantsListener) {
            participantsListener.off('value');
        }
        
        participantsListener = activeRoomsRef.child(`${roomId}/participants`);
        
        // child_added olayını dinle (yeni katılımcıları takip etmek için)
        participantsListener.on('child_added', function(childSnapshot) {
            // Yeni katılımcı değilse işleme
            if (childSnapshot.key === currentUser.uid) {
                return; // Kendimizi saymıyoruz
            }
            
            const participant = childSnapshot.val();
            
            // Sadece aktif kullanıcıları bildir
            if (participant.status === 'active' || participant.status === 'break') {
                // Son 10 saniye içinde katıldıysa bildirim göster
                const joinedTime = participant.joined || 0;
                const currentTime = Date.now();
                
                if (currentTime - joinedTime < 10000) { // 10 saniye içinde
                    // Kullanıcı bilgilerini al ve bildirimi göster
                    database.ref('users/' + childSnapshot.key).once('value')
                        .then(userSnapshot => {
                            const userData = userSnapshot.val() || {};
                            const userName = userData.name || userData.displayName || participant.name || 'İsimsiz Kullanıcı';
                            
                            // Bildirim göster
                            showNotification('info', 'Yeni Katılımcı', `${userName} odaya katıldı.`);
                        })
                        .catch(error => {
                            console.error(`Katılımcı bilgileri alınamadı (${childSnapshot.key}):`, error);
                            showNotification('info', 'Yeni Katılımcı', 'Bir kullanıcı odaya katıldı.');
                        });
                }
            }
        });
        
        // Tüm katılımcıları görüntüle
        participantsListener.on('value', function(snapshot) {
            usersListContainer.innerHTML = '';
            
            if (!snapshot.exists()) {
                return;
            }
            
            let participants = snapshot.val();
            let count = 0;
            let userPromises = [];
            
            for (let userId in participants) {
                let participant = participants[userId];
                
                // Sadece aktif kullanıcıları say
                if (participant.status === 'left') {
                    continue;
                }
                
                count++;
                
                // Güncel kullanıcı bilgilerini alma promiselerini oluştur
                userPromises.push(
                    // Firebase'den kullanıcı bilgilerini al
                    database.ref('users/' + userId).once('value')
                        .then(userSnapshot => {
                            const userData = userSnapshot.val() || {};
                            
                            // Kullanıcı adını belirle - öncelikle veritabanındaki name kullan
                            // Kullanıcı adını belirle - veritabanında kayıtlı isim veya katılımcı listesindeki isim
                            const userName = userData.name || userData.displayName || participant.name || 'İsimsiz Kullanıcı';
                            
                            // Durum etiketi oluştur
                            let statusLabel = '';
                            // Durum etiketlerini gösterme (Aktif, Mola) - kullanıcı isteğine göre kaldırıldı
                            
                            // Kullanıcı öğesini oluştur
                            let userItem = document.createElement('div');
                            userItem.className = 'user-item';
                            
                            // Kullanıcının baş harflerini avatar olarak kullan
                            let initials = userName.split(' ').map(name => name && name[0]).join('').toUpperCase();
                            if (!initials) initials = 'U';
                            if (initials.length > 2) {
                                initials = initials.substring(0, 2);
                            }
                            
                            userItem.innerHTML = `
                                <div class="user-avatar">${initials}</div>
                                <div class="user-info">
                                    <p class="user-name">${userName}</p>
                                </div>
                            `;
                            
                            return userItem;
                        })
                        .catch(error => {
                            console.error(`Kullanıcı bilgisi alınamadı (${userId}):`, error);
                            
                            // Hata durumunda default görünüm
                            let userItem = document.createElement('div');
                            userItem.className = 'user-item';
                            
                            userItem.innerHTML = `
                                <div class="user-avatar">?</div>
                                <div class="user-info">
                                    <p class="user-name">${participant.name || 'İsimsiz Kullanıcı'}</p>
                                </div>
                            `;
                            
                            return userItem;
                        })
                );
            }
            
            // Tüm kullanıcı bilgilerini aldıktan sonra listeyi güncelle
            Promise.all(userPromises)
                .then(userItems => {
                    // Listeyi temizle
                    usersListContainer.innerHTML = '';
                    
                    // Tüm kullanıcı öğelerini ekle
                    userItems.forEach(item => {
                        usersListContainer.appendChild(item);
                    });
                    
                    // Kullanıcı sayısını güncelle
                    userCountElement.textContent = count;
                })
                .catch(error => {
                    console.error("Katılımcı listesi oluşturulurken hata:", error);
                });
        });
    }
    
    // Zamanlayıcıyı ayarla
    function setupTimer(mode, examDuration) {
        switch(mode) {
            case 'pomodoro':
                timerSeconds = 25 * 60; // 25 dakika
                break;
            case 'exam':
                timerSeconds = (examDuration || 135) * 60; // Sınav süresi
                break;
            case 'free':
                timerSeconds = 0; // Yukarı doğru sayacak
                break;
        }
        
        updateTimerDisplay();
    }
    
    // Zamanlayıcıyı başlat/durdur
    function toggleTimer() {
        if (!currentRoom) return;
        
        timerRunning = !timerRunning;
        
        if (!timerRunning) {
            // Durdur
            clearInterval(timerInterval);
            timerInterval = null;
            startTimerBtn.innerHTML = '<i class="fas fa-play"></i> Başlat';
            
            // Kullanıcı durumunu güncelle
            activeRoomsRef.child(`${currentRoom.id}/participants/${currentUser.uid}/status`).set('break');
            
            // Timer durumunu veritabanında güncelle - süreyi korur
            syncTimerRef.update({
                running: false,
                lastUpdate: firebase.database.ServerValue.TIMESTAMP,
                seconds: timerSeconds, // Kalan süreyi kaydet
                lastChangedBy: currentUser.uid, // Kim tarafından değiştirildiğini kaydet
                lastChangedByName: currentUserName // Kullanıcı adını da ekle
            });
        } else {
            // Başlat
            startTimerBtn.innerHTML = '<i class="fas fa-pause"></i> Duraklat';
            
            // Kullanıcı durumunu güncelle
            activeRoomsRef.child(`${currentRoom.id}/participants/${currentUser.uid}/status`).set('active');
            
            // Timer durumunu veritabanında güncelle
            syncTimerRef.update({
                running: true,
                startTime: firebase.database.ServerValue.TIMESTAMP,
                lastUpdate: firebase.database.ServerValue.TIMESTAMP,
                seconds: timerSeconds, // Kalan süreyi kaydet
                lastChangedBy: currentUser.uid, // Kim tarafından değiştirildiğini kaydet
                lastChangedByName: currentUserName // Kullanıcı adını da ekle
            });
            
            // Yerel zamanlayıcıyı başlat
            startLocalTimer();
        }
    }
    
    // Zamanlayıcıyı sıfırla
    function resetTimer() {
        if (!currentRoom) return;
        
        // Kullanıcıdan onay iste
        if (!confirm('Zamanlayıcıyı sıfırlamak istediğinize emin misiniz? Bu işlem odadaki tüm kullanıcılar için zamanlayıcıyı sıfırlayacaktır.')) {
            return;
        }
        
        // Zamanlayıcıyı durdur
        clearInterval(timerInterval);
        timerInterval = null;
        timerRunning = false;
        startTimerBtn.innerHTML = '<i class="fas fa-play"></i> Başlat';
        
        // Modu kontrol et ve zamanı ayarla
        if (currentRoom.mode === 'pomodoro') {
            timerSeconds = 25 * 60; // 25 dakika
        } else if (currentRoom.mode === 'exam') {
            timerSeconds = (currentRoom.examDuration || 135) * 60; // Sınav süresi
        } else {
            timerSeconds = 0; // Serbest mod
        }
        
        // Görsel güncelleme
        updateTimerDisplay();
        
        // Veritabanını güncelle - tüm kullanıcılar için
        syncTimerRef.update({
            running: false,
            seconds: timerSeconds,
            lastUpdate: firebase.database.ServerValue.TIMESTAMP,
            resetBy: currentUser.uid, // Kim tarafından sıfırlandığını kaydet
            resetByName: currentUserName // Sıfırlayan kullanıcının adını da ekle
        });
        
        // Bildirim göster
        showNotification('info', 'Zamanlayıcı Sıfırlandı', 'Zamanlayıcı başarıyla sıfırlandı.');
    }
    
    // Zamanlayıcı ekranını güncelle
    function updateTimerDisplay() {
        const minutes = Math.floor(timerSeconds / 60);
        const seconds = timerSeconds % 60;
        
        // Sayaç değerini güncelle
        const displayText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        timerDisplay.textContent = displayText;
        
        // Koyu tema kontrolü
        if (document.body.classList.contains('dark-theme')) {
            timerDisplay.style.color = '#e74c3c'; // Koyu temada kırmızı renk
            
            // Tam ekrandaki timer'ı da güncelle
            const fullscreenTimerDisplay = document.getElementById('fullscreenTimerDisplay');
            if (fullscreenTimerDisplay) {
                fullscreenTimerDisplay.style.color = '#e74c3c';
            }
        } else {
            timerDisplay.style.color = 'rgb(75, 33, 56)'; // Açık temada orijinal renk
            
            // Tam ekrandaki timer'ı da güncelle
            const fullscreenTimerDisplay = document.getElementById('fullscreenTimerDisplay');
            if (fullscreenTimerDisplay) {
                fullscreenTimerDisplay.style.color = 'rgb(75, 33, 56)';
            }
        }
    }
    
    // Mesaj gönder
    function sendMessage() {
        let messageText = chatInput.value.trim();
        
        if (!messageText || !currentRoom) {
            return;
        }
        
        // Önce kullanıcı adını veritabanından al
        database.ref(`users/${currentUser.uid}`).once('value')
            .then(function(snapshot) {
                let userName = 'İsimsiz Kullanıcı';
                
                // Kullanıcı adını doğrudan users/[uid]/name yolundan al
                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    if (userData && userData.name) {
                        userName = userData.name;
                        console.log("Mesaj için kullanıcı adı veritabanından alındı:", userName);
                    } else {
                        console.log("Mesaj için kullanıcı adı bulunamadı, varsayılan isim kullanılacak");
                    }
                }
                
                // Mesaj verisi oluştur
                let messageData = {
                    text: messageText,
                    sender_id: currentUser.uid,
                    sender_name: userName, // Veritabanından alınan kullanıcı adını kullan
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                };
                
                // Mesajı veritabanına ekle
                database.ref(`workroom_messages/${currentRoom.id}`).push(messageData)
                    .then(function() {
                        chatInput.value = '';
                    })
                    .catch(function(error) {
                        console.error("Mesaj gönderme hatası: ", error);
                    });
            })
            .catch(function(error) {
                console.error("Kullanıcı adı alınırken hata:", error);
                
                // Hata durumunda bile mesajı gönder
                let messageData = {
                    text: messageText,
                    sender_id: currentUser.uid,
                    sender_name: 'İsimsiz Kullanıcı',
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                };
                
                database.ref(`workroom_messages/${currentRoom.id}`).push(messageData)
                    .then(function() {
                        chatInput.value = '';
                    })
                    .catch(function(error) {
                        console.error("Mesaj gönderme hatası: ", error);
                    });
            });
    }
    
    // Mesajları dinle
    function listenForMessages(roomId) {
        database.ref(`workroom_messages/${roomId}`).on('child_added', function(snapshot) {
            let message = snapshot.val();
            displayMessage(message);
        });
    }
    
    // Mesajı ekranda göster
    function displayMessage(message) {
        let messageElement = document.createElement('div');
        messageElement.className = 'message';
        
        // Kendi mesajımız mı kontrol et
        if (message.sender_id === currentUser.uid) {
            messageElement.className += ' own-message';
        }
        
        // Zaman formatı
        let timestamp = new Date(message.timestamp);
        let timeString = `${timestamp.getHours().toString().padStart(2, '0')}:${timestamp.getMinutes().toString().padStart(2, '0')}`;
        
        messageElement.innerHTML = `
            <div class="message-sender">${message.sender_name}</div>
            <div class="message-content">${message.text}</div>
            <div class="message-time">${timeString}</div>
        `;
        
        chatMessagesContainer.appendChild(messageElement);
        
        // Otomatik kaydırma
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }
    
    // Odadan ayrıl
    function leaveRoom() {
        if (!currentRoom || !currentRoom.id) {
            console.log("Aktif oda yok, çıkış yapılamıyor");
            return;
        }
        
        const roomId = currentRoom.id;
        
        // Katılımcıyı güncelle
        activeRoomsRef.child(`${roomId}/participants/${currentUser.uid}`).update({
            status: 'left',
            left_at: firebase.database.ServerValue.TIMESTAMP
        })
        .then(function() {
            console.log("Kullanıcı odadan ayrıldı");
            
            // Zamanlayıcıyı durdur
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
            
            // Timer dinleyicisini kaldır
            if (syncTimerRef) {
                syncTimerRef.off();
                syncTimerRef = null;
            }
            
            // Katılımcı dinleyicisini kaldır
            activeRoomsRef.child(`${roomId}/participants`).off();
            
            // Mesaj dinleyicisini kaldır
            database.ref(`workroom_messages/${roomId}`).off();
            
            // Kullanıcı durumunu güncelle
            userPresenceRef.child(currentUser.uid).update({
                status: 'offline',
                room_id: null,
                last_seen: firebase.database.ServerValue.TIMESTAMP
            });
            
            // Oda oturumunu temizle
            clearRoomSession();
            
            // Aktif oda listesini göster
            currentRoom = null;
            workTogetherContainer.style.display = 'none';
            createRoomContainer.style.display = 'block';
            roomListContainer.style.display = 'block';
            
            // Odadan çıkış bildirimi göster
            showNotification('info', 'Odadan Ayrıldınız', 'Odadan başarıyla ayrıldınız.');
        })
        .catch(function(error) {
            console.error("Odadan ayrılma hatası: ", error);
            alert("Odadan ayrılırken bir hata oluştu: " + error.message);
        });
    }
    
    // Kullanıcının aktif oturumunu kontrol et
    function checkForActiveUserSession() {
        console.log("Aktif kullanıcı oturumu kontrol ediliyor...");
        
        // Önce localStorage'da odada olup olmadığını kontrol et
        const savedRoomData = localStorage.getItem('currentRoomSession');
        
        if (savedRoomData) {
            try {
                const roomData = JSON.parse(savedRoomData);
                if (roomData && roomData.roomId) {
                    console.log("Kaydedilmiş oda oturumu bulundu:", roomData);
                    
                    // Oda hala aktif mi kontrol et
                    activeRoomsRef.child(roomData.roomId).once('value')
                        .then(snapshot => {
                            if (snapshot.exists()) {
                                console.log("Oda hala aktif, otomatik katılınıyor:", roomData.roomId);
                                joinRoom(roomData.roomId);
                            } else {
                                console.log("Kaydedilmiş oda artık aktif değil, oturumu temizliyorum");
                                clearRoomSession();
                                
                                // Firebase presence bilgisini de kontrol et
                                checkFirebasePresence();
                            }
                        })
                        .catch(error => {
                            console.error("Oda kontrolü sırasında hata:", error);
                            clearRoomSession();
                            checkFirebasePresence();
                        });
                    
                    return; // localStorage'da kayıt bulunduğu için devam etme
                }
            } catch (error) {
                console.error("Kaydedilmiş oda verisini işlerken hata:", error);
                clearRoomSession();
            }
        }
        
        // localStorage'da kayıt yoksa Firebase'den kontrol et
        checkFirebasePresence();
        
        function checkFirebasePresence() {
            userPresenceRef.child(currentUser.uid).once('value', function(snapshot) {
                if (snapshot.exists()) {
                    let presence = snapshot.val();
                    
                    if (presence.status === 'online' && presence.room_id) {
                        // Kullanıcı zaten bir odada aktif, otomatik katıl
                        console.log("Firebase'de aktif oda bulundu, otomatik katılınıyor:", presence.room_id);
                        joinRoom(presence.room_id);
                    }
                }
            });
        }
    }
    
    // Zamanlayıcı senkronizasyonunu kur
    function setupTimerSync(roomId) {
        console.log("Zamanlayıcı senkronizasyonu başlatılıyor, roomId:", roomId);
        
        // Timer referansını oluştur
        syncTimerRef = activeRoomsRef.child(`${roomId}/timer`);
        
        // Değişken tanımla
        let lastTimerState = null;
        
        // Timer değişikliklerini dinle
        syncTimerRef.on('value', function(snapshot) {
            if (!snapshot.exists()) return;
            
            const timerData = snapshot.val();
            console.log("Timer verisi güncellendi:", timerData);
            
            // Önceki durum ve mevcut durum karşılaştırması için
            const wasRunning = timerRunning;
            
            // Çalışma durumunu güncelle
            timerRunning = timerData.running;
            
            // Buton metnini güncelle
            if (timerRunning) {
                startTimerBtn.innerHTML = '<i class="fas fa-pause"></i> Duraklat';
            } else {
                startTimerBtn.innerHTML = '<i class="fas fa-play"></i> Başlat';
            }
            
            // Lokal sayaç ile veritabanı sayacı arasında büyük fark varsa (10 saniyeden fazla)
            // veya çalışma durumu değişmişse güncelle
            const timeDiff = Math.abs(timerSeconds - timerData.seconds);
            if (timeDiff > 10 || wasRunning !== timerRunning) {
                console.log("Zamanlayıcı büyük değişiklik algılandı, zamanlayıcı senkronize ediliyor");
                timerSeconds = timerData.seconds;
                updateTimerDisplay();
                
                // Yerel zamanlayıcıyı güncelle
                if (timerInterval) {
                    clearInterval(timerInterval);
                    timerInterval = null;
                }
                
                if (timerRunning) {
                    startLocalTimer();
                }
                
                // Durumu bildirme kontrolü - kendimiz değiştirdiysek bildirme
                if (lastTimerState !== null && // İlk defa geliyorsa bildirim gösterme
                    timerData.lastChangedBy !== currentUser.uid && // Kendimiz değiştirmedik
                    wasRunning !== timerRunning) { // Çalışma durumu değişti
                    
                    // Durum değişimini bildirme
                    if (timerRunning) {
                        showNotification('info', 'Zamanlayıcı Başlatıldı', 
                            `${timerData.lastChangedByName || 'Başka bir kullanıcı'} zamanlayıcıyı başlattı.`);
                    } else {
                        showNotification('info', 'Zamanlayıcı Durduruldu', 
                            `${timerData.lastChangedByName || 'Başka bir kullanıcı'} zamanlayıcıyı durdurdu.`);
                    }
                }
                
                // Zamanlayıcı sıfırlandıysa bildirim göster
                if (lastTimerState !== null && 
                    timerData.resetBy && 
                    timerData.resetBy !== currentUser.uid) {
                    
                    database.ref(`users/${timerData.resetBy}`).once('value')
                        .then(userSnapshot => {
                            const userData = userSnapshot.val() || {};
                            const userName = userData.name || userData.displayName || timerData.lastChangedByName || 'Başka bir kullanıcı';
                            
                            showNotification('info', 'Zamanlayıcı Sıfırlandı', 
                                `${userName} zamanlayıcıyı sıfırladı.`);
                        })
                        .catch(error => {
                            console.error("Kullanıcı bilgisi alınamadı:", error);
                            showNotification('info', 'Zamanlayıcı Sıfırlandı', 
                                'Bir kullanıcı zamanlayıcıyı sıfırladı.');
                        });
                }
            }
            
            // Mevcut durumu kaydet
            lastTimerState = {
                running: timerRunning,
                seconds: timerSeconds,
                resetBy: timerData.resetBy
            };
        });
    }
    
    // Yerel zamanlayıcıyı başlat
    function startLocalTimer() {
        // Zamanlayıcı zaten çalışıyorsa durdur
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        // Pomodoro ve Exam modlarında geri sayım yap
        if (currentRoom.mode === 'pomodoro' || currentRoom.mode === 'exam') {
            timerInterval = setInterval(function() {
                if (timerSeconds > 0) {
                    timerSeconds--;
                    updateTimerDisplay();
                    
                    // Her 15 saniyede bir veritabanını güncelle
                    if (timerSeconds % 15 === 0) {
                        syncTimerRef.update({
                            seconds: timerSeconds,
                            lastUpdate: firebase.database.ServerValue.TIMESTAMP
                        });
                    }
                } else {
                    clearInterval(timerInterval);
                    timerInterval = null;
                    timerRunning = false;
                    startTimerBtn.innerHTML = '<i class="fas fa-play"></i> Başlat';
                    
                    // Timer durumunu veritabanında güncelle
                    syncTimerRef.update({
                        running: false,
                        lastUpdate: firebase.database.ServerValue.TIMESTAMP
                    });
                    
                    // Süre dolduğunda bildirim ver
                    if (currentRoom.mode === 'pomodoro') {
                        alert('Pomodoro süresi doldu! 5 dakika mola verebilirsiniz.');
                        // Mola süresini ayarla
                        timerSeconds = 5 * 60;
                        updateTimerDisplay();
                        
                        // Veritabanını güncelle
                        syncTimerRef.update({
                            seconds: timerSeconds,
                            lastUpdate: firebase.database.ServerValue.TIMESTAMP
                        });
                    } else {
                        alert('Sınav süresi doldu!');
                    }
                }
            }, 1000);
        } 
        // Serbest modda yukarı doğru say
        else if (currentRoom.mode === 'free') {
            timerInterval = setInterval(function() {
                timerSeconds++;
                updateTimerDisplay();
                
                // Her 30 saniyede bir veritabanını güncelle
                if (timerSeconds % 30 === 0) {
                    syncTimerRef.update({
                        seconds: timerSeconds,
                        lastUpdate: firebase.database.ServerValue.TIMESTAMP
                    });
                }
            }, 1000);
        }
    }
    
    // Katılımcı ekleme
    function showAddParticipantDialog() {
        console.log("showAddParticipantDialog fonksiyonu çağrıldı");
        
        // Mevcut diyalog varsa kaldır
        const existingDialog = document.getElementById('addParticipantDialog');
        if (existingDialog) {
            console.log("Mevcut dialog kaldırılıyor");
            existingDialog.remove();
        }
        
        // Önce stil tanımlamalarını uygula
        applyPopupStyles();
        applyFriendListStyles();
        
        // Diyalog oluştur
        const dialog = document.createElement('div');
        dialog.id = 'addParticipantDialog';
        dialog.className = 'popup-overlay';
        
        dialog.innerHTML = `
            <div class="popup-container">
                <div class="popup-header">
                    <h3>Arkadaşlarımı Odaya Davet Et</h3>
                    <button class="popup-close-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="popup-content">
                    <p>Odaya davet etmek istediğin arkadaşlarını seç:</p>
                    <div id="friendList" class="friend-list">
                        <div class="loading-friends">
                            <i class="fas fa-spinner fa-spin"></i> Arkadaşlar yükleniyor...
                        </div>
                    </div>
                </div>
                <div class="popup-footer">
                    <button id="cancelAddParticipant" class="btn-secondary">Kapat</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        console.log("Popup oluşturuldu ve body'e eklendi");
        
        // Animasyon için kısa bir gecikme
        setTimeout(() => {
            dialog.classList.add('popup-visible');
        }, 10);
        
        // Diyalog kapatma butonu
        dialog.querySelector('.popup-close-btn').addEventListener('click', function() {
            console.log("Popup kapatma butonuna tıklandı");
            dialog.classList.remove('popup-visible');
            setTimeout(() => {
                dialog.remove();
            }, 300);
        });
        
        // İptal butonu
        document.getElementById('cancelAddParticipant').addEventListener('click', function() {
            console.log("İptal butonuna tıklandı");
            dialog.classList.remove('popup-visible');
            setTimeout(() => {
                dialog.remove();
            }, 300);
        });
        
        // Overlay'e tıklayınca da kapansın
        dialog.addEventListener('click', function(e) {
            if (e.target === dialog) {
                dialog.classList.remove('popup-visible');
                setTimeout(() => {
                    dialog.remove();
                }, 300);
            }
        });
        
        console.log("loadFriendsList fonksiyonu çağrılıyor...");
        // Arkadaşları listele
        loadFriendsList();
    }
    
    // Popup stillerini uygula
    function applyPopupStyles() {
        // Varolan stil elemanını kontrol et
        let styleElement = document.getElementById('popup-styles');
        
        // Yoksa yeni oluştur
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = 'popup-styles';
            document.head.appendChild(styleElement);
        }
        
        // CSS stillerini tanımla
        styleElement.textContent = `
            /* Popup stilleri */
            .popup-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s ease, visibility 0.3s ease;
            }
            
            .popup-visible {
                opacity: 1;
                visibility: visible;
            }
            
            .popup-container {
                background-color: #fff;
                border-radius: 10px;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
                width: 90%;
                max-width: 500px;
                max-height: 80vh;
                display: flex;
                flex-direction: column;
                transform: scale(0.9);
                opacity: 0;
                transition: transform 0.3s ease, opacity 0.3s ease;
            }
            
            .popup-visible .popup-container {
                transform: scale(1);
                opacity: 1;
            }
            
            .popup-header {
                padding: 15px 20px;
                border-bottom: 1px solid #eee;
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-radius: 10px 10px 0 0;
            }
            
            .popup-header h3 {
                margin: 0;
                font-size: 18px;
                color: #333;
            }
            
            .popup-close-btn {
                background: transparent;
                border: none;
                color: #999;
                cursor: pointer;
                font-size: 18px;
                transition: color 0.2s ease;
            }
            
            .popup-close-btn:hover {
                color: #333;
            }
            
            .popup-content {
                padding: 20px;
                overflow-y: auto;
                flex: 1;
            }
            
            .popup-footer {
                padding: 15px 20px;
                border-top: 1px solid #eee;
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                border-radius: 0 0 10px 10px;
            }
            
            /* Karanlık tema uyumluluğu */
            .dark-theme .popup-container {
                background-color: #333;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
            }
            
            .dark-theme .popup-header,
            .dark-theme .popup-footer {
                border-color: #444;
            }
            
            .dark-theme .popup-header h3 {
                color: #eee;
            }
            
            .dark-theme .popup-close-btn {
                color: #777;
            }
            
            .dark-theme .popup-close-btn:hover {
                color: #ccc;
            }
            
            .dark-theme .popup-content {
                color: #ddd;
            }
        `;
        
        console.log("Popup stilleri başarıyla uygulandı");
    }
    
    // Arkadaş listesi stillerini uygula
    function applyFriendListStyles() {
        console.log("Arkadaş listesi stilleri uygulanıyor");
        
        // Varolan stil elemanını kontrol et
        let styleElement = document.getElementById('friend-list-styles');
        
        // Yoksa yeni oluştur
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = 'friend-list-styles';
            document.head.appendChild(styleElement);
        }
        
        // CSS stillerini tanımla
        styleElement.textContent = `
            /* Arkadaş listesi stilleri */
            .friend-list {
                margin-top: 15px;
                max-height: 350px;
                overflow-y: auto;
            }
            
            .friend-item {
                padding: 12px;
                border-radius: 8px;
                margin-bottom: 10px;
                background-color: #f7f7f7;
                display: flex;
                align-items: center;
            }
            
            .friend-item:hover {
                background-color: #f0f0f0;
            }
            
            .friend-avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background-color: #1976D2;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                margin-right: 15px;
                flex-shrink: 0;
            }
            
            .friend-info {
                flex: 1;
            }
            
            .friend-name {
                font-weight: 600;
                margin: 0 0 5px 0;
            }
            
            .friend-status {
                margin: 0;
                font-size: 12px;
                color: #666;
            }
            
            .loading-friends {
                text-align: center;
                padding: 20px;
                color: #666;
            }
            
            .no-friends {
                text-align: center;
                padding: 20px;
                color: #666;
                background-color: #f7f7f7;
                border-radius: 8px;
            }
            
            .no-friends.error {
                background-color: #ffebee;
                color: #c62828;
            }
            
            .invite-btn {
                padding: 6px 12px;
                font-size: 14px;
                margin-left: 10px;
                flex-shrink: 0;
            }
            
            .invited-btn {
                background-color: #4CAF50;
                cursor: default;
                opacity: 0.8;
            }
            
            /* Karanlık tema uyumluluğu - Arkadaş listesi */
            .dark-theme .friend-item {
                background-color: #444;
            }
            
            .dark-theme .friend-item:hover {
                background-color: #555;
            }
            
            .dark-theme .friend-name {
                color: #eee;
            }
            
            .dark-theme .friend-status {
                color: #aaa;
            }
            
            .dark-theme .no-friends {
                color: #aaa;
                background-color: #444;
            }
            
            .dark-theme .no-friends.error {
                background-color: #4a2222;
                color: #ff8a80;
            }
            
            .dark-theme .loading-friends {
                color: #aaa;
            }
        `;
        
        console.log("Arkadaş listesi stilleri başarıyla uygulandı");
    }
    
    // Arkadaşları yükle
    function loadFriendsList() {
        const friendListContainer = document.getElementById('friendList');
        if (!friendListContainer) {
            console.error("friendList container bulunamadı!");
            showNotification('error', 'Hata', 'Arkadaş listesi yüklenirken bir sorun oluştu. Lütfen sayfayı yenileyip tekrar deneyin.');
            return;
        }
        
        console.log("Arkadaş listesi yükleniyor...");
        
        // Yükleniyor göstergesi
        friendListContainer.innerHTML = `
            <div class="loading-friends">
                <i class="fas fa-spinner fa-spin"></i> Arkadaşlar yükleniyor...
            </div>
        `;
        
        // Önce kullanıcı ID'sini kontrol et
        if (!currentUser || !currentUser.uid) {
            console.error("Kullanıcı giriş yapmamış veya uid bulunamadı");
            friendListContainer.innerHTML = '<p class="no-friends error">Oturum bilgilerinize erişilemiyor. Lütfen çıkış yapıp tekrar giriş yapın.</p>';
            return;
        }
        
        if (!database) {
            console.error("Firebase veritabanı referansı bulunamadı");
            friendListContainer.innerHTML = '<p class="no-friends error">Veritabanı bağlantısı kurulamadı. Lütfen sayfayı yenileyip tekrar deneyin.</p>';
            return;
        }
        
        console.log("Oturum açan kullanıcı:", currentUser.uid);
        
        // Önce kullanıcının arkadaş listesini al
        database.ref('users/' + currentUser.uid + '/friends').once('value')
            .then(function(friendsSnapshot) {
                console.log("Arkadaş listesi veritabanından alındı");
                
                if (!friendsSnapshot.exists()) {
                    console.log("Arkadaş listesi boş");
                    friendListContainer.innerHTML = '<p class="no-friends">Henüz arkadaşınız bulunmuyor. Arkadaşlar sayfasından arkadaş ekleyebilirsiniz.</p>';
                    return;
                }
                
                const myFriends = friendsSnapshot.val();
                if (!myFriends) {
                    console.error("Arkadaş listesi verisi alınamadı");
                    friendListContainer.innerHTML = '<p class="no-friends error">Arkadaş listesi verisi alınamadı. Lütfen sayfayı yenileyip tekrar deneyin.</p>';
                    return;
                }
                
                let friendIds = Object.keys(myFriends);
                
                console.log(`${friendIds.length} arkadaş bulundu:`, friendIds);
                
                if (friendIds.length === 0) {
                    friendListContainer.innerHTML = '<p class="no-friends">Henüz arkadaşınız bulunmuyor.</p>';
                    return;
                }
                
                // Arkadaş listesini temizle
                friendListContainer.innerHTML = '';
                
                // Her bir arkadaş için güncel bilgileri al
                let friendsPromises = friendIds.map(friendId => {
                    // Arkadaşın güncel durumunu kontrol et
                    return database.ref('users/' + friendId).once('value')
                        .then(userSnapshot => {
                            if (!userSnapshot.exists()) {
                                console.log(`Arkadaş bilgisi bulunamadı: ${friendId}`);
                                return null;
                            }
                            
                            const userData = userSnapshot.val();
                            
                            // Çevrimiçi durumunu kontrol et
                            return database.ref('status/' + friendId).once('value')
                                .then(statusSnapshot => {
                                    const statusData = statusSnapshot.val();
                                    const isOnline = statusData && statusData.state === 'online';
                                    
                                    // Zaten odada olan kullanıcıları filtrele
                                    if (currentRoom && currentRoom.participants && currentRoom.participants[friendId]) {
                                        console.log(`Arkadaş zaten odada: ${friendId}`);
                                        return null;
                                    }
                                    
                                    return {
                                        id: friendId,
                                        displayName: userData.name || userData.displayName || (myFriends[friendId] ? myFriends[friendId].name : 'İsimsiz Kullanıcı'),
                                        email: userData.email || (myFriends[friendId] ? myFriends[friendId].email : 'E-posta yok'),
                                        status: isOnline ? 'Çevrimiçi' : 'Çevrimdışı'
                                    };
                                })
                                .catch(error => {
                                    console.error(`Status bilgisi alınamadı (${friendId}):`, error);
                                    // Hata durumunda yine de arkadaşı göster
                                    return {
                                        id: friendId,
                                        displayName: userData.name || userData.displayName || (myFriends[friendId] ? myFriends[friendId].name : 'İsimsiz Kullanıcı'),
                                        email: userData.email || (myFriends[friendId] ? myFriends[friendId].email : 'E-posta yok'),
                                        status: 'Bilinmiyor'
                                    };
                                });
                        })
                        .catch(error => {
                            console.error(`Arkadaş bilgisi alınamadı (${friendId}):`, error);
                            return null;
                        });
                });
                
                // Tüm arkadaş bilgilerini getir
                Promise.all(friendsPromises)
                    .then(friends => {
                        // null değerleri (odadaki kullanıcılar veya bulunamayanlar) filtrele
                        friends = friends.filter(friend => friend !== null);
                        
                        console.log(`Davet edilebilecek ${friends.length} arkadaş bulundu`);
                        
                        if (friends.length === 0) {
                            friendListContainer.innerHTML = '<p class="no-friends">Davet edilebilecek arkadaşınız bulunmuyor.</p>';
                            return;
                        }
                        
                        // Arkadaşları ada göre sırala
                        friends.sort((a, b) => {
                            return a.displayName.localeCompare(b.displayName);
                        });
                        
                        // Arkadaş listesini oluştur
                        friends.forEach(function(friend) {
                            const userItem = document.createElement('div');
                            userItem.className = 'friend-item';
                            
                            // Kullanıcının baş harflerini avatar olarak kullan
                            let initials = friend.displayName.split(' ').map(name => name && name[0]).join('').toUpperCase();
                            if (!initials) initials = 'U';
                            if (initials.length > 2) {
                                initials = initials.substring(0, 2);
                            }
                            
                            userItem.innerHTML = `
                                <div class="friend-avatar">${initials}</div>
                                <div class="friend-info">
                                    <p class="friend-name">${friend.displayName}</p>
                                    <p class="friend-status">${friend.status}</p>
                                </div>
                                <button class="btn-primary invite-btn" data-user-id="${friend.id}" data-user-name="${friend.displayName}">Davet Et</button>
                            `;
                            
                            friendListContainer.appendChild(userItem);
                        });
                        
                        console.log("Arkadaş listesi başarıyla render edildi");
                        
                        // Davet butonlarına tıklama olayı ekle
                        document.querySelectorAll('.invite-btn').forEach(function(btn) {
                            btn.addEventListener('click', function() {
                                const userId = this.getAttribute('data-user-id');
                                const userName = this.getAttribute('data-user-name');
                                
                                console.log(`Davet edilecek arkadaş: ${userName} (${userId})`);
                                inviteUserToRoom(userId);
                                
                                // Butonu devre dışı bırak ve metnini değiştir
                                this.disabled = true;
                                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gönderiliyor...';
                                this.classList.add('invited-btn');
                            });
                        });
                    })
                    .catch(error => {
                        console.error("Arkadaş bilgileri alınırken hata:", error);
                        friendListContainer.innerHTML = '<p class="no-friends error">Arkadaş bilgileri yüklenirken bir hata oluştu.</p>';
                    });
            })
            .catch(function(error) {
                console.error("Arkadaş listesine erişirken hata:", error);
                friendListContainer.innerHTML = '<p class="no-friends error">Arkadaş listesi yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.</p>';
            });
    }
    
    // Kullanıcıyı odaya davet et
    function inviteUserToRoom(userId) {
        if (!currentRoom || !currentUser) {
            alert("Davet göndermek için bir odada olmalısınız.");
            return;
        }
        
        // Önce kullanıcı adını veritabanından al
        database.ref(`users/${currentUser.uid}`).once('value')
            .then(function(snapshot) {
                let inviterName = 'İsimsiz Kullanıcı';
                
                // Kullanıcı adını doğrudan users/[uid]/name yolundan al
                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    if (userData && userData.name) {
                        inviterName = userData.name;
                        console.log("Davet için kullanıcı adı veritabanından alındı:", inviterName);
                    } else {
                        console.log("Davet için kullanıcı adı bulunamadı, varsayılan isim kullanılacak");
                    }
                }
                
                // Davet verisi oluştur
                const inviteData = {
                    roomId: currentRoom.id,
                    roomName: currentRoom.name,
                    fromId: currentUser.uid,
                    fromName: inviterName,
                    status: 'pending',
                    subType: 'room_invite', // Davet tipini belirt
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                };
                
                // Davet referansını oluştur - sadece alıcının erişim yoluna kaydet
                const roomInvitationsRef = database.ref(`room_invitations/${userId}/${currentRoom.id}_${currentUser.uid}`);
                
                // Daveti veritabanına ekle - sadece tek bir yola
                roomInvitationsRef.set(inviteData)
                    .then(function() {
                        console.log("Davet gönderildi:", inviteData);
                        showNotification('success', 'Davet Gönderildi', 'Arkadaşınıza oda daveti gönderildi.');
                        
                        // Popup'ı kapat
                        const popup = document.getElementById('addParticipantDialog');
                        if (popup) {
                            popup.classList.remove('popup-visible');
                            setTimeout(() => {
                                popup.remove();
                            }, 300);
                        }
                    })
                    .catch(function(error) {
                        console.error("Davet gönderme hatası:", error);
                        alert("Davet gönderilirken bir hata oluştu: " + error.message);
                    });
            })
            .catch(function(error) {
                console.error("Kullanıcı adı alınırken hata:", error);
                alert("Kullanıcı adı alınırken bir hata oluştu: " + error.message);
            });
    }
    
    // Bildirimleri kontrol et
    function checkForNotifications() {
        console.log("Bildirimler kontrol ediliyor...");
        
        if (!currentUser || !currentUser.uid) {
            console.error("Bildirimler kontrol edilemiyor: Kullanıcı giriş yapmamış");
            return;
        }
        
        const userId = currentUser.uid;
        console.log("Bildirim kontrolleri başlatılıyor, userId:", userId);
        
        // Arkadaşlardan gelen davetleri dinle
        listenForInvitesFromFriends();
        
        // Odadaki değişimleri dinle
        if (currentRoom && currentRoom.id) {
            listenForRoomInvitationChanges(currentRoom.id);
        }
        
        // Arkadaş davetlerini dinle
        function listenForInvitesFromFriends() {
            // Kullanıcının arkadaş listesini al
            firebase.database().ref(`users/${userId}/friends`).once('value')
                .then(snapshot => {
                    if (!snapshot.exists()) {
                        console.log("Arkadaş listesi bulunamadı");
                        return;
                    }
                    
                    const friends = Object.keys(snapshot.val());
                    console.log("Arkadaşlar:", friends);
                    
                    // Her bir arkadaşın davet listesini dinle
                    friends.forEach(friendId => {
                        listenForInvitesFromFriend(friendId);
                    });
                    
                    // Doğrudan kendi davet listesini de dinle
                    listenForDirectInvitations();
                })
                .catch(error => {
                    console.error("Arkadaş listesi alınırken hata:", error);
                    
                    // Hata durumunda bile doğrudan kendi davetlerini dinle
                    listenForDirectInvitations();
                });
        }
        
        // Belirli bir arkadaştan gelen davetleri dinle
        function listenForInvitesFromFriend(friendId) {
            console.log(`${friendId} arkadaşından gelen davetler dinleniyor`);
            
            // sentInvites yolundan yeni davetleri dinle
            const sentInvitesRef = firebase.database().ref(`users/${friendId}/sentInvites/${userId}`);
            
            // sentInvites yolundan yeni davetleri dinle
            sentInvitesRef.on('child_added', snapshot => {
                processInviteSnapshot(snapshot, friendId);
            });
            
            // sentInvites yolundaki değişiklikleri dinle
            sentInvitesRef.on('child_changed', snapshot => {
                processInviteSnapshot(snapshot, friendId);
            });
        }
        
        // Doğrudan kullanıcının davet listesini dinle
        function listenForDirectInvitations() {
            console.log("Kullanıcının kendi davet listesi dinleniyor");
            
            // Room invitations yolu dinleme
            const roomInvitesRef = firebase.database().ref(`room_invitations/${userId}`);
            
            // room_invitations yolundan gelen davetleri dinle
            roomInvitesRef.on('child_added', snapshot => {
                // Davet ID'sini parçala ve bilgileri işle
                const inviteId = snapshot.key;
                const invite = snapshot.val();
                
                // Daveti sadece 'pending' durumundaysa işle
                if (invite && invite.status === 'pending') {
                    const parts = inviteId.split('_');
                    
                    // Davet ID formatı: roomId_fromUserId
                    if (parts.length === 2) {
                        const fromUserId = parts[1];
                        processInviteSnapshot(snapshot, fromUserId);
                    }
                }
            });
            
            // room_invitations yolundaki değişiklikleri dinle
            roomInvitesRef.on('child_changed', snapshot => {
                // Davet ID'sini parçala ve bilgileri işle
                const inviteId = snapshot.key;
                const invite = snapshot.val();
                
                // Daveti sadece 'pending' durumundaysa işle
                if (invite && invite.status === 'pending') {
                    const parts = inviteId.split('_');
                    
                    // Davet ID formatı: roomId_fromUserId
                    if (parts.length === 2) {
                        const fromUserId = parts[1];
                        processInviteSnapshot(snapshot, fromUserId);
                    }
                }
            });
        }
        
        // Davet snapshot'ını işle
        function processInviteSnapshot(snapshot, senderId) {
            const invite = snapshot.val();
            const inviteId = snapshot.key;
            
            if (!invite) return;
            
            console.log(`Davet alındı: ${inviteId}`, invite);
            
            // Davet kontrolü için local storage'ı kontrol et
            const processedInvites = JSON.parse(localStorage.getItem('processedInvites') || '{}');
            
            // Daha önce işlenmişse ve kabul edilmiş veya reddedilmişse gösterme
            if (processedInvites[inviteId] && 
                (processedInvites[inviteId] === 'accepted' || processedInvites[inviteId] === 'rejected')) {
                console.log(`Davet daha önce işlenmiş (${processedInvites[inviteId]}), tekrar gösterilmeyecek:`, inviteId);
                return;
            }
            
            // Sadece bekleyen durumdaki davetleri göster
            if (invite.status === 'pending') {
                processReceivedInvite(invite, inviteId, senderId);
            }
        }
    }
    
    // Alınan daveti işle
    function processReceivedInvite(invite, inviteId, friendId) {
        console.log("Davet işleniyor:", invite);
        
        if (invite.subType === 'room_invite') {
            handleRoomInvite(invite, inviteId, friendId);
        }
    }
    
    // Oda davet değişimlerini dinle
    function listenForRoomInvitationChanges(roomId) {
        // Kendi gönderdiğin davetlerin durumunu dinle
        firebase.database().ref(`rooms/active_workrooms/${roomId}/invitations`).on('child_changed', snapshot => {
            const userId = snapshot.key;
            const invitations = snapshot.val();
            
            Object.keys(invitations || {}).forEach(inviteId => {
                const invite = invitations[inviteId];
                
                if (invite.status === 'accepted' && invite.from === currentUser.uid) {
                    showNotification('success', 'Davet Kabul Edildi', 
                        `${invite.toName || "Kullanıcı"} davetinizi kabul etti ve odaya katıldı.`);
                } else if (invite.status === 'rejected' && invite.from === currentUser.uid) {
                    showNotification('info', 'Davet Reddedildi', 
                        `${invite.toName || "Kullanıcı"} davetinizi reddetti.`);
                }
            });
        });
    }
    
    // Oda davet bildirimini işle
    function handleRoomInvite(invite, inviteId, friendId) {
        // Odanın hala aktif olup olmadığını kontrol et
        firebase.database().ref(`rooms/active_workrooms/${invite.roomId}`).once('value')
            .then(snapshot => {
                if (!snapshot.exists()) {
                    console.log("Davet edilen oda artık mevcut değil");
                    // Bildirimi otomatik reddet
                    return rejectInvitation(invite, inviteId, friendId, 'room_not_exists');
                }
                
                const room = snapshot.val();
                
                // Davet mesajını oluştur
                const message = `${invite.fromName} sizi "${room.name}" odasına davet ediyor.`;
                
                // Kullanıcıya aksiyon butonları olan bildirim göster
                showRoomInviteNotification(invite, inviteId, friendId, message);
            })
            .catch(error => {
                console.error("Davet bildirimi işlenirken hata:", error);
            });
    }
    
    // Oda davet bildirimini göster
    function showRoomInviteNotification(invite, inviteId, friendId, message) {
        console.log("Davet bildirimi gösteriliyor:", invite.roomName);
        
        try {
            // Daha önce işlenmiş davetleri kontrol et
            const processedInvites = JSON.parse(localStorage.getItem('processedInvites') || '{}');
            if (processedInvites[inviteId] === 'accepted' || processedInvites[inviteId] === 'rejected') {
                console.log("Bu davet daha önce işlenmiş, gösterilmeyecek:", inviteId);
                return;
            }
            
            // Sadece popup bildirim göster, kalıcı davet paneli KULLANMA
            showNotificationWithAction(
                'info', 
                'Yeni Oda Daveti', 
                `${invite.fromName} sizi "${invite.roomName}" odasına davet ediyor.`,
                'Kabul Et',
                function() {
                    acceptInvitation(invite, inviteId, friendId);
                },
                'Reddet',
                function() {
                    rejectInvitation(invite, inviteId, friendId, null);
                },
                inviteId // Davet ID'sini ekle
            );
            
            // Sesli bildirim çal
            playNotificationSound();
            
            console.log("Davet bildirimi başarıyla gösterildi");
        } catch (error) {
            console.error("Davet bildirimi gösterilirken hata:", error);
            // Alternatif basit bildirim göster
            showNotification('info', 'Yeni Oda Daveti', 
                'Bir çalışma odasına davet edildiniz. Davet listesini kontrol edin.');
        }
    }
    
    // Bekleyen davetler konteyner stillerini ekle
    function addPendingInvitesStyles() {
        // Stil elemanı kontrol et
        let styleElement = document.getElementById('pending-invites-styles');
        if (styleElement) {
            styleElement.remove(); // Varsa sil, yeniden oluştur
        }
        
        styleElement = document.createElement('style');
        styleElement.id = 'pending-invites-styles';
        document.head.appendChild(styleElement);
        
        styleElement.textContent = `
            .pending-invites-container {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 320px;
                max-height: 80vh;
                overflow-y: auto;
                background-color: white;
                border-radius: 10px;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
                z-index: 9998;
                display: flex;
                flex-direction: column;
                padding: 10px;
                gap: 10px;
            }
            
            .invite-item {
                background-color: #f5f8ff;
                border-radius: 8px;
                border-left: 4px solid #ff9800;
                padding: 10px;
                transition: all 0.3s ease;
            }
            
            .invite-item.closing {
                opacity: 0;
                transform: translateX(100%);
            }
            
            .invite-content {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .invite-info {
                margin-bottom: 5px;
            }
            
            .invite-message {
                margin: 0;
                font-size: 14px;
                font-weight: 500;
            }
            
            .invite-time {
                margin: 5px 0 0 0;
                font-size: 12px;
                color: #666;
            }
            
            .invite-actions {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
            }
            
            .invite-reject {
                padding: 6px 12px;
                border: 1px solid #dc3545;
                background-color: transparent;
                color: #dc3545;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 13px;
            }
            
            .invite-reject:hover {
                background-color: #dc3545;
                color: white;
            }
            
            .invite-accept {
                padding: 6px 12px;
                background-color: #4a6cf7;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 13px;
            }
            
            .invite-accept:hover {
                background-color: #3a5ce6;
            }
            
            /* Karanlık tema uyumluluğu */
            .dark-theme .pending-invites-container {
                background-color: #333;
            }
            
            .dark-theme .invite-item {
                background-color: #444;
            }
            
            .dark-theme .invite-message {
                color: #eee;
            }
            
            .dark-theme .invite-time {
                color: #aaa;
            }
            
            .dark-theme .invite-reject {
                border-color: #e57373;
                color: #e57373;
            }
            
            .dark-theme .invite-reject:hover {
                background-color: #e57373;
                color: #1a1a1a;
            }
            
            .dark-theme .invite-accept {
                background-color: #5a72ed;
            }
            
            .dark-theme .invite-accept:hover {
                background-color: #4a62dd;
            }
            
            /* Animasyon */
            @keyframes fadeInRight {
                from {
                    opacity: 0;
                    transform: translateX(30px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            .invite-item {
                animation: fadeInRight 0.3s forwards;
            }
        `;
        
        console.log("Bekleyen davetler konteyner stilleri başarıyla uygulandı");
    }
    
    // Daveti kabul et
    function acceptInvitation(invite, inviteId, friendId, notificationElement) {
        console.log("Davet kabul ediliyor:", invite);
        
        // Bildirimi kapat (varsa)
        if (notificationElement) {
            notificationElement.classList.add('notification-closing');
            setTimeout(() => {
                notificationElement.remove();
            }, 300);
        }
        
        // Davet başarılı olarak kabul edildi olarak işaretlemek için
        // Local storage'a işlenen davetleri kaydet (offline çalışabilmek için)
        try {
            const processedInvites = JSON.parse(localStorage.getItem('processedInvites') || '{}');
            processedInvites[inviteId] = 'accepted';
            localStorage.setItem('processedInvites', JSON.stringify(processedInvites));
        } catch (error) {
            console.error("LocalStorage güncelleme hatası:", error);
        }
        
        // Bildirimi kapat
        clearRelatedNotifications(inviteId);
        
        // Davet durumunu güncelle - sadece kendi yolumuzda güncelleme yap
        // Bu işlem daha az hata riski taşır
        firebase.database().ref(`room_invitations/${currentUser.uid}/${inviteId}`).update({
            status: 'accepted',
            acceptedAt: firebase.database.ServerValue.TIMESTAMP
        })
        .then(() => {
            console.log("Davet kabul durumu güncellendi");
            
            // Başarılı olarak sayalım ve odaya girmeye çalışalım
            showNotification('success', 'Davet Kabul Edildi', `"${invite.roomName}" odasına katılıyorsunuz...`);
            
            // Odaya katıl
            joinRoom(invite.roomId);
        })
        .catch(error => {
            console.error("Davet kabul durumu güncellenirken hata:", error);
            
            // Hata aldık ama yine de odaya girmeye çalışalım
            showNotification('warning', 'Uyarı', 'Davet durumu güncellenirken bir sorun oluştu ama odaya katılmaya çalışılıyor...');
            joinRoom(invite.roomId);
        });
    }
    
    // Daveti reddet
    function rejectInvitation(invite, inviteId, friendId, reason, notificationElement) {
        console.log("Davet reddediliyor:", invite);
        
        // Bildirimi kapat (varsa)
        if (notificationElement) {
            notificationElement.classList.add('notification-closing');
            setTimeout(() => {
                notificationElement.remove();
            }, 300);
        }
        
        // Davet başarılı olarak reddedildi olarak işaretlemek için
        // Local storage'a işlenen davetleri kaydet (offline çalışabilmek için)
        try {
            const processedInvites = JSON.parse(localStorage.getItem('processedInvites') || '{}');
            processedInvites[inviteId] = 'rejected';
            localStorage.setItem('processedInvites', JSON.stringify(processedInvites));
        } catch (error) {
            console.error("LocalStorage güncelleme hatası:", error);
        }
        
        // Bildirimi kapat
        clearRelatedNotifications(inviteId);
        
        // Davet durumunu güncelle - sadece kendi yolumuzda güncelleme yap
        // Bu işlem daha az hata riski taşır
        firebase.database().ref(`room_invitations/${currentUser.uid}/${inviteId}`).update({
            status: 'rejected',
            rejectedAt: firebase.database.ServerValue.TIMESTAMP,
            rejectReason: reason || 'user_rejected'
        })
        .then(() => {
            console.log("Davet ret durumu güncellendi");
            showNotification('info', 'Davet Reddedildi', 'Oda daveti reddedildi.');
        })
        .catch(error => {
            console.error("Davet ret durumu güncellenirken hata:", error);
            showNotification('info', 'Davet Reddedildi', 'Davet reddedildi ancak durum güncellenirken bir sorun oluştu.');
        });
    }
    
    // İlgili bildirimleri temizle
    function clearRelatedNotifications(inviteId) {
        // Bildirim panelindeki ilgili bildirimleri temizle
        const notifications = document.querySelectorAll(`.notification[data-notification-id="${inviteId}"]`);
        notifications.forEach(notification => {
            notification.classList.add('notification-closing');
            setTimeout(() => {
                if (document.contains(notification)) {
                    notification.remove();
                }
            }, 300);
        });
    }
    
    // Davet bildirimi stilleri ekle
    function addInvitationStyles() {
        // Stil elemanı kontrol et
        let styleElement = document.getElementById('invitation-styles');
        if (styleElement) return; // Zaten varsa tekrar ekleme
        
        styleElement = document.createElement('style');
        styleElement.id = 'invitation-styles';
        document.head.appendChild(styleElement);
        
        styleElement.textContent = `
            .invitation-notification {
                border-left-color: #ff9800;
            }
            
            .invitation-notification .notification-actions {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                padding: 0 15px 12px;
            }
            
            .invitation-notification .btn-reject {
                padding: 6px 12px;
                border: 1px solid #dc3545;
                background-color: transparent;
                color: #dc3545;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .invitation-notification .btn-reject:hover {
                background-color: #dc3545;
                color: white;
            }
            
            .invitation-notification .btn-primary {
                padding: 6px 12px;
                background-color: #4a6cf7;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .invitation-notification .btn-primary:hover {
                background-color: #3a5ce6;
            }
            
            /* Karanlık tema uyumluluğu */
            .dark-theme .invitation-notification .btn-reject {
                border-color: #e57373;
                color: #e57373;
            }
            
            .dark-theme .invitation-notification .btn-reject:hover {
                background-color: #e57373;
                color: #1a1a1a;
            }
            
            .dark-theme .invitation-notification .btn-primary {
                background-color: #5a72ed;
            }
            
            .dark-theme .invitation-notification .btn-primary:hover {
                background-color: #4a62dd;
            }
        `;
    }
    
    // Oda oturumunu kaydet
    function saveRoomSession(roomId, roomName) {
        try {
            const roomData = {
                roomId: roomId,
                roomName: roomName,
                timestamp: Date.now()
            };
            localStorage.setItem('currentRoomSession', JSON.stringify(roomData));
            console.log("Oda oturumu kaydedildi:", roomData);
        } catch (error) {
            console.error("Oda oturumu kaydedilirken hata:", error);
        }
    }
    
    // Oda oturumunu temizle
    function clearRoomSession() {
        try {
            localStorage.removeItem('currentRoomSession');
            console.log("Oda oturumu temizlendi");
        } catch (error) {
            console.error("Oda oturumu temizlenirken hata:", error);
        }
    }
});

// Bildirim stillerini ekle
function applyNotificationStyles() {
    // Varolan stil elemanını kontrol et
    let styleElement = document.getElementById('notification-styles');
    
    // Yoksa yeni oluştur
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'notification-styles';
        document.head.appendChild(styleElement);
    }
    
    // CSS stillerini tanımla
    styleElement.textContent = `
        /* Notification stilleri */
        .notification-container {
            position: fixed !important;
            top: 20px !important;
            right: 20px !important;
            left: auto !important;
            bottom: auto !important;
            z-index: 10001 !important;
            width: auto !important;
            max-width: 350px !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 10px !important;
            pointer-events: none !important;
            transform: none !important;
        }
        
        .notification {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            margin-bottom: 10px;
            overflow: hidden;
            pointer-events: auto;
            max-width: 100%;
            animation: notification-slide-in 0.4s ease-out forwards;
            transform-origin: center right;
            border-left: 4px solid #4a6cf7;
        }
        
        .notification-info {
            border-left-color: #4a6cf7;
        }
        
        .notification-success {
            border-left-color: #10b981;
        }
        
        .notification-warning {
            border-left-color: #f59e0b;
        }
        
        .notification-error {
            border-left-color: #ef4444;
        }
        
        .notification-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 15px;
            background-color: rgba(0, 0, 0, 0.03);
            border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }
        
        .notification-header h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: #333;
        }
        
        .notification-close {
            background: none;
            border: none;
            color: #999;
            cursor: pointer;
            padding: 5px;
            margin: -5px;
            transition: color 0.2s;
        }
        
        .notification-close:hover {
            color: #333;
        }
        
        .notification-content {
            padding: 12px 15px;
            color: #555;
            font-size: 14px;
        }
        
        .notification-content p {
            margin: 0;
            line-height: 1.5;
        }
        
        .notification-actions {
            display: flex;
            justify-content: flex-end;
            padding: 0 15px 12px;
            gap: 10px;
        }
        
        .notification-action {
            background-color: rgb(75, 33, 56);
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
            font-weight: 500;
        }
        
        .notification-action:hover {
            background-color: rgba(75, 33, 56, 0.8);
            transform: translateY(-2px);
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .notification-reject {
            background-color: transparent;
            color: #dc3545;
            border: 1px solid #dc3545;
            border-radius: 4px;
            padding: 7px 15px;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
            font-weight: 500;
        }
        
        .notification-reject:hover {
            background-color: #dc3545;
            color: white;
        }
        
        .notification-closing {
            animation: notification-slide-out 0.3s ease-in forwards;
        }
        
        .invitation-notification {
            border-left-color: #ff9800;
            animation: notification-pulse 2s infinite;
        }
        
        @keyframes notification-pulse {
            0% {
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            50% {
                box-shadow: 0 4px 20px rgba(255, 152, 0, 0.4);
            }
            100% {
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
        }
        
        @keyframes notification-slide-in {
            0% {
                transform: translateX(100%);
                opacity: 0;
            }
            100% {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes notification-slide-out {
            0% {
                transform: translateX(0);
                opacity: 1;
            }
            100% {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        .timer-notification {
            background-color: rgba(0, 0, 0, 0.8) !important;
            color: white !important;
            padding: 12px 20px !important;
            border-radius: 8px !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
            animation: fadeInOut 5s forwards !important;
            font-size: 14px !important;
            text-align: center !important;
            pointer-events: none !important;
            margin-bottom: 10px !important;
        }
        
        .dark-theme .notification {
            background-color: #2d3748;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        
        .dark-theme .notification-header {
            background-color: rgba(0, 0, 0, 0.2);
            border-bottom-color: rgba(255, 255, 255, 0.1);
        }
        
        .dark-theme .notification-header h3 {
            color: #e2e8f0;
        }
        
        .dark-theme .notification-close {
            color: #a0aec0;
        }
        
        .dark-theme .notification-close:hover {
            color: #e2e8f0;
        }
        
        .dark-theme .notification-content {
            color: #cbd5e0;
        }
        
        .dark-theme .notification-action {
            background-color: #7b5a86;
        }
        
        .dark-theme .notification-action:hover {
            background-color: #9370db;
        }
        
        .dark-theme .notification-reject {
            border-color: #e57373;
            color: #e57373;
        }
        
        .dark-theme .notification-reject:hover {
            background-color: #e57373;
            color: #2d3748;
        }
        
        .dark-theme .timer-notification {
            background-color: rgba(255, 255, 255, 0.15) !important;
        }
        
        /* Timer renk düzeltmesi */
        .dark-theme .timer-display {
            color: #e74c3c !important;
        }
        
        .dark-theme .timer-fullscreen .timer-display {
            color: #e74c3c !important;
        }

        @keyframes fadeInOut {
            0% { opacity: 0; transform: translateY(-20px); }
            10% { opacity: 1; transform: translateY(0); }
            90% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-20px); }
        }
    `;
    
    console.log("Bildirim stilleri yüklendi");
}

// DOM yüklendiğinde bildirimleri başlat
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM yüklendi - Bildirim sistemleri başlatılıyor");
    
    // Bildirim konteynerini oluştur
    let container = document.querySelector('.notification-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);
        console.log("Bildirim konteyneri oluşturuldu");
    }
    
    // Bildirim stillerini ekle
    applyNotificationStyles();
    
    // Popup stillerini ekle
    if (typeof applyPopupStyles === 'function') {
        applyPopupStyles();
    }
    
    // Arkadaş listesi stillerini ekle
    if (typeof applyFriendListStyles === 'function') {
        applyFriendListStyles();
    }
    
    // Davet bildirimi stillerini ekle
    if (typeof addInvitationStyles === 'function') {
        addInvitationStyles();
    }
    
    // Bekleyen davetler stillerini ekle
    if (typeof addPendingInvitesStyles === 'function') {
        addPendingInvitesStyles();
    }
    
    // Kaydedilmiş sürekli bildirimler konteynerini oluştur
    loadSavedPendingInvites();
});

// Kaydedilmiş bekleyen davetleri yükle
function loadSavedPendingInvites() {
    // Kullanıcı giriş yapmışsa işleme devam et
    if (!firebase.auth().currentUser) {
        console.log("Kullanıcı giriş yapmamış, davetler yüklenemiyor");
        return;
    }
    
    const currentUserId = firebase.auth().currentUser.uid;
    console.log("Kullanıcı için kaydedilmiş davetleri yükleme:", currentUserId);
    
    // İşlenmiş davetleri al (lokalde kaydedilmiş)
    const processedInvites = JSON.parse(localStorage.getItem('processedInvites') || '{}');
    
    // Arkadaş listesini al
    firebase.database().ref(`users/${currentUserId}/friends`).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                console.log("Arkadaş listesi bulunamadı, davetler yüklenemiyor");
                return;
            }
            
            const friends = Object.keys(snapshot.val());
            console.log("Kullanıcının arkadaşları:", friends);
            
            // Her bir arkadaşın davet listesini kontrol et
            const promises = friends.map(friendId => {
                return firebase.database().ref(`users/${friendId}/sentInvites/${currentUserId}`)
                    .once('value')
                    .then(invitesSnapshot => {
                        if (!invitesSnapshot.exists()) return [];
                        
                        const invites = invitesSnapshot.val();
                        const pendingInvites = [];
                        
                        // Bekleyen davetleri bul
                        Object.keys(invites).forEach(inviteId => {
                            const invite = invites[inviteId];
                            // Durum pending ise ve daha önce işlenmemişse ekle
                            if (invite.status === 'pending' && 
                                (!processedInvites[inviteId] || 
                                 (processedInvites[inviteId] !== 'accepted' && 
                                  processedInvites[inviteId] !== 'rejected'))) {
                                pendingInvites.push({
                                    invite: invite,
                                    inviteId: inviteId,
                                    friendId: friendId
                                });
                            }
                        });
                        
                        return pendingInvites;
                    })
                    .catch(error => {
                        console.error(`${friendId} için davetler alınamadı:`, error);
                        return [];
                    });
            });
            
            // Tüm arkadaşlardan gelen bekleyen davetleri topla
            Promise.all(promises)
                .then(results => {
                    // Tüm davetleri düzleştir
                    const allPendingInvites = [].concat(...results);
                    
                    console.log(`${allPendingInvites.length} bekleyen davet bulundu`);
                    
                    // Davetleri göster
                    if (allPendingInvites.length > 0) {
                        // Kalıcı davet konteynerı oluştur
                        let inviteListContainer = document.getElementById('pendingInvitesContainer');
                        if (!inviteListContainer) {
                            inviteListContainer = document.createElement('div');
                            inviteListContainer.id = 'pendingInvitesContainer';
                            inviteListContainer.className = 'pending-invites-container';
                            document.body.appendChild(inviteListContainer);
                            
                            // Konteyner stillerini ekle
                            if (typeof addPendingInvitesStyles === 'function') {
                                addPendingInvitesStyles();
                            }
                        }
                        
                        // Her bekleyen daveti ekle
                        allPendingInvites.forEach(item => {
                            const { invite, inviteId, friendId } = item;
                            
                            // Oda detaylarını kontrol et
                            if (invite.subType === 'room_invite') {
                                // Oda hala aktif mi kontrol et
                                firebase.database().ref(`rooms/active_workrooms/${invite.roomId}`).once('value')
                                    .then(roomSnapshot => {
                                        if (!roomSnapshot.exists()) {
                                            console.log("Davet edilen oda artık mevcut değil:", invite.roomId);
                                            // Bildirimi otomatik reddet
                                            const processedInvites = JSON.parse(localStorage.getItem('processedInvites') || '{}');
                                            processedInvites[inviteId] = 'rejected';
                                            localStorage.setItem('processedInvites', JSON.stringify(processedInvites));
                                            return;
                                        }
                                        
                                        // Mesajı oluştur
                                        const message = `${invite.fromName} sizi "${invite.roomName}" odasına davet ediyor.`;
                                        
                                        // Aynı davetin daha önce eklenip eklenmediğini kontrol et
                                        const existingInvite = document.querySelector(`.invite-item[data-invite-id="${inviteId}"]`);
                                        if (existingInvite) {
                                            console.log("Bu davet zaten listede gösteriliyor:", inviteId);
                                            return;
                                        }
                                        
                                        // Davet öğesi oluştur
                                        const inviteItem = document.createElement('div');
                                        inviteItem.className = 'invite-item';
                                        inviteItem.dataset.inviteId = inviteId;
                                        inviteItem.dataset.friendId = friendId;
                                        
                                        inviteItem.innerHTML = `
                                            <div class="invite-content">
                                                <div class="invite-info">
                                                    <p class="invite-message">${message}</p>
                                                    <p class="invite-time">${new Date(invite.timestamp).toLocaleTimeString()}</p>
                                                </div>
                                                <div class="invite-actions">
                                                    <button class="btn-reject invite-reject">Reddet</button>
                                                    <button class="btn-primary invite-accept">Kabul Et</button>
                                                </div>
                                            </div>
                                        `;
                                        
                                        // Davet öğesini konteynerın başına ekle
                                        inviteListContainer.prepend(inviteItem);
                                        
                                        // Butonlara olay dinleyicileri ekle
                                        inviteItem.querySelector('.invite-reject').addEventListener('click', function() {
                                            rejectInvitation(invite, inviteId, friendId, null, inviteItem);
                                        });
                                        
                                        inviteItem.querySelector('.invite-accept').addEventListener('click', function() {
                                            acceptInvitation(invite, inviteId, friendId, inviteItem);
                                        });
                                    })
                                    .catch(error => {
                                        console.error("Oda kontrolü sırasında hata:", error);
                                    });
                            }
                        });
                    }
                })
                .catch(error => {
                    console.error("Bekleyen davetler yüklenirken hata:", error);
                });
        })
        .catch(error => {
            console.error("Arkadaş listesi alınamadı:", error);
        });
}

// Bildirim konteynerinin var olduğundan emin ol
function ensureNotificationContainer() {
    let container = document.querySelector('.notification-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);
        console.log("Bildirim konteyneri oluşturuldu");
    }
}

// Bildirim sesi çal
function playNotificationSound() {
    try {
        // Ses çalma denemesi - belirlenen ses dosyası
        const audio = new Audio('/assets/sounds/notification.mp3');
        audio.volume = 0.5;  // Ses düzeyini ayarla
        
        // Ses çalma başarısız olursa
        audio.onerror = function() {
            console.log("Birincil ses dosyası yüklenemedi, alternatif ses kullanılacak");
            try {
                // Alternatif olan Browser API'sini kullan
                if (typeof AudioContext !== "undefined" || typeof webkitAudioContext !== "undefined") {
                    const audioContext = new (AudioContext || webkitAudioContext)();
                    const oscillator = audioContext.createOscillator();
                    oscillator.type = "sine";
                    oscillator.frequency.setValueAtTime(587.33, audioContext.currentTime); // D5 nota
                    oscillator.connect(audioContext.destination);
                    oscillator.start();
                    setTimeout(() => oscillator.stop(), 200);
                } else {
                    console.log("AudioContext desteklenmiyor");
                }
            } catch (backupError) {
                console.log("Alternatif ses de çalınamadı:", backupError);
            }
        };
        
        // Ses dosyasını çal
        audio.play().catch(e => {
            console.log("Ses çalınamadı:", e);
            // AutoPlay politikaları engellediğinde alternatif çözüm
            if (e.name === "NotAllowedError") {
                console.log("Otomatik ses çalma engellendi - kullanıcı etkileşimi gerekiyor");
            }
        });
    } catch (error) {
        console.log("Bildirim sesi çalınamadı:", error);
    }
} 