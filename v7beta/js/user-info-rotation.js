// Kullanıcı bilgilerini döngüsel olarak gösterme fonksiyonu
function updateRotatingUserInfo(userData) {
    const container = document.getElementById('rotatingUserInfo');
    if (!container) return;
    
    // Kullanıcı bilgilerini ve önerileri bir diziye ekle
    const userInfoItems = [];
    
    // Sınav tipi özelliğini alalım
    const examType = userData.examType || 'tyt';
    
    // Firebase bağlantısı varsa en güncel verileri al
    if (typeof firebase !== 'undefined' && firebase.auth && firebase.database) {
        const currentUser = firebase.auth().currentUser;
        if (currentUser) {
            // Realtime database'den kullanıcı verilerini al
            firebase.database().ref('users/' + currentUser.uid).once('value')
                .then((snapshot) => {
                    const realtimeUserData = snapshot.val();
                    if (realtimeUserData) {
                        // Güncel verileri kullan
                        userData = realtimeUserData;
                    }
                    processUserData();
                })
                .catch(error => {
                    console.error("Realtime veriler alınırken hata:", error);
                    processUserData();
                });
        } else {
            processUserData();
        }
    } else {
        processUserData();
    }
    
    // Kullanıcı verilerini işle ve bilgileri göster
    function processUserData() {
        // Ortalama Net ve başarı durumuna göre kişiselleştirilmiş öneri
        if (userData.exams && userData.exams.length > 0) {
            // Sınav tipine göre maksimum soru sayıları
            const maxQuestions = {
                'tyt': 120,
                'sayisal': 160,  // TYT + AYT Sayısal (40 + 40 Matematik, 14 Fizik, 13 Kimya, 13 Biyoloji)
                'sozel': 160,    // TYT + AYT Sözel
                'esitagirlik': 160, // TYT + AYT Eşit Ağırlık
                'dil': 160       // TYT + YDT
            };
            
            // Sınav tipine göre ortalama netleri hesapla
            let tytAvg = 0, aytAvg = 0, ydtAvg = 0;
            let tytExams = 0, aytExams = 0, ydtExams = 0;
            
            // Denemeleri diziye çevir
            let examsList = [];
            if (typeof userData.exams === 'object' && !Array.isArray(userData.exams)) {
                Object.keys(userData.exams).forEach(key => {
                    examsList.push({
                        id: key,
                        ...userData.exams[key]
                    });
                });
            } else if (Array.isArray(userData.exams)) {
                examsList = userData.exams;
            }
            
            // Sınav türlerine göre ortalama netleri hesapla
            examsList.forEach(exam => {
                if (exam.subjects && exam.subjects.tyt) {
                    let tytNet = 0;
                    Object.keys(exam.subjects.tyt).forEach(subject => {
                        tytNet += exam.subjects.tyt[subject].net || 0;
                    });
                    tytAvg += tytNet;
                    tytExams++;
                }
                
                if (exam.subjects && exam.subjects.ayt) {
                    let aytNet = 0;
                    Object.keys(exam.subjects.ayt).forEach(subject => {
                        aytNet += exam.subjects.ayt[subject].net || 0;
                    });
                    aytAvg += aytNet;
                    aytExams++;
                }
                
                if (exam.subjects && exam.subjects.ydt) {
                    let ydtNet = 0;
                    Object.keys(exam.subjects.ydt).forEach(subject => {
                        ydtNet += exam.subjects.ydt[subject].net || 0;
                    });
                    ydtAvg += ydtNet;
                    ydtExams++;
                }
            });
            
            if (tytExams > 0) tytAvg /= tytExams;
            if (aytExams > 0) aytAvg /= aytExams;
            if (ydtExams > 0) ydtAvg /= ydtExams;
            
            // Tüm sınavlardaki toplam ortalama net
            let totalAvg = 0;
            let examCount = 0;
            
            if (examType === 'tyt') {
                totalAvg = tytAvg;
                examCount = tytExams;
            } else if (examType === 'sayisal' || examType === 'sozel' || examType === 'esitagirlik') {
                if (tytExams > 0 && aytExams > 0) {
                    totalAvg = (tytAvg + aytAvg) / 2;
                    examCount = Math.max(tytExams, aytExams);
                } else if (tytExams > 0) {
                    totalAvg = tytAvg;
                    examCount = tytExams;
                } else if (aytExams > 0) {
                    totalAvg = aytAvg;
                    examCount = aytExams;
                }
            } else if (examType === 'dil') {
                if (tytExams > 0 && ydtExams > 0) {
                    totalAvg = (tytAvg + ydtAvg) / 2;
                    examCount = Math.max(tytExams, ydtExams);
                } else if (tytExams > 0) {
                    totalAvg = tytAvg;
                    examCount = tytExams;
                } else if (ydtExams > 0) {
                    totalAvg = ydtAvg;
                    examCount = ydtExams;
                }
            }
            
            if (examCount > 0) {
                // Ortalama netleri ekle
                if (examType === 'tyt') {
                    userInfoItems.push({
                        text: `TYT Net: ${tytAvg.toFixed(2)}`
                    });
                } else if (examType === 'sayisal' || examType === 'sozel' || examType === 'esitagirlik') {
                    userInfoItems.push({
                        text: `TYT: ${tytAvg.toFixed(2)} | AYT: ${aytAvg.toFixed(2)}`
                    });
                } else if (examType === 'dil') {
                    userInfoItems.push({
                        text: `TYT: ${tytAvg.toFixed(2)} | YDT: ${ydtAvg.toFixed(2)}`
                    });
                }
                
                // Başarı oranını hesapla (maks. soru sayısına göre)
                const maxScore = maxQuestions[examType] || 120;
                const successRate = (totalAvg / maxScore) * 100;
                
                // Başarı durumuna göre öneriler
                if (successRate >= 90) {
                    userInfoItems.push({
                        text: `Harika gidiyorsun! Hedef üniversiteler araştır.`
                    });
                } else if (successRate >= 75) {
                    userInfoItems.push({
                        text: `Çok iyi! Eksik konulara yoğunlaş.`
                    });
                } else if (successRate >= 60) {
                    userInfoItems.push({
                        text: `İyi ilerliyorsun. Pratik yap, hızını artır.`
                    });
                } else if (successRate >= 40) {
                    userInfoItems.push({
                        text: `Temel konularda derinleş, boşlukları doldur.`
                    });
                } else if (successRate >= 25) {
                    userInfoItems.push({
                        text: `Günlük çalışma programını düzenle.`
                    });
                } else {
                    userInfoItems.push({
                        text: `Temel konulara yoğunlaş, her gün çalış.`
                    });
                }
            }
        }
        
        // Çalışma Süresi
        if (userData.totalStudyTime !== undefined) {
            userInfoItems.push({
                text: `Toplam Çalışma: ${userData.totalStudyTime || 0} saat`
            });
        }
        
        // Deneme Sayısı
        if (userData.totalExams !== undefined || (userData.exams && ((Array.isArray(userData.exams) && userData.exams.length > 0) || (typeof userData.exams === 'object' && Object.keys(userData.exams).length > 0)))) {
            const examCount = userData.totalExams || (userData.exams ? (Array.isArray(userData.exams) ? userData.exams.length : Object.keys(userData.exams).length) : 0);
            userInfoItems.push({
                text: `Toplam ${examCount} deneme çözdün.`
            });
            
            if (examCount < 5) {
                userInfoItems.push({
                    text: `Daha fazla deneme sınavı çözmelisin!`
                });
            } else if (examCount < 10) {
                userInfoItems.push({
                    text: `Düzenli olarak deneme çözmeye devam et.`
                });
            } else {
                userInfoItems.push({
                    text: `Deneme çözme alışkanlığın güzel, detaylı analiz yap.`
                });
            }
        }
        
        // Aktif Arkadaşlar
        if (userData.friends) {
            let activeCount = 0;
            if (Array.isArray(userData.friends)) {
                // Aktif arkadaşları say (aktif olanların online özelliği true olmalı)
                activeCount = userData.friends.filter(friend => friend.online).length;
            } else if (typeof userData.friends === 'object') {
                // Eğer friends bir nesne ise, her bir arkadaşı kontrol et
                Object.keys(userData.friends).forEach(key => {
                    if (userData.friends[key].online) {
                        activeCount++;
                    }
                });
            }
            
            if (activeCount > 0) {
                userInfoItems.push({
                    text: `${activeCount} arkadaşın şu an aktif.`
                });
                
                userInfoItems.push({
                    text: `Arkadaşlarınla birlikte çalışmayı dene!`
                });
            }
        }
        
        // Yaklaşan Görevler
        if (userData.tasks) {
            // 48 saat içindeki görevleri bul
            let high = 0;
            let medium = 0;
            let low = 0;
            let tomorrow = 0;
            let today = 0;
            
            const now = new Date();
            const tomorrowDate = new Date();
            tomorrowDate.setDate(now.getDate() + 1);
            tomorrowDate.setHours(0, 0, 0, 0);
            
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);
            
            if (Array.isArray(userData.tasks)) {
                // Görevleri önceliklerine göre say
                userData.tasks.forEach(task => {
                    if (task.date) {
                        const taskDate = new Date(task.date);
                        // 48 saat içindeki görevleri kontrol et
                        if (taskDate > now && (taskDate - now) <= 172800000) {
                            // Bugün mü yoksa yarın mı?
                            if (taskDate <= todayEnd) {
                                today++;
                                // Bugün için öncelik seviyesine göre say
                                if (task.priority === 'high') {
                                    high++;
                                } else if (task.priority === 'medium') {
                                    medium++;
                                } else {
                                    low++;
                                }
                            } else if (taskDate < tomorrowDate.getTime() + 86400000) {
                                tomorrow++;
                            }
                        }
                    }
                });
            } else if (typeof userData.tasks === 'object') {
                // Eğer tasks bir nesne ise, her bir görevi kontrol et
                Object.keys(userData.tasks).forEach(key => {
                    const task = userData.tasks[key];
                    if (task.date) {
                        const taskDate = new Date(task.date);
                        // 48 saat içindeki görevleri kontrol et
                        if (taskDate > now && (taskDate - now) <= 172800000) {
                            // Bugün mü yoksa yarın mı?
                            if (taskDate <= todayEnd) {
                                today++;
                                // Bugün için öncelik seviyesine göre say
                                if (task.priority === 'high') {
                                    high++;
                                } else if (task.priority === 'medium') {
                                    medium++;
                                } else {
                                    low++;
                                }
                            } else if (taskDate < tomorrowDate.getTime() + 86400000) {
                                tomorrow++;
                            }
                        }
                    }
                });
            }
            
            // Görev bilgilerini ekle
            if (today > 0 || tomorrow > 0) {
                // Bugün için görevler
                if (today > 0) {
                    let taskText = `Bugün ${today} görevin var`;
                    if (high > 0 || medium > 0) {
                        taskText += ` (${high > 0 ? high + ' öncelikli' : ''}${high > 0 && medium > 0 ? ', ' : ''}${medium > 0 ? medium + ' normal' : ''})`;
                    }
                    userInfoItems.push({
                        text: taskText
                    });
                }
                
                // Yarın için görevler
                if (tomorrow > 0) {
                    let taskText = `Yarın ${tomorrow} görevin var`;
                    userInfoItems.push({
                        text: taskText
                    });
                }
                
                // Görevler için genel hatırlatma
                userInfoItems.push({
                    text: `Görevlerini yönetmeyi unutma!`
                });
            } else {
                userInfoItems.push({
                    text: `Kendine bugün için bir hedef belirle.`
                });
            }
        }
        
        // Eğer bilgi öğesi yoksa bir tane ekle
        if (userInfoItems.length === 0) {
            userInfoItems.push({
                text: 'Hoş geldin! Hemen deneme ekle ve çalışmaya başla.'
            });
        }
        
        // 5 saniye aralıklarla bilgileri değiştir
        let currentIndex = 0;
        
        const showNextInfo = () => {
            // Önceki animasyonu temizle
            container.innerHTML = '';
            container.className = 'rotating-user-info';
            
            // Yeni metin için span oluştur
            const textSpan = document.createElement('span');
            textSpan.className = 'typing-animation';
            textSpan.textContent = userInfoItems[currentIndex].text;
            textSpan.style.display = 'inline-block';
            textSpan.style.verticalAlign = 'middle';
            textSpan.style.lineHeight = 'normal';
            container.appendChild(textSpan);
            
            // İndeksi güncelle
            currentIndex = (currentIndex + 1) % userInfoItems.length;
        };
        
        // İlk bilgiyi göster
        showNextInfo();
        
        // Önceki interval'i temizle (varsa)
        if (window.userInfoInterval) {
            clearInterval(window.userInfoInterval);
        }
        
        // Yeni bir interval başlat
        window.userInfoInterval = setInterval(showNextInfo, 5000); // 5 saniye
    }
}
