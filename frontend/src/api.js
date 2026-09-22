// QDS Quantum Chat API Client

const RENDER_PROD_URL = 'https://qds-p5ng.onrender.com';
const isProduction = typeof window !== 'undefined' && (
  window.location.hostname.includes('github.io') ||
  window.location.hostname.includes('onrender.com') ||
  window.location.hostname.includes('vercel.app')
);
const API_BASE = import.meta.env.VITE_API_BASE_URL || (isProduction ? `${RENDER_PROD_URL}/api/v1` : '/api/v1');

// Initial network topology setup for QuARC
export const initNetwork = async () => {
  try {
    const res = await fetch(`${API_BASE}/network/nodes`);
    if (!res.ok) return;
    const nodes = await res.json();
    if (nodes.length === 0) {
      await fetch(`${API_BASE}/network/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node_id: 'alice', node_type: 'CLIENT' })
      });
      await fetch(`${API_BASE}/network/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node_id: 'bob', node_type: 'CLIENT' })
      });
      await fetch(`${API_BASE}/network/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node_id: 'q1', node_type: 'ROUTER' })
      });
      await fetch(`${API_BASE}/network/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node_id: 'q2', node_type: 'ROUTER' })
      });

      await fetch(`${API_BASE}/network/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link_id: 'l1', source: 'alice', destination: 'q1', fidelity: 0.99, latency: 1.0 })
      });
      await fetch(`${API_BASE}/network/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link_id: 'l2', source: 'q1', destination: 'bob', fidelity: 0.99, latency: 1.0 })
      });
    }
  } catch (e) {
    console.error('Network init failed:', e);
  }
};

// ── Auth & Users ─────────────────────────────────────────────────────────────
export const fetchUsers = async (excludeUsername = '') => {
  try {
    const url = excludeUsername
      ? `${API_BASE}/auth/users?exclude_username=${encodeURIComponent(excludeUsername)}`
      : `${API_BASE}/auth/users`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch users');
    const data = await res.json();
    return data.users || [];
  } catch (err) {
    console.error('fetchUsers error:', err);
    return [];
  }
};

export const loginUser = async (username, password) => {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Login failed');
  }
  return res.json();
};

export const registerUser = async ({ username, password, display_name, role }) => {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, display_name, role })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Registration failed');
  }
  return res.json();
};

// ── Chat Messaging ───────────────────────────────────────────────────────────
export const fetchChatMessages = async (user1, user2, limit = 100, markRead = true) => {
  if (!user1 || !user2) return [];
  try {
    const res = await fetch(
      `${API_BASE}/chat/messages?user1=${encodeURIComponent(user1)}&user2=${encodeURIComponent(user2)}&limit=${limit}&mark_read=${markRead}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.messages || [];
  } catch (err) {
    console.error('fetchChatMessages error:', err);
    return [];
  }
};

export const fetchUnreadCounts = async (username) => {
  if (!username) return {};
  try {
    const res = await fetch(`${API_BASE}/chat/unread?username=${encodeURIComponent(username)}`);
    if (!res.ok) return {};
    const data = await res.json();
    return data.unread_counts || {};
  } catch (err) {
    console.error('fetchUnreadCounts error:', err);
    return {};
  }
};

export const markChatMessagesRead = async (recipient, sender) => {
  if (!recipient || !sender) return;
  try {
    await fetch(
      `${API_BASE}/chat/mark-read?recipient=${encodeURIComponent(recipient)}&sender=${encodeURIComponent(sender)}`,
      { method: 'POST' }
    );
  } catch (err) {
    console.error('markChatMessagesRead error:', err);
  }
};


export const searchChatMessages = async (username, query, limit = 50) => {
  if (!username || !query || !query.trim()) return [];
  try {
    const res = await fetch(
      `${API_BASE}/chat/search?username=${encodeURIComponent(username)}&q=${encodeURIComponent(query.trim())}&limit=${limit}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.messages || [];
  } catch (err) {
    console.error('searchChatMessages error:', err);
    return [];
  }
};

export const fetchAllChatMessages = async (requester, limit = 200) => {
  try {
    const res = await fetch(`${API_BASE}/chat/all-messages?requester=${encodeURIComponent(requester || '')}&limit=${limit}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch global audit ledger');
    }
    const data = await res.json();
    return data.messages || [];
  } catch (err) {
    console.error('fetchAllChatMessages error:', err);
    throw err;
  }
};



export const sendQuantumChatMessage = async ({
  sender,
  recipient,
  text = '',
  file_name = null,
  file_type = null,
  file_size = null,
  file_data = null,
  reply_to_id = null,
  reply_preview = null,
  ephemeral_ttl = null,
  is_audio = false,
  inject_attack = false,
  num_pairs = 1000
}) => {
  const res = await fetch(`${API_BASE}/chat/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender,
      recipient,
      text,
      file_name,
      file_type,
      file_size,
      file_data,
      reply_to_id,
      reply_preview,
      ephemeral_ttl,
      is_audio,
      inject_attack,
      num_pairs
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Quantum signature verification pipeline failed');
  }

  return res.json();
};

export const pinChatMessage = async (messageId, isPinned) => {
  const res = await fetch(`${API_BASE}/chat/messages/${messageId}/pin?is_pinned=${isPinned}`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to update pin status');
  return res.json();
};

export const starChatMessage = async (messageId, isStarred) => {
  const res = await fetch(`${API_BASE}/chat/messages/${messageId}/star?is_starred=${isStarred}`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to update star status');
  return res.json();
};

export const deleteSingleChatMessage = async (messageId) => {
  const res = await fetch(`${API_BASE}/chat/messages/${messageId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete message');
  return res.json();
};

export const fetchPinnedStarredMessages = async (username, contact = null) => {
  try {
    const url = contact
      ? `${API_BASE}/chat/pinned-starred?username=${encodeURIComponent(username)}&contact=${encodeURIComponent(contact)}`
      : `${API_BASE}/chat/pinned-starred?username=${encodeURIComponent(username)}`;
    const res = await fetch(url);
    if (!res.ok) return { pinned: [], starred: [], total: 0 };
    return await res.json();
  } catch (err) {
    console.error('fetchPinnedStarredMessages error:', err);
    return { pinned: [], starred: [], total: 0 };
  }
};

export const exportChatTranscript = async (user1, user2) => {
  const res = await fetch(
    `${API_BASE}/chat/export?user1=${encodeURIComponent(user1)}&user2=${encodeURIComponent(user2)}`
  );
  if (!res.ok) throw new Error('Failed to export conversation transcript');
  const data = await res.json();
  return data.transcript;
};

export const clearChatMessages = async (user1, user2) => {
  const res = await fetch(
    `${API_BASE}/chat/messages?user1=${encodeURIComponent(user1)}&user2=${encodeURIComponent(user2)}`,
    { method: 'DELETE' }
  );
  if (!res.ok) throw new Error('Failed to clear chat history');
  return res.json();
};
