<?php
/**
 * Nunes Auditores — recebe o formulário de contato e envia por e-mail.
 * Requisitos: PHP 7.4+ com mail() habilitado na hospedagem.
 * Proteções: só POST, checagem de origem, campo-armadilha, tempo mínimo de preenchimento,
 * limite de envios por IP, validação e limpeza de todos os campos, bloqueio de injeção de cabeçalhos.
 * Nenhum dado do formulário é gravado em disco; o limite por IP guarda apenas um hash.
 */

declare(strict_types=1);

// ---------- Configuração ----------
const DESTINO      = 'auditoria@nunesauditores.com.br';
const REMETENTE    = 'site@nunesauditores.com.br'; // precisa existir no domínio (SPF/DKIM)
const DOMINIOS_OK  = ['nunesauditores.com.br', 'www.nunesauditores.com.br'];
const LIMITE_HORA  = 5;    // envios por IP por hora
const TEMPO_MINIMO = 3;    // segundos entre abrir a página e enviar
const TEMPO_MAXIMO = 7200; // formulário expira em 2 horas

header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
header('Referrer-Policy: strict-origin-when-cross-origin');

$querJson = isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false;

function responder(bool $ok, string $erro = '', int $status = 200): void
{
    global $querJson;
    http_response_code($status);
    if ($querJson) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'erro' => $erro], JSON_UNESCAPED_UNICODE);
    } else {
        header('Location: ' . ($ok ? '/contato/obrigado/' : '/contato/?erro=1'), true, 303);
    }
    exit;
}

// 1. Método
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    if (!$querJson) {
        header('Location: /contato/', true, 303); // acesso direto pelo navegador
        exit;
    }
    responder(false, 'Método não permitido.', 405);
}

// 2. Origem (bloqueia envios a partir de outros sites)
$origem = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
$hostOrigem = $origem !== '' ? (string) parse_url($origem, PHP_URL_HOST) : '';
if ($hostOrigem === '' || !in_array(strtolower($hostOrigem), DOMINIOS_OK, true)) {
    responder(false, 'Envio não autorizado.', 403);
}

// 3. Campo-armadilha e tempo de preenchimento (robôs)
if (!empty($_POST['website'])) {
    responder(true); // finge sucesso para não ensinar o robô
}
$t = (int) ($_POST['_t'] ?? 0);
$decorrido = time() - $t;
if ($t <= 0 || $decorrido < TEMPO_MINIMO || $decorrido > TEMPO_MAXIMO) {
    responder(false, 'O formulário expirou. Recarregue a página e tente de novo.', 400);
}

// 4. Limite por IP (guarda apenas um hash do IP, por uma hora)
$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$arquivo = sys_get_temp_dir() . '/nunes_form_' . hash('sha256', $ip . date('YmdH'));
$contagem = is_file($arquivo) ? (int) file_get_contents($arquivo) : 0;
if ($contagem >= LIMITE_HORA) {
    responder(false, 'Muitas mensagens em pouco tempo. Tente mais tarde ou ligue para (51) 99993-7682.', 429);
}

// 5. Validação e limpeza
function limpar(string $chave, int $max): string
{
    $v = isset($_POST[$chave]) && is_string($_POST[$chave]) ? $_POST[$chave] : '';
    $v = trim(strip_tags($v));
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v) ?? '';
    return mb_substr($v, 0, $max, 'UTF-8');
}
function linhaUnica(string $v): string
{
    return trim(str_replace(["\r", "\n", '%0a', '%0d'], ' ', $v));
}

$nome      = linhaUnica(limpar('nome', 120));
$email     = linhaUnica(limpar('email', 160));
$telefone  = linhaUnica(limpar('telefone', 20));
$empresa   = linhaUnica(limpar('empresa', 120));
$assunto   = linhaUnica(limpar('assunto', 60));
$mensagem  = limpar('mensagem', 3000);
$consentiu = ($_POST['consentimento'] ?? '') === 'sim';

$assuntosValidos = ['', 'auditoria-independente', 'consultoria-contabil', 'consultoria-empresarial',
    'recuperacao-tributaria', 'due-diligence', 'pericia-contabil', 'outro'];

if ($nome === '' || mb_strlen($nome) < 2) {
    responder(false, 'Informe seu nome.', 422);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    responder(false, 'Informe um e-mail válido.', 422);
}
if ($telefone !== '' && !preg_match('/^[0-9()+\s.\-]{8,20}$/', $telefone)) {
    responder(false, 'Informe um telefone válido.', 422);
}
if (!in_array($assunto, $assuntosValidos, true)) {
    $assunto = 'outro';
}
if (mb_strlen($mensagem) < 10) {
    responder(false, 'Escreva sua mensagem (mínimo de 10 caracteres).', 422);
}
if (!$consentiu) {
    responder(false, 'Marque a autorização de uso dos dados para enviarmos a resposta.', 422);
}
// Mensagens com muitos links costumam ser spam
if (preg_match_all('#https?://#i', $mensagem) > 2) {
    responder(false, 'Sua mensagem tem links demais. Remova-os e tente de novo.', 422);
}

// 6. Envio
$titulo = 'Contato pelo site' . ($assunto !== '' ? ' — ' . $assunto : '') . ' — ' . $nome;
$corpo  = "Nova mensagem enviada pelo site nunesauditores.com.br\n\n"
        . "Nome: {$nome}\n"
        . "E-mail: {$email}\n"
        . "Telefone: " . ($telefone !== '' ? $telefone : '-') . "\n"
        . "Empresa: " . ($empresa !== '' ? $empresa : '-') . "\n"
        . "Assunto: " . ($assunto !== '' ? $assunto : '-') . "\n"
        . "Consentimento LGPD: sim, em " . date('d/m/Y H:i') . "\n\n"
        . "Mensagem:\n{$mensagem}\n";

$cabecalhos = [
    'From: Site Nunes Auditores <' . REMETENTE . '>',
    'Reply-To: ' . $email,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: nunes-site',
];

mb_internal_encoding('UTF-8');
$enviado = mb_send_mail(DESTINO, $titulo, $corpo, implode("\r\n", $cabecalhos), '-f' . REMETENTE);

if (!$enviado) {
    responder(false, 'Não foi possível enviar agora. Tente de novo ou ligue para (51) 99993-7682.', 500);
}

@file_put_contents($arquivo, (string) ($contagem + 1), LOCK_EX);
responder(true);
