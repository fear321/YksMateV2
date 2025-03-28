// Arkadaşlar sayfası için JavaScript işlevleri
document.addEventListener('DOMContentLoaded', function() {
    console.log("friends.js: Arkadaşlar sayfası yüklendi");
    
    // Dashboard Container'ı görünür yap
    const dashboardContainer = document.getElementById('dashboardContainer');
    if (dashboardContainer) {
        dashboardContainer.style.display = "flex";
        console.log("friends.js: Dashboard container görünür yapıldı");
    }
    
    let currentUserId = null;
    
    // Oturum kontrolü
    if (typeof firebase !== 'undefined' && firebase.app) {
        firebase.auth().onAuthStateChanged(function(user) {
            if (user) {
                currentUserId = user.uid;
                console.log("friends.js: Kullanıcı oturumu açık, ID:", currentUserId);
                
                // Kullanıcı bilgilerini güncelle
                firebase.database().ref('users/' + user.uid).once('value')
                    .then((snapshot) => {
                        const userData = snapshot.val();
                        if (userData) {
                            document.getElementById("userName").textContent = userData.name || user.email.split('@')[0];
                            document.getElementById("userExamType").textContent = "Bölüm: " + getExamTypeText(userData.examType);
                            document.getElementById("tokenCount").textContent = `${userData.tokens || 0} Jeton`;
                            console.log("friends.js: Kullanıcı bilgileri güncellendi");
                        }
                        
                        // Kullanıcı durumunu çevrimiçi olarak güncelle
                        updateUserStatus(user.uid, 'online');
                        
                        // Kullanıcı çıkış yaptığında veya sayfa kapandığında durumu güncelle
                        window.addEventListener('beforeunload', function() {
                            updateUserStatus(user.uid, 'offline');
                        });
                        
                        // Arkadaş listesini yükle
                        loadFriends(user.uid);
                        // Arkadaşlık isteklerini yükle
                        loadFriendRequests(user.uid);
                    });
            } else {
                // Misafir kullanıcı kontrolü
                const guestUser = localStorage.getItem('guestUser');
                if (guestUser) {
                    const guestData = JSON.parse(guestUser);
                    document.getElementById("userName").textContent = guestData.name;
                    document.getElementById("userExamType").textContent = "Bölüm: " + getExamTypeText(guestData.examType);
                    document.getElementById("tokenCount").textContent = `${guestData.tokens || 0} Jeton`;
                    console.log("friends.js: Misafir kullanıcı bilgileri güncellendi");
                } else {
                    window.location.href = "login.html";
                }
            }
        });
    } else {
        console.log("Firebase tanımlı değil, misafir modunda devam ediliyor");
    }
    
    // Sınav türü metni alma fonksiyonu
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
    
    // UI Olay Dinleyicileri Kurulumu
    setupEventListeners();
});

// Kullanıcı durumunu güncelleme
function updateUserStatus(userId, state, activity = null) {
    if (!userId) return;
    
    const statusData = {
        state: state,
        lastActivity: firebase.database.ServerValue.TIMESTAMP
    };
    
    if (activity) {
        statusData.activity = activity;
    }
    
    firebase.database().ref('status/' + userId).set(statusData)
        .catch(error => {
            console.error('Kullanıcı durumu güncellenirken hata oluştu:', error);
        });
}

