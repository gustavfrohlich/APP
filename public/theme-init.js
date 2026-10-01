// Téma beállítása az első festés előtt (villanás nélkül). Csak a megjelenés kedvéért tárolt érték.
(function () {
  var pref = 'system';
  try {
    pref = localStorage.getItem('bazis.theme') || 'system';
  } catch (e) {
    /* privát mód */
  }
  var dark =
    pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
})();
