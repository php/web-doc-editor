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
$DOC_EDITOR_VCS_SERVER_PATH =  $DOC_EDITOR_VCS_SERVER_REPOS . 'pear/peardoc/trunk/';

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
$DOC_EDITOR_VCS_ANON_PASSWORD='';

/**
 * VCS module
 */
$DOC_EDITOR_VCS_MODULE = 'peardoc';

/**
 * Karma File
 */
$DOC_EDITOR_VCS_KARMA_FILE = 'http://svn.php.net/viewvc/SVNROOT/global_avail?view=co';

/**
 * VCS path
 */
$DOC_EDITOR_VCS_PATH = $DOC_EDITOR_DATA_PATH . $DOC_EDITOR_VCS_MODULE . '/';


/**
 * VCS configure.php path
 */
$DOC_EDITOR_VCS_CONFIGURE_SCRIPT_PATH = $DOC_EDITOR_VCS_PATH;

/**
 * News URL for EN
 */
$DOC_EDITOR_NEWS_URL_EN = 'http://news.php.net/group.php?format=rss&group=php.pear.doc';

/**
 * News URL for LANG
 */
$DOC_EDITOR_NEWS_URL_LANG = 'http://news.php.net/group.php?format=rss&group=php.pear.doc';

/**
 * Bugs URL for EN
 */
$DOC_EDITOR_BUGS_URL_EN = 'http://pear.php.net/feeds/latest.rss';

/**
 * Bugs URL for LANG
 */
$DOC_EDITOR_BUGS_URL_LANG = 'http://pear.php.net/feeds/latest.rss';

/**
 * Entities URL
 */
$DOC_EDITOR_ENTITIES_URL = $DOC_EDITOR_VCS_PATH.'entities/global.ent';
?>