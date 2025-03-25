// Kullanıcı adını senkronize etme işlemleri
document.addEventListener('DOMContentLoaded', function() {
    // Firebase yüklendi mi kontrol edelim
    if (typeof firebase === 'undefined' || !firebase.app) {
        console.error("user-name-sync.js: Firebase yüklenemedi!");
        return;
    }

    // Kullanıcı oturumunu kontrol edelim
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            console.log("user-name-sync.js: Kullanıcı oturumu açık:", user.email);
            
            // Kullanıcı referansını alın
            const userRef = firebase.database().ref('users/' + user.uid);
            
            // İlk yükleme için kullanıcı verilerini alın
            userRef.once('value').then(function(snapshot) {
                const userData = snapshot.val();
                if (userData) {
                    console.log("user-name-sync.js: Kullanıcı verileri yüklendi:", userData.name);
                    
                    // Kullanıcı adını tüm ilgili yerlerde güncelle
                    updateUserNameElements(userData.name);
                    
                    // Kullanıcı avatarını güncelle (eğer varsa)
                    if (userData.profileImage) {
                        updateAvatars(userData.profileImage);
                    } else {
                        // Varsayılan avatar için
                        updateAvatars('assets/images/default-avatar.png');
                    }
                }
            });
            
            // Kullanıcı verilerindeki değişiklikleri dinleyin
            userRef.on('value', function(snapshot) {
                const userData = snapshot.val();
                if (userData) {
                    console.log("user-name-sync.js: Kullanıcı verileri güncellendi:", userData.name);
                    
                    // Kullanıcı adını tüm ilgili yerlerde güncelle
                    updateUserNameElements(userData.name);
                    
                    // Kullanıcı avatarını güncelle (eğer varsa)
                    if (userData.profileImage) {
                        updateAvatars(userData.profileImage);
                    } else {
                        // Varsayılan avatar için
                        updateAvatars('assets/images/default-avatar.png');
                    }
                }
            });
        }
    });
    
    // Kullanıcı adını tüm sayfalarda güncelle
    function updateUserNameElements(userName) {
        // Sidebardaki kullanıcı adını güncelle
        const userNameElements = document.querySelectorAll('.user-name');
        userNameElements.forEach(element => {
            element.textContent = userName;
        });
        
        // Profil sayfasındaki kullanıcı adını güncelle
        const profileUserNameElement = document.getElementById('profileUserName');
        if (profileUserNameElement) {
            profileUserNameElement.textContent = userName;
        }
    }
    
    // Kullanıcı avatarını tüm sayfalarda güncelle
    function updateAvatars(user) {
        const sidebarAvatars = document.querySelectorAll('.sidebar .user-avatar');
        let profileImage = null;
        
        // Kullanıcının profil resmini belirle
        if (user && user.photoURL) {
            profileImage = user.photoURL;
            localStorage.setItem('userProfileImage', profileImage);
        } else if (localStorage.getItem('userProfileImage')) {
            // localStorage'dan yükle
            profileImage = localStorage.getItem('userProfileImage');
        }
        
        sidebarAvatars.forEach(avatar => {
            // Mevcut içeriği temizle
            avatar.innerHTML = '';
            
            // Kullanıcının profil resmi varsa göster, yoksa ikon göster
            if (profileImage) {
                const img = document.createElement('img');
                img.classList.add('avatar-image-small');
                img.src = profileImage;
                img.alt = user ? (user.displayName || 'Kullanıcı') : 'Kullanıcı';
                img.style.width = "100%";
                img.style.height = "100%";
                img.style.objectFit = "cover";
                img.style.zIndex = "10";
                img.onerror = function() {
                    // Resim yüklenemezse varsayılan ikonu göster
                    avatar.innerHTML = '';
                    const icon = document.createElement('i');
                    icon.className = 'fas fa-user';
                    avatar.appendChild(icon);
                    // Hatalı resmi localStorage'dan temizle
                    localStorage.removeItem('userProfileImage');
                };
                avatar.appendChild(img);
            } else {
                // Varsayılan ikon
                const icon = document.createElement('i');
                icon.className = 'fas fa-user';
                avatar.appendChild(icon);
            }
        });
    }
}); 