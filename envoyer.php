<?php
/* CB Prod : réception des formulaires « Devis » et « Contact » du site.
   - envoie la demande à l'adresse de l'entreprise (notification) ;
   - envoie un accusé de réception au client ;
   - protège contre le spam (champ piège, délai minimum, limite par adresse IP) ;
   - enregistre chaque demande dans un fichier tableur (CSV) pour votre logiciel commercial.
   Les réglages modifiables sont juste en dessous. Le reste est technique. */

$CONFIG = [
  'destinataire' => 'direction@cbproducao.com',          // qui reçoit les demandes
  'expediteur'   => 'site@cbproducao.com',               // adresse d'envoi : doit exister sur le domaine cbproducao.com
  'nom_expediteur' => 'CB Prod',
  'max_par_heure' => 8,                                   // demandes maximum par visiteur et par heure
  'delai_min_secondes' => 4,                              // un humain met plus de 4 s à remplir le formulaire
  /* Dossier des demandes enregistrées (fichier demandes.csv). Par défaut : à côté de public_html,
     donc invisible depuis internet. Sinon : dossier « demandes » du site, bloqué par le .htaccess. */
  'dossier' => dirname(__DIR__) . '/demandes-cbprod',
];

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

function repondre($ok, $code = 200, $err = '') {
  http_response_code($code);
  echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'erreur' => $err]);
  exit;
}
function propre($s, $max = 5000) {
  $s = is_string($s) ? $s : '';
  $s = str_replace("\0", '', $s);
  $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $s);
  return mb_substr(trim($s), 0, $max, 'UTF-8');
}
function ligne($s) { return preg_replace('/[\r\n]+/', ' ', propre($s, 200)); }
function entete($s) { return '=?UTF-8?B?' . base64_encode($s) . '?='; }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') repondre(false, 405, 'methode');
$ref = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
if ($ref !== '' && !preg_match('#^https?://(www\.)?cbproducao\.com(/|$)#i', $ref)) repondre(false, 403, 'origine');

$brut = file_get_contents('php://input', false, null, 0, 50000);
$d = json_decode($brut, true);
if (!is_array($d)) repondre(false, 400, 'format');

/* 1. Anti-spam : champ piège et délai */
if (propre($d['site_web'] ?? '') !== '') repondre(true);               // robot : on fait semblant que tout va bien
if ((int)($d['duree'] ?? 0) < $CONFIG['delai_min_secondes'] * 1000) repondre(false, 429, 'trop_rapide');

/* 2. Contenu */
$type   = ($d['type'] ?? '') === 'devis' ? 'devis' : 'contact';
$lang   = in_array($d['lang'] ?? '', ['fr', 'en', 'pt'], true) ? $d['lang'] : 'fr';
$sujet  = ligne($d['sujet'] ?? '');
$email  = ligne($d['email'] ?? '');
$nom    = ligne($d['nom'] ?? '');
$prenom = ligne($d['prenom'] ?? '');
$champs = [];
foreach ((array)($d['champs'] ?? []) as $c) {
  if (!is_array($c) || count($champs) >= 40) continue;
  $k = ligne($c[0] ?? ''); $v = propre($c[1] ?? '');
  if ($k !== '' && $v !== '' && strtolower($k) !== 'site_web') $champs[] = [$k, $v];
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !$champs) repondre(false, 400, 'champs');
if ($sujet === '') $sujet = $type === 'devis' ? 'Demande de devis' : 'Message depuis le site';

/* 3. Limite par adresse IP (adresse jamais stockée en clair) */
$dossier = $CONFIG['dossier'];
if (!is_dir($dossier) && !@mkdir($dossier, 0750, true)) {
  $dossier = __DIR__ . '/demandes';
  if (!is_dir($dossier)) @mkdir($dossier, 0750, true);
}
if (is_dir($dossier) && !file_exists($dossier . '/.htaccess')) @file_put_contents($dossier . '/.htaccess', "Require all denied\n");
$ip = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|cbprod');
$fl = $dossier . '/.limites.json';
$lim = is_file($fl) ? (json_decode((string)@file_get_contents($fl), true) ?: []) : [];
$now = time();
foreach ($lim as $h => $ts) { $lim[$h] = array_values(array_filter((array)$ts, function ($t) use ($now) { return $t > $now - 3600; })); if (!$lim[$h]) unset($lim[$h]); }
if (count($lim[$ip] ?? []) >= $CONFIG['max_par_heure']) repondre(false, 429, 'limite');
$lim[$ip][] = $now;
@file_put_contents($fl, json_encode($lim), LOCK_EX);

