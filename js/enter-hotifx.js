// public/js/enter-hotfix.js
(function(){
  function q(id){ return document.getElementById(id); }

  function ready(fn){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function(){
    const input   = q('msgInput');      // phải là <textarea id="msgInput">
    const sendBtn = q('btnSend');
    const enterCb = q('enterSend');

    if (!input || !sendBtn) return; // thiếu phần tử thì bỏ qua

    // Nếu chưa có thiết lập, mặc định BẬT "Enter để gửi"
    const prefRaw = localStorage.getItem('enterSend');
    if (enterCb) {
      const enabled = (prefRaw == null) ? true : (prefRaw === '1');
      enterCb.checked = enabled;
      enterCb.addEventListener('change', () => {
        localStorage.setItem('enterSend', enterCb.checked ? '1' : '0');
      });
    }

    function shouldSendOnEnter(e){
      // Chỉ gửi khi:
      // - Checkbox bật
      // - Không giữ Shift/Ctrl/Alt/Meta
      // - Không đang gõ kiểu IME (isComposing)
      // - Phím là Enter
      return (enterCb?.checked)
        && e.key === 'Enter'
        && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey
        && !e.isComposing;
    }

    // Chặn xuống dòng & bấm gửi
    input.addEventListener('keydown', function(e){
      if (shouldSendOnEnter(e)) {
        e.preventDefault();
        e.stopPropagation();
        // đảm bảo không gửi rỗng nếu chat.js có check
        sendBtn.click();
      }
    });

    // Bổ sung chặn ở keypress/keyup (một số trình duyệt)
    ['keypress','keyup'].forEach(ev=>{
      input.addEventListener(ev, function(e){
        if (shouldSendOnEnter(e)) { e.preventDefault(); e.stopPropagation(); }
      });
    });
  });
})();
