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
require_once dirname(__FILE__) . '/LockFile.php';
require_once dirname(__FILE__) . '/ToolsError.php';
require_once dirname(__FILE__) . '/ToolsCheckDoc.php';

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
    public $db;

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
     * Apply the Revcheck tools recursively on all lang
     *
     * @param $dir The directory from which we start.
     * @return Nothing.
     */
    function revDoRevCheck( $dir = '' ) {
        if ($dh = @opendir(DOC_EDITOR_CVS_PATH . 'en/' . $dir)) {

            $entriesDir = array();
            $entriesFiles = array();

            while (($file = readdir($dh)) !== false) {

                if ( !$this->isParsed('en', $dir, $file) ) {
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

                    $tmp = explode('/', $dir);

                    $ToolsCheckDoc = new ToolsCheckDoc($this->db);
                    $ToolsCheckDocResult = $ToolsCheckDoc->checkDoc($infoEN['content'], $dir);

                    // Sql insert.
                    $s = sprintf('INSERT INTO `files` (`lang`, `xmlid`, `path`, `name`, `revision`, `size`, `mdate`, `maintainer`, `status`, `check_oldstyle`,  `check_undoc`, `check_roleerror`, `check_badorder`, `check_noseealso`, `check_noreturnvalues`, `check_noparameters`, `check_noexamples`, `check_noerrors`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)',
                    "'en'",
                    $xmlid,
                    "'$dir/'",
                    "'$file'",
                    $en_revision,
                    $en_size,
                    $en_date,
                    "NULL",
                    "NULL",
                    $ToolsCheckDocResult['check_oldstyle'],
                    $ToolsCheckDocResult['check_undoc'],
                    $ToolsCheckDocResult['check_roleerror'],
                    $ToolsCheckDocResult['check_badorder'],
                    $ToolsCheckDocResult['check_noseealso'],
                    $ToolsCheckDocResult['check_noreturnvalues'],
                    $ToolsCheckDocResult['check_noparameters'],
                    $ToolsCheckDocResult['check_noexamples'],
                    $ToolsCheckDocResult['check_noerrors']
                    );

                    $this->db->query($s) or die('Error: '.$this->db->error.'|'.$s);

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

                            $s = sprintf('INSERT INTO `files` (`lang`, `xmlid`, `path`, `name`, `revision`, `en_revision`, `reviewed`, `size`, `size_diff`, `mdate`, `mdate_diff`, `maintainer`, `status`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)',
                            "'$lang'",
                            $xmlid,
                            "'$dir/'",
                            "'$file'",
                            $revision,
                            $en_revision,
                            $reviewed,
                            $size,
                            $size_diff,
                            $date,
                            $date_diff,
                            $maintainer,
                            $status
                            );
                            $this->db->query($s) or die('Error: '.$this->db->error.'|'.$s);

                            // Check for error in this file ONLY if this file is uptodate
                            if ($revision == $en_revision ) {

                                $error = new ToolsError($this->db);
                                $error->setParams($infoEN['content'], $infoLANG['content'], $lang, $dir.'/', $file, $maintainer);
                                $error->run();
                                $error->saveError();

                            }

                        } else {

                            $s = sprintf('INSERT INTO `files` (`lang`, `path`, `name`, `revision`, `size`, `mdate`, `maintainer`, `status`) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)',
                            "'$lang'",
                            "'$dir/'",
                            "'$file'",
                            "NULL",
                            "NULL",
                            "NULL",
                            "NULL",
                            "NULL"
                            );
                            $this->db->query($s) or die('Error: '.$this->db->error.'|'.$s);

                        }

                    }



                }
            }

            // Directories..
            if (sizeof($entriesDir) > 0) {

                reset($entriesDir);

                foreach ($entriesDir as $Edir) {

                    $this->revDoRevCheck($dir . '/' . $Edir);

                }
            }
        }
        @closedir($dh);
    }

    /**
     * Parse a string to find all attributs.
     *
     * @param $tags_attrs The string to parse.
     * @return An associated array who key are the name of the attribut, and value, the value of the attribut.
     */
    function revParseAttrString($tags_attrs) {
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

    /**
     * List all available language to run doCheckOldFiles() on it.
     * 
     */
    function checkOldFiles() {

        reset($this->availableLanguage);

        while (list(, $lang) = each($this->availableLanguage)) {
            $this->doCheckOldFiles('', $lang);
        }
    }

    /**
     * Analyse all files to check if the LANG files is present into EN tree or not.
     * 
     * @param $dir The analysed dir.
     * @param $lang The tested lang.
     *
     */
    function doCheckOldFiles($dir = '', $lang) {

        if ($dh = @opendir(DOC_EDITOR_CVS_PATH . $lang . $dir)) {

            $entriesDir = array();
            $entriesFiles = array();

            while (($file = readdir($dh)) !== false) {
                if ( !$this->isParsed($lang, $dir, $file) ) {
                    continue;
                }

                if ($file != '.' && $file != '..' && $file != 'CVS' && $dir != '/functions') {

                    if (is_dir(DOC_EDITOR_CVS_PATH . $lang . $dir.'/' .$file)) {
                        $entriesDir[] = $file;
                    } elseif (is_file(DOC_EDITOR_CVS_PATH . $lang . $dir.'/' .$file)) {
                        $entriesFiles[] = $file;
                    }
                }
            }

            // Files first
            if (!empty($entriesFiles)) {
                foreach($entriesFiles as $file) {
                    $path_en = DOC_EDITOR_CVS_PATH . 'en/' . $dir . '/' . $file;
                    $path = DOC_EDITOR_CVS_PATH . $lang . $dir . '/' . $file;

                    if (!@is_file($path_en)) {
                        $size = intval(filesize($path) / 1024);

                        $s = sprintf('INSERT INTO `files` (`lang`, `path`, `name`, `status`) VALUES (%s, %s, %s, %s)',
                        "'".$lang."'",
                        "'$dir/'",
                        "'$file'",
                        "'NotInEN'"
                        );
                        $this->db->query($s) or die('Error: '.$this->db->error.'|'.$s);
                    }
                }
            }

            // Directories..
            if (!empty($entriesDir)) {
                foreach ($entriesDir as $Edir) {
                    $this->doCheckOldFiles($dir . '/' . $Edir, $lang);
                }
            }
        }
        @closedir($dh);
    }

    /**
     * Parse the translation's file witch hold all informations about all translators and put it into database.
     */
    function revParseTranslation() {

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
                    $persons = $this->revParseAttrString($matches[1]);

                    $charset = $this->getFileEncoding($txml, 'content');

                    foreach ($persons as $person) {

                        if ($charset == 'utf-8' ) {
                            $name = utf8_decode($person['name']);
                        } else {
                            $name = $person['name'];
                        }

                        $person = array_merge($default, $person);

                        $s = sprintf('INSERT INTO `translators` (`lang`, `nick`, `name`, `mail`, `cvs`, `editor`) VALUES ("%s", "%s", "%s", "%s", "%s", "%s")',
                        $lang,
                        $this->db->real_escape_string($person['nick']),
                        $this->db->real_escape_string($name),
                        $this->db->real_escape_string($person['email']),
                        $this->db->real_escape_string($person['cvs']),
                        $this->db->real_escape_string($person['editor'])
                        );

                        $this->db->query($s) or die('Error: '.$this->db->error.'|'.$s);
                    }
                }
            }
        }
    }

    /**
     * Test if the file is a modified file.
     *
     * @param $lang The lang of the tested file.
     * @param $path The path of the tested file.
     * @param $name The name of the tested file.
     *
     * @return Boolean TRUE if the file is a modified file, FALSE otherwise.
     */
    function isModifiedFile($lang, $path, $name) {

        $s = sprintf('SELECT `id`, `lang`, `path`, `name` FROM `pendingCommit` WHERE 
        `lang`="%s" AND `path`="%s" AND `name`="%s"', $lang, $path, $name);

        $r = $this->db->query($s) or die('Error: '.$this->db->error.'|'.$s);

        return ( $r->num_rows == 0 ) ? FALSE : TRUE;

    }

    /**
     * Get all modified files.
     *
     * @return An associated array containing all informations about modified files.
     */
    function getModifiedFiles() {

        // Get Modified Files
        $s = sprintf('SELECT `id`, `lang`, `path`, `name`, `revision`,
        `en_revision`, `maintainer`, `reviewed` FROM `pendingCommit` WHERE 
        `lang`="%s" OR `lang`="en"', $this->cvsLang);

        $r = $this->db->query($s) or die('Error: '.$this->db->error.'|'.$s);

        $node = array();

        while ($a = $r->fetch_assoc()) {
            $node[$a['lang'].$a['path'].$a['name']] = $a;
        }

        return $node;

    }

    /**
     * Get modified files by ID.
     * @param $id Can be a single ID or an array of id
     * @return An associated array containing all informations about modified files.
     */
    function getModifiedFilesById($id) {

        if( is_array($id) ) {
            $ids = implode($id, ',');
        } else {
            $ids = $id;
        }

        $s = sprintf('SELECT * FROM `pendingCommit` WHERE 
                      (`lang`="%s" OR `lang`="en") AND `id` IN (%s)', $this->cvsLang, $ids);

        $r = $this->db->query($s) or die('Error: '.$this->db->error.'|'.$s);

        $nodes = array();

        while ($a = $r->fetch_assoc()) {
            $nodes[] = $a;
        }

        return $nodes;
    }

    /**
     * Get all files witch need to be updated.
     *
     * @return An associated array containing all informations about files witch need to be updated.
     */
    function getFilesNeedUpdate() {

        // Get Files Need Commit
        $ModifiedFiles = $this->getModifiedFiles();

        $s = sprintf('SELECT * FROM `files` WHERE `lang` = "%s" AND `revision` != `en_revision`', $this->cvsLang);
        $r = $this->db->query($s);

        $nb = $r->num_rows;

        $node = array();

        while ($a = $r->fetch_object()) {

            if (isset($ModifiedFiles[$this->cvsLang.$a->path.$a->name]) || isset($ModifiedFiles['en'.$a->path.$a->name])) {

                if (isset($ModifiedFiles['en'.$a->path.$a->name])) {
                    $new_en_revision = $ModifiedFiles['en'.$a->path.$a->name]['revision'];
                    $new_revision    = $a->revision;
                    $new_maintainer  = $a->maintainer;
                }

                if (isset($ModifiedFiles[$this->cvsLang.$a->path.$a->name])) {
                    $new_en_revision = $a->en_revision;
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
                "revision"    => $a->revision,
                "en_revision" => $a->en_revision,
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
     *
     * @return An associated array containing all informations about files witch need to be reviewed.
     */
    function getFilesNeedReviewed() {

        // Get Files Need Commit
        $ModifiedFiles = $this->getModifiedFiles();

        $s = sprintf('SELECT * FROM `files` WHERE `lang` = "%s" AND `revision` = `en_revision` AND reviewed != \'yes\' LIMIT 100', $this->cvsLang);
        $r = $this->db->query($s) or die('Error: '.$this->db->error.'|'.$s);
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
     * Get all files witch are not in EN tree.
     *
     * @return An associated array containing all informations about files witch are not in EN tree
     */
    function getFilesNotInEn() {

        // Get Files Need Commit
        $ModifiedFiles = $this->getModifiedFiles();

        $s = sprintf('SELECT `id`, `path`, `name` FROM `files` WHERE `lang`="%s" AND `status`=\'NotInEN\'', $this->cvsLang);

        $r = $this->db->query($s) or die('Error: '.$this->db->error.'|'.$s);
        $nb = $r->num_rows;

        $node = array();

        while ($a = $r->fetch_object()) {

            $node[] = array(
            "id"          => $a->id,
            "path"        => $a->path,
            "name"        => $a->name,
            "needcommit"  => ( isset($ModifiedFiles[$this->cvsLang.$a->path.$a->name]) ) ? true : false
            );

        }

        return array('nb' => $nb, 'node' => $node);
    }

    /**
     * Get all pending patch.
     *
     * @return An associated array containing all informations about pending patch.
     */
    function getFilesPendingPatch() {

        $s = sprintf('SELECT `id`, CONCAT(`lang`, `path`) AS path, `name`, `posted_by` AS \'by\', `uniqID`, `date` FROM `pendingPatch` WHERE `lang`="%s" OR `lang`=\'en\'', $this->cvsLang);

        $r = $this->db->query($s) or die('Error: '.$this->db->error.'|'.$s);
        $nb = $r->num_rows;

        $node = array();

        while ($row = $r->fetch_assoc()) {
            $node[] = $row;
        }

        return array('nb' => $nb, 'node' => $node);
    }

    /**
     * Get all files pending for commit.
     *
     * @return An associated array containing all informations about files pending for commit.
     */
    function getFilesPendingCommit() {

        $s = sprintf('SELECT * FROM `pendingCommit` WHERE `lang`="%s" OR `lang`=\'en\'', $this->cvsLang);
        $r = $this->db->query($s) or die('Error: '.$this->db->error.'|'.$s);
        $nb = $r->num_rows;

        $node = array();

        while ($a = $r->fetch_object()) {

            $node[] = array(
            "id"          => $a->id,
            "path"        => $a->lang.$a->path,
            "name"        => $a->name,
            "by"          => $a->modified_by,
            "date"        => $a->date,
            "type"        => $a->type
            );

        }

        return array('nb'=>$nb, 'node'=>$node);
    }

    /**
     * Get all translators informations.
     *
     * @return An associated array containing all informations about translators.
     */
    function getTranslators()
    {
        $sql = sprintf('SELECT `id`, `nick`, `name`, `mail`, `cvs` FROM `translators` WHERE `lang`="%s"', $this->cvsLang);
        $persons = array();
        $result = $this->db->query($sql) or die('Error: '.$this->db->error.'|'.$s);

        while ($r = $result->fetch_array()) {
            $persons[$r['nick']] = array('id'=>$r['id'], 'name' => utf8_encode($r['name']), 'mail' => $r['mail'], 'cvs' => $r['cvs']);
        }

        return $persons;
    }

    /**
     * Get all statistiques about translators.
     *
     * @return An indexed array containing all statistiques about translators (nb uptodate files, nb old files, etc...)
     */
    function getTranslatorsInfo() {

        $translators = $this->getTranslators();
        $uptodate    = $this->translatorGetUptodate();
        $old         = $this->translatorGetOld();
        $critical    = $this->translatorGetCritical();

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
     *
     * @return An indexed array containing all statistiques for the summary
     */
    function getSummaryInfo() {

        $nbFiles     = $this->getNbFiles();

        $uptodate    = $this->getNbFilesTranslated();
        $old         = $this->getStatsOld();
        $critical    = $this->getStatsCritical();

        $missFiles = $this->getStatsNoTrans();

        $withoutRevTag = $this->getStatsNoTag();

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
     *
     * @return An associated array (key=>translator's nick, value=>nb files).
     */
    function translatorGetUptodate()
    {
        $sql = sprintf('SELECT
                COUNT(`name`) AS total,
                `maintainer`
            FROM
                `files`
            WHERE
                `lang`="%s"
            AND 
                `revision` = `en_revision`
            GROUP BY
                `maintainer`
            ORDER BY
                `maintainer`', $this->cvsLang);

        $result = $this->db->query($sql) or die('Error: '.$this->db->error.'|'.$s);
        $tmp = array();
        while ($r = $result->fetch_array()) {
            $tmp[$r['maintainer']] = $r['total'];
        }
        return $tmp;
    }

    /**
     * Get number of old files per translators.
     *
     * @return An associated array (key=>translator's nick, value=>nb files).
     */
    function translatorGetOld()
    {
        $sql = sprintf('SELECT
                COUNT(`name`) AS total,
                `maintainer`
            FROM
                `files`
            WHERE
                `lang`="%s"
            AND
                `en_revision` != `revision`
            AND
                `en_revision` - `revision` < 10
            AND
                `size_diff` < 3 
            AND 
                `mdate_diff` > -30
            AND
                `size` is not NULL
            GROUP BY
                `maintainer`
            ORDER BY
                `maintainer`', $this->cvsLang);

        $result = $this->db->query($sql) or die('Error: '.$this->db->error.'|'.$s);
        $tmp = array();
        while ($r = $result->fetch_array()) {
            $tmp[$r['maintainer']] = $r['total'];
        }
        return $tmp;
    }

    /**
     * Get number of critical files per translators.
     *
     * @return An associated array (key=>translator's nick, value=>nb files).
     */
    function translatorGetCritical()
    {
        $sql = sprintf('SELECT
                COUNT(`name`) AS total,
                `maintainer`
            FROM
                `files`
            WHERE
                `lang`="%s"
            AND
                ( `en_revision` - `revision` >= 10  OR
                ( `en_revision` != `revision`  AND
                    ( `size_diff` >= 3 OR `mdate_diff` <= -30 )
                ))
            AND
                `size` is not NULL
            GROUP BY
                `maintainer`
            ORDER BY
                `maintainer`', $this->cvsLang);
        $result = $this->db->query($sql) or die('Error: '.$this->db->error.'|'.$s);
        $tmp = array();
        while ($r = $result->fetch_array()) {
            $tmp[$r['maintainer']] = $r['total'];
        }
        return $tmp;
    }

    /**
     * Get number/size of all files.
     *
     * @return An indexed array.
     */
    function getNbFiles() {
        $sql = sprintf('SELECT
                    COUNT(*) AS total,
                    SUM(`size`) AS total_size
                FROM
                    `files`
                WHERE
                    `lang` = "%s"
            ', $this->cvsLang);

        $res = $this->db->query($sql) or die('Error: '.$this->db->error.'|'.$s);
        $r = $res->fetch_array();
        $result = array($r['total'], $r['total_size']);
        return $result;
    }

    /**
     * Get number of translated files.
     *
     * @return Number of translated files.
     */
    function getNbFilesTranslated() {

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

        $res = $this->db->query($sql) or die('Error: '.$this->db->error.'|'.$s);
        $r = $res->fetch_array();
        $result = array($r['total'], $r['total_size']);
        return $result;
    }

    /**
     * Get statistic about critical files witch need to be updated.
     *
     * @return An associated array (total=>nb files, total_size=>size of this files).
     */
    function getStatsCritical() {

        $s = sprintf('SELECT
                COUNT(`name`) AS total,
                SUM(`size`) AS total_size
            FROM
                `files`
            WHERE
                `lang`="%s"
            AND
                ( `en_revision` - `revision` >= 10  OR
                ( `en_revision` != `revision`  AND
                    ( `size_diff` >= 3 OR `mdate_diff` <= -30 )
                ))
            AND
                `size` is not NULL
           ', $this->cvsLang);

        $result = $this->db->query($s) or die('Error: '.$this->db->error.'|'.$s);

        $r = $result->fetch_array();
        $result = array($r['total'], $r['total_size']);
        return $result;
    }

    /**
     * Get statistic about old files witch need to be uptadeted from LANG tree.
     *
     * @return An associated array (total=>nb files, total_size=>size of this files).
     */
    function getStatsOld()
    {
        $sql = sprintf('SELECT
                COUNT(`name`) AS total,
                SUM(`size`)   AS total_size
            FROM
                `files`
            WHERE
                `lang`="%s"
            AND
                `en_revision` != `revision`
            AND
                `en_revision` - `revision` < 10
            AND
                `size_diff` < 3 
            AND 
                `mdate_diff` > -30
            AND
                `size` is not NULL
           ', $this->cvsLang);

        $result = $this->db->query($sql) or die('Error: '.$this->db->error.'|'.$s);

        $r = $result->fetch_array();
        $result = array($r['total'], $r['total_size']);
        return $result;
    }

    /**
     * Get statistic about files witch need to be translated.
     *
     * @return An associated array (total=>nb files, size=>size of this files).
     */
    function getStatsNoTrans()
    {
        $sql = sprintf('SELECT
                COUNT(a.name) as total, 
                sum(b.size) as size 
            FROM
                `files` a
            LEFT JOIN
                `files` b
            ON 
                a.path = b.path 
            AND
                a.name = b.name
            WHERE
                a.lang="%s" 
            AND
                b.lang="en"
            AND
                (a.revision is NULL OR a.revision = 0)
            AND
                a.size is NULL', $this->cvsLang);

        $result = $this->db->query($sql) or die('Error: '.$this->db->error.'|'.$s);
        if ($result->num_rows) {
            $r = $result->fetch_array();
            return array($r['total'], $r['size']);
        } else {
            return array(0,0);
        }
    }

    /**
     * Get statistic about missed files witch need to be added to LANG tree.
     *
     * @return An array of missed files (size=>size of the file, file=>name of the file).
     */
    function getMissFiles()
    {
        $sql = sprintf('SELECT
                b.size as size, 
                a.name as file 
            FROM
                `files` a
            LEFT JOIN
                `files` b 
            ON 
                a.path = b.path 
            AND
                a.name = b.name 
            WHERE 
                a.lang="%s" 
            AND
                b.lang="en" 
            AND
                a.revision is NULL 
            AND
                a.size is NULL', $this->cvsLang);

        $result = $this->db->query($sql) or die('Error: '.$this->db->error.'|'.$s);
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
     *
     * @return An associated array (total=>nb files, size=>size of this files).
     */
    function getStatsNoTag()
    {
        $sql = sprintf('SELECT
                COUNT(a.name) as total,
                sum(b.size) as size
            FROM
                `files` a
            LEFT JOIN
                `files` b 
            ON 
                a.path = b.path 
            AND
                a.name = b.name
            WHERE
                a.lang="%s" 
            AND
                b.lang="en"
            AND
                a.revision is NULL
            AND
                a.size is not NULL', $this->cvsLang);

        $result = $this->db->query($sql) or die('Error: '.$this->db->error.'|'.$s);

        $r = $result->fetch_array();
        $result = array($r['total'], $r['size']);
        return $result;
    }

    /**
     * Get encoding of a file, regarding his XML's header.
     *
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
        $xmlinfo = $this->revParseAttrString($match);

        $charset = (isset($xmlinfo[1]['encoding'])) ? strtolower($xmlinfo[1]['encoding']) : 'iso-8859-1';

        return $charset;
    }

    /**
     * Get the content of a file.
     *
     * @param $FilePath The path of the file.
     * @param $FileName The name of the file.
     * @return An associated array (content=> content of the file, charset=>the charset of the file).
     */
    function getFileContent($FilePath, $FileName) {

        // Security
        $FilePath = str_replace('..', '', $FilePath);
        $FilePath = str_replace('//', '/', $FilePath);

        $file = $FilePath.$FileName;

        // Is this file modified ?
        $ModifiedFiles = $this->getModifiedFiles();

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
     *
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
     * Register a new patch, into the database.
     *
     * @param $lang     The lang.
     * @param $FilePath The path for the file.
     * @param $FileName The name of the file.
     * @param $emailAlert The email of the user how propose this patch.
     * @return Nothing.
     */
    function registerAsPendingPatch($lang, $FilePath, $FileName, $emailAlert) {

        $uniqID = md5(uniqid(rand(), true));

        $s = sprintf('INSERT into `pendingPatch` (`lang`, `path`, `name`, `posted_by`, `date`, `email`, `uniqID`) VALUES ("%s", "%s", "%s", "%s", now(), "%s", "%s")', $lang, $FilePath, $FileName, $this->cvsLogin, $emailAlert, $uniqID);
        $this->db->query($s) or die('Error: '.$this->db->error.'|'.$s);

        return $uniqID;

    }

    /**
     * Get the information from the content of a file.
     *
     * @param $content The content of the file.
     * @return An associated array of informations.
     */
    function getInfoFromContent($content) {

        $info = array('rev'=>0, 'en-rev'=>0, 'maintainer'=>'NULL', 'reviewed'=>'NULL', 'status'=>'NULL', 'xmlid'=>'NULL', 'content'=>$content);

        // Cvs tag
        $match = array();
        preg_match('/<!-- .Revision: (\d+) . -->/', $content, $match);
        if (!empty($match)) {
            $info['rev'] = $match[1];
        }

        //Rev tag
        $match = array();
        preg_match('/<!--\s*EN-Revision:\s*(\d+)\s*Maintainer:\s*(\\S*)\s*Status:\s*(.+)\s*-->/U', $content, $match);
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

    /**
     * Same as getInfoFromContent() but with a file instead of a content of a file.
     *
     * @param $FilePath The path of the file.
     * @see getInfoFromContent
     * @return An associated array of informations.
     */
    function getInfoFromFile($FilePath) {
        $content = file_get_contents($FilePath);
        return $this->getInfoFromContent($content);
    }

    /**
     * Get the diff of a file with his modified version.
     *
     * @param $path The path to the file.
     * @param $file The name of the file.
     * @param $type The type is blank, $file is a modified file, else, this is a patch.
     * @param $uniqID The uniq ID of the patch, if $type != ''.
     * @return The diff of the file with his modified version, as HTML, ready to be display.
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
     *
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

    /**
     * Get the diff of a file with his modified version.
     *
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
     *
     * @return An indexed array of commit message.
     */
    function getCommitLogMessage()
    {
        $result = array();

        $s = sprintf('SELECT `id`, `text` FROM `commitMessage` WHERE userID="%s"', $this->userID);
        $r = $this->db->query($s) or die('Error: '.$this->db->error.'|'.$s);
        while ($a = $r->fetch_assoc()) {
            $result[] = $a;
        }

        return $result;
    }

    /**
     * Save Output message into a log file.
     *
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
     *
     * @param $file The name of the file.
     * @return $content The content.
     */
    function getOutputLogFile($file) {
        return file_get_contents(DOC_EDITOR_CVS_PATH . '../.' . $file);
    }

    /**
     * Delete local change of a file.
     *
     * @param $type The type of the file. Can be 'update', 'delete' or new'
     * @param $path The path of the file.
     * @param $file The name of the file.
     * @return An array witch contain informations about this file.
     */
    function clearLocalChange($type, $path, $file) {

        // Extract the lang
        $t = explode('/',$path);
        $lang = $t[0];
        array_shift($t);

        // Add first /
        $path = '/'.implode('/', $t);

        // We need delete row from pendingCommit table
        $s = sprintf('SELECT `id` FROM `pendingCommit` WHERE `lang`="%s" AND `path`="%s" AND name="%s"', $lang, $path, $file);
        $r = $this->db->query($s);
        $a = $r->fetch_object();

        // We need delete row from pendingCommit table
        $s = sprintf('DELETE FROM `pendingCommit` WHERE `id`="%s"', $a->id);
        $this->db->query($s) or die('Error: '.$this->db->error.'|'.$s);

        // If type == delete or new, we stop here and return
        if( $type == 'delete' || $type == 'new' ) {
            return;
        }

        // We need delete file on filesystem
        $doc = DOC_EDITOR_CVS_PATH.$lang.$path.$file.".new";

        @unlink($doc);

        // We need check for error in this file

        $en_content     = file_get_contents(DOC_EDITOR_CVS_PATH.'en'.$path.$file);
        $lang_content   = file_get_contents(DOC_EDITOR_CVS_PATH.$lang.$path.$file);

        $info = $this->getInfoFromContent($lang_content);

        $anode[0] = array( 'lang' => $lang,
                           'path' => $path,
                           'name' => $file,
                           'en_content' => $en_content,
                           'lang_content' => $lang_content,
                           'maintainer' => $info['maintainer']
        );

        $errorTools = new ToolsError($this->db);
        $error = $errorTools->updateFilesError($anode, 'nocommit');

        // We need reload original lang_revision
        $s = sprintf('SELECT `revision`, `maintainer`, `reviewed` FROM `files` WHERE `lang`="%s" AND `path`="%s" AND `name`="%s"', $lang, $path, $file);
        $r = $this->db->query($s) or die('Error: '.$this->db->error.'|'.$s);
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
     *
     * @param $anode An array of files to be commited.
     * @param $log The message log to use with this commit.
     * @return The message from Cvs server after this commit.
     */
    function cvsCommit($anode, $log) {

        $filesUpdate = array();
        $filesDelete = array();
        $filesNew    = array();

        $cmdUpdate = '';
        $cmdDelete = '';
        $cmdNew    = '';

        $nodes = $this->getModifiedFilesById($anode);

        // Loop over $nodes to find files to be delete, update, or new
        reset($nodes);
        for( $i=0; $i < count($nodes); $i++) {

            $fullPath = $nodes[$i]['lang'].$nodes[$i]['path'].$nodes[$i]['name'];

            if( $nodes[$i]['type'] == 'delete' ) {
                $filesDelete[] = $fullPath;
            }

            if( $nodes[$i]['type'] == 'update' ) {

                $filesUpdate[] = $fullPath;

                // Pre-commit : We need move .new file into the real file
                @unlink( DOC_EDITOR_CVS_PATH.$fullPath);
                @copy(   DOC_EDITOR_CVS_PATH.$fullPath.'.new', DOC_EDITOR_CVS_PATH.$fullPath);
                @unlink( DOC_EDITOR_CVS_PATH.$fullPath.'.new');

            }

            if( $nodes[$i]['type'] == 'new' ) {
                $filesNew[] = $fullPath;
            }
        }

        // Linearization
        $filesDelete = implode($filesDelete, ' ');
        $filesUpdate = implode($filesUpdate, ' ');
        $filesNew    = implode($filesNew, ' ');

        // Buil the command line
        if( trim($filesDelete) != '' ) {
            $cmdDelete = 'cvs -d :pserver:'.$this->cvsLogin.':'.$this->cvsPasswd.'@cvs.php.net:/repository -f remove -f '.$filesDelete.' && ';
        }
        if( trim($filesNew) != '' ) {
            $cmdNew = 'cvs -d :pserver:'.$this->cvsLogin.':'.$this->cvsPasswd.'@cvs.php.net:/repository -f add '.$filesNew.' && ';
        }

        // Escape single quote
        $log = str_replace("'", "\\'", $log);

        $cmd = $cmdDelete.
               $cmdNew.
               'cvs -d :pserver:'.$this->cvsLogin.':'.$this->cvsPasswd.'@cvs.php.net:/repository -f commit -l -m \''.$log.'\' '.$filesUpdate.' '.$filesDelete.' '.$filesNew;

        // First, login into Cvs
        $fullCmd = 'export CVS_PASSFILE='.realpath(DOC_EDITOR_DATA_PATH).'/.cvspass && cd '.DOC_EDITOR_CVS_PATH.' && cvs -d :pserver:'.$this->cvsLogin.':'.$this->cvsPasswd.'@cvs.php.net:/repository login && '.$cmd;

        $output  = array();
        exec($fullCmd, $output);

        //$this->debug('commit cmd : '.$fullCmd);

        return $this->highlightCommitLog($output);
    }

    /**
     * Highlights the given commit log
     *
     * @param $message The commit log
     * @return The output message, more beautiful than before!
     */
    function highlightCommitLog($message) {

        $reg = array("/(COMMITINFO)/", "/(LOGINFO)/", "/(Checking in)/", "/(done)/", "/(bailing)/", "/(Mailing the commit email to)/", "/(Logging in to)/","(new revision)");
        return preg_replace($reg, "<span style=\"color: #15428B; font-weight: bold;\">\\1</span>", $message);

    }

    /**
     * Update information about a file after his commit (update informations added with revcheck tools).
     *
     * @param $nodes An array of files.
     */
    function updateRev($nodes) {

        for ($i = 0; $i < count($nodes); $i++ ) {

            $FileLang = $nodes[$i]['lang'];

            $FilePath = $nodes[$i]['path'];
            $FileName = $nodes[$i]['name'];

            //En file ?
            if ($FileLang == 'en' ) {

                $path    = DOC_EDITOR_CVS_PATH.'en'.$FilePath.$FileName;
                $content = file_get_contents($path);
                $info    = $this->getInfoFromContent($content);
                $size    = intval(filesize($path) / 1024);
                $date    = filemtime($path);

                // For the EN file
                $s = sprintf('UPDATE `files`
                 SET
                   `revision` = "%s",
                   `size`     = "%s",
                   `mdate`    = "%s"

                 WHERE
                   `lang` = "%s" AND
                   `path` = "%s" AND
                   `name` = "%s"
               ',$info['rev'], $size, $date, $FileLang, $FilePath, $FileName);
                $this->db->query($s) or die($this->db->error.'|'.$s);

                // For all LANG file
                $s = sprintf('UPDATE `files`
                 SET
                   `en_revision` = "%s"

                 WHERE
                   `lang` != "%s" AND
                   `path`  = "%s" AND
                   `name`  = "%s"
               ', $info['rev'], $FileLang, $FilePath, $FileName);
                $this->db->query($s) or die($this->db->error.'|'.$s);


            } else {

                $path    = DOC_EDITOR_CVS_PATH.$FileLang.$FilePath.$FileName;
                $content = file_get_contents($path);
                $info    = $this->getInfoFromContent($content);
                $size    = intval(filesize($path) / 1024);
                $date    = filemtime($path);


                $pathEN    = DOC_EDITOR_CVS_PATH.'en'.$FilePath.$FileName;
                $sizeEN    = intval(filesize($pathEN) / 1024);
                $dateEN    = filemtime($pathEN);

                $size_diff = $sizeEN - $size;
                $date_diff = (intval((time() - $dateEN) / 86400)) - (intval((time() - $date) / 86400));

                $s = sprintf('UPDATE `files`
                 SET
                   `revision`   = "%s",
                   `reviewed`   = "%s",
                   `size`       = "%s",
                   `mdate`      = "%s",
                   `maintainer` = "%s",
                   `status`     = "%s",
                   `size_diff`  = "%s",
                   `mdate_diff` = "%s"

                 WHERE
                   `lang` = "%s" AND
                   `path` = "%s" AND
                   `name` = "%s"
               ',$info['en-rev'], $info['reviewed'], $size, $date, $info['maintainer'], $info['status'], $size_diff, $date_diff, $FileLang, $FilePath, $FileName);
                $this->db->query($s) or die($this->db->error.'|'.$s);
            }

            //$this->debug('in updateRev() ; DB query : '.$s);

        }
    }

    /**
     * Remove the mark "needCommit" into DB for a set of files.
     *
     * @param $nodes An array of files.
     */
    function removeNeedCommit($nodes) {

        for ($i = 0; $i < count($nodes); $i++ ) {

            $FileLang = $nodes[$i]['lang'];
            $FilePath = $nodes[$i]['path'];
            $FileName = $nodes[$i]['name'];

            $s = sprintf('DELETE FROM `pendingCommit`
              WHERE
                 `lang` = "%s" AND
                 `path` = "%s" AND
                 `name` = "%s"
            ', $FileLang, $FilePath, $FileName);

            $this->db->query($s) or die($this->db->error.'|'.$s);

            //$this->debug('in removeNeedCommit() ; DB query : '.$s);

        }

    }

    /**
     * Print debug information into a file (.debug) into data folder.
     *
     * @param $mess The debug message.
     */
    function debug($mess) {

        $mess = '['.date("d/m:Y H:i:s").'] by '.$this->cvsLogin.' : '.$mess."\n";

        $fp = fopen(DOC_EDITOR_CVS_PATH.'../.debug', 'a+');
        fwrite($fp, $mess);
        fclose($fp);

    }

    /**
     * Add (or not) a log message to the DB.
     *
     * @param $logMessage The log message to be added if it don't exist yet.
     * @return Nothing.
     */
    function manageLogMessage($logMessage) {

        $s = sprintf('SELECT id FROM `commitMessage` WHERE `text`="%s" AND `userID`="%s"', $this->db->real_escape_string($logMessage), $this->userID);
        $r = $this->db->query($s) or die('Error: '.$this->db->error.'|'.$s);
        $nb = $r->num_rows;

        if ($nb == 0 ) {
            $s = sprintf('INSERT INTO `commitMessage` (`text`,`userID`) VALUES ("%s", "%s")', $this->db->real_escape_string($logMessage), $this->userID);
            $this->db->query($s) or die('Error: '.$this->db->error.'|'.$s);
        }

    }

    /**
     * Get all files from the local copy.
     *
     * @param $node The start folder to retrieve files/folders from.
     * @param $search The search value.
     */
    function getAllFiles($node, $search='') {

        // Get Files Need Commit
        $ModifiedFiles = $this->getModifiedFiles();

        if( $search == '' ) {

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

        } else {

            $s = sprintf('SELECT `lang`, `path`, `name` FROM `files` WHERE (`lang`="%s" OR `lang`=\'en\') AND `name` LIKE \'%%%s%%\' ORDER BY `lang`, `path`, `name`', $this->cvsLang, $search);
            $r = $this->db->query($s) or die($this->db->error.'|'.$s);
            while ($a = $r->fetch_object()) {

                $t       = explode('.',$a->name);
                $ext     = $t[count($t)-1];
                $nodes[] = array('text'=>$a->lang.$a->path.$a->name, 'id'=>'//'.$a->lang.$a->path.$a->name, 'leaf'=>true, 'cls'=>'file', 'extension'=>$ext, 'type'=>'file', 'from'=>'search');

            }

        }
        return $nodes;
    }

    /**
     * Save an existing log message into DB.
     *
     * @param $messID The ID of the log message.
     * @param $mess The message.
     */
    function saveLogMessage($messID, $mess)
    {
        $s = sprintf('UPDATE `commitMessage` SET `text`="%s" WHERE `id`="%s"', $this->db->real_escape_string($mess), $messID);
        $this->db->query($s) or die('Error: '.$this->db->error.'|'.$s);
    }

    /**
     * Delete a log message into DB.
     *
     * @param $messID The ID of the log message.
     */
    function deleteLogMessage($messID)
    {
        $s = sprintf('DELETE FROM `commitMessage` WHERE `id`="%s"', $messID);
        $this->db->query($s) or die('Error: '.$this->db->error.'|'.$s);
    }

    /**
     * Get all files for a given php's extension.
     *
     * @param $ExtName The name of the extension.
     * @return An array of files
     */
    function getAllFilesAboutExtension($ExtName) {

        $s = sprintf('SELECT `path`, `name` FROM `files` WHERE `path` LIKE \'/reference/%s/%%\' AND `lang`="%s" ORDER BY `path`, `name`',$ExtName, $this->cvsLang);
        $r = $this->db->query($s) or die('Error: '.$this->db->error.'|'.$s);
        $node = array();

        $i=0;
        while ($a = $r->fetch_object()) {

            $node[$i]['path'] = $a->path;
            $node[$i]['name'] = $a->name;

            $i++;
        }

        return $node;

    }

    /**
     * All we must do after a patch have been accepted.
     *
     * @param $PatchUniqID ID of the accepted patch.
     */
    function afterPatchAccept($PatchUniqID) {

        $s = sprintf('SELECT * FROM `pendingPatch` WHERE `uniqID` = "%s"', $PatchUniqID);
        $r = $this->db->query($s) or die('Error: '.$this->db->error.'|'.$s);
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
        $s = sprintf('DELETE FROM `pendingPatch` WHERE `id` = "%s"', $a->id);
        $this->db->query($s) or die('Error: '.$this->db->error.'|'.$s);

    }

    /**
     * All we must do after a patch have been rejected.
     *
     * @param $PatchUniqID ID of the accepted patch.
     */
    function afterPatchReject($PatchUniqID) {

        $s = sprintf('SELECT * FROM `pendingPatch` WHERE `uniqID` = "%s"', $PatchUniqID);
        $r = $this->db->query($s) or die('Error: '.$this->db->error.'|'.$s);
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
        $s = sprintf('DELETE FROM `pendingPatch` WHERE `id` = "%s"', $a->id);
        $this->db->query($s) or die('Error: '.$this->db->error.'|'.$s);

    }

    /**
     * Search a file regarding his file's ID.
     *
     * @TODO Better description here...
     * @param $lang The lang of the searched file.
     * @param $fileID The ID of the searched file.
     */
    function searchXmlID($lang, $fileID)
    {
        $s = sprintf('SELECT `lang`, `path`, `name` FROM `files` WHERE `lang` = "%s" AND `xmlid` LIKE "%' . $fileID . '%"', $lang);
        $r = $this->db->query($s) or die('Error: '.$this->db->error.'|'.$s);
        return $r->fetch_object();
    }

    /**
     * Get the last update datetime
     *
     * @return The last update datetime or "in_progress" if the update is in progress
     */
    function getLastUpdate()
    {
        // Test is there is an update in progress
        $lock_update = new LockFile('lock_update_repository');
        $lock_apply = new LockFile('lock_apply_tools');

        if( $lock_update->isLocked() || $lock_apply->isLocked() ) { return array('lastupdate'=>'in_progress', 'by'=>'-'); }
        else {

            $s = 'SELECT `lastupdate`, `by` FROM `project` WHERE `name`="php"';
            $r = $this->db->query($s);
            $a = $r->fetch_assoc();

            return $a;

        }


    } // get_last_update

    /**
     * Set the last update datetime into DB
     */
    function setLastUpdate()
    {

        $s = 'SELECT `lastupdate`, `by` FROM `project` WHERE `name`="php"';
        $r = $this->db->query($s) or die('Error: '.$this->db->error.'|'.$s);
        $nb = $r->num_rows;

        if( $nb == 0 ) {
            $s = sprintf('INSERT INTO `project` (`name`, `lastupdate`, `by`) VALUES (\'php\', now(), "%s")', ( ( isset($this->cvsLogin ) ) ? $this->cvsLogin : '-' ));
        } else {
            $s = sprintf('UPDATE `project` SET `lastupdate`=now(), `by`="%s" WHERE `name`=\'php\'', ( ( isset($this->cvsLogin ) ) ? $this->cvsLogin : '-' ));
        }
        $r = $this->db->query($s) or die('Error: '.$this->db->error.'|'.$s);

        return;

    }

    /**
     * Mark a file as need delete.
     *
     * @param $FilePath
     * @param $FileName
     * @return 
     */
    function markAsNeedDelete($FilePath, $FileName)
    {

        $date = date("Y-m-d H:i:s");

        $s = sprintf('INSERT INTO `pendingCommit` (`lang`, `path`, `name`, `revision`, `en_revision`, `reviewed`, `maintainer`, `modified_by`, `date`, `type`) VALUES ("%s","%s", "%s", "-", "-", "-", "-", "%s", "%s", "delete")', $this->cvsLang, $FilePath, $FileName, $this->cvsLogin, $date);
        $this->db->query($s) or die('Error: '.$this->db->error.'|'.$s);

        return Array('id'=>$this->db->insert_id, 'by'=>$this->cvsLogin, 'date'=>$date);

    }

    /**
     * Save buildLog status.
     *
     * @param $lang The lang checked
     * @param $status The status of the build. 0 if the build is broken, 1 otherwise.
     */
    function buildLog($lang, $status)
    {

        $s = sprintf('INSERT INTO `buildLog` (`project`, `lang`, `status`, `date`) VALUES ("php","%s", "%s", now())', $lang, $status);
        $this->db->query($s) or die('Error: '.$this->db->error.'|'.$s);

        return;

    }

    /**
     * Get buildLog data.
     *
     */
    function getBuildStatusData()
    {

        $node = array();

        $s = 'SELECT `id`, `lang`, `status`, `date` FROM `buildLog`';

        $r    = $this->db->query($s) or die('Error: '.$this->db->error.'|'.$s);
        $nb   = $r->num_rows;

        while ($a = $r->fetch_assoc()) {
            $node[] = $a;
        }

        return array('nb' => $nb, 'node' => $node);

    }    

} // End of class
