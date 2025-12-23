// App.vue with Firebase/Firestore and Filtered Playlist View

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

const data_asc = computed(() => [...data.value].sort((a, b) => {
  const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt)
  const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt)
  return dateA - dateB
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

const addData = async () => {
  if (!input_content.value.trim() || !input_playlist.value) return

  try {
    const newItemData = {
      item_name: input_content.value.trim(),
      status: input_status.value,
      ratings: input_rating.value || null,
      status_Note: input_status_note.value.trim() || null,
      playlist_id: input_playlist.value
    }

    const createdItem = await createItem(newItemData)
    
    const playlist = playlists.value.find(p => p.id === input_playlist.value)
    const itemWithPlaylistName = {
      ...createdItem,
      playlist_name: playlist ? playlist.playlist_name : 'Unknown'
    }
    data.value.push(itemWithPlaylistName)

    // Reset form
    input_content.value = ''
    input_status.value = 'pending'
    input_status_note.value = ''
    input_rating.value = 0
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

const startEditing = (item) => {
  editingItem.value = item
  editContent.value = item.item_name
  editStatus.value = item.status
  editStatusNote.value = item.status_Note || ''
  editRating.value = item.ratings || 0
}

const cancelEdit = () => {
  editingItem.value = null
  editContent.value = ''
  editStatus.value = ''
  editStatusNote.value = ''
  editRating.value = 0
}

const saveEdit = async () => {
  if (!editContent.value.trim()) return

  try {
    const updatedItemData = {
      item_name: editContent.value.trim(),
      status: editStatus.value,
      ratings: editRating.value || null,
      status_Note: editStatusNote.value.trim() || null,
      playlist_id: editingItem.value.playlist_id
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
        <span :class="`bubble ${playlist.playlist_name.toLowerCase()}`"></span>
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

    <section class="create-data">
      <h3>ADD NEW ITEM</h3>
      <form @submit.prevent="addData">
        <h4>What do you want to add?</h4>
        <input type="text" placeholder="e.g. Games (ML)" v-model="input_content" required />

        <div class="add-playlist">
          <h4>Create new playlist</h4>
          <div class="playlist-input">
            <input type="text" v-model="newPlaylist" placeholder="e.g. Movies" @keyup.enter="addPlaylist" />
            <button type="button" @click="addPlaylist" :disabled="!newPlaylist.trim()">Add</button>
          </div>
        </div>

        <div class="form-group">
          <h4>Status</h4>
          <select v-model="input_status" class="status-select">
            <option value="pending">Ongoing</option>
            <option value="on-hold">Hiatus</option>
            <option value="in-progress">Waiting</option>
            <option value="completed">Completed</option>
            <option value="stopped">Retired</option>
          </select>
        </div>

        <div class="form-group">
          <h4>Status Note (optional)</h4>
          <input type="text" v-model="input_status_note" placeholder="e.g. Episode 1000, Chapter 45, etc." class="status-note-input" />
        </div>

        <div class="form-group">
          <h4>Rating (1-10)</h4>
          <div class="rating-container">
            <button v-for="star in 10" :key="star" type="button" @click="input_rating = star" :class="{ active: star <= input_rating }" class="star">★</button>
          </div>
        </div>

        <input type="submit" value="Add Item" :disabled="!input_content.trim() || !input_playlist" />
      </form>
    </section>

    <section class="data-list">
      <div v-if="input_playlist">
        <h3>{{ playlists.find(p => p.id === input_playlist)?.playlist_name || 'Unknown' }}</h3>
        <div v-for="item in filteredData" :key="item.id" :class="`data-item`">
          <template v-if="editingItem !== item">
            <label>
              <input type="checkbox" v-model="item.done" />
              <span :class="`bubble ${item.playlist_name ? item.playlist_name.toLowerCase() : 'default'}`"></span>
            </label>
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
          </template>
          <template v-else>
            <div class="edit-form">
              <input type="text" v-model="editContent" class="edit-input" />
              <div class="edit-meta">
                <select v-model="editStatus" class="edit-status">
                  <option value="pending">Ongoing</option>
                  <option value="on-hold">Hiatus</option>
                  <option value="in-progress">Waiting</option>
                  <option value="completed">Completed</option>
                  <option value="stopped">Retired</option>
                </select>
                <input 
                  type="text" 
                  v-model="editStatusNote"
                  placeholder="Status details..."
                  class="status-note-input"
                />
                <div class="edit-rating">
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
              <div class="edit-actions">
                <button @click="saveEdit" class="save">Save</button>
                <button @click="cancelEdit" class="cancel">Cancel</button>
              </div>
            </div>
          </template>
        </div>
      </div>
      <div v-if="filteredData.length === 0 && input_playlist" class="empty-state">
        No items in this playlist yet. Add your first item above!
      </div>
      <div v-if="!input_playlist" class="empty-state">
        Select a playlist to view items.
      </div>
    </section>
  </main>
</template>