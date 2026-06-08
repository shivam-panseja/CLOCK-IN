/**
 * Keka Content Script
 */

(function() {
  const LOG_PREFIX = '[Keka-AutoLogin]';
  console.log(`${LOG_PREFIX} Script loaded on: ${window.location.href}`);

  const showToast = (message, isError = false) => {
    const toast = document.createElement('div');
    toast.textContent = `🚀 Keka: ${message}`;
    toast.style.cssText = `position:fixed;bottom:20px;right:20px;padding:12px;background:${isError?'#d32f2f':'#1976d2'};color:white;border-radius:4px;z-index:999999;font-family:sans-serif;box-shadow: 0 2px 10px rgba(0,0,0,0.2);`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  };

  const isLoginPage = () => {
    const url = window.location.href.toLowerCase();
    return url.includes('/account/login') || 
           url.includes('keka.com/login') ||
           url.includes('keka.com/connect') ||
           document.querySelector('form[action*="Login"]') !== null ||
           document.querySelector('.login-container') !== null ||
           document.querySelector('[id*="login"]') !== null;
  };

  const findGoogleLoginButton = () => {
    // 1. GSI Iframe check
    if (window.location.href.includes('accounts.google.com/gsi/button')) {
      return document.querySelector('[role="button"], #continue-as, .nsm7Bb-HzV7m-LgbsSe, [id*="google"]');
    }

    // 2. Known Keka specific selectors
    const specificBtn = document.querySelector('.btn-google-login, .g_id_signin, [href*="google"], [id*="google-login"]');
    if (specificBtn) return specificBtn;

    // 3. Fallback: search for "Google" text in clickables
    const allClickables = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
    return allClickables.find(el => {
        const text = (el.textContent || '').toLowerCase();
        return text.includes('google') && !text.includes('signed in');
    });
  };

  const captureToken = () => {
    const checkStorage = (storage, name) => {
      let candidateToken = null;
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        const value = storage.getItem(key);
        
        const isJWT = value && typeof value === 'string' && value.startsWith('ey') && value.split('.').length === 3;

        if (isJWT) {
          if (key.includes('access_token') || key.includes('oidc.user')) {
            console.log(`${LOG_PREFIX} Found Keka token in ${name} (key: ${key})`);
            chrome.storage.local.set({ 
              kekaToken: value, 
              kekaDomain: window.location.hostname,
              lastTokenUpdate: new Date().toISOString()
            });
            return true;
          }
          candidateToken = value;
        }
      }
      
      if (candidateToken) {
        chrome.storage.local.set({ 
          kekaToken: candidateToken, 
          kekaDomain: window.location.hostname,
          lastTokenUpdate: new Date().toISOString()
        });
        return true;
      }
      return false;
    };

    if (window.location.hostname.includes('google.com')) return false;
    return checkStorage(localStorage, 'localStorage') || checkStorage(sessionStorage, 'sessionStorage');
  };

  const performAutoClockin = async () => {
    const syncSettings = await chrome.storage.sync.get({ autoClockinEnabled: false });
    if (!syncSettings.autoClockinEnabled) return;

    const localData = await chrome.storage.local.get(['kekaToken', 'kekaDomain', 'lastClockInDate']);
    const today = new Date().toDateString();

    if (localData.lastClockInDate === today) {
      console.log(`${LOG_PREFIX} Already clocked in today (${today}).`);
      return;
    }

    if (!localData.kekaToken || !localData.kekaDomain) {
      console.log(`${LOG_PREFIX} Cannot auto clock-in: No token captured yet.`);
      return;
    }

    console.log(`${LOG_PREFIX} Triggering auto clock-in...`);
    showToast('Auto clock-in triggering...');

    const url = `https://${localData.kekaDomain}/k/attendance/api/mytime/attendance/webclockin`;
    const payload = {
      timestamp: new Date().toISOString(),
      attendanceLogSource: 1,
      locationAddress: null,
      manualClockinType: 1,
      note: "",
      originalPunchStatus: 0
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'authorization': `Bearer ${localData.kekaToken}`,
          'content-type': 'application/json; charset=UTF-8',
          'x-requested-with': 'XMLHttpRequest'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log(`${LOG_PREFIX} Auto clock-in success!`);
        showToast('Auto clock-in successful!');
        chrome.storage.local.set({ lastClockInDate: today });
      } else if (response.status === 401) {
        chrome.storage.local.remove(['kekaToken', 'kekaDomain', 'lastTokenUpdate']);
        showToast('Session expired. Please refresh Keka.', true);
      } else {
        console.error(`${LOG_PREFIX} Auto clock-in failed (Status ${response.status})`);
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} Auto clock-in error:`, error);
    }
  };

  const run = async (attempts = 0) => {
    const settings = await chrome.storage.sync.get({ autoLoginEnabled: true });
    
    const tokenCaptured = captureToken();
    if (tokenCaptured) {
        performAutoClockin();
    }

    if (!settings.autoLoginEnabled) return;

    const btn = findGoogleLoginButton();
    if (btn) {
      console.log(`${LOG_PREFIX} SUCCESS: Button found! Clicking now...`);
      showToast('Automating login...');
      
      // Try multiple click methods for robustness
      btn.click();
      if (typeof btn.dispatchEvent === 'function') {
          btn.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
          btn.dispatchEvent(new MouseEvent('mouseup', {bubbles: true}));
          btn.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      }
    } else if (attempts < 15) {
      // Retry more aggressively without checking isLoginPage
      setTimeout(() => run(attempts + 1), 1000);
    }
  };

  // Run as soon as possible
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    run();
  } else {
    window.addEventListener('load', run);
  }
})();
