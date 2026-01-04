// App.vue with Firebase/Firestore and Modal Pin Feature

<script setup>
import { ref, computed, onMounted } from 'vue'
import { signOut } from 'firebase/auth'
import { auth } from './firebase'
import { 
  createPlaylist, 
  getPlaylists, 
  deletePlaylist,
  createItem,
  getItems,
  updateItem,
  deleteItem 
} from './firestore'
import { STATUS_LABELS } from './types'
import { testFirebaseConnection } from './firebaseDebug'
import AuthForm from './components/AuthForm.vue'

// Test Firebase connection on mount
onMounted(() => {
  testFirebaseConnection()
})

const isAuthenticated = ref(false)
const user = ref('')
const userId = ref()

const playlists = ref([])
const data = ref([])

const input_content = ref('')
const input_playlist = ref('')
const input_status = ref('pending')
const input_status_note = ref('')
const input_rating = ref(0)

const newPlaylist = ref('')

const showAddModal = ref(false)
const showEditModal = ref(false)

const data_asc = computed(() => [...data.value].sort((a, b) => {
  // pinned items always come first
  if (a.isPinned && !b.isPinned) return -1
  if (!a.isPinned && b.isPinned) return 1

  // sort by date (newest first)
  const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt)
  const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt)
  return dateB - dateA
}))

// Filtered data based on selected playlist
const filteredData = computed(() => {
  if (!input_playlist.value) return []
  
  const selectedPlaylist = playlists.value.find(p => p.id === input_playlist.value)
  if (!selectedPlaylist) return []
  
  return data_asc.value.filter(item => item.playlist_id === input_playlist.value)
})

const statusLabels = STATUS_LABELS

const onAuthenticated = async (usernameFromServer, idFromServer) => {
  isAuthenticated.value = true
  user.value = usernameFromServer
  userId.value = idFromServer
  
  console.log('User authenticated:', { username: usernameFromServer, userId: idFromServer })
  
  try {
    await loadPlaylists()
    await loadData()
  } catch (error) {
    console.error('Error loading user data:', error)
  }
}

const logout = async () => {
  try {
    await signOut(auth)
    isAuthenticated.value = false
    user.value = ''
    userId.value = null
    data.value = []
    playlists.value = []
  } catch (error) {
    console.error('Logout error:', error)
  }
}

const loadPlaylists = async () => {
  try {
    console.log('Loading playlists for user:', userId.value)
    const playlistsData = await getPlaylists(userId.value)
    console.log('Playlists loaded:', playlistsData)
    playlists.value = playlistsData
    if (playlists.value.length > 0) {
      input_playlist.value = playlists.value[0].id
    }
  } catch (err) {
    console.error('Failed to load playlists:', err)
  }
}

const addPlaylist = async () => {
  const trimmed = newPlaylist.value.trim()
  if (!trimmed || playlists.value.some(p => p.playlist_name === trimmed)) return

  try {
    const newPlaylistObj = await createPlaylist(userId.value, trimmed)
    playlists.value.push(newPlaylistObj)
    input_playlist.value = newPlaylistObj.id
    newPlaylist.value = ''
  } catch (err) {
    console.error('Failed to add playlist:', err)
  }
}

const handleDeletePlaylist = async (playlist) => {
  const confirmed = window.confirm(`Are you sure you want to delete the playlist "${playlist.playlist_name}"? This will also delete all its items.`)
  if (!confirmed) return
  
  try {
    await deletePlaylist(playlist.id, userId.value)
    playlists.value = playlists.value.filter(p => p.id !== playlist.id)
    if (input_playlist.value === playlist.id) {
      input_playlist.value = playlists.value.length > 0 ? playlists.value[0].id : ''
    }
    await loadData()
  } catch (error) {
    console.error('Failed to delete playlist:', error)
  }
}

const openAddModal = () => {
  // Reset form
  input_content.value = ''
  input_status.value = 'pending'
  input_status_note.value = ''
  input_rating.value = 0
  showAddModal.value = true
}

const closeAddModal = () => {
  showAddModal.value = false
}

