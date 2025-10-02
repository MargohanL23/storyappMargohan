export function createFooter() {
  const footer = document.createElement('div');
  footer.className = 'footer';
  footer.innerHTML = `
    <p>&copy; ${new Date().getFullYear()} MyStory App - Created By Margohan</p>
  `;
  return footer;
}
