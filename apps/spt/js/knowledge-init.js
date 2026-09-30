/**
 * Wire up the Knowledge Base (e-book) button for SPT module.
 */
(function () {
  var btn = document.getElementById('btnOpenKnowledge');
  if (btn) {
    btn.addEventListener('click', function () {
      if (window.KnowledgeBase && window.KNOWLEDGE_CONTENT_SPT) {
        window.KnowledgeBase.open(window.KNOWLEDGE_CONTENT_SPT);
      }
    });
  }
})();
