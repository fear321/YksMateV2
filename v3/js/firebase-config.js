// Firebase yapılandırması
const firebaseConfig = {
  apiKey: "AIzaSyBPZF_1gu4Bbb7RfrlDy53csXV6w9_rrxI",
  authDomain: "yksmate.firebaseapp.com",
  databaseURL: "https://yksmate-default-rtdb.firebaseio.com",
  projectId: "yksmate",
  storageBucket: "yksmate.appspot.com",
  messagingSenderId: "783868672721",
  appId: "1:783868672721:web:ea77ff0b99b1a4996363f0",
  measurementId: "G-4Y0LC3MGTC"
};

// Offline mod kontrolü
let isOfflineMode = false;

// Otomatik kaydetme değişkenleri
let autoSaveEnabled = true;
let autoSaveInterval = null;
let lastSaveTime = null;

// Firebase'i başlat
try {
  // Firebase zaten başlatılmış mı kontrol et
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    firebase.analytics();
    
    // Varsayılan olarak oturum kalıcılığını LOCAL olarak ayarla
    // Bu, kullanıcı açıkça çıkış yapmadığı sürece oturumun devam etmesini sağlar
    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .catch((error) => {
        console.error("Oturum kalıcılığı ayarlanamadı:", error);
      });
  }
  
  // Offline veri desteğini etkinleştir
  try {
    firebase.firestore().enablePersistence({
      synchronizeTabs: true
    });
    console.log("Firestore offline desteği etkinleştirildi");
  } catch (err) {
    if (err.code == 'failed-precondition') {
      console.log('Birden fazla sekme açık olduğu için offline desteği etkinleştirilemiyor');
    } else if (err.code == 'unimplemented') {
      console.log('Tarayıcınız offline desteğini desteklemiyor');
    } else {
      console.error("Firestore offline desteği etkinleştirilirken hata:", err);
    }
  }
    
  // Global değişkenler
  const auth = firebase.auth();
  const db = firebase.firestore();
  
  // Global rtdb değişkeni
  window.rtdb = firebase.database();
  
  // Kullanıcı oturumunu kontrol et
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      // Kullanıcı giriş yapmış
      console.log("Kullanıcı giriş yaptı:", user.uid);
      
      // Kullanıcı bilgilerini getir
      getUserData(user.uid);
      
      // Otomatik kaydetme işlemini başlat
      startAutoSave();
    } else {
      // Kullanıcı çıkış yapmış
      console.log("Kullanıcı çıkış yaptı");
      
      // Otomatik kaydetme işlemini durdur
      stopAutoSave();
      
      // Misafir kullanıcı kontrolü
      const guestUser = localStorage.getItem('guestUser');
      if (guestUser) {
        // Misafir kullanıcı varsa bilgilerini güncelle ve dashboard'u göster
        console.log("Misafir kullanıcı bulundu");
        const guestData = JSON.parse(guestUser);
        updateUIWithUserData(guestData);
        showDashboard();
        
        // Misafir kullanıcı için otomatik kaydetme işlemini başlat
        startAutoSave();
      } else {
        // Misafir kullanıcı da yoksa giriş ekranını göster
        showAuthScreen();
      }
    }
  });
  
} catch (error) {
  console.error("Firebase başlatılırken hata oluştu:", error);
  
  // Misafir kullanıcı kontrolü
  const guestUser = localStorage.getItem('guestUser');
  if (guestUser) {
    console.log("Misafir kullanıcı bulundu (offline mod)");
    updateUIWithUserData(JSON.parse(guestUser));
    showDashboard();
    
    // Misafir kullanıcı için otomatik kaydetme işlemini başlat
    startAutoSave();
  } else {
    // Giriş ekranını göster
    showAuthScreen();
  }
}

// Otomatik kaydetme işlemini başlat
function startAutoSave() {
  if (!autoSaveEnabled) return;
  
  console.log("Otomatik kaydetme başlatılıyor...");
  
  // Form elemanlarındaki değişiklikleri dinle
  document.querySelectorAll('input, textarea, select').forEach(element => {
    element.addEventListener('change', () => {
      saveUserData();
    });
  });
  
  // Belirli aralıklarla kaydet (30 saniyede bir)
  if (autoSaveInterval) clearInterval(autoSaveInterval);
  
  autoSaveInterval = setInterval(() => {
    saveUserData();
  }, 30000);
  
  console.log("Otomatik kaydetme aktif edildi");
}

// Otomatik kaydetme işlemini durdur
function stopAutoSave() {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
    autoSaveInterval = null;
    console.log("Otomatik kaydetme durduruldu");
  }
}

