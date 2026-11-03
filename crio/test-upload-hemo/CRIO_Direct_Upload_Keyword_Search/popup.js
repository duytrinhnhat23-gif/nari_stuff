const checkbox = document.getElementById('enabled');
const status = document.getElementById('status');
function updateLabel(enabled) { status.textContent = enabled ? 'ON' : 'OFF'; status.style.color = enabled ? '#157347' : '#6b7280'; }
chrome.storage.local.get({ enabled: false }, ({ enabled }) => {
  checkbox.checked = enabled;
  updateLabel(enabled);
});
checkbox.addEventListener('change', () => {
  const enabled = checkbox.checked;
  chrome.storage.local.set({ enabled }, () => updateLabel(enabled));
});
