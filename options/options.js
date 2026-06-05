/**
 * Options page logic
 */

const saveSettings = () => {
  const email = document.getElementById('email').value.trim();
  const enabled = document.getElementById('enabled').checked;

  chrome.storage.sync.set({
    autoLoginEmail: email,
    autoLoginEnabled: enabled
  }, () => {
    const status = document.getElementById('status');
    status.style.display = 'block';
    setTimeout(() => {
      status.style.display = 'none';
    }, 2500);
  });
};

const loadSettings = () => {
  chrome.storage.sync.get({
    autoLoginEmail: '',
    autoLoginEnabled: true
  }, (items) => {
    document.getElementById('email').value = items.autoLoginEmail;
    document.getElementById('enabled').checked = items.autoLoginEnabled;
  });
};

document.addEventListener('DOMContentLoaded', loadSettings);
document.getElementById('save').addEventListener('click', saveSettings);
