// Service worker da ADEHASC: recebe as notificações push e abre o painel ao tocar.

self.addEventListener('push', function (evento) {
  var dados = {};
  try {
    dados = evento.data ? evento.data.json() : {};
  } catch (e) {
    dados = { corpo: evento.data ? evento.data.text() : '' };
  }
  var titulo = dados.titulo || 'ADEHASC';
  var opcoes = {
    body: dados.corpo || 'Você tem uma novidade no seu processo.',
    icon: '/icone-192.png',
    badge: '/icone-192.png',
    lang: 'pt-BR',
    data: { url: dados.url || '/painel' },
  };
  evento.waitUntil(self.registration.showNotification(titulo, opcoes));
});

// O navegador pode trocar a inscrição sozinho (rotação de chaves, limpeza).
// Sem isto, o morador pararia de receber notificações em silêncio.
self.addEventListener('pushsubscriptionchange', function (evento) {
  evento.waitUntil(
    fetch('/api/push/chave')
      .then(function (r) {
        return r.json();
      })
      .then(function (dados) {
        if (!dados.chave) return null;
        var bruto = atob(dados.chave.replace(/-/g, '+').replace(/_/g, '/'));
        var chave = new Uint8Array(bruto.length);
        for (var i = 0; i < bruto.length; i++) chave[i] = bruto.charCodeAt(i);
        return self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: chave,
        });
      })
      .then(function (inscricao) {
        if (!inscricao) return null;
        return fetch('/api/me/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inscricao: inscricao.toJSON() }),
        });
      })
      .catch(function () {
        /* o painel reinscreve o aparelho no próximo acesso */
      })
  );
});

self.addEventListener('notificationclick', function (evento) {
  evento.notification.close();
  var url = (evento.notification.data && evento.notification.data.url) || '/painel';
  evento.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (janelas) {
      for (var i = 0; i < janelas.length; i++) {
        if ('focus' in janelas[i]) {
          janelas[i].navigate(url);
          return janelas[i].focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