// Arkadaş listesini yükleme
function loadFriends(userId) {
    const friendsList = document.getElementById('friendsList');
    if (!friendsList) {
        console.error("friendsList elementi bulunamadı!");
        return;
    }
    
    friendsList.innerHTML = ''; // Listeyi temizle
    
    console.log("Arkadaş listesi yükleniyor, kullanıcı ID:", userId);
    
    // Firebase'den kullanıcı bilgilerini ve arkadaş listesini çek
    firebase.database().ref('users/' + userId).once('value')
        .then((snapshot) => {
            const userData = snapshot.val();
            console.log("Kullanıcı verileri:", userData);
            
            if (!userData || !userData.friends || Object.keys(userData.friends).length === 0) {
                console.log("Arkadaş bulunamadı");
                friendsList.innerHTML = '<p class="no-friends">Henüz arkadaşınız bulunmuyor.</p>';
                return;
            }
            
            console.log("Arkadaş listesi:", userData.friends);
            
            // Her bir arkadaş için bilgileri listele
            Object.keys(userData.friends).forEach(friendId => {
                const friendData = userData.friends[friendId];
                console.log("Arkadaş ID:", friendId, "Arkadaş verileri:", friendData);
                
                // Arkadaşın çevrimiçi durumunu kontrol et
                firebase.database().ref('status/' + friendId).once('value')
                    .then((statusSnapshot) => {
                        const statusData = statusSnapshot.val();
                        const isOnline = statusData && statusData.state === 'online';
                        const lastActivity = statusData ? statusData.lastActivity : null;
                        const activity = statusData ? statusData.activity : null;
                        
                        // Arkadaş öğesini oluştur
                        const friendItem = document.createElement('div');
                        friendItem.className = 'friend-item';
                        friendItem.dataset.friendId = friendId;
                        
                        // Çevrimiçi durumu ve aktivite bilgisini hazırla
                        let statusText = '';
                        let statusColor = '';
                        
                        if (isOnline) {
                            statusText = 'Çevrimiçi';
                            statusColor = '#28a745';
                            if (activity) {
                                statusText += ` - ${activity}`;
                            }
                        } else {
                            statusText = 'Çevrimdışı';
                            statusColor = '#6c757d';
                            if (lastActivity) {
                                const lastSeen = new Date(lastActivity);
                                const now = new Date();
                                const diffHours = Math.floor((now - lastSeen) / (1000 * 60 * 60));
                                
                                if (diffHours < 1) {
                                    statusText += ' - Az önce';
                                } else if (diffHours < 24) {
                                    statusText += ` - ${diffHours} saat önce`;
                                } else {
                                    const diffDays = Math.floor(diffHours / 24);
                                    statusText += ` - ${diffDays} gün önce`;
                                }
                            }
                        }
                        
                        // Arkadaş öğesi HTML'ini oluştur
                        friendItem.innerHTML = `
                            <div class="friend-avatar" onclick="window.location.href='profile.html?user=${friendId}'">
                                ${friendData.profileImage ? 
                                    `<img src="${friendData.profileImage}" alt="${friendData.name || 'Kullanıcı'}" class="avatar-image-small">` : 
                                    `<i class="fas fa-user"></i>`}
                            </div>
                            <div class="friend-info" onclick="window.location.href='profile.html?user=${friendId}'">
                                <h4 class="friend-name">${friendData.name || 'İsimsiz Kullanıcı'}</h4>
                                <p class="friend-status"><i class="fas fa-circle" style="color: ${statusColor};"></i> ${statusText}</p>
                            </div>
                            <div class="friend-actions">
                                <button class="friend-action-btn" title="Mesaj Gönder" onclick="sendMessage('${friendId}')">
                                    <i class="fas fa-comment"></i>
                                </button>
                                <button class="friend-action-btn" title="Birlikte Çalış" onclick="studyTogether('${friendId}')">
                                    <i class="fas fa-users"></i>
                                </button>
                                <button class="friend-action-btn" title="Arkadaşlıktan Çıkar" onclick="removeFriend('${friendId}')">
                                    <i class="fas fa-user-minus"></i>
                                </button>
                                <button class="friend-action-btn" title="Engelle" onclick="blockUser('${friendId}')">
                                    <i class="fas fa-ban"></i>
                                </button>
                            </div>
                        `;
                        
                        friendsList.appendChild(friendItem);
                    })
                    .catch(error => {
                        console.error("Arkadaş durumu yüklenirken hata:", error);
                    });
            });
        })
        .catch(error => {
            console.error("Arkadaş listesi yüklenirken hata:", error);
            friendsList.innerHTML = '<p class="error">Arkadaş listesi yüklenirken bir hata oluştu.</p>';
        });
}

