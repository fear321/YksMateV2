// Giriş/Kayıt formları arasında geçiş
document.addEventListener('DOMContentLoaded', () => {
    // Firebase yüklenene kadar bekle
    if (typeof firebase !== 'undefined' && firebase.app) {
        initializeAuthListeners();
        
        // Beni Hatırla checkbox'ını varsayılan olarak işaretle
        const rememberMeCheckbox = document.getElementById('rememberMe');
        if (rememberMeCheckbox) {
            rememberMeCheckbox.checked = true;
        }
    } else {
        console.error("Firebase yüklenemedi!");
        alert("Sistem yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.");
    }
});

function initializeAuthListeners() {
    console.log("Auth listeners başlatılıyor...");
    
    // Tab butonları
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', () => {
            // Aktif tab'ı değiştir
            document.querySelector('.tab-btn.active').classList.remove('active');
            button.classList.add('active');
            
            // İlgili formu göster
            const targetTab = button.getAttribute('data-tab');
            document.querySelector('.tab-content.active').classList.remove('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });

    // Giriş butonu işleme
    const loginButton = document.getElementById('loginButton');
    if (loginButton) {
        loginButton.addEventListener('click', async () => {
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const rememberMe = document.getElementById('rememberMe').checked;
            
            if (!email || !password) {
                alert("Lütfen e-posta ve şifre alanlarını doldurun.");
                return;
            }
            
            try {
                // Giriş butonunu devre dışı bırak
                loginButton.disabled = true;
                loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Giriş Yapılıyor...';
                
                if (typeof firebase === 'undefined' || !firebase.auth) {
                    throw new Error("Firebase yüklenemedi!");
                }
                
                // Beni hatırla seçeneğine göre oturum kalıcılığını ayarla
                if (rememberMe) {
                    await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
                    console.log("Kalıcı oturum ayarlandı (LOCAL)");
                } else {
                    await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION);
                    console.log("Geçici oturum ayarlandı (SESSION)");
                }
                
                await firebase.auth().signInWithEmailAndPassword(email, password);
                console.log('Giriş başarılı!');
                
                // Kullanıcı bilgilerini Firestore'dan al
                const user = firebase.auth().currentUser;
                if (user) {
                    try {
                        const doc = await firebase.firestore().collection('users').doc(user.uid).get();
                        if (doc.exists) {
                            const userData = doc.data();
                            // Kullanıcı bilgilerini sessionStorage'a kaydet
                            if (userData.name) sessionStorage.setItem("registerName", userData.name);
                            if (userData.examType) sessionStorage.setItem("registerExamType", userData.examType);
                            console.log("Giriş sırasında kullanıcı bilgileri sessionStorage'a kaydedildi:", userData);
                        }
                    } catch (error) {
                        console.error("Kullanıcı bilgileri alınırken hata:", error);
                    }
                }
                
                // Ana sayfaya yönlendir
                window.location.href = "index.html";
            } catch (error) {
                console.error('Giriş hatası:', error);
                
                // Hata mesajını Türkçeleştir
                let errorMessage = 'Giriş yapılırken bir hata oluştu';
                
                switch(error.code) {
                    case 'auth/user-not-found':
                        errorMessage = 'Bu e-posta adresiyle kayıtlı bir kullanıcı bulunamadı';
                        break;
                    case 'auth/wrong-password':
                        errorMessage = 'Hatalı şifre girdiniz';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'Geçersiz e-posta adresi';
                        break;
                    case 'auth/user-disabled':
                        errorMessage = 'Bu kullanıcı hesabı devre dışı bırakılmış';
                        break;
                    case 'auth/too-many-requests':
                        errorMessage = 'Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin';
                        break;
                    default:
                        errorMessage = error.message;
                }
                
                alert(errorMessage);
            } finally {
                // Giriş butonunu tekrar etkinleştir
                loginButton.disabled = false;
                loginButton.innerHTML = 'Giriş Yap';
            }
        });
    } else {
        console.error("Giriş butonu bulunamadı!");
    }

    // Kayıt butonu işleme
    const registerButton = document.getElementById('registerButton');
    if (registerButton) {
        registerButton.addEventListener('click', async () => {
            const name = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const examType = document.querySelector('input[name="examType"]:checked').value;
            
            if (!name || !email || !password) {
                alert("Lütfen tüm alanları doldurun.");
                return;
            }
            
            try {
                // Kayıt butonunu devre dışı bırak
                registerButton.disabled = true;
                registerButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kayıt Yapılıyor...';
                
                if (typeof firebase === 'undefined' || !firebase.auth) {
                    throw new Error("Firebase yüklenemedi!");
                }
                
                // Kullanıcı adı ve sınav türünü sessionStorage'a kaydet
                sessionStorage.setItem("registerName", name);
                sessionStorage.setItem("registerExamType", examType);
                console.log("Kayıt bilgileri sessionStorage'a kaydedildi:", { name, examType });
                
                // Firebase ile kayıt ol
                const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
                console.log('Kayıt başarılı!');
                
                // Kullanıcı bilgilerini Firestore'a kaydet
                const userId = userCredential.user.uid;
                const userData = {
                    name: name,
                    email: email,
                    examType: examType,
                    tokens: 10,
                    isPremium: false,
                    totalExams: 0,
                    totalStudyTime: 0,
                    completedTasks: 0,
                    totalTasks: 0,
                    averageScore: 0.0,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    registrationDate: new Date().toISOString()
                };
                
                // Firestore'a kaydet
                await firebase.firestore().collection('users').doc(userId).set(userData);
                console.log('Kullanıcı verileri Firestore\'a kaydedildi');
                
                // Realtime Database'e de kaydet
                await firebase.database().ref('users/' + userId).set(userData);
                console.log('Kullanıcı verileri Realtime Database\'e kaydedildi');
                
                // Ana sayfaya yönlendir
                window.location.href = "index.html";
            } catch (error) {
                console.error('Kayıt hatası:', error);
                
                // Hata mesajını Türkçeleştir
                let errorMessage = 'Kayıt olurken bir hata oluştu';
                
                switch(error.code) {
                    case 'auth/email-already-in-use':
                        errorMessage = 'Bu e-posta adresi zaten kullanılıyor';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'Geçersiz e-posta adresi';
                        break;
                    case 'auth/weak-password':
                        errorMessage = 'Şifre çok zayıf. En az 6 karakter kullanın';
                        break;
                    case 'auth/operation-not-allowed':
                        errorMessage = 'E-posta/şifre girişi devre dışı bırakılmış';
                        break;
                    default:
                        errorMessage = error.message;
                }
                
                alert(errorMessage);
            } finally {
                // Kayıt butonunu tekrar etkinleştir
                registerButton.disabled = false;
                registerButton.innerHTML = 'Kayıt Ol';
            }
        });
    } else {
        console.error("Kayıt butonu bulunamadı!");
    }

    // Misafir giriş butonu
    const guestLoginBtn = document.getElementById('guestLoginBtn');
    if (guestLoginBtn) {
        guestLoginBtn.addEventListener('click', () => {
            const modal = document.getElementById('guestLoginModal');
            if (modal) {
                modal.style.display = 'flex';
            }
        });
    } else {
        console.error("Misafir giriş butonu bulunamadı!");
    }

    // Modal kapatma butonu
    const closeModalBtn = document.querySelector('.close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            const modal = document.getElementById('guestLoginModal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    }

    // Misafir giriş formu işleme
    const guestLoginSubmitBtn = document.getElementById('guestLoginSubmitBtn');
    if (guestLoginSubmitBtn) {
        guestLoginSubmitBtn.addEventListener('click', () => {
            const name = document.getElementById('guestName').value;
            const examType = document.querySelector('input[name="guestExamType"]:checked').value;
            
            if (!name) {
                alert("Lütfen adınızı girin.");
                return;
            }
            
            // Misafir kullanıcı oluştur
            const guestUser = {
                name: name,
                examType: examType,
                isGuest: true,
                createdAt: new Date().toISOString()
            };
            
            // Misafir kullanıcıyı localStorage'a kaydet
            localStorage.setItem('guestUser', JSON.stringify(guestUser));
            
            // Ana sayfaya yönlendir
            window.location.href = "index.html";
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