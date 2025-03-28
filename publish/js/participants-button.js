// Katılımcılar butonu işlevselliği
document.addEventListener('DOMContentLoaded', function() {
    // İlgili DOM elementlerini tanımla
    const showParticipantsBtn = document.getElementById('showParticipantsBtn');
    const usersContent = document.getElementById('usersContent');
    const roomHeader = document.getElementById('roomHeader');
    const roomHeaderTop = document.querySelector('.room-header-top');
    const headerUserCount = document.getElementById('headerUserCount');
    const usersList = document.getElementById('usersList');
    
    if (!showParticipantsBtn || !roomHeader || !usersContent) return;
    
    // Katılımcılar butonuna tıklandığında oda başlığının genişlemesi
    showParticipantsBtn.addEventListener('click', function(e) {
        e.stopPropagation(); // Event'in diğer elementlere geçmesini engelle
        roomHeader.classList.toggle('expanded');
    });
    
    // Başlık kısmına tıklandığında da genişletme/daraltma
    if (roomHeaderTop) {
        roomHeaderTop.addEventListener('click', function() {
            roomHeader.classList.toggle('expanded');
        });
    }
    
    // Kullanıcı sayısını güncelleme fonksiyonu
    function updateUserCount() {
        if (usersList && headerUserCount) {
            const userCount = usersList.children.length;
            headerUserCount.textContent = userCount;
            
            // Tam ekran modunda ise, oradaki kullanıcı sayısını da güncelle
            if (window.isFullscreen) {
                const fullScreenHeaderUserCount = document.querySelector('.fullscreen-room-header #headerUserCount');
                if (fullScreenHeaderUserCount) {
                    fullScreenHeaderUserCount.textContent = userCount;
                }
            }
        }
    }
    
    // Kullanıcı listesini izle ve değişikliklerde sayıyı güncelle
    if (usersList) {
        // MutationObserver kullanarak usersList'deki değişiklikleri izle
        const observer = new MutationObserver(function(mutations) {
            updateUserCount();
            
            // Tam ekran modunda ise, kullanıcı listesini de güncelle
            if (window.isFullscreen) {
                const fullscreenUsersList = document.querySelector('.fullscreen-room-header #usersList');
                if (fullscreenUsersList && usersList.innerHTML !== fullscreenUsersList.innerHTML) {
                    fullscreenUsersList.innerHTML = usersList.innerHTML;
                }
            }
        });
        
        observer.observe(usersList, { childList: true, subtree: true });
        
        // Sayfa yüklendiğinde ilk sayımı yap
        updateUserCount();
    }
});