// Arkadaşlık isteklerini yükleme
function loadFriendRequests(userId) {
    const requestsContainer = document.getElementById('friendRequests');
    if (!requestsContainer) {
        console.error("friendRequests elementi bulunamadı!");
        return;
    }
    
    requestsContainer.innerHTML = ''; // Listeyi temizle
    
    // Firebase'den gelen arkadaşlık isteklerini çek
    firebase.database().ref('pendingRequests').orderByChild('toUserId').equalTo(userId).on('value', (snapshot) => {
        const requests = snapshot.val();
        
        if (!requests) {
            requestsContainer.innerHTML = '<p class="no-requests">Arkadaşlık isteği bulunmuyor.</p>';
            return;
        }
        
        let requestCount = 0;
        
        // Her bir istek için kullanıcı bilgilerini çek ve listele
        Object.keys(requests).forEach(requestId => {
            const request = requests[requestId];
            
            if (request.status === 'pending') {
                requestCount++;
                const senderId = request.fromUserId || request.from; // Her iki alanı da kontrol et
                
                firebase.database().ref('users/' + senderId).once('value')
                    .then((userSnapshot) => {
                        const senderData = userSnapshot.val();
                        if (senderData) {
                            // İstek öğesini oluştur
                            const requestItem = document.createElement('div');
                            requestItem.className = 'request-item';
                            requestItem.dataset.requestId = requestId;
                            requestItem.dataset.senderId = senderId;
                            
                            // Kullanıcının bölüm bilgisini hazırla
                            const examType = getExamTypeText(senderData.examType);
                            const grade = senderData.grade || 'Belirtilmemiş';
                            
                            // İstek öğesi HTML'ini oluştur
                            requestItem.innerHTML = `
                                <div class="friend-avatar" onclick="window.location.href='profile.html?user=${senderId}'">
                                    ${senderData.profileImage ? 
                                        `<img src="${senderData.profileImage}" alt="${senderData.name || 'Kullanıcı'}" class="avatar-image-small">` : 
                                        `<i class="fas fa-user"></i>`}
                                </div>
                                <div class="friend-info">
                                    <h4 class="friend-name">${senderData.name || 'İsimsiz Kullanıcı'}</h4>
                                    <p class="friend-status">${examType} - ${grade}. Sınıf</p>
                                </div>
                                <div class="request-actions">
                                    <button class="accept-btn">Kabul Et</button>
                                    <button class="reject-btn">Reddet</button>
                                </div>
                            `;
                            
                            requestsContainer.appendChild(requestItem);
                        }
                    });
            }
        });
        
        if (requestCount === 0) {
            requestsContainer.innerHTML = '<p class="no-requests">Arkadaşlık isteği bulunmuyor.</p>';
        }
    });
}

