// types.js - Firestore collection names and type definitions

// Collection names
export const COLLECTIONS = {
  USER_ACCOUNT: 'user_account',
  PLAYLISTS: 'playlists',
  ITEMS: 'items'
};

// Status types
export const STATUS_TYPES = {
  PENDING: 'pending',
  ON_HOLD: 'on-hold',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  STOPPED: 'stopped'
};

// Status labels for display
export const STATUS_LABELS = {
  [STATUS_TYPES.PENDING]: 'Ongoing',
  [STATUS_TYPES.ON_HOLD]: 'Hiatus',
  [STATUS_TYPES.IN_PROGRESS]: 'Waiting',
  [STATUS_TYPES.COMPLETED]: 'Completed',
  [STATUS_TYPES.STOPPED]: 'Retired'
};

// Type definitions (for reference)
/**
 * @typedef {Object} UserAccount
 * @property {string} id - Document ID
 * @property {string} userId - Firebase Auth UID
 * @property {string} username - Display username
 * @property {string} email - Email (username@local.com format)
 * @property {Timestamp} createdAt - Creation timestamp
 */

/**
 * @typedef {Object} Playlist
 * @property {string} id - Document ID
 * @property {string} userId - Firebase Auth UID
 * @property {string} playlist_name - Playlist name
 * @property {Timestamp} createdAt - Creation timestamp
 */

/**
 * @typedef {Object} Item
 * @property {string} id - Document ID
 * @property {string} item_name - Item name
 * @property {string} status - One of STATUS_TYPES
 * @property {number|null} ratings - Rating 1-10
 * @property {string|null} status_Note - Optional status note
 * @property {string} playlist_id - Reference to playlist ID
 * @property {Timestamp} createdAt - Creation timestamp
 * @property {Timestamp} [updatedAt] - Last update timestamp
 */

// Validation functions
export const validateUsername = (username) => {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }
  const trimmed = username.trim();
  if (trimmed.length < 2) {
    return { valid: false, error: 'Username must be at least 2 characters' };
  }
  if (trimmed.length > 30) {
    return { valid: false, error: 'Username must be less than 30 characters' };
  }
  return { valid: true };
};

export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }
  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters' };
  }
  return { valid: true };
};

export const validateRating = (rating) => {
  if (rating === null || rating === undefined) {
    return { valid: true };
  }
  if (typeof rating !== 'number' || rating < 1 || rating > 10) {
    return { valid: false, error: 'Rating must be between 1 and 10' };
  }
  return { valid: true };
};

export const validateStatus = (status) => {
  const validStatuses = Object.values(STATUS_TYPES);
  if (!validStatuses.includes(status)) {
    return { valid: false, error: 'Invalid status type' };
  }
  return { valid: true };
};