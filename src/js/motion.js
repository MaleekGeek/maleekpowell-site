// Motion pass: split the home statement into words so each can light up on scroll.
// Only where the browser can tie animation to scroll and the visitor hasn't asked for less motion.
(function () {
  if (!window.CSS || !CSS.supports('animation-timeline: view()')) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.statement').forEach(function (st) {
    var label = st.textContent.replace(/\s+/g, ' ').trim();
    var walk = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var w = document.createElement('span'); w.className = 'w'; w.textContent = part; frag.appendChild(w);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(st);
    // Screen readers get the sentence once, not word by word
    st.setAttribute('aria-label', label);
    st.querySelectorAll('.w').forEach(function (w) { w.setAttribute('aria-hidden', 'true'); });
  });
})();
