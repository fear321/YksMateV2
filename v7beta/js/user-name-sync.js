// Kullanıcı adını senkronize etme işlemleri
document.addEventListener('DOMContentLoaded', function() {
    // Firebase'den kullanıcı bilgilerini alma ve userName elementine uygulama
    function updateUserName() {
        const currentUser = firebase.auth().currentUser;
        if (currentUser) {
            firebase.database().ref('users/' + currentUser.uid).once('value')
                .then((snapshot) => {
                    const userData = snapshot.val();
                    if (userData && userData.name) {
                        // Tüm userName ID'li elementleri güncelle
                        const userNameElements = document.querySelectorAll('#userName');
                        userNameElements.forEach(element => {
                            element.textContent = userData.name;
                        });
                        
                        // profileUserName elementini güncelle
                        const profileUserNameElement = document.getElementById('profileUserName');
                        if (profileUserNameElement) {
                            profileUserNameElement.textContent = userData.name;
                            console.log("updateUserName: profileUserName güncellendi:", userData.name);
                        }
                        
                        // Index sayfasındaki welcomeUserName ID'li elementi güncelle
                        const welcomeUserNameElement = document.getElementById('welcomeUserName');
                        if (welcomeUserNameElement) {
                            welcomeUserNameElement.textContent = userData.name;
                        }
                    }
                })
                .catch((error) => {
                    console.error("Kullanıcı adı güncellenirken hata:", error);
                });
        }
    }

    // Firebase realtime veritabanı değişikliklerini dinle
    function listenForNameChanges() {
        const currentUser = firebase.auth().currentUser;
        if (currentUser) {
            // Kullanıcının name alanını dinle
            firebase.database().ref('users/' + currentUser.uid + '/name').on('value', (snapshot) => {
                const newName = snapshot.val();
                if (newName) {
                    console.log("listenForNameChanges: Veritabanında isim değişikliği algılandı:", newName);
                    
                    // Tüm userName ID'li elementleri güncelle
                    const userNameElements = document.querySelectorAll('#userName');
                    userNameElements.forEach(element => {
                        element.textContent = newName;
                    });
                    
                    // profileUserName elementini güncelle
                    const profileUserNameElement = document.getElementById('profileUserName');
                    if (profileUserNameElement) {
                        profileUserNameElement.textContent = newName;
                        console.log("listenForNameChanges: profileUserName güncellendi:", newName);
                    }
                    
                    // Index sayfasındaki welcomeUserName ID'li elementi güncelle
                    const welcomeUserNameElement = document.getElementById('welcomeUserName');
                    if (welcomeUserNameElement) {
                        welcomeUserNameElement.textContent = newName;
                    }
                }
            });
        }
    }

    // Sayfa yüklendiğinde kullanıcı adını güncelle
    updateUserName();
    
    // Firebase oturum durumunu dinle
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            console.log("user-name-sync: Kullanıcı oturum açtı, veritabanı dinlemesi başlatılıyor");
            // Kullanıcı giriş yapmışsa, adını güncelle ve değişiklikleri dinle
            updateUserName();
            listenForNameChanges();
        }
    });
}); 