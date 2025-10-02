export function createStoryCard(story = {}) {
  const id = story.id || story._id || story.key || Math.random().toString(36).slice(2, 9);
  const card = document.createElement("article");
  card.className = "story-card";
  card.setAttribute("data-story-id", id);
  card.tabIndex = 0;

  // Data dengan fallback
  const imgSrc =
    story.photoUrl || story.photo || story.image || "https://via.placeholder.com/400x250?text=No+Image";
  const title = story.title || story.name || "Untitled";
  const desc = story.description || story.desc || "";
  const lat =
    story.lat ?? story.latitude ?? (story.location && story.location.lat) ?? null;
  const lon =
    story.lon ?? story.longitude ?? (story.location && story.location.lon) ?? null;

  // Lokasi fallback
  const locationText =
    lat !== null && lon !== null ? `Lat: ${lat}, Lon: ${lon}` : "Location not available";

  card.innerHTML = `
    <div class="story-card-media">
      <img 
        src="${imgSrc}" 
        alt="${title}" 
        loading="lazy" 
        onerror="this.src='https://via.placeholder.com/400x250?text=Image+Unavailable';"
      />
    </div>
    <div class="story-card-body">
      <h3>${title}</h3>
      <p>${desc}</p>
      <p class="meta">${locationText}</p>
      <div class="story-actions">
        <button 
          type="button" 
          class="btn-show-map" 
          data-story-id="${id}" 
          aria-label="Show ${title} on map"
        >
          Show on map
        </button>
      </div>
    </div>
  `;

  return card;
}
