<?php

require_once dirname(__FILE__) . '/AccountManager.php';
require_once dirname(__FILE__) . '/DBConnection.php';
require_once dirname(__FILE__) . '/File.php';
require_once dirname(__FILE__) . '/LockFile.php';
require_once dirname(__FILE__) . '/ToolsCheckDoc.php';
require_once dirname(__FILE__) . '/ToolsCheckEntities.php';
require_once dirname(__FILE__) . '/ToolsError.php';
require_once dirname(__FILE__) . '/VCSFactory.php';

class RepositoryManager
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

    public $availableLang = array(
         0 => Array('code' => 'ar',    'iconCls' => 'flags flag-ar',    'name' => 'Arabic'),
         1 => Array('code' => 'pt_BR', 'iconCls' => 'flags flag-pt_BR', 'name' => 'Brazilian Portuguese'),
         2 => Array('code' => 'bg',    'iconCls' => 'flags flag-bg',    'name' => 'Bulgarian'),
         3 => Array('code' => 'zh',    'iconCls' => 'flags flag-zh',    'name' => 'Chinese (Simplified)'),
         4 => Array('code' => 'hk',    'iconCls' => 'flags flag-hk',    'name' => 'Chinese (Hong Kong Cantonese)'),
         5 => Array('code' => 'tw',    'iconCls' => 'flags flag-tw',    'name' => 'Chinese (Traditional)'),
         6 => Array('code' => 'cs',    'iconCls' => 'flags flag-cs',    'name' => 'Czech'),
         7 => Array('code' => 'da',    'iconCls' => 'flags flag-da',    'name' => 'Danish'),
         8 => Array('code' => 'nl',    'iconCls' => 'flags flag-nl',    'name' => 'Dutch'),
         9 => Array('code' => 'en',    'iconCls' => 'flags flag-en',    'name' => 'English'),
        10 => Array('code' => 'fi',    'iconCls' => 'flags flag-fi',    'name' => 'Finnish'),
        11 => Array('code' => 'fr',    'iconCls' => 'flags flag-fr',    'name' => 'French'),
        12 => Array('code' => 'de',    'iconCls' => 'flags flag-de',    'name' => 'German'),
        13 => Array('code' => 'el',    'iconCls' => 'flags flag-el',    'name' => 'Greek'),
        14 => Array('code' => 'he',    'iconCls' => 'flags flag-he',    'name' => 'Hebrew'),
        15 => Array('code' => 'hu',    'iconCls' => 'flags flag-hu',    'name' => 'Hungarian'),
        16 => Array('code' => 'it',    'iconCls' => 'flags flag-it',    'name' => 'Italian'),
        17 => Array('code' => 'ja',    'iconCls' => 'flags flag-ja',    'name' => 'Japanese'),
        18 => Array('code' => 'kr',    'iconCls' => 'flags flag-kr',    'name' => 'Korean'),
        19 => Array('code' => 'no',    'iconCls' => 'flags flag-no',    'name' => 'Norwegian'),
        20 => Array('code' => 'fa',    'iconCls' => 'flags flag-fa',    'name' => 'Persian'),
        21 => Array('code' => 'pl',    'iconCls' => 'flags flag-pl',    'name' => 'Polish'),
        22 => Array('code' => 'pt',    'iconCls' => 'flags flag-pt',    'name' => 'Portuguese'),
        23 => Array('code' => 'ro',    'iconCls' => 'flags flag-ro',    'name' => 'Romanian'),
        24 => Array('code' => 'ru',    'iconCls' => 'flags flag-ru',    'name' => 'Russian'),
        25 => Array('code' => 'se',    'iconCls' => 'flags flag-se',    'name' => 'Serbian'),
        26 => Array('code' => 'sk',    'iconCls' => 'flags flag-sk',    'name' => 'Slovak'),
        27 => Array('code' => 'sl',    'iconCls' => 'flags flag-sl',    'name' => 'Slovenian'),
        28 => Array('code' => 'es',    'iconCls' => 'flags flag-es',    'name' => 'Spanish'),
        29 => Array('code' => 'sv',    'iconCls' => 'flags flag-fi',    'name' => 'Swedish'),
        30 => Array('code' => 'tr',    'iconCls' => 'flags flag-tr',    'name' => 'Turkish')
    );

    public $existingLanguage = array();

    private function __construct()
    {
    }

    public function getAvailableLanguage()
    {
        return $this->availableLang;
    }

    public function computeExistingLanguage()
    {
        $am      = AccountManager::getInstance();
        $appConf = $am->appConf;
        $project = $am->project;

        $this->existingLanguage = array();

        for( $i=0; $i < count($this->availableLang); $i++ ) {
            if( is_dir($appConf[$project]['vcs.path'].$this->availableLang[$i]['code'].'/') ) {
                $this->existingLanguage[] = $this->availableLang[$i];
            }
        }

        return $this->existingLanguage;
    }

    public function getExistingLanguage()
    {
        if( !isset($this->existingLanguage) || count($this->existingLanguage) == 0 ) {
            $this->computeExistingLanguage();
        }

        return $this->existingLanguage;
    }

    /**
     * Check if a lang is valide or not.
     * @param $lang The lang to check
     * @return Return true if $lang is a valid language, false otherwise.
     */
    public function isValidLanguage($lang)
    {
        $existLanguage = $this->getExistingLanguage();

        for( $i=0; $i < count($existLanguage); $i++ )
        {
            if( $existLanguage[$i]['code'] == $lang ) {
                return true;
            }
        }
        return false;

    }


    /**
     * Checkout the phpdoc-all repository.
     * This method must be call ONLY by the /firstRun.php script.
     */
    public function checkoutRepository()
    {
        $project = AccountManager::getInstance()->project;

        $lock = new LockFile('project_' . $project . '_lock_checkout_repository');

        if ($lock->lock()) {
            // exec the checkout
            VCSFactory::getInstance()->checkout();
        }

        $lock->release();
    }

    /**
     * CleanUp the dataBase before an Update.
     *
     * @see updateRepository
     */
    public function cleanUp()
    {
        $db      = DBConnection::getInstance();
        $project = AccountManager::getInstance()->project;

        // We cleanUp the database before update vcs and apply again all tools
        foreach (array('files', 'translators', 'errorfiles') as $table) {
            $db->query("DELETE FROM `$table` WHERE `project`='$project'");
            $db->query("OPTIMIZE TABLE `$table` ");
        }
    }

    /**
     * CleanUp the dataBase before check the build.
     * We only stock in DB the last failed build on a month.
     *
     * @see checkBuild
     */
    public function cleanUpBeforeCheckBuild()
    {
        $project = AccountManager::getInstance()->project;

        DBConnection::getInstance()->query("DELETE FROM `failedBuildLog` WHERE `project`= '$project' AND `date` < date_sub(now(),interval 1 month)");
    }


    /**
     * Update a single folder of the repository to sync our local copy.
     */
    public function updateFolder($path)
    {
        $db      = DBConnection::getInstance();
        $rf      = RepositoryFetcher::getInstance();
        $am      = AccountManager::getInstance();
        $project = $am->project;

        // We reset the session var
        unset($_SESSION['updateFolder']['newFolders']);
        unset($_SESSION['updateFolder']['newFiles']);

        // We search for the first folder ; can be en/ LANG/ or doc-base/ for example
        $t = explode("/", $path);
        $firstFolder = $t[1];

        array_shift($t);
        array_shift($t);

        $pathWithoutLang = '/' . implode("/", $t).'/';
        
        // If we are in the root folder, we have //. We must consider this case.
        if( $pathWithoutLang == '//' ) { $pathWithoutLang = '/'; }

        if( $firstFolder == "" ) {
            $firstFolder = 'root';
        }

        $lock = new LockFile('project_' . $project . '_' . $firstFolder . '_lock_update_folder');

        if ($lock->lock()) {

            if( $this->isValidLanguage($firstFolder) ) {

                // This is only for EN and LANG. For others, we don't make any version's comparaison.
                // We start be get files & folders in this folder to compare it after the update
                $actual = $rf->getFilesByDirectory($path);
                $actualFiles = $actualFolders = array();

                for( $i=0; $i < count($actual); $i++ ) {
                    // We get files and folders
                    if( $actual[$i]['type'] === 'folder' ) {
                        $actualFolders[$actual[$i]['text']] = array( "name"=> $actual[$i]['text'] );
                    } else {
                        $actualFiles[$actual[$i]['text']] = array( "name"=> $actual[$i]['text'], "version"=> "" );
                    }
                }
                
                // We get versions for this files
                while( list($k, $v) = each($actualFiles) ) {

                    $file = new File($firstFolder, $pathWithoutLang, $k);
                    $info = $file->getInfo();
                    $actualFiles[$k]['version'] = $info['rev'];
                    
                }
                
            }

            // We update the repository recursively
            VCSFactory::getInstance()->updateSingleFolder($path);

            if( $this->isValidLanguage($firstFolder) ) {
                // We throw the revCheck on this folder only if the langue is valide
                $this->applyRevCheck($pathWithoutLang, 'update', $firstFolder);

                // We get files under this folder to make comparaison after the update
                $now = $rf->getFilesByDirectory($path);
                $nowFiles = $nowFolders = array();

                for( $i=0; $i < count($now); $i++ ) {
                    // We get all folders & files
                    if( $now[$i]['type'] === 'folder' ) {
                        $nowFolders[$now[$i]['text']] = array( "name"=> $now[$i]['text'] );
                    } else {
                        $nowFiles[$now[$i]['text']] = array( "name"=> $now[$i]['text'], "version"=> "" );
                    }
                }

                // We get versions of this files
                while( list($k, $v) = each($nowFiles) )
                {
                    $file = new File($firstFolder, $pathWithoutLang, $k);
                    $info = $file->getInfo();
                    $nowFiles[$k]['version'] = $info['rev'];
                }

                debug(json_encode($nowFiles));
                debug(json_encode($actualFiles));
                
                // We search for differences
                reset($nowFiles); reset($nowFolders);
                while( list($k, $v) = each($nowFiles) ) {
                    // If the file exist before, and at the same version, we delete it from $nowFiles
                    if( isset($actualFiles[$k] ) && $actualFiles[$k]['version'] == $v['version'] ) {
                        unset($nowFiles[$k]);
                    }
                }
                while( list($k, $v) = each($nowFolders) ) {
                    // If the folder exist before, we delete it from $nowFolders
                    if( isset($actualFolders[$k] ) ) {
                        unset($nowFolders[$k]);
                    }
                }

                // $nowFolders contains only new folders who don't exist before the update
                // and $nowFiles, new files who don't exist before the update or who the version have changed

                // We store this result in session to allow get it if this processus take more than 30 seconds (max execution time)
                $_SESSION['updateFolder']['newFolders'] = $nowFolders;
                $_SESSION['updateFolder']['newFiles']   = $nowFiles;
            }

        }

        $lock->release();

        return json_encode($_SESSION['updateFolder']);
    }


    /**
     * Update the repository to sync our local copy.
     * As this exec command take some time, we start by creating a lock file, then run the command, then delete this lock file.
     * As it, we can test if this command has finish, or not.
     */
    public function updateRepository()
    {
        $project = AccountManager::getInstance()->project;

        $lock = new LockFile('project_' . $project . '_lock_update_repository');

        if ($lock->lock()) {
            // exec the update
            VCSFactory::getInstance()->update();
        }

        $lock->release();
    }

    /**
     * Check the build of the documentation (using configure.php script).
     * PHP binary should be in /usr/bin
     *
     * @param $lang The lang of the documentation we want to check the build. We must take out $lang to be able to use this method from cron script on multiple language
     * @param $enable_xml_details Indicate whether the checking includes xml-details
     * @return The output log.
     */
    public function checkBuild($lang, $enable_xml_details="false")
    {
        $am      = AccountManager::getInstance();
        $appConf = $am->appConf;
        $project = $am->project;

        $return = Array(
            "state"      => "ok",
            "logContent" => ""
        );

        $cmd = 'cd '.realpath($appConf[$project]['vcs.configure.script.path']).';'
              .'/usr/bin/php configure.php '
              .$appConf[$project]['vcs.configure.script.options'];

        $cmd = str_replace("{LangCode}", $lang, $cmd).';';

        if ( $enable_xml_details == "true" ) {
            $cmd = str_replace("{XmlDetails}", "--enable-xml-details", $cmd);
        } else {
            $cmd = str_replace("{XmlDetails}", "", $cmd);
        }

        $trial_threshold = 3;
        while ($trial_threshold-- > 0) {
            $output = array();
            exec($cmd, $output);
            if (strlen(trim(implode('', $output))) != 0) break;
        }

        $return["logContent"] = $output;

        // We save the result of this check only if it failed.
        if ( strstr(implode(" ", $output), 'Eyh man. No worries. Happ shittens. Try again after fixing the errors above.') ||
             strstr(implode(" ", $output), 'There were warnings loading the manual') )
        {
            $return["state"] = "ko";
        }

        return $return;
    }

    /**
     * Register a file as need to be commited, into the database.
     *
     * @param $file        The file object to be commited.
     * @param $revision    The revision of this file.
     * @param $en_revision The EN revision of this file.
     * @param $reviewed    The stats of the reviewed tag.
     * @param $maintainer  The maintainer.
     * @param $type        The type of commit. Can be 'new' for new file, 'update' for an uptaded file or 'delete' for a file marked as delete.
     * @return fileID of the file
     */
    public function addPendingCommit($file, $revision, $en_revision, $reviewed, $maintainer, $type='update')
    {
        $db       = DBConnection::getInstance();
        $am       = AccountManager::getInstance();
        $vcsLogin = $am->vcsLogin;
        $project  = $am->project;

        $s = sprintf(
            'SELECT id FROM `pendingCommit` WHERE `project`="%s" AND `lang`="%s" AND `path`="%s" AND `name`="%s"',
            $project,
            $file->lang, $file->path, $file->name
        );
        $r = $db->query($s);

        // We insert or update the pendingCommit table
        if ($r->num_rows == 0) {

            $s = sprintf(
                'INSERT into `pendingCommit` (`project`, `lang`, `path`, `name`, `revision`, `en_revision`, `reviewed`, `maintainer`, `modified_by`, `date`, `type`) VALUES ("%s", "%s", "%s", "%s", "%s", "%s", "%s", "%s", "%s", now(), "%s")',
                $project,
                $file->lang, $file->path, $file->name, $revision, $en_revision,
                $reviewed, $maintainer, $vcsLogin, $type
            );
            $db->query($s);
            $fileID = $db->insert_id();

        } else {

            $a = $r->fetch_object();

            $s = sprintf(
                'UPDATE `pendingCommit` SET `revision`="%s", `en_revision`="%s", `reviewed`="%s", `maintainer`="%s" WHERE id="%s"',
                $revision, $en_revision, $reviewed, $maintainer, $a->id
            );
            $db->query($s);
            $fileID = $a->id;
        }

        return $fileID;
    }


    /**
     * Remove the mark "needCommit" into DB for a set of files.
     *
     * @param $files An array of File instances.
     */
    public function delPendingCommit($files)
    {
        $db       = DBConnection::getInstance();
        $am       = AccountManager::getInstance();
        $project  = $am->project;
    
        for ($i = 0; $i < count($files); $i++) {
            $query = sprintf('DELETE FROM `pendingCommit`
                WHERE
                    `project` = "%s" AND
                    `lang` = "%s" AND
                    `path` = "%s" AND
                    `name` = "%s"',
                $project,
                $files[$i]->lang, $files[$i]->path, $files[$i]->name
            );
            $db->query($query);
        }
    }

    /**
     * Register a new patch, into the database.
     *
     * @param $file  The file object of the patch
     * @param $email The email of the user who propose this patch.
     * @return Patch unique Id.
     */
    public function addPendingPatch($file, $email)
    {
        $am       = AccountManager::getInstance();
        $vcsLogin = $am->vcsLogin;
        $project  = $am->project;

        $uniqID = md5(uniqid(rand(), true));

        $s = sprintf(
            'INSERT into `pendingPatch` (`project`, `lang`, `path`, `name`, `posted_by`, `date`, `email`, `uniqID`) VALUES ("%s", "%s", "%s", "%s", "%s", now(), "%s", "%s")',
            $project,
            $file->lang, $file->path, $file->name, $vcsLogin, $email, $uniqID
        );
        DBConnection::getInstance()->query($s);

        return $uniqID;
    }

    /**
     * Mark a file as pending delete.
     *
     * @param $file File instance
     * @return Array of info include record_id, request_user, date
     */
    public function addPendingDelete($file)
    {
        $db       = DBConnection::getInstance();
        $am       = AccountManager::getInstance();
        $vcsLogin = $am->vcsLogin;
        $project  = $am->project;

        $date = @date("Y-m-d H:i:s");

        $s = sprintf(
            'INSERT INTO `pendingCommit`
                (`project`, `lang`, `path`, `name`, `revision`, `en_revision`, `reviewed`, `maintainer`, `modified_by`, `date`, `type`)
            VALUES
                ("%s", "%s", "%s", "%s", "-", "-", "-", "-", "%s", "%s", "delete")',
            $project,
            $file->lang, $file->path, $file->name,
            $vcsLogin,
            $date
        );
        $db->query($s);

        return array(
            'id'   => $db->insert_id(),
            'by'   => $vcsLogin,
            'date' => $date
        );
    }

    /**
     * Update the VCS for each file we try to commit before start the commit processus.
     * As it, we ensure all VCS conflict.
     *
     * @param $files All files to check
     * @param $type Type of this file. Can be "new", "update", or "delete"
     * @return Return the stack of files we must commit. All files witch can't be commited have been deleted from this stack
     */
    public function beforeCommitChanges($files, $type)
    {
        $am      = AccountManager::getInstance();
        $appConf = $am->appConf;
        $project = $am->project;

        $stack = Array();

        switch($type) {

            case 'new' :

                // For new files, we must ensure that this file is steel non exist into the repository before commit it.
                for( $i=0; $i < count($files); $i++ ) {

                    $updateResponse = VCSFactory::getInstance()->updateSingleFile(
                        $files[$i]->lang,
                        $files[$i]->path,
                        $files[$i]->name
                    );

                    if( $updateResponse ) {

                        // This file exist in the repository ! We can't commit it as a new file now.
                        // We must update this file into the app, and suppress it from this commit process

                        // Delete this new file from the fileSystem
                        @unlink($appConf[$project]['vcs.path'].$files[$i]->lang.'/'.$files[$i]->path.'/'.$files[$i]->name.'.new');
                        // Delete from pendingCommit table
                        $tmp = Array();
                        $tmp[0] = $files[$i];

                        $this->delPendingCommit($tmp);
                        // We must now update information into the app for this new file
                        $this->updateFileInfo($tmp);

                    } else {
                        // This file steel non exist into the current respository, we can commit it
                        $stack[] = $files[$i];
                    }

                }

                break;

            case 'update' :

                // For update files, we must ensure that this file haven't been modified since last big update
                for( $i=0; $i < count($files); $i++ ) {

                    // We get the filemtime for this file to compare with the filemtime after the update.
                    $oldTime = filemtime($appConf[$project]['vcs.path'].$files[$i]->lang.'/'.$files[$i]->path.'/'.$files[$i]->name);

                    $updateResponse = VCSFactory::getInstance()->updateSingleFile(
                        $files[$i]->lang,
                        $files[$i]->path,
                        $files[$i]->name
                    );

                    if( $updateResponse ) {

                        // If this file haven't been deleted since last big update, $updateResponse should return true
                        $newTime = filemtime($appConf[$project]['vcs.path'].$files[$i]->lang.'/'.$files[$i]->path.'/'.$files[$i]->name);


                        if( $newTime != $oldTime ) {

                            // This file have been modified since last big update.
                            // We can't commit our change, or this file will be mark as conflict into VCS
                            // We just update the info for this file and skip it from this commit process

                            $tmp = Array();
                            $tmp[0] = $files[$i];
                            $this->delPendingCommit($tmp);
                            // We must now update information into the app for this file
                            $this->updateFileInfo($tmp);

                        } else {

                            // This file haven't been modified since last big update.
                            // We can continue the commit processus for it
                            $stack[] = $files[$i];

                        }

                    } else {

                        // Here, we try to update a file witch have been deleted since last bug update
                        // We delete our .new, and remove all reference for it from the DB

                        // Delete this new file from the fileSystem
                        @unlink($appConf[$project]['vcs.path'].$files[$i]->lang.'/'.$files[$i]->path.'/'.$files[$i]->name.'.new');

                        // Delete from pendingCommit table
                        $tmp = Array();
                        $tmp[0] = $files[$i];

                        $this->delPendingCommit($tmp);

                    }

                }

                break;

            case 'delete' :

                // For deleted files, we must ensure that this file is steel exist into the repository before commit it.
                for( $i=0; $i < count($files); $i++ ) {

                    $updateResponse = VCSFactory::getInstance()->updateSingleFile(
                        $files[$i]->lang,
                        $files[$i]->path,
                        $files[$i]->name
                    );

                    if( $updateResponse ) {

                        // This file steel exist into the current respository, we can commit it for deletion
                        $stack[] = $files[$i];


                    } else {

                        // This file don't exist in the repository ! We can't commit it as a deleted file now.
                        // We must update this file into the app, and suppress it from this commit process

                        // Delete from pendingCommit table
                        $tmp = Array();
                        $tmp[0] = $files[$i];

                        $this->delPendingCommit($tmp);

                        // Remove this files from the repository
                        $this->delFiles($tmp);

                    }

                }

                break;

        }

        return $stack;

    }

    /**
     * Commit file changes to repository.
     *
     * @param $ids An array of files' id to be commited.
     * @param $log The message log to use with this commit.
     * @return An associated array. The key "commitResponse" contains the response from the CVS server after commit (with HTML highlight) and the key "anode", the list of files witch have been really commited.
     */
    public function commitChanges($ids, $log)
    {
        $rf        = RepositoryFetcher::getInstance();
        $commitLog = Array();

        // Task for folders
        $foldersInfos = $rf->getPendingFoldersCommit();

        if( $foldersInfos ) {
            $c = VCSFactory::getInstance()->commitFolders($foldersInfos);
            $commitLog = array_merge($commitLog, $c);
            $this->delPendingCommit($foldersInfos);
        }

        // Task for files
        $fileInfos   = $rf->getModifiesById($ids);
        // Loop over $fileInfos to find files to be create, update or delete
        $create_stack = array();
        $update_stack = array();
        $delete_stack = array();

        for( $i=0; $i < count($fileInfos); $i++) {
            $f = new File(
                $fileInfos[$i]['lang'],
                $fileInfos[$i]['path'],
                $fileInfos[$i]['name']
            );
            switch ($fileInfos[$i]['type']) {
                case 'new'    : $create_stack[] = $f; break;
                case 'update' : $update_stack[] = $f; break;
                case 'delete' : $delete_stack[] = $f; break;
            }
        }

        // Before commit, we need to update this file to find if there haven't been modified since last update process
        $create_stack = $this->beforeCommitChanges($create_stack, 'new');
        $update_stack = $this->beforeCommitChanges($update_stack, 'update');
        $delete_stack = $this->beforeCommitChanges($delete_stack, 'delete');

        $c = VCSFactory::getInstance()->commit(
            $log, $create_stack, $update_stack, $delete_stack
        );
        $commitLog = array_merge($commitLog, $c);

        // html highlight commit log
        $reg = array(
            '/(Adding )/',
            '/(Sending )/',
            '/(Deleting )/',
            '/(Transmitting file data)/',
            '/(Committed revision)/',
            '/(A )/',
            '/(D )/',
            '/(property )/',
            '/( set on )/'
        );

        $commitLog = preg_replace(
            $reg,
            '<span style="color: #15428B; font-weight: bold;">$1</span>',
            $commitLog
        );

        // We fetch again the file witch have been commited. All file witch have been skip from beforeCommitChanges haren't into DB for now.
        $fileInfos   = $rf->getModifiesById($ids);

        // Get all ids witch have been really commited
        $ids = Array();
        for( $i=0; $i < count($fileInfos); $i ++ ) {
            $ids[] = $fileInfos[$i]['id'];
        }

        return Array(
            'commitResponse' => $commitLog,
            'anode' => $ids
        );
    }

    /**
     * clear local change of a file.
     *
     * @param $type The type of the file. Can be 'update', 'delete' or 'new'
     * @param $file The File instance of the file.
     * @return An array which contain informations about this file.
     */
    public function clearLocalChange($type, $file)
    {
        $db      = DBConnection::getInstance();
        $am      = AccountManager::getInstance();
        $appConf = $am->appConf;
        $project = $am->project;

        $lang = $file->lang;
        $path = $file->path;
        $name = $file->name;

        // Initiate return's var
        $return = array();
        $return['rev']        = 0;
        $return['en-rev']     = 0;
        $return['maintainer'] = 0;
        $return['reviewed']   = 0;
        $return['errorState'] = false;
        $return['errorFirst'] = 0;

        // We need select row from pendingCommit table
        $s = "SELECT `id` FROM `pendingCommit`
              WHERE `project`='$project' AND `lang`='$lang' AND `path`='$path' AND `name`='$name'";
        $r = $db->query($s);
        $a = $r->fetch_object();

        // We need delete row from pendingCommit table
        $s = 'DELETE FROM `pendingCommit` WHERE `id`="' .$a->id. '"';
        $db->query($s);

        // If type == delete, we stop here and return
        if ($type == 'delete') {
            return $return;
        }

        // We need delete file on filesystem (for new & update)
        $doc = $file->full_path.'.new';
        @unlink($doc);

        // If type == new, we stop here and return
        if ($type == 'new') {
            return $return;
        }

        // We need check for error in this file
        $en_content   = file_get_contents($appConf[$project]['vcs.path'].'en' .$path.$name);
        $lang_content = file_get_contents($appConf[$project]['vcs.path'].$lang.$path.$name);

        $info = $file->getInfo($lang_content);
        $anode[0] = array(
            'lang'         => $lang,
            'path'         => $path,
            'name'         => $name,
            'en_content'   => $en_content,
            'lang_content' => $lang_content,
            'maintainer'   => $info['maintainer']
        );

        $errorTools = new ToolsError();
        $error = $errorTools->updateFilesError($anode, 'nocommit');

        // We need reload original information
        $s = "SELECT `revision`, `en_revision`, `maintainer`, `reviewed` FROM `files`
              WHERE `project`='$project' AND `lang`='$lang' AND `path`='$path' AND `name`='$name'";
        $r = $db->query($s);
        $a = $r->fetch_object();

        $return['rev']        = $a->revision;
        $return['en-rev']     = $a->en_revision;
        $return['maintainer'] = $a->maintainer;
        $return['reviewed']   = $a->reviewed;

        if (isset($error['first'])) {
            $return['errorState'] = true;
            $return['errorFirst'] = $error['first'];
        } else {
            $return['errorState'] = false;
            $return['errorFirst'] = '-No error-';
        }

        // We return original lang_revision & maintainer
        return $return;
    }

    /**
     * Set the last update datetime into DB
     * @param $type Can be "data" or "entities"
     */
    public function setLastUpdate($type)
    {
        $am       = AccountManager::getInstance();
        $vcsLogin = $am->vcsLogin;
        $project  = $am->project;

        $vcsLogin = isset($vcsLogin)
                    ? $vcsLogin : '-';

        $value = array();
        $value['date'] = @date("Y-m-d H:i:s");
        $value['by']   = $vcsLogin;

        $this->setStaticValue('last_update_'.$type, '-', json_encode($value));
    }

    /**
     * All we must do after a patch have been accepted.
     *
     * @param $uniqID ID of the accepted patch.
     */
    public function postPatchAccept($uniqID)
    {
        $am       = AccountManager::getInstance();
        $appConf  = $am->appConf;
        $project  = $am->project;
        $vcsLogin = $am->vcsLogin;

        $s = "SELECT * FROM `pendingPatch` WHERE `uniqID` = '$uniqID'";
        $r = DBConnection::getInstance()->query($s);
        $a = $r->fetch_object();

        // We need to send an email ?
        if (trim($a->email) != '' ) {

            // We get the diff content to include it into the email
            $file = new File($a->lang, $a->path, $a->name);
            $patchContent = $file->rawDiff(true, $uniqID);

            $to      = trim($a->email);
            $subject = '['.$project.'-DOC] - Patch accepted for '.$a->lang.$a->path.$a->name;
            $msg     = <<<EOD
Your patch was accepted and applied to the $project Manual.

Since the online and downloadable versions of the documentation need some
time to get updated, we would like to ask you to be a bit patient.

Here is the content of your patch :

$patchContent

Thank you for your submission, and for helping us make our documentation better.

--
{$vcsLogin}@php.net
EOD;
            $am->email($to, $subject, $msg);
        }

        @unlink($appConf[$project]['vcs.path'].$a->lang.$a->path.$a->name.'.'.$a->uniqID.'.patch');
        $s = sprintf('DELETE FROM `pendingPatch` WHERE `id` = "%s"', $a->id);
        DBConnection::getInstance()->query($s);
    }

    /**
     * All we must do after a patch have been rejected.
     *
     * @param $PatchUniqID ID of the accepted patch.
     */
    public function postPatchReject($uniqID)
    {
        $am       = AccountManager::getInstance();
        $appConf  = $am->appConf;
        $project  = $am->project;
        $vcsLogin = $am->vcsLogin;

        $s = "SELECT * FROM `pendingPatch` WHERE `uniqID` = '$uniqID'";
        $r = DBConnection::getInstance()->query($s);
        $a = $r->fetch_object();

        // We need to send an email ?
        if (trim($a->email) != '' ) {

            // We get the diff content to include it into the email
            $file = new File($a->lang, $a->path, $a->name);
            $patchContent = $file->rawDiff(true, $uniqID);

            $to      = trim($a->email);
            $subject = '[PHP-DOC] - Patch Rejected for '.$a->lang.$a->path.$a->name;
            $msg     = <<<EOD
Your following patch was rejected from the PHP Manual.

Here is the content of your patch :

$patchContent

Thank you for your submission.

--
{$vcsLogin}@php.net
EOD;
            $am->email($to, $subject, $msg);
        }

        @unlink($appConf[$project]['vcs.path'].$a->lang.$a->path.$a->name.'.'.$a->uniqID.'.patch');
        $s = sprintf('DELETE FROM `pendingPatch` WHERE `id` = "%s"', $a->id);
        DBConnection::getInstance()->query($s);
    }

    /**
     * Update information about a file after commit (update informations added with revcheck tools).
     *
     * @param $files An array of File instances for info update.
     */
    public function updateFileInfo($files)
    {

        $db = DBConnection::getInstance();
        $am = AccountManager::getInstance();

        foreach ($files as $file) {

            $info    = $file->getInfo();
            $size    = intval(filesize($file->full_path) / 1024);
            $date    = filemtime($file->full_path);

            if ($file->lang == 'en') { // en file
                // update EN file info
                $s = sprintf(
                    'UPDATE `files`
                        SET
                            `xmlid`    = "%s",
                            `revision` = "%s",
                            `size`     = "%s",
                            `mdate`    = "%s"
                        WHERE
                            `project` = "%s" AND
                            `lang` = "%s" AND
                            `path` = "%s" AND
                            `name` = "%s"',
                    $info['xmlid'], $info['rev'], $size, $date, $am->project, $file->lang, $file->path, $file->name
                );
                $db->query($s);

                // update LANG file info
                $s = sprintf(
                    'UPDATE `files`
                        SET
                            `en_revision` = "%s"
                        WHERE
                            `project` = "%s" AND
                            `lang` != "%s" AND
                            `path`  = "%s" AND
                            `name`  = "%s"',
                    $info['rev'], $am->project, $file->lang, $file->path, $file->name
                );
                $db->query($s);

            } else { // lang file

                // If this file don't exist in EN, we should skip all this proces
                $en = new File('en', $file->path, $file->name);

                if( $en->fileExist() ) {

                    $enInfo    = $en->getInfo();

                    $sizeEN    = intval(filesize($en->full_path) / 1024);
                    $dateEN    = filemtime($en->full_path);

                    $size_diff = $sizeEN - $size;
                    $date_diff = (intval((time() - $dateEN) / 86400))
                               - (intval((time() - $date)   / 86400));

                    // update LANG file info
                    $s = sprintf(
                        'UPDATE `files`
                            SET
                                `xmlid`      = "%s",
                                `revision`   = "%s",
                                `en_revision`= "%s",
                                `reviewed`   = "%s",
                                `size`       = "%s",
                                `mdate`      = "%s",
                                `maintainer` = "%s",
                                `status`     = "%s",
                                `size_diff`  = "%s",
                                `mdate_diff` = "%s"
                            WHERE
                                `project` = "%s" AND
                                `lang` = "%s" AND
                                `path` = "%s" AND
                                `name` = "%s"',
                        $info['xmlid'], $info['en-rev'], $enInfo['rev'], trim($info['reviewed']), $size, $date,
                        trim($info['maintainer']), trim($info['status']),   $size_diff,
                        $date_diff, $am->project, $file->lang, $file->path, $file->name
                    );
                    $db->query($s);

                    // Run the errorTools under this file
                    $tmpFile[0]['en_content']   = $en->read(true);
                    $tmpFile[0]['lang_content'] = $file->read(true);
                    $tmpFile[0]['lang']         = $file->lang;
                    $tmpFile[0]['path']         = $file->path;
                    $tmpFile[0]['name']         = $file->name;
                    $tmpFile[0]['maintainer']   = $info['maintainer'];

                    $errorTools = new ToolsError();
                    $errorTools->updateFilesError($tmpFile);

                } else // This file exist only in LANG version, like translation.xml, for example
                {

                    // update LANG file info
                    $s = sprintf(
                        'UPDATE `files`
                            SET
                                `xmlid`      = "%s",
                                `revision`   = "%s",
                                `en_revision`= "%s",
                                `reviewed`   = "%s",
                                `size`       = "%s",
                                `mdate`      = "%s",
                                `maintainer` = "%s",
                                `status`     = "%s",
                                `size_diff`  = "%s",
                                `mdate_diff` = "%s"
                            WHERE
                                `project` = "%s" AND
                                `lang` = "%s" AND
                                `path` = "%s" AND
                                `name` = "%s"',
                        $info['xmlid'], $info['en-rev'], 0, trim($info['reviewed']), $size, $date,
                        trim($info['maintainer']), trim($info['status']),   0,
                        0, $am->project, $file->lang, $file->path, $file->name
                    );
                    $db->query($s);

                    // Run the errorTools under this file
                        // If the EN file don't exist, it's because we have a file witch only exist into LANG, for example, translator.xml
                        // We fake the EN with the LANG content to fake the errorTools ;)
                    $tmpFile[0]['en_content']   = $file->read(true);
                    $tmpFile[0]['lang_content'] = $file->read(true);
                    $tmpFile[0]['lang']         = $file->lang;
                    $tmpFile[0]['path']         = $file->path;
                    $tmpFile[0]['name']         = $file->name;
                    $tmpFile[0]['maintainer']   = $info['maintainer'];

                    $errorTools = new ToolsError();
                    $errorTools->updateFilesError($tmpFile);

                }
            }
        }
    }

    /**
     * Read the translation's file which hold informations about all translators
     * and put it into database.
     */
    public function updateTranslatorInfo()
    {
        $ExistingLanguage = $this->getExistingLanguage();
        $db = DBConnection::getInstance();
        $am = AccountManager::getInstance();

        foreach ($ExistingLanguage as $lang) {

            $lang = $lang["code"];
            $txml = false;

            // Path to find translation.xml file, set default values,
            // in case we can't find the translation file
            $translation_xml = new File($lang, '/', 'translation.xml');

            if ( file_exists($translation_xml->full_path) ) {
                // Else go on, and load in the file, replacing all
                // space type chars with one space
                $txml = preg_replace('/\\s+/', ' ', $translation_xml->read(true));
            }

            if ( $txml ) {
                // Find all persons matching the pattern
                $matches = array();
                if (preg_match_all('!<person (.+)/\\s?>!U', $txml, $matches)) {
                    $default = array(
                        'vcs'    => 'n/a',
                        'nick'   => 'n/a',
                        'editor' => 'n/a',
                        'email'  => 'n/a',
                        'name'   => 'n/a'
                    );
                    $persons = $translation_xml->parseAttribute($matches[1]);
                    $charset = $translation_xml->getEncoding($txml);

                    foreach ($persons as $person) {

                        if ($charset == 'utf-8' ) {
                            $name = utf8_decode($person['name']);
                        } else {
                            $name = $person['name'];
                        }

                        $person = array_merge($default, $person);

                        // We try to remove this record if it exist
                        $query = sprintf(
                            'DELETE FROM `translators` WHERE `project`="%s" AND `lang`="%s" AND `nick`="%s"',
                            $am->project,
                            $lang,
                            $db->real_escape_string($person['nick'])
                        );
                        $db->query($query);

                        $query = sprintf(
                            'INSERT INTO `translators` (`project`, `lang`, `nick`, `name`, `mail`, `vcs`, `editor`)
                             VALUES ("%s", "%s", "%s", "%s", "%s", "%s", "%s")',
                            $am->project,
                            $lang,
                            $db->real_escape_string($person['nick']),
                            $db->real_escape_string($name),
                            $db->real_escape_string($person['email']),
                            $db->real_escape_string($person['vcs']),
                            $db->real_escape_string($person['editor'])
                        );
                        $db->query($query);

                    }
                }
            }
        }
    }

    /**
     * Check is the File/Folder must be processed or not for certain operation.
     *
     * @param $file The checked File instance.
     * @return True if the File/Folder must be processed, FALSE otherwise.
     */
    private function needParsing($file)
    {
        $name = $file->name;
        $path = $file->path;
        if (
            (!is_dir($file->full_path) && !in_array(substr($name, -3), array('xml','ent'))
                && substr($name, -13) != 'PHPEditBackup')
            || strpos($name, 'entities.') === 0
            || $path == '/chmonly/' || $path == '/internals/' || $path == '/internals2/'
            || $name == 'contributors.ent' || $name == 'contributors.xml'
            || ($path == '/appendices/' && ($name == 'reserved.constants.xml' || $name == 'extensions.xml'))
            || $name == 'README' || $name == 'DO_NOT_TRANSLATE' || $name == 'rsusi.txt'
            || $name == 'translation.xml' || $name == 'missing-ids.xml'
            || $name == 'license.xml' || $name == 'versions.xml'
        ) {
            return false;
        } else {
            return true;
        }
    }

    /**
     * Run doUpdateNotInEN() on every avaliable language.
     * Check all files to see if the LANG files is present into EN tree or not.
     */
    public function updateNotInEN()
    {
        $ExistingLanguage = $this->getExistingLanguage();

        foreach ($ExistingLanguage as $lang) {
            $this->doUpdateNotInEN('/', $lang["code"]);
        }
    }
    /**
     * Check all files to see if the LANG files is present into EN tree or not.
     *
     * @param $path The path to checking directory.
     * @param $lang The tested lang.
     */
    private function doUpdateNotInEN($path, $lang)
    {
        $am      = AccountManager::getInstance();
        $appConf = $am->appConf;
        $project = $am->project;

        if ($dh = @opendir($appConf[$project]['vcs.path'].$lang.$path)) {

            $dirs  = array();
            $files = array();

            while (($name = readdir($dh)) !== false) {
                $file = new File($lang, $path, $name);
                if (!$this->needParsing($file)) {
                    continue;
                }
                if ($name != '.' && $name != '..' && $name != '.svn' && $path != '/functions/') {
                    if (is_dir($file->full_path)) {
                        $dirs[] = $file;
                    } elseif (is_file($file->full_path)) {
                        $files[] = $file;
                    }
                }
            }

            foreach($files as $f) {
                $en_file   = $appConf[$project]['vcs.path'] .'en'  .$f->path .$f->name;
                $lang_file = $appConf[$project]['vcs.path'] .$lang .$f->path .$f->name;

                if (!@is_file($en_file)) {
                    $query = sprintf(
                        'INSERT INTO `files` (`project`, `lang`, `path`, `name`, `status`)
                         VALUES ("%s", "%s", "%s", "%s", "%s")',
                        $project,
                        $lang, $f->path, $f->name, 'NotInEN'
                    );
                    DBConnection::getInstance()->query($query);
                }
            }

            foreach ($dirs as $d) {
                $this->doUpdateNotInEN($d->path.$d->name.'/', $lang);
            }
        }
        @closedir($dh);
    }

    /**
     * Apply the Revcheck tools recursively on all lang
     *
     * @param $path    The directory from which we start.
     * @param $revType Can be 'new' when we start a new revcheck with a clean database or 'update' when we revcheck just one folder (and all is sub-folders). Default to 'new'
     * @param $revLang The lang we want to apply the recheck. By default, it's 'all' lang available.
     * @return Nothing.
     */
    public function applyRevCheck($path = '/', $revType='new', $revLang='all')
    {
        $db      = DBConnection::getInstance();
        $am      = AccountManager::getInstance();
        $appConf = $am->appConf;
        $project = $am->project;

        if ($dh = @opendir($appConf[$project]['vcs.path'].'en'.$path)) {

            $dirs  = array();
            $files = array();

            while (($name = readdir($dh)) !== false) {

                $file = new File('en', $path, $name);
                if (!$this->needParsing($file)) {
                    continue;
                }

                if ($name != '.' && $name != '..' && $name != '.svn' && $path != '/functions/') {
                    if (is_dir($file->full_path)) {
                        $dirs[] = $file;
                    } elseif (is_file($file->full_path)) {
                        $files[] = $file;
                    }
                }
            }

            foreach($files as $f) {

                $en_size = intval(filesize($f->full_path) / 1024);
                $en_date = filemtime($f->full_path);

                $infoEN      = $f->getInfo();
                $en_revision = ($infoEN['rev']   == 'NULL') ? 'NULL' : $infoEN['rev'];
                $xmlid       = ($infoEN['xmlid'] == 'NULL') ? 'NULL' : $infoEN['xmlid'];

                $tmp = explode('/', $f->path);

                // Only for Php project
                if( $project == 'PHP' ) {
                    $check_doc = new ToolsCheckDoc();
                    $ToolsCheckDocResult = $check_doc->checkDoc($infoEN['content'], $f->path);
                } else {
                    $ToolsCheckDocResult['check_oldstyle']       = 'NULL';
                    $ToolsCheckDocResult['check_undoc']          = 'NULL';
                    $ToolsCheckDocResult['check_roleerror']      = 'NULL';
                    $ToolsCheckDocResult['check_badorder']       = 'NULL';
                    $ToolsCheckDocResult['check_noseealso']      = 'NULL';
                    $ToolsCheckDocResult['check_noreturnvalues'] = 'NULL';
                    $ToolsCheckDocResult['check_noparameters']   = 'NULL';
                    $ToolsCheckDocResult['check_noexamples']     = 'NULL';
                    $ToolsCheckDocResult['check_noerrors']       = 'NULL';
                }

                // If the type of this revcheck is an update, we start to remove all reference to this file from...
                if( $revType == 'update' )
                {
                    //... table `files`
                    $query = sprintf(
                            'DELETE FROM `files`
                             WHERE `project`="%s" AND
                                   `lang`="%s" AND
                                   `path`="%s" AND
                                   `name`="%s"',
                            $am->project, 'en', $f->path, $f->name
                            );
                    $db->query($query);

                    //... table `errorfiles`
                    $query = sprintf(
                            'DELETE FROM `errorfiles`
                             WHERE `project`="%s" AND
                                   `lang`="%s" AND
                                   `path`="%s" AND
                                   `name`="%s"',
                            $am->project, 'en', $f->path, $f->name
                            );
                    $db->query($query);
                }

                // Sql insert.
                $query = sprintf(
                    'INSERT INTO `files` (`project`, `lang`, `xmlid`, `path`, `name`, `revision`, `size`, `mdate`, `maintainer`, `status`, `check_oldstyle`,  `check_undoc`, `check_roleerror`, `check_badorder`, `check_noseealso`, `check_noreturnvalues`, `check_noparameters`, `check_noexamples`, `check_noerrors`)
                        VALUES ("%s", "%s", "%s", "%s", "%s", "%s", %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)',
                    $am->project,
                    'en', $xmlid, $f->path, $f->name, $en_revision, $en_size, $en_date, 'NULL', 'NULL',
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
                $db->query($query);

                $error = new ToolsError();
                $error->setParams($infoEN['content'], '', 'en', $f->path, $f->name, '');
                $error->run();
                $error->saveError();


                if( $revType == 'update' )
                {
                    // If we are in update, we have 2 case. $revLang can be en or LANG.
                    // If revLang is en, we must re-check all available language to reflect changes.
                    if( $revLang == 'en' ) {
                        $ExistingLanguage = $this->getExistingLanguage();
                    }
                    // If revLang is LANG, we only re-check this LANG
                    else {
                        $ExistingLanguage[] = array("code" => $revLang);
                    }
                } else {
                    // If this is not an update, we check all languages
                    $ExistingLanguage = $this->getExistingLanguage();
                }

                foreach($ExistingLanguage as $lang) {

                    $lang = $lang["code"];

                    // We skip en language
                    if( $lang == 'en' ) {
                        continue;
                    }

                    $lang_file = new File($lang, $f->path, $f->name);

                    // If the type of this revcheck is an update, we start be delete all reference to this file in table...
                    if( $revType == 'update' )
                    {
                        // ... `file`
                        $query = sprintf(
                                'DELETE FROM `files`
                                 WHERE `project`="%s" AND
                                       `lang`="%s" AND
                                       `path`="%s" AND
                                       `name`="%s"',
                                $project, $lang, $lang_file->path, $lang_file->name
                                );
                        $db->query($query);

                        //... table `errorfiles`
                        $query = sprintf(
                                'DELETE FROM `errorfiles`
                                 WHERE `project`="%s" AND
                                       `lang`="%s" AND
                                       `path`="%s" AND
                                       `name`="%s"',
                                $project, $lang, $lang_file->path, $lang_file->name
                                );
                        $db->query($query);
                    }

                    if (is_file($lang_file->full_path)) {

                        // Initial revcheck method
                        $size = intval(filesize($lang_file->full_path) / 1024);
                        $date = filemtime($lang_file->full_path);

                        $size_diff = $en_size - $size;
                        $date_diff = (intval((time() - $en_date) / 86400)) - (intval((time() - $date) / 86400));

                        $infoLANG   = $lang_file->getInfo();
                        $revision   = ($infoLANG['en-rev']     == 'NULL') ? 'NULL' : $infoLANG['en-rev'];
                        $maintainer = ($infoLANG['maintainer'] == 'NULL') ? 'NULL' : $infoLANG['maintainer'];
                        $status     = ($infoLANG['status']     == 'NULL') ? 'NULL' : $infoLANG['status'];
                        $xmlid      = ($infoLANG['xmlid']      == 'NULL') ? 'NULL' : $infoLANG['xmlid'];
                        $reviewed   = ($infoLANG['reviewed']   == 'NULL') ? 'NULL' : $infoLANG['reviewed'];

                        $query = sprintf(
                            'INSERT INTO `files` (`project`, `lang`, `xmlid`, `path`, `name`, `revision`, `en_revision`, `reviewed`, `size`, `size_diff`, `mdate`, `mdate_diff`, `maintainer`, `status`)
                                VALUES ("%s", "%s", "%s", "%s", "%s", "%s", "%s", "%s", %s, %s, %s, %s, "%s", "%s")',
                            $project,
                            $lang, $xmlid, $lang_file->path, $lang_file->name,
                            $revision, $en_revision, $reviewed,
                            $size, $size_diff, $date, $date_diff,
                            $maintainer, $status
                        );
                        $db->query($query);

                        // Check for error in this file ONLY if this file is uptodate
                        if ($revision == $en_revision &&  $revision != 0 ) {
                            $error = new ToolsError();
                            $error->setParams(
                                $infoEN['content'], $infoLANG['content'],
                                $lang, $lang_file->path, $lang_file->name, $maintainer
                            );
                            $error->run();
                            $error->saveError();
                        }
                    } else {
                        $query = sprintf(
                            'INSERT INTO `files` (`project`, `lang`, `path`, `name`, `size`)
                                VALUES ("%s", "%s", "%s", "%s", %s)',
                            $project,
                            $lang,
                            $lang_file->path,
                            $lang_file->name,
                            $en_size
                        );
                        $db->query($query);
                    }
                }
            }

            foreach ($dirs as $d) {
                $this->applyRevCheck($d->path.$d->name.'/', $revType, $revLang);
            }
        }
        @closedir($dh);
    }

    /**
     * Remove a file from DB
     *
     * @param $files An array of File instances.
     * @return Nothing.
     */
    public function delFiles($files)
    {
    
        for ($i = 0; $i < count($files); $i++) {
            $query = sprintf('DELETE FROM files
                WHERE
                    `project` = "%s" AND
                    `lang` = "%s" AND
                    `path` = "%s" AND
                    `name` = "%s"',
                AccountManager::getInstance()->project,
                $files[$i]->lang, $files[$i]->path, $files[$i]->name
            );
            DBConnection::getInstance()->query($query);
        }
    }

    /**
     * Set a static value into DB
     *
     * @param $type The type of this value
     * @param $field The name of the field for this value
     * @param $value The value. Can be anything who can be store into a SQL TEXT field
     * @param $forceNew TRUE to indicate that this value must be added e.g. not updated. By default, the value is updated.
     * @return Nothing.
     */
    public function setStaticValue($type, $field, $value, $forceNew=false)
    {
        $db      = DBConnection::getInstance();
        $project = AccountManager::getInstance()->project;

        $s = "SELECT id FROM staticValue WHERE
              `project` = '".$project."' AND
              `type`    = '".$type."' AND
              `field`   = '".$field."'
             ";
        $r = $db->query($s);

        if( $r->num_rows == 0 || $forceNew) {
            $s = "INSERT INTO staticValue (`project`, `type`, `field`, `value`, `date`) VALUES ('".$project."' , '".$type."' , '".$field."', '".$db->real_escape_string($value)."', now())";
            $db->query($s);
        } else {
            $a = $r->fetch_object();
            $s = "UPDATE staticValue SET `value`= '".$db->real_escape_string($value)."', `date`=now() WHERE `id`='".$a->id."'";
            $db->query($s);
        }
    }
}

?>
