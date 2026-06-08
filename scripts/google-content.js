/**
 * Google SSO Content Script
 * Automates account selection if multiple accounts exist.
 */

(function() {
  const LOG_PREFIX = '[Google-AutoLogin]';

  const isKekaLogin = () => {
    const url = new URL(window.location.href);
    const redirectUri = url.searchParams.get('redirect_uri');
    const clientId = url.searchParams.get('client_id');
    const scope = url.searchParams.get('scope');
    
    return (redirectUri && redirectUri.includes('keka.com')) || 
           (clientId && clientId.toLowerCase().includes('keka')) ||
           (document.title.toLowerCase().includes('keka'));
  };

  const findAccountElement = (email) => {
    // 1. Specific account selection
    if (email) {
      const allElements = Array.from(document.querySelectorAll('[role="link"], [role="button"], li, div[data-identifier]'));
      const match = allElements.find(el => {
        const text = el.textContent || '';
        const dataId = el.getAttribute('data-identifier') || '';
        return text.includes(email) || dataId === email;
      });
      if (match) return match;
    }

    // 2. Default: If only one account exists, it might be auto-selected by Google.
    // But if we are on the chooser, let's pick the first one if no email is set.
    const accountItems = document.querySelectorAll('div[data-authuser], [role="link"] div[data-identifier]');
    if (accountItems.length > 0) return accountItems[0].closest('[role="link"], [role="button"]');

    return null;
  };

  const startAutomating = async () => {
    if (!isKekaLogin()) return;

    // Wait for settings
    const settings = await chrome.storage.sync.get({
      autoLoginEmail: '',
      autoLoginEnabled: true
    });

    if (!settings.autoLoginEnabled) {
      console.log(`${LOG_PREFIX} Auto-login disabled.`);
      return;
    }

    console.log(`${LOG_PREFIX} Keka login detected on Google.`);

    const attempt = (retries) => {
      if (retries <= 0) return;

      const el = findAccountElement(settings.autoLoginEmail);
      if (el) {
        console.log(`${LOG_PREFIX} Clicking account...`);
        el.click();
      } else {
        setTimeout(() => attempt(retries - 1), 1000);
      }
    };

    // Only attempt if on account chooser or login hint page
    if (window.location.pathname.includes('/v3/signin/identifier') || 
        window.location.pathname.includes('/v3/signin/chooser') ||
        window.location.pathname.includes('/AccountChooser')) {
      attempt(5);
    }
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    startAutomating();
  } else {
    window.addEventListener('DOMContentLoaded', startAutomating);
  }
})();