// Kullanıcı verilerini kaydet
function saveUserData() {
  try {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    console.log("Kullanıcı verileri kaydediliyor...");
    
    // Kullanıcı verilerini topla
    const userData = collectUserData();
    
    // Realtime Database'e kaydet
    return window.rtdb.ref('users/' + user.uid).update(userData)
        .then(() => {
            console.log("Kullanıcı verileri başarıyla kaydedildi");
            return true;
        })
        .catch(error => {
            console.error("Kullanıcı verileri kaydedilirken hata:", error);
            return false;
        });
  } catch (error) {
    console.error("saveUserData hatası:", error);
    return false;
  }
}

// Kullanıcı verilerini topla
function collectUserData() {
  // Burada sayfadaki önemli form elemanlarından verileri toplayabilirsiniz
  // Örnek olarak:
  const data = {
    // Genel veriler
    timestamp: new Date(),
    
    // Form verileri (varsa)
    formData: {}
  };
  
  // Form elemanlarını bul ve değerlerini kaydet
  document.querySelectorAll('form').forEach(form => {
    const formId = form.id || 'unnamed_form';
    data.formData[formId] = {};
    
    form.querySelectorAll('input, textarea, select').forEach(input => {
      if (input.id) {
        if (input.type === 'checkbox') {
          data.formData[formId][input.id] = input.checked;
        } else {
          data.formData[formId][input.id] = input.value;
        }
      }
    });
  });
  
  // Sayfa özel verilerini ekle
  const currentPage = window.location.pathname.split('/').pop();
  data.currentPage = currentPage;
  
  return data;
}

// Kullanıcı verilerini getir
async function getUserData(userId) {
  try {
    console.log("Kullanıcı verileri getiriliyor:", userId);
    
    // Realtime Database'den verileri al
    const snapshot = await window.rtdb.ref('users/' + userId).once('value');
    const userData = snapshot.val();
    
    if (userData) {
      console.log("Kullanıcı verileri alındı:", userData);
      updateUIWithUserData(userData);
      return userData;
    } else {
      console.log("Kullanıcı verileri bulunamadı, yeni kullanıcı oluşturuluyor");
      return createNewUser(userId);
    }
  } catch (error) {
    console.error("getUserData hatası:", error);
    return null;
  }
}

// Yeni kullanıcı oluştur
async function createNewUser(userId) {
  try {
    const user = firebase.auth().currentUser;
    if (!user) return null;
    
    // Yeni kullanıcı için temel verileri oluştur
    const userData = {
      name: user.displayName || user.email.split('@')[0],
      email: user.email,
      examType: "tyt", // varsayılan sınav türü
      registrationDate: new Date().toISOString(),
      tokens: 10, // başlangıç jetonu
      isPremium: false,
      totalExams: 0,
      totalStudyTime: 0,
      completedTasks: 0,
      totalTasks: 0,
      averageScore: 0
    };
    
    // Realtime Database'e kaydet
    await window.rtdb.ref('users/' + userId).set(userData);
    console.log("Yeni kullanıcı oluşturuldu:", userData);
    
    updateUIWithUserData(userData);
    return userData;
  } catch (error) {
    console.error("createNewUser hatası:", error);
    return null;
  }
}

// Kullanıcı arayüzünü güncelle
function updateUIWithUserData(userData) {
  try {
    console.log("Kullanıcı arayüzü güncelleniyor:", userData);
    
    // Kullanıcı adını güncelle
    document.getElementById("userName").textContent = userData.name || "Kullanıcı";
    document.getElementById("welcomeUserName").textContent = userData.name || "Kullanıcı";
    
    // Sınav türünü güncelle
    document.getElementById("userExamType").textContent = "Sınav Türü: " + getExamTypeText(userData.examType);
    
    // Jeton sayısını güncelle
    if (userData.tokens !== undefined) {
      document.getElementById("tokenCount").textContent = userData.tokens + " Jeton";
    }
    
    // İstatistikleri güncelle
    if (userData.totalExams !== undefined) {
      document.getElementById("totalExams").textContent = userData.totalExams;
    }
    
    if (userData.totalStudyTime !== undefined) {
      document.getElementById("totalStudyTime").textContent = formatStudyTime(userData.totalStudyTime);
    }
    
    if (userData.completedTasks !== undefined && userData.totalTasks !== undefined) {
      document.getElementById("completedTasks").textContent = userData.completedTasks + "/" + userData.totalTasks;
    }
    
    if (userData.averageScore !== undefined) {
      document.getElementById("averageScore").textContent = userData.averageScore.toFixed(1);
    }
    
    console.log("Kullanıcı arayüzü güncellendi");
  } catch (error) {
    console.error("Kullanıcı arayüzü güncellenirken hata:", error);
  }
}

