// src/scripts/components/navbar.js
import { subscribePush, unsubscribePush, getSubscription } from '../utils/push-notification';

export default function Navbar() {
  const container = document.createElement('nav');
  container.className = 'navbar';

  const token = localStorage.getItem('token');
  const name = localStorage.getItem('name');
  
  // elemen utama di sisi kiri
  const leftItems = `
    <div class="nav-links">
      <a href="#/home">Home</a>
      <a href="#/add">Add Story</a>
      <a href="#/about">About</a>
    </div>
  `;

  // elemen aksi dan notifikasi di sisi kanan dalam satu container
  let rightItems = '';
  if (token) {
    rightItems = `
      <div class="navbar-right-actions">
        <span class="navbar-user">Hi, ${name || 'User'}</span> 
        <a href="#" id="logout-link">Logout</a>
        <button id="btn-push-toggle" aria-label="Toggle Push Notification" disabled>Loading...</button>
      </div>
    `;
  } else {
    rightItems = `
      <div class="navbar-right-actions">
        <a href="#/login">Login</a> 
        <a href="#/register">Register</a>
        <button id="btn-push-toggle" aria-label="Toggle Push Notification" disabled>Loading...</button>
      </div>
    `;
  }
  
  // Gabungkan semua
  container.innerHTML = leftItems + rightItems;

  // --- Logika Event Listener (Tetap sama) ---

  if (token) {
    const logoutLink = container.querySelector('#logout-link');
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('token');
      localStorage.removeItem('name');
      window.location.hash = '#/login';
    });
  }

  const pushBtn = container.querySelector('#btn-push-toggle');

  // Function untuk update UI button
  const updatePushButton = async () => {
    if (!pushBtn || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      pushBtn.style.display = 'none';
      return;
    }

    try {
      const subscription = await getSubscription();
      pushBtn.disabled = false;
      if (subscription) {
        pushBtn.textContent = '🔔 Disable Notification';
        pushBtn.classList.add('active'); 
      } else {
        pushBtn.textContent = '🔕 Enable Notification';
        pushBtn.classList.remove('active');
      }
    } catch(e) {
      console.error('Error checking subscription status:', e);
      pushBtn.textContent = '❌ Notification Error';
      pushBtn.disabled = true;
    }
  };

  // Terapkan logika toggle saat diklik
  if (pushBtn) {
    pushBtn.addEventListener('click', async () => {
      pushBtn.disabled = true;
      const isSubscribed = await getSubscription();

      try {
        if (isSubscribed) {
          pushBtn.textContent = 'Unsubscribing...';
          await unsubscribePush();
        } else {
          pushBtn.textContent = 'Subscribing...';
          await subscribePush();
        }
        await updatePushButton();
      } catch (e) {
        alert(`Gagal: ${e.message}`);
        console.error('Push operation failed:', e);
        await updatePushButton(); // Pastikan UI kembali ke status sebenarnya
      } finally {
        pushBtn.disabled = false;
      }
    });
    
    // Panggil update saat navbar di-render
    updatePushButton();
  }

  return container;
}