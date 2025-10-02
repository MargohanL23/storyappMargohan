import { fetchStories } from '../services/api.js';
import { initMap, addMarker, clearMarkers, openMarkerForId, fitMarkers } from '../services/map.js';
import { createStoryCard } from '../components/story-card.js';

export default function Home() {
  const container = document.createElement('div');
  container.innerHTML = `
    <h1>Story List</h1>
    <div id="map" style="height:420px; margin-bottom:16px" role="region" aria-label="Peta lokasi cerita"></div>
    <div id="story-list" class="story-list" aria-live="polite"></div>
  `;

  const listEl = container.querySelector('#story-list');

  // loading state
  listEl.innerHTML = `<p>Loading stories...</p>`;

  // --- Init map setelah container ada di DOM ---
  setTimeout(() => {
    const map = initMap('map', { center: [-6.2, 106.8], zoom: 5 });

    fetchStories().then((stories) => {
      if (!stories || stories.length === 0) {
        listEl.innerHTML = `<p>No stories available.</p>`;
        return;
      }

      clearMarkers();
      listEl.innerHTML = '';

      for (const s of stories) {
        // normalize id & coordinates
        const id = s.id || s._id || s.key || Math.random().toString(36).slice(2,9);
        const lat = s.lat ?? s.latitude ?? (s.location && s.location.lat) ?? null;
        const lon = s.lon ?? s.longitude ?? (s.location && s.location.lon) ?? null;
        const title = s.title || s.name || 'Story';
        const desc = s.description || s.desc || '';

        // create card
        const card = createStoryCard(Object.assign({}, s, { id }));
        listEl.appendChild(card);

        // add marker if coords exist
        if (lat && lon) {
          const popupHtml = `<strong>${title}</strong><br>${desc}`;
          const marker = addMarker({ id, lat, lon, popupHtml });
          marker.on('click', () => {
            document.querySelectorAll('.story-card.active').forEach((c) => c.classList.remove('active'));
            const target = listEl.querySelector(`[data-story-id="${id}"]`);
            if (target) {
              target.classList.add('active');
              target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          });
        }
      }

      try { fitMarkers(); } catch (e) { /* ignore */ }
    }).catch((err) => {
      listEl.innerHTML = `<p>Error loading stories: ${err.message}</p>`;
    });
  }, 0);

  // Delegate click on "Show on map" buttons
  listEl.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.btn-show-map');
    if (!btn) return;
    const id = btn.getAttribute('data-story-id');
    openMarkerForId(id);
    document.querySelectorAll('.story-card.active').forEach((c) => c.classList.remove('active'));
    const target = listEl.querySelector(`[data-story-id="${id}"]`);
    if (target) target.classList.add('active');
  });

  listEl.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      const article = ev.target.closest('.story-card');
      if (!article) return;
      const id = article.getAttribute('data-story-id');
      openMarkerForId(id);
      document.querySelectorAll('.story-card.active').forEach((c) => c.classList.remove('active'));
      article.classList.add('active');
    }
  });

  return container;
}
