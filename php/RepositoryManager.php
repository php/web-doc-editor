<?php

require_once dirname(__FILE__) . '/LockFile.php';
require_once dirname(__FILE__) . '/File.php';
require_once dirname(__FILE__) . '/DBConnection.php';
require_once dirname(__FILE__) . '/AccountManager.php';
require_once dirname(__FILE__) . '/VCSFactory.php';
require_once dirname(__FILE__) . '/ToolsError.php';
require_once dirname(__FILE__) . '/ToolsCheckDoc.php';

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
        'ar', 'bg', 'zh', 'hk','pt_BR',
        'tw', 'cs', 'da', 'nl', 'fi',
        'fr', 'de', 'el', 'he', 'hu',
        'it', 'ja', 'kr', 'no', 'fa',
        'pl', 'pt', 'ro', 'ru', 'se',
        'sk', 'sl', 'es', 'sv', 'tr'
    );

    private function __construct()
    {
    }

    /**
     * Checkout the phpdoc-all repository.
     * This method must be call ONLY by the /firstRun.php script.
     */
    public function checkoutRepository()
    {
        $lock = new LockFile('lock_checkout_repository');

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
        // We cleanUp the database before update vcs and apply again all tools
        foreach (array('files', 'translators', 'errorfiles') as $table) {
            DBConnection::getInstance()->query("TRUNCATE TABLE $table");
        }
    }

    /**
     * Update the repository to sync our local copy.
     * As this exec command take some time, we start by creating a lock file, then run the command, then delete this lock file.
     * As it, we can test if this command has finish, or not.
     */
    public function updateRepository()
    {
        $lock = new LockFile('lock_update_repository');

        if ($lock->lock()) {
            // exec the update
            VCSFactory::getInstance()->update();
        }

        $lock->release();
    }

    /**
     * Check the build of your file (using configure.php script).
     * PHP binary should be in /usr/bin
     *
     * @param $enable_xml_details Indicate whether the checking includes xml-details
     * @return The output log.
     */
    public function checkBuild($enable_xml_details=false)
    {
        $cmd = 'cd '.DOC_EDITOR_VCS_PATH.'/doc-base/;'
              .'/usr/bin/php configure.php '
              .'--with-lang='.AccountManager::getInstance()->vcsLang.' --disable-segfault-error';

        if ($enable_xml_details) {
            $cmd .= ' --enable-xml-details';
        }

        $cmd .= ';';

        $output = array();
        exec($cmd, $output);

        // Format the output
        // TODO: extract the string replace outside this function
        $output = str_replace("Warning", '<span style="color: #FF0000; font-weight: bold;">Warning</span>', $output);

        return $output;
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
        $s = sprintf(
            'SELECT id FROM `pendingCommit` WHERE `lang`="%s" AND `path`="%s" AND `name`="%s"',
            $file->lang, $file->path, $file->name
        );
        $r = DBConnection::getInstance()->query($s);

        // We insert or update the pendingCommit table
        if ($r->num_rows == 0) {

            $s = sprintf(
                'INSERT into `pendingCommit` (`lang`, `path`, `name`, `revision`, `en_revision`, `reviewed`, `maintainer`, `modified_by`, `date`, `type`) VALUES ("%s", "%s", "%s", "%s", "%s", "%s", "%s", "%s", now(), "%s")',
                $file->lang, $file->path, $file->name, $revision, $en_revision,
                $reviewed, $maintainer, AccountManager::getInstance()->vcsLogin, $type
            );
            DBConnection::getInstance()->query($s);
            $fileID = DBConnection::getInstance()->insert_id();

        } else {

            $a = $r->fetch_object();

            $s = sprintf(
                'UPDATE `pendingCommit` SET `revision`="%s", `en_revision`="%s", `reviewed`="%s", `maintainer`="%s" WHERE id="%s"',
                $revision, $en_revision, $reviewed, $maintainer, $a->id
            );
            DBConnection::getInstance()->query($s);
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
    
        for ($i = 0; $i < count($files); $i++) {
            $query = sprintf('DELETE FROM `pendingCommit`
                WHERE
                    `lang` = "%s" AND
                    `path` = "%s" AND
                    `name` = "%s"',
                $files[$i]->lang, $files[$i]->path, $files[$i]->name
            );
            DBConnection::getInstance()->query($query);
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
        $uniqID = md5(uniqid(rand(), true));

        $s = sprintf(
            'INSERT into `pendingPatch` (`lang`, `path`, `name`, `posted_by`, `date`, `email`, `uniqID`) VALUES ("%s", "%s", "%s", "%s", now(), "%s", "%s")',
            $file->lang, $file->path, $file->name, AccountManager::getInstance()->vcsLogin, $email, $uniqID
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
        $date = date("Y-m-d H:i:s");

        $s = sprintf(
            'INSERT INTO `pendingCommit`
                (`lang`, `path`, `name`, `revision`, `en_revision`, `reviewed`, `maintainer`, `modified_by`, `date`, `type`)
            VALUES
                ("%s","%s", "%s", "-", "-", "-", "-", "%s", "%s", "delete")',
            $file->lang, $file->path, $file->name,
            AccountManager::getInstance()->vcsLogin,
            $date
        );
        DBConnection::getInstance()->query($s);

        return array(
            'id'   => DBConnection::getInstance()->insert_id(),
            'by'   => AccountManager::getInstance()->vcsLogin,
            'date' => $date
        );
    }

    /**
     * Commit file changes to repository.
     *
     * @param $ids An array of files' id to be commited.
     * @param $log The message log to use with this commit.
     * @return The message from VCS server after this commit (with HTML highlight).
     */
    public function commitChanges($ids, $log)
    {
        $fileInfos = RepositoryFetcher::getInstance()->getModifiesById($ids);

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
                case 'new':    $create_stack[] = $f; break;
                case 'update': $update_stack[] = $f; break;
                case 'delete': $delete_stack[] = $f; break;
            }
        }
        $commitLog = VCSFactory::getInstance()->commit(
            $log, $create_stack, $update_stack, $delete_stack
        );

        // html highlight commit log
        $reg = array(
            '/(Adding)/',
            '/(Sending)/',
            '/(Transmitting file data)/',
            '/(Committed revision)/',
            '/(A )/',
            '/(property )/',
            '/( set on )/'
            /*
            '/(bailing)/',
            '/(Mailing the commit email to)/',
            '/(Logging in to)/',
            '/(new revision)/'
            */
        );
        return preg_replace(
            $reg,
            '<span style="color: #15428B; font-weight: bold;">$1</span>',
            $commitLog
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
              WHERE `lang`='$lang' AND `path`='$path' AND `name`='$name'";
        $r = DBConnection::getInstance()->query($s);
        $a = $r->fetch_object();

        // We need delete row from pendingCommit table
        $s = 'DELETE FROM `pendingCommit` WHERE `id`="' .$a->id. '"';
        DBConnection::getInstance()->query($s);

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
        $en_content   = file_get_contents(DOC_EDITOR_VCS_PATH.'en' .$path.$name);
        $lang_content = file_get_contents(DOC_EDITOR_VCS_PATH.$lang.$path.$name);

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
              WHERE `lang`='$lang' AND `path`='$path' AND `name`='$name'";
        $r = DBConnection::getInstance()->query($s);
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
     */
    public function setLastUpdate()
    {
        $s = 'SELECT `lastupdate`, `by` FROM `project` WHERE `name`="php"';
        $r = DBConnection::getInstance()->query($s);

        $vcsLogin = isset(AccountManager::getInstance()->vcsLogin)
                    ? AccountManager::getInstance()->vcsLogin : '-';
        if ($r->num_rows == 0) {
            $s = sprintf(
                'INSERT INTO `project` (`name`, `lastupdate`, `by`) VALUES (\'php\', now(), "%s")',
                $vcsLogin
            );
        } else {
            $s = sprintf(
                'UPDATE `project` SET `lastupdate`=now(), `by`="%s" WHERE `name`=\'php\'',
                $vcsLogin
            );
        }
        DBConnection::getInstance()->query($s);
    }

    /**
     * All we must do after a patch have been accepted.
     *
     * @param $uniqID ID of the accepted patch.
     */
    public function postPatchAccept($uniqID)
    {
        $vcsLogin = AccountManager::getInstance()->vcsLogin;

        $s = "SELECT * FROM `pendingPatch` WHERE `uniqID` = '$uniqID'";
        $r = DBConnection::getInstance()->query($s);
        $a = $r->fetch_object();

        // We need to send an email ?
        if (trim($a->email) != '' ) {
            $to      = trim($a->email);
            $subject = '[PHP-DOC] - Patch accepted for '.$a->lang.$a->path.$a->name;
            $msg     = <<<EOD
Your patch ($uniqID) was accepted and applied to the PHP Manual.

Since the online and downloadable versions of the documentation need some
time to get updated, we would like to ask you to be a bit patient.

Thank you for your submission, and for helping us make our documentation better.

--
{$vcsLogin}@php.net
EOD;
            AccountManager::getInstance()->email($to, $subject, $msg);
        }

        @unlink(DOC_EDITOR_VCS_PATH.$a->lang.$a->path.$a->name.'.'.$a->uniqID.'.patch');
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
        $vcsLogin = AccountManager::getInstance()->vcsLogin;

        $s = "SELECT * FROM `pendingPatch` WHERE `uniqID` = '$uniqID'";
        $r = DBConnection::getInstance()->query($s);
        $a = $r->fetch_object();

        // We need to send an email ?
        if (trim($a->email) != '' ) {
            $to      = trim($a->email);
            $subject = '[PHP-DOC] - Patch Rejected for '.$a->lang.$a->path.$a->name;
            $msg     = <<<EOD
Your patch ($uniqID) was rejected from the PHP Manual.

Thank you for your submission.

--
{$vcsLogin}@php.net
EOD;
            AccountManager::getInstance()->email($to, $subject, $msg);
        }

        @unlink(DOC_EDITOR_VCS_PATH.$a->lang.$a->path.$a->name.'.'.$a->uniqID.'.patch');
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
        foreach ($files as $file) {

            $info    = $file->getInfo();
            $size    = intval(filesize($file->full_path) / 1024);
            $date    = filemtime($file->full_path);

            if ($file->lang == 'en') { // en file
                // update EN file info
                $s = sprintf(
                    'UPDATE `files`
                        SET
                            `revision` = "%s",
                            `size`     = "%s",
                            `mdate`    = "%s"
                        WHERE
                            `lang` = "%s" AND
                            `path` = "%s" AND
                            `name` = "%s"',
                    $info['rev'], $size, $date, $file->lang, $file->path, $file->name
                );
                DBConnection::getInstance()->query($s);

                // update LANG file info
                $s = sprintf(
                    'UPDATE `files`
                        SET
                            `en_revision` = "%s"
                        WHERE
                            `lang` != "%s" AND
                            `path`  = "%s" AND
                            `name`  = "%s"',
                    $info['rev'], $file->lang, $file->path, $file->name
                );
                DBConnection::getInstance()->query($s);

            } else { // lang file

                $en        = new File('en', $file->path, $file->name);
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
                            `lang` = "%s" AND
                            `path` = "%s" AND
                            `name` = "%s"',
                    $info['en-rev'], $enInfo['rev'], trim($info['reviewed']), $size, $date,
                    trim($info['maintainer']), trim($info['status']),   $size_diff,
                    $date_diff, $file->lang, $file->path, $file->name
                );
                DBConnection::getInstance()->query($s);
            }
        }
    }

    /**
     * Read the translation's file which hold informations about all translators
     * and put it into database.
     */
    public function updateTranslatorInfo()
    {
    
        foreach ($this->availableLang as $lang) {

            // Path to find translation.xml file, set default values,
            // in case we can't find the translation file
            $translation_xml = new File($lang, '/', 'translation.xml');

            if (file_exists($translation_xml->full_path)) {
                // Else go on, and load in the file, replacing all
                // space type chars with one space
                $txml = preg_replace('/\\s+/', ' ', $translation_xml->read(true));
            }

            if (isset($txml)) {
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

                        $query = sprintf(
                            'INSERT INTO `translators` (`lang`, `nick`, `name`, `mail`, `vcs`, `editor`)
                             VALUES ("%s", "%s", "%s", "%s", "%s", "%s")',
                            $lang,
                            DBConnection::getInstance()->real_escape_string($person['nick']),
                            DBConnection::getInstance()->real_escape_string($name),
                            DBConnection::getInstance()->real_escape_string($person['email']),
                            DBConnection::getInstance()->real_escape_string($person['vcs']),
                            DBConnection::getInstance()->real_escape_string($person['editor'])
                        );
                        DBConnection::getInstance()->query($query);

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
        foreach ($this->availableLang as $lang) {
            $this->doUpdateNotInEN('/', $lang);
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
        if ($dh = @opendir(DOC_EDITOR_VCS_PATH.$lang.$path)) {

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
                $en_file   = DOC_EDITOR_VCS_PATH .'en'  .$f->path .$f->name;
                $lang_file = DOC_EDITOR_VCS_PATH .$lang .$f->path .$f->name;

                if (!@is_file($en_file)) {
                    $query = sprintf(
                        'INSERT INTO `files` (`lang`, `path`, `name`, `status`)
                         VALUES ("%s", "%s", "%s", "%s")',
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
     * @param $path The directory from which we start.
     * @return Nothing.
     */
    public function applyRevCheck($path = '/')
    {
        if ($dh = @opendir(DOC_EDITOR_VCS_PATH.'en'.$path)) {

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

                $check_doc = new ToolsCheckDoc();
                $ToolsCheckDocResult = $check_doc->checkDoc($infoEN['content'], $f->path);

                // Sql insert.
                $query = sprintf(
                    'INSERT INTO `files` (`lang`, `xmlid`, `path`, `name`, `revision`, `size`, `mdate`, `maintainer`, `status`, `check_oldstyle`,  `check_undoc`, `check_roleerror`, `check_badorder`, `check_noseealso`, `check_noreturnvalues`, `check_noparameters`, `check_noexamples`, `check_noerrors`)
                        VALUES ("%s", "%s", "%s", "%s", "%s", %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)',
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
                DBConnection::getInstance()->query($query);

                foreach($this->availableLang as $lang) {

                    $lang_file = new File($lang, $f->path, $f->name);

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
                            'INSERT INTO `files` (`lang`, `xmlid`, `path`, `name`, `revision`, `en_revision`, `reviewed`, `size`, `size_diff`, `mdate`, `mdate_diff`, `maintainer`, `status`)
                                VALUES ("%s", "%s", "%s", "%s", "%s", "%s", "%s", %s, %s, %s, %s, "%s", "%s")',
                            $lang, $xmlid, $lang_file->path, $lang_file->name,
                            $revision, $en_revision, $reviewed,
                            $size, $size_diff, $date, $date_diff,
                            $maintainer, $status
                        );
                        DBConnection::getInstance()->query($query);

                        // Check for error in this file ONLY if this file is uptodate
                        if ($revision == $en_revision ) {
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
                            'INSERT INTO `files` (`lang`, `path`, `name`)
                                VALUES ("%s", "%s", "%s")',
                            $lang, $lang_file->path, $lang_file->name
                        );
                        DBConnection::getInstance()->query($query);
                    }
                }
            }

            foreach ($dirs as $d) {
                $this->applyRevCheck($d->path.$d->name.'/');
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
                    `lang` = "%s" AND
                    `path` = "%s" AND
                    `name` = "%s"',
                $files[$i]->lang, $files[$i]->path, $files[$i]->name
            );
            DBConnection::getInstance()->query($query);
        }        
    }

}

?>
