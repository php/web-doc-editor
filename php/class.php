<?php
/**
 *  PHPDocumentation Online Editor
 *
 *  This class is used to manage PhpDocumentation Online Editor.
 *
 *  @author Yannick Torres <yannick@php.net>
 *  @license LGPL
 */

set_time_limit(0);

require_once dirname(__FILE__) . '/conf.inc.php';
require_once './LockFile.php';

class phpDoc
{

    public $availableLanguage;

    /**
     * Hold the user's Cvs login.
     */
    public $cvsLogin;

    /**
     * Hold the user's Cvs lang.
     */
    public $cvsLang;

    /**
     * Hold the user's configuration.
     */
    public $userConf;

    /**
     * Hold the DB connection.
     */
    private $db;

    /**
     * Hold the user's Cvs password.
     */
    protected $cvsPasswd;


    function __construct() {

        // Connection MySqli
        try {
            $this->db = new mysqli(DOC_EDITOR_SQL_HOST, DOC_EDITOR_SQL_USER, DOC_EDITOR_SQL_PASS, DOC_EDITOR_SQL_BASE);
            if (mysqli_connect_errno()) {
                throw new Exception('connect databases faild!');
            }
        }
        catch (Exception $e) {
            echo $e->getMessage();
            exit;
        }

        $this->availableLanguage = array('ar','pt_BR','bg','zh','hk','tw','cs','da','nl','fi','fr','de','el','he','hu','it','ja','kr','no','fa','pl','pt','ro','ru', 'se','sk','sl','es','sv','tr');

    }

    /**
     * Checkout the phpdoc-all repository.
     * This method must be call ONLY by the /firstRun.php script.
     */

    function checkoutRepository() {

        $lock = new LockFile('lock_checkout_repository');

        if ($lock->lock()) {
            // We exec the checkout
            $cmd = "cd " . DOC_EDITOR_DATA_PATH ."; cvs -d :pserver:cvsread:phpfi@cvs.php.net:/repository login; cvs -d :pserver:cvsread:phpfi@cvs.php.net:/repository checkout phpdoc-all;";
            exec($cmd);
        }

        $lock->release();
    }


    /**
     * Apply the Revcheck tools recursively on all lang
     * @param $dir The directory from witch we start.
     * @param $idDir Directory id from the database.
     * @return Nothing.
     */
    function rev_do_revcheck( $dir = '', $idDir ) {
        if ($dh = opendir(DOC_EDITOR_CVS_PATH . 'en/' . $dir)) {

            $entriesDir = array();
            $entriesFiles = array();

            while (($file = readdir($dh)) !== false) {
                if (
                (!is_dir(DOC_EDITOR_CVS_PATH . 'en' . $dir.'/' .$file) && !in_array(substr($file, -3), array('xml','ent')) && substr($file, -13) != 'PHPEditBackup' )
                || strpos($file, 'entities.') === 0
                || $dir == '/chmonly' || $dir == '/internals' || $dir == '/internals2'
                || $file == 'contributors.ent' || $file == 'contributors.xml'
                || ($dir == '/appendices' && ($file == 'reserved.constants.xml' || $file == 'extensions.xml'))
                || $file == 'README'
                || $file == 'DO_NOT_TRANSLATE'
                || $file == 'rsusi.txt'
                || $file == 'missing-ids.xml'
                || $file == 'license.xml'
                || $file == 'versions.xml'
                ) {
                    continue;
                }

                if ($file != '.' && $file != '..' && $file != 'CVS' && $dir != '/functions') {

                    if (is_dir(DOC_EDITOR_CVS_PATH . 'en' . $dir.'/' .$file)) {
                        $entriesDir[] = $file;
                    } elseif (is_file(DOC_EDITOR_CVS_PATH . 'en' . $dir.'/' .$file)) {
                        $entriesFiles[] = $file;
                    }
                }
            }

            // Files first
            if (sizeof($entriesFiles) > 0 ) {

                foreach($entriesFiles as $file) {

                    $path = DOC_EDITOR_CVS_PATH . 'en' . $dir . '/' . $file;

                    $en_size = intval(filesize($path) / 1024);
                    $en_date = filemtime($path);

                    $infoEN      = $this->getInfoFromFile($path);
                    $en_revision = ($infoEN['rev'] == 'NULL') ? 'NULL' : "'".$infoEN['rev']."'";
                    $xmlid       = ($infoEN['xmlid'] == 'NULL') ? 'NULL' : "'".$infoEN['xmlid']."'";

                    // $this->Check_doc() ? is this dir is /reference/*/functions/ ?
                    $tmp = explode('/', $dir);
                    if (isset($tmp[1]) && isset($tmp[3]) && $tmp[1] == 'reference' && $tmp[3] == 'functions' ) {

                        $check_doc = $this->check_doc($infoEN['content']);

                    } else {

                        $check_doc['check_oldstyle']       = 'NULL';
                        $check_doc['check_undoc']          = 'NULL';
                        $check_doc['check_roleerror']      = 'NULL';
                        $check_doc['check_badorder']       = 'NULL';
                        $check_doc['check_noseealso']      = 'NULL';
                        $check_doc['check_noreturnvalues'] = 'NULL';
                        $check_doc['check_noparameters']   = 'NULL';
                        $check_doc['check_noexamples']     = 'NULL';
                        $check_doc['check_noerrors']       = 'NULL';

                    }

                    // Sql insert.
                    $s = "INSERT INTO files (lang, xmlid, dir, path, name, revision, size, mdate, maintainer, status, check_oldstyle,  check_undoc, check_roleerror, check_badorder, check_noseealso, check_noreturnvalues, check_noparameters, check_noexamples,check_noerrors)
                        VALUES ('en', $xmlid, '$idDir', '$dir/', '$file', $en_revision, $en_size,$en_date, NULL, NULL, ".$check_doc['check_oldstyle'].", ".$check_doc['check_undoc'].", ".$check_doc['check_roleerror'].", ".$check_doc['check_badorder'].", ".$check_doc['check_noseealso'].", ".$check_doc['check_noreturnvalues'].", ".$check_doc['check_noparameters'].", ".$check_doc['check_noexamples'].", ".$check_doc['check_noerrors'].")";

                    $this->db->query($s) or die('Error: '.$this->db->error);

                    reset($this->availableLanguage);

                    // Do for all language
                    while (list(, $lang) = each($this->availableLanguage)) {

                        $path = DOC_EDITOR_CVS_PATH . $lang . $dir . '/' . $file;

                        if (is_file($path)) {

                            // Initial revcheck method
                            $size = intval(filesize($path) / 1024);
                            $date = filemtime($path);

                            $size_diff = $en_size - $size;
                            $date_diff = (intval((time() - $en_date) / 86400)) - (intval((time() - $date) / 86400));

                            $infoLANG   = $this->getInfoFromFile($path);
                            $revision   = ($infoLANG['en-rev'] == 'NULL') ? 'NULL' : "'".$infoLANG['en-rev']."'";
                            $maintainer = ($infoLANG['maintainer'] == 'NULL') ? 'NULL' : "'".$infoLANG['maintainer']."'";
                            $status     = ($infoLANG['status'] == 'NULL') ? 'NULL' : "'".$infoLANG['status']."'";
                            $xmlid      = ($infoLANG['xmlid'] == 'NULL') ? 'NULL' : "'".$infoLANG['xmlid']."'";
                            $reviewed   = ($infoLANG['reviewed'] == 'NULL') ? 'NULL' : "'".$infoLANG['reviewed']."'";

                            $s = "INSERT INTO files
                                (lang, xmlid, dir, path, name, revision, en_revision, reviewed, size, size_diff, mdate, mdate_diff, maintainer, status)
                                VALUES
                                (
                                    '".$lang."',
                                    $xmlid,
                                    '$idDir',
                                    '$dir/',
                                    '$file',
                                    $revision,
                                    $en_revision,
                                    $reviewed,
                                    $size,
                                    $size_diff,
                                    $date,
                                    $date_diff,
                                    $maintainer,
                                    $status
                                )";

                            $this->db->query($s) or die('Error: '.$this->db->error);

                            // Check for error in this file ONLY if this file is uptodate
                            if ($revision == $en_revision ) {
                                $error = $this->tools_error_check_all($infoLANG['content'], $infoEN['content']);
                                if (count($error) > 0 ) { $this->tools_error_log($lang, $dir.'/', $file, $error, $maintainer); }
                            }

                        } else {
                            $this->db->query("INSERT INTO files (lang, dir, path, name, revision, size, mdate, maintainer, status) VALUES ('".$lang."', '$idDir', '$dir/', '$file', NULL, NULL, NULL, NULL, NULL);") or die('Error: '.$this->db->error);
                        }

                    }



                }
            }

            // Directories..
            if (sizeof($entriesDir) > 0) {

                reset($entriesDir);

                foreach ($entriesDir as $Edir) {

                    $path = DOC_EDITOR_CVS_PATH . 'en/' . $dir . '/' . $Edir;

                    $this->db->query("INSERT INTO dirs (parentDir, name) VALUES (" . $idDir . ", '$Edir');") or die('Error: '.$this->db->error);
                    $last_id = $this->db->insert_id;
                    $this->rev_do_revcheck($dir . '/' . $Edir, $last_id);

                }
            }
        }
        closedir($dh);
    }

    /**
     * Part of the revcheck tools. Start the Revcheck tools.
     * @return Nothing.
     */
    function rev_start() {

        $this->db->query("INSERT INTO dirs (parentDir, name) VALUES (0, '/');");
        $firstDir = $this->db->insert_id;
        $this->rev_do_revcheck('', $firstDir);

    }

    /**
     * Log into this application.
     * @param $cvsLogin  The login use to identify this user into PHP CVS server.
     * @param $cvsPasswd The password, in plain text, to identify this user into PHP CVS server.
     * @param $lang      The language we want to access.
     * @return An associated array.
     */
    function login($cvsLogin, $cvsPasswd, $lang='en') {

        $return = array(); // Value return

        // Is this user already exist on this server ? database check
        $s = 'SELECT * FROM users WHERE cvs_login=\''.$cvsLogin.'\' AND cvs_passwd=\''.$cvsPasswd.'\'';
        $r = $this->db->query($s) or die($this->db->error);
        $n = $r->num_rows;

        if ($n == 0 ) {

            // No match
            $this->cvsLogin  = $cvsLogin;
            $this->cvsPasswd = $cvsPasswd;
            $this->cvsLang   = $lang;

            $s = 'SELECT * FROM users WHERE cvs_login=\''.$cvsLogin.'\'';
            $r = $this->db->query($s) or die($this->db->error);
            $n = $r->num_rows;
            if ($n == 0 ) {

                //User unknow from this server for now.
                // Is a valid cvs user ?
                $r = $this->checkCvsAuth();

                if ($r === TRUE ) {

                    // We register this new valid user
                    $userID = $this->register_user();

                    //Store in session
                    $_SESSION['userID']    = $userID;
                    $_SESSION['cvsLogin']  = $this->cvsLogin;
                    $_SESSION['cvsPasswd'] = $this->cvsPasswd;
                    $_SESSION['lang']      = $this->cvsLang;
                    $_SESSION['userConf']  = array(

                    "conf_needupdate_diff"        => 'using-exec',
                    "conf_needupdate_scrollbars"  => 'true',
                    "conf_needupdate_displaylog"  => 'false',

                    "conf_error_skipnbliteraltag" => 'true',
                    "conf_error_scrollbars"       => 'true',
                    "conf_error_displaylog"       => 'false',

                    "conf_reviewed_scrollbars"    => 'true',
                    "conf_reviewed_displaylog"    => 'false',

                    "conf_allfiles_displaylog"    => 'false',

                    "conf_patch_scrollbars"       => 'true',
                    "conf_patch_displaylog"       => 'false',

                    "conf_theme"                  => 'themes/empty.css'
                    );

                    $return['state'] = true;

                } elseif ($r == 'Bad password') {
                    $return['state'] = false;
                    $return['msg']   = 'Bad cvs password';
                } else {
                    $return['state'] = false;
                    $return['msg']   = 'unknow from cvs';
                }

            } else {
                //User exist, but a bad password is enter
                $return['state'] = false;
                $return['msg']   = 'Bad db password';
            }

            return $return;

        } else {

            $a = $r->fetch_object();
            // user know on this server
            $this->cvsLogin  = $cvsLogin;
            $this->cvsPasswd = $cvsPasswd;
            $this->cvsLang   = $lang;
            $this->userConf  = array(

            "conf_needupdate_diff"        => $a->conf_needupdate_diff,
            "conf_needupdate_scrollbars"  => $a->conf_needupdate_scrollbars,
            "conf_needupdate_displaylog"  => $a->conf_needupdate_displaylog,

            "conf_error_skipnbliteraltag" => $a->conf_error_skipnbliteraltag,
            "conf_error_scrollbars"       => $a->conf_error_scrollbars,
            "conf_error_displaylog"       => $a->conf_error_displaylog,

            "conf_reviewed_scrollbars"    => $a->conf_reviewed_scrollbars,
            "conf_reviewed_displaylog"    => $a->conf_reviewed_displaylog,

            "conf_allfiles_displaylog"    => $a->conf_allfiles_displaylog,

            "conf_patch_scrollbars"       => $a->conf_patch_scrollbars,
            "conf_patch_displaylog"       => $a->conf_patch_displaylog,

            "conf_theme"                  => $a->conf_theme
            );

            // Store in session
            $_SESSION['userID'] = $a->userID;
            $_SESSION['cvsLogin'] = $this->cvsLogin;
            $_SESSION['cvsPasswd'] = $this->cvsPasswd;
            $_SESSION['lang'] = $this->cvsLang;
            $_SESSION['userConf'] = $this->userConf;

            $return['state'] = true;
            $return['msg']   = 'Welcome !';

            return $return;
        }

    }

    /**
     * Update the date/time about the lastConnexion for this user, in DB
     * @return Nothing.
     */
    function updateLastConnect() {

        $s = 'UPDATE users SET last_connect=now() WHERE userID=\''.$this->userID.'\'';
        $this->db->query($s);

    }

    /**
     * Check if there is an authentificated session or not
     * @return TRUE if there is an authentificated session, FALSE otherwise.
     */
    function isLogged() {

        if (isset($_SESSION['userID'])) {
            $this->userID     = $_SESSION['userID'];
            $this->cvsLogin   = $_SESSION['cvsLogin'];
            $this->cvsPasswd  = $_SESSION['cvsPasswd'];
            $this->cvsLang    = $_SESSION['lang'];

            $this->userConf   = ( isset($_SESSION['userConf']) ) ? $_SESSION['userConf'] : array(

            "conf_needupdate_diff"        => 'using-exec',
            "conf_needupdate_scrollbars"  => 'true',
            "conf_needupdate_displaylog"  => 'false',

            "conf_error_skipnbliteraltag" => 'true',
            "conf_error_scrollbars"       => 'true',
            "conf_error_displaylog"       => 'false',

            "conf_reviewed_scrollbars"    => 'true',
            "conf_reviewed_displaylog"    => 'false',

            "conf_allfiles_displaylog"    => 'false',

            "conf_patch_scrollbars"       => 'true',
            "conf_patch_displaylog"       => 'false',

            "conf_theme"                  => 'themes/empty.css'
            );

            $this->updateLastConnect();

            return true;
        } else {
            return false;
        }

    }

    /**
     * Register a new valid user on the application.
     * 
     * @todo The CVS password is stored in plain text into the database for later use. We need to find something better
     * @return int The database insert id
     */
    function register_user()
    {
        $s = sprintf('INSERT INTO users (`cvs_login`, `cvs_passwd`) VALUES ("%s", "%s")', $this->cvsLogin, $this->cvsPasswd);
        $this->db->query($s) or die($this->db->error);
        return $this->db->insert_id;
    }

    /**
     * Update the repository to sync our local copy. Simply exec an "cvs -f -q update -d -P" command.
     * As this exec command take some time, we start by creating a lock file, then run the command, then delete this lock file.
     * As it, we can test if this command has finish, or not.
     */
    function updateRepository() {
        // We place a lock file to test if update is finish
        $lock = new LockFile('lock_update_repository');
        if ($lock->lock()) {
            // We exec the update
            $cmd = "cd ".DOC_EDITOR_CVS_PATH."; cvs -f -q update -d -P . ;";
            exec($cmd);
        }

        // We remove the lock file
        $lock->release();
    }

    /**
     * CleanUp the dataBase before an Update.
     * 
     * @see updateRepository
     */
    function cleanUp()
    {
        // We cleanUp the database before update Cvs and apply again all tools
        foreach (array('dirs', 'files', 'translators', 'errorfiles') as $table) {
            $this->db->query(sprintf('TRUNCATE TABLE %s', $table)) or die($this->db->error);
        }
    }

    /**
     * Use to encode Cvs Password when we try to identify the user into PHP CVS Server.
     * @param $pass The password to encode.
     * @param $letter The password to encode.
     * @return string The encoded password
     */
    function encodeCvsPass($pass, $letter) {
        static $code = array(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
        14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
        31, 114, 120, 53, 79, 96, 109, 72, 108, 70, 64, 76, 67, 116, 74, 68,
        87, 111, 52, 75, 119, 49, 34, 82, 81, 95, 65, 112, 86, 118, 110, 122,
        105, 41, 57, 83, 43, 46, 102, 40, 89, 38, 103, 45, 50, 42, 123, 91,
        35, 125, 55, 54, 66, 124, 126, 59, 47, 92, 71, 115, 78, 88, 107, 106,
        56, 36, 121, 117, 104, 101, 100, 69, 73, 99, 63, 94, 93, 39, 37, 61,
        48, 58, 113, 32, 90, 44, 98, 60, 51, 33, 97, 62, 77, 84, 80, 85, 223,
        225, 216, 187, 166, 229, 189, 222, 188, 141, 249, 148, 200, 184, 136,
        248, 190, 199, 170, 181, 204, 138, 232, 218, 183, 255, 234, 220, 247,
        213, 203, 226, 193, 174, 172, 228, 252, 217, 201, 131, 230, 197, 211,
        145, 238, 161, 179, 160, 212, 207, 221, 254, 173, 202, 146, 224, 151,
        140, 196, 205, 130, 135, 133, 143, 246, 192, 159, 244, 239, 185, 168,
        215, 144, 139, 165, 180, 157, 147, 186, 214, 176, 227, 231, 219, 169,
        175, 156, 206, 198, 129, 164, 150, 210, 154, 177, 134, 127, 182, 128,
        158, 208, 162, 132, 167, 209, 149, 241, 153, 251, 237, 236, 171, 195,
        243, 233, 253, 240, 194, 250, 191, 155, 142, 137, 245, 235, 163, 242,
        178, 152);

        for ($i = 0; $i < strlen($pass); $i++) {
            $letter .= chr($code[ord($pass[$i])]);
        }
        return $letter;
    }

