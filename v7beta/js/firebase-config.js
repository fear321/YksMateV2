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
      
      // Giriş ekranını göster
      showAuthScreen();
    }
  });
  
} catch (error) {
  console.error("Firebase başlatılırken hata oluştu:", error);
  
  // Giriş ekranını göster
  showAuthScreen();
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
    
    // Önce Firestore'dan verileri al
    let firestoreData = null;
    try {
      const firestoreDoc = await firebase.firestore().collection('users').doc(userId).get();
      if (firestoreDoc.exists) {
        firestoreData = firestoreDoc.data();
        console.log("Firestore'dan kullanıcı verileri alındı:", firestoreData);
      }
    } catch (firestoreError) {
      console.error("Firestore'dan veri alınırken hata:", firestoreError);
    }
    
    // Sonra Realtime Database'den verileri al
    const snapshot = await window.rtdb.ref('users/' + userId).once('value');
    let rtdbData = snapshot.val();
    
    if (rtdbData) {
      console.log("Realtime Database'den kullanıcı verileri alındı:", rtdbData);
      
      // Eğer Firestore'dan da veri alındıysa, iki veri kaynağını birleştir
      if (firestoreData) {
        // Firestore'daki examType değerini kontrol et ve Realtime Database'deki değeri güncelle
        if (firestoreData.examType && (!rtdbData.examType || rtdbData.examType !== firestoreData.examType)) {
          rtdbData.examType = firestoreData.examType;
          // Realtime Database'i güncelle
          await window.rtdb.ref('users/' + userId).update({ examType: firestoreData.examType });
          console.log("Realtime Database'deki examType güncellendi:", firestoreData.examType);
        }
      }
      
      updateUIWithUserData(rtdbData);
      return rtdbData;
    } else if (firestoreData) {
      // Realtime Database'de veri yoksa ama Firestore'da varsa, Firestore verilerini kullan
      console.log("Realtime Database'de veri bulunamadı, Firestore verileri kullanılıyor");
      
      // Firestore verilerini Realtime Database'e kaydet
      await window.rtdb.ref('users/' + userId).set(firestoreData);
      console.log("Firestore verileri Realtime Database'e kopyalandı");
      
      updateUIWithUserData(firestoreData);
      return firestoreData;
    } else {
      // Her iki veritabanında da veri yoksa, yeni kullanıcı oluştur
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
    
    // Kayıt sırasında seçilen sınav türünü sessionStorage'dan al
    const savedExamType = sessionStorage.getItem("registerExamType");
    console.log("SessionStorage'dan alınan sınav türü:", savedExamType);
    
    // Yeni kullanıcı için temel verileri oluştur
    const userData = {
      name: user.displayName || sessionStorage.getItem("registerName") || user.email.split('@')[0],
      email: user.email,
      examType: savedExamType || "tyt", // Kayıt sırasında seçilen sınav türü veya varsayılan olarak "tyt"
      registrationDate: new Date().toISOString(),
      tokens: 10, // başlangıç jetonu
      isPremium: false,
      totalExams: 0,
      totalStudyTime: 0,
      completedTasks: 0,
      totalTasks: 0,
      averageScore: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Realtime Database'e kaydet
    await window.rtdb.ref('users/' + userId).set(userData);
    console.log("Yeni kullanıcı Realtime Database'e kaydedildi:", userData);
    
    // Firestore'a da kaydet
    await firebase.firestore().collection('users').doc(userId).set(userData);
    console.log("Yeni kullanıcı Firestore'a kaydedildi:", userData);
    
    // Kullanıcı bilgileri kaydedildikten sonra sessionStorage'ı temizle
    sessionStorage.removeItem("registerName");
    sessionStorage.removeItem("registerExamType");
    
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
    document.getElementById("userExamType").textContent = "Bölüm: " + getExamTypeText(userData.examType);
    
    // Jeton sayısını güncelle
    const userTokensElement = document.getElementById("userTokens");
    const tokenValueElement = document.getElementById("tokenValue");
    if (tokenValueElement && userData.tokens !== undefined) {
        tokenValueElement.textContent = userData.tokens;
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

// Yeni eklenen fonksiyon
async function saveUserProfile(profileData) {
  try {
    const user = firebase.auth().currentUser;
    
    if (user) {
      // Realtime Database'e kaydet
      await window.rtdb.ref('users/' + user.uid).update(profileData);
      console.log("Kullanıcı profili Realtime Database'de güncellendi:", profileData);
      
      // Firestore'a da kaydet
      await firebase.firestore().collection('users').doc(user.uid).update(profileData);
      console.log("Kullanıcı profili Firestore'da güncellendi:", profileData);
      
      // UI güncelleme
      if (profileData.name) {
        const userNameElement = document.getElementById("userName");
        if (userNameElement) userNameElement.textContent = profileData.name;
      }
      
      if (profileData.examType) {
        const userExamTypeElement = document.getElementById("userExamType");
        if (userExamTypeElement) {
          userExamTypeElement.textContent = "Bölüm: " + getExamTypeText(profileData.examType);
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
            userExamTypeElement.textContent = "Bölüm: " + getExamTypeText(profileData.examType);
          }
        }
        
        return true;
      }
      return false;
    }
  } catch (error) {
    console.error("Profil kaydedilirken hata:", error);
    return false;
  }
}

// Global olarak erişilebilir yap
window.saveUserProfile = saveUserProfile;

// Profil Kaydet Butonu İşlemi
document.addEventListener('DOMContentLoaded', function() {
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', async function() {
            try {
                const examType = document.getElementById('examType').value;
                const targetUniversity = document.getElementById('targetUniversity').value;
                const targetDepartment = document.getElementById('targetDepartment').value;
                
                // Profil verilerini hazırla
                const profileData = {
                    examType: examType,
                    targetUniversity: targetUniversity,
                    targetDepartment: targetDepartment
                };
                
                // saveUserProfile fonksiyonunu kullan
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