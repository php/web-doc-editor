<?php

require_once dirname(__FILE__) . '/LockFile.php';
require_once dirname(__FILE__) . '/DBConnection.php';
require_once dirname(__FILE__) . '/AccountManager.php';
require_once dirname(__FILE__) . '/utility.php';

class RepositoryFetcher
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
     * Get the last update datetime
     *
     * @return The last update datetime or "in_progress" if the update is in progress
     */
    public function getLastUpdate()
    {
        // Test is there is an update in progress
        $lock_update = new LockFile('lock_update_repository');
        $lock_apply  = new LockFile('lock_apply_tools');

        if ($lock_update->isLocked() || $lock_apply->isLocked()) {
            return array('lastupdate' => 'in_progress', 'by' => '-');
        } else {
            $s = 'SELECT `lastupdate`, `by` FROM `project` WHERE `name`="php"';
            $r = DBConnection::getInstance()->query($s);
            $a = $r->fetch_assoc();

            return $a;
        }
    }

    /**
     * Get all modified files with user lang or en.
     *
     * @return An associated array containing informations about modified files.
     */
    public function getModifies()
    {
        $s = sprintf(
            'SELECT `id`, `lang`, `path`, `name`, `revision`,
            `en_revision`, `maintainer`, `reviewed` FROM `pendingCommit` WHERE
            `lang`="%s" OR `lang`="en"',
            AccountManager::getInstance()->vcsLang
        );
        $r = DBConnection::getInstance()->query($s);

        $infos = array();
        while ($a = $r->fetch_assoc()) {
            $infos[$a['lang'].$a['path'].$a['name']] = $a;
        }

        return $infos;
    }

    /**
     * Get modified files by id.
     *
     * @param $id Can be a single id or an array of id
     * @return An associated array containing informations about modified files specified by param id.
     */
    public function getModifiesById($id)
    {
        $ids = is_array($id) ? implode($id, ',') : $id;

        $s = sprintf(
            'SELECT * FROM `pendingCommit` WHERE
            (`lang`="%s" OR `lang`="en") AND `id` IN (%s)',
            AccountManager::getInstance()->vcsLang, $ids
        );
        $r = DBConnection::getInstance()->query($s);

        $infos = array();
        while ($a = $r->fetch_assoc()) {
            $infos[] = $a;
        }

        return $infos;
    }

    /**
     * Get all files witch need to be updated.
     *
     * @return An associated array containing informations about files which need to be updated.
     */
    public function getPendingUpdate()
    {
        $vcsLang = AccountManager::getInstance()->vcsLang;

        $m = $this->getModifies();

        $s = sprintf(
            'SELECT * FROM `files` WHERE `lang` = "%s" AND `revision` != `en_revision`',
            $vcsLang
        );
        $r = DBConnection::getInstance()->query($s);

        $node = array();
        while ($a = $r->fetch_object()) {

            if (   isset($m[$vcsLang.$a->path.$a->name])
                || isset($m['en'    .$a->path.$a->name])
            ) {
                if (isset($m['en'.$a->path.$a->name])) {
                    $new_en_revision = $m['en'.$a->path.$a->name]['revision'];
                    $new_revision    = $a->revision;
                    $new_maintainer  = $a->maintainer;
                }

                if (isset($m[$vcsLang.$a->path.$a->name])) {
                    $new_en_revision = $a->en_revision;
                    $new_revision    = $m[$vcsLang.$a->path.$a->name]['en_revision'];
                    $new_maintainer  = $m[$vcsLang.$a->path.$a->name]['maintainer'];
                }

                $node[] = array(
                    "id"             => $a->id,
                    "path"           => $a->path,
                    "name"           => $a->name,
                    "revision"       => $new_revision,
                    "en_revision"    => $new_en_revision,
                    "maintainer"     => $new_maintainer,
                    "needCommitEN"   => (isset($m['en'.$a->path.$a->name])) ? true : false,
                    "needCommitLang" => (isset($m[$vcsLang.$a->path.$a->name])) ? true : false,
                    "isCritical"     => false
                );
            } else {
                $node[] = array(
                    "id"              => $a->id,
                    "path"            => $a->path,
                    "name"            => $a->name,
                    "revision"        => $a->revision,
                    "en_revision"     => $a->en_revision,
                    "maintainer"      => $a->maintainer,
                    "needCommitEN"    => false,
                    "needCommitLang"  => false,
                    "isCritical"      => ( ($a->en_revision - $a->revision >= 10) || $a->size_diff >= 3 || $a->mdate_diff <= -30 ) ? true : false
                );
            }
        }
        return array('nb' => $r->num_rows, 'node' => $node);
    }

    /**
     * Get all files witch need to be reviewed.
     *
     * @return An associated array containing informations about files which need to be reviewed.
     */
    public function getPendingReview()
    {
        $vcsLang = AccountManager::getInstance()->vcsLang;

        $m = $this->getModifies();
        $s = sprintf(
            'SELECT * FROM `files` WHERE `lang` = "%s" AND reviewed != \'yes\'',
            $vcsLang
        );
        $r = DBConnection::getInstance()->query($s);

        $node = array();
        while ($a = $r->fetch_object()) {

            $temp = array(
                "id"   => $a->id,
                "path" => $a->path,
                "name" => $a->name,
            );

            if (   isset($m[$vcsLang.$a->path.$a->name])
                || isset($m['en'    .$a->path.$a->name])
            ) {
                if (isset($m['en'.$a->path.$a->name])) {
                    $new_reviewed   = $a->reviewed;
                    $new_maintainer = $a->maintainer;
                }

                if (isset($m[$vcsLang.$a->path.$a->name])) {
                    $new_reviewed   = $m[$vcsLang.$a->path.$a->name]['reviewed'];
                    $new_maintainer = $m[$vcsLang.$a->path.$a->name]['maintainer'];
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
        return array('nb' => $r->num_rows, 'node' => $node);
    }

    /**
     * Get all files which are not in EN tree.
     *
     * @return An associated array containing informations about files which are not in EN tree
     */
    public function getNotInEn()
    {
        $vcsLang = AccountManager::getInstance()->vcsLang;

        $m = $this->getModifies();
        $s = sprintf('SELECT `id`, `path`, `name` FROM `files` WHERE `lang`="%s" AND `status`=\'NotInEN\'', $vcsLang);
        $r = DBConnection::getInstance()->query($s);

        $node = array();
        while ($a = $r->fetch_object()) {
            $node[] = array(
                "id"         => $a->id,
                "path"       => $a->path,
                "name"       => $a->name,
                "needcommit" => isset($m[$vcsLang.$a->path.$a->name]) ? true : false
            );
        }

        return array('nb' => $r->num_rows, 'node' => $node);
    }

    /**
     * Get all files which need to be translated
     *
     * @return An associated array containing informations about files which need to be translated
     */
    public function getPendingTranslate()
    {
        $vcsLang = AccountManager::getInstance()->vcsLang;

        $m = $this->getModifies();
        $s = sprintf('SELECT `id`, `path`, `name` FROM `files` WHERE `lang`="%s" AND `status` is NULL AND `revision` is NULL', $vcsLang);
        $r = DBConnection::getInstance()->query($s);

        $node = array();
        while ($a = $r->fetch_object()) {
            $node[] = array(
                "id"         => $a->id,
                "path"       => $a->path,
                "name"       => $a->name,
                "needcommit" => isset($m[$vcsLang.$a->path.$a->name]) ? true : false
            );
        }

        return array('nb' => $r->num_rows, 'node' => $node);
    }


    /**
     * Get all pending patch.
     *
     * @return An associated array containing informations about pending patch.
     */
    public function getPendingPatch()
    {
        $s = sprintf(
            'SELECT `id`, CONCAT(`lang`, `path`) AS `path`, `name`, `posted_by` AS \'by\', `uniqID`, `date` FROM `pendingPatch` WHERE `lang`="%s" OR `lang`=\'en\'',
            AccountManager::getInstance()->vcsLang
        );
        $r = DBConnection::getInstance()->query($s);

        $node = array();
        while ($row = $r->fetch_assoc()) {
            $node[] = $row;
        }

        return array('nb' => $r->num_rows, 'node' => $node);
    }

    /**
     * Get all files pending for commit.
     *
     * @return An associated array containing informations about files pending for commit.
     */
    public function getPendingCommit()
    {
        $s = sprintf(
            'SELECT * FROM `pendingCommit` WHERE `lang`="%s" OR `lang`=\'en\'',
            AccountManager::getInstance()->vcsLang
        );
        $r = DBConnection::getInstance()->query($s);

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

        return array('nb' => $r->num_rows, 'node' => $node);
    }

    /**
     * Get all files for a given php's extension.
     *
     * @param $ext The name of the extension.
     * @return An array of files
     */
    public function getFilesByExtension($ext)
    {
        $s = sprintf(
            'SELECT `path`, `name` FROM `files` WHERE `path`
             LIKE \'/reference/%s/%%\' AND `lang`="%s" ORDER BY `path`, `name`',
            $ext, AccountManager::getInstance()->vcsLang
        );
        $r = DBConnection::getInstance()->query($s);

        $node = array(); $i=0;
        while ($a = $r->fetch_object()) {
            $node[$i]['path'] = $a->path;
            $node[$i]['name'] = $a->name;

            $i++;
        }
        return $node;
    }

    /**
     * Get a file regarding its xml ID.
     *
     * @param $lang The lang of the searched file.
     * @param $id The ID of the searched file.
     * @return file info include lang, path, name
     */
    public function getFileByXmlID($lang, $id)
    {
        $s = "SELECT `lang`, `path`, `name` FROM `files`
              WHERE `lang` = '$lang' AND `xmlid` LIKE '%$id%'";
        $r = DBConnection::getInstance()->query($s);
        return $r->fetch_object();
    }

    /**
     * Perform searching on filepath under the repository tree
     *
     * @param $key Keyword for search
     * @return Array of file info (TODO: remove extjs dependent info)
     */
    public function getFileByKeyword($key)
    {
        $s = sprintf(
            'SELECT `lang`, `path`, `name` FROM `files` WHERE (`lang`="%s" OR `lang`=\'en\')
             AND `name` LIKE \'%%%s%%\' ORDER BY `lang`, `path`, `name`',
            AccountManager::getInstance()->vcsLang, $key
        );
        $r = DBConnection::getInstance()->query($s);

        $files = array();
        while ($a = $r->fetch_object()) {
            $ext = array_pop(explode('.', $a->name));
            $files[] = array(
                'text'      => $a->lang.$a->path.$a->name,
                'id'        => '/'.$a->lang.$a->path.$a->name,
                'leaf'      => true,
                'cls'       => 'file',
                'extension' => $ext,
                'type'      => 'file',
                'from'      => 'search'
            );
        }
        return $files;
    }

    /**
     * Get all files from the local copy.
     *
     * @param $dir The root folder to retrieve files/folders from.
     * @return Array of file info (TODO: remove extjs dependent info)
     */
    public function getFilesByDirectory($dir)
    {
        // Security
        $dir = str_replace('..', '', $dir);
        if (substr($dir, -1) != '/') $dir .= '/';

        $m = $this->getModifies();

        $d = dir(DOC_EDITOR_VCS_PATH.$dir);

        $files = array();
        while ($f = $d->read())
        {
            // We display only 'en' and 'LANG' tree
            if (   $dir == '/'
                && $f != 'en'
                && $f != AccountManager::getInstance()->vcsLang
            ) {
                continue; // skip non-en and non-user-lang
            }

            if (   $f == '.'
                || $f == '..'
                || substr($f, 0, 1) == '.'      // skip hidden files
                || substr($f, -4)   == '.new'   // skip pendingCommit files
                || substr($f, -6)   == '.patch' // skip pendingPatch files
                || $f == 'CVS'
            ) continue;

            if (is_dir(DOC_EDITOR_VCS_PATH.$dir.$f)) {

                $files[] = array(
                    'text' => $f,
                    'id'   => $dir.$f,
                    'cls'  => 'folder',
                    'type' => 'folder'
                );

            } else {
/* TODO check modifiedfiles key
                if (isset($m[substr($dir, 2, (strlen($node)-1)).'/'.$f])) {
*/
                if (isset($m[$dir.$f])) {
                    $cls = 'file modified';
                } else {
                    $cls = 'file';
                }

                $ext = array_pop(explode('.',$f));
                $files[] = array(
                    'text'      => $f,
                    'id'        => $dir.$f,
                    'leaf'      => true,
                    'cls'       => $cls,
                    'extension' => $ext,
                    'type'      => 'file'
                );
            }
        }
        $d->close();

        return $files;
    }
}

?>