const addData = async () => {
  if (!input_content.value.trim() || !input_playlist.value) return

  try {
    const newItemData = {
      item_name: input_content.value.trim(),
      status: input_status.value,
      ratings: input_rating.value || null,
      status_Note: input_status_note.value.trim() || null,
      playlist_id: input_playlist.value,
      isPinned: false //new items are unpinned by default
    }

    const createdItem = await createItem(newItemData)
    
    const playlist = playlists.value.find(p => p.id === input_playlist.value)
    const itemWithPlaylistName = {
      ...createdItem,
      playlist_name: playlist ? playlist.playlist_name : 'Unknown'
    }
    data.value.push(itemWithPlaylistName)

    closeAddModal()
  } catch (err) {
    console.error('Failed to add item:', err)
  }
}

// Edit functionality
const editingItem = ref(null)
const editContent = ref('')
const editStatus = ref('')
const editStatusNote = ref('')
const editRating = ref(0)

// modal open for editing
const startEditing = (item) => {
  editingItem.value = item
  editContent.value = item.item_name
  editStatus.value = item.status
  editStatusNote.value = item.status_Note || ''
  editRating.value = item.ratings || 0
  showEditModal.value = true
}

const cancelEdit = () => {
  editingItem.value = null
  editContent.value = ''
  editStatus.value = ''
  editStatusNote.value = ''
  editRating.value = 0
  showEditModal.value = false
}

const saveEdit = async () => {
  if (!editContent.value.trim()) return

  try {
    const updatedItemData = {
      item_name: editContent.value.trim(),
      status: editStatus.value,
      ratings: editRating.value || null,
      status_Note: editStatusNote.value.trim() || null,
      playlist_id: editingItem.value.playlist_id,
      isPinned: editingItem.value.isPinned 
    }
    
    await updateItem(editingItem.value.id, updatedItemData)
    
    // Update local data
    const index = data.value.findIndex(item => item.id === editingItem.value.id)
    if (index !== -1) {
      data.value[index] = { 
        ...data.value[index], 
        ...updatedItemData,
        id: editingItem.value.id,
        playlist_name: editingItem.value.playlist_name
      }
    }
    
    cancelEdit()
  } catch (error) {
    console.error('Failed to update item:', error)
  }
}

const togglePin = async (item) => {
  try {
    const updatedItemData = {
      item_name: item.item_name,
      status: item.status,
      ratings: item.ratings,
      status_Note: item.status_Note,
      playlist_id: item.playlist_id,
      isPinned: !item.isPinned // toggle pin status
    }
    
    await updateItem(item.id, updatedItemData)
    
    // Update local data
    const index = data.value.findIndex(dataItem => dataItem.id === item.id)
    if (index !== -1) {
      data.value[index] = { 
        ...data.value[index], 
        isPinned: !item.isPinned 
      }
    }
  } catch (error) {
    console.error('Failed to toggle pin:', error)
  }
}

const removeData = async (item) => {
  try {
    await deleteItem(item.id)
    data.value = data.value.filter(dataItem => dataItem.id !== item.id)
  } catch (error) {
    console.error('Failed to delete item:', error)
  }
}

const loadData = async () => {
  try {
    console.log('Loading items for user:', userId.value)
    const items = await getItems(userId.value)
    console.log('Items loaded:', items)
    data.value = items
  } catch (err) {
    console.error('Failed to load data:', err)
  }
}
</script>

