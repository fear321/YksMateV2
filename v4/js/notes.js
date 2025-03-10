// Not sayfası işlevleri
document.addEventListener('DOMContentLoaded', function() {
    const subjectTabs = document.querySelectorAll('.subject-tab');
    const currentSubjectTitle = document.getElementById('currentSubject');
    const noteEditor = document.getElementById('noteEditor');
    const wordCount = document.querySelector('.word-count');
    const saveStatus = document.querySelector('.save-status');
    const subjectTabsContainer = document.getElementById('subjectTabs');
    const userExamTypeElement = document.getElementById('userExamType');
    
    let currentSubject = 'matematik';
    let notes = {};
    let saveTimeout;
    let userId = null;
    let userExamType = null;

    // Sınav türü metni alma fonksiyonu
    function getExamTypeText(examType) {
        const examTypes = {
            'tyt': 'TYT',
            'ayt': 'AYT',
            'ydt': 'YDT',
            'tyt-ayt': 'TYT-AYT',
            'tyt-ayt-ydt': 'TYT-AYT-YDT',
            'sayisal': 'Sayısal',
            'sozel': 'Sözel',
            'esitagirlik': 'Eşit Ağırlık',
            'dil': 'Dil'
        };
        return examTypes[examType] || 'Belirtilmemiş';
    }

    // Tüm dersler
    const allSubjects = {
        'matematik': { name: 'Matematik', icon: 'fa-calculator' },
        'fizik': { name: 'Fizik', icon: 'fa-atom' },
        'kimya': { name: 'Kimya', icon: 'fa-flask' },
        'biyoloji': { name: 'Biyoloji', icon: 'fa-dna' },
        'turkce': { name: 'Türkçe', icon: 'fa-book' },
        'tarih': { name: 'Tarih', icon: 'fa-landmark' },
        'cografya': { name: 'Coğrafya', icon: 'fa-globe-europe' },
        'felsefe': { name: 'Felsefe', icon: 'fa-brain' },
        'din': { name: 'Din Kültürü', icon: 'fa-pray' },
        'ingilizce': { name: 'İngilizce', icon: 'fa-language' }
    };

    // Kullanıcı ID'sini al
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            userId = user.uid;
            console.log("Kullanıcı ID:", userId);
            
            // Kullanıcı bilgilerini al
            firebase.database().ref('users/' + userId).once('value')
                .then((snapshot) => {
                    const userData = snapshot.val();
                    console.log("Kullanıcı verileri:", userData);
                    
                    if (userData) {
                        userExamType = userData.examType || userData.department || 'tyt';
                        if (userExamTypeElement) {
                            userExamTypeElement.textContent = "Sınav Türü: " + getExamTypeText(userExamType);
                        }
                    }
                    
                    // Tüm dersleri göster
                    updateSubjectTabs();
                    loadUserNotes(userId);
                })
                .catch(error => {
                    console.error("Kullanıcı bilgileri alınırken hata:", error);
                    updateSubjectTabs();
                });
        } else {
            // Misafir kullanıcı kontrolü
            const guestUser = localStorage.getItem('guestUser');
            if (guestUser) {
                const guestData = JSON.parse(guestUser);
                userExamType = guestData.examType || 'tyt';
                if (userExamTypeElement) {
                    userExamTypeElement.textContent = "Sınav Türü: " + getExamTypeText(userExamType);
                }
                updateSubjectTabs();
            }
        }
    });

    // Ders sekmelerini güncelle
    function updateSubjectTabs() {
        console.log("Tüm dersler yükleniyor...");
        // Önce mevcut sekmeleri temizle
        subjectTabsContainer.innerHTML = '';

        // Tüm dersleri ekle
        Object.entries(allSubjects).forEach(([subject, info]) => {
            const tab = document.createElement('div');
            tab.className = 'subject-tab' + (subject === currentSubject ? ' active' : '');
            tab.dataset.subject = subject;
            tab.innerHTML = `
                <i class="fas ${info.icon}"></i>
                <span>${info.name}</span>
            `;
            subjectTabsContainer.appendChild(tab);

            // Sekme tıklama olayını ekle
            tab.addEventListener('click', function() {
                saveNote();
                document.querySelectorAll('.subject-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                showNote(this.dataset.subject);
            });
        });

        // İlk dersi seç
        if (currentSubject !== 'matematik') {
            currentSubject = 'matematik';
            showNote(currentSubject);
        }
    }
    
    // Kullanıcının notlarını yükle
    function loadUserNotes(uid) {
        firebase.database().ref('users/' + uid + '/notes').once('value')
            .then((snapshot) => {
                const userNotes = snapshot.val();
                if (userNotes) {
                    notes = userNotes;
                    showNote(currentSubject);
                    
                    // Son değişiklik zamanını göster
                    if (notes[currentSubject] && notes[currentSubject].lastModified) {
                        const lastModified = new Date(notes[currentSubject].lastModified);
                        saveStatus.textContent = 'Son güncelleme: ' + lastModified.toLocaleString('tr-TR');
                    }
                }
            })
            .catch(error => {
                console.error("Notlar yüklenirken hata:", error);
            });
    }
    
    // Notu göster
    function showNote(subject) {
        currentSubject = subject;
        currentSubjectTitle.textContent = getSubjectTitle(subject) + " Notları";
        
        if (notes[subject] && notes[subject].content) {
            noteEditor.value = notes[subject].content;
        } else {
            noteEditor.value = '';
        }
        
        updateWordCount();
    }
    
    // Ders başlığını al
    function getSubjectTitle(subject) {
        const tab = document.querySelector(`.subject-tab[data-subject="${subject}"]`);
        return tab ? tab.querySelector('span').textContent : 'Ders';
    }
    
    // Kelime sayısını güncelle
    function updateWordCount() {
        const text = noteEditor.value.trim();
        const words = text ? text.split(/\s+/).length : 0;
        wordCount.textContent = words + ' kelime';
    }

    // Not editörü değişiklik olayı
    noteEditor.addEventListener('input', function() {
        updateWordCount();
        
        // Önceki zamanlayıcıyı temizle
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }
        
        // 500ms sonra kaydet
        saveTimeout = setTimeout(() => {
            saveNote();
        }, 500);
        
        // Kaydediliyor durumunu göster
        saveStatus.textContent = 'Kaydediliyor...';
    });
    
    // Notu kaydet
    function saveNote() {
        if (!userId) return;
        
        const noteData = {
            content: noteEditor.value,
            subject: currentSubject,
            lastModified: new Date().toISOString(),
            wordCount: noteEditor.value.trim().split(/\s+/).length || 0,
            title: currentSubjectTitle.textContent,
            createdBy: userId
        };
        
        firebase.database().ref('users/' + userId + '/notes/' + currentSubject).set(noteData)
            .then(() => {
                saveStatus.textContent = 'Kaydedildi';
                setTimeout(() => {
                    saveStatus.textContent = 'Otomatik kaydedildi';
                }, 2000);
                
                // Notları yerel değişkende güncelle
                notes[currentSubject] = noteData;
            })
            .catch(error => {
                console.error("Not kaydedilirken hata:", error);
                saveStatus.textContent = 'Kaydetme hatası!';
            });
    }
    
    // Yazdırma işlevi
    document.getElementById('printNote').addEventListener('click', function() {
        try {
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert('Lütfen popup engelleyiciyi devre dışı bırakın ve tekrar deneyin.');
                return;
            }
            
            const noteTitle = currentSubjectTitle.textContent;
            const noteContent = noteEditor.value.replace(/\n/g, '<br>');
            
            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${noteTitle}</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
                        h1 { color: #4B2138; }
                        .note-content { white-space: pre-wrap; }
                    </style>
                </head>
                <body>
                    <h1>${noteTitle}</h1>
                    <div class="note-content">${noteContent}</div>
                </body>
                </html>
            `;
            
            printWindow.document.open();
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            
            setTimeout(function() {
                printWindow.print();
            }, 500);
        } catch (error) {
            console.error('Yazdırma hatası:', error);
            alert('Yazdırma sırasında bir hata oluştu: ' + error.message);
        }
    });
    
    // İndirme işlevi
    document.getElementById('downloadNote').addEventListener('click', function() {
        try {
            const noteTitle = currentSubjectTitle.textContent.replace(' Notları', '');
            const noteContent = noteEditor.value;
            const blob = new Blob([noteContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = noteTitle + '.txt';
            a.style.display = 'none';
            
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        } catch (error) {
            console.error('İndirme hatası:', error);
            alert('İndirme sırasında bir hata oluştu: ' + error.message);
        }
    });
    
    // Paylaşma işlevi
    document.getElementById('shareNote').addEventListener('click', function() {
        try {
            if (navigator.share) {
                navigator.share({
                    title: currentSubjectTitle.textContent,
                    text: noteEditor.value
                })
                .catch(error => {
                    console.error('Paylaşma hatası:', error);
                    alert('Paylaşma sırasında bir hata oluştu: ' + error.message);
                });
            } else {
                alert('Paylaşma özelliği bu tarayıcıda desteklenmiyor.');
            }
        } catch (error) {
            console.error('Paylaşma hatası:', error);
            alert('Paylaşma sırasında bir hata oluştu: ' + error.message);
        }
    });
    
    // Bildirim işlevleri
    const notificationBtn = document.getElementById('notificationBtn');
    const notificationDropdown = document.getElementById('notificationDropdown');
    
    if (notificationBtn && notificationDropdown) {
        notificationBtn.addEventListener('click', function(event) {
            event.stopPropagation();
            notificationDropdown.classList.toggle('active');
        });
        
        document.addEventListener('click', function(event) {
            if (notificationDropdown.classList.contains('active') && 
                !notificationBtn.contains(event.target) && 
                !notificationDropdown.contains(event.target)) {
                notificationDropdown.classList.remove('active');
            }
        });
    }
}); 