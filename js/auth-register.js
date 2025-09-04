// public/js/auth-register.js
(function(){
  const form = document.getElementById('registerForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnReg');
    btn.disabled = true;

    const username = document.getElementById('username').value.trim();
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ username, email, password }) // must be "password"
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.error || ('HTTP '+res.status));

      // Auto login ngay sau đăng ký
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.userId);
      localStorage.setItem('username', data.username);

      location.href = '/chat.html';
    } catch (err) {
      alert(err.message || 'Lỗi đăng ký');
    } finally {
      btn.disabled = false;
    }
  });
})();
