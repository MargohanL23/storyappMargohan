import { register } from '../services/api.js';

export default function Register() {
  const container = document.createElement('div');
  container.className = 'auth-page';

  container.innerHTML = `
    <h1>Register</h1>
    <form id="register-form" class="auth-form">
      <label>
        Name
        <input type="text" id="name" required />
      </label>
      <label>
        Email
        <input type="email" id="email" required />
      </label>
      <label>
        Password
        <input type="password" id="password" required minlength="6" />
      </label>
      <button type="submit">Register</button>
    </form>
    <p>Sudah punya akun? <a href="#/login">Login</a></p>
    <div id="register-message" class="auth-message"></div>
  `;

  const form = container.querySelector('#register-form');
  const messageEl = container.querySelector('#register-message');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    messageEl.textContent = 'Processing...';

    const name = container.querySelector('#name').value;
    const email = container.querySelector('#email').value;
    const password = container.querySelector('#password').value;

    try {
      const res = await fetch('https://story-api.dicoding.dev/v1/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Register failed');

      messageEl.textContent = 'Register successful! Redirecting to login...';
      setTimeout(() => {
        window.location.hash = '#/login';
      }, 1000);
    } catch (err) {
      messageEl.textContent = err.message;
    }
  });

  return container;
}
