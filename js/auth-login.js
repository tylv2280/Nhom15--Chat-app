// public/js/auth-login.js
(function(){
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnLogin');
    btn.disabled = true;

    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.error || ('HTTP '+res.status));

      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.userId);
      localStorage.setItem('username', data.username);

      location.href = '/chat.html';
    } catch (err) {
      alert(err.message || 'Đăng nhập thất bại');
    } finally {
      btn.disabled = false;
    }
  });
})();
