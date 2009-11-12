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

} // End of class
