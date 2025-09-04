// public/js/register.js
(function () {
  const form = document.getElementById('registerForm');
  const $debug = document.getElementById('debug');

  function showDebug(obj) {
    if (!$debug) return;
    $debug.style.display = 'block';
    $debug.textContent = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    // email hiện chưa lưu ở backend – có thể gửi kèm để sau dùng
    const email = (document.getElementById('email')?.value || '').trim();

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // BE hiện chỉ dùng username/password
        body: JSON.stringify({ username, password, email })
      });

      // cố gắng parse JSON; nếu thất bại thì lấy text thô để dễ debug
      let data = null;
      try {
        data = await res.json();
      } catch {
        const txt = await res.text();
        showDebug({ nonJsonResponse: txt, status: res.status });
        alert(`Đăng ký thất bại (không nhận được JSON).`);
        return;
      }

      if (!res.ok) {
        // Hiển thị lỗi rõ ràng – KHÔNG để alert(undefined)
        const msg = data?.error || data?.message || `Đăng ký thất bại (HTTP ${res.status})`;
        showDebug({ status: res.status, data });
        alert(msg);
        return;
      }

      // Thành công
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.userId);
      alert('Đăng ký thành công!');
      window.location.href = '/chat.html';
    } catch (err) {
      console.error(err);
      showDebug(String(err));
      alert('Lỗi kết nối server');
    }
  });
})();