    /**
     * Test the CVS credentials against the server
     *
     * @return TRUE if the loggin success, error message otherwise.
     */
    function checkCvsAuth() {

        $fp = fsockopen(DOC_EDITOR_CVS_SERVER_HOST, DOC_EDITOR_CVS_SERVER_PORT);
        fwrite($fp, "BEGIN AUTH REQUEST\n");
        fwrite($fp, DOC_EDITOR_CVS_SERVER_PATH . "\n");
        fwrite($fp, $this->cvsLogin."\n");

        fwrite($fp, $this->encodeCvsPass($this->cvsPasswd,"A")."\n");
        fwrite($fp, "END AUTH REQUEST\n");

        $r = trim(fread($fp, 1024));

        if ($r != 'I LOVE YOU')  {
            if ($r == 'I HATE YOU') {
                return 'Bad password';
            } else {
                return $r;
            }
        } else {
            return true;
        }

    }

    /**
     * Get Cvs log of a specified file.
     * @param $Path The path of the file.
     * @param $File The name of the file.
     * @return An array containing all Cvs log informations.
     */
    function cvsGetLog($Path, $File) {

        $cmd = 'cd '.DOC_EDITOR_CVS_PATH.$Path.'; cvs log '.$File;

        $output = array();
        exec($cmd, $output);

        $output = implode("\n", $output);

        $output = str_replace("=============================================================================", "", $output);

        $part = explode("----------------------------", $output);

        for ($i=1; $i < count($part); $i++ ) {

            $final[$i-1]['id'] = $i;

            $final[$i-1]['raw'] = $part[$i];

            // Get revision
            $out = array();
            preg_match('/revision (.*?)\n/e', $part[$i], $out);
            $final[$i-1]['revision'] = $out[1];

            // Get date
            $out = array();
            preg_match('/date: (.*?);/e', $part[$i], $out);
            $final[$i-1]['date'] = $out[1];

            // Get user
            $out = array();
            preg_match('/author: (.*?);/e', $part[$i], $out);
            $final[$i-1]['author'] = $out[1];

            //Get content
            $content = explode("\n", $part[$i]);

            if (substr($content[3], 0, 9) == 'branches:' ) { $j=4; }
            else { $j=3; }

            $final[$i-1]['content'] = '';

            for ($h=$j; $h < count($content); $h++) {
                $final[$i-1]['content'] .= $content[$h]."\n";
            }
            $final[$i-1]['content'] = str_replace("\n", '<br/>', trim($final[$i-1]['content']));
        }

        return $final;
    }

    /* Methods for the revcheck */

    /**
     * Parse a string to find all attributs.
     * @param $tags_attrs The string to parse.
     * @return An associated array who key are the name of the attribut, and value, the value of the attribut.
     */
    function rev_parse_attr_string($tags_attrs) {
        $tag_attrs_processed = array();

        // Go through the tag attributes
        foreach ($tags_attrs as $attrib_list) {

            // Get attr name and values
            $attribs = array();
            preg_match_all('!(.+)=\\s*(["\'])\\s*(.+)\\2!U', $attrib_list, $attribs);

            // Assign all attributes to one associative array
            $attrib_array = array();
            foreach ($attribs[1] as $num => $attrname) {
                $attrib_array[trim($attrname)] = trim($attribs[3][$num]);
            }
            // Collect in order of tags received
            $tag_attrs_processed[] = $attrib_array;
        }
        // Retrun with collected attributes
        return $tag_attrs_processed;
    }

    function rev_check_old_files($dir = '') {

        if ($dh = opendir(DOC_EDITOR_CVS_PATH . $this->cvsLang . $dir)) {

            $entriesDir = array();
            $entriesFiles = array();

            while (($file = readdir($dh)) !== false) {
                if (
                (!is_dir(DOC_EDITOR_CVS_PATH . $this->cvsLang . $dir.'/' .$file) && !in_array(substr($file, -3), array('xml','ent')) && substr($file, -13) != 'PHPEditBackup' )
                || strpos($file, 'entities.') === 0
                || $dir == '/chmonly' || $dir == '/internals' || $dir == '/internals2'
                || $file == 'contributors.ent' || $file == 'contributors.xml'
                || ($dir == '/appendices' && ($file == 'reserved.constants.xml' || $file == 'extensions.xml'))
                || $file == 'README'
                || $file == 'DO_NOT_TRANSLATE'
                || $file == 'rsusi.txt'
                || $file == 'missing-ids.xml'
                ) {
                    continue;
                }

                if ($file != '.' && $file != '..' && $file != 'CVS' && $dir != '/functions') {

                    if (is_dir(DOC_EDITOR_CVS_PATH . $this->cvsLang . $dir.'/' .$file)) {
                        $entriesDir[] = $file;
                    } elseif (is_file(DOC_EDITOR_CVS_PATH . $this->cvsLang . $dir.'/' .$file)) {
                        $entriesFiles[] = $file;
                    }
                }
            }

            // Files first
            if (!empty($entriesFiles)) {
                foreach($entriesFiles as $file) {
                    $path_en = DOC_EDITOR_CVS_PATH . 'en/' . $dir . '/' . $file;
                    $path = DOC_EDITOR_CVS_PATH . $this->cvsLang . $dir . '/' . $file;

                    if (!@is_file($path_en)) {
                        $size = intval(filesize($path) / 1024);
                        $this->db->query("INSERT INTO old_files (lang, dir, file, size, userID) VALUES ('$lang', '$dir', '$file', '$size', ".$this->userID.");") or die('Error: '.$this->db->error);
                    }
                }
            }

            // Directories..
            if (!empty($entriesDir)) {
                foreach ($entriesDir as $Edir) {
                    $this->rev_check_old_files($dir . '/' . $Edir);
                }
            }
        }
        closedir($dh);
    }

    /**
     * Part of the revcheck tools. Parse the translation's file witch hold all informations about all translators and put it into database.
     * @return Nothing.
     */
    function rev_parse_translation() {

        reset($this->availableLanguage);
        while (list(, $lang) = each($this->availableLanguage)) {

            // Path to find translation.xml file, set default values,
            // in case we can't find the translation file
            $translation_xml = DOC_EDITOR_CVS_PATH . $lang . "/translation.xml";

            if (file_exists($translation_xml)) {
                // Else go on, and load in the file, replacing all
                // space type chars with one space
                $txml = preg_replace('/\\s+/', ' ', join('', file($translation_xml)));

            }

            if (isset($txml)) {
                // Find all persons matching the pattern
                $matches = array();
                if (preg_match_all('!<person (.+)/\\s?>!U', $txml, $matches)) {
                    $default = array('cvs' => 'n/a', 'nick' => 'n/a', 'editor' => 'n/a', 'email' => 'n/a', 'name' => 'n/a');
                    $persons = $this->rev_parse_attr_string($matches[1]);

                    $charset = $this->getFileEncoding($txml, 'content');

                    foreach ($persons as $person) {

                        if ($charset == 'utf-8' ) {
                            $name = utf8_decode($person['name']);
                        } else {
                            $name = $person['name'];
                        }

                        $person = array_merge($default, $person);
                        $s = "INSERT INTO translators (`lang`, `nick`, `name`, `mail`, `cvs`, `editor`) VALUES ('".$lang."', '" . $this->db->real_escape_string($person['nick']) . "', '" . $this->db->real_escape_string($name) . "', '" . $this->db->real_escape_string($person['email']) . "', '" . $this->db->real_escape_string($person['cvs']) . "', '" . $this->db->real_escape_string($person['editor']) . "')";
                        $this->db->query($s) or die($this->db->error);
                    }
                }
            }
        }
    } // parse_translation

