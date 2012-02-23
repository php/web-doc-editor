<?php
error_reporting(E_ALL);
set_time_limit(0);

require_once '../php/DBConnection.php';


$conn = DBConnection::getInstance();



//ALTER TABLE  `work` ADD  `userID` INT( 10 ) UNSIGNED NOT NULL AFTER  `id`;
//ALTER TABLE  `patches` ADD  `userID` INT( 10 ) UNSIGNED NOT NULL AFTER  `id`;
print $conn->query('SELECT count(*) as cnt FROM `work`', array())->fetch_object()->cnt."\n";
$r = $conn->query('SELECT `id`,`user`,`anonymousIdent`,`project` FROM `work`', array());
$count = 0;
while ($a = $r->fetch_assoc()) {
    if (preg_match('/^anonymous\s\#(\d+)$/', $a['user'], $matches)) {
        $id = $matches[1];
    } else {
        $s = 'SELECT `userID` FROM `users` WHERE `project` = "%s" AND `vcs_login` = "%s" AND `anonymousIdent` = "%s"';
        $params = array($a['project'], $a['user'], $a['anonymousIdent']);
        $id = $conn->query($s, $params)->fetch_assoc();
        $id = $id['userID'];
    }
    if ($id) {
        $count++;
        $s = 'UPDATE `work` SET `userID`=%s  WHERE `id` = "%s"';
        $conn->query($s, array($id, $a['id']));
    }
}
print $count."\n";
print $conn->query('SELECT count(*) as cnt FROM `work` WHERE userID>0', array())->fetch_object()->cnt."\n";

print $conn->query('SELECT count(*) as cnt FROM `patches`', array())->fetch_object()->cnt."\n";
$r = $conn->query('SELECT `id`,`user`,`anonymousIdent`,`project` FROM `patches`', array());
$count = 0;
while ($a = $r->fetch_assoc()) {
    if (preg_match('/^anonymous\s\#(\d+)$/', $a['user'], $matches)) {
        $id = $matches[1];
    } else {
        $s = 'SELECT `userID` FROM `users` WHERE `project` = "%s" AND `vcs_login` = "%s" AND `anonymousIdent` = "%s"';
        $params = array($a['project'], $a['user'], $a['anonymousIdent']);
        $id = $conn->query($s, $params)->fetch_assoc();
        $id = $id['userID'];
    }
    if ($id) {
        $count++;
        $s = 'UPDATE `patches` SET `userID`=%s  WHERE `id` = "%s"';
        $conn->query($s, array($id, $a['id']));
    }
}
print $count."\n";
print $conn->query('SELECT count(*) as cnt FROM `patches` WHERE userID>0', array())->fetch_object()->cnt."\n";

//ALTER TABLE `work` DROP `user`, DROP `anonymousIdent`;
//ALTER TABLE `patches` DROP `user`, DROP `anonymousIdent`;

?>
