<?php
global $DOC_EDITOR_VCS_SERVER_HOST, $DOC_EDITOR_VCS_SERVER_REPOS, $DOC_EDITOR_VCS_SERVER_PATH, $DOC_EDITOR_VCS_SERVER_PORT, $DOC_EDITOR_VCS_ANON_LOGIN, $DOC_EDITOR_VCS_ANON_PASSWORD, $DOC_EDITOR_VCS_MODULE, $DOC_EDITOR_VCS_KARMA_FILE, $DOC_EDITOR_DATA_PATH, $DOC_EDITOR_VCS_PATH, $DOC_EDITOR_VCS_CONFIGURE_SCRIPT_PATH, $DOC_EDITOR_NEWS_URL_EN, $DOC_EDITOR_NEWS_URL_LANG, $DOC_EDITOR_BUGS_URL_EN, $DOC_EDITOR_BUGS_URL_LANG, $DOC_EDITOR_ENTITIES_URL;

/**
 * VCS server
 */
$DOC_EDITOR_VCS_SERVER_HOST = 'svn.php.net';

/**
 * VCS repository
 */
$DOC_EDITOR_VCS_SERVER_REPOS = 'repository/';

/**
 * VCS project path
 *
 */
$DOC_EDITOR_VCS_SERVER_PATH = $DOC_EDITOR_VCS_SERVER_REPOS . 'phpdoc/modules/doc-all/';

/**
 * VCS server port
 */
$DOC_EDITOR_VCS_SERVER_PORT = '80';

/**
 * VCS Anonymous user
 */
$DOC_EDITOR_VCS_ANON_LOGIN = '';

/**
 * VCS Anonymous user password
 */
$DOC_EDITOR_VCS_ANON_PASSWORD = '';

/**
 * VCS module
 */
$DOC_EDITOR_VCS_MODULE = 'phpdoc-all';

/**
 * Karma File
 */
$DOC_EDITOR_VCS_KARMA_FILE = 'http://svn.php.net/viewvc/SVNROOT/global_avail?view=co';

/**
 * Data path
 */
$DOC_EDITOR_DATA_PATH = dirname(__FILE__).'/../' . 'data/';

/**
 * VCS checkout path
 */
$DOC_EDITOR_VCS_PATH = $DOC_EDITOR_DATA_PATH . $DOC_EDITOR_VCS_MODULE . '/';

/**
 * VCS configure.php path
 */
$DOC_EDITOR_VCS_CONFIGURE_SCRIPT_PATH = $DOC_EDITOR_VCS_PATH . 'doc-base/';

/**
 * News URL for EN
 */
$DOC_EDITOR_NEWS_URL_EN = 'http://news.php.net/group.php?format=rss&group=php.doc';

/**
 * News URL for LANG
 */
$DOC_EDITOR_NEWS_URL_LANG = 'http://news.php.net/group.php?format=rss&group=php.doc.{LANG}';

/**
 * Bugs URL for EN
 */
$DOC_EDITOR_BUGS_URL_EN = 'http://bugs.php.net/rss/search.php?cmd=display&bug_type[]=Documentation+problem&status=Open&search_for=&php_os=&php_os_not=0&boolean=1&author_email=&bug_age=0&by=&order_by=id&direction=DESC&phpver=&limit=10&assign=';

/**
 * Bugs URL for LANG
 */
$DOC_EDITOR_BUGS_URL_LANG = 'http://bugs.php.net/rss/search.php?cmd=display&bug_type[]=Translation+problem&status=Open&search_for=&php_os=&php_os_not=0&boolean=1&author_email=&bug_age=0&by=&order_by=id&direction=DESC&phpver=&limit=All&assign=&format=rss';

/**
 * Entities URL
 */
$DOC_EDITOR_ENTITIES_URL = $DOC_EDITOR_VCS_PATH.'/doc-base/entities/global.ent';

?>