    /**
     * Get all modified files.
     * @return An associated array containing all informations about modified files.
     */
    function get_modified_files() {

        // Get Modified Files
        $s = sprintf('SELECT `id`, `lang`, `path`, `name`, CONCAT("1.", `revision`) AS `revision`,
        CONCAT("1.", `en_revision`) AS `en_revision`, `maintainer`, `reviewed` FROM `pendingCommit` WHERE 
        `lang`="%s" OR `lang`="en"', $this->cvsLang);

        $r = $this->db->query($s) or die($this->db->error);

        $node = array();

        while ($a = $r->fetch_assoc()) {
            $node[$a['lang'].$a['path'].$a['name']] = $a;
        }

        return $node;

    }

    /**
     * Get all files witch have an error.
     * @return An associated array containing all informations about files witch have an error.
     */
    function get_files_error() {

        // Get Files Need Commit
        $ModifiedFiles = $this->get_modified_files();

        if ($_SESSION['userConf']['conf_error_skipnbliteraltag'] == 'true' ) {
            $type = ' type != \'nbLiteralTags\' AND ';
        } else {
            $type = '';
        }

        $s    = 'SELECT * FROM `errorfiles` WHERE '.$type.' `lang`=\''.$this->cvsLang.'\' AND `type` != \'-No error-\'';
        $r    = $this->db->query($s);
        $nb   = $r->num_rows;
        $node = array();

        $alreadyNode = array();

        while ($a = $r->fetch_object()) {

            if (!isset($alreadyNode[$a->path.$a->name])) {

                if (isset($ModifiedFiles[$this->cvsLang.$a->path.$a->name]) || isset($ModifiedFiles['en'.$a->path.$a->name])) {

                    if (isset($ModifiedFiles['en'.$a->path.$a->name])) {
                        $new_maintainer   = $a->maintainer;
                    }

                    if (isset($ModifiedFiles[$this->cvsLang.$a->path.$a->name])) {
                        $new_maintainer   = $ModifiedFiles[$this->cvsLang.$a->path.$a->name]['maintainer'];
                    }

                    $node[] = array(
                    "id"         => $a->id,
                    "path"       => $a->path,
                    "name"       => $a->name,
                    "maintainer" => $new_maintainer,
                    "value_en"   => $a->value_en,
                    "value_lang" => $a->value_lang,
                    "type"       => $a->type,
                    "needcommit" => true
                    );

                } else {

                    $node[] = array(
                    "id"         => $a->id,
                    "path"       => $a->path,
                    "name"       => $a->name,
                    "maintainer" => ( isset($ModifiedFiles[$this->cvsLang.$a->path.$a->name]) ) ? $ModifiedFiles[$this->cvsLang.$a->path.$a->name]['maintainer'] : $a->maintainer,
                    "value_en"   => $a->value_en,
                    "value_lang" => $a->value_lang,
                    "type"       => $a->type,
                    "needcommit" => false
                    );

                }

                $alreadyNode[$a->path.$a->name] = 1;
            }

        }

        return array('nb'=>$nb, 'node'=>$node);

    }

    /**
     * Get all files witch need to be updated.
     * @return An associated array containing all informations about files witch need to be updated.
     */
    function get_files_need_update() {

        // Get Files Need Commit
        $ModifiedFiles = $this->get_modified_files();

        $s = 'SELECT * FROM `files` WHERE `lang` = \''.$this->cvsLang.'\' AND `revision` != `en_revision`';
        $r = $this->db->query($s);
        $nb = $r->num_rows;

        $node = array();

        while ($a = $r->fetch_object()) {

            if (isset($ModifiedFiles[$this->cvsLang.$a->path.$a->name]) || isset($ModifiedFiles['en'.$a->path.$a->name])) {

                if (isset($ModifiedFiles['en'.$a->path.$a->name])) {
                    $new_en_revision = $ModifiedFiles['en'.$a->path.$a->name]['revision'];
                    $new_revision    = '1.'.$a->revision;
                    $new_maintainer  = $a->maintainer;
                }

                if (isset($ModifiedFiles[$this->cvsLang.$a->path.$a->name])) {
                    $new_en_revision = '1.'.$a->en_revision;
                    $new_revision    = $ModifiedFiles[$this->cvsLang.$a->path.$a->name]['en_revision'];
                    $new_maintainer  = $ModifiedFiles[$this->cvsLang.$a->path.$a->name]['maintainer'];
                }

                $node[] = array(
                "id"          => $a->id,
                "path"        => $a->path,
                "name"        => $a->name,
                "revision"    => $new_revision,
                "en_revision" => $new_en_revision,
                "maintainer"  => $new_maintainer,
                "needcommit"  => true,
                "isCritical"  => false
                );
            } else {
                $node[] = array(
                "id"          => $a->id,
                "path"        => $a->path,
                "name"        => $a->name,
                "revision"    => '1.'.$a->revision,
                "en_revision" => '1.'.$a->en_revision,
                "maintainer"  => $a->maintainer,
                "needcommit"  => false,
                "isCritical"  => ( ($a->en_revision - $a->revision >= 10) || $a->size_diff >= 3 || $a->mdate_diff <= -30 ) ? true : false
                );
            }
        }
        return array('nb'=>$nb, 'node'=>$node);
    }

    /**
     * Get all files witch need to be reviewed.
     * @return An associated array containing all informations about files witch need to be reviewed.
     */
    function get_files_need_reviewed() {

        // Get Files Need Commit
        $ModifiedFiles = $this->get_modified_files();

        $s = 'SELECT * FROM `files` WHERE `lang` = \''.$this->cvsLang.'\' AND `revision` = `en_revision` AND reviewed != \'yes\' LIMIT 100';
        $r = $this->db->query($s);
        $nb = $r->num_rows;

        $node = array();

        while ($a = $r->fetch_object()) {

            $temp = array(
            "id"         => $a->id,
            "path"       => $a->path,
            "name"       => $a->name,
            );

            if (isset($ModifiedFiles[$this->cvsLang.$a->path.$a->name]) || isset($ModifiedFiles['en'.$a->path.$a->name])) {

                if (isset($ModifiedFiles['en'.$a->path.$a->name])) {
                    $new_reviewed    = $a->reviewed;
                    $new_maintainer  = $a->maintainer;
                }

                if (isset($ModifiedFiles[$this->cvsLang.$a->path.$a->name])) {
                    $new_reviewed    = $ModifiedFiles[$this->cvsLang.$a->path.$a->name]['reviewed'];
                    $new_maintainer  = $ModifiedFiles[$this->cvsLang.$a->path.$a->name]['maintainer'];
                }

                $temp['reviewed']   = $new_reviewed;
                $temp['maintainer'] = $new_maintainer;
                $temp['needcommit'] = true;
            } else {
                $temp['reviewed']   = $a->reviewed;
                $temp['maintainer'] = $a->maintainer;
                $temp['needcommit'] = false;
            }
            $node[] = $temp;
        }
        return array('nb'=>$nb, 'node'=>$node);
    }

    /**
     * Get all pending patch.
     * @return An associated array containing all informations about pending patch.
     */
    function get_files_pending_patch() {

        $s = 'SELECT `id`, CONCAT(`lang`, `path`) AS path, `name`, `posted_by` AS \'by\',
        `uniqID`, `date` FROM `pendingPatch` WHERE `lang`=\''.$this->cvsLang.'\' OR `lang`=\'en\'';
        $r = $this->db->query($s) or die($this->db->error);
        $nb = $r->num_rows;

        $node = array();

        while ($row = $r->fetch_assoc()) {
            $node[] = $row;
        }

        return array('nb' => $nb, 'node' => $node);
    }

    /**
     * Get all files pending for commit.
     * @return An associated array containing all informations about files pending for commit.
     */
    function get_files_pending_commit() {

        $s = 'SELECT * FROM `pendingCommit` WHERE `lang`=\''.$this->cvsLang.'\' OR `lang`=\'en\'';
        $r = $this->db->query($s) or die($this->db->error);
        $nb = $r->num_rows;

        $node = array();

        while ($a = $r->fetch_object()) {

            $node[] = array(
            "id"          => $a->id,
            "path"        => $a->lang.$a->path,
            "name"        => $a->name,
            "by"          => $a->modified_by,
            "date"        => $a->date
            );

        }

        return array('nb'=>$nb, 'node'=>$node);
    }

    /**
     * Get all translators informations.
     * @return An associated array containing all informations about translators.
     */
    function get_translators()
    {
        $sql = sprintf('SELECT id, nick, name, mail, cvs FROM translators WHERE lang="%s"', $this->cvsLang);
        $persons = array();
        $result = $this->db->query($sql) or die($this->db->error);

        while ($r = $result->fetch_array()) {
            $persons[$r['nick']] = array('id'=>$r['id'], 'name' => utf8_encode($r['name']), 'mail' => $r['mail'], 'cvs' => $r['cvs']);
        }

        return $persons;
    }

    /**
     * Get all statistiques about translators.
     * @return An indexed array containing all statistiques about translators (nb uptodate files, nb old files, etc...)
     */
    function get_translators_info() {

        $translators = $this->get_translators();
        $uptodate    = $this->translator_get_uptodate();
        $old         = $this->translator_get_old();
        $critical    = $this->translator_get_critical();

        $i=0; $persons=array();
        foreach($translators as $nick => $data) {
            $persons[$i]              = $data;
            $persons[$i]['nick']      = $nick;
            $persons[$i]['uptodate']  = isset($uptodate[$nick]) ? $uptodate[$nick] : '0';
            $persons[$i]['old']       = isset($old[$nick]) ? $old[$nick] : '0';
            $persons[$i]['critical']  = isset($critical[$nick]) ? $critical[$nick] : '0';
            $persons[$i]['sum']       = $persons[$i]['uptodate'] + $persons[$i]['old'] + $persons[$i]['critical'];
            $i++;
        }
        return $persons;
    }

    /**
     * Get summary of all statistiques.
     * @return An indexed array containing all statistiques for the summary
     */
    function get_summary_info() {

        $nbFiles     = $this->get_nb_files();

        $uptodate    = $this->get_nb_files_Translated();
        $old         = $this->get_stats_old();
        $critical    = $this->get_stats_critical();

        $missFiles = $this->get_stats_notrans();

        $withoutRevTag = $this->get_stats_notag();

        $nbFiles[1] = $uptodate[1]+$old[1]+$critical[1]+$withoutRevTag[1]+$missFiles[1];

        $summary = array();

        $summary[0]['id']            = 1;
        $summary[0]['libel']         = 'Up to date files';
        $summary[0]['nbFiles']       = $uptodate[0];
        $summary[0]['percentFiles']  = round(($uptodate[0]*100)/$nbFiles[0], 2);
        $summary[0]['sizeFiles']     = ($uptodate[1] == '' ) ? 0 : $uptodate[1];
        $summary[0]['percentSize']   = round(($uptodate[1]*100)/$nbFiles[1], 2);

        $summary[1]['id']            = 2;
        $summary[1]['libel']         = 'Old files';
        $summary[1]['nbFiles']       = $old[0];
        $summary[1]['percentFiles']  = round(($old[0]*100)/$nbFiles[0], 2);
        $summary[1]['sizeFiles']     = ($old[1] == '' ) ? 0 : $old[1];
        $summary[1]['percentSize']   = round(($old[1]*100)/$nbFiles[1], 2);

        $summary[2]['id']            = 3;
        $summary[2]['libel']         = 'Critical files';
        $summary[2]['nbFiles']       = $critical[0];
        $summary[2]['percentFiles']  = round(($critical[0]*100)/$nbFiles[0], 2);
        $summary[2]['sizeFiles']     = ($critical[1] == '' ) ? 0 : $critical[1];
        $summary[2]['percentSize']   = round(($critical[1]*100)/$nbFiles[1], 2);


        $summary[3]['id']            = 4;
        $summary[3]['libel']         = 'Files without revision tag';
        $summary[3]['nbFiles']       = $withoutRevTag[0];
        $summary[3]['percentFiles']  = round(($withoutRevTag[0]*100)/$nbFiles[0], 2);
        $summary[3]['sizeFiles']     = ($withoutRevTag[1] == '' ) ? 0 : $withoutRevTag[1];
        $summary[3]['percentSize']   = round(($withoutRevTag[1]*100)/$nbFiles[1], 2);

        $summary[4]['id']            = 5;
        $summary[4]['libel']         = 'Files available for translation';
        $summary[4]['nbFiles']       = $missFiles[0];
        $summary[4]['percentFiles']  = round(($missFiles[0]*100)/$nbFiles[0], 2);
        $summary[4]['sizeFiles']     = ($missFiles[1] == '' ) ? 0 : $missFiles[1];
        $summary[4]['percentSize']   = round(($missFiles[1]*100)/$nbFiles[1], 2);

        $summary[5]['id']            = 6;
        $summary[5]['libel']         = 'Total';
        $summary[5]['nbFiles']       = $nbFiles[0];
        $summary[5]['percentFiles']  = '100%';
        $summary[5]['sizeFiles']     = $nbFiles[1];
        $summary[5]['percentSize']   = '100%';


        return $summary;
    }

    /**
     * Get number of uptodate files per translators.
     * @return An associated array (key=>translator's nick, value=>nb files).
     */
    function translator_get_uptodate()
    {
        $sql = 'SELECT
                COUNT(name) AS total,
                maintainer
            FROM
                files
            WHERE
                lang="' . $this->cvsLang . '"
            AND 
                revision = en_revision
            GROUP BY
                maintainer
            ORDER BY
                maintainer';

        $result = $this->db->query($sql) or die($this->db->error);
        $tmp = array();
        while ($r = $result->fetch_array()) {
            $tmp[$r['maintainer']] = $r['total'];
        }
        return $tmp;
    }

    /**
     * Get number of old files per translators.
     * @return An associated array (key=>translator's nick, value=>nb files).
     */
    function translator_get_old()
    {
        $sql = 'SELECT
                COUNT(name) AS total,
                maintainer
            FROM
                files
            WHERE
                lang="' . $this->cvsLang . '"
            AND
                en_revision != revision
            AND
                en_revision - revision < 10
            AND
                size_diff < 3 
            AND 
                mdate_diff > -30
            AND
                size is not NULL
            GROUP BY
                maintainer
            ORDER BY
                maintainer';

        $result = $this->db->query($sql) or die($this->db->error);
        $tmp = array();
        while ($r = $result->fetch_array()) {
            $tmp[$r['maintainer']] = $r['total'];
        }
        return $tmp;
    }

    /**
     * Get number of critical files per translators.
     * @return An associated array (key=>translator's nick, value=>nb files).
     */
    function translator_get_critical()
    {
        $sql = 'SELECT
                COUNT(name) AS total,
                maintainer
            FROM
                files
            WHERE
                lang="' . $this->cvsLang . '"
            AND
                ( en_revision - revision >= 10  OR
                ( en_revision != revision  AND
                    ( size_diff >= 3 OR mdate_diff <= -30 )
                ))
            AND
                size is not NULL
            GROUP BY
                maintainer
            ORDER BY
                maintainer';
        $result = $this->db->query($sql) or die($this->db->error);
        $tmp = array();
        while ($r = $result->fetch_array()) {
            $tmp[$r['maintainer']] = $r['total'];
        }
        return $tmp;
    }

    /**
     * Get number of files.
     * @return An indexed array.
     */
    function get_nb_files() {
        $sql = '
            SELECT
                COUNT(*) AS total,
                SUM(size)   AS total_size
            FROM
                files
            WHERE
                lang = \''.$this->cvsLang.'\'
            ';

        $res = $this->db->query($sql) or die($this->db->error);
        $r = $res->fetch_array();
        $result = array($r['total'], $r['total_size']);
        return $result;
    }

    /**
     * Get number of translated files.
     * @return Number of translated files.
     */
    function get_nb_files_Translated() {

        $sql = 'SELECT
                COUNT(name) AS total,
                SUM(size)   AS total_size
            FROM
                files
            WHERE
                lang="' . $this->cvsLang . '"
            AND
                revision = en_revision
           ';

        $res = $this->db->query($sql) or die($this->db->error);
        $r = $res->fetch_array();
        $result = array($r['total'], $r['total_size']);
        return $result;
    }

    /**
     * Get statistic about critical files witch need to be updated.
     * @return An associated array (total=>nb files, total_size=>size of this files).
     */
    function get_stats_critical() {
        $sql = 'SELECT
                COUNT(name) AS total,
                SUM(size) AS total_size
            FROM
                files
            WHERE
                lang="' . $this->cvsLang . '"
            AND
                ( en_revision - revision >= 10  OR
                ( en_revision != revision  AND
                    ( size_diff >= 3 OR mdate_diff <= -30 )
                ))
            AND
                size is not NULL
           ';

        $result = $this->db->query($sql) or die($this->db->error);

        $r = $result->fetch_array();
        $result = array($r['total'], $r['total_size']);
        return $result;
    }

    /**
     * Get statistic about old files witch need to be deleted from LANG tree.
     * @return An associated array (total=>nb files, total_size=>size of this files).
     */
    function get_stats_old()
    {
        $sql = 'SELECT
                COUNT(name) AS total,
                SUM(size)   AS total_size
            FROM
                files
            WHERE
                lang="' . $this->cvsLang . '"
            AND
                en_revision != revision
            AND
                en_revision - revision < 10
            AND
                size_diff < 3 
            AND 
                mdate_diff > -30
            AND
                size is not NULL
           ';

        $result = $this->db->query($sql) or die($this->db->error);

        $r = $result->fetch_array();
        $result = array($r['total'], $r['total_size']);
        return $result;
    }

    /**
     * Get statistic about files witch need to be translated.
     * @return An associated array (total=>nb files, size=>size of this files).
     */
    function get_stats_notrans()
    {
        $sql = 'SELECT
                COUNT(a.name) as total, 
                sum(b.size) as size 
            FROM
                files a
            LEFT JOIN
                files b
            ON 
                a.dir = b.dir 
            AND
                a.name = b.name
            WHERE
                a.lang="' . $this->cvsLang . '" 
            AND
                b.lang="en"
            AND
                a.revision is NULL
            AND
                a.size is NULL';

        $result = $this->db->query($sql) or die($this->db->error.'<pre>'.$sql.'</pre>');
        if ($result->num_rows) {
            $r = $result->fetch_array();
            return array($r['total'], $r['size']);
        } else {
            return array(0,0);
        }
    }

    /**
     * Get statistic about missed files witch need to be added to LANG tree.
     * @return An array of missed files (size=>size of the file, file=>name of the file).
     */
    function get_missfiles()
    {
        $sql = 'SELECT
                b.size as size, 
                a.name as file 
            FROM
                files a
            LEFT JOIN
                files b 
            ON 
                a.dir = b.dir 
            AND
                a.name = b.name 
            WHERE 
                a.lang="' . $this->cvsLang . '" 
            AND
                b.lang="en" 
            AND
                a.revision is NULL 
            AND
                a.size is NULL 
           ';

        $result = $this->db->query($sql) or die($this->db->error.'<pre>'.$sql.'</pre>');
        $num = $result->num_rows;
        if ($num == 0) {
            // only 'null' will produce a 0 with sizeof()
            return null;
        } else {
            $tmp = array();
            while ($r = $result->fetch_array()) {
                $tmp[] = array('size' => $r['size'], 'file' => $r['file']);
            }
            return $tmp;
        }
    }

    /**
     * Get statistic about files witch haven't revcheck's tags.
     * @return An associated array (total=>nb files, size=>size of this files).
     */
    function get_stats_notag()
    {
        $sql = 'SELECT
                COUNT(a.name) as total,
                sum(b.size) as size
            FROM
                files a
            LEFT JOIN
                files b 
            ON 
                a.dir = b.dir 
            AND
                a.name = b.name
            WHERE
                a.lang="' . $this->cvsLang .'" 
            AND
                b.lang="en"
            AND
                a.revision is NULL
            AND
                a.size is not NULL
           ';

        $result = $this->db->query($sql) or die($this->db->error);

        $r = $result->fetch_array();
        $result = array($r['total'], $r['size']);
        return $result;
    }

    /**
     * Get all mail from documentation's LANG mailing list.
     * @return An indexed array (id, title, description, link, pubDate).
     */
    function get_last_mailing() {

        $url = 'http://news.php.net/group.php?format=rss&group=php.doc';

        if ($this->cvsLang != 'en') {
            $url .= '.' . strtolower(str_replace('_', '-', $this->cvsLang));
        }

        $xml = new SimpleXMLElement(file_get_contents($url));

        $channel = $xml->channel;

        $i = 0;
        foreach ($channel->item as $item) {
            $result[$i]['id'] = $i;
            $result[$i]['title'] = (string) $item->title;
            $result[$i]['description'] = preg_replace('/(<a href[^>]+">)([^>]+)(<\/a>)/', "$2", (string) $item->description);
            $result[$i]['link'] = (string) $item->link;
            $result[$i]['pubDate'] = date('Y/m/d H:i:s', strtotime((string) $item->pubDate));
            $i++;
        }
        return $result;

    }

    /**
     * Get all open bugs for this LANG.
     * @return An indexed array (id, title, description, link, pubDate).
     */
    function get_last_bugs() {

        $url = 'http://bugs.php.net/rss/search.php?cmd=display&bug_type[]=Translation+problem&status=Open&search_for=&php_os=&php_os_not=0&boolean=1&author_email=&bug_age=0&by=&order_by=id&direction=DESC&phpver=&limit=All&assign=&format=rss';

        $r = file_get_contents($url);

        $xml = new SimpleXMLElement($r);
        $channel = $xml;

        $i=0;
        $result = array();
        foreach ($channel->item as $item) {
            $title = (string) $item->title;
            $description = $item->description;

            if (strstr($title, '['.strtoupper($this->cvsLang).']')) {

                $result[$i]['id'] = $i;
                $result[$i]['title'] = $title;

                $match = array();
                if (strstr($description, "Reproduce code:")) {
                    preg_match_all('/Description:\s*?------------(.*?)Reproduce code:/s', $description, $match);
                } else {
                    preg_match_all('/Description:\s*?------------(.*)/s', $description, $match);
                }

                $result[$i]['description'] = (isset($match[1][0])) ? highlight_string(trim($match[1][0]), true) : '';
                $result[$i]['link'] = (string) $item->link;
                $i++;
            }
        }
        return $result;

    }

    /**
     * Get encoding of a file, regarding his XML's header.
     * @param $file The file to get encoding from.
     * @param $mode The mode. Must be 'file' if $file is a path to the file, or 'content' if $file is the content of the file.
     * @return The charset as a string.
     */
    function getFileEncoding($file, $mode) {

        if ($mode == 'file' ) {
            $txml = file_get_contents($file);
        } else {
            $txml = $file;
        }

        $txml = preg_replace('/\\s+/', ' ', $txml);

        $match = array();
        preg_match('!<\?xml(.+)\?>!U', $txml, $match);
        $xmlinfo = $this->rev_parse_attr_string($match);

        $charset = (isset($xmlinfo[1]['encoding'])) ? strtolower($xmlinfo[1]['encoding']) : 'iso-8859-1';

        return $charset;
    }

    /**
     * Get the content of a file.
     * @param $FilePath The path for the file we want to retreive.
     * @param $lang The lang of the file we want to retreive. Either 'en' or current LANG.
     * @return An associated array (content=> content of the file, charset=>the charset of the file).
     */
    function getFileContent($FilePath, $FileName) {

        // Security
        $FilePath = str_replace('..', '', $FilePath);
        $FilePath = str_replace('//', '/', $FilePath);

        $file = $FilePath.$FileName;

        // Is this file modified ?
        $ModifiedFiles = $this->get_modified_files();

        if (isset($ModifiedFiles[$file])) { $extension = '.new'; }
        else { $extension = ''; }

        $file = DOC_EDITOR_CVS_PATH.$file.$extension;

        $charset = $this->getFileEncoding($file, 'file');

        $return['charset'] = $charset;
        $return['content'] = file_get_contents($file);

        return $return;
    }

    /**
     * Save a file after modification.
     * @param $FilePath The path for the file we want to save.
     * @param $content The new content.
     * @param $lang The lang of the file we want to save. Either 'en' or current LANG.
     * @param $type Can be 'file' or 'patch'.
     * @param $uniqID If type=patch, this is an uniqID to identify this patch.
     * @return The path to the new file ($FilePath with .new extension) successfully created.
     */
    function saveFile($FilePath, $content, $lang, $type, $uniqID='') {

        if ($type == 'file' ) { $ext = '.new'; }
        else { $ext = '.'.$uniqID.'.patch'; }

        // Security
        $FilePath = str_replace('..', '', $FilePath);

        // Open in w+ mode
        $h = fopen(DOC_EDITOR_CVS_PATH.$lang.$FilePath.$ext, 'w+');
        fwrite($h, $content);
        fclose($h);

        return DOC_EDITOR_CVS_PATH.$lang.$FilePath.$ext;
    }

    /**
     * Register a file as need to be commited, into the database.
     * @param $lang        The path for the file witch need to be commited.
     * @param $FilePath    The path for the file witch need to be commited.
     * @param $FileName    The name of the file witch need to be commited.
     * @param $revision    The revision of this file.
     * @param $en_revision The EN revision of this file.
     * @param $reviewed    The stats of the reviewed tag.
     * @param $maintainer  The maintainer.
     * @return Nothing.
     */
    function registerAsPendingCommit($lang, $FilePath, $FileName, $revision, $en_revision, $reviewed, $maintainer) {

        $s = 'SELECT id FROM pendingCommit WHERE lang=\''.$lang.'\' AND path=\''.$FilePath.'\' AND name=\''.$FileName.'\'';
        $r = $this->db->query($s);
        $nb = $r->num_rows;

        // We insert or update the pendingCommit table
        if ($nb == 0 ) {
            $s = 'INSERT into pendingCommit (`lang`, `path`, `name`, `revision`, `en_revision`, `reviewed`, `maintainer`, `modified_by`, `date`) VALUES (\''.$lang.'\', \''.$FilePath.'\', \''.$FileName.'\', \''.$revision.'\', \''.$en_revision.'\', \''.$reviewed.'\', \''.$maintainer.'\', \''.$this->cvsLogin.'\', now())';
            $this->db->query($s) or die($this->db->error);
            $fileID = $this->db->insert_id;
        } else {
            $a = $r->fetch_object();
            $s = 'UPDATE pendingCommit SET `revision`=\''.$revision.'\', `en_revision`=\''.$en_revision.'\', `reviewed`=\''.$reviewed.'\', `maintainer`=\''.$maintainer.'\' WHERE id=\''.$a->id.'\'';
            $this->db->query($s) or die($this->db->error);
            $fileID = $a->id;
        }

    }

    /**
     * Register a new patch, into the database.
     * @param $lang     The lang.
     * @param $FilePath The path for the file.
     * @param $FileName The name of the file.
     * @return Nothing.
     */
    function registerAsPendingPatch($lang, $FilePath, $FileName, $emailAlert) {

        $uniqID = md5(uniqid(rand(), true));

        $s = 'INSERT into pendingPatch (`lang`, `path`, `name`, `posted_by`, `date`, `email`, `uniqID`) VALUES (\''.$lang.'\', \''.$FilePath.'\', \''.$FileName.'\', \''.$this->cvsLogin.'\', now(), \''.$emailAlert.'\', \''.$uniqID.'\')';
        $this->db->query($s) or die($this->db->error);

        return $uniqID;

    }

    /**
     * Get the information from the content of a file.
     * @param $content The content of the file.
     * @return The revision as a 2 digits number, or 0 if revision wasn't found.
     */
    function getInfoFromContent($content) {

        $info = array('rev'=>0, 'en-rev'=>0, 'maintainer'=>'NULL', 'reviewed'=>'NULL', 'status'=>'NULL', 'xmlid'=>'NULL', 'content'=>$content);

        // Cvs tag
        $match = array();
        preg_match('/<!-- .Revision: \d+\.(\d+) . -->/', $content, $match);
        if (!empty($match)) {
            $info['rev'] = $match[1];
        }

        //Rev tag
        $match = array();
        preg_match('/<!--\s*EN-Revision:\s*\d+\.(\d+)\s*Maintainer:\s*(\\S*)\s*Status:\s*(.+)\s*-->/U', $content, $match);
        if (!empty($match)) {
            $info['en-rev'] = $match[1];
            $info['maintainer'] = $match[2];
            $info['status'] = $match[3];
        }

        // Reviewed tag
        $match = array();
        if (preg_match('/<!--\s*Reviewed:\s*(.*?)*-->/Ui', $content, $match)) {
            $info['reviewed'] = trim($match[1]);
        }

        // All xmlid
        $match = array();
        if (preg_match_all('/xml:id="(.*?)"/', $content, $match)) {
            $info['xmlid'] = implode('|',$match[1]);
        }

        return $info;
    }

    function getInfoFromFile($file) {
        $content = file_get_contents($file);
        return $this->getInfoFromContent($content);
    }

    /**
     * Get the diff of a file with his modified version.
     * @param $path The path to the file.
     * @param $file The name of the file.
     * @return The diff a the file with his modified version, as HTML, reday to be display.
     */
    function getDiffFromFiles($path, $file, $type='', $uniqID='') {
        include "./class.fileDiff.php";

        $charset = $this->getFileEncoding(DOC_EDITOR_CVS_PATH.$path.'/'.$file, 'file');

        $FilePath1 = DOC_EDITOR_CVS_PATH.$path.'/'.$file;
        $FilePath2 = ( $type == '' ) ? DOC_EDITOR_CVS_PATH.$path.'/'.$file.'.new' : DOC_EDITOR_CVS_PATH.$path.'/'.$file.'.'.$uniqID.'.patch';

        $diff = new diff;
        $info['content'] = $diff->inline($FilePath1, $FilePath2, 2, $charset);
        $info['charset'] = $charset;
        return $info;

    }

    /**
     * Get a raw diff between a file and a modified file.
     * @param $path The path to the file.
     * @param $file The name of the file.
     * @return The diff of the file with his modified version.
     */
    function getRawDiff($path, $file) {

        $cmd = 'cd '.DOC_EDITOR_CVS_PATH.$path.'; diff -uN '.$file.' '.$file.'.new';

        $output = array();
        exec($cmd, $output);
        return implode("\r\n",$output);

    }

    /** NEW
     * Get the diff of a file with his modified version.
     * @param $path The path to the file.
     * @param $file The name of the file.
     * @param $rev1 Frist revison.
     * @param $rev2 Second revision.
     * @return The diff a the file with his modified version, as HTML, reday to be display.
     */
    function getDiffFromExec($path, $file, $rev1, $rev2) {

        $cmd = 'cd '.DOC_EDITOR_CVS_PATH.$path.'; cvs diff -kk -u -r '.$rev2.' -r '.$rev1.' '.$file;

        $output = array();
        exec($cmd, $output);

        $output = htmlentities(join("\n", $output));

        $match = array();

        preg_match_all('/@@(.*?)@@(.[^@@]*)/s', $output, $match);

        $diff = array();

        for ($i = 0; $i < count($match[1]); $i++ ) {

            $diff[$i]['line'] = $match[1][$i];
            $diff[$i]['content'] =  $match[2][$i];

        }

        $return = '<table class="code">';

        for ($i = 0; $i < count($diff); $i++ ) {

            // Line
            $return .= '
           <tr>
            <td class="line">'.$diff[$i]['line'].'</td>
           </tr>
          ';

            // Content
            $tmp = explode("\n", trim($diff[$i]['content']));

            for ($j=0; $j < count($tmp); $j++ ) {
                $tmp[$j] = str_replace(" ", "&nbsp;", $tmp[$j]);

                switch (substr($tmp[$j], 0, 1)) {
                    case '+':
                        $class = 'ins';
                        break;
                    case '-':
                        $class = 'del';
                        break;

                    default:
                        $class = '';
                        break;
                }

                $return .= '
             <tr>
              <td class="'.$class.'">'.$tmp[$j].'</td>
             </tr>
            ';
            } // Fin for J

            // Separator
            $return .= '
           <tr>
            <td class="truncated">&nbsp;</td>
           </tr>
          ';

        } // Fin for I


        $return .= '<table>';

        return $return;

    }

    /**
     * Get all commit message.
        *
     * Each time we commit, we store in DB the commit message to be use later. This method get all this message from DB.
     * @return An indexed array of commit message.
     */
    function getCommitLogMessage()
    {
        $result = array();

        $s = sprintf('SELECT id, text FROM commitMessage WHERE userID="%s"', $this->userID);
        $r = $this->db->query($s);
        while ($a = $r->fetch_assoc()) {
            $result[] = $a;
        }

        return $result;
    }

    /**
     * Save Output message into a log file.
     * @param $file The name of the file.
     * @param $output The output message.
     * @return Nothing.
     */
    function saveOutputLogFile($file, $output)
    {
        $fp = fopen(DOC_EDITOR_CVS_PATH . '../.' . $file, 'w');
        fwrite($fp, implode("<br>",$output));
        fclose($fp);
    }

    /**
     * Get the content of a log file.
     * @param $file The name of the file.
     * @return $content The content.
     */
    function getOutputLogFile($file) {
        return file_get_contents(DOC_EDITOR_CVS_PATH . '../.' . $file);
    }

    /**
     * Check the build of your file (using configure.php script).
     * PHP binary should be in /usr/bin
     * @return The output log.
     */
    function checkBuild($enable_xml_details='false') {
        $cmd = 'cd '.DOC_EDITOR_CVS_PATH.';/usr/bin/php configure.php --with-lang='.$this->cvsLang.' --disable-segfault-error;';

        if ($enable_xml_details == 'true' ) {
            $cmd .= ' --enable-xml-details;';
        }

        $output = array();
        exec($cmd, $output);

        //Format the outPut
        $output = str_replace("Warning", '<span style="color: #FF0000; font-weight: bold;">Warning</span>', $output);

        return $output;
    }

    /**
     * Delete local change of a file.
     * @param $path The path of the file.
     * @param $file The name of the file.
     * @return An array witch contain informations about this file.
     */
    function clearLocalChange($path, $file) {

        // Extract the lang
        $t = explode('/',$path);
        $lang = $t[0];
        array_shift($t);

        // Add first /
        $path = '/'.implode('/', $t);

        // We need delete row from pendingCommit table
        $s = 'SELECT id FROM pendingCommit WHERE lang=\''.$lang.'\' AND path=\''.$path.'\' AND name=\''.$file.'\'';
        $r = $this->db->query($s);
        $a = $r->fetch_object();

        // We need delete row from pendingCommit table
        $s = 'DELETE FROM pendingCommit WHERE id=\''.$a->id.'\'';
        $this->db->query($s);

        // We need delete file on filesystem
        $doc = DOC_EDITOR_CVS_PATH.$lang.$path.$file.".new";

        @unlink($doc);

        // We need check for error in this file
        $anode[0] = array( 0 => $path, 1 => $file, 2 => $lang);
        $error = $this->updateFilesError($anode, 'nocommit');

        // We need reload original lang_revision
        $s = 'SELECT revision, maintainer, reviewed FROM files WHERE lang=\''.$lang.'\' AND path=\''.$path.'\' AND name=\''.$file.'\'';
        $r = $this->db->query($s);
        $a = $r->fetch_object();

        $info = array();
        $info['rev']        = $a->revision;
        $info['maintainer'] = $a->maintainer;
        $info['reviewed']   = $a->reviewed;

        if (isset($error['first'])) {
            $info['errorState'] = true;
            $info['errorFirst'] = $error['first'];
        } else {
            $info['errorState'] = false;
            $info['errorFirst'] = '-No error-';
        }

        // We return original lang_revision & maintainer
        return $info;

    }

    /**
     * Commit some files to Cvs server.
     * @param $anode An array of files to be commited.
     * @param $log The message log to use with this commit.
     * @return The message from Cvs server after this commit.
     */
    function cvsCommit($anode, $log) {

        $files = '';

        for ($i = 0; $i < count($anode); $i++ ) {

            // We need move .new file into the real file
            @unlink( DOC_EDITOR_CVS_PATH.$anode[$i][0].$anode[$i][1]);
            @copy(   DOC_EDITOR_CVS_PATH.$anode[$i][0].$anode[$i][1].'.new', DOC_EDITOR_CVS_PATH.$anode[$i][0].$anode[$i][1]);
            @unlink( DOC_EDITOR_CVS_PATH.$anode[$i][0].$anode[$i][1].'.new');

            $files .= $anode[$i][0].$anode[$i][1].' ';

        }
        // Escape single quote
        $log = str_replace("'", "\\'", $log);

        // First, login into Cvs
        $cmd = 'export CVS_PASSFILE='.DOC_EDITOR_DATA_PATH.'.cvspass && cd '.DOC_EDITOR_CVS_PATH.' && cvs -d :pserver:'.$this->cvsLogin.':'.$this->cvsPasswd.'@cvs.php.net:/repository login && cvs -d :pserver:'.$this->cvsLogin.':'.$this->cvsPasswd.'@cvs.php.net:/repository -f commit -l -m \''.$log.'\' '.$files;
        $output  = array();
        exec($cmd, $output);

        $this->debug('commit cmd : '.$cmd);

        return $this->highlightCommitLog($output);
    }

    /**
     * Highlights the given commit log
        *
     * @param $message The commit log
     * @return The output message, more beautiful than before!
     */
    function highlightCommitLog($message) {

        $reg = array("/(COMMITINFO)/", "/(LOGINFO)/", "/(Checking in)/", "/(done)/", "/(bailing)/", "/(Mailing the commit email to)/");
        return preg_replace($reg, "<span style=\"color: #15428B; font-weight: bold;\">\\1</span>", $message);

    }

    /**
     * Update information about a file after his commit (update informations added with revcheck tools).
     * @param $anode An array of files.
     * @return Nothing.
     */
    function updateRev($anode) {

        for ($i = 0; $i < count($anode); $i++ ) {

            $t = explode("/", $anode[$i][0]);

            $FileLang = $t[0];
            array_shift($t);

            $FilePath = implode("/", $t);
            $FileName = $anode[$i][1];

            //En file ?
            if ($FileLang == 'en' ) {

                $path    = DOC_EDITOR_CVS_PATH.'en/'.$FilePath.$FileName;
                $content = file_get_contents($path);
                $info    = $this->getInfoFromContent($content);
                $size    = intval(filesize($path) / 1024);
                $date    = filemtime($path);

                // For the EN file
                $s = 'UPDATE files
                 SET
                   revision = \''.$info['rev'].'\',
                   size     = \''.$size.'\',
                   mdate    = \''.$date.'\'

                 WHERE
                   lang=\''.$FileLang.'\' AND
                   path=\'/'.$FilePath.'\' AND
                   name=\''.$FileName.'\'
               ';
                $this->db->query($s) or die($this->db->error.'|'.$s);

                // For all LANG file
                $s = 'UPDATE files
                 SET
                   en_revision = \''.$info['rev'].'\'

                 WHERE
                   lang != \''.$FileLang.'\' AND
                   path  = \'/'.$FilePath.'\' AND
                   name  = \''.$FileName.'\'
               ';
                $this->db->query($s) or die($this->db->error.'|'.$s);


            } else {

                $path    = DOC_EDITOR_CVS_PATH.$FileLang.'/'.$FilePath.$FileName;
                $content = file_get_contents($path);
                $info    = $this->getInfoFromContent($content);
                $size    = intval(filesize($path) / 1024);
                $date    = filemtime($path);


                $pathEN    = DOC_EDITOR_CVS_PATH.'en/'.$FilePath.$FileName;
                $sizeEN    = intval(filesize($pathEN) / 1024);
                $dateEN    = filemtime($pathEN);

                $size_diff = $sizeEN - $size;
                $date_diff = (intval((time() - $dateEN) / 86400)) - (intval((time() - $date) / 86400));

                $s = 'UPDATE files
                 SET
                   revision   = \''.$info['en-rev'].'\',
                   reviewed   = \''.$info['reviewed'].'\',
                   size       = \''.$size.'\',
                   mdate      = \''.$date.'\',
                   maintainer = \''.$info['maintainer'].'\',
                   status     = \''.$info['status'].'\',
                   size_diff  = \''.$size_diff.'\',
                   mdate_diff = \''.$date_diff.'\'

                 WHERE
                   lang=\''.$FileLang.'\' AND
                   path=\'/'.$FilePath.'\' AND
                   name=\''.$FileName.'\'
               ';
                $this->db->query($s) or die($this->db->error.'|'.$s);
            }

            $this->debug('in updateRev() ; DB query : '.$s);

        }
    }

    /** NEW
     * Update error's informations about a file after his commit.
     * @param $anode        An array of files.
     * @param $action       Can be 'commit' or not.
     * @param $lang_content Content of the LANG file.
     * @param $en_content   Content of the EN file.
     * @return Boolean TRUE if there is some error, FALSE otherwise.
     */
    function updateFilesError($anode, $action='commit', $lang_content='', $en_content='') {

        for ($i = 0; $i < count($anode); $i++) {

            $FilePath = $anode[$i][0];
            $FileName = $anode[$i][1];
            $FileLang = $anode[$i][2];

            // Remove all row in errorfiles tables
            $s = 'DELETE FROM errorfiles WHERE lang=\''.$FileLang.'\' AND path=\''.$FilePath.'\' AND name=\''.$FileName.'\'';

            $this->db->query($s) or die($this->db->error.'|'.$s);

            if ($lang_content == '' ) {
                // Do tools_error on this file
                $en_content     = file_get_contents(DOC_EDITOR_CVS_PATH.'en'.$FilePath.$FileName);
                $lang_content   = file_get_contents(DOC_EDITOR_CVS_PATH.$FileLang.$FilePath.$FileName);

                $info = $this->getInfoFromFile(DOC_EDITOR_CVS_PATH.$FileLang.$FilePath.$FileName);
            } else {
                $info = $this->getInfoFromContent($lang_content);
            }

            $maintainer = "'".$info['maintainer']."'";

            $error = $this->tools_error_check_all($lang_content, $en_content);

            if (count($error)) {
                $this->tools_error_log($FileLang, $FilePath, $FileName, $error, $maintainer);
            } elseif ($action != 'commit' ) {

                // Case if there is no error but this file isn't commit now. We must stay it in DB for commit later
                // Build empty error
                $error[0] = array( 'value_en' => '-',  'value_lang' => '-', 'type' => '-No error-' );
                $this->tools_error_log($FileLang, $FilePath, $FileName, $error, $maintainer);

            }

            if ($i == 0 && $action != 'commit' ) {
                if (count($error)) {
                    $return['state'] = true;
                    $return['first'] = $error[0]['type'];
                } else {
                    $return['state'] = false;
                    $return['first'] = '';
                }
                return $return;
            }

        }

    }

    /**
     * Remove the mark "needCommit" into DB for a set of files.
     * @param $anode An array of files.
     * @return Nothing.
     */
    function removeNeedCommit($anode) {

        for ($i = 0; $i < count($anode); $i++ ) {

            $t = explode("/", $anode[$i][0]);

            $FileLang = $t[0];
            array_shift($t);

            $FilePath = implode("/", $t);
            $FileName = $anode[$i][1];

            $s = 'DELETE FROM pendingCommit

              WHERE
                 lang = \''.$FileLang.'\' AND
                 path = \'/'.$FilePath.'\' AND
                 name = \''.$FileName.'\'
            ';
            $this->db->query($s) or die($this->db->error.'|'.$s);

            $this->debug('in removeNeedCommit() ; DB query : '.$s);

        }

    }

    function debug($mess) {

        $mess = '['.date("d/m:Y H:i:s").'] by '.$this->cvsLogin.' : '.$mess."\n";

        $fp = fopen(DOC_EDITOR_CVS_PATH.'../.debug', 'a+');
        fwrite($fp, $mess);
        fclose($fp);

    }

    /**
     * Add (or not) a log message to the DB.
     * @param $logMessage The log message to be added if it don't exist yet.
     * @return Nothing.
     */
    function manageLogMessage($logMessage) {

        $s = 'SELECT id FROM commitMessage WHERE text=\''.$this->db->real_escape_string($logMessage).'\' AND userID=\''.$this->userID.'\'';
        $r = $this->db->query($s) or die($this->db->error);
        $nb = $r->num_rows;

        if ($nb == 0 ) {
            $s = 'INSERT INTO commitMessage (`text`,`userID`) VALUES (\''.$this->db->real_escape_string($logMessage).'\', \''.$this->userID.'\')';
            $this->db->query($s) or die($this->db->error);
        }

    }

    /**
     * Send an email.
     * @param $to The Receiver.
     * @param $subject The subject of the email.
     * @param $msg The content of the email. Don't use HTML here ; only plain text.
     * @return Nothing.
     */
    function sendEmail($to, $subject, $msg) {

        $headers = 'From: '.$this->cvsLogin.'@php.net' . "\r\n" .
        'X-Mailer: PhpDocumentation Online Editor' . "\r\n" .
        'Content-Type: text/plain; charset="utf-8"'."\n";
        mail($to, stripslashes($subject), stripslashes(trim($msg)), $headers);
    }

    /* Methods to check error in a translation */

    function tools_error_do($dir)
    {

        static $ignoredDirs = array('.', '..', 'CVS');
        $heredir = DOC_EDITOR_CVS_PATH.$this->cvsLang.$dir;
        $en_dir = str_replace("/".$this->cvsLang."/", "/en/", $heredir);

        // Collect files and folders in these arrays
        $directories = array();
        $files       = array();

        // Open the directory
        $handle = opendir($heredir);

        // Walk through all names in the directory
        while ($file = readdir($handle)) {

            // If we found a file with one or two point as a name,
            // or a CVS directory, skip the file
            if (in_array($file, $ignoredDirs)) {
                continue;
            }

            // JUST TEMPORARY TILL THE <TRANSLATION>/REFERENCE/FUNCTIONS.XML - ISSUE IS CLARIFIED
            // If we found a file functions.xml in the
            // <lang>/reference/ tree, skip the file
            if (
            $file == "rsusi.txt"
            || $file == "missing-ids.xml"
            || ($file == "extensions.xml" && strpos($dir, '/appendices/'))
            || $file == "README"
            || $file == "contributors.xml"
            || $file == "contributors.ent"
            || $file == "reserved.constants.xml"
            || $file == 'DO_NOT_TRANSLATE'
            || $file == 'license.xml'
            || $file == 'versions.xml'
            || strpos($heredir, '/internals/')
            || strpos($heredir, '/internals2/')
            || strpos($file, 'entities.') === 0
            )
            continue;

            // Collect files and directories
            if (is_dir($heredir.$file)) { $directories[] = $file; }
            else { $files[] = $file; }

        }

        // Close the directory
        @closedir($handle);

        // Sort files and directories
        sort($directories);
        sort($files);

        // Go through files first

        foreach ($files as $file) {

            if (is_file($heredir.$file) && is_file($en_dir.$file)) {

                $infoLANG = $this->getInfoFromFile($heredir.$file);
                $infoEN   = $this->getInfoFromFile($en_dir.$file);

                if ($infoLANG['en-rev'] == 'NULL' || $infoEN['rev'] == 'NULL') {
                    continue;
                }

                if ($infoLANG['en-rev'] == $infoEN['rev'] ) {

                    $error = $this->tools_error_check_all($infoLANG['content'], $infoEN['content']);

                    if (count($error) > 0 ) { $this->tools_error_log($dir, $file, $error, $infoLANG['maintainer']); }
                }

            } else {
                continue;
            }
        }

        // Then go through subdirectories, merging all the info
        // coming from subdirs to one array
        foreach ($directories as $d) {
            $this->tools_error_do($dir.$d.'/');
        }

        // Return with collected file info in
        // this dir and subdirectories [if any]
        return;

    } // tools_error_do() function end

    function tools_error_getInfo($path, $name) {

        $s = 'SELECT
                   value_en, value_lang, type
                FROM
                   errorfiles
                WHERE
                   lang = \''.$this->cvsLang.'\' AND
                   path = \''.$path.'\' AND
                   name = \''.$name.'\'
               ';

        $r = $this->db->query($s);

        $return = array();

        while ($record = $r->fetch_object()) {
            if (isset($return[$record->type]['error'])) {
                $i = count($return[$record->type]['error']);
            } else {
                $i = 0;
            }
            $return[$record->type]['error'][$i]['value_en']   = $record->value_en;
            $return[$record->type]['error'][$i]['value_lang'] = $record->value_lang;

        }
        return $return;
    }

    function tools_error_log($lang, $path, $name, $errors, $maintainer)
    {

        $sql = 'INSERT INTO errorfiles (`lang`, `path`, `name`, `maintainer`, `value_en`,`value_lang`,`type`) VALUES';
        $pattern = ' ("%s", "%s", "%s", "%s", "%s", "%s", "%s"),';

        //(\''.$lang.'\', \''.$path.'\',\''.$name.'\','.$maintainer.',\''.$this->db->real_escape_string($error[$i]['value_en']).'\',\''.$this->db->real_escape_string($error[$i]['value_lang']).'\',\''.$error[$i]['type'].'\')';

        foreach ($errors as $error) {
            $sql .= sprintf($pattern, $lang, $path, $name, $maintainer, $this->db->real_escape_string($error['value_en']),
            $this->db->real_escape_string($error['value_lang']), $error['type']);
        }

        $sql = substr($sql, 0, -1);
        $this->db->query($sql) or die($this->db->error.'<hr/><pre>'.$sql.'</pre>');

    }

    function tools_error_check_all($lang_content, $en_content) {

        // We remove comment in EN and lang content
        $lang_content = preg_replace('/<!--(.*?)?-->/s', '', $lang_content);
        $en_content   = preg_replace('/<!--(.*?)?-->/s', '', $en_content);

        $result_error = array();

        $r = $this->tools_error_check_methodsynopsis($lang_content, $en_content);
        if (is_array($r)) { array_push($result_error, $r); }

        $r = $this->tools_error_check_nbMemberInSeeAlso($lang_content, $en_content);
        if (is_array($r)) { array_push($result_error, $r); }

        $r = $this->tools_error_check_nbElInTable($lang_content, $en_content);
        if (is_array($r)) { array_push($result_error, $r); }

        // Get user pref
        if (isset($_SESSION['userConf']['conf_error_skipnbliteraltag']) && $_SESSION['userConf']['conf_error_skipnbliteraltag'] == 'false' ) {

            $r = $this->tools_error_check_nbLiteralTag($lang_content, $en_content);
            if (is_array($r)) { array_push($result_error, $r); }

        }

        $r = $this->tools_error_check_nbParaTag($lang_content, $en_content);
        if (is_array($r)) { array_push($result_error, $r); }

        $r = $this->tools_error_check_nbNoteTag($lang_content, $en_content);
        if (is_array($r)) { array_push($result_error, $r); }

        $r = $this->tools_error_check_nbChapterTag($lang_content, $en_content);
        if (is_array($r)) { array_push($result_error, $r); }

        $r = $this->tools_error_check_classsynopsis($lang_content, $en_content);
        if (is_array($r)) { array_push($result_error, $r); }

        $r = $this->tools_error_check_nbCdataTags($lang_content, $en_content);
        if (is_array($r)) { array_push($result_error, $r); }

        $r = $this->tools_error_check_spaceOrPeriodRefpurposeTags($lang_content, $en_content);
        if (is_array($r)) { array_push($result_error, $r); }

        $r = $this->tools_error_check_attributRefsec1Tags($lang_content, $en_content);
        if (is_array($r)) { array_push($result_error, $r); }

        $r = $this->tools_error_check_attributRefentryTags($lang_content, $en_content);
        if (is_array($r)) { array_push($result_error, $r); }

        $r = $this->tools_error_check_attributReferenceTags($lang_content, $en_content);
        if (is_array($r)) { array_push($result_error, $r); }

        $r = $this->tools_error_check_attributVarlistentryTags($lang_content, $en_content);
        if (is_array($r)) { array_push($result_error, $r); }

        $r = $this->tools_error_check_attributSectionTags($lang_content, $en_content);
        if (is_array($r)) { array_push($result_error, $r); }

        $r = $this->tools_error_check_attributPrefaceTags($lang_content, $en_content);
        if (is_array($r)) { array_push($result_error, $r); }

        $r = $this->tools_error_check_attributBookTags($lang_content, $en_content);
        if (is_array($r)) { array_push($result_error, $r); }

        $r = $this->tools_error_check_attributSect1Tags($lang_content, $en_content);
        if (is_array($r)) { array_push($result_error, $r); }

        $r = $this->tools_error_check_attributQandaentryTags($lang_content, $en_content);
        if (is_array($r)) { array_push($result_error, $r); }

        $r = $this->tools_error_check_attributLinkTags($lang_content, $en_content);
        if (is_array($r)) { array_push($result_error, $r); }

        $r = $this->tools_error_check_attributAppendixTags($lang_content, $en_content);
        if (is_array($r)) { array_push($result_error, $r); }

        $r = $this->tools_error_check_attributChapterTags($lang_content, $en_content);
        if (is_array($r)) { array_push($result_error, $r); }

        $return = array();

        for($i=0;$i<count($result_error);$i++){
            for ($j=0;$j<count($result_error[$i]);$j++){
                array_push($return, $result_error[$i][$j]);
            }
        }

        return $return;
    }

    function tools_error_check_attributChapterTags($lang_content, $en_content) {

        // attributs in chapter tags
        $result_error = array();

        $reg = '/<chapter\s*?xml:id="(.*?)"\s*?(xmlns="(.*?)")?\s*?(xmlns:xlink="(.*?)"\s*?)?(version="(.*?)"\s*?)?>/s';

        $en_chapter = array();
        $match = array();
        if (preg_match_all($reg, $en_content, $match)) {
            $en_chapter['xmlid'] = $match[1];
            $en_chapter['xmlns'] = $match[3];
            $en_chapter['xmlnsxlink'] = $match[5];
            $en_chapter['version'] = $match[7];
        }

        $lang_chapter = array();
        $match = array();
        if (preg_match_all($reg, $lang_content, $match)) {
            $lang_chapter['xmlid'] = $match[1];
            $lang_chapter['xmlns'] = $match[3];
            $lang_chapter['xmlnsxlink'] = $match[5];
            $lang_chapter['version'] = $match[7];
        }

        $properties = array(
        'xmlid' => 'XmlId',
        'xmlns' => 'XmlNs',
        'xmlnsxlink' => 'XmlXlink',
        'version' => 'Version',
        );

        foreach ($properties as $property => $label) {

            if( !isset($en_chapter[$property]) ) {
                $en_chapter[$property] = '';
            }

            if( !isset($en_chapter[$property]) ) {
                $en_chapter[$property] = '';
            }

            for ($i = 0; $i < count($en_chapter[$property]); $i++) {
                if (!isset($en_chapter[$property][$i])) {
                    $en_chapter[$property][$i] = '';
                }
                if (!isset($lang_chapter[$property][$i])) {
                    $lang_chapter[$property][$i] = '';
                }

                if ($en_chapter[$property][$i] != $lang_chapter[$property][$i] ) {
                    $result_error[] = array(
                    'value_en'   => $en_chapter[$property][$i],
                    'value_lang' => $lang_chapter[$property][$i],
                    'type'       => 'attribut' . $label . 'Chapter',
                    );

                }
            }
        }

        return $result_error;
    }

    function tools_error_check_attributAppendixTags($lang_content, $en_content) {

        // attributs in appendix tags
        $result_error = false;

        $reg = '/<appendix\s*?xml:id="(.*?)"\s*?(xmlns="(.*?)")?\s*?(xmlns:xlink="(.*?)"\s*?)?>/s';

        $match = $en_appendix = array();
        preg_match_all($reg, $en_content, $match);
        $en_appendix["xmlid"] = $match[1];
        $en_appendix["xmlns"] = $match[3];
        $en_appendix["xmlnsxlink"] = $match[5];

        $match = $lang_appendix = array();
        preg_match_all($reg, $lang_content, $match);
        $lang_appendix['xmlid'] = $match[1];
        $lang_appendix['xmlns'] = $match[3];
        $lang_appendix['xmlnsxlink'] = $match[5];


        $properties = array(
        'xmlid' => 'XmlId',
        'xmlns' => 'XmlNs',
        'xmlnsxlink' => 'XmlXlink',
        );

        foreach ($properties as $property => $label) {

            for ($i = 0; $i < count($en_appendix[$property]); $i++) {

                if (!isset($en_appendix[$property][$i])) { $en_appendix[$property][$i] = ''; }
                if (!isset($lang_appendix[$property][$i])) { $lang_appendix[$property][$i] = ''; }

                if ($en_appendix[$property][$i] != $lang_appendix[$property][$i] ) {
                    $result_error[] = array(
                    'value_en'   => $en_appendix[$property][$i],
                    'value_lang' => $lang_appendix[$property][$i],
                    'type'       => 'attribut' . $label . 'Appendix',
                    );

                }
            }
        }

        return $result_error;
    }

    function tools_error_check_attributQandaentryTags($lang_content, $en_content) {

        // attributs in qandaentry tags
        $result_error = false;

        $reg = '/<qandaentry\s*?xml:id="(.*?)"\s*?>/s';

        $match = $en_qandaentry = array();
        if (preg_match_all($reg, $en_content, $match)) {
            $en_qandaentry = $match[1];
        }

        $match = $lang_qandaentry = array();
        if (preg_match_all($reg, $lang_content, $match)) {
            $lang_qandaentry = $match[1];
        }

        for ($i = 0; $i < count($en_qandaentry); $i++) {

            if (!isset($en_qandaentry[$i])) {
                $en_qandaentry[$i] = '';
            }
            if (!isset($lang_qandaentry[$i])) {
                $lang_qandaentry[$i] = '';
            }

            if ($en_qandaentry[$i] != $lang_qandaentry[$i] ) {
                $result_error[] = array(
                'value_en' => $en_qandaentry[$i],
                'value_lang' => $lang_qandaentry[$i],
                'type' => 'attributXmlIdQandaentry'
                );

            }
        }
        return $result_error;
    }

    function tools_error_check_attributLinkTags($lang_content, $en_content) {

        // attributs in Link tags
        $result_error = false;

        $match = $en_xlink = array();
        preg_match_all('/<link\s*?xlink:href="(.*?)">/s', $en_content, $match);
        $en_xlink = $match[1];

        $match = $lang_xlink = array();
        preg_match_all('/<link\s*?xlink:href="(.*?)">/s', $lang_content, $match);
        $lang_xlink = $match[1];

        for ($i = 0; $i < count($en_xlink); $i++) {

            if (!isset($en_xlink[$i]) )   { $en_xlink[$i] = ''; }
            if (!isset($lang_xlink[$i])) { $lang_xlink[$i] = ''; }

            if ($en_xlink[$i] != $lang_xlink[$i] ) {
                $result_error[] = array(
                "value_en" => $en_xlink[$i],
                "value_lang" => $lang_xlink[$i],
                "type" => "attributXlinkLink"
                );

            }
        }

        $en_linkend = array();
        $match = array();
        if (preg_match_all('/<link\s*?linkend=("|\')(.*?)("|\')\s*?>/s', $en_content, $match)) {
            $en_linkend = $match[2];
        }

        $lang_linkend = array();
        $match = array();
        if (preg_match_all('/<link\s*?linkend=("|\')(.*?)("|\')\s*?>/s', $lang_content, $match)) {
            $lang_linkend = $match[2];
        }

        for ($i = 0; $i <count($en_linkend); $i++) {
            if (!isset($lang_linkend[$i])) {
                $lang_linkend[$i] = '';
            }
            if ($en_linkend[$i] != $lang_linkend[$i]) {
                $result_error[] = array(
                "value_en" => $en_linkend[$i],
                "value_lang" => $lang_linkend[$i],
                "type" => "attributLinkendLink"
                );

            }
        }
        return $result_error;
    }

    function tools_error_check_attributSect1Tags($lang_content, $en_content) {

        // attributs in Sect1 tags
        $result_error = false;

        $en_sect1 = array();
        $match = array();
        preg_match_all('/<sect1\s*?xml:id="(.*?)"\s*?(xmlns="(.*?)")?\s*?(xmlns:xlink="(.*?)"\s*?)?>/s', $en_content, $match);
        $en_sect1["xmlid"] = $match[1];
        $en_sect1["xmlns"] = $match[3];
        $en_sect1["xmlnsxlink"] = $match[5];

        $lang_sect1 = array();
        $match = array();
        preg_match_all('/<sect1\s*?xml:id="(.*?)"\s*?(xmlns="(.*?)")?\s*?(xmlns:xlink="(.*?)"\s*?)?>/s', $lang_content, $match);
        $lang_sect1["xmlid"] = $match[1];
        $lang_sect1["xmlns"] = $match[3];
        $lang_sect1["xmlnsxlink"] = $match[5];

        for ($i = 0; $i < count($en_sect1["xmlid"]); $i++) {
            if (isset($lang_sect1["xmlid"][$i]) && $en_sect1["xmlid"][$i] != $lang_sect1["xmlid"][$i] ) {
                $result_error[] = array(
                "value_en" => $en_sect1["xmlid"][$i],
                "value_lang" => $lang_sect1["xmlid"][$i],
                "type" => "attributXmlIdSect1"
                );

            }
        }
        for ($i = 0; $i < count($en_sect1["xmlns"]); $i++) {
            if (isset($lang_sect1["xmlns"][$i]) && $en_sect1["xmlns"][$i] != $lang_sect1["xmlns"][$i] ) {
                $result_error[] = array(
                "value_en" => $en_sect1["xmlns"][$i],
                "value_lang" => $lang_sect1["xmlns"][$i],
                "type" => "attributXmlNsSect1"
                );

            }
        }
        for ($i = 0; $i < count($en_sect1["xmlnsxlink"]); $i++) {
            if (isset($lang_sect1["xmlnsxlink"][$i]) && $en_sect1["xmlnsxlink"][$i] != $lang_sect1["xmlnsxlink"][$i] ) {
                $result_error[] = array(
                "value_en" => $en_sect1["xmlnsxlink"][$i],
                "value_lang" => $lang_sect1["xmlnsxlink"][$i],
                "type" => "attributXmlNsXlinkSect1"
                );

            }
        }
        return $result_error;
    }

    function tools_error_check_attributBookTags($lang_content, $en_content) {

        // attributs in Book tags
        $result_error = false;

        $en_book = $match = array();
        preg_match_all('/<book\s*?xml:id="(.*?)"\s*?(xmlns="(.*?)")?\s*?(xmlns:xlink="(.*?)"\s*?)?>/s', $en_content, $match);
        $en_book["xmlid"] = $match[1];
        $en_book["xmlns"] = $match[3];
        $en_book["xmlnsxlink"] = $match[5];

        $lang_book = $match = array();
        preg_match_all('/<book\s*?xml:id="(.*?)"\s*?(xmlns="(.*?)")?\s*?(xmlns:xlink="(.*?)"\s*?)?>/s', $lang_content, $match);
        $lang_book["xmlid"] = $match[1];
        $lang_book["xmlns"] = $match[3];
        $lang_book["xmlnsxlink"] = $match[5];

        for ($i = 0; $i < count($en_book["xmlid"]); $i++) {
            if ($en_book["xmlid"][$i] != $lang_book["xmlid"][$i] ) {
                $result_error[] = array(
                "value_en" => $en_book["xmlid"][$i],
                "value_lang" => $lang_book["xmlid"][$i],
                "type" => "attributXmlIdBook"
                );

            }
        }

        for ($i = 0; $i < count($en_book["xmlns"]); $i++) {
            if ($en_book["xmlns"][$i] != $lang_book["xmlns"][$i] ) {
                $result_error[] = array(
                "value_en" => $en_book["xmlns"][$i],
                "value_lang" => $lang_book["xmlns"][$i],
                "type" => "attributXmlNsBook"
                );

            }
        }

        for ($i = 0; $i < count($en_book["xmlnsxlink"]); $i++) {
            if ($en_book["xmlnsxlink"][$i] != $lang_book["xmlnsxlink"][$i] ) {
                $result_error[] = array(
                "value_en" => $en_book["xmlnsxlink"][$i],
                "value_lang" => $lang_book["xmlnsxlink"][$i],
                "type" => "attributXmlXlinkBook"
                );
            }
        }
        return $result_error;
    }

    function tools_error_check_attributPrefaceTags($lang_content, $en_content) {

        // attributs in Preface tags
        $result_error = array();

        $reg = '/<preface\s*?xml:id="(.*?)"\s*?(xmlns="(.*?)")?\s*?(xmlns:xlink="(.*?)"\s*?)?>/s';

        $match = $en_preface = array();
        if (preg_match_all($reg, $en_content, $match)) {
            $en_preface['xmlid']      = $match[1];
            $en_preface['xmlns']      = $match[3];
            $en_preface['xmlnsxlink'] = $match[5];
        }

        $match = $lang_preface = array();
        if (preg_match_all($reg, $lang_content, $match)) {
            $lang_preface['xmlid']      = $match[1];
            $lang_preface['xmlns']      = $match[3];
            $lang_preface['xmlnsxlink'] = $match[5];
        }

        $properties = array(
        'xmlid' => 'XmlId',
        'xmlns' => 'XmlNs',
        'xmlnsxlink' => 'XmlNsXlink',
        );
        foreach ($properties as $property => $label) {

            if( !isset($en_preface[$property]) ) {
                $en_preface[$property] = '';
            }

            if( !isset($lang_preface[$property]) ) {
                $lang_preface[$property] = '';
            }

            for ($i = 0; $i < count($en_preface[$property]); $i++) {

                if( !isset($en_preface[$property][$i]) ) {
                    $en_preface[$property][$i] = '';
                }

                if( !isset($lang_preface[$property][$i]) ) {
                    $lang_preface[$property][$i] = '';
                }

                if ($en_preface[$property][$i] != $lang_preface[$property][$i] ) {
                    $result_error[] = array(
                    'value_en' => $en_preface[$property][$i],
                    'value_lang' => $lang_preface[$property][$i],
                    'type' => 'attribut' . $label . 'Preface',
                    );

                }
            }
        }
        return $result_error;
    }
    function tools_error_check_attributSectionTags($lang_content, $en_content) {

        // attributs in Section tags
        $result_error = array();

        $reg = '/<section\s*?xml:id=("|\')(.*?)("|\')\s*?(xmlns=("|\')(.*?)("|\'))?\s*?(xmlns:xlink=("|\')(.*?)("|\')\s*?)?>/s';

        $en_section = array();
        $match = array();
        if (preg_match_all($reg, $en_content, $match)) {
            $en_section["xmlid"] = $match[2];
            $en_section["xmlns"] = $match[6];
            $en_section["xmlnsxlink"] = $match[10];
        }

        $lang_section = array();
        $match = array();
        if (preg_match_all($reg, $lang_content, $match)) {
            $lang_section["xmlid"] = $match[2];
            $lang_section["xmlns"] = $match[6];
            $lang_section["xmlnsxlink"] = $match[10];
        }

        $properties = array(
        'xmlid' => 'XmlId',
        'xmlns' => 'XmlNs',
        'xmlnsxlink' => 'XmlNsXlink',
        );
        foreach ($properties as $property => $label) {

            if( !isset($en_section[$property]) ) {
                $en_section[$property] = '';
            }

            if( !isset($lang_section[$property]) ) {
                $lang_section[$property] = '';
            }

            for ($i = 0; $i < count($en_section[$property]); $i++) {

                if( !isset($en_section[$property][$i]) ) {
                    $en_section[$property][$i] = '';
                }

                if( !isset($lang_section[$property][$i]) ) {
                    $lang_section[$property][$i] = '';
                }

                if ($en_section[$property][$i] != $lang_section[$property][$i] ) {
                    $result_error[] = array(
                    'value_en' => $en_section[$property][$i],
                    'value_lang' => $lang_section[$property][$i],
                    'type' => 'attribut' . $label . 'Section',
                    );

                }
            }

        }
        return $result_error;
    }

    function tools_error_check_attributVarlistentryTags($lang_content, $en_content) {

        // attributs in Varlistentry tags
        $result_error = array();

        $reg = '/<varlistentry\s*?xml:id=("|\')(.*?)("|\')\s*?>/s';

        $match = $en_varlistentry = array();
        if (preg_match_all($reg, $en_content, $match)) {
            $en_varlistentry = $match[2];
        }

        $match = $lang_varlistentry = array();
        if (preg_match_all($reg, $lang_content, $match)) {
            $lang_varlistentry = $match[2];
        }

        for ($i = 0; $i < count($en_varlistentry); $i++) {

            if (!isset($en_varlistentry[$i]) )   {
                $en_varlistentry[$i]   = '';
            }
            if (!isset($lang_varlistentry[$i])) {

                $lang_varlistentry[$i] = '';
            }

            if ($en_varlistentry[$i] != $lang_varlistentry[$i] ) {
                $result_error[] = array(
                "value_en" => $en_varlistentry[$i],
                "value_lang" => $lang_varlistentry[$i],
                "type" => "attributXmlIdVarlistentry"
                );
            }
        }
        return $result_error;
    }

    function tools_error_check_attributReferenceTags($lang_content, $en_content) {

        // attributs in Reference tags
        $result_error = false;

        $en_reference = array();
        $match = array();
        preg_match_all('/<reference\s*?xml:id="(.*?)"\s*?xmlns="(.*?)"\s*?(xmlns:xlink="(.*?)"\s*?)?>/s', $en_content, $match);
        $en_reference["xmlid"] = $match[1];
        $en_reference["xmlns"] = $match[2];
        $en_reference["xmlnsxlink"] = $match[4];

        $lang_reference = array();
        $match = array();
        preg_match_all('/<reference\s*?xml:id="(.*?)"\s*?xmlns="(.*?)"\s*?(xmlns:xlink="(.*?)"\s*?)?>/s', $lang_content, $match);
        $lang_reference["xmlid"] = $match[1];
        $lang_reference["xmlns"] = $match[2];
        $lang_reference["xmlnsxlink"] = $match[4];

        for ($i = 0; $i < count($en_reference["xmlid"]); $i++) {

            if (!isset($en_reference["xmlid"][$i]) )   { $en_reference["xmlid"][$i]   = ''; }
            if (!isset($lang_reference["xmlid"][$i])) { $lang_reference["xmlid"][$i] = ''; }

            if ($en_reference["xmlid"][$i] != $lang_reference["xmlid"][$i] ) {
                $result_error[] = array(
                "value_en" => $en_reference["xmlid"][$i],
                "value_lang" => $lang_reference["xmlid"][$i],
                "type" => "attributXmlIDReference"
                );

            }
        }

        for ($i = 0; $i < count($en_reference["xmlns"]); $i++) {

            if (!isset($en_reference["xmlns"][$i]) )   { $en_reference["xmlns"][$i]   = ''; }
            if (!isset($lang_reference["xmlns"][$i])) { $lang_reference["xmlns"][$i] = ''; }

            if ($en_reference["xmlns"][$i] != $lang_reference["xmlns"][$i] ) {
                $result_error[] = array(
                "value_en" => $en_reference["xmlns"][$i],
                "value_lang" => $lang_reference["xmlns"][$i],
                "type" => "attributXmlNsReference"
                );
            }
        }

        for ($i = 0; $i < count($en_reference["xmlnsxlink"]); $i++) {

            if (!isset($en_reference["xmlnsxlink"][$i]) )   { $en_reference["xmlnsxlink"][$i]   = ''; }
            if (!isset($lang_reference["xmlnsxlink"][$i])) { $lang_reference["xmlnsxlink"][$i] = ''; }

            if ($en_reference["xmlnsxlink"][$i] != $lang_reference["xmlnsxlink"][$i] ) {
                $result_error[] = array(
                "value_en" => $en_reference["xmlnsxlink"][$i],
                "value_lang" => $lang_reference["xmlnsxlink"][$i],
                "type" => "attributXmlNsXlinkReference"
                );
            }
        }
        return $result_error;
    }

    function tools_error_check_attributRefentryTags($lang_content, $en_content) {

        // attributs in Refentry tags
        $result_error = false;

        $en_refentry = array();
        $match = array();
        preg_match_all('/<refentry\s*?xml:id="(.*?)"\s*?xmlns="(.*?)"\s*?(xmlns:xlink="(.*?)"\s*?)?>/s', $en_content, $match);
        $en_refentry["xmlid"]      = $match[1];
        $en_refentry["xmlns"]      = $match[2];
        $en_refentry["xmlnsxlink"] = $match[4];

        $lang_refentry = array();
        $match = array();
        preg_match_all('/<refentry\s*?xml:id="(.*?)"\s*?xmlns="(.*?)"\s*?(xmlns:xlink="(.*?)"\s*?)?>/s', $lang_content, $match);
        $lang_refentry["xmlid"] = $match[1];
        $lang_refentry["xmlns"] = $match[2];
        $lang_refentry["xmlnsxlink"] = $match[4];

        for ($i = 0; $i < count($en_refentry["xmlid"]); $i++) {

            if (!isset($en_refentry["xmlid"][$i])) { $en_refentry["xmlid"][$i] = ''; }
            if (!isset($lang_refentry["xmlid"][$i])) { $lang_refentry["xmlid"][$i] = ''; }

            if ($en_refentry["xmlid"][$i] != $lang_refentry["xmlid"][$i] ) {
                $result_error[] = array(
                "value_en" => $en_refentry["xmlid"][$i],
                "value_lang" => $lang_refentry["xmlid"][$i],
                "type" => "attributXmlIdRefentry"
                );
            }
        }

        for ($i = 0; $i < count($en_refentry["xmlns"]); $i++) {

            if (!isset($en_refentry["xmlns"][$i])) { $en_refentry["xmlns"][$i] = ''; }
            if (!isset($lang_refentry["xmlns"][$i])) { $lang_refentry["xmlns"][$i] = ''; }

            if ($en_refentry["xmlns"][$i] != $lang_refentry["xmlns"][$i] ) {
                $result_error[] = array(
                "value_en" => $en_refentry["xmlns"][$i],
                "value_lang" => $lang_refentry["xmlns"][$i],
                "type" => "attributXmlNsRefentry"
                );

            }
        }

        for ($i = 0; $i < count($en_refentry["xmlnsxlink"]); $i++) {

            if (!isset($en_refentry["xmlnsxlink"][$i])) { $en_refentry["xmlnsxlink"][$i] = ''; }
            if (!isset($lang_refentry["xmlnsxlink"][$i])) { $lang_refentry["xmlnsxlink"][$i] = ''; }

            if ($en_refentry["xmlnsxlink"][$i] != $lang_refentry["xmlnsxlink"][$i] ) {
                $result_error[] = array(
                "value_en" => $en_refentry["xmlnsxlink"][$i],
                "value_lang" => $lang_refentry["xmlnsxlink"][$i],
                "type" => "attributXmlNsXlinkRefentry"
                );

            }
        }
        return $result_error;
    }
    function tools_error_check_attributRefsec1Tags($lang_content, $en_content) {

        // attributs in Refsec1 tags
        $result_error = false;

        $en_refsect1 = array();
        $match = array();
        preg_match_all('/<refsect1\s*?role="(.*?)"\s*?>/s', $en_content, $match);
        $en_refsect1 = $match[1];

        $lang_refsect1 = array();
        $match = array();
        preg_match_all('/<refsect1\s*?role="(.*?)"\s*?>/s', $lang_content, $match);
        $lang_refsect1 = $match[1];

        for ($i = 0; $i < count($en_refsect1); $i++) {
            if (isset($lang_refsect1[$i]) && $en_refsect1[$i] != $lang_refsect1[$i] ) {
                $result_error[] = array(
                "value_en" => $en_refsect1[$i],
                "value_lang" => $lang_refsect1[$i],
                "type" => "attributRefsect1"
                );
            }
        }
        return $result_error;
    }
    function tools_error_check_spaceOrPeriodRefpurposeTags($lang_content, $en_content) {

        // Space or period at the end of Refpurpose tags
        $result_error = false;

        $match = array();
        preg_match_all('/<refpurpose>.*([^A-Za-z1-9 ])<\/refpurpose>/s', $lang_content, $match);

        if (isset($match[1][0])) {

            if ($match[1][0] == '.')  {
                $result_error[] = array(
                'value_en' => 'N/A',
                'value_lang' => 'N/A',
                'type' => 'spaceOrPeriodRefpurpose'
                );
            }
        }
        return $result_error;
    }
    function tools_error_check_nbCdataTags($lang_content, $en_content) {

        // Nb <![CDATA tags
        $result_error = false;

        $en_cdataSection = 0;
        $match = array();
        if (preg_match_all('/<!\[CDATA\[(.*?)\]\]>/s', $en_content, $match)) {
            $en_cdataSection = count($match[1]);
        }

        $lang_cdataSection = 0;
        $match = array();
        if (preg_match_all('/<!\[CDATA\[(.*?)\]\]>/s', $lang_content, $match)) {
            $lang_cdataSection = count($match[1]);
        }

        if ($en_cdataSection != $lang_cdataSection ) {
            $result_error[] = array(
            "value_en" => $en_cdataSection,
            "value_lang" => $lang_cdataSection,
            "type" => "nbCdataTags"
            );
        }
        return $result_error;
    }
    function tools_error_check_classsynopsis($lang_content, $en_content) {

        // Error in <classsynopsis> tags
        $result_error = array();

        $match = $en_classsynopsis = array();
        preg_match_all('/<classsynopsis>(\s.*?)<\/classsynopsis>/s', $en_content, $match);

        for ($i = 0; $i < count($match[1]); $i++) {
            $match2 = array();
            preg_match_all('/<ooclass><classname>(.*?)<\/classname><\/ooclass>/s', $match[1][$i], $match2);
            if (!isset($match2[1][0])) { $match2[1][0] = ''; }
            $en_classsynopsis[$i]['ooclass']['classname']['libel'] = $match2[1][0];
            $en_classsynopsis[$i]['ooclass']['classname']['nb'] = count($match2[1]);

            $match2 = array();
            preg_match_all('/<fieldsynopsis>\s*?<modifier>(.*?)<\/modifier>\s*?<type>(.*?)<\/type>\s*?<varname(.*?)>(.*?)<\/varname>\s*?<initializer>(.*?)<\/initializer>\s*?<\/fieldsynopsis>/s', $match[1][$i], $match2);
            $en_classsynopsis[$i]['fieldsynopsis']['modifier']            = $match2[1];
            $en_classsynopsis[$i]['fieldsynopsis']['type']                = $match2[2];
            $en_classsynopsis[$i]['fieldsynopsis']['varname']['attr']     = $match2[3];
            $en_classsynopsis[$i]['fieldsynopsis']['varname']['value']    = $match2[4];
            $en_classsynopsis[$i]['fieldsynopsis']['initializer']         = $match2[5];

        }

        $lang_classsynopsis = array();
        $match = array();
        preg_match_all('/<classsynopsis>(\s.*?)<\/classsynopsis>/s', $lang_content, $match);

        for ($i = 0; $i < count($match[1]); $i++) {
            $match2 = array();
            preg_match_all('/<ooclass><classname>(.*?)<\/classname><\/ooclass>/s', $match[1][$i], $match2);
            if (!isset($match2[1][0])) { $match2[1][0] = ''; }
            $lang_classsynopsis[$i]['ooclass']['classname']['libel'] = $match2[1][0];
            $lang_classsynopsis[$i]['ooclass']['classname']['nb'] = count($match2[1]);

            preg_match_all('/<fieldsynopsis>\s*?<modifier>(.*?)<\/modifier>\s*?<type>(.*?)<\/type>\s*?<varname(.*?)>(.*?)<\/varname>\s*?<initializer>(.*?)<\/initializer>\s*?<\/fieldsynopsis>/s', $match[1][$i], $match2);

            $lang_classsynopsis[$i]['fieldsynopsis']['modifier']            = $match2[1];
            $lang_classsynopsis[$i]['fieldsynopsis']['type']                = $match2[2];
            $lang_classsynopsis[$i]['fieldsynopsis']['varname']['attr']     = $match2[3];
            $lang_classsynopsis[$i]['fieldsynopsis']['varname']['value']    = $match2[4];
            $lang_classsynopsis[$i]['fieldsynopsis']['initializer']         = $match2[5];

        }

        // Verification
        for ($i = 0; $i < count($en_classsynopsis); $i++) {

            if (!isset($lang_classsynopsis[$i]['ooclass']['classname']['libel'])) {
                $lang_classsynopsis[$i]['ooclass']['classname']['libel'] = '';
            }

            // ooclass, classname
            if ($en_classsynopsis[$i]['ooclass']['classname']['libel'] != $lang_classsynopsis[$i]['ooclass']['classname']['libel'] ) {
                $result_error[] = array(
                "value_en" => $en_classsynopsis[$i]['ooclass']['classname']['libel'],
                "value_lang" => $lang_classsynopsis[$i]['ooclass']['classname']['libel'],
                "type" => "errorOoclassClassname"
                );

            }
            if (!isset($lang_classsynopsis[$i]['ooclass']['classname']['nb'])) { $lang_classsynopsis[$i]['ooclass']['classname']['nb'] = 0; }

            // ooclass, classname
            if ($en_classsynopsis[$i]['ooclass']['classname']['nb'] != $lang_classsynopsis[$i]['ooclass']['classname']['nb'] ) {
                $result_error[] = array(
                "value_en" => $en_classsynopsis[$i]['ooclass']['classname']['nb'],
                "value_lang" => $lang_classsynopsis[$i]['ooclass']['classname']['nb'],
                "type" => "errorNbOoclassClassname"
                );

            }


            // fieldsynopsis
            for ($j = 0; $j < count($en_classsynopsis[$i]['fieldsynopsis']['varname']['value']); $j++ ) {

                // fieldsynopsis varname value
                if (!isset($lang_classsynopsis[$i]['fieldsynopsis']['varname']['value'][$j])) {
                    $lang_classsynopsis[$i]['fieldsynopsis']['varname']['value'][$j] = '';
                }
                if ($en_classsynopsis[$i]['fieldsynopsis']['varname']['value'][$j] != $lang_classsynopsis[$i]['fieldsynopsis']['varname']['value'][$j] ) {
                    $result_error[] = array(
                    "value_en" => $en_classsynopsis[$i]['fieldsynopsis']['varname']['value'][$j],
                    "value_lang" => $lang_classsynopsis[$i]['fieldsynopsis']['varname']['value'][$j],
                    "type" => "errorFieldsynopsisVarnameValue"
                    );

                }

                // fieldsynopsis varname attr
                if (!isset($lang_classsynopsis[$i]['fieldsynopsis']['varname']['attr'][$j])) {
                    $lang_classsynopsis[$i]['fieldsynopsis']['varname']['attr'][$j] = '';
                }
                if ($en_classsynopsis[$i]['fieldsynopsis']['varname']['attr'][$j] != $lang_classsynopsis[$i]['fieldsynopsis']['varname']['attr'][$j] ) {
                    $result_error[] = array(
                    "value_en" => $en_classsynopsis[$i]['fieldsynopsis']['varname']['attr'][$j],
                    "value_lang" => $lang_classsynopsis[$i]['fieldsynopsis']['varname']['attr'][$j],
                    "type" => "errorFieldsynopsisVarnameAttr"
                    );

                }

                // fieldsynopsis type
                if (!isset($lang_classsynopsis[$i]['fieldsynopsis']['type'][$j])) {
                    $lang_classsynopsis[$i]['fieldsynopsis']['type'][$j] = '';
                }
                if ($en_classsynopsis[$i]['fieldsynopsis']['type'][$j] != $lang_classsynopsis[$i]['fieldsynopsis']['type'][$j] ) {
                    $result_error[] = array(
                    "value_en" => $en_classsynopsis[$i]['fieldsynopsis']['type'][$j],
                    "value_lang" => $lang_classsynopsis[$i]['fieldsynopsis']['type'][$j],
                    "type" => "errorFieldsynopsisType"
                    );

                }

                // fieldsynopsis modifier
                if (!isset($lang_classsynopsis[$i]['fieldsynopsis']['modifier'][$j])) { $lang_classsynopsis[$i]['fieldsynopsis']['modifier'][$j] = ''; }
                if ($en_classsynopsis[$i]['fieldsynopsis']['modifier'][$j] != $lang_classsynopsis[$i]['fieldsynopsis']['modifier'][$j] ) {
                    $result_error[] = array(
                    "value_en" => $en_classsynopsis[$i]['fieldsynopsis']['modifier'][$j],
                    "value_lang" => $lang_classsynopsis[$i]['fieldsynopsis']['modifier'][$j],
                    "type" => "errorFieldsynopsisModifier"
                    );

                }

                // fieldsynopsis initializer
                if (!isset($lang_classsynopsis[$i]['fieldsynopsis']['initializer'][$j])) { $lang_classsynopsis[$i]['fieldsynopsis']['initializer'][$j] = ''; }
                if ($en_classsynopsis[$i]['fieldsynopsis']['initializer'][$j] != $lang_classsynopsis[$i]['fieldsynopsis']['initializer'][$j] ) {
                    $result_error[] = array(
                    "value_en" => $en_classsynopsis[$i]['fieldsynopsis']['initializer'][$j],
                    "value_lang" => $lang_classsynopsis[$i]['fieldsynopsis']['initializer'][$j],
                    "type" => "errorFieldsynopsisInitializer"
                    );

                }

            }
        }
        return $result_error;
    }

    function tools_error_check_nbParaTag($lang_content, $en_content) {

        // Nb <para> tags
        $result_error = array();

        $match = array();
        preg_match_all('/<para(( )(.*?))?>/s', $en_content, $match);
        $en_para = count($match[0]);

        $match = array();
        preg_match_all('/<para(( )(.*?))?>/s', $lang_content, $match);
        $lang_para = count($match[0]);

        if ($en_para != $lang_para) {
            $result_error[] = array(
            'value_en'   => $en_para,
            'value_lang' => $lang_para,
            'type'       => 'nbParaTags',
            );

        }
        return $result_error;
    }

    function tools_error_check_nbNoteTag($lang_content, $en_content) {

        // Nb <note> tags
        $result_error = array();

        $en_note = 0;
        $match = array();
        if (preg_match_all('/<note>/s', $en_content, $match)) {
            $en_note = count($match[0]);
        }

        $lang_note = 0;
        $match = array();
        if (preg_match_all('/<note>/s', $lang_content, $match)) {
            $lang_note = count($match[0]);
        }

        if ($en_note != $lang_note) {
            $result_error[] = array(
            "value_en" => $en_note,
            "value_lang" => $lang_note,
            "type" => "nbNoteTags",
            );

        }
        return $result_error;
    }

    function tools_error_check_nbChapterTag($lang_content, $en_content) {

        // Nb <chapter> tags
        $result_error = false;
        $en_chapter = 0;
        $match = array();
        if (preg_match_all('/<chapter /s', $en_content, $match)) {
            $en_chapter = count($match[0]);
        }

        $lang_chapter = 0;
        $match = array();
        if (preg_match_all('/<chapter /s', $lang_content, $match)) {
            $lang_chapter = count($match[0]);
        }

        if ($en_chapter != $lang_chapter ) {
            $result_error[] = array(
            "value_en" => $en_chapter,
            "value_lang" => $lang_chapter,
            "type" => "nbChapterTags"
            );
        }
        return $result_error;
    }

    function tools_error_check_nbLiteralTag($lang_content, $en_content) {

        // Nb <literal> tags
        $result_error = false;
        $en_literal = 0;
        $match = array();
        if (preg_match_all('/<literal>/s', $en_content, $match)) {
            $en_literal = count($match[0]);
        }

        $lang_literal = 0;
        $match = array();
        if (preg_match_all('/<literal>/s', $lang_content, $match)) {
            $lang_literal = count($match[0]);
        }

        if ($en_literal != $lang_literal ) {
            $result_error[] = array(
            "value_en" => $en_literal,
            "value_lang" => $lang_literal,
            "type" => "nbLiteralTags"
            );
        }
        return $result_error;
    }

    function tools_error_check_nbElInTable($lang_content, $en_content) {

        $result_error = array();

        // attr in <row> tags
        $en_attrRow = array();
        $lang_attrRow = array();
        $match = array();

        $lang_attrRow['xmlid']='';
        $en_attrRow['xmlid']='';

        $reg = '/<row(\s.*?)xml:id="(.*?)">/s';

        if (preg_match_all($reg, $en_content, $match)) {
            $en_attrRow['xmlid'] = $match[2];
        }

        $match = array();
        if (preg_match_all($reg, $lang_content, $match)) {
            $lang_attrRow['xmlid'] = $match[2];
        }

        for ($i = 0; $i < count($en_attrRow['xmlid']); $i++) {

            if (!isset($en_attrRow['xmlid'][$i])) { $en_attrRow['xmlid'][$i] = ''; }
            if (!isset($lang_attrRow['xmlid'][$i])) { $lang_attrRow['xmlid'][$i] = ''; }

            if ($en_attrRow['xmlid'][$i] != $lang_attrRow['xmlid'][$i] ) {
                $result_error[] = array(
                'value_en'   => $en_attrRow['xmlid'][$i],
                'value_lang' => $lang_attrRow['xmlid'][$i],
                'type'       => 'attributXmlIdRow'
                );

            }
        }


        $tags = array('row', 'thead', 'tbody', 'entry');

        foreach ($tags as $tag) {

            $reg = '/<' . $tag . '>/s';
            $en_tag = 0;
            $match = array();
            if (preg_match_all($reg, $en_content, $match)) {
                $en_tag = count($match[0]);
            }

            $lang_tag = 0;
            $match = array();
            if (preg_match_all($reg, $lang_content, $match)) {
                $lang_tag = count($match[0]);
            }

            if ($en_tag != $lang_tag) {
                $result_error[] = array(
                'value_en'   => $en_tag,
                'value_lang' => $lang_tag,
                'type'       => 'nb' . ucfirst($tag) . 'Tags',
                );
            }
        }

        return $result_error;
    }

    function tools_error_check_nbMemberInSeeAlso($lang_content, $en_content) {

        // SeeAlso section : check nb member
        $result_error = array();

        $reg = '!<refsect1 role="seealso">(.*)</refsect1>!s';
        $reg2 = '!<member>(.*?)</member>!s';
        $match = array();
        $en_seeAlsoMember = 0;
        preg_match($reg, $en_content, $match);
        if (isset($match[1])) {
            $match2 = array();
            preg_match_all($reg2, $match[1], $match2);
            if (isset($match2[1])) {
                $en_seeAlsoMember = count($match2[1]);
            }
        }

        $match = array();
        $lang_seeAlsoMember = 0;
        preg_match($reg, $lang_content, $match);
        if (isset($match[1])) {
            $match2 = array();
            preg_match_all($reg2, $match[1], $match2);
            if (isset($match2[1])) {
                $lang_seeAlsoMember = count($match2[1]);
            }
        }

        if ($en_seeAlsoMember != $lang_seeAlsoMember ) {
            $result_error[] = array(
            "value_en" => $en_seeAlsoMember,
            "value_lang" => $lang_seeAlsoMember,
            "type" => "nbSeeAlsoMember",
            );

        }
        return $result_error;
    }


    function tools_error_check_methodsynopsis($lang_content, $en_content) {

        // test with methodsynopsis
        $result_error = false;

        $match = $en_methodsynopsis = array();
        preg_match_all('/<methodsynopsis>(\s.*?)<\/methodsynopsis>/s', $en_content, $match);

        for ($i = 0; $i < count($match[1]); $i++) {

            $match2 = array();

            preg_match_all('/<type>(.*?)<\/type>\s*?<methodname>(.*?)<\/methodname>/s', $match[1][$i], $match2);

            if (isset($match2[2][0]) && isset($match2[1][0])) {

                $en_methodsynopsis[$i]['methodname']['name'] = $match2[2][0];
                $en_methodsynopsis[$i]['methodname']['type'] = $match2[1][0];

                $match2 = array();
                preg_match_all('/<methodparam\s*?((choice=\'opt\')|(choice="opt"))?>\s*?<type>(.*?)<\/type>\s*?<parameter\s*?((role=\'reference\')|(role="reference"))?>(.*?)<\/parameter>\s*?(<initializer>(.*?)<\/initializer>\s*?)?<\/methodparam>/s', $match[1][$i], $match2);

                $en_methodsynopsis[$i]['methodparam']['parameter']   = $match2[8];
                $en_methodsynopsis[$i]['methodparam']['initializer'] = $match2[10];
                $en_methodsynopsis[$i]['methodparam']['type']        = $match2[4];



                for ($j = 0; $j < count($match2[1]); $j++) {
                    if (trim($match2[1][$j]) == 'choice="opt"' || trim($match2[1][$j]) == "choice='opt'" ) {
                        $en_methodsynopsis[$i]['methodparam']['optionnel'][$j] = 1;
                    }
                    else {
                        $en_methodsynopsis[$i]['methodparam']['optionnel'][$j] = 0;
                    }
                }

                for ($j = 0; $j < count($match2[5]); $j++) {
                    if (trim($match2[5][$j]) == "role='reference'" || trim($match2[5][$j]) == 'role="reference"' ) {
                        $en_methodsynopsis[$i]['methodparam']['role'][$j] = 1;
                    }
                    else {
                        $en_methodsynopsis[$i]['methodparam']['role'][$j] = 0;
                    }
                }

            }
        }

        $match = $lang_methodsynopsis = array();
        preg_match_all('/<methodsynopsis>(\s.*?)<\/methodsynopsis>/s', $lang_content, $match);

        for ($i = 0; $i < count($match[1]); $i++) {

            $match2 = array();
            preg_match_all('/<type>(.*?)<\/type>\s*?<methodname>(.*?)<\/methodname>/s', $match[1][$i], $match2);

            if (isset($match2[2][0]) && isset($match2[1][0])) {

                $lang_methodsynopsis[$i]['methodname']['name'] = $match2[2][0];
                $lang_methodsynopsis[$i]['methodname']['type'] = $match2[1][0];

                $match2 = array();
                preg_match_all('/<methodparam\s*?((choice=\'opt\')|(choice="opt"))?>\s*?<type>(.*?)<\/type>\s*?<parameter\s*?((role=\'reference\')|(role="reference"))?>(.*?)<\/parameter>\s*?(<initializer>(.*?)<\/initializer>\s*?)?<\/methodparam>/s', $match[1][$i], $match2);

                $lang_methodsynopsis[$i]['methodparam']['parameter']   = $match2[8];
                $lang_methodsynopsis[$i]['methodparam']['initializer'] = $match2[10];
                $lang_methodsynopsis[$i]['methodparam']['type']        = $match2[4];

                for ($j=0; $j < count($match2[1]); $j++) {

                    if (trim($match2[1][$j]) == 'choice="opt"' || trim($match2[1][$j]) == "choice='opt'" ) {
                        $lang_methodsynopsis[$i]['methodparam']['optionnel'][$j] = 1;
                    } else {
                        $lang_methodsynopsis[$i]['methodparam']['optionnel'][$j] = 0;
                    }

                }

                for ($j=0; $j < count($match2[5]); $j++) {
                    if (trim($match2[5][$j]) == "role='reference'" || trim($match2[5][$j]) == 'role="reference"' ) {
                        $lang_methodsynopsis[$i]['methodparam']['role'][$j] = 1;
                    } else {
                        $lang_methodsynopsis[$i]['methodparam']['role'][$j] = 0;
                    }

                }

            }

        }

        for ($i = 0; $i < count($en_methodsynopsis); $i++) {

            // Check on name
            if (isset($en_methodsynopsis[$i]['methodname']['name'])) {

                if (!isset($lang_methodsynopsis[$i]['methodname']['name'])) { $lang_methodsynopsis[$i]['methodname']['name'] = ''; }
                if ($en_methodsynopsis[$i]['methodname']['name'] != $lang_methodsynopsis[$i]['methodname']['name'] ) {
                    $result_error[] = array(
                    'value_en' => $en_methodsynopsis[$i]['methodname']['name'],
                    'value_lang' => $lang_methodsynopsis[$i]['methodname']['name'],
                    'type' => 'errorMethodnameMethodsynopsis'
                    );

                }

            }

            // Check on type
            if (isset($en_methodsynopsis[$i]['methodname']['type'])) {

                if (!isset($lang_methodsynopsis[$i]['methodname']['type'])) { $lang_methodsynopsis[$i]['methodname']['type'] = ''; }
                if ($en_methodsynopsis[$i]['methodname']['type'] != $lang_methodsynopsis[$i]['methodname']['type'] ) {
                    $result_error[] = array(
                    'value_en' => $en_methodsynopsis[$i]['methodname']['type'],
                    'value_lang' => $lang_methodsynopsis[$i]['methodname']['type'],
                    'type' => 'errorTypeMethodsynopsis'
                    );

                }
            }

            // Check on methodparam
            if (isset($en_methodsynopsis[$i]['methodparam']['parameter'])) {

                // Init
                if (!isset($en_methodsynopsis[$i]['methodparam']['parameter']))   { $en_methodsynopsis[$i]['methodparam']['parameter']=array(); }
                if (!isset($lang_methodsynopsis[$i]['methodparam']['parameter'])) { $lang_methodsynopsis[$i]['methodparam']['parameter']=array(); }

                // Check on Nb
                $nb_lang = count($lang_methodsynopsis[$i]['methodparam']['parameter']);
                $nb_en = count($en_methodsynopsis[$i]['methodparam']['parameter']);

                if ($nb_lang != $nb_en){
                    $result_error[]=array(
                    'value_en'   =>$nb_en,
                    'value_lang' =>$nb_lang,
                    'type'=>'errorNbMethodparamMethodsynopsis'
                    );
                }

                for($j=0;$j<count($en_methodsynopsis[$i]['methodparam']['parameter']);$j++) {

                    // Check on parameter
                    if (isset($en_methodsynopsis[$i]['methodparam']['parameter'][$j])) {

                        if (!isset($lang_methodsynopsis[$i]['methodparam']['parameter'][$j])) { $lang_methodsynopsis[$i]['methodparam']['parameter'][$j]=''; }

                        if ($en_methodsynopsis[$i]['methodparam']['parameter'][$j] != $lang_methodsynopsis[$i]['methodparam']['parameter'][$j]) {
                            $result_error[]=array(
                            'value_en'   => $en_methodsynopsis[$i]['methodparam']['parameter'][$j],
                            'value_lang' => $lang_methodsynopsis[$i]['methodparam']['parameter'][$j],
                            'type'=>'errorParameterNameMethodsynopsis'
                            );
                        }

                    }

                    // Check on type
                    if (isset($en_methodsynopsis[$i]['methodparam']['type'][$j])) {

                        if (!isset($lang_methodsynopsis[$i]['methodparam']['type'][$j])) { $lang_methodsynopsis[$i]['methodparam']['type'][$j]=''; }

                        if ($en_methodsynopsis[$i]['methodparam']['type'][$j]!=$lang_methodsynopsis[$i]['methodparam']['type'][$j]) {
                            $result_error[]=array(
                            'value_en'=>$en_methodsynopsis[$i]['methodparam']['type'][$j],
                            'value_lang'=>$lang_methodsynopsis[$i]['methodparam']['type'][$j],
                            'type'=>'errorParameterTypeMethodsynopsis'
                            );
                        }
                    }

                    // Check on initializer
                    if (isset($en_methodsynopsis[$i]['methodparam']['initializer'][$j])) {

                        if (!isset($lang_methodsynopsis[$i]['methodparam']['initializer'][$j])) { $lang_methodsynopsis[$i]['methodparam']['initializer'][$j]=''; }

                        if ($en_methodsynopsis[$i]['methodparam']['initializer'][$j]!=$lang_methodsynopsis[$i]['methodparam']['initializer'][$j]) {
                            $result_error[]=array(
                            'value_en'=>$en_methodsynopsis[$i]['methodparam']['initializer'][$j],
                            'value_lang'=>$lang_methodsynopsis[$i]['methodparam']['initializer'][$j],
                            'type'=>'errorParameterInitializerMethodsynopsis'
                            );
                        }
                    }

                    // Check on optionnel
                    if (isset($en_methodsynopsis[$i]['methodparam']['optionnel'][$j])) {

                        if (!isset($lang_methodsynopsis[$i]['methodparam']['optionnel'][$j])) {
                            $lang_methodsynopsis[$i]['methodparam']['optionnel'][$j] = '';
                        }

                        if ($en_methodsynopsis[$i]['methodparam']['optionnel'][$j] != $lang_methodsynopsis[$i]['methodparam']['optionnel'][$j]) {
                            $tmp1 = ($en_methodsynopsis[$i]['methodparam']['optionnel'][$j] == 0) ? $en_methodsynopsis[$i]['methodparam']['parameter'][$j] . ' <strong>ISN\'T</strong> optional' : $en_methodsynopsis[$i]['methodparam']['parameter'][$j].' <strong>IS</strong> optional (choice="opt")';

                            $tmp2 = ($lang_methodsynopsis[$i]['methodparam']['optionnel'][$j] == 0) ? $lang_methodsynopsis[$i]['methodparam']['parameter'][$j].' <strong>ISN\'T</strong> optional' : $lang_methodsynopsis[$i]['methodparam']['parameter'][$j].' <strong>IS</strong> optional (choice="opt")';

                            $result_error[] = array(
                            'value_en'   => $tmp1,
                            'value_lang' => $tmp2,
                            'type'=>'errorOptionalMethodsynopsis',
                            );
                        }
                    }

                    // Check on role
                    if (isset($en_methodsynopsis[$i]['methodparam']['role'][$j])) {

                        if (!isset($lang_methodsynopsis[$i]['methodparam']['role'][$j])) {
                            $lang_methodsynopsis[$i]['methodparam']['role'][$j]='';
                        }

                        if ($en_methodsynopsis[$i]['methodparam']['role'][$j] != $lang_methodsynopsis[$i]['methodparam']['role'][$j] ) {
                            $tmp1 = ($en_methodsynopsis[$i]['methodparam']['role'][$j] == 0) ? $en_methodsynopsis[$i]['methodparam']['parameter'][$j].' <strong>ISN\'T</strong> reference' : $en_methodsynopsis[$i]['methodparam']['parameter'][$j].' <strong>IS</strong> reference (role="reference")';
                            $tmp2 = ($lang_methodsynopsis[$i]['methodparam']['role'][$j]==0) ? $lang_methodsynopsis[$i]['methodparam']['parameter'][$j].' <strong>ISN\'T</strong> reference' : $lang_methodsynopsis[$i]['methodparam']['parameter'][$j].' <strong>IS</strong> reference (role="reference")';
                            $result_error[]=array(
                            'value_en'=>$tmp1,
                            'value_lang'=>$tmp2,
                            'type'=>'errorRoleMethodsynopsis',);
                        }
                    }
                }
            }
        }
        return $result_error;
    }

    /**
      * Update an option in user configuration database
      * @param $item The name of the option.
      * @param $value The value of the option.
      * @return Nothing
      */
    function updateConf($item, $value)
    {

        $s = sprintf('UPDATE users SET %s="%s" WHERE cvs_login="%s"', $item, $value, $this->cvsLogin);

        $this->db->query($s) or die($this->db->error);

        // In session
        $this->userConf[$item] = $value;
        $_SESSION['userConf'][$item] = $value;

        return '';
    }

    /**
      * Erase personal data. Delete all reference into the DB for this user.
      * @return Nothing
      */
    function erasePersonalData()
    {

        $this->db->query(sprintf('DELETE FROM commitMessage WHERE userID="%s"', $this->userID));
        $this->db->query(sprintf('DELETE FROM users WHERE userID="%s"', $this->userID));

        return;

    }

    function getAllFiles($node) {

        // Get Files Need Commit
        $ModifiedFiles = $this->get_modified_files();

        // Security
        $node = str_replace('..', '', $node);

        $d = dir(DOC_EDITOR_CVS_PATH.$node);

        $nodes = array();
        while($f = $d->read()){

            // We display only 'en' and 'LANG' tree
            if ($node == '/' && $f != 'en' && $f != $this->cvsLang ) {
                continue;
            }


            if ($f == '.'  ||
            $f == '..' ||
            substr($f, 0, 1)  == '.' || // skip hidden files
            substr($f, -4)    == '.new' || // skip pendingCommit files
            substr($f, -6)    == '.patch' || // skip pendingPatch files
            $f == 'CVS'

            ) continue;

            if (is_dir(DOC_EDITOR_CVS_PATH . $node . '/' . $f)) {
                $nodes[] = array('text' => $f, 'id' => $node . '/' . $f, 'cls' => 'folder', 'type' => 'folder');
            } else {

                if (isset($ModifiedFiles[substr($node, 2, (strlen($node)-1)).'/'.$f])) {
                    $cls = 'file modified';
                } else {
                    $cls = 'file';
                }

                // Get extension
                $t       = explode('.',$f);
                $ext     = $t[count($t)-1];
                $nodes[] = array('text'=>$f, 'id'=>$node.'/'.$f, 'leaf'=>true, 'cls'=>$cls, 'extension'=>$ext, 'type'=>'file');

            }
        }
        $d->close();
        return $nodes;
    }

    function saveLogMessage($messID, $mess)
    {
        $s = sprintf('UPDATE commitMessage SET text="%s" WHERE id="%s"', $this->db->real_escape_string($mess), $messID);
        $this->db->query($s) or die($this->db->error);
    }

    function deleteLogMessage($messID)
    {
        $s = sprintf('DELETE FROM commitMessage WHERE id="%s"', $messID);
        $this->db->query($s) or die($this->db->error);
    }

    function allFilesExtension($ExtName) {

        $s = 'SELECT `path`, `name` FROM `files` WHERE `path` LIKE \'/reference/'.$ExtName.'/%\' AND lang=\''.$this->cvsLang.'\' ORDER BY `path`, `name`';
        $r = $this->db->query($s) or die($this->db->error);
        $node = array();

        $i=0;
        while ($a = $r->fetch_object()) {

            $node[$i]['path'] = $a->path;
            $node[$i]['name'] = $a->name;

            $i++;
        }

        return $node;

    }

    function afterPatchAccept($PatchUniqID) {

        $s = 'SELECT * FROM `pendingPatch` WHERE uniqID = \''.$PatchUniqID.'\'';
        $r = $this->db->query($s) or die($this->db->error);
        $a = $r->fetch_object();

        // We need to send an email ?
        if (trim($a->email) != '' ) {

            $to = trim($a->email);
            $subject = '[PHP-DOC] - Patch accepted for '.$a->lang.$a->path.$a->name;
            $msg = <<<EOD
Your patch ($PatchUniqID) was accepted and applied to the PHP Manual.

Since the online and downloadable versions of the documentation need some
time to get updated, we would like to ask you to be a bit patient.
 	
Thank you for your submission, and for helping us make our documentation better.

-- 
{$this->cvsLogin}@php.net
EOD;
            $this->sendEmail($to, $subject, $msg);

        }
        
        // We need to delete this patch from filesystem...
        @unlink(DOC_EDITOR_CVS_PATH.$a->lang.$a->path.$a->name.'.'.$a->uniqID.'.patch');
        
        // ... and from DB
        $s = 'DELETE FROM `pendingPatch` WHERE id=\''.$a->id.'\'';
        $this->db->query($s) or die($this->db->error);

    }

    function afterPatchReject($PatchUniqID) {

        $s = sprintf('SELECT * FROM `pendingPatch` WHERE uniqID = "%s"', $PatchUniqID);
        $r = $this->db->query($s) or die($this->db->error);
        $a = $r->fetch_object();

        // We need to send an email ?
        if (trim($a->email) != '' ) {

            $to = trim($a->email);
            $subject = '[PHP-DOC] - Patch Rejected for '.$a->lang.$a->path.$a->name;
            $msg = <<<EOD
Your patch ($PatchUniqID) was rejected from the PHP Manual.
 	
Thank you for your submission.

-- 
{$this->cvsLogin}@php.net
EOD;
            $this->sendEmail($to, $subject, $msg);
        }
        
        // We need to delete this patch from filesystem...
        @unlink(DOC_EDITOR_CVS_PATH.$a->lang.$a->path.$a->name.'.'.$a->uniqID.'.patch');
        
        // ... and from DB
        $s = sprintf('DELETE FROM `pendingPatch` WHERE id="%s"', $a->id);
        $this->db->query($s) or die($this->db->error);

    }

    function searchXmlID($lang, $fileID)
    {
        $s = sprintf('SELECT lang, path, name FROM files WHERE lang="%s" AND xmlid LIKE "%' . $fileID . '%"', $lang);
        $r = $this->db->query($s) or die($this->db->error);
        return $r->fetch_object();
    }

    function check_doc($content) {

        $return['check_oldstyle']       = 'NULL';
        $return['check_undoc']          = 'NULL';
        $return['check_roleerror']      = 'NULL';
        $return['check_badorder']       = 'NULL';
        $return['check_noseealso']      = 'NULL';
        $return['check_noreturnvalues'] = 'NULL';
        $return['check_noparameters']   = 'NULL';
        $return['check_noexamples']     = 'NULL';
        $return['check_noerrors']       = 'NULL';

        $xmlstr = str_replace('&', '&amp;', $content);

        $xml = new DOMDocument();
        $xml->preserveWhiteSpace = false;

        if (!@$xml->loadXml($xmlstr)) {
            //echo "XML Parse Error: $function\n";
            return $return;
        }

        // Variables initialisation
        $noparameters = false;
        $returnvoid = false;


        $refsect1s  = $xml->getElementsByTagName('refsect1');
        foreach ($refsect1s as $refsect1) {
            $role = $refsect1->getAttribute('role');
            switch ($role) {
                case 'description':

                    // Get text buffer for various checks
                    $whole_description = $refsect1->nodeValue;

                    // If not documented, mark it and skip to next function
                    if (strpos($whole_description, '&warn.undocumented.func;') !== false) {
                        $return['check_undoc'] = 1;
                        return $return;
                    }

                    // If deprecated, skip to next function
                    // @todo: add a better way of handling this (new entity in phpdoc?)
                    if (strpos($whole_description, 'This function is deprecated') !== false) {
                        return $return;
                    }

                    // If an alias, skip to next function
                    if (strpos($whole_description, '&info.function.alias;') !== false) {
                        return $return;
                    } else {
                        $refnamedivs  = $xml->getElementsByTagName('refnamediv');
                        foreach ($refnamedivs as $refnamediv) {
                            if (stripos($refnamediv->nodeValue, 'alias') !== false) {
                                return $return;
                            }
                        }
                    }

                    // Look into the methodsynopsys tag(s)
                    $methodsynopsiss =  $xml->getElementsByTagName('methodsynopsis');
                    foreach ($methodsynopsiss as $methodsynopsis) {
                        foreach ($methodsynopsis->childNodes as $child) {
                            switch ($child->nodeName) {
                                case '#comment':
                                    // Skip comments
                                    continue;

                                case 'type':
                                    // This is the return type
                                    break;

                                case 'void':
                                    // This either the return type or 0 parameters
                                    if (!isset($methodname)) {
                                        //$returnvoid = true;
                                    } else { // no parameters
                                        $noparameters = true;
                                    }
                                    break;

                                case 'methodname':
                                    $methodname = $child->nodeValue;
                                    break;

                                case 'methodparam':
                                case 'modifier':
                                    break;

                                default:
                                    //echo "Unknown child for methodsynopsis: {$child->nodeName} in $function\n";
                            }
                        }
                    }


                    break;

                case 'returnvalues':
                case 'parameters':
                case 'seealso':
                case 'examples':
                case 'notes':
                case 'changelog':
                case 'errors':
                case 'unicode':
                    // test order
                    switch ($role) {
                        case 'parameters':
                            if (isset($notes) && isset($changelog) && isset($returnvalues) && isset($examples) && isset($seealso)) {
                                $return['check_badorder'] = 1;
                            }
                            break;
                        case 'returnvalues':
                            if (isset($notes) && isset($changelog) && isset($examples) && isset($seealso)) {
                                $return['check_badorder'] = 1;
                            }
                            break;
                        case 'changelog':
                            if (isset($notes) && isset($examples) && isset($seealso)) {
                                $return['check_badorder'] = 1;
                            }
                            break;
                        case 'examples':
                            if (isset($notes) && isset($seealso)) {
                                $return['check_badorder'] = 1;
                            }
                            break;
                        case 'notes':
                            if (isset($seealso)) {
                                $return['check_badorder'] = 1;
                            }
                            break;
                    }
                    $$role = 1;
                    $whole_content = $refsect1->nodeValue;

                    // Check for default stub generated by xml_proto
                    if ($role == 'returnvalues' && strpos($whole_content, 'What the function returns, first on success, then on failure.') !== false) {
                        unset($returnvalues);
                    }
                    break;

                default:
                    if ($role != '') {
                        $check_doc['check_roleerror'] = 1;
                    } else {
                        $check_doc['check_oldstyle'] = 1;
                        // Skip the remaining refsect1
                        return $return;
                    }
            }
        }

        // See also checks
        if (!isset($seealso)) {
            $return['check_noseealso'] = 1;
        }
        unset($seealso);

        // Return Values
        if (!isset($returnvalues)) {
            $return['check_noreturnvalues'] = 1;
        }
        unset($returnvalues);

        // Parameters
        if (!isset($parameters) && !$noparameters) {
            $return['check_noparameters'] = 1;
        }
        unset($parameters);

        // Examples checks
        if (!isset($examples)) {
            $return['check_noexamples'] = 1;
        }
        unset($examples);

        // Errors checks
        if (!isset($errors)) {
            $return['check_noerrors'] = 1;
        }
        unset($errors);

        return $return;

    } // check_doc

    function get_Check_Doc_Data() {

        $node = array();

        $s = 'SELECT
                   path,
                   COUNT(*) AS total,
                   SUM(check_oldstyle)       as total_check_oldstyle,
                   SUM(check_undoc)          as total_check_undoc,
                   SUM(check_roleerror)      as total_check_roleerror,
                   SUM(check_badorder)       as total_check_badorder,
                   SUM(check_noseealso)      as total_check_noseealso,
                   SUM(check_noreturnvalues) as total_check_noreturnvalues,
                   SUM(check_noparameters)   as total_check_noparameters,
                   SUM(check_noexamples)     as total_check_noexamples,
                   SUM(check_noerrors)       as total_check_noerrors

                  FROM files

                  WHERE
                   `lang`=\'en\' AND
                   `path` REGEXP "^/reference/.*/functions/$"

                  GROUP BY path

                  ORDER BY path';

        $r    = $this->db->query($s);
        $nb   = $r->num_rows;
        $i = 0;
        while ($a = $r->fetch_object()) {
            $i++;

            $tmp = explode('/', $a->path);
            $extension = $tmp[2];

            $node[] = array(
            "id"                   => $i,
            "extension"            => ucFirst($extension),
            "path"                 => $a->path,
            "check_oldstyle"       => ( !$a->total_check_oldstyle)       ? 0 : (int)$a->total_check_oldstyle,
            "check_undoc"          => ( !$a->total_check_undoc)          ? 0 : (int)$a->total_check_undoc,
            "check_roleerror"      => ( !$a->total_check_roleerror)      ? 0 : (int)$a->total_check_roleerror,
            "check_badorder"       => ( !$a->total_check_badorder)       ? 0 : (int)$a->total_check_badorder,
            "check_noseealso"      => ( !$a->total_check_noseealso)      ? 0 : (int)$a->total_check_noseealso,
            "check_noreturnvalues" => ( !$a->total_check_noreturnvalues) ? 0 : (int)$a->total_check_noreturnvalues,
            "check_noparameters"   => ( !$a->total_check_noparameters)   ? 0 : (int)$a->total_check_noparameters,
            "check_noexamples"     => ( !$a->total_check_noexamples)     ? 0 : (int)$a->total_check_noexamples,
            "check_noerrors"       => ( !$a->total_check_noerrors)       ? 0 : (int)$a->total_check_noerrors
            );

        } // While

        return array('nb' => $nb, 'node' => $node);

    } //get_Check_Doc_Data

    function get_Check_Doc_Files($path, $errorType)
    {
        $s = sprintf('SELECT name FROM `files` WHERE `lang`="en" AND `path`="%s" AND `%s`=1', $path, $errorType);
        $r = $this->db->query($s);

        $node = array();
        while ($row = $r->fetch_assoc()) {
            $node[] = $row;
        }
        return $node;
    } // get_Check_Doc_Files

} // End of class
