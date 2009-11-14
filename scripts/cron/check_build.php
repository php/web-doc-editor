<?php

/***
* This script is intended to be placed in a cronjob.
* It must be run every Thursday, at 01hOO for example.
* On Unix, you can use crontab -e and place this :
* 00 01 * * 4 /usr/bin/php /path/to/your/vcs/dir/doc-editor/scripts/cron/check_build.php
****/

require_once dirname(__FILE__) . '/../../php/conf.inc.php';
require_once dirname(__FILE__) . '/../../php/AccountManager.php';
require_once dirname(__FILE__) . '/../../php/LogManager.php';
require_once dirname(__FILE__) . '/../../php/RepositoryManager.php';

// For all language, we check the build
foreach (RepositoryManager::getInstance()->availableLang as $lang) {

    $cmd = 'cd '.DOC_EDITOR_CVS_PATH.';/usr/bin/php configure.php --with-lang='.$lang.' --disable-segfault-error';
    $output = array();
    exec($cmd, $output);

    $m = implode("\n", $output);
    $msg = "Your documentation is broken. The build is done on Friday.

Please, try to fix it *quickly*.

Here is the output of the configure.php script :

=============================

$m

--
This email is send automatically by the PhpDocumentation Online Editor.
";

    $status = 1;
    // Send an email only if the build is broken
    if (!strstr($msg, 'All good. Saving .manual.xml... done.')) {

        $status = 0;

        $to = "doc-$lang@lists.php.net";

        $subject = "[DOC-".strtoupper($lang)."] - Your documentation is broken";

        AccountManager::getInstance()->email($to, $subject, $msg);
    }

    LogManager::getInstance()->saveBuildLogStatus($lang, $status);
}

?>
