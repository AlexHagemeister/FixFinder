// A full page reload, behind its own module so tests can replace it (jsdom cannot reload a page).
export function reloadPage(): void {
  window.location.reload();
}
