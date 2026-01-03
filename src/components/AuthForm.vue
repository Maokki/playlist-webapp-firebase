// AuthForm.vue with Firebase Authentication

<template>
  <div class="auth-form">
    <div class="form-toggle">
      <button 
        @click="isLogin = true" 
        :class="{ active: isLogin }"
        class="toggle-btn"
      >
        Login
      </button>
      <button 
        @click="isLogin = false" 
        :class="{ active: !isLogin }"
        class="toggle-btn"
      >
        Sign Up
      </button>
    </div>

    <form @submit.prevent="handleSubmit" class="auth-form-content">
      <h2>{{ isLogin ? 'Login' : 'Sign Up' }}</h2>
      
      <div class="form-group">
        <input 
          v-model="username" 
          type="text" 
          placeholder="Username" 
          required
          class="form-input"
        />
      </div>
      
      <div class="form-group">
        <input 
          v-model="password" 
          type="password" 
          placeholder="Password" 
          required
          minlength="6"
          class="form-input"
        />
      </div>
      
      <button type="submit" class="submit-btn" :disabled="loading">
        {{ loading ? 'Loading...' : (isLogin ? 'Login' : 'Sign Up') }}
      </button>
      
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile 
} from 'firebase/auth'
import { auth } from '../firebase'
import { createUserAccount } from '../firestore'

const emit = defineEmits(['authenticated'])

const isLogin = ref(true)
const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const handleSubmit = async () => {
  if (!username.value.trim() || !password.value.trim()) {
    error.value = 'Please fill in all fields'
    return
  }

  if (password.value.length < 6) {
    error.value = 'Password must be at least 6 characters'
    return
  }

  loading.value = true
  error.value = ''

  try {
    // Create email from username by appending @local domain
    // Remove spaces and special characters, keep only alphanumeric
    const sanitizedUsername = username.value.toLowerCase().replace(/[^a-z0-9]/g, '')
    const email = `${sanitizedUsername}@local.com`
    
    if (isLogin.value) {
      // Login
      const userCredential = await signInWithEmailAndPassword(auth, email, password.value)
      const user = userCredential.user
      
      // Get the actual username from the display name
      const displayUsername = user.displayName || username.value
      
      // Emit authenticated event with username and userId
      emit('authenticated', displayUsername, user.uid)
      
    } else {
      // Sign up
      try {
        console.log('Creating new user with email:', email);
        const userCredential = await createUserWithEmailAndPassword(auth, email, password.value)
        const user = userCredential.user
        
        console.log('User created in Auth:', user.uid);
        
        // Update the user's display name
        console.log('Updating display name to:', username.value);
        await updateProfile(user, {
          displayName: username.value
        })
        
        console.log('Display name updated. Creating Firestore user account...');
        
        // Create user account document in Firestore with email
        const result = await createUserAccount(user.uid, username.value, email)
        
        console.log('Firestore user account creation result:', result);
        
        // Emit authenticated event
        emit('authenticated', username.value, user.uid)
      } catch (signupError) {
        // If user creation fails, try to delete the auth user if it was created
        console.error('Signup error:', signupError)
        console.error('Signup error code:', signupError.code)
        console.error('Signup error message:', signupError.message)
        throw signupError
      }
    }
    
  } catch (err) {
    console.error('Authentication error:', err)
    
    // Handle Firebase errors
    switch (err.code) {
      case 'auth/email-already-in-use':
        error.value = 'Username already exists'
        break
      case 'auth/invalid-email':
        error.value = 'Invalid username format'
        break
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        error.value = 'Invalid username or password'
        break
      case 'auth/weak-password':
        error.value = 'Password should be at least 6 characters'
        break
      case 'auth/invalid-credential':
        error.value = 'Invalid username or password'
        break
      default:
        error.value = err.message || 'An error occurred'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-form {
  max-width: 420px;
  margin: 60px auto;
  padding: 35px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.07);
  box-shadow: 0 0 40px rgba(0, 255, 255, 0.1), inset 0 0 10px rgba(0, 255, 255, 0.04);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 255, 255, 0.2);
  color: #e6f0ff;
  font-family: 'Orbitron', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  position: relative;
}

.form-toggle {
  display: flex;
  margin-bottom: 25px;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(0, 255, 255, 0.05);
  border: 1px solid rgba(0, 255, 255, 0.1);
}

.toggle-btn {
  flex: 1;
  padding: 12px;
  background: transparent;
  color: #90e0ef;
  font-weight: 700;
  cursor: pointer;
  letter-spacing: 1px;
  transition: all 0.3s;
  border: none;
}

.toggle-btn.active {
  background: linear-gradient(to right, #00f5ff, #0ea5e9);
  color: #020617;
  box-shadow: inset 0 0 10px rgba(0, 255, 255, 0.5);
}

.auth-form-content {
  display: flex;
  flex-direction: column;
}

h2 {
  text-align: center;
  font-size: 26px;
  margin-bottom: 20px;
  color: #7dd3fc;
  letter-spacing: 1.2px;
}

.form-group {
  margin-bottom: 18px;
}

.form-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  box-sizing: border-box;
  transition: border 0.3s, box-shadow 0.3s;
}

.form-input:focus {
  outline: none;
  border-color: #38bdf8;
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.3);
}

.submit-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(to right, #38bdf8, #0ea5e9);
  color: #020617;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: bold;
  letter-spacing: 0.7px;
  cursor: pointer;
  transition: all 0.3s ease-in-out;
  box-shadow: 0 6px 18px rgba(14, 165, 233, 0.3);
}

.submit-btn:hover:not(:disabled) {
  background: linear-gradient(to right, #0ea5e9, #0284c7);
}

.submit-btn:disabled {
  background: #94a3b8;
  cursor: not-allowed;
  opacity: 0.6;
}

.error-message {
  margin-top: 14px;
  padding: 10px;
  background: rgba(255, 75, 75, 0.08);
  color: #ff4d4d;
  border: 1px solid rgba(255, 0, 0, 0.2);
  border-radius: 8px;
  text-align: center;
  font-size: 14px;
  font-family: 'Courier New', monospace;
}

/* Mobile responsive styles */
@media screen and (max-width: 768px) {
  .auth-form {
    max-width: 100%;
    margin: 40px 16px;
    padding: 28px 24px;
  }

  h2 {
    font-size: 22px;
  }

  .toggle-btn {
    padding: 14px 12px;
    font-size: 15px;
    min-height: 48px;
  }

  .form-input {
    padding: 14px;
    font-size: 16px;
    min-height: 48px;
  }

  .submit-btn {
    padding: 16px;
    font-size: 16px;
    min-height: 52px;
  }
}

@media screen and (max-width: 480px) {
  .auth-form {
    margin: 30px 12px;
    padding: 24px 20px;
    border-radius: 16px;
  }

  h2 {
    font-size: 20px;
    margin-bottom: 18px;
  }

  .form-toggle {
    margin-bottom: 20px;
  }

  .toggle-btn {
    font-size: 14px;
  }

  .error-message {
    font-size: 13px;
    padding: 12px;
  }
}

@media screen and (max-width: 360px) {
  .auth-form {
    margin: 20px 10px;
    padding: 20px 16px;
  }

  h2 {
    font-size: 18px;
  }
}

/* Touch device optimization */
@media (hover: none) and (pointer: coarse) {
  .toggle-btn:active {
    transform: scale(0.98);
  }

  .submit-btn:active:not(:disabled) {
    transform: scale(0.98);
  }
}
</style>