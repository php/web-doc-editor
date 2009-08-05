<?php

require_once dirname(__FILE__) . '/AccountManager.php';
require_once dirname(__FILE__) . '/DBConnection.php';

class TranslationStatistic
{
    private static $instance;

    public static function getInstance()
    {
        if (!isset(self::$instance)) {
            $c = __CLASS__;
            self::$instance = new $c;
        }
        return self::$instance;
    }

    private function __construct()
    {
    }

    /**
     * Get number/size of all files.
     *
     * @return An indexed array.
     */
    public function getFileCount()
    {
        $s = 'SELECT
                    COUNT(*) AS total,
                    SUM(`size`) AS total_size
                FROM
                    `files`
                WHERE
                    `lang`="' . AccountManager::getInstance()->vcsLang . '"
            ';
        $res = DBConnection::getInstance()->query($s);

        $r = $res->fetch_array();
        $result = array($r['total'], $r['total_size']);
        return $result;
    }

    /**
     * Get number of translated files.
     *
     * @return Number of translated files.
     */
    public function getTransFileCount()
    {
        $s = 'SELECT
                COUNT(name) AS total,
                SUM(size)   AS total_size
            FROM
                files
            WHERE
                lang="' . AccountManager::getInstance()->vcsLang . '"
            AND
                revision = en_revision';
        $res = DBConnection::getInstance()->query($s);

        $r = $res->fetch_array();
        $result = array($r['total'], $r['total_size']);
        return $result;
    }

    /**
     * Get statistic about critical files which need to be updated.
     *
     * @return An associated array (total=>nb files, total_size=>size of this files).
     */
    public function getCriticalFileCount()
    {
        $s = 'SELECT
                COUNT(`name`) AS total,
                SUM(`size`) AS total_size
            FROM
                `files`
            WHERE
                `lang`="' . AccountManager::getInstance()->vcsLang . '"
            AND
                ( `en_revision` - `revision` >= 10  OR
                ( `en_revision` != `revision`  AND
                    ( `size_diff` >= 3 OR `mdate_diff` <= -30 )
                ))
            AND
                `size` is not NULL';
        $result = DBCOnnection::getInstance()->query($s);

        $r = $result->fetch_array();
        $result = array($r['total'], $r['total_size']);
        return $result;
    }

    /**
     * Get statistic about old files which need to be uptadeted from LANG tree.
     *
     * @return An associated array (total=>nb files, total_size=>size of this files).
     */
    public function getOldFileCount()
    {
        $s = 'SELECT
                COUNT(`name`) AS total,
                SUM(`size`)   AS total_size
            FROM
                `files`
            WHERE
                `lang`="' . AccountManager::getInstance()->vcsLang . '"
            AND
                `en_revision` != `revision`
            AND
                `en_revision` - `revision` < 10
            AND
                `size_diff` < 3
            AND
                `mdate_diff` > -30
            AND
                `size` is not NULL';
        $result = DBConnection::getInstance()->query($s);

        $r = $result->fetch_array();
        $result = array($r['total'], $r['total_size']);
        return $result;
    }

    /**
     * Get statistic about files which need to be translated.
     *
     * @return An associated array (total=>nb files, size=>size of this files).
     */
    public function getNoTransFileCount()
    {
        $s = 'SELECT
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
                a.lang="' . AccountManager::getInstance()->vcsLang . '"
            AND
                b.lang="en"
            AND
                a.revision is NULL
            AND
                a.size is NULL';
        $result = DBConnection::getInstance()->query($s);

        if ($result->num_rows) {
            $r = $result->fetch_array();
            return array($r['total'], $r['size']);
        } else {
            return array(0,0);
        }
    }

    /**
     * Get count of missed files which need to be added to LANG tree.
     *
     * @return An array of missed files (size=>size of the file, file=>name of the file).
     */
    public function getMissedFileCount()
    { // TODO merge with getNoTransFileCount
        $s = 'SELECT
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
                a.lang="' . AccountManager::getInstance()->vcsLang . '"
            AND
                b.lang="en"
            AND
                a.revision is NULL
            AND
                a.size is NULL';
        $result = DBConnection::getInstance()->query($s);

        if ($result->num_rows == 0) {
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
     * Get count of files which haven't revcheck's tags.
     *
     * @return An associated array (total=>nb files, size=>size of this files).
     */
    public function getNoTagFileCount()
    {
        $s = 'SELECT
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
                a.lang="' . AccountManager::getInstance()->vcsLang . '"
            AND
                b.lang="en"
            AND
                a.revision is NULL
            AND
                a.size is not NULL';
        $result = DBConnection::getInstance()->query($s);

        $r = $result->fetch_array();
        $result = array($r['total'], $r['size']);
        return $result;
    }

    /**
     * Get summary of translation statistic.
     *
     * @return An indexed array containing summary of statistic
     */
    public function getSummary()
    {
        $nbFiles = $this->getFileCount();

        $uptodate = $this->getTransFileCount();
        $old      = $this->getOldFileCount();
        $critical = $this->getCriticalFileCount();

        $missFiles = $this->getNoTransFileCount();

        $withoutRevTag = $this->getNoTagFileCount();

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

}

?>
