<?php

/**
 * WWW user
 */
define('DOC_EDITOR_WWW_USER',  'apache');
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
 * Version Control System type (cvs/svn/...)
 */
define('DOC_EDITOR_VCS', 'svn');
/**
 * VCS server
 */
define('DOC_EDITOR_VCS_SERVER_HOST',    'svn.php.net');
/**
 * VCS repository
 */
define('DOC_EDITOR_VCS_SERVER_REPOS',   'repository/');
/**
 * VCS project path
 */
define('DOC_EDITOR_VCS_SERVER_PATH',    DOC_EDITOR_VCS_SERVER_REPOS . 'phpdoc/modules/doc-all/');
/**
 * VCS server port
 */
define('DOC_EDITOR_VCS_SERVER_PORT',    '80');
/**
 * VCS Anonymous user
 */
define('DOC_EDITOR_VCS_ANON_LOGIN',    '');
/**
 * VCS Anonymous user password
 */
define('DOC_EDITOR_VCS_ANON_PASSWORD', '');
/**
 * VCS module
 */
define('DOC_EDITOR_VCS_MODULE', 'phpdoc-all');


/**
 * Data path
 */
define('DOC_EDITOR_DATA_PATH', dirname(__FILE__).'/../' . 'data/');
/**
 * VCS checkout path
 */
define('DOC_EDITOR_VCS_PATH', DOC_EDITOR_DATA_PATH . DOC_EDITOR_VCS_MODULE . '/');