<template>
  <AuthForm v-if="!isAuthenticated" @authenticated="onAuthenticated" />

  <main v-else class="app">
    <section class="greeting">
      <h2 class="title">
        What's up, <input :value="user" readonly />
      </h2>
    </section>

    <button class="logout-btn" @click="logout">
      Logout ({{ user }})
    </button>

    <h3>Select playlist</h3>
    <div class="options">
      <label v-for="playlist in playlists" :key="playlist.id">
        <input type="radio" name="playlist" :value="playlist.id" v-model="input_playlist" />
        <div>{{ playlist.playlist_name }}</div>

        <button
          v-if="playlists.length > 1"
          class="delete-playlist"
          @click.stop="handleDeletePlaylist(playlist)"
        >
          ×
        </button>
      </label>
    </div>

    <!-- ===== MODAL FEATURE: Add Item Button ===== -->
    <div class="add-item-section">
      <button class="add-item-btn" @click="openAddModal" :disabled="!input_playlist">
        ➕ Add New Item
      </button>
    </div>

    <section class="data-list">
      <div v-if="input_playlist">
        <h3>{{ playlists.find(p => p.id === input_playlist)?.playlist_name || 'Unknown' }}</h3>
        <div v-for="item in filteredData" :key="item.id" :class="`data-item ${item.isPinned ? 'pinned' : ''}`">
          <div class="data-content">
            <div class="data-text">{{ item.item_name }}</div>
            <div class="data-meta">
              <span :class="`status-badge status-${item.status}`">
                {{ statusLabels[item.status] }}
                <span v-if="item.status_Note" class="status-note">: {{ item.status_Note }}</span>
              </span>
              <span class="rating" v-if="item.ratings">
                {{ '★'.repeat(item.ratings) }}{{ '☆'.repeat(10 - item.ratings) }}
              </span>
            </div>
          </div>
          <div class="actions">
            <button class="edit" @click="startEditing(item)">Edit</button>
            <button class="delete" @click="removeData(item)">Delete</button>
          </div>
        </div>
      </div>
      <div v-if="filteredData.length === 0 && input_playlist" class="empty-state">
        No items in this playlist yet. Click "Add New Item" to get started!
      </div>
      <div v-if="!input_playlist" class="empty-state">
        Select a playlist to view items.
      </div>
    </section>

    <!-- ===== MODAL FEATURE: Add Item Modal ===== -->
    <div v-if="showAddModal" class="modal-overlay" @click="closeAddModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Add New Item</h2>
          <button class="close-btn" @click="closeAddModal">×</button>
        </div>
        
        <form @submit.prevent="addData" class="modal-form">
          <div class="form-group">
            <label>What do you want to add?</label>
            <input type="text" placeholder="e.g. Games (ML)" v-model="input_content" required autofocus />
          </div>

          <div class="add-playlist">
            <label>Create new playlist</label>
            <div class="playlist-input">
              <input type="text" v-model="newPlaylist" placeholder="e.g. Movies" @keyup.enter="addPlaylist" />
              <button type="button" @click="addPlaylist" :disabled="!newPlaylist.trim()">Add</button>
            </div>
          </div>

          <div class="form-group">
            <label>Status</label>
            <select v-model="input_status" class="status-select">
              <option value="pending">Ongoing</option>
              <option value="on-hold">Hiatus</option>
              <option value="in-progress">Waiting</option>
              <option value="completed">Completed</option>
              <option value="stopped">Retired</option>
            </select>
          </div>

          <div class="form-group">
            <label>Status Note (optional)</label>
            <input type="text" v-model="input_status_note" placeholder="e.g. Episode 1000, Chapter 45, etc." />
          </div>

          <div class="form-group">
            <label>Rating (1-10)</label>
            <div class="rating-container">
              <button v-for="star in 10" :key="star" type="button" @click="input_rating = star" :class="{ active: star <= input_rating }" class="star">★</button>
            </div>
          </div>

          <div class="modal-actions">
            <button type="submit" class="submit-btn" :disabled="!input_content.trim() || !input_playlist">
              Add Item
            </button>
            <button type="button" class="cancel-btn" @click="closeAddModal">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ===== MODAL FEATURE: Edit Item Modal ===== -->
    <div v-if="showEditModal" class="modal-overlay" @click="cancelEdit">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Edit Item</h2>
          <button class="close-btn" @click="cancelEdit">×</button>
        </div>
        
        <form @submit.prevent="saveEdit" class="modal-form">
          <div class="form-group">
            <label>Item Name</label>
            <input type="text" v-model="editContent" required autofocus />
          </div>

          <div class="form-group">
            <label>Status</label>
            <select v-model="editStatus" class="status-select">
              <option value="pending">Ongoing</option>
              <option value="on-hold">Hiatus</option>
              <option value="in-progress">Waiting</option>
              <option value="completed">Completed</option>
              <option value="stopped">Retired</option>
            </select>
          </div>

          <div class="form-group">
            <label>Status Note (optional)</label>
            <input type="text" v-model="editStatusNote" placeholder="Status details..." />
          </div>

          <div class="form-group">
            <label>Rating (1-10)</label>
            <div class="rating-container">
              <button
                type="button"
                v-for="star in 10"
                :key="star"
                @click="editRating = star"
                :class="{ active: star <= editRating }"
                class="star"
              >
                ★
              </button>
            </div>
          </div>

          <div class="modal-actions">
            <!-- pin button in edit modal -->
            <button 
              type="button"
              @click="togglePin(editingItem)" 
              class="pin-btn"
              :class="{ pinned: editingItem?.isPinned }"
            >
              {{ editingItem?.isPinned ? '📌 Unpin' : '📍 Pin' }}
            </button>
            <button type="submit" class="submit-btn">
              Save Changes
            </button>
            <button type="button" class="cancel-btn" @click="cancelEdit">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  </main>
