// firestore.js
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { COLLECTIONS } from './types';

// ==================== USER ACCOUNT ====================

export const createUserAccount = async (userId, username, email) => {
  try {
    console.log('Attempting to create user account:', { userId, username, email });
    
    const userAccountData = {
      userId: userId,
      username: username,
      email: email,
      createdAt: serverTimestamp()
    };
    
    console.log('User account data:', userAccountData);
    
    const docRef = await addDoc(collection(db, COLLECTIONS.USER_ACCOUNT), userAccountData);
    
    console.log('User account created successfully with ID:', docRef.id);
    
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating user account:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    throw error;
  }
};

export const getUserAccount = async (userId) => {
  try {
    console.log('Getting user account for userId:', userId);
    const q = query(collection(db, COLLECTIONS.USER_ACCOUNT), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    console.log('Query result - docs found:', querySnapshot.size);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      console.log('User account found:', doc.data());
      return { id: doc.id, ...doc.data() };
    }
    console.log('No user account found');
    return null;
  } catch (error) {
    console.error('Error getting user account:', error);
    throw error;
  }
};

// ==================== PLAYLISTS ====================

export const createPlaylist = async (userId, playlistName) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.PLAYLISTS), {
      userId,
      playlist_name: playlistName,
      createdAt: serverTimestamp()
    });
    
    return { 
      id: docRef.id, 
      userId,
      playlist_name: playlistName 
    };
  } catch (error) {
    console.error('Error creating playlist:', error);
    throw error;
  }
};

export const getPlaylists = async (userId) => {
  try {
    const q = query(
      collection(db, COLLECTIONS.PLAYLISTS), 
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    
    const playlists = [];
    querySnapshot.forEach((doc) => {
      playlists.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort in JavaScript instead of Firestore
    playlists.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
      return dateA - dateB;
    });
    
    return playlists;
  } catch (error) {
    console.error('Error getting playlists:', error);
    throw error;
  }
};

export const deletePlaylist = async (playlistId, userId) => {
  try {
    // First, delete all items in this playlist
    const itemsQuery = query(
      collection(db, COLLECTIONS.ITEMS), 
      where('playlist_id', '==', playlistId)
    );
    const itemsSnapshot = await getDocs(itemsQuery);
    
    const deletePromises = [];
    itemsSnapshot.forEach((doc) => {
      deletePromises.push(deleteDoc(doc.ref));
    });
    
    await Promise.all(deletePromises);
    
    // Then delete the playlist
    const playlistRef = doc(db, COLLECTIONS.PLAYLISTS, playlistId);
    await deleteDoc(playlistRef);
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting playlist:', error);
    throw error;
  }
};

// ==================== ITEMS ====================

export const createItem = async (itemData) => {
  try {
    const { item_name, status, ratings, status_Note, playlist_id } = itemData;
    
    const docRef = await addDoc(collection(db, COLLECTIONS.ITEMS), {
      item_name,
      status,
      ratings: ratings || null,
      status_Note: status_Note || null,
      playlist_id,
      createdAt: serverTimestamp()
    });
    
    return { 
      id: docRef.id, 
      ...itemData,
      createdAt: new Date()
    };
  } catch (error) {
    console.error('Error creating item:', error);
    throw error;
  }
};

export const getItems = async (userId) => {
  try {
    // First get all playlists for the user
    const playlists = await getPlaylists(userId);
    const playlistIds = playlists.map(p => p.id);
    
    if (playlistIds.length === 0) {
      return [];
    }
    
    // Get all items for these playlists
    const itemsQuery = query(
      collection(db, 'items'),
      where('playlist_id', 'in', playlistIds),
      orderBy('createdAt', 'desc')
    );
    
    const itemsSnapshot = await getDocs(itemsQuery);
    
    const items = [];
    itemsSnapshot.forEach((doc) => {
      const itemData = doc.data();
      const playlist = playlists.find(p => p.id === itemData.playlist_id);
      
      items.push({
        id: doc.id,
        ...itemData,
        playlist_name: playlist ? playlist.playlist_name : 'Unknown'
      });
    });
    
    return items;
  } catch (error) {
    console.error('Error getting items:', error);
    throw error;
  }
};

export const getItemsByPlaylist = async (playlistId) => {
  try {
    const q = query(
      collection(db, COLLECTIONS.ITEMS),
      where('playlist_id', '==', playlistId)
    );
    
    const querySnapshot = await getDocs(q);
    
    const items = [];
    querySnapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort in JavaScript instead of Firestore
    items.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
      return dateB - dateA; // Descending order (newest first)
    });
    
    return items;
  } catch (error) {
    console.error('Error getting items by playlist:', error);
    throw error;
  }
};

export const updateItem = async (itemId, itemData) => {
  try {
    const { item_name, status, ratings, status_Note, playlist_id } = itemData;
    
    const itemRef = doc(db, COLLECTIONS.ITEMS, itemId);
    await updateDoc(itemRef, {
      item_name,
      status,
      ratings: ratings || null,
      status_Note: status_Note || null,
      playlist_id,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating item:', error);
    throw error;
  }
};

export const deleteItem = async (itemId) => {
  try {
    const itemRef = doc(db, COLLECTIONS.ITEMS, itemId);
    await deleteDoc(itemRef);
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting item:', error);
    throw error;
  }
};