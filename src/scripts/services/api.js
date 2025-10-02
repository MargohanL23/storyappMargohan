import { BASE_URL } from '../utils/config.js';

async function fetchStories() {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Unauthorized: no token');

  const response = await fetch(`${BASE_URL}/stories`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || response.statusText || 'Failed to fetch stories');
  }
  return data.listStory || [];
}

async function addStory(formData) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Unauthorized: no token');

  if (!formData.has('description') || !formData.has('photo')) {
    throw new Error('Description and photo are required');
  }

  const response = await fetch(`${BASE_URL}/stories`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || response.statusText || 'Failed to add story');
  }
  return data;
}

async function login({ email, password }) {
  const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || response.statusText || 'Login failed');
  }
  return data;
}

async function register({ name, email, password }) {
  const response = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || response.statusText || 'Register failed');
  }
  return data;
}

export { fetchStories, addStory, login, register };

