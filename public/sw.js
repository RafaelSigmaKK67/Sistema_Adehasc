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