// Çalışma süresini formatla
function formatStudyTime(minutes) {
  if (minutes < 60) {
    return `${minutes} dakika`;
  } else {
    const hours = Math.floor(minutes / 60);
    return `${hours} saat`;
  }
}

// Sınav türü metnini al
function getExamTypeText(examType) {
  const examTypes = {
    "tyt": "TYT",
    "sayisal": "Sayısal",
    "sozel": "Sözel",
    "esitagirlik": "Eşit Ağırlık",
    "dil": "Dil"
  };
  
  return examTypes[examType] || "TYT";
}

// Giriş ekranını göster
function showAuthScreen() {
  try {
    document.getElementById("authContainer").style.display = "flex";
    document.getElementById("dashboardContainer").style.display = "none";
    console.log("Giriş ekranı gösterildi");
  } catch (error) {
    console.error("Giriş ekranı gösterilirken hata:", error);
  }
}

// Dashboard'u göster
function showDashboard() {
  try {
    console.log("Dashboard gösteriliyor");
    document.getElementById("authContainer").style.display = "none";
    document.getElementById("dashboardContainer").style.display = "flex";
    console.log("Dashboard gösterildi");
  } catch (error) {
    console.error("Dashboard gösterilirken hata:", error);
  }
}

// Misafir girişi
function guestLogin(name, examType) {
  try {
    // Misafir kullanıcı verilerini oluştur
    const guestData = {
      name: name,
      examType: examType,
      tokens: 5, // Misafir kullanıcılar için daha az jeton
      isPremium: false,
      totalExams: 0,
      totalStudyTime: 0,
      completedTasks: 0,
      totalTasks: 0,
      isGuest: true
    };
    
    // Misafir verilerini localStorage'a kaydet
    localStorage.setItem("guestUser", JSON.stringify(guestData));
    
    // Arayüzü güncelle
    updateUIWithUserData(guestData);
    
    // Dashboard'u göster
    showDashboard();
  } catch (error) {
    console.error("Misafir girişi yapılırken hata:", error);
  }
}

// Global fonksiyonları dışa aktar
window.guestLogin = guestLogin;
window.showAuthScreen = showAuthScreen;
window.showDashboard = showDashboard;

// Yeni eklenen fonksiyon
async function saveUserProfile(profileData) {
  try {
    const user = firebase.auth().currentUser;
    
    if (user) {
      // Realtime Database'e kaydet
      await window.rtdb.ref('users/' + user.uid).update(profileData);
      console.log("Kullanıcı profili güncellendi:", profileData);
      
      // UI güncelleme
      if (profileData.name) {
        const userNameElement = document.getElementById("userName");
        if (userNameElement) userNameElement.textContent = profileData.name;
      }
      
      if (profileData.examType) {
        const userExamTypeElement = document.getElementById("userExamType");
        if (userExamTypeElement) {
          userExamTypeElement.textContent = "Sınav Türü: " + getExamTypeText(profileData.examType);
        }
      }
      
      return true;
    } else {
      // Misafir kullanıcı için localStorage'a kaydet
      const guestUser = localStorage.getItem('guestUser');
      if (guestUser) {
        const guestData = JSON.parse(guestUser);
        const updatedData = {...guestData, ...profileData};
        localStorage.setItem('guestUser', JSON.stringify(updatedData));
        
        // UI güncelleme
        if (profileData.name) {
          const userNameElement = document.getElementById("userName");
          if (userNameElement) userNameElement.textContent = profileData.name;
        }
        
        if (profileData.examType) {
          const userExamTypeElement = document.getElementById("userExamType");
          if (userExamTypeElement) {
            userExamTypeElement.textContent = "Sınav Türü: " + getExamTypeText(profileData.examType);
          }
        }
        
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error("Profil kaydedilirken hata:", error);
    return false;
  }
}

// Profil Kaydet Butonu İşlemi
document.addEventListener('DOMContentLoaded', function() {
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', async function() {
            try {
                const profileName = document.getElementById('profileName').value.trim();
                const profileExamType = document.getElementById('profileExamType').value;
                
                if (!profileName) {
                    alert('Lütfen adınızı girin.');
                    return;
                }
                
                // Profil verilerini hazırla
                const profileData = {
                    name: profileName,
                    examType: profileExamType
                };
                
                // Firebase config dosyasındaki saveUserProfile fonksiyonunu kullan
                const success = await saveUserProfile(profileData);
                
                if (success) {
                    alert('Profil başarıyla güncellendi!');
                } else {
                    alert('Profil güncellenirken bir hata oluştu.');
                }
            } catch (error) {
                console.error('Profil kaydetme hatası:', error);
                alert('Profil güncellenirken bir hata oluştu: ' + error.message);
            }
        });
    }
}); 