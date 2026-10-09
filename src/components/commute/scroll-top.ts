// Lets the header ask the visible page to scroll back to the top (the logo does this on the home page).
type Listener = () => void;
const listeners = new Set<Listener>();

export function onScrollToTop(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function requestScrollToTop() {
  listeners.forEach((listener) => listener());
}
