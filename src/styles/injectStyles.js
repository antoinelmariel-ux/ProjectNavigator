// Les feuilles de style voyagent dans le bundle sous forme de texte : sur une page SharePoint
// il n'existe aucun chemin relatif fiable vers un .css posé à côté du code.
export const injectStyles = (key, cssText) => {
  if (typeof document === 'undefined' || !key || typeof cssText !== 'string') {
    return;
  }
  if (document.querySelector(`style[data-cn-style="${key}"]`)) {
    return;
  }
  const style = document.createElement('style');
  style.dataset.cnStyle = key;
  style.textContent = cssText;
  document.head.appendChild(style);
};
