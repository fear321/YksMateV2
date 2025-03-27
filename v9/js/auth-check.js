// Kimlik doğrulama kontrolü
console.log("auth-check.js yüklendi");

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM yüklendi, oturum kontrolü yapılıyor...");
    
    // Login sayfasında değilsek kimlik doğrulama kontrolü yap
    if (!window.location.pathname.includes('login.html')) {
        console.log("Kimlik doğrulama kontrolü yapılıyor...");
        
        // Firebase yüklendiyse
        if (typeof firebase !== 'undefined' && firebase.app) {
            console.log("Firebase yüklendi");
            
            const currentPage = window.location.pathname.split('/').pop();
            console.log("Şu anki sayfa:", currentPage);
            
            // DashboardContainer'ı bulalım
            const dashboardContainer = document.getElementById('dashboardContainer');
            
            // Birlikte Çalış sayfası için özel kontroller
            if (currentPage === 'work-together.html') {
                console.log("Birlikte Çalış sayfasındayız, container görünür yapılıyor");
                if (dashboardContainer) {
                    dashboardContainer.style.display = "flex";
                }
            }
            
            // Firebase yapılandırması
            const firebaseConfig = {
                apiKey: "AIzaSyCFy-AuA3xLKBKgblFTzJMyoKG9FVK1CAw",
                authDomain: "edu-app-c5a9c.firebaseapp.com",
                projectId: "edu-app-c5a9c",
                storageBucket: "edu-app-c5a9c.appspot.com",
                messagingSenderId: "848633684348",
                appId: "1:848633684348:web:a8cd7e071578d2058a902e",
                measurementId: "G-KRBRL4ZQE3"
            };

            // Firebase'i başlat
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }

            // Auth durumunu dinle
            firebase.auth().onAuthStateChanged(function(user) {
                if (user) {
                    console.log("Kullanıcı giriş yapmış:", user.displayName);
                    
                    // Kullanıcı bilgilerini güncelle
                    updateUser(user);
                    
                    // Kullanıcı adını ve sınav tipini göster
                    const userNameElements = document.querySelectorAll('.user-name');
                    const examTypeElements = document.querySelectorAll('.user-exam-type');
                    
                    const db = firebase.firestore();
                    db.collection('users').doc(user.uid).get().then((doc) => {
                        if (doc.exists) {
                            const data = doc.data();
                            const examType = data.examType || 'Belirtilmemiş';
                            
                            userNameElements.forEach(element => {
                                element.textContent = user.displayName || 'Kullanıcı';
                            });
                            
                            examTypeElements.forEach(element => {
                                element.textContent = examType;
                            });
                        }
                    }).catch((error) => {
                        console.error("Kullanıcı verileri alınamadı:", error);
                    });
                } else {
                    console.log("auth-check.js: Kullanıcı giriş yapmamış.");
                    
                    // Misafir kullanıcı kontrolü
                    const guestUser = localStorage.getItem('guestUser');
                    if (!guestUser) {
                        // Geçerli sayfa login.html veya register.html değilse yönlendir
                        const currentPath = window.location.pathname;
                        if (!currentPath.includes('login.html') && !currentPath.includes('register.html')) {
                            console.log("auth-check.js: Kullanıcı giriş yapmamış, giriş sayfasına yönlendiriliyor...");
                            window.location.href = "login.html";
                        }
                    }
                }
            });
        } else {
            console.error("Firebase yüklenemedi!");
            alert("Sistem yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.");
        }
    }
    
    // Sidebar avatar görüntüsünü güncelle
    function updateSidebarAvatar(profileImage) {
        console.log("auth-check.js: Avatar güncelleniyor:", profileImage);
        
        // ProfileImage'i localStorage'a kaydet
        if (profileImage) {
            localStorage.setItem('userProfileImage', profileImage);
        }
        
        const sidebarAvatarContainers = document.querySelectorAll('.user-avatar');
        sidebarAvatarContainers.forEach(container => {
            // Mevcut içeriği temizle
            container.innerHTML = '';
            
            // Yeni avatar imajını ekle
            if (profileImage) {
                const sidebarAvatar = document.createElement('img');
                sidebarAvatar.src = profileImage;
                sidebarAvatar.alt = "Profil Fotoğrafı";
                sidebarAvatar.className = "avatar-image-small";
                sidebarAvatar.style.width = "100%";
                sidebarAvatar.style.height = "100%";
                sidebarAvatar.style.objectFit = "cover";
                sidebarAvatar.style.zIndex = "10";
                sidebarAvatar.onerror = function() {
                    // Resim yüklenemezse varsayılan ikonu göster
                    container.innerHTML = '';
                    const icon = document.createElement('i');
                    icon.className = 'fas fa-user';
                    container.appendChild(icon);
                };
                container.appendChild(sidebarAvatar);
            } else {
                // Avatar yoksa ikon göster
                const icon = document.createElement('i');
                icon.className = 'fas fa-user';
                container.appendChild(icon);
            }
        });
    }

    // Kullanıcı bilgilerini güncelle
    function updateUser(user) {
        // Kullanıcı avatarını güncelle
        if (typeof updateAvatars === 'function') {
            updateAvatars(user);
        }
        
        // Kullanıcı veritabanında var mı kontrol edelim
        const userRef = firebase.database().ref('users/' + user.uid);
        userRef.once('value').then(function(snapshot) {
            const userData = snapshot.val();
            
            // Kullanıcı yoksa veritabanına ekleyelim
            if (!userData) {
                console.log("auth-check.js: Kullanıcı veritabanında bulunamadı, oluşturuluyor...");
                
                const newUser = {
                    email: user.email,
                    name: user.displayName || user.email.split('@')[0],
                    registrationDate: Date.now(),
                    examType: 'tyt',
                    isPremium: false,
                    tokens: 100,
                    totalExams: 0,
                    totalStudyTime: 0,
                    completedTasks: 0,
                    totalTasks: 0,
                    averageScore: 0,
                    lastLogin: Date.now()
                };
                
                userRef.set(newUser).then(function() {
                    console.log("auth-check.js: Yeni kullanıcı başarıyla oluşturuldu.");
                }).catch(function(error) {
                    console.error("auth-check.js: Yeni kullanıcı oluşturulurken hata:", error);
                });
            } else {
                // Son giriş zamanını güncelle
                userRef.update({
                    lastLogin: Date.now()
                });
            }
            
            // Avatar görüntüsünü yükle
            if (userData && userData.profileImage) {
                updateSidebarAvatar(userData.profileImage);
            }
        });
    }
}); 