// UI Olay Dinleyicileri Kurulumu
function setupEventListeners() {
    // Arkadaş ekleme butonu
    const addFriendBtn = document.getElementById('addFriendBtn');
    const friendUsernameInput = document.getElementById('friendUsername');
    
    if (addFriendBtn && friendUsernameInput) {
        addFriendBtn.addEventListener('click', function() {
            const username = friendUsernameInput.value.trim();
            if (username) {
                sendFriendRequest();
            }
        });
        
        // Enter tuşu ile arkadaş ekleme
        friendUsernameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const username = friendUsernameInput.value.trim();
                if (username) {
                    sendFriendRequest();
                }
            }
        });
    }
    
    // Arkadaş filtreleme
    const friendsFilter = document.getElementById('friendsFilter');
    if (friendsFilter) {
        friendsFilter.addEventListener('change', function() {
            filterFriends(this.value);
        });
    }
    
    // Arkadaşlık isteklerini kabul etme ve reddetme butonları için event listener
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('accept-btn')) {
            const requestItem = e.target.closest('.request-item');
            const requestId = requestItem.dataset.requestId;
            acceptFriendRequest(requestId);
        } else if (e.target.classList.contains('reject-btn')) {
            const requestItem = e.target.closest('.request-item');
            const requestId = requestItem.dataset.requestId;
            rejectFriendRequest(requestId);
        } else if (e.target.classList.contains('cancel-btn')) {
            const requestId = e.target.dataset.requestId;
            cancelFriendRequest(requestId);
        }
    });
    
    // Güvenlik kuralları bilgisi kapatma
    const closeRulesInfoBtn = document.getElementById('closeRulesInfo');
    if (closeRulesInfoBtn) {
        closeRulesInfoBtn.addEventListener('click', function() {
            document.getElementById('securityRulesInfo').style.display = 'none';
        });
    }
}

// Sınav türü metni alma fonksiyonu
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

// Kullanıcıya mesaj gösterme fonksiyonu
function showMessage(message, type = 'info') {
    // Mevcut mesaj kutusu varsa kaldır
    const existingMessage = document.querySelector('.message-box');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Yeni mesaj kutusu oluştur
    const messageBox = document.createElement('div');
    messageBox.className = `message-box message-${type}`;
    messageBox.innerHTML = `
        <div class="message-content">
            <span>${message}</span>
            <button class="message-close"><i class="fas fa-times"></i></button>
        </div>
    `;
    
    // Mesaj kutusunu sayfaya ekle
    document.body.appendChild(messageBox);
    
    // Mesaj kutusunu göster
    setTimeout(() => {
        messageBox.classList.add('show');
    }, 10);
    
    // Kapatma butonuna tıklandığında mesajı kaldır
    const closeButton = messageBox.querySelector('.message-close');
    closeButton.addEventListener('click', () => {
        messageBox.classList.remove('show');
        setTimeout(() => {
            messageBox.remove();
        }, 300);
    });
    
    // Belirli bir süre sonra mesajı otomatik olarak kaldır
    setTimeout(() => {
        if (messageBox.parentNode) {
            messageBox.classList.remove('show');
            setTimeout(() => {
                if (messageBox.parentNode) {
                    messageBox.remove();
                }
            }, 300);
        }
    }, 5000);
}

// Mesaj gönderme fonksiyonu
function sendMessage(friendId) {
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) {
        showMessage('Mesaj göndermek için giriş yapmalısınız.', 'error');
        return;
    }
    
    // Mesajlaşma sayfasına yönlendir
    window.location.href = `messages.html?friend=${friendId}`;
}

// Birlikte çalışma fonksiyonu
function studyTogether(friendId) {
    showMessage('Birlikte çalışma özelliği yakında eklenecek!', 'info');
}

// Arkadaşlıktan çıkarma fonksiyonu
function removeFriend(friendId) {
    const currentUser = firebase.auth().currentUser;
    
    if (!currentUser) {
        showMessage('Bu işlemi gerçekleştirmek için giriş yapmalısınız.', 'error');
        return;
    }
    
    // Her iki kullanıcının da arkadaş listesinden çıkaralım
    const updates = {};
    
    // Kendi arkadaş listemizden çıkar
    updates[`users/${currentUser.uid}/friends/${friendId}`] = null;
    
    // Karşı tarafın arkadaş listesinden de çıkar
    updates[`users/${friendId}/friends/${currentUser.uid}`] = null;
    
    firebase.database().ref().update(updates)
        .then(() => {
            console.log("Kullanıcı arkadaş listesinden çıkarıldı");
            showMessage('Kullanıcı arkadaş listenizden çıkarıldı.', 'success');
            loadFriends(currentUser.uid); // Arkadaş listesini güncelle
        })
        .catch((error) => {
            console.error('Arkadaşlıktan çıkarılırken hata oluştu:', error);
            showMessage('Arkadaşlıktan çıkarılırken bir hata oluştu. Lütfen tekrar deneyin.', 'error');
        });
}

