// Kimlik doğrulama kontrolü
document.addEventListener('DOMContentLoaded', function() {
    // Login sayfasında değilsek kimlik doğrulama kontrolü yap
    if (!window.location.pathname.includes('login.html')) {
        console.log("Kimlik doğrulama kontrolü yapılıyor...");
        
        // Firebase yüklendiyse
        if (typeof firebase !== 'undefined' && firebase.app) {
            // Kullanıcı oturumunu kontrol et
            firebase.auth().onAuthStateChanged(function(user) {
                if (!user) {
                    // Kullanıcı giriş yapmamışsa login sayfasına yönlendir
                    console.log("Kullanıcı giriş yapmamış, login sayfasına yönlendiriliyor...");
                    window.location.href = "login.html";
                } else {
                    console.log("Kullanıcı giriş yapmış, sayfada kalınıyor...");
                }
            });
        } else {
            console.error("Firebase yüklenemedi!");
            alert("Sistem yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.");
        }
    }
}); 