</template>

<style>
.data-item.pinned {
  border-left: 6px solid #fbbf24;
}

.add-item-section {
  margin: 2rem 0;
  display: flex;
  justify-content: center;
}

.add-item-btn {
  background: linear-gradient(135deg, #06141f, #020b12);
  color: #baf6ff;
  border: 1.5px solid rgba(0, 255, 255, 0.35);
  padding: 14px 26px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: .5px;
  cursor: pointer;
  transition: all .35s ease;
  box-shadow: 
    inset 0 0 10px rgba(0, 255, 255, .08),
    0 0 14px rgba(0, 180, 255, .25);
}

.add-item-btn:hover {
  transform: translateY(-2px) scale(1.02);
  border-color: rgba(0, 255, 255, 0.7);
  box-shadow:
    inset 0 0 12px rgba(0, 255, 255, .25),
    0 0 22px rgba(0, 200, 255, .8);
  color: #ffffff;
}

/* Modal Overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
}

/* Modal Content */
.modal-content {
  background: #2c2f48;
  border-radius: 10px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
}

/* Modal Header */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 2px solid #555;
}

.modal-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #f2f2f2;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  color: #bbb;
  cursor: pointer;
  line-height: 1;
  transition: color 0.2s ease;
}

.close-btn:hover {
  color: #f2f2f2;
}

/* Modal Form */
.modal-form {
  padding: 1.5rem;
}

.modal-form .form-group {
  margin-bottom: 20px;
}

.modal-form label,
.modal-form h4 {
  display: block;
  font-weight: 600;
  color: #f2f2f2;
  margin-bottom: 8px;
  font-size: 16px;
}

.modal-form input[type="text"],
.modal-form select {
  font-size: 16px;
  padding: 12px 16px;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #666;
  border-radius: 6px;
  background: #1a1c2b;
  color: #f5f5f5;
}

.modal-form input[type="text"]:focus,
.modal-form select:focus {
  outline: none;
  border-color: #00bcd4;
}

.modal-form .rating-container {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.modal-form .star {
  background: none;
  border: none;
  font-size: 22px;
  color: #555;
  cursor: pointer;
  transition: color 0.2s;
  padding: 4px;
}

.modal-form .star:hover,
.modal-form .star.active {
  color: #ffeb3b;
}

.modal-form .add-playlist {
  margin-bottom: 20px;
}

.modal-form .playlist-input {
  display: flex;
  gap: 10px;
}

.modal-form .playlist-input input {
  flex: 1;
  padding: 10px;
  border: 1px solid #666;
  border-radius: 6px;
  background: #1a1c2b;
  color: #f5f5f5;
  font-size: 16px;
}

.modal-form .playlist-input button {
  padding: 10px 18px;
  background: #00c853;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  white-space: nowrap;
  transition: background 0.3s;
}

.modal-form .playlist-input button:hover:not(:disabled) {
  background: #00a344;
}

.modal-form .playlist-input button:disabled {
  background: #777;
  cursor: not-allowed;
  opacity: 0.5;
}

/* Modal Actions */
.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #555;
}

.submit-btn {
  flex: 1;
  padding: 14px 26px;
  background: #00bcd4;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.3s;
}

.submit-btn:hover:not(:disabled) {
  background: #0097a7;
}

.submit-btn:disabled {
  background: #777;
  cursor: not-allowed;
  opacity: 0.5;
}

.cancel-btn {
  padding: 14px 26px;
  background: #757575;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.3s;
}

.cancel-btn:hover {
  background: #616161;
}

.pin-btn {
  padding: 14px 26px;
  background: #fef3c7;
  color: #78350f;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.3s;
}

.pin-btn:hover {
  background: #fbbf24;
}

.pin-btn.pinned {
  background: #fbbf24;
  color: white;
}
</style>