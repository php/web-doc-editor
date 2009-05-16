<?php

/***
* This script is intended to be placed in a cronjob.
* It must be run every Thursday, at 01hOO for example.
* On Unix, you can use crontab -e and place this :
* 00 01 * * 4 /usr/bin/php /path/to/your/cvs/dir/doc-editor/scripts/cron/check_build.php
****/

require_once dirname(__FILE__) . '/../../php/class.php';

$phpDoc = new phpDoc();

// For all language, we check the build
while (list(, $lang) = each($phpDoc->availableLanguage)) {

    $cmd = 'cd '.dirname(__FILE__).'/../'.DOC_EDITOR_CVS_PATH.';/usr/bin/php configure.php --with-lang='.$lang.' --disable-segfault-error';
    $output = array();
    exec($cmd, $output);

    $msg = implode("\n", $output);
    $msg = "Your documentation is broken. The build is done on Friday.\n\nPlease, try to fix it *quickly*.\n\nHere is the output of the configure.php script :\n\n=============================\n\n".$msg;

    $smg .= "
-- 
This email is send automatically by the PhpDocumentation Online Editor.
";

    $status = 1;
    // Send an email only if the build is broken
    if( !strstr($msg, 'All good. Saving .manual.xml... done.')) {

        $status = 0;

        $to = "doc-$lang@lists.php.net";

        $subject = "[DOC-".strtoupper($lang)."] - Your documentation is broken";

        $headers = 'From: www@php.net' . "\r\n" .
        'X-Mailer: PhpDocumentation Online Editor' . "\r\n" .
        'Content-Type: text/plain; charset="utf-8"'."\n";

        mail($to, $subject, $msg, $headers);

    }

    $phpDoc->buildLog($lang, $status);

}

?>