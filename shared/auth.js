/* ===== ระบบยืนยันตัวตนกลาง (ใช้ร่วมกันทุกเครื่องมือใน Hub) =====
   ตรวจสอบรหัส 6 หลักกับ Google Sheet ผ่าน Apps Script เดียวกัน (การ์ด "รหัสผ่าน" จัดการที่ Users tab)
   ใช้ localStorage เก็บสถานะล็อกอิน — ทำงานร่วมกันได้ทุกหน้าเพราะอยู่โดเมนเดียวกัน (GitHub Pages) */
(function () {
  // วาง URL ของ Apps Script Web App เดียวกับที่ใช้กับ ER Stock / DRP ตรงนี้ (ใช้ verifyCode action)
  const AUTH_API_URL = 'https://script.google.com/macros/s/AKfycbwqJ-UnliVTuV_541BnpP7ezCUZM9cloUMvMzg4i-Ara1AkOP4G4e8xNG2Moh9DYII3/exec';
  const AUTH_KEY = 'phq-auth-v1';

  function getAuth() {
    try { return JSON.parse(localStorage.getItem(AUTH_KEY)); } catch (e) { return null; }
  }
  function clearAuth() {
    localStorage.removeItem(AUTH_KEY);
  }

  function buildGate() {
    const overlay = document.createElement('div');
    overlay.id = 'phq-auth-gate';
    overlay.style.cssText = 'position:fixed;inset:0;background:#F5F6F1;z-index:99999;display:flex;align-items:center;justify-content:center;font-family:Sarabun,Inter,sans-serif;padding:20px;';
    overlay.innerHTML = `
      <div style="background:#fff;border:1px solid #DDE3D8;border-radius:18px;padding:36px 30px;max-width:340px;width:100%;box-shadow:0 12px 32px rgba(30,42,34,.1);text-align:center;">
        <div style="width:46px;height:46px;border-radius:13px;background:#0F6E56;color:#fff;display:flex;align-items:center;justify-content:center;font-size:21px;margin:0 auto 16px;">🔒</div>
        <h2 style="font-size:17px;margin:0 0 6px;color:#1E2A22;font-weight:700;">ยืนยันตัวตนก่อนใช้งาน</h2>
        <p style="font-size:13px;color:#5B6B60;margin:0 0 22px;line-height:1.6;">กรอกรหัส 6 หลักที่ได้รับจากผู้ดูแลระบบ<br>ติดต่อผู้ดูแลหากยังไม่มีรหัส</p>
        <input id="phq-code-input" maxlength="6" inputmode="numeric" autocomplete="off"
          style="width:100%;text-align:center;letter-spacing:10px;font-size:24px;font-family:inherit;padding:13px 10px;border:1px solid #DDE3D8;border-radius:11px;margin-bottom:12px;box-sizing:border-box;"
          placeholder="------">
        <div id="phq-auth-msg" style="font-size:12.5px;color:#A32D2D;min-height:18px;margin-bottom:6px;"></div>
        <button id="phq-auth-btn" style="width:100%;background:#0F6E56;color:#fff;border:none;padding:12px;border-radius:11px;font-family:inherit;font-size:14.5px;font-weight:600;cursor:pointer;">เข้าสู่ระบบ</button>
      </div>`;
    document.body.appendChild(overlay);

    const input = overlay.querySelector('#phq-code-input');
    const btn = overlay.querySelector('#phq-auth-btn');
    const msg = overlay.querySelector('#phq-auth-msg');
    input.addEventListener('input', () => { input.value = input.value.replace(/[^0-9]/g, ''); });
    setTimeout(() => input.focus(), 50);

    async function tryLogin() {
      const code = input.value.trim();
      if (code.length !== 6) { msg.textContent = 'กรุณากรอกรหัส 6 หลัก'; return; }
      btn.disabled = true; btn.textContent = 'กำลังตรวจสอบ...';
      msg.textContent = '';
      try {
        const res = await fetch(AUTH_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'verifyCode', code })
        });
        const data = await res.json();
        if (data.ok && data.valid) {
          localStorage.setItem(AUTH_KEY, JSON.stringify({ code, name: data.name, at: Date.now() }));
          overlay.remove();
          document.dispatchEvent(new CustomEvent('phq-auth-success', { detail: { name: data.name } }));
        } else {
          msg.textContent = 'รหัสไม่ถูกต้อง หรือยังไม่ได้รับสิทธิ์การใช้งาน';
          btn.disabled = false; btn.textContent = 'เข้าสู่ระบบ';
        }
      } catch (e) {
        msg.textContent = 'เชื่อมต่อไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่';
        btn.disabled = false; btn.textContent = 'เข้าสู่ระบบ';
      }
    }
    btn.addEventListener('click', tryLogin);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryLogin(); });
  }

  window.PHQAuth = {
    getAuth,
    clearAuth,
    requireAuth: function () {
      const auth = getAuth();
      if (!auth) buildGate();
      return auth;
    }
  };
})();
