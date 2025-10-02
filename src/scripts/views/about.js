// src/scripts/views/about.js
export default function About() {
  const container = document.createElement('div');
  container.innerHTML = `
    <h1>About</h1>
    <p>This is a sample SPA built for Dicoding Web Intermediate submission.</p>
  `;
  return container;
}
