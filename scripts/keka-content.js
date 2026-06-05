/**
 * Keka Content Script - DEBUG VERSION
 */

(function() {
  const LOG_PREFIX = '[Keka-AutoLogin-Debug]';
  console.log(`${LOG_PREFIX} Script loaded on: ${window.location.href}`);

  const showToast = (message, isError = false) => {
    const toast = document.createElement('div');
    toast.textContent = `🚀 Keka: ${message}`;
    toast.style.cssText = `position:fixed;bottom:20px;right:20px;padding:12px;background:${isError?'#d32f2f':'#1976d2'};color:white;border-radius:4px;z-index:999999;font-family:sans-serif;`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  };

  const findGoogleLoginButton = () => {
    // 1. GSI Iframe check
    if (window.location.href.includes('accounts.google.com/gsi/button')) {
      console.log(`${LOG_PREFIX} Inside Google Iframe`);
      return document.querySelector('[role="button"], #continue-as, .nsm7Bb-HzV7m-LgbsSe');
    }

    // 2. Search ALL buttons and links for "Google"
    const allClickables = Array.from(document.querySelectorAll('button, a, div[role="button"], span'));
    console.log(`${LOG_PREFIX} Scanning ${allClickables.length} elements...`);
    
    const target = allClickables.find(el => {
      const text = (el.textContent || '').toLowerCase();
      const id = (el.id || '').toLowerCase();
      const cls = (el.className || '').toString().toLowerCase();
      return text.includes('google') || id.includes('google') || cls.includes('google');
    });

    if (target) {
      console.log(`${LOG_PREFIX} Found potential target:`, target);
      return target;
    }

    // 3. Known Keka specific selectors
    return document.querySelector('.btn-google-login, .g_id_signin, [href*="google"]');
  };

  const run = (attempts = 0) => {
    console.log(`${LOG_PREFIX} Run attempt ${attempts}`);
    
    const btn = findGoogleLoginButton();
    if (btn) {
      console.log(`${LOG_PREFIX} SUCCESS: Button found! Clicking now...`);
      showToast('Login button found! Automating...');
      
      // Try multiple click methods
      btn.click();
      btn.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
      btn.dispatchEvent(new MouseEvent('mouseup', {bubbles: true}));
      btn.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    } else if (attempts < 15) {
      setTimeout(() => run(attempts + 1), 1000);
    } else {
      console.log(`${LOG_PREFIX} FAILED: Could not find any Google login button.`);
    }
  };

  // Run as soon as possible
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    run();
  } else {
    window.addEventListener('load', run);
  }
})();
