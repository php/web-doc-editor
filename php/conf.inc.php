<?php

/**
 * WWW user
 */
define('DOC_EDITOR_WWW_USER', 'apache');
/**
 * WWW group
 */
define('DOC_EDITOR_WWW_GROUP', 'apache');
/**
 * MySQL server
 */
define('DOC_EDITOR_SQL_HOST', 'localhost');
/**
 * MySQL user
 */
define('DOC_EDITOR_SQL_USER', 'nobody');
/**
 * MySQL password
 */
define('DOC_EDITOR_SQL_PASS', '');
/**
 * MySQL database
 */
define('DOC_EDITOR_SQL_BASE', 'doc_editor');

/**
 * CVS server
 */
define('DOC_EDITOR_CVS_SERVER_HOST',    'cvs.php.net');
/**
 * CVS repository path
 */
define('DOC_EDITOR_CVS_SERVER_PATH',    '/repository');
/**
 * CVS server port
 */
define('DOC_EDITOR_CVS_SERVER_PORT',    '2401');
/**
 * CVS Anonymous user
 */
define('DOC_EDITOR_CVS_ANON_LOGIN',    'cvsread');
/**
 * CVS Anonymous user password
 */
define('DOC_EDITOR_CVS_ANON_PASSWORD', 'phpfi');
/**
 * CVS module
 */
define('DOC_EDITOR_CVS_MODULE', 'phpdoc-all');


/**
 * Data path
 */
define('DOC_EDITOR_DATA_PATH', dirname(__FILE__).'/../' . 'data/');
/**
 * CVS checkout path
 */
define('DOC_EDITOR_CVS_PATH', DOC_EDITOR_DATA_PATH . DOC_EDITOR_CVS_MODULE . '/');
