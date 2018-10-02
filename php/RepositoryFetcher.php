<?php

require_once dirname(__FILE__) . '/LockFile.php';
require_once dirname(__FILE__) . '/DBConnection.php';
require_once dirname(__FILE__) . '/AccountManager.php';
require_once dirname(__FILE__) . '/utility.php';

class RepositoryFetcher
{
    private static $instance;

    private $conn;

    /**
     * @static
     * @return RepositoryFetcher
     */
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
        $this->conn = DBConnection::getInstance();
    }


    /**
     * Get lst info dateTime about this apps
     *
     * @return The date/time of the last Info
     */
    public function getLastInfoDate()
    {
        $am      = AccountManager::getInstance();
        $project = $am->project;

        $s = 'SELECT
                `date`
             FROM
                `staticValue`
             WHERE
                `project` = "%s" AND
                `type`="info"
             ORDER BY `date` DESC
             LIMIT 0, 1';
        $params = array($am->project);

        $r = $this->conn->query($s, $params);

        $a = $r->fetch_assoc();

        return $a['date'];
    }

    /**
     * Get infos about this apps
     *
     * @return Array
     */
    public function getInfos($start, $limit)
    {
        $am      = AccountManager::getInstance();
        $project = $am->project;

        $infos = array();

        $s = 'SELECT
                count(*) as total
             FROM
                `staticValue`
             WHERE
                `project` = "%s" AND
                `type`="info"';
        $params = array($am->project);

        $r = $this->conn->query($s, $params);

        $a = $r->fetch_assoc();
        $infos['total'] = $a['total'];

        $s = 'SELECT
                `field`, `value`, `date`
             FROM
                `staticValue`
             WHERE
                `project` = "%s" AND
                `type`="info"
             ORDER BY `date` DESC
             LIMIT %d, %d';
        $params = array($am->project, (int)$start, (int)$limit);

        $r = $this->conn->query($s, $params);

        $i=0;
        while ($a = $r->fetch_assoc()) {
            $infos['value'][$i]['id'] = $i;
            $infos['value'][$i]['field'] = $a['field'];
            $infos['value'][$i]['value'] = json_decode($a['value']);
            $infos['value'][$i]['date']  = $a['date'];
            $infos['value'][$i]['elapsedTime']  = elapsedTime($a['date'], @date("Y-m-d H:i:s"));
            $i++;
        }

        return $infos;
    }

    /**
     * Get usage Informations
     *
     * @return Array
     */
    public function getUsageInfos($year)
    {
        $am      = AccountManager::getInstance();
        $project = $am->project;

        $infos = array();

        $s = 'SELECT
                type,
                subType,
                value,
                MONTH(`yearMonth`) as month
             FROM
                `usageStatistics`
             WHERE
                `project` = "%s" AND
                (
                    ( `type`="nbCon" AND `subType`="Total" )
                    OR
                    ( `type`="nbCreatedFiles" OR
                      `type`="nbDeletedFiles" OR
                      `type`="nbUpdatedFiles" )
                ) AND
                YEAR(`yearMonth`) = %s
                ';
        $params = array(
            $am->project,
            $year
        );

        $r = $this->conn->query($s, $params);

        while ($a = $r->fetch_object()) {

            // Init
            if( !isset($infos[$a->month]) ){
                $infos[$a->month]['nbConTotal'] = 0;
                $infos[$a->month]['nbCommitTotal'] = 0;
            }

            if( $a->type == 'nbCon' && $a->subType == 'Total' ) {
                $infos[$a->month]['nbConTotal'] = $a->value;
            } else {
                $infos[$a->month]['nbCommitTotal'] += $a->value;
            }
        }

        $return = array();
        //
        for( $i=0; $i < 12; $i++ ) {

            $return[$i]['id'] = $i+1;
            $return[$i]['month'] = $i+1;

            // nbConTotal
            if( isset($infos[$i+1]['nbConTotal']) ) {
                $return[$i]['nbConTotal'] = (int) $infos[$i+1]['nbConTotal'];

            } else {
                $return[$i]['nbConTotal'] = 0;
            }

            // nbCommitTotal
            if( isset($infos[$i+1]['nbCommitTotal']) ) {
                $return[$i]['nbCommitTotal'] = (int) $infos[$i+1]['nbCommitTotal'];

            } else {
                $return[$i]['nbCommitTotal'] = 0;
            }

        }

        return $return;
    }

    public function getSkeletonsNames()
    {
        $am      = AccountManager::getInstance();
        $appConf = $am->appConf;
        $project = $am->project;

        $return = array();

        if( !isset($appConf[$project]['skeletons.folder']) ) {
            return $return;
        }

        $dir = realpath($appConf[$project]['skeletons.folder']);
        $d = dir($dir);
        while (false !== ($entry = $d->read())) {
           if( is_file($dir."/".$entry) && substr($entry, 0, 1) != "." ) {
               $return[] = Array("name" => $entry, "path" => $dir."/".$entry);
           }
        }
        $d->close();

        sort($return);
        return $return;
    }

    /**
     * Get all modified files with user lang or en.
     *
     * @return An associated array containing informations about modified files.
     */
    public function getModifies()
    {
        $am = AccountManager::getInstance();

        $s = 'SELECT
                `work`.`lang` as lang,
                `work`.`path` as path,
                `work`.`name` as name,
                `work`.`en_revision` as en_revision,
                `work`.`maintainer` as maintainer,

                `work`.`reviewed` as reviewed,
                `work`.`reviewed_maintainer` as reviewed_maintainer,

                `users`.`vcs_login` as user,
                `users`.`anonymousIdent` as anonymousIdent
             FROM
                `work`,
                `users`
             WHERE
                `users`.`userID` = `work`.`userID` AND
                `work`.`project` = "%s" AND
                ( `work`.`lang`="%s" OR `work`.`lang`="en" ) ';
        $params = array(
            $am->project,
            $am->vcsLang
        );

        $r = $this->conn->query($s, $params);

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
        $am = AccountManager::getInstance();
        $infos = array();

        $ids = is_array($id) ? implode(array_map('intval', $id), ',') : (int)$id;

        if( empty( $ids ) ) {
            return $infos;
        }

        $s = 'SELECT
                *
             FROM
                `work`
             WHERE
                `project` = "%s" AND
               (`lang`="%s" OR `lang`="en" OR `lang`="doc-base") AND `id` IN (%s)';

        $params = array(
            $am->project,
            $am->vcsLang,
            $ids
        );

        $r = $this->conn->query($s, $params);

        while ($a = $r->fetch_assoc()) {
            $infos[] = $a;
        }

        return $infos;
    }


    public function getNbPendingUpdate()
    {
        $am = AccountManager::getInstance();

        $vcsLang = $am->vcsLang;
        $project = $am->project;

        $s = 'SELECT
                count(*) as total
             FROM
                `files`
             WHERE
                `project`   = "%s" AND
                `lang`      = "%s"  AND
                `revision` != `en_revision` AND
                `status` is not null';
        $params = array(
            $project,
            $vcsLang
        );
        $r = $this->conn->query($s, $params);
        $a = $r->fetch_object();

        return ( $a->total > $am->userConf->needUpdate->nbDisplay && $am->userConf->needUpdate->nbDisplay != 0 ) ? $am->userConf->needUpdate->nbDisplay : $a->total;

    }
    /**
     * Get all files witch need to be updated.
     *
     * @return An associated array containing informations about files which need to be updated.
     */
    public function getPendingUpdate()
    {
        $am = AccountManager::getInstance();

        $vcsLang = $am->vcsLang;
        $project = $am->project;

        $limit = ( $am->userConf->needUpdate->nbDisplay ) ? 'LIMIT '.(int)$am->userConf->needUpdate->nbDisplay : '';

        $m = $this->getModifies();

        $s = 'SELECT
                *
             FROM
                `files`
             WHERE
                `project`="%s" AND
                `lang` = "%s" AND
                `revision` != `en_revision` AND
                `status` is not NULL
                %s';
        $params = array(
            $project,
            $vcsLang,
            $limit
        );
        $r = $this->conn->query($s, $params);

        $node = array();
        while ($a = $r->fetch_object()) {

            if (   isset($m[$vcsLang.$a->path.$a->name])
            ) {

                $isModifiedLang = ( isset($m[$vcsLang.$a->path.$a->name]) ) ? $m[$vcsLang.$a->path.$a->name] : false ;

                if ( $isModifiedLang ) {
                    $new_en_revision   = $a->en_revision;
                    $new_revision      = $isModifiedLang['en_revision'];
                    $original_revision = $a->revision;
                    $new_maintainer    = $isModifiedLang['maintainer'];
                }

                $node[] = array(
                    "id"                => $a->id,
                    "path"              => $a->path,
                    "name"              => $a->name,
                    "revision"          => $new_revision,
                    "original_revision" => $original_revision,
                    "en_revision"       => $new_en_revision,
                    "maintainer"        => $new_maintainer,
                    "fileModified"  => ( $isModifiedLang ) ? '{"user":"'.$isModifiedLang["user"].'", "anonymousIdent":"'.$isModifiedLang["anonymousIdent"].'"}' : false
                );
            } else {
                $node[] = array(
                    "id"                => $a->id,
                    "path"              => $a->path,
                    "name"              => $a->name,
                    "revision"          => $a->revision,
                    "original_revision" => NULL,
                    "en_revision"       => $a->en_revision,
                    "maintainer"        => $a->maintainer,
                    "fileModified"  => false
                );
            }
        }
        return array('nb' => $r->num_rows, 'node' => $node);
    }

    public function getNbPendingReview()
    {
        $am = AccountManager::getInstance();

        $vcsLang = $am->vcsLang;
        $project = $am->project;

        $m = $this->getModifies();
        $s = 'SELECT
                count(*) as total
             FROM
                `files`
             WHERE
                `project`="%s" AND
                `lang` = "%s" AND
                reviewed != \'yes\'';
        $params = array(
            $project,
            $vcsLang
        );
        $r = $this->conn->query($s, $params);
        $a = $r->fetch_object();

        return ( $a->total > $am->userConf->reviewed->nbDisplay && $am->userConf->reviewed->nbDisplay != 0 ) ? $am->userConf->reviewed->nbDisplay : $a->total;
    }
    /**
     * Get all files witch need to be reviewed.
     *
     * @return An associated array containing informations about files which need to be reviewed.
     */
    public function getPendingReview()
    {
        $am = AccountManager::getInstance();

        $vcsLang = $am->vcsLang;
        $project = $am->project;

        $limit = ( $am->userConf->reviewed->nbDisplay ) ? 'LIMIT '.(int)$am->userConf->reviewed->nbDisplay : '';

        $m = $this->getModifies();
        $s = 'SELECT
                *
             FROM
                `files`
             WHERE
                `project`="%s" AND
                `lang` = "%s" AND
                reviewed != \'yes\'
             ORDER BY
                `path`,
                `name`
                %s';
        $params = array(
            $project,
            $vcsLang,
            $limit
        );
        $r = $this->conn->query($s, $params);

        $node = array();
        while ($a = $r->fetch_object()) {


            $isModifiedLang = ( isset($m[$vcsLang.$a->path.$a->name]) ) ? $m[$vcsLang.$a->path.$a->name] : false ;

            $temp = array(
                "id"   => $a->id,
                "path" => $a->path,
                "name" => $a->name,
            );

            if ( $isModifiedLang )
            {
                $new_reviewed   = $isModifiedLang['reviewed'];
                $new_maintainer = $isModifiedLang['reviewed_maintainer'];

                $temp['reviewed']          = $new_reviewed;
                $temp['maintainer']        = $new_maintainer;
                $temp['fileModified']      = ( $isModifiedLang ) ? '{"user":"'.$isModifiedLang["user"].'", "anonymousIdent":"'.$isModifiedLang["anonymousIdent"].'"}' : false;
            } else {
                $temp['reviewed']          = $a->reviewed;
                $temp['maintainer']        = $a->reviewed_maintainer;
                $temp['fileModifiedEN']    = false;
                $temp['fileModifiedLang']  = false;
            }
            $node[] = $temp;
        }
        return array('nb' => $r->num_rows, 'node' => $node);
    }

    public function getNbNotInEn()
    {
        $am      = AccountManager::getInstance();
        $vcsLang = $am->vcsLang;
        $project = $am->project;

        $s = 'SELECT
               count(*) as total
            FROM
               `files`
            WHERE
               `project`="%s" AND
               `lang`="%s" AND
               `status`="NotInEN"';
        $params = array(
            $project,
            $vcsLang
        );

        $r = $this->conn->query($s, $params);
        $a = $r->fetch_object();

        return $a->total;
    }
    /**
     * Get all files which are not in EN tree.
     *
     * @return An associated array containing informations about files which are not in EN tree
     */
    public function getNotInEn()
    {
        $am      = AccountManager::getInstance();
        $vcsLang = $am->vcsLang;
        $project = $am->project;

        $m = $this->getModifies();

        $s = 'SELECT
               `id`,
               `path`,
               `name`
            FROM
               `files`
            WHERE
               `project`="%s" AND
               `lang`="%s" AND
               `status`="NotInEN"';
        $params = array(
            $project,
            $vcsLang
        );

        $r = $this->conn->query($s, $params);

        $node = array();
        while ($a = $r->fetch_object()) {

            $isModified   = ( isset($m[$vcsLang.$a->path.$a->name]) ) ? $m[$vcsLang.$a->path.$a->name] : false ;

            $node[] = array(
                "id"           => $a->id,
                "path"         => $a->path,
                "name"         => $a->name,
                "fileModified" => ( $isModified ) ? '{"user":"'.$isModified["user"].'", "anonymousIdent":"'.$isModified["anonymousIdent"].'"}' : false
            );
        }

        return array('nb' => $r->num_rows, 'node' => $node);
    }

    public function getNbPendingTranslate()
    {
        $am = AccountManager::getInstance();
        $vcsLang = $am->vcsLang;
        $project = $am->project;

        $s = 'SELECT
                count(*) as total
            FROM
                `files`
            WHERE
                `project`="%s" AND
                `lang`="%s" AND
                `status` is NULL AND
                `revision` is NULL';
        $params = array(
            $project,
            $vcsLang
        );

        $r = $this->conn->query($s, $params);
        $a = $r->fetch_object();

        return ( $a->total > $am->userConf->newFile->nbDisplay && $am->userConf->newFile->nbDisplay != 0 ) ? $am->userConf->newFile->nbDisplay : $a->total;
    }

    /**
     * Get all files which need to be translated
     *
     * @return An associated array containing informations about files which need to be translated
     */
    public function getPendingTranslate()
    {
        $am = AccountManager::getInstance();

        $vcsLang = $am->vcsLang;
        $project = $am->project;

        $limit = ( $am->userConf->newFile->nbDisplay ) ? 'LIMIT '.(int)$am->userConf->newFile->nbDisplay : '';

        $m = $this->getModifies();
        $s = 'SELECT
                `id`, `path`, `name`
            FROM
                `files`
            WHERE
                `project`="%s" AND
                `lang`="%s" AND
                `status` is NULL AND
                `revision` is NULL
                %s';

        $params = array(
            $project,
            $vcsLang,
            $limit
        );

        $r = $this->conn->query($s, $params);

        $node = array();
        while ($a = $r->fetch_object()) {

            $isModified = ( isset($m[$vcsLang.$a->path.$a->name]) ) ? $m[$vcsLang.$a->path.$a->name] : false ;

            $node[] = array(
                "id"           => $a->id,
                "path"         => $a->path,
                "name"         => $a->name,
                "fileModified" => ( $isModified ) ? '{"user":"'.$isModified["user"].'", "anonymousIdent":"'.$isModified["anonymousIdent"].'"}' : false
            );
        }

        return array('nb' => $r->num_rows, 'node' => $node);
    }


    // TODO : Deprecated
    public function getNbPendingPatch()
    {
        $am      = AccountManager::getInstance();
        $vcsLang = $am->vcsLang;
        $project = $am->project;

        $s = 'SELECT
                count(*) as total
             FROM
                `pendingPatch`
             WHERE
                `project`="%s" AND
                (`lang`="%s" OR `lang`=\'en\')';
        $params = array(
            $project,
            $vcsLang
        );

        $r = $this->conn->query($s, $params);
        $a = $r->fetch_object();

        return $a->total;
    }

    /**
     * TODO : deprecated
     *
     * Get all pending patch.
     *
     * @return An associated array containing informations about pending patch.
     */
    public function getPendingPatch()
    {
        $am      = AccountManager::getInstance();
        $vcsLang = $am->vcsLang;
        $project = $am->project;

        $s = 'SELECT `id`, CONCAT(`lang`, `path`) AS `path`, `name`, `posted_by` AS \'by\', `uniqID`, `date` FROM `pendingPatch` WHERE `project`="%s" AND (`lang`="%s" OR `lang`=\'en\')';
        $params = array(
            $project,
            $vcsLang
        );
        $r = $this->conn->query($s, $params);

        $node = array();
        while ($row = $r->fetch_assoc()) {
            $node[] = $row;
        }

        return array('nb' => $r->num_rows, 'node' => $node);
    }


    /**
     * Get all folders pending for commit.
     *
     * @return An associated array containing paths of folders pending for commit, or FALSE if there is no folder to commit.
     */
    public function getPendingFoldersCommit()
    {
        $am      = AccountManager::getInstance();
        $vcsLang = $am->vcsLang;
        $project = $am->project;

        $s = 'SELECT * FROM `work` WHERE `project`="%s" AND (`lang`="%s" OR `lang`=\'en\') AND `name`=\'-\' ORDER BY id ASC';
        $params = array(
            $project,
            $vcsLang
        );

        $r = $this->conn->query($s, $params);

        if( $r->num_rows == 0 ) {
            return false;
        }

        $paths = array();
        while ($a = $r->fetch_object()) {

            $obj = (object) array('lang' => $a->lang, 'path' => $a->path, 'name'=> '-');

            $paths[$a->lang.$a->path] = $obj;
        }

        return $paths;
    }

    // TODO : deprecated
    public function getNbPendingCommit()
    {
        $am      = AccountManager::getInstance();
        $vcsLang = $am->vcsLang;
        $project = $am->project;

        // We exclude item witch name == '-' ; this is new folder ; We don't display it.
        $s = 'SELECT count(*) as total FROM `pendingCommit` WHERE `project`="%s" AND (`lang`="%s" OR `lang`=\'en\') AND `name` != \'-\'';
        $params = array(
            $project,
            $vcsLang
        );

        $r = $this->conn->query($s, $params);
        $a = $r->fetch_object();

        return $a->total;
    }


    public function getPatchList()
    {
        $am = AccountManager::getInstance();

        $s = '
            SELECT
                `id`,
                `name`,
                `description`,
                `email`,
                `date`

            FROM
                `patches`

            WHERE
                `project`="%s" AND
                `userID` = %s';
        $params = array(
            $am->project,
            $am->userID
        );

        $r = $this->conn->query($s, $params);

        $result = array();

        while ($a = $r->fetch_assoc()) {
            $result[] = $a;
        }

        return $result;
    }


    /**
     * Get all files in Work module (progress work and patches for review).
     * Actually only used in scripts/cron/send_work_to_list.php
     *
     * @return An associated array containing informations about files in work
     */
    public function getRawWork($lang)
    {
        $am      = AccountManager::getInstance();
        $project = $am->project;

        /**** We start by the work in progress module ****/

        // We exclude item witch name == '-' ; this is new folder ; We don't display it.
        $s = 'SELECT
                `work`.`id` as idDB,
                CONCAT(`lang`, `path`, `name`) as filePath,
                `vcs_login` as `user`,
                `date`,
                `type`
                FROM
                `work`,
                `users`
                WHERE
                `work`.`userID` = `users`.`userID` AND
                `module` = "workInProgress" AND
                `lang` = "%s" AND
                `work`.`project`  = "%s"
                ORDER BY
                type, date';
        $params = array(
            $lang,
            $project
        );
        $r = $this->conn->query($s, $params);

        $workInProgress = Array('nb'=>0,'data'=>Array());

        if( $r->num_rows != 0 )
        {
            $workInProgress['nb'] = $r->num_rows;
            while ($a = $r->fetch_array(MYSQLI_ASSOC)) {
                $workInProgress['data'][] = $a;
            }
        }

        /**** then, by the patches for review module ****/

        // We exclude item witch name == '-' ; this is new folder ; We don't display it.
        $s = 'SELECT
                `work`.`id` as idDB,
                CONCAT(`work`.`lang`, `work`.`path`, `work`.`name`) as fileFullPath,
                `work`.`path` as filePath,
                `work`.`name` as fileName,
                `work`.`lang` as fileLang,
                `users`.`vcs_login` as `user`,
                `users`.`authService` as `authService`,
                `work`.`date`,
                `work`.`type`

                FROM
                `work`,
                `users`

                WHERE
                `work`.`userID` = `users`.`userID` AND
                `work`.`module` = "PatchesForReview" AND
                `work`.`lang` = "%s" AND
                `work`.`project`  = "%s"

                ORDER BY
                `work`.`type`, `work`.`date`

                ';
        $params = array(
            $lang,
            $project
        );
        $r = $this->conn->query($s, $params);

        $PatchesForReview = Array('nb'=>0,'data'=>Array());

        if( $r->num_rows != 0 )
        {
            $PatchesForReview['nb'] = $r->num_rows;
            while ($a = $r->fetch_array(MYSQLI_ASSOC)) {
                $PatchesForReview['data'][] = $a;
            }
        }

        // We return the result now
        return Array(
            "total"            => ($workInProgress['nb'] + $PatchesForReview['nb']),
            "workInProgress"   => $workInProgress,
            "PatchesForReview" => $PatchesForReview
            );
    }

    /**
     * Check is a patch don't contain any files
     *
     *
     * @return TRUE if this patch is empty, FALSE either.
     * @see RepositoryFetcher::getWork
     */
    private function _isEmptyPatch($patchs)
    {
        $isEmpty = true;

        while( list($patch, $dataPatch) = each($patchs))
        {
             while( list($folder, $dataFiles) = each($dataPatch['folders']))
            {
                $isEmpty = false;
            }
        }
        return $isEmpty;
    }


    /**
     * Get all files in Work module (progress work or patches for review).
     *
     * @return An associated array containing informations about files in work
     */
    public function getWork($module)
    {
        $am      = AccountManager::getInstance();
        $vcsLang = $am->vcsLang;
        $project = $am->project;
        $vcsLogin = $am->vcsLogin;
        $anonymousIdent = $am->anonymousIdent;

        $node = array();

        // Do we need to display EN Work ?
        if( isset($am->userConf->main->displayENWork) && $am->userConf->main->displayENWork === true ) {
            $langFilter = '(`lang` = "%s" OR `lang`="en" OR `lang`="doc-base")';
        } else {
            $langFilter = '(`lang` = "%s" OR `lang`="doc-base")';
        }

        if( $module == 'PatchesForReview' ) {
            // We exclude item witch name == '-' ; this is new folder ; We don't display it.
            $s = 'SELECT
                    `patches`.`name` as `patch_name`, `patches`.`description`, `patches`.`email` as `patch_email`, `patches`.`date` as `patch_date`, `patches`.`id` as `patch_id`,
                    `work`.`lang`, `work`.`path`, `work`.`name`, `work`.`date`, `work`.`progress`, `work`.`type`, `work`.`id`,
                    `users`.`userID`, `users`.`authService`, `users`.`email`, `users`.`anonymousIdent`, `users`.`vcs_login`
                 FROM
                    `work`,
                    `patches`,
                    `users`
                 WHERE
                    `work`.`patchID` = `patches`.`id` AND
                    `work`.`userID` = `users`.`userID` AND
                    `work`.`project` = "%s" AND
                    '.$langFilter.' AND
                    `work`.`name`   != "-" AND
                    `module`  = "%s"';

            $params = array(
                $project,
                $vcsLang,
                $module
            );
            $r = $this->conn->query($s, $params);
            $nodes = array();
            $patchIds = array();
            while ($a = $r->fetch_object()) {
                $nodes[$a->userID]['data'] = Array(
                    "authService" => $a->authService,
                    "email" => $a->email,
                    "anonymousIdent" => $a->anonymousIdent,
                    "vcs_login" => $a->vcs_login
                );

                $nodes[$a->userID]['patches'][$a->patch_id]['data'] = Array(
                    "name" => $a->patch_name,
                    "description" => $a->description,
                    "email" => $a->patch_email,
                    "date" => $a->patch_date
                );

                $nodes[$a->userID]['patches'][$a->patch_id]['folders'][$a->lang.$a->path][] = Array(
                    "name"          => $a->name,
                    "last_modified" => $a->date,
                    "progress"      => $a->progress,
                    "type"          => $a->type,
                    "idDB"          => $a->id
                );
                $patchIds[$a->patch_id] = true;
            }



            // FIXME: temporary fix for empty patches
            $s = 'SELECT
                    `patches`.`name` as `patch_name`, `patches`.`description`, `patches`.`email` as `patch_email`, `patches`.`date` as `patch_date`, `patches`.`id` as `patch_id`,
                    `users`.`userID`, `users`.`authService`, `users`.`email`, `users`.`anonymousIdent`, `users`.`vcs_login`
                 FROM
                    `patches`,
                    `users`
                 WHERE
                    `patches`.`userID` = `users`.`userID` AND
                    `patches`.`project` = "%s" AND
                    `patches`.`userID` = %d
                    ' . (count($patchIds) ?  'AND `id` NOT IN (%s)' : '');
            $params = array(
                $project,
                $am->userID,
                implode(',' ,array_keys($patchIds))
            );
            $r = $this->conn->query($s, $params);

            while ($a = $r->fetch_object()) {
                $nodes[$a->userID]['data'] = Array(
                    "authService" => $a->authService,
                    "email" => $a->email,
                    "anonymousIdent" => $a->anonymousIdent,
                    "vcs_login" => $a->vcs_login
                );

                $nodes[$a->userID]['patches'][$a->patch_id]['data'] = Array(
                    "name" => $a->patch_name,
                    "description" => $a->description,
                    "email" => $a->patch_email,
                    "date" => $a->patch_date
                );

                $nodes[$a->userID]['patches'][$a->patch_id]['folders'] = Array();
            }
            // end temporary fix for empty patches


            $result = array();
            foreach ($nodes as $userId => $userData) {

                $children = array();

                foreach ($userData['patches'] as $patchId => $patchData) {

                    $childrenFolders = array();

                    foreach ($patchData['folders'] as $folder => $files) {

                        $childrenFiles = array();

                        foreach ($files as $file) {
                            // Witch iconCls do we need to use ?
                            switch ($file["type"]) {
                                case 'delete':
                                    $iconCls = 'iconTrash';
                                    break;
                                case 'new':
                                    $iconCls = 'iconNewFiles';
                                    break;
                                case 'update':
                                    $iconCls = 'iconRefresh';
                                    break;
                                default:
                                    $iconCls = 'task';
                                    break;
                            }

                            $childrenFiles[] = array(
                                'task' => $file["name"],
                                'type' => $file["type"],
                                'last_modified' => $file["last_modified"],
                                'leaf' => true,
                                'iconCls' => $iconCls,
                                'progress' => (int)$file["progress"],
                                'idDB' => $file["idDB"]
                            );
                        }
                        $childrenFolders[] = array(
                            'task' => $folder,
                            'type' => 'folder',
                            'iconCls' => 'iconFolderOpen',
                            'expanded' => true,
                            'children' => $childrenFiles
                        );
                    }

                    $children[] = array(
                        'task' => $patchData['data']['name'],
                        'type' => 'patch',
                        'iconCls' => 'iconPatch',
                        'patchDescription' => $patchData['data']['description'],
                        'patchEmail' => $patchData['data']['email'],
                        'expanded' => true,
                        'creationDate' => $patchData['data']['date'],
                        'draggable' => false,
                        'idDB' => $patchId,
                        'children' => $childrenFolders
                    );

                }

                switch($userData['data']['authService'])
                {
                    case 'google':
                        $iconUser = 'iconGoogle';
                        break;
                    case 'facebook':
                        $iconUser = 'iconFacebook';
                        break;
                    case 'github':
                        $iconUser = 'iconGithub';
                        break;
                    case 'stackoverflow':
                        $iconUser = 'iconStackoverflow';
                        break;
                    case 'linkedin':
                        $iconUser = 'iconLinkedin';
                        break;
                    case 'instagram':
                        $iconUser = 'iconInstagram';
                        break;
                    case 'twitter':
                        $iconUser = 'iconTwitter';
                        break;

                    default:
                        $iconUser = 'iconUser';
                }

                $isAnonymous = ($userData['data']['authService'] != 'VCS' || $userData['data']['vcs_login'] == 'anonymous');
                $result[] = array(
                    'task' => $userData['data']['vcs_login'] . ($userData['data']['vcs_login'] == 'anonymous' ? ' #'.$userId : ''),
                    'type' => 'user',
                    'userID' => $userId,
                    'isAnonymous' => $isAnonymous,
                    'haveKarma' => $isAnonymous ? false : ($am->checkKarma($userData['data']['vcs_login'], $vcsLang) === true),
                    'email' => ($userData['data']['email']) ? $userData['data']['email'] : false,
                    'iconCls' => $iconUser,
                    'expanded' => ($userData['data']['vcs_login'] == $vcsLogin && $userData['data']['anonymousIdent'] == $anonymousIdent),
                    'children' => $children
                );

            }

            return json_encode($result);

        } // End if module == PatchesForReview


        elseif( $module == 'workInProgress' ) {

            // We exclude item witch name == '-' ; this is new folder ; We don't display it.
            $s = 'SELECT
                    `work`.`lang`, `work`.`path`, `work`.`name`, `work`.`date`, `work`.`progress`, `work`.`type`, `work`.`id`,
                    `users`.`userID`, `users`.`authService`, `users`.`email`, `users`.`anonymousIdent`, `users`.`vcs_login`
                 FROM
                    `work`,
                    `users`
                 WHERE
                    `work`.`userID` = `users`.`userID` AND
                    `work`.`project` = "%s" AND
                    '.$langFilter.' AND
                    `name`   != "-" AND
                    `module`  = "%s" AND
                    `patchID` IS NULL';

            $params = array(
                $project,
                $vcsLang,
                $module
            );
            $r = $this->conn->query($s, $params);

            $nodes = array();
            while ($a = $r->fetch_object()) {
                $nodes[$a->userID]['data'] = Array(
                    "authService" => $a->authService,
                    "email" => $a->email,
                    "anonymousIdent" => $a->anonymousIdent,
                    "vcs_login" => $a->vcs_login
                );
                $nodes[$a->userID]['folders'][$a->lang.$a->path][] = Array(
                    "name"          => $a->name,
                    "last_modified" => $a->date,
                    "progress"      => $a->progress,
                    "type"          => $a->type,
                    "idDB"          => $a->id
                );
            }

            $result = array();
            foreach ($nodes as $userId => $userData) {

                $children = array();

                foreach ($userData['folders'] as $folder => $files) {

                    $childrenFiles = array();

                    foreach ($files as $file) {
                        // Witch iconCls do we need to use ?
                        switch ($file["type"]) {
                            case 'delete':
                                $iconCls = 'iconTrash';
                                break;
                            case 'new':
                                $iconCls = 'iconNewFiles';
                                break;
                            case 'update':
                                $iconCls = 'iconRefresh';
                                break;
                            default:
                                $iconCls = 'task';
                                break;
                        }

                        $childrenFiles[] = array(
                            'task' => $file["name"],
                            'type' => $file["type"],
                            'last_modified' => $file["last_modified"],
                            'leaf' => true,
                            'iconCls' => $iconCls,
                            'progress' => (int)$file["progress"],
                            'idDB' => $file["idDB"]
                        );
                    }
                    $children[] = array(
                        'task' => $folder,
                        'type' => 'folder',
                        'iconCls' => 'iconFolderOpen',
                        'expanded' => true,
                        'children' => $childrenFiles
                    );
                }

                switch($userData['data']['authService'])
                {
                    case 'google':
                        $iconUser = 'iconGoogle';
                        break;
                    case 'facebook':
                        $iconUser = 'iconFacebook';
                        break;
                    case 'github':
                        $iconUser = 'iconGithub';
                        break;
                    case 'stackoverflow':
                        $iconUser = 'iconStackoverflow';
                        break;
                    case 'linkedin':
                        $iconUser = 'iconLinkedin';
                        break;
                    case 'instagram':
                        $iconUser = 'iconInstagram';
                        break;
                    case 'twitter':
                        $iconUser = 'iconTwitter';
                        break;

                    default:
                        $iconUser = 'iconUser';
                }

                $isAnonymous = ($userData['data']['authService'] != 'VCS' || $userData['data']['vcs_login'] == 'anonymous');
                $result[] = array(
                    'task' => $userData['data']['vcs_login'] . ($userData['data']['vcs_login'] == 'anonymous' ? ' #'.$userId : ''),
                    'type' => 'user',
                    'userID' => $userId,
                    'isAnonymous' => $isAnonymous,
                    'haveKarma' => $isAnonymous ? false : ($am->checkKarma($userData['data']['vcs_login'], $vcsLang) === true),
                    'email' => ($userData['data']['email']) ? $userData['data']['email'] : false,
                    'iconCls' => $iconUser,
                    'expanded' => ($userData['data']['vcs_login'] == $vcsLogin && $userData['data']['anonymousIdent'] == $anonymousIdent),
                    'children' => $children
                );

            }

            return json_encode($result);

        } // End if module == workInProgress
    }

    /**
     * Get all files for a given php's extension. Can be exclusive for php project
TODO: Handle project here
     *
     * @param $ext The name of the extension.
     * @return An array of files
     */
    public function getFilesByExtension($ext)
    {
        $am      = AccountManager::getInstance();
        $vcsLang = $am->vcsLang;
        $project = $am->project;

        $s = 'SELECT `path`, `name` FROM `files` WHERE `path`
             LIKE \'/reference/%s/%%\' AND `lang`="%s" AND `project`="%s" ORDER BY `path`, `name`';
        $params = array(
            $ext, $vcsLang, $project
        );
        $r = $this->conn->query($s, $params);

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
        $project = AccountManager::getInstance()->project;

        // If user forget ".php" at this end of the permlink, this is "function" how is search into DB.
        // We don't allow it, neither blank ID
        if( $id == 'function' || empty($id) ) {
            return false;
        }

        // We start by searching file witch only this ID
        $s = 'SELECT
                `lang`, `path`, `name`
             FROM
                 `files`
             WHERE
                 `project`="%s" AND
                 `lang` = "%s" AND
                 `xmlid` = "%s"';
        $params = array(
            $project,
            $lang,
            $id
        );
        $r = $this->conn->query($s, $params);
        $nb = $r->num_rows;

        if( $nb >= 1 ) {
            return $r->fetch_object();
        } else {

            // We now search file which contain this ID
            $s = 'SELECT
                    `lang`, `path`, `name`
                FROM
                    `files`
                WHERE
                    `project`="%s" AND
                    `lang` = "%s" AND
                    `xmlid` LIKE "%%%s%%"';
            $params = array(
                $project,
                $lang,
                $id
            );
            $r = $this->conn->query($s, $params);
            $nb = $r->num_rows;

            if( $nb == 0 ) {
                return false;
            } else {
                return $r->fetch_object();
            }

        }
    }

    /**
     * Perform searching on filepath under the repository tree
     *
     * @param $key Keyword for search
     * @return Array of file info (TODO: remove extjs dependent info)
     */
    public function getFileByKeyword($key)
    {
        $am      = AccountManager::getInstance();
        $vcsLang = $am->vcsLang;
        $project = $am->project;

        $s = 'SELECT `lang`, `path`, `name` FROM `files` WHERE `project`="%s" AND  (`lang`="%s" OR `lang`=\'en\')
             AND ( `name` LIKE \'%%%s%%\' OR `xmlid` LIKE \'%%%s%%\' ) ORDER BY `lang`, `path`, `name`';
        $params = array(
            $project,
            $vcsLang,
            $key,
            $key
        );
        $r = $this->conn->query($s, $params);

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
        $am      = AccountManager::getInstance();
        $appConf = $am->appConf;
        $project = $am->project;
        $vcsLogin = $am->vcsLogin;
        $anonymousIdent = $am->anonymousIdent;

        // Security
        $dir = str_replace('..', '', $dir);
        if (substr($dir, -1) != '/') $dir .= '/';

        $m = $this->getModifies();

        // Test if this dir exist
        if( !is_dir($appConf[$project]['vcs.path'].$dir) ) {
            return;
        }

        $d = dir($appConf[$project]['vcs.path'].$dir);

        $files = array();

        while ($f = $d->read())
        {
            // We display only 'en', 'LANG' tree
            if (   $dir == '/'
                && $f != 'en'
                && $f != $appConf[$project]['entities.folder']
                && $f != $am->vcsLang
            ) {
                continue; // skip non-en and non-user-lang
            }

            if (   $f == '.'
                || $f == '..'
                || substr($f, 0, 1) == '.'      // skip hidden files
                || $f == 'CVS'
                || substr($f, 0, 9) == 'entities.'
            ) continue;

            if (is_dir($appConf[$project]['vcs.path'].$dir.$f)) {

                $files[] = array(
                    'text' => $f,
                    'id'   => $dir.$f,
                    'cls'  => 'folder',
                    'type' => 'folder',
                    'allowDrag' => false
                );

            } else {

                $testedPath = ltrim($dir.$f, "/");

                //echo $testedPath."\n";

                $isModified = ( isset($m[$testedPath]) ) ? $m[$testedPath] : false ;

                if ( $isModified ) {

                    if( $isModified['user'] == $vcsLogin && $isModified['anonymousIdent'] == $anonymousIdent ) {
                        $cls = 'file fileModifiedByMe';
                    } else {
                        $cls = 'file fileModifiedByAnother';
                    }


                } else {
                    $cls = 'file';
                }

                $tmp = explode('.',$f);
                $ext = array_pop($tmp);


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

    /**
     * Get a static value from DB
     *
     * @param $type The type of this value
     * @param $field The name of the field for this value
     * @return The value.
     */
    public static function getStaticValue($type, $field)
    {

        // Save in DB
        $s = 'SELECT id, value FROM staticValue WHERE
             `project` = "%s" AND
             `type` = "%s" AND
             `field`= "%s"';
        $params = array(
            AccountManager::getInstance()->project,
            $type,
            $field
        );

        $r = DBConnection::getInstance()->query($s, $params);

        if( $r->num_rows == 0 ) {
            return false;
        } else {
            $a = $r->fetch_object();
            return json_decode($a->value);
        }
    }
}

?>