/* 4. Enregistrement dans demandes.csv (s'ouvre dans Excel / LibreOffice, importable dans un logiciel commercial) */
$no = date('Ymd-His') . '-' . substr(bin2hex(random_bytes(3)), 0, 4);
$csv = $dossier . '/demandes.csv';
$nouveau = !is_file($csv);
$fh = @fopen($csv, 'a');
if ($fh) {
  flock($fh, LOCK_EX);
  if ($nouveau) { fwrite($fh, "\xEF\xBB\xBF"); fputcsv($fh, ['Numero', 'Date', 'Type', 'Langue', 'Prenom', 'Nom', 'Email', 'Sujet', 'Details'], ';'); }
  $det = implode(' | ', array_map(function ($c) { return $c[0] . ' : ' . preg_replace('/\s+/', ' ', $c[1]); }, $champs));
  $cell = function ($s) { return preg_match('/^[=+\-@]/', $s) ? "'" . $s : $s; };   // évite les formules dans Excel
  fputcsv($fh, array_map($cell, [$no, date('Y-m-d H:i'), $type, $lang, $prenom, $nom, $email, $sujet, $det]), ';');
  flock($fh, LOCK_UN); fclose($fh);
}

/* 5. Notification à CB Prod */
$corps = ($type === 'devis' ? "Nouvelle demande de devis" : "Nouveau message") . " depuis le site (" . strtoupper($lang) . ")\nN° $no\n\n";
foreach ($champs as $c) $corps .= $c[0] . " : " . $c[1] . "\n";
$corps .= "\nRépondre directement à cet e-mail pour écrire au client.\n";
$h = "From: " . entete($CONFIG['nom_expediteur'] . ' · site') . " <{$CONFIG['expediteur']}>\r\n"
   . "Reply-To: " . ($nom || $prenom ? entete(trim("$prenom $nom")) . " " : '') . "<$email>\r\n"
   . "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n";
$ok = @mail($CONFIG['destinataire'], entete("[Site] $sujet · $no"), $corps, $h, '-f' . $CONFIG['expediteur']);
if (!$ok) repondre(false, 500, 'envoi');

/* 6. Accusé de réception au client (texte fixe, sans reprendre le message, pour ne pas servir au spam) */
$AR = [
  'fr' => ['Nous avons bien reçu votre demande', "Bonjour%s,\n\nMerci pour votre demande, elle est bien arrivée chez CB Prod (référence %s).\nUn membre de notre équipe vous répond sous 48 heures ouvrées, du lundi au vendredi.\n\nPour ajouter des plans ou des photos, répondez simplement à cet e-mail.\n\nÀ très bientôt,\nL'équipe CB Prod\nEstrada Nacional N°9, Km 29, Igreja Nova, Mafra, Portugal\n+33 (1) 88 32 64 49 · +351 219 672 216\nhttps://www.cbproducao.com/\n"],
  'en' => ['We have received your request', "Hello%s,\n\nThank you for your request, it has reached CB Prod (reference %s).\nA member of our team will reply within 48 working hours, Monday to Friday.\n\nTo add plans or photos, simply reply to this email.\n\nKind regards,\nThe CB Prod team\nEstrada Nacional N°9, Km 29, Igreja Nova, Mafra, Portugal\n+33 (1) 88 32 64 49 · +351 219 672 216\nhttps://www.cbproducao.com/en/\n"],
  'pt' => ['Recebemos o seu pedido', "Olá%s,\n\nObrigado pelo seu pedido, que chegou à CB Prod (referência %s).\nUm membro da nossa equipa responde-lhe em 48 horas úteis, de segunda a sexta-feira.\n\nPara juntar plantas ou fotografias, basta responder a este e-mail.\n\nAté breve,\nA equipa CB Prod\nEstrada Nacional N°9, Km 29, Igreja Nova, Mafra, Portugal\n+351 219 672 216 · +33 (1) 88 32 64 49\nhttps://www.cbproducao.com/pt/\n"],
];
$qui = $prenom !== '' ? ' ' . mb_substr($prenom, 0, 40, 'UTF-8') : '';
$h2 = "From: " . entete($CONFIG['nom_expediteur']) . " <{$CONFIG['expediteur']}>\r\nReply-To: <{$CONFIG['destinataire']}>\r\n"
    . "Auto-Submitted: auto-replied\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n";
@mail($email, entete($AR[$lang][0] . ' · CB Prod'), sprintf($AR[$lang][1], $qui, $no), $h2, '-f' . $CONFIG['expediteur']);

repondre(true);
