// Jeton gösterimi ekleyen script
document.addEventListener('DOMContentLoaded', function() {
    // Daha önce kullanıcı detaylarına eklenmişse kaldır
    document.querySelectorAll('#userTokenContainer').forEach(el => el.remove());
    
    // Content header'ı bul
    const contentHeader = document.querySelector('.content-header');
    if (!contentHeader) return;
    
    // Header actions'ı bul
    const headerActions = contentHeader.querySelector('.header-actions');
    if (!headerActions) return;
    
    // Tema butonunu bul
    const themeButton = headerActions.querySelector('.theme-toggle');
    if (!themeButton) return;
    
    // Token container
    const tokenContainer = document.createElement('div');
    tokenContainer.id = 'userTokenContainer';
    tokenContainer.style.color = '#4b2138';
    tokenContainer.style.fontWeight = 'bold';
    tokenContainer.style.marginRight = '15px';
    tokenContainer.style.fontSize = '0.9em';
    tokenContainer.style.display = 'inline-flex';
    tokenContainer.style.alignItems = 'center';
    tokenContainer.style.gap = '3px';
    tokenContainer.innerHTML = '<i class="fas fa-coins" style="font-size: 1em;"></i> <span id="tokenValue">0</span>';
    
    // Token container'ı tema butonunun önüne ekle
    headerActions.insertBefore(tokenContainer, themeButton);
    
    // Token değerini güncelleme fonksiyonu
    function updateTokenValue() {
        if (typeof firebase !== 'undefined' && firebase.auth && firebase.database) {
            const currentUser = firebase.auth().currentUser;
            if (currentUser) {
                firebase.database().ref('users/' + currentUser.uid).once('value')
                    .then((snapshot) => {
                        const userData = snapshot.val();
                        if (userData && userData.tokens !== undefined) {
                            // Tüm token değerlerini güncelle
                            const tokenValueElements = document.querySelectorAll('#tokenValue');
                            tokenValueElements.forEach(function(element) {
                                element.textContent = userData.tokens;
                            });
                        }
                    })
                    .catch(error => {
                        console.error("Token bilgisi alınırken hata:", error);
                    });
            } else {
                // Misafir kullanıcı kontrolü
                const guestUser = localStorage.getItem('guestUser');
                if (guestUser) {
                    const guestData = JSON.parse(guestUser);
                    // Tüm token değerlerini güncelle
                    const tokenValueElements = document.querySelectorAll('#tokenValue');
                    tokenValueElements.forEach(function(element) {
                        element.textContent = guestData.tokens || 0;
                    });
                }
            }
        }
    }

    // Sayfa yüklendiğinde ve Firebase auth state değiştiğinde token değerini güncelle
    updateTokenValue();
    
    // Firebase auth state değişikliklerini dinle
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(function(user) {
            updateTokenValue();
        });
    }
}); 