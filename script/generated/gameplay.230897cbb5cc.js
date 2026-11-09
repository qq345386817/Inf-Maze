// A screenshot selector, not a browser version of the game.
const gallery = document.querySelector('[data-gameplay-gallery]');
if (gallery) {
  const image = gallery.querySelector('[data-gameplay-image]');
  const caption = gallery.querySelector('[data-gameplay-caption]');
  const buttons = [...gallery.querySelectorAll('[data-gameplay-src]')];
  for (const button of buttons) {
    button.addEventListener('click', () => {
      image.src = button.dataset.gameplaySrc;
      image.alt = button.dataset.gameplayAlt;
      caption.textContent = button.dataset.gameplayAlt;
      for (const item of buttons) item.setAttribute('aria-pressed', String(item === button));
    });
  }
}
