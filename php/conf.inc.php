<?php

if (file_exists(dirname(__FILE__) . '/local.conf.inc.php')) {

    require_once dirname(__FILE__) . '/local.conf.inc.php';

} else {

    /**
     * WWW user
     */
    $DOC_EDITOR_WWW_USER = 'apache';
    /**
     * WWW group
     */
    $DOC_EDITOR_WWW_GROUP = 'apache';
    /**
     * MySQL server
     */
    $DOC_EDITOR_SQL_HOST = 'localhost';
    /**
     * MySQL user
     */
    $DOC_EDITOR_SQL_USER = 'nobody';
    /**
     * MySQL password
     */
    $DOC_EDITOR_SQL_PASS = '';
    /**
     * MySQL database
     */
    $DOC_EDITOR_SQL_BASE = 'doc_editor';

    /**
     * Version Control System type (cvs/svn/...)
     */
    $DOC_EDITOR_VCS = 'svn';

    /**
     * Data path
     */
    $DOC_EDITOR_DATA_PATH = dirname(__FILE__).'/../' . 'data/';

}

?>
