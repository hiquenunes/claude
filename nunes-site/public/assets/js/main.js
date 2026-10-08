/* Nunes Auditores — scripts do site (sem dependências externas) */
(function () {
  'use strict';
  var html = document.documentElement;
  html.classList.add('js');

  /* ---------- Menu no celular ---------- */
  var botao = document.querySelector('.menu-botao');
  var nav = document.getElementById('navegacao');
  if (botao && nav) {
    var mq = window.matchMedia('(max-width: 860px)');
    var aplicar = function () {
      if (mq.matches) {
        nav.hidden = botao.getAttribute('aria-expanded') !== 'true';
      } else {
        nav.hidden = false;
      }
    };
    botao.addEventListener('click', function () {
      var aberto = botao.getAttribute('aria-expanded') === 'true';
      botao.setAttribute('aria-expanded', String(!aberto));
      aplicar();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && botao.getAttribute('aria-expanded') === 'true') {
        botao.setAttribute('aria-expanded', 'false');
        aplicar();
        botao.focus();
      }
    });
    if (mq.addEventListener) { mq.addEventListener('change', aplicar); } else { mq.addListener(aplicar); }
    aplicar();
  }

  /* ---------- Formulário de contato ---------- */
  var form = document.getElementById('form-contato');
  if (!form) { return; }

  var status = document.getElementById('form-status');

  /* Pré-seleciona o assunto vindo da página de serviços (?assunto=...) */
  var params = new URLSearchParams(window.location.search);
  var assunto = params.get('assunto');
  var select = document.getElementById('assunto');
  if (assunto && select && select.querySelector('option[value="' + assunto.replace(/[^a-z-]/g, '') + '"]')) {
    select.value = assunto.replace(/[^a-z-]/g, '');
  }

  var mensagens = {
    nome: 'Informe seu nome.',
    email: 'Informe um e-mail válido, como nome@empresa.com.br.',
    telefone: 'Informe um telefone com DDD, só números ou no formato (51) 99999-9999.',
    mensagem: 'Escreva sua mensagem (mínimo de 10 caracteres).',
    consentimento: 'Para enviarmos uma resposta, marque a autorização de uso dos dados.'
  };

  function erroDe(campo) {
    return document.getElementById('erro-' + campo.name);
  }

  function validar(campo) {
    var ok = campo.checkValidity();
    var el = erroDe(campo);
    campo.setAttribute('aria-invalid', ok ? 'false' : 'true');
    if (el) { el.textContent = ok ? '' : (mensagens[campo.name] || 'Verifique este campo.'); }
    return ok;
  }

  /* O erro some assim que o campo é corrigido (ao digitar ou marcar), e não ao sair dele:
     se sumisse no blur, o botão Enviar mudaria de lugar no meio do clique e o envio se perderia. */
  Array.prototype.forEach.call(form.querySelectorAll('[data-validar]'), function (campo) {
    var revalidar = function () {
      if (campo.getAttribute('aria-invalid') === 'true') { validar(campo); }
    };
    campo.addEventListener('input', revalidar);
    campo.addEventListener('change', revalidar);
    campo.addEventListener('blur', function () {
      if (campo.type !== 'checkbox' && campo.value !== '') { validar(campo); }
    });
  });

  function mostrar(tipo, texto) {
    status.className = 'aviso aviso--' + tipo;
    status.textContent = texto;
    status.hidden = false;
    status.focus();
  }

  form.addEventListener('submit', function (e) {
    var campos = form.querySelectorAll('[data-validar]');
    var primeiroInvalido = null;
    Array.prototype.forEach.call(campos, function (c) {
      if (!validar(c) && !primeiroInvalido) { primeiroInvalido = c; }
    });
    if (primeiroInvalido) {
      e.preventDefault();
      primeiroInvalido.focus();
      return;
    }
    if (!window.fetch || !window.FormData || !window.URLSearchParams) { return; } /* envio tradicional */
    e.preventDefault();
    var enviar = form.querySelector('button[type="submit"]');
    enviar.disabled = true;
    enviar.textContent = 'Enviando…';
    /* Netlify Forms: envio em x-www-form-urlencoded para a raiz do site */
    fetch('/', {
      method: 'POST',
      body: new URLSearchParams(new FormData(form)).toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      credentials: 'same-origin'
    }).then(function (r) {
      if (r.ok) {
        form.reset();
        mostrar('sucesso', 'Mensagem enviada. Respondemos em horário comercial, de segunda a sexta, das 9h às 18h.');
      } else {
        mostrar('erro', 'Não foi possível enviar agora. Tente de novo em alguns minutos ou ligue para (51) 99993-7682.');
      }
    }).catch(function () {
      mostrar('erro', 'Sem conexão com o servidor. Verifique sua internet ou ligue para (51) 99993-7682.');
    }).then(function () {
      enviar.disabled = false;
      enviar.textContent = 'Enviar mensagem';
    });
  });
})();
