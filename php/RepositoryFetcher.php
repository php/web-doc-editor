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
     * Get lst info dateTime about this apps
     *
     * @return The date/time of the last Info
     */
    public function getLastInfoDate()
    {
        $am      = AccountManager::getInstance();
        $project = $am->project;

        $s = sprintf(
            'SELECT
                `date`
             FROM
                `staticValue`
             WHERE
                `project` = "%s" AND
                `type`="info"
             ORDER BY `date` DESC
             LIMIT 0, 1',

            $am->project
        );
        $r = DBConnection::getInstance()->query($s);

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

        $s = sprintf(
            'SELECT
                count(*) as total
             FROM
                `staticValue`
             WHERE
                `project` = "%s" AND
                `type`="info"',

            $am->project
        );
        $r = DBConnection::getInstance()->query($s);

        $a = $r->fetch_assoc();
        $infos['total'] = $a['total'];

        $s = sprintf(
            'SELECT
                `field`, `value`, `date`
             FROM
                `staticValue`
             WHERE
                `project` = "%s" AND
                `type`="info"
             ORDER BY `date` DESC
             LIMIT %s, %s',

            $am->project, $start, $limit
        );
        $r = DBConnection::getInstance()->query($s);

        $i=0;
        while ($a = $r->fetch_assoc()) {
            $infos['value'][$i]['id'] = $i;
            $infos['value'][$i]['field'] = $a['field'];
            $infos['value'][$i]['value'] = json_decode($a['value']);
            $infos['value'][$i]['date']  = $a['date'];
            $infos['value'][$i]['elapsedTime']  = elapsedTime($a['date'], @date("Y-m-d h:i:s"));
            $i++;
        }

        return $infos;
    }

    public function getSkeletonsNames()
    {
        $am      = AccountManager::getInstance();
        $appConf = $am->appConf;
        $project = $am->project;

        $return = array();

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

        $s = sprintf(
            'SELECT
                *
             FROM
                `work`
             WHERE
                `project` = "%s" AND
                ( `lang`="%s" OR `lang`="en" ) ',

            $am->project,
            $am->vcsLang
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
        $am = AccountManager::getInstance();
        $infos = array();

        $ids = is_array($id) ? implode($id, ',') : $id;

        if( empty( $ids ) ) {
            return $infos;
        }

        $s = sprintf(
            'SELECT
                *
             FROM
                `work`
             WHERE
                `project` = "%s" AND
               (`lang`="%s" OR `lang`="en") AND `id` IN (%s)',
                
            $am->project,
            $am->vcsLang,
            $ids
        );

        $r = DBConnection::getInstance()->query($s);

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

        $s = sprintf(
            'SELECT
                count(*) as total
             FROM
                `files`
             WHERE
                `project`   = "%s" AND
                `lang`      = "%s"  AND
                `revision` != `en_revision` AND
                `status` is not null',
            $project,
            $vcsLang
        );
        $r = DBConnection::getInstance()->query($s);
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

        $limit = ( $am->userConf->needUpdate->nbDisplay ) ? 'LIMIT '.$am->userConf->needUpdate->nbDisplay : '';

        $m = $this->getModifies();

        $s = sprintf(
            'SELECT
                *
             FROM
                `files`
             WHERE
                `project`="%s" AND
                `lang` = "%s" AND
                `revision` != `en_revision` AND
                `status` is not NULL
                %s',
            $project,
            $vcsLang,
            $limit
        );
        $r = DBConnection::getInstance()->query($s);

        $node = array();
        while ($a = $r->fetch_object()) {

            if (   isset($m[$vcsLang.$a->path.$a->name])
                || isset($m['en'    .$a->path.$a->name])
            ) {

                $isModifiedEN   = ( isset($m['en'.$a->path.$a->name]) )     ? $m['en'.$a->path.$a->name]     : false ;
                $isModifiedLang = ( isset($m[$vcsLang.$a->path.$a->name]) ) ? $m[$vcsLang.$a->path.$a->name] : false ;

                if ( $isModifiedEN ) {
                    $new_en_revision   = $isModifiedEN['revision'];
                    $new_revision      = $a->revision;
                    $original_revision = $a->revision;
                    $new_maintainer    = $a->maintainer;
                }

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
                    "fileModifiedEN"    => ( $isModifiedEN )   ? '{"user":"'.$isModifiedEN["user"].'",   "anonymousIdent":"'.$isModifiedEN["anonymousIdent"].'"}'   : false,
                    "fileModifiedLang"  => ( $isModifiedLang ) ? '{"user":"'.$isModifiedLang["user"].'", "anonymousIdent":"'.$isModifiedLang["anonymousIdent"].'"}' : false
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
                    "fileModifiedEN"    => false,
                    "fileModifiedLang"  => false
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
        $s = sprintf(
            'SELECT
                count(*) as total
             FROM
                `files`
             WHERE
                `project`="%s" AND
                `lang` = "%s" AND
                reviewed != \'yes\'',
            $project,
            $vcsLang
        );
        $r = DBConnection::getInstance()->query($s);
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

        $limit = ( $am->userConf->reviewed->nbDisplay ) ? 'LIMIT '.$am->userConf->reviewed->nbDisplay : '';

        $m = $this->getModifies();
        $s = sprintf(
            'SELECT
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
                %s',
            $project,
            $vcsLang,
            $limit
        );
        $r = DBConnection::getInstance()->query($s);

        $node = array();
        while ($a = $r->fetch_object()) {

            $isModifiedEN   = ( isset($m['en'.$a->path.$a->name]) )     ? $m['en'.$a->path.$a->name]     : false ;
            $isModifiedLang = ( isset($m[$vcsLang.$a->path.$a->name]) ) ? $m[$vcsLang.$a->path.$a->name] : false ;

            $temp = array(
                "id"   => $a->id,
                "path" => $a->path,
                "name" => $a->name,
            );

            if ( $isModifiedLang || $isModifiedEN )
            {
                if ( $isModifiedEN ) {
                    $new_reviewed   = $a->reviewed;
                    $new_maintainer = $a->maintainer;
                }

                if ($isModifiedLang) {
                    $new_reviewed   = $isModifiedLang['reviewed'];
                    $new_maintainer = $isModifiedLang['maintainer'];
                }

                $temp['reviewed']          = $new_reviewed;
                $temp['maintainer']        = $new_maintainer;
                $temp['fileModifiedEN']    = ( $isModifiedEN )   ? '{"user":"'.$isModifiedEN["user"].'",   "anonymousIdent":"'.$isModifiedEN["anonymousIdent"].'"}'   : false;
                $temp['fileModifiedLang']  = ( $isModifiedLang ) ? '{"user":"'.$isModifiedLang["user"].'", "anonymousIdent":"'.$isModifiedLang["anonymousIdent"].'"}' : false;
            } else {
                $temp['reviewed']          = $a->reviewed;
                $temp['maintainer']        = $a->maintainer;
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

        $s = sprintf('
            SELECT
               count(*) as total
            FROM
               `files`
            WHERE
               `project`="%s" AND
               `lang`="%s" AND
               `status`="NotInEN"',
            $project,
            $vcsLang);

        $r = DBConnection::getInstance()->query($s);
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

        $s = sprintf('
            SELECT
               `id`,
               `path`,
               `name`
            FROM
               `files`
            WHERE
               `project`="%s" AND
               `lang`="%s" AND
               `status`="NotInEN"',
            $project,
            $vcsLang);

        $r = DBConnection::getInstance()->query($s);

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

        $s = sprintf('
            SELECT
                count(*) as total
            FROM
                `files`
            WHERE
                `project`="%s" AND
                `lang`="%s" AND
                `status` is NULL AND
                `revision` is NULL',
            $project,
            $vcsLang
        );
        
        $r = DBConnection::getInstance()->query($s);
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

        $limit = ( $am->userConf->newFile->nbDisplay ) ? 'LIMIT '.$am->userConf->newFile->nbDisplay : '';

        $m = $this->getModifies();
        $s = sprintf('
            SELECT
                `id`, `path`, `name`
            FROM
                `files`
            WHERE
                `project`="%s" AND
                `lang`="%s" AND
                `status` is NULL AND
                `revision` is NULL
                %s',
            $project,
            $vcsLang,
            $limit
        );

        $r = DBConnection::getInstance()->query($s);

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

        $s = sprintf(
            'SELECT
                count(*) as total
             FROM
                `pendingPatch`
             WHERE
                `project`="%s" AND
                (`lang`="%s" OR `lang`=\'en\')',
            $project,
            $vcsLang
        );
        $r = DBConnection::getInstance()->query($s);
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

        $s = sprintf(
            'SELECT `id`, CONCAT(`lang`, `path`) AS `path`, `name`, `posted_by` AS \'by\', `uniqID`, `date` FROM `pendingPatch` WHERE `project`="%s" AND (`lang`="%s" OR `lang`=\'en\')',
            $project, $vcsLang
        );
        $r = DBConnection::getInstance()->query($s);

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

        $s = sprintf(
            'SELECT * FROM `work` WHERE `project`="%s" AND (`lang`="%s" OR `lang`=\'en\') AND `name`=\'-\' ORDER BY id ASC',
            $project, $vcsLang
        );
        $r = DBConnection::getInstance()->query($s);

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
        $s = sprintf(
            'SELECT count(*) as total FROM `pendingCommit` WHERE `project`="%s" AND (`lang`="%s" OR `lang`=\'en\') AND `name` != \'-\'',
            $project, $vcsLang
        );
        $r = DBConnection::getInstance()->query($s);
        $a = $r->fetch_object();

        return $a->total;
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

        $node = array();

        if( $module == 'PatchesForReview' ) {

            // We exclude item witch name == '-' ; this is new folder ; We don't display it.
            $s = sprintf(
                'SELECT
                    `id`,
                    `name` as patchName,
                    `user`
                 FROM
                    `patches`
                 WHERE
                    `project`  = "%s"',
                $project
            );
            $r = DBConnection::getInstance()->query($s);
            
            $patches = Array();

            while ($a = $r->fetch_object()) {
                $patches[$a->id] = Array(
                    "user"      => $a->user,
                    "patchName" => $a->patchName
                );

                $node[$a->user][$a->patchName]['idDB'] = $a->id;
                $node[$a->user][$a->patchName]['folders'] = array();
            }


            // We exclude item witch name == '-' ; this is new folder ; We don't display it.
            $s = sprintf(
                'SELECT
                    *
                 FROM
                    `work`
                 WHERE
                    `project` = "%s" AND
                    (`lang`   = "%s" OR `lang`="en") AND
                    `name`   != "-"  AND
                    `module`  = "%s" AND
                    `patchID` IN (%s)',
                $project,
                $vcsLang,
                $module,
                implode(",", array_keys($patches))
            );

            $r = DBConnection::getInstance()->query($s);

            while ($a = $r->fetch_object()) {

                $node[$a->user][$patches[$a->patchID]["patchName"]]['idDB'] = $a->patchID;
                $node[$a->user][$patches[$a->patchID]["patchName"]]['folders'][$a->lang.$a->path][] = Array(
                    "name"          => $a->name,
                    "last_modified" => $a->date,
                    "type"          => $a->type,
                    "idDB"          => $a->id
                );

            }
            
            $result = '[';
            // We format the result node to pass to ExtJs TreeGrid component
            while( list($user, $patchs) = each($node)) {

                if( $user == $vcsLogin ) {
                    $expanded  = 'true';
                } else {
                    $expanded  = 'false';
                }

                $email = $am->getUserEmail($user);
                $email = ($email) ? $email : 'false';

                // We start by users
                $result .= "{task:'".$user."',type:'user',isAnonymous:".(($am->anonymous($user)) ? 'true' : 'false').",email:'".$email."', iconCls:'iconUser',expanded:".$expanded.",children:[";

                // We now walk into patches for this users.
                while( list($patch, $dataPatch) = each($patchs)) {
                    $result .= "{task:'".$patch."',type:'patch',iconCls:'iconPatch',expanded:true,draggable: false, idDB:".$dataPatch["idDB"].", children:[";

                    // We now walk into the folders for this patch
                    while( list($folder, $dataFiles) = each($dataPatch['folders'])) {
                        $result .= "{task:'".$folder."',type:'folder',iconCls:'iconFolderOpen',expanded:true,children:[";

                                // We now walk into the files for this folder
                                while( list($file, $data) = each($dataFiles)) {

                                    // Witch iconCls do we need to use ?
                                    switch ($data["type"]) {
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

                                    $result .= "{task:'".$data["name"]."',type:'".$data["type"]."',last_modified:'".$data["last_modified"]."',leaf:true,iconCls:'".$iconCls."', idDB:".$data["idDB"]."},";
                                }

                        $result .= ']},';
                    }

                    $result .= ']},';
                }

                $result .= ']},';

            }
            $result .= ']';

            // We skip trailing comma
            $result = str_replace("},]", "}]", $result);

            return $result;

        } // End if module == PatchesForReview


        if( $module == 'workInProgress' ) {

            // We exclude item witch name == '-' ; this is new folder ; We don't display it.
            $s = sprintf(
                'SELECT
                    *
                 FROM
                    `work`
                 WHERE
                    `project` = "%s" AND
                    (`lang`   = "%s" OR `lang`="en") AND
                    `name`   != "-" AND
                    `module`  = "%s" AND
                    `patchID` IS NULL',
                $project,
                $vcsLang,
                $module
            );
            $r = DBConnection::getInstance()->query($s);

            while ($a = $r->fetch_object()) {

                $node[$a->user][$a->lang.$a->path][] = Array(
                    "name"          => $a->name,
                    "last_modified" => $a->date,
                    "progress"      => $a->progress,
                    "type"          => $a->type,
                    "idDB"          => $a->id
                );
            }

            $result = '[';
            // We format the result node to pass to ExtJs TreeGrid component
            while( list($user, $dataFolders) = each($node)) {
            
                if( $user == $vcsLogin ) {
                    $expanded  = 'true';
                } else {
                    $expanded  = 'false';
                }
                
                $email = $am->getUserEmail($user);
                $email = ($email) ? $email : 'false';

                // We put nbFiles into user's nodes to not have to count it by the client
                $result .= "{task:'".$user."',type:'user',isAnonymous:".(($am->anonymous($user)) ? 'true' : 'false').",email:'".$email."', iconCls:'iconUser',expanded:".$expanded.",children:[";

                    // We now walk into the folders for this users
                    while( list($folder, $dataFiles) = each($dataFolders)) {
                        $result .= "{task:'".$folder."',type:'folder',iconCls:'iconFolderOpen',expanded:true,children:[";

                                // We now walk into the files for this folder
                                while( list($file, $data) = each($dataFiles)) {

                                    // Witch iconCls do we need to use ?
                                    switch ($data["type"]) {
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

                                    $result .= "{task:'".$data["name"]."',type:'".$data["type"]."',last_modified:'".$data["last_modified"]."',leaf:true,iconCls:'".$iconCls."',progress:".$data["progress"].", idDB:".$data["idDB"]."},";
                                }

                        $result .= ']},';
                    }


                $result .= ']},';

            }
            $result .= ']';

            // We skip trailing comma
            $result = str_replace("},]", "}]", $result);

            return $result;

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

        $s = sprintf(
            'SELECT `path`, `name` FROM `files` WHERE `path`
             LIKE \'/reference/%s/%%\' AND `lang`="%s" AND `project`="%s" ORDER BY `path`, `name`',
            $ext, $vcsLang, $project
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
        $project = AccountManager::getInstance()->project;

        $s = "SELECT `lang`, `path`, `name` FROM `files`
              WHERE `project`='$project' AND `lang` = '$lang' AND `xmlid` LIKE '%$id%'";
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
        $am      = AccountManager::getInstance();
        $vcsLang = $am->vcsLang;
        $project = $am->project;

        $s = sprintf(
            'SELECT `lang`, `path`, `name` FROM `files` WHERE `project`="%s" AND  (`lang`="%s" OR `lang`=\'en\')
             AND ( `name` LIKE \'%%%s%%\' OR `xmlid` LIKE \'%%%s%%\' ) ORDER BY `lang`, `path`, `name`',
            $project, $vcsLang, $key, $key
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
        $am      = AccountManager::getInstance();
        $appConf = $am->appConf;
        $project = $am->project;
        $vcsLogin = $am->vcsLogin;
        $anonymousIdent = $am->anonymousIdent;

        // Security
        $dir = str_replace('..', '', $dir);
        if (substr($dir, -1) != '/') $dir .= '/';

        $m = $this->getModifies();

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
                || substr($f, -4)   == '.new'   // skip work files
                || $f == 'CVS'
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

    /**
     * Get a static value from DB
     *
     * @param $type The type of this value
     * @param $field The name of the field for this value
     * @return The value.
     */
    public function getStaticValue($type, $field)
    {

        // Save in DB
        $s = "SELECT id, value FROM staticValue WHERE
             `project`='".AccountManager::getInstance()->project."' AND
             `type`='".$type."' AND
             `field`= '".$field."'
             ";
        $r = DBConnection::getInstance()->query($s);

        if( $r->num_rows == 0 ) {
            return false;
        } else {
            $a = $r->fetch_object();
            return json_decode($a->value);
        }
    }
}

?>
