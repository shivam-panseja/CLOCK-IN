/**
 * Options page logic
 */

const saveSettings = () => {
  const email = document.getElementById('email').value.trim();
  const enabled = document.getElementById('enabled').checked;
  const autoClockin = document.getElementById('auto-clockin').checked;

  chrome.storage.sync.set({
    autoLoginEmail: email,
    autoLoginEnabled: enabled,
    autoClockinEnabled: autoClockin
  }, () => {
    const status = document.getElementById('status');
    status.style.display = 'block';
    status.textContent = 'Settings saved successfully!';
    status.style.backgroundColor = '#e6f4ea';
    status.style.color = '#1e8e3e';
    setTimeout(() => {
      status.style.display = 'none';
    }, 2500);
  });
};

const loadSettings = () => {
  chrome.storage.sync.get({
    autoLoginEmail: '',
    autoLoginEnabled: true,
    autoClockinEnabled: false
  }, (items) => {
    document.getElementById('email').value = items.autoLoginEmail;
    document.getElementById('enabled').checked = items.autoLoginEnabled;
    document.getElementById('auto-clockin').checked = items.autoClockinEnabled;
  });

  updateSessionInfo();
};

const updateSessionInfo = () => {
  chrome.storage.local.get(['kekaDomain', 'lastTokenUpdate', 'lastClockInDate'], (items) => {
    const sessionInfo = document.getElementById('session-info');
    let infoText = '';
    
    if (items.kekaDomain && items.lastTokenUpdate) {
      infoText += `Active: ${items.kekaDomain}\nCaptured: ${new Date(items.lastTokenUpdate).toLocaleString()}`;
    } else {
      infoText += 'No active session captured. Visit Keka to capture.';
    }

    if (items.lastClockInDate) {
        infoText += `\nLast Clock-in: ${items.lastClockInDate}`;
    }

    sessionInfo.textContent = infoText;
    sessionInfo.style.whiteSpace = 'pre-line';
  });
};

const clearSession = () => {
  chrome.storage.local.remove(['kekaToken', 'kekaDomain', 'lastTokenUpdate', 'lastClockInDate'], () => {
    updateSessionInfo();
    const clockStatus = document.getElementById('clock-status');
    clockStatus.textContent = 'Session cleared.';
    clockStatus.style.display = 'block';
    clockStatus.style.backgroundColor = '#e6f4ea';
    clockStatus.style.color = '#1e8e3e';
    setTimeout(() => {
      clockStatus.style.display = 'none';
    }, 2000);
  });
};

const performAttendanceAction = (originalPunchStatus) => {
  const clockStatus = document.getElementById('clock-status');
  clockStatus.style.display = 'none';
  const actionName = originalPunchStatus === 0 ? 'Clock In' : 'Clock Out';

  chrome.storage.local.get(['kekaToken', 'kekaDomain'], async (items) => {
    if (!items.kekaToken || !items.kekaDomain) {
      clockStatus.textContent = `Error: No active Keka session found. Please visit your Keka dashboard first.`;
      clockStatus.style.display = 'block';
      clockStatus.style.backgroundColor = '#fce8e6';
      clockStatus.style.color = '#d93025';
      return;
    }

    const url = `https://${items.kekaDomain}/k/attendance/api/mytime/attendance/webclockin`;
    const payload = {
      timestamp: new Date().toISOString(),
      attendanceLogSource: 1,
      locationAddress: null,
      manualClockinType: 1,
      note: "",
      originalPunchStatus: originalPunchStatus
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'authorization': `Bearer ${items.kekaToken}`,
          'content-type': 'application/json; charset=UTF-8',
          'x-requested-with': 'XMLHttpRequest'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        clockStatus.textContent = `Successfully ${actionName.toLowerCase()}ed!`;
        clockStatus.style.display = 'block';
        clockStatus.style.backgroundColor = '#e6f4ea';
        clockStatus.style.color = '#1e8e3e';
        
        if (originalPunchStatus === 0) {
            const today = new Date().toDateString();
            chrome.storage.local.set({ lastClockInDate: today }, () => {
                updateSessionInfo();
            });
        }
      } else {
        const errorText = await response.text();
        clockStatus.textContent = `Failed (${response.status}): ${errorText.substring(0, 50)}`;
        clockStatus.style.display = 'block';
        clockStatus.style.backgroundColor = '#fce8e6';
        clockStatus.style.color = '#d93025';
        
        if (response.status === 401) {
            chrome.storage.local.remove(['kekaToken', 'kekaDomain', 'lastTokenUpdate'], updateSessionInfo);
        }
      }
    } catch (error) {
      clockStatus.textContent = `Error: ${error.message}`;
      clockStatus.style.display = 'block';
      clockStatus.style.backgroundColor = '#fce8e6';
      clockStatus.style.color = '#d93025';
    }
  });
};

document.addEventListener('DOMContentLoaded', loadSettings);
document.getElementById('save').addEventListener('click', saveSettings);
document.getElementById('clock-in').addEventListener('click', () => performAttendanceAction(0));
document.getElementById('clock-out').addEventListener('click', () => performAttendanceAction(1));
document.getElementById('clear-session').addEventListener('click', clearSession);
