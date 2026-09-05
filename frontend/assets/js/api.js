// -----------------------------------------------------------------------
// Thin wrapper around fetch() for talking to the Apps Script Web App.
//
// IMPORTANT: we deliberately send the body as a plain string and do NOT set
// a Content-Type header. That keeps the request a browser "simple request"
// (no CORS preflight/OPTIONS), which Apps Script Web Apps cannot answer.
// -----------------------------------------------------------------------

const Api = (() => {
  function getToken() {
    return localStorage.getItem('mlw_token') || '';
  }
  function setSession({ token, fullName, role }) {
    localStorage.setItem('mlw_token', token);
    localStorage.setItem('mlw_fullName', fullName);
    localStorage.setItem('mlw_role', role);
  }
  function clearSession() {
    localStorage.removeItem('mlw_token');
    localStorage.removeItem('mlw_fullName');
    localStorage.removeItem('mlw_role');
  }
  function currentUser() {
    const token = getToken();
    if (!token) return null;
    return {
      token,
      fullName: localStorage.getItem('mlw_fullName') || '',
      role: localStorage.getItem('mlw_role') || 'secretary'
    };
  }

  async function call(action, payload = {}) {
    if (!CONFIG.API_URL || CONFIG.API_URL.indexOf('PASTE_YOUR') === 0) {
      throw new Error('The app is not connected yet — set API_URL in assets/js/config.js');
    }
    const body = Object.assign({ action, token: getToken() }, payload);

    let res;
    try {
      res = await fetch(CONFIG.API_URL, { method: 'POST', body: JSON.stringify(body) });
    } catch (netErr) {
      throw new Error('Could not reach the server. Check your internet connection and API_URL.');
    }

    let data;
    try {
      data = await res.json();
    } catch (parseErr) {
      throw new Error('Unexpected response from the server.');
    }

    if (!data.ok && data.code === 'SESSION_EXPIRED') {
      clearSession();
      window.dispatchEvent(new CustomEvent('mlw:session-expired'));
    }
    return data;
  }

  return { call, getToken, setSession, clearSession, currentUser };
})();
