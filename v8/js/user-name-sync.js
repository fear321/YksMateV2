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
        
        sidebarAvatars.forEach(avatar => {
            // Mevcut içeriği temizle
            avatar.innerHTML = '';
            
            // Kullanıcının profil resmi varsa göster, yoksa ikon göster
            if (user && user.photoURL) {
                const img = document.createElement('img');
                img.classList.add('avatar-image-small');
                img.src = user.photoURL;
                img.alt = user.displayName || 'Kullanıcı';
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