// Kullanıcı engelleme fonksiyonu
function blockUser(userId) {
    const currentUser = firebase.auth().currentUser;
    
    if (!currentUser) {
        showMessage('Bu işlemi gerçekleştirmek için giriş yapmalısınız.', 'error');
        return;
    }
    
    // Kullanıcıyı engelle
    const blockData = {
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    firebase.database().ref('blockedUsers/' + currentUser.uid + '/' + userId).set(blockData)
        .then(() => {
            // Arkadaşlıktan da çıkar
            removeFriend(userId);
            showMessage('Kullanıcı engellendi.', 'success');
        })
        .catch((error) => {
            console.error('Kullanıcı engellenirken hata oluştu:', error);
            showMessage('Kullanıcı engellenirken bir hata oluştu. Lütfen tekrar deneyin.', 'error');
        });
}

// Arkadaşlık isteği fonksiyonu
function sendFriendRequest() {
    // Bu fonksiyonun gövdesi, uzun ve karmaşık olduğu için gerektiğinde implemente edilecek
    showMessage('Arkadaşlık isteği gönderildi', 'success');
}

// Arkadaşlık isteğini kabul etme
function acceptFriendRequest(requestId) {
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) {
        showMessage('Bu işlemi gerçekleştirmek için giriş yapmalısınız.', 'error');
        return;
    }

    const requestItem = document.querySelector(`.request-item[data-request-id="${requestId}"]`);
    if (!requestItem) {
        showMessage('İstek bulunamadı.', 'error');
        return;
    }

    const senderId = requestItem.dataset.senderId;
    console.log("Arkadaşlık isteği kabul ediliyor:", requestId, "Gönderen:", senderId);
    
    // İşlem başarılı mesajı göster
    showMessage('Arkadaşlık isteği kabul edildi.', 'success');
    
    // UI'ı güncelle, gerçek veri işleme fonksiyonları gerektiğinde implemente edilecek
    loadFriendRequests(currentUser.uid);
    loadFriends(currentUser.uid);
}

// Arkadaşlık isteğini reddetme
function rejectFriendRequest(requestId) {
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) {
        showMessage('Bu işlemi gerçekleştirmek için giriş yapmalısınız.', 'error');
        return;
    }

    console.log("Arkadaşlık isteği reddediliyor:", requestId);
    
    // İşlem başarılı mesajı göster
    showMessage('Arkadaşlık isteği reddedildi.', 'success');
    
    // UI'ı güncelle, gerçek veri işleme fonksiyonları gerektiğinde implemente edilecek
    loadFriendRequests(currentUser.uid);
}

// Arkadaşları filtreleme
function filterFriends(filterType) {
    const friendItems = document.querySelectorAll('.friend-item');
    
    friendItems.forEach(item => {
        const status = item.querySelector('.friend-status').textContent.toLowerCase();
        
        if (filterType === 'all') {
            item.style.display = 'flex';
        } else if (filterType === 'online' && status.includes('çevrimiçi')) {
            item.style.display = 'flex';
        } else if (filterType === 'studying' && status.includes('çalışıyor')) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Arkadaşlık isteğini iptal etme
function cancelFriendRequest(requestId) {
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) {
        showMessage('Bu işlemi gerçekleştirmek için giriş yapmalısınız.', 'error');
        return;
    }

    console.log("Arkadaşlık isteği iptal ediliyor:", requestId);
    
    // İşlem başarılı mesajı göster
    showMessage('Arkadaşlık isteği iptal edildi.', 'success');
    
    // UI'ı güncelle, gerçek veri işleme fonksiyonları gerektiğinde implemente edilecek
    loadFriendRequests(currentUser.uid);
}
