// Firebase yapılandırması
const firebaseConfig = {
  apiKey: "AIzaSyBPZF_1gu4Bbb7RfrlDy53csXV6w9_rrxI",
  authDomain: "yksmate.firebaseapp.com",
  projectId: "yksmate",
  storageBucket: "yksmate.firebasestorage.app",
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
    
    // Varsayılan olarak oturum kalıcılığını LOCAL olarak ayarla
    // Bu, kullanıcı açıkça çıkış yapmadığı sürece oturumun devam etmesini sağlar
    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .catch((error) => {
        console.error("Oturum kalıcılığı ayarlanamadı:", error);
      });
  }
  
  // Offline veri desteğini etkinleştir
  firebase.firestore().enablePersistence()
    .catch((err) => {
      if (err.code == 'failed-precondition') {
        console.log('Birden fazla sekme açık olduğu için offline desteği etkinleştirilemiyor');
      } else if (err.code == 'unimplemented') {
        console.log('Tarayıcınız offline desteğini desteklemiyor');
      }
    });
    
  // Global değişkenler
  const auth = firebase.auth();
  const db = firebase.firestore();
  
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
  // Son kaydetme zamanını kontrol et (çok sık kaydetmeyi önlemek için)
  const now = new Date();
  if (lastSaveTime && (now - lastSaveTime) < 5000) {
    console.log("Son kaydetmeden bu yana çok az zaman geçti, kaydetme atlanıyor");
    return;
  }
  
  lastSaveTime = now;
  
  const user = firebase.auth().currentUser;
  
  if (user) {
    // Firebase kullanıcısı ise Firestore'a kaydet
    console.log("Kullanıcı verileri Firestore'a kaydediliyor...");
    
    // Kaydedilecek verileri topla
    const userData = collectUserData();
    
    // Firestore'a kaydet
    firebase.firestore().collection('users').doc(user.uid).update({
      lastData: userData,
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
      console.log("Veriler başarıyla kaydedildi");
    })
    .catch((error) => {
      console.error("Veri kaydetme hatası:", error);
    });
  } else {
    // Misafir kullanıcı ise localStorage'a kaydet
    const guestUser = localStorage.getItem('guestUser');
    
    if (guestUser) {
      console.log("Misafir kullanıcı verileri localStorage'a kaydediliyor...");
      
      // Kaydedilecek verileri topla
      const userData = collectUserData();
      
      // Mevcut misafir verilerini al ve güncelle
      const guestData = JSON.parse(guestUser);
      guestData.lastData = userData;
      guestData.lastUpdated = new Date();
      
      // LocalStorage'a kaydet
      localStorage.setItem('guestUser', JSON.stringify(guestData));
      console.log("Misafir verileri başarıyla kaydedildi");
    }
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
    
    // Firestore'dan kullanıcı verilerini al
    const userDoc = await firebase.firestore().collection('users').doc(userId).get();
    
    if (userDoc.exists) {
      // Kullanıcı verileri varsa
      const userData = userDoc.data();
      console.log("Kullanıcı verileri alındı:", userData);
      
      // Kullanıcı arayüzünü güncelle
      updateUIWithUserData(userData);
      
      // Dashboard'u göster
      showDashboard();
      
      return userData;
    } else {
      // Kullanıcı verileri yoksa, yeni kullanıcı oluştur
      console.log("Kullanıcı verileri bulunamadı, yeni kullanıcı oluşturuluyor");
      
      // Yeni kullanıcı oluştur
      const newUserData = await createNewUser(userId);
      
      // Dashboard'u göster
      showDashboard();
      
      return newUserData;
    }
  } catch (error) {
    console.error("Kullanıcı verileri alınırken hata:", error);
    
    // Kullanıcı bilgilerini al
    const user = firebase.auth().currentUser;
    if (user) {
      // E-postadan kullanıcı adı oluştur
      const email = user.email;
      const name = email ? email.split('@')[0] : "Kullanıcı";
      
      // Varsayılan kullanıcı verileri
      const defaultUserData = {
        name: name,
        email: email,
        examType: "tyt",
        tokens: 10,
        isPremium: false,
        totalExams: 0,
        totalStudyTime: 0,
        completedTasks: 0,
        totalTasks: 0,
        averageScore: 0.0
      };
      
      // Kullanıcı arayüzünü güncelle
      updateUIWithUserData(defaultUserData);
      
      // Dashboard'u göster
      showDashboard();
      
      return defaultUserData;
    }
    
    throw error;
  }
}

// Yeni kullanıcı oluştur
async function createNewUser(userId) {
  try {
    console.log("Yeni kullanıcı oluşturuluyor:", userId);
    
    // Kullanıcı bilgilerini al
    const user = firebase.auth().currentUser;
    if (!user) {
      throw new Error("Kullanıcı oturumu bulunamadı");
    }
    
    // Kayıt formundan isim al veya e-postadan kullanıcı adı oluştur
    let name = sessionStorage.getItem("registerName");
    if (!name) {
      const email = user.email;
      name = email ? email.split('@')[0] : "Kullanıcı";
    }
    
    // Kayıt formundan sınav türünü al veya varsayılan olarak TYT kullan
    const examType = sessionStorage.getItem("registerExamType") || "tyt";
    
    // Varsayılan kullanıcı verileri
    const userData = {
      name: name,
      email: user.email,
      examType: examType,
      tokens: 10,
      isPremium: false,
      totalExams: 0,
      totalStudyTime: 0,
      completedTasks: 0,
      totalTasks: 0,
      averageScore: 0.0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Firestore'a kullanıcı verilerini kaydet
    await firebase.firestore().collection('users').doc(userId).set(userData);
    
    console.log("Yeni kullanıcı oluşturuldu:", userData);
    
    // Kullanıcı arayüzünü güncelle
    updateUIWithUserData(userData);
    
    // Kayıt formundan alınan bilgileri temizle
    sessionStorage.removeItem("registerName");
    sessionStorage.removeItem("registerExamType");
    
    return userData;
  } catch (error) {
    console.error("Yeni kullanıcı oluşturulurken hata:", error);
    throw error;
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