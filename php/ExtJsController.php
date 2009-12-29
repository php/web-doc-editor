<?php
/**
 * Ext JS controller class definition file
 *
 * @todo Add inline documentation for each controller task
 */

require_once dirname(__FILE__) . '/AccountManager.php';
require_once dirname(__FILE__) . '/BugReader.php';
require_once dirname(__FILE__) . '/File.php';
require_once dirname(__FILE__) . '/JsonResponseBuilder.php';
require_once dirname(__FILE__) . '/LogManager.php';
require_once dirname(__FILE__) . '/LockFile.php';
require_once dirname(__FILE__) . '/NewsReader.php';
require_once dirname(__FILE__) . '/RepositoryFetcher.php';
require_once dirname(__FILE__) . '/RepositoryManager.php';
require_once dirname(__FILE__) . '/TranslationStatistic.php';
require_once dirname(__FILE__) . '/TranslatorStatistic.php';
require_once dirname(__FILE__) . '/VCSFactory.php';

/**
 * Ext JS controller class
 */
class ExtJsController
{
    /**
     * Array of request variables
     *
     * @var array
     */
    private $requestVariables = array();

    /**
     * Initializes the controller
     *
     * @param array $request An associative array of request variables
     */
    public function __construct($request)
    {
        $this->requestVariables = $request;
    }

    /**
     * Gets the specified request variable
     *
     * @param string $name The variable name
     * @return mixed The variable value on success, FALSE is the variable was not set
     */
    public function getRequestVariable($name)
    {
        return $this->hasRequestVariable($name)
                ? $this->requestVariables[$name]
                : false;
    }

    /**
     * Tells if the specified request variable exist
     *
     * @param string $name The variable name
     * @return mixed Returns TRUE if the variable exists, FALSE otherwise
     */
    public function hasRequestVariable($name)
    {
        return isset($this->requestVariables[$name]);
    }

    /**
     * Login to the tool
     *
     * @return The Success response on success, or a Failure
     */
    public function login()
    {
        $vcsLogin  = $this->getRequestVariable('vcsLogin');
        $vcsPasswd = $this->getRequestVariable('vcsPassword');
        $lang      = $this->getRequestVariable('lang');

        $response = AccountManager::getInstance()->login($vcsLogin, $vcsPasswd, $lang);

        if ($response['state'] === true) {
            // This user is already know in a valid user
            return JsonResponseBuilder::success();
        } elseif ($response['state'] === false) {
            // This user is unknow from this server
            return JsonResponseBuilder::failure(array(
                                                 'msg'        => $response['msg'],
                                                 'authMethod' => $response['authMethod']
                                               ));
        } else {
            return JsonResponseBuilder::failure();
        }
    }

    /**
     * Update the repository
     */
    public function updateRepository()
    {
        AccountManager::getInstance()->isLogged();

        if (AccountManager::getInstance()->vcsLogin == 'anonymous') {
            return JsonResponseBuilder::failure();
        }

        RepositoryManager::getInstance()->updateRepository();
        return JsonResponseBuilder::success();
    }

    /**
     * Check if a lock file exist or not
     */
    public function checkLockFile()
    {
        $lockFile = $this->getRequestVariable('lockFile');
        $lock     = new LockFile($lockFile);

        AccountManager::getInstance()->isLogged();
        return $lock->isLocked()
            ? JsonResponseBuilder::success()
            : JsonResponseBuilder::failure();
    }

    /**
     * switch to a specific language
     */
    public function switchLang()
    {

        $lang = $this->getRequestVariable('lang');

        AccountManager::getInstance()->switchLang($lang);

        return JsonResponseBuilder::success();

    }

    /**
     * Get all available language
     */
    public function getAvailableLanguage()
    {

        $r = RepositoryManager::getInstance()->getAvailableLanguage();

        return JsonResponseBuilder::success(
            array(
                'nbItems' => count($r),
                'Items'   => $r
            )
        );

    }

    /**
     * Apply all tools on the documentation
     */
    public function applyTools()
    {
        AccountManager::getInstance()->isLogged();

        $rm = RepositoryManager::getInstance();

        $rm->cleanUp();

        // Set the lock File
        $lock = new LockFile('lock_apply_tools');

        if ($lock->lock()) {

            // Start Revcheck
            $rm->applyRevCheck();

            // Search for NotInEN Old Files
            $rm->updateNotInEN();

            // Parse translators
            $rm->updateTranslatorInfo();

            // We re-compute statistics
            TranslationStatistic::getInstance()->computeSummary('all');
            TranslatorStatistic::getInstance()->computeSummary('all');

            // Set lastUpdate date/time
            $rm->setLastUpdate();
        }
        $lock->release();

        return JsonResponseBuilder::success();
    }

    /**
     * Pings the server and user session
     *
     * @return string "pong" & others informations on success, "false" on failure
     */
    public function ping()
    {
        AccountManager::getInstance()->isLogged();
        $r = RepositoryFetcher::getInstance()->getLastUpdate();

        $response = !isset($_SESSION['userID']) ? 'false' : 'pong';

        return JsonResponseBuilder::success(
            array(
                'ping'       => $response,
                'lastupdate' => $r['lastupdate'],
                'by'         => $r['by']
            )
        );
    }

    /**
     * Get all files witch need to be updated
     */
    public function getFilesNeedUpdate()
    {
        AccountManager::getInstance()->isLogged();
        $r = RepositoryFetcher::getInstance()->getPendingUpdate();

        return JsonResponseBuilder::success(
            array(
                'nbItems' => $r['nb'],
                'Items'   => $r['node']
            )
        );
    }

    /**
     * Get all files witch need to be translated from scratch
     */
    public function getFilesNeedTranslate()
    {
        AccountManager::getInstance()->isLogged();
        $r = RepositoryFetcher::getInstance()->getPendingTranslate();

        return JsonResponseBuilder::success(
            array(
                'nbItems' => $r['nb'],
                'Items'   => $r['node']
            )
        );
    }

    /**
     * Get all files who are not in the EN tree
     */
    public function getFilesNotInEn()
    {
        AccountManager::getInstance()->isLogged();
        $r = RepositoryFetcher::getInstance()->getNotInEn();

        return JsonResponseBuilder::success(
            array(
                'nbItems' => $r['nb'],
                'Items'   => $r['node']
            )
        );
    }

    /**
     * Get all files witch need to be reviewed
     */
    public function getFilesNeedReviewed()
    {
        AccountManager::getInstance()->isLogged();
        $r = RepositoryFetcher::getInstance()->getPendingReview();

        return JsonResponseBuilder::success(
            array(
                'nbItems' => $r['nb'],
                'Items'   => $r['node']
            )
        );
    }

    /**
     * Get all files from witch an error have been detected
     */
    public function getFilesError()
    {
        AccountManager::getInstance()->isLogged();

        $errorTools = new ToolsError();
        $errorTools->setParams('', '', AccountManager::getInstance()->vcsLang, '', '', '');
        $r = $errorTools->getFilesError(RepositoryFetcher::getInstance()->getModifies());

        return JsonResponseBuilder::success(
            array(
                'nbItems' => $r['nb'],
                'Items'   => $r['node']
            )
        );
    }

    /**
     * Get all files witch need to be commited
     */
    public function getFilesPendingCommit()
    {
        AccountManager::getInstance()->isLogged();

        $r = RepositoryFetcher::getInstance()->getPendingCommit();

        return JsonResponseBuilder::success(
            array(
                'nbItems' => $r['nb'],
                'Items'   => $r['node']
            )
        );
    }

    /**
     * Get all patch created by users
     */
    public function getFilesPendingPatch()
    {
        AccountManager::getInstance()->isLogged();

        $r = RepositoryFetcher::getInstance()->getPendingPatch();

        return JsonResponseBuilder::success(
            array(
                'nbItems' => $r['nb'],
                'Items'   => $r['node']
            )
        );
    }

    /**
     * Get some statistics from translators
     */
    public function getTranslatorInfo()
    {
        AccountManager::getInstance()->isLogged();

        $translators = RepositoryFetcher::getInstance()->getStaticValue('translator_summary', AccountManager::getInstance()->vcsLang);

        return JsonResponseBuilder::success(
            array(
                'nbItems' => count($translators),
                'Items'   => $translators
            )
        );
    }

    /**
     * Get some generals statistics
     */
    public function getSummaryInfo()
    {
        AccountManager::getInstance()->isLogged();

        $summary = RepositoryFetcher::getInstance()->getStaticValue('translation_summary', AccountManager::getInstance()->vcsLang);

        return JsonResponseBuilder::success(
            array(
                'nbItems' => count($summary),
                'Items'   => $summary
            )
        );
    }

    /**
     * Get lasts news from the LANG mailing list
     */
    public function getLastNews()
    {
        AccountManager::getInstance()->isLogged();

        $nr = new NewsReader(AccountManager::getInstance()->vcsLang);
        $r  = $nr->getLastNews();

        if( !$r ) {
            return JsonResponseBuilder::failure();
        } else {
            return JsonResponseBuilder::success(
                array(
                    'nbItems' => count($r),
                    'Items'   => $r
                )
            );
        }

    }

    /**
     * Get all open bugs from php's bugtracker. The title of the bug need to be prefixed by [LANG] to be found.
     */
    public function getOpenBugs()
    {
        AccountManager::getInstance()->isLogged();

        $bugs = new BugReader(AccountManager::getInstance()->vcsLang);
        $r = $bugs->getOpenBugs();

        if( $r === false ) {
            return JsonResponseBuilder::failure();
        } else {
            return JsonResponseBuilder::success(
                array(
                    'nbItems' => count($r),
                    'Items'   => $r
                )
            );
        }
    }

    /**
     * Get the content of a file
     */
    public function getFile()
    {
        AccountManager::getInstance()->isLogged();

        $FilePath = $this->getRequestVariable('FilePath');
        $FileName = $this->getRequestVariable('FileName');

        $readOriginal = $this->hasRequestVariable('readOriginal')
                        ? $this->getRequestVariable('readOriginal')
                        : false;

        // ExtJs pass false as a string ; fix it
        if( $readOriginal == "false" ) $readOriginal = false;

        $t = explode('/', $FilePath);
        $FileLang = array_shift($t);
        $FilePath = implode('/', $t);

        // We must detect the encoding of the file with the first line "xml version="1.0" encoding="utf-8"
        // If this utf-8, we don't need to use utf8_encode to pass to this app, else, we apply it

        $file     = new File($FileLang, $FilePath, $FileName);
        $content  = $file->read($readOriginal);
        $encoding = $file->getEncoding($content);
        $info     = $file->getInfo($content);

        $return = array();
        if (strtoupper($encoding) == 'UTF-8') {
            $return['content'] = $content;
        } else {
            $return['content'] = iconv($encoding, "UTF-8", $content);
        }

        if (isset($info['xmlid'])) {
            $return['xmlid'] = $info['xmlid'];
        }

        // Warn if this file contains some tab caracter (the online editor will replace them by a space)
        $return['warn_tab'] = ( strstr($return['content'], "\t") ) ? true : false ;

        return JsonResponseBuilder::success($return);
    }

    /**
     * Check if a file have an error according to ToolsError's class.
     */
    public function checkFileError()
    {
        AccountManager::getInstance()->isLogged();
        $FilePath = $this->getRequestVariable('FilePath');
        $FileName = $this->getRequestVariable('FileName');
        $FileLang = $this->getRequestVariable('FileLang');

        // Remove \
        $FileContent = stripslashes($this->getRequestVariable('FileContent'));

        // Replace &nbsp; by space
        $FileContent = str_replace("&nbsp;", "", $FileContent);

        $file = new File($FileLang, $FilePath, $FileName);
        // Detect encoding
        $charset = $file->getEncoding($FileContent);

        // If the new charset is set to utf-8, we don't need to decode it
        if ($charset != 'utf-8') {
            // Utf8_decode
            $FileContent = utf8_decode($FileContent);
        }

        // Get EN content to check error with
        $en_file    = new File('en', $FilePath, $FileName);
        $en_content = $en_file->read();

        // Update DB with this new Error (if any)
        $info = $file->getInfo($FileContent);
        $anode[0] = array(
            'lang'         => $FileLang,
            'path'         => $FilePath,
            'name'         => $FileName,
            'en_content'   => $en_content,
            'lang_content' => $FileContent,
            'maintainer'   => $info['maintainer']
        );

        $errorTools = new ToolsError();
        $r = $errorTools->updateFilesError($anode, 'nocommit');

        return JsonResponseBuilder::success(
            array(
                'error'       => $r['state'],
                'error_first' => $r['first']
            )
        );
    }

    /**
     * Save a file. The new file have an extension like ".new", and is saved in the same folder as the original.
     */
    public function saveFile()
    {
        AccountManager::getInstance()->isLogged();

        $filePath   = $this->getRequestVariable('filePath');
        $fileName   = $this->getRequestVariable('fileName');
        $fileLang   = $this->getRequestVariable('fileLang');
        $type       = $this->hasRequestVariable('type')
                        ? $this->getRequestVariable('type')
                        : 'file';
        $emailAlert = $this->hasRequestVariable('emailAlert')
                        ? $this->getRequestVariable('emailAlert')
                        : '';

        if (AccountManager::getInstance()->vcsLogin == 'anonymous' && ($type == 'file' || $type == 'trans')) {
            return JsonResponseBuilder::failure();
        }

        // Clean up path
        $filePath = str_replace('//', '/', $filePath);

        // Extract lang from path
        if ($fileLang == 'all') {
            $t = explode('/', $filePath);

            $fileLang = $t[0];

            array_shift($t);
            $filePath = '/'.implode('/', $t);
        }

        // Remove \
        $fileContent = $this->getRequestVariable('fileContent');

        // Replace &nbsp; by space
        $fileContent = str_replace("&nbsp;", "", $fileContent);

        // Detect encoding
        $file = new File($fileLang, $filePath, $fileName);
        $charset = $file->getEncoding($fileContent);

        // If the new charset is set to utf-8, we don't need to decode it
        if ($charset != 'utf-8') {
            // Utf8_decode
            //$fileContent = utf8_decode($fileContent);
            $fileContent = iconv("UTF-8", $charset, $fileContent);
        }

        // Get revision
        $info = $file->getInfo($fileContent);

        if ($type == 'file') {

            $er = $file->save($fileContent, false);

            if( $er['state'] ) {

                $r = RepositoryManager::getInstance()->addPendingCommit(
                    $file, $info['rev'], $info['en-rev'], $info['reviewed'], $info['maintainer']
                );
                return JsonResponseBuilder::success(
                    array(
                        'id'           => $r,
                        'lang'         => $fileLang,
                        'revision'     => $info['rev'],
                        'en_revision'  => $info['en-rev'],
                        'maintainer'   => $info['maintainer'],
                        'reviewed'     => $info['reviewed']
                    )
                );
            } else {
                return JsonResponseBuilder::failure(
                    array(
                        'type' => 'fs_error',
                        'mess' => ''
                    )
                );
            }
        } else if ($type == 'trans') {

            // We must ensure that this folder exist localy
            if( $file->folderExist() ) {

               $er = $file->save($fileContent, false);

               if( $er['state'] ) {

                   $r = RepositoryManager::getInstance()->addPendingCommit(
                       $file, $info['rev'], $info['en-rev'], $info['reviewed'], $info['maintainer'], 'new'
                   );
                   return JsonResponseBuilder::success(
                       array(
                           'id'           => $r,
                           'lang'         => $fileLang,
                           'revision'     => $info['rev'],
                           'en_revision'  => $info['en-rev'],
                           'maintainer'   => $info['maintainer'],
                           'reviewed'     => $info['reviewed']
                       )
                   );

               } else {
                   return JsonResponseBuilder::failure(
                       array(
                           'type' => 'fs_error',
                           'mess' => ''
                       )
                   );
               }
            } else {
              return JsonResponseBuilder::failure();
            }
        } else {

            $uniqID = RepositoryManager::getInstance()->addPendingPatch(
                $file, $emailAlert
            );

            $file->save($fileContent, true, $uniqID);

            return JsonResponseBuilder::success(
                array(
                    'uniqId' => $uniqID
                )
            );
        }
    }

    /**
     * Get VCS log for a given file.
     */
    public function getLog()
    {
        AccountManager::getInstance()->isLogged();
        $Path = $this->getRequestVariable('Path');
        $File = $this->getRequestVariable('File');

        $r = VCSFactory::getInstance()->log($Path, $File);

        return JsonResponseBuilder::success(
            array(
                'nbItems' => count($r),
                'Items'   => $r
            )
        );
    }

    /**
     * Get the diff of a given file, between the modified and the original version
     */
    public function getDiff()
    {
        AccountManager::getInstance()->isLogged();
        $FilePath = $this->getRequestVariable('FilePath');
        $FileName = $this->getRequestVariable('FileName');

        $t = explode('/', $FilePath);
        $FileLang = array_shift($t);
        $FilePath = implode('/', $t);

        $type     = $this->hasRequestVariable('type')
                    ? $this->getRequestVariable('type')
                    : '';
        $uniqID   = $this->hasRequestVariable('uniqID')
                    ? $this->getRequestVariable('uniqID')
                    : '';

        $file = new File($FileLang, $FilePath, $FileName);
        $info = $file->htmlDiff(($type=='patch'), $uniqID);

        return JsonResponseBuilder::success(
            array(
                'content'  => $info['content'],
                'encoding' => $info['charset']
            )
        );
    }

    /**
     * Get the diff of a given file, between REV1 & REV2
     */
    public function getDiff2()
    {
        AccountManager::getInstance()->isLogged();
        $FilePath = $this->getRequestVariable('FilePath');
        $FileName = $this->getRequestVariable('FileName');

        $t = explode('/', $FilePath);
        $FileLang = array_shift($t);
        $FilePath = implode('/', $t);

        $Rev1 = $this->getRequestVariable('Rev1');
        $Rev2 = $this->getRequestVariable('Rev2');

        // Ensure Rev2 is always a value greater than Rev1
        if( $Rev2 < $Rev1 )
        {
            $tmp = $Rev2;
            $Rev2 = $Rev1;
            $Rev1 = $tmp;
        }

        $file = new File($FileLang, $FilePath, $FileName);
        $r = $file->vcsDiff($Rev1, $Rev2);

        return JsonResponseBuilder::success(
            array(
                 'content' => $r
            )
        );
    }

    /**
     * Erase personal data from this application (cleanUp the database)
     */
    public function erasePersonalData()
    {
        AccountManager::getInstance()->isLogged();

        if (AccountManager::getInstance()->vcsLogin == 'anonymous') {
            return JsonResponseBuilder::failure();
        }

        AccountManager::getInstance()->eraseData();

        return JsonResponseBuilder::success();
    }

    /**
     * Get the commit log Message after a VCS commit.
     */
    public function getCommitLogMessage()
    {
        AccountManager::getInstance()->isLogged();
        $r = LogManager::getInstance()->getCommitLog();

        return JsonResponseBuilder::success(
            array(
                'nbItems' => count($r),
                'Items'   => $r
            )
        );
    }

    /**
     * Revert a modification made in a file
     */
    public function clearLocalChange()
    {
        AccountManager::getInstance()->isLogged();

        if (AccountManager::getInstance()->vcsLogin == 'anonymous') {
            return JsonResponseBuilder::failure();
        }

        $FileType = $this->getRequestVariable('FileType');
        $FilePath = $this->getRequestVariable('FilePath');
        $FileName = $this->getRequestVariable('FileName');

        $t = explode('/', $FilePath);
        $FileLang = array_shift($t);
        $FilePath = implode('/', $t);

        $info = RepositoryManager::getInstance()->clearLocalChange(
            $FileType, new File($FileLang, $FilePath, $FileName)
        );

        return JsonResponseBuilder::success(
            array(
                'path'       => $FilePath,
                'name'       => $FileName,
                'lang'       => $FileLang,
                'revision'   => $info['rev'],
                'en-revision'=> $info['en-rev'],
                'maintainer' => $info['maintainer'],
                'error'      => $info['errorFirst'],
                'reviewed'   => $info['reviewed']
            )
        );
    }

    /**
     * Get the content of a log's file
     */
    public function getLogFile()
    {
        AccountManager::getInstance()->isLogged();

        $file = $this->getRequestVariable('file');

        $content = LogManager::getInstance()->readOutputLog($file);

        return JsonResponseBuilder::success(
            array(
                'mess' => $content
            )
        );
    }

    /**
     * Check the entities
     */
    public function checkEntities()
    {
        AccountManager::getInstance()->isLogged();

        if (AccountManager::getInstance()->vcsLogin == 'anonymous') {
            return JsonResponseBuilder::failure();
        }

        $lock = new LockFile('lock_check_entities');
        if ($lock->lock()) {

            ToolsCheckEntities::getInstance()->startCheck();

        }
        // Remove the lock File
        $lock->release();

        return JsonResponseBuilder::success();
    }

    /**
     * Check the build for a given LANG documentation
     */
    public function checkBuild()
    {
        AccountManager::getInstance()->isLogged();

        if (AccountManager::getInstance()->vcsLogin == 'anonymous') {
            return JsonResponseBuilder::failure();
        }

        $xmlDetails = $this->getRequestVariable('xmlDetails');
        $return = "";

        $lang = AccountManager::getInstance()->vcsLang;

        $lock = new LockFile('lock_check_build_'.$lang);
        if ($lock->lock()) {

            // Remove old log from DB
            RepositoryManager::getInstance()->cleanUpBeforeCheckBuild();

            // Start the checkBuild system
            $return = RepositoryManager::getInstance()->checkBuild($lang, $xmlDetails);
        }
        // Remove the lock File
        $lock->release();

        // Send output into a log file
        LogManager::getInstance()->saveOutputLog('log_check_build_'.$lang, $return["logContent"]);

        // If the state of this build is ko, we save it into DB
        if( $return["state"] == 'ko' ) {
            LogManager::getInstance()->saveFailedBuild($lang, $return["logContent"]);
        }

        return JsonResponseBuilder::success();
    }

    /**
     * Get the response of the VCS after a commit
     */
    public function getCommitResponse()
    {

        return JsonResponseBuilder::success(
            array(
                'mess' => $_SESSION['commitResponse']
            )
        );

    }

    /**
     * Commit modified files.
     */
    public function vcsCommit()
    {
        AccountManager::getInstance()->isLogged();

        if (AccountManager::getInstance()->vcsLogin == 'anonymous') {
            return JsonResponseBuilder::failure();
        }

        $nodes = $this->getRequestVariable('nodes');
        $logMessage = stripslashes($this->getRequestVariable('logMessage'));

        $anode = json_decode(stripslashes($nodes));

        $commitResponse = '';

        // We create a lock for this commit process

        $lock = new LockFile('lock_'.AccountManager::getInstance()->vcsLogin.'_commit');

        if ($lock->lock()) {


            $commitResponse = RepositoryManager::getInstance()->commitChanges($anode, $logMessage);

            // Store the response into session to display later
            $_SESSION['commitResponse'] = $commitResponse;

            // Start all process after the VCS commit

            $nodes = RepositoryFetcher::getInstance()->getModifiesById($anode);

            // We need to provide a different treatment regarding the file's type...
            $existFiles = array(); // Can be an updated file or a new file
            $deleteFiles = array();
            $j = 0;

            for ($i = 0; $i < count($nodes); $i++) {

                if( $nodes[$i]['type'] == 'update' || $nodes[$i]['type'] == 'new' ) {
                    $existFiles[] = new File(
                        $nodes[$i]['lang'],
                        $nodes[$i]['path'],
                        $nodes[$i]['name']
                    );
                }

                if( $nodes[$i]['type'] == 'delete' ) {
                    $deleteFiles[$j]->lang = $nodes[$i]['lang'];
                    $deleteFiles[$j]->path = $nodes[$i]['path'];
                    $deleteFiles[$j]->name = $nodes[$i]['name'];
                    $j ++;
                }

            }

            // ... for existing Files (new or update)
            if( !empty($existFiles) ) {

                // Update revision & reviewed for all this files (LANG & EN)
                RepositoryManager::getInstance()->updateFileInfo($existFiles);

                // Stuff only for LANG files
                $langFiles = array();
                $j = 0;

                for ($i = 0; $i < count($existFiles); $i++) {
                    // Only for lang files.
                    if( $existFiles[$i]->lang != 'en' ) {

                        $en = new File('en', $existFiles[$i]->path, $existFiles[$i]->name);

                        $info = $existFiles[$i]->getInfo();

                        $langFiles[$j]['en_content']   = $en->read(true);
                        $langFiles[$j]['lang_content'] = $existFiles[$i]->read(true);
                        $langFiles[$j]['lang'] = $existFiles[$i]->lang;
                        $langFiles[$j]['path'] = $existFiles[$i]->path;
                        $langFiles[$j]['name'] = $existFiles[$i]->name;
                        $langFiles[$j]['maintainer'] = $info['maintainer'];

                        $j ++;
                    }
                }
                if( !empty($langFiles) ) {
                    $errorTools = new ToolsError();
                    $errorTools->updateFilesError($langFiles);
                }
                // Remove all this files in needcommit
                RepositoryManager::getInstance()->delPendingCommit($existFiles);
            } // End of $existFiles stuff

            // ... for deleted Files
            if( !empty($deleteFiles) ) {

                // Remove this files from the repository
                RepositoryManager::getInstance()->delFiles($deleteFiles);

                // Remove all this files in needcommit
                RepositoryManager::getInstance()->delPendingCommit($deleteFiles);

            } // End of $deleteFiles stuff

            // Manage log message (add new or ignore it if this message already exist for this user)
            LogManager::getInstance()->addCommitLog($logMessage);

            // We re-compute summary statistics for the global documentation & by translators
            $lang = AccountManager::getInstance()->vcsLang;
            TranslationStatistic::getInstance()->computeSummary($lang);
            TranslatorStatistic::getInstance()->computeSummary($lang);
        }

        // Remove the lock File
        $lock->release();

        return JsonResponseBuilder::success(
            array(
                'mess' => $commitResponse
            )
        );
    }

    /**
     * Get the UI's configuration for the current user
     */
    public function getConf()
    {
        AccountManager::getInstance()->isLogged();

        $r = array();
        $r['userLang']  = AccountManager::getInstance()->vcsLang;
        $r['userLogin'] = AccountManager::getInstance()->vcsLogin;
        $r['userConf']  = AccountManager::getInstance()->userConf;

        return JsonResponseBuilder::success(
            array(
                'mess' => $r
            )
        );
    }

    /**
     * Send an email.
     */
    public function sendEmail()
    {
        AccountManager::getInstance()->isLogged();

        $to      = $this->getRequestVariable('to');
        $subject = $this->getRequestVariable('subject');
        $msg     = $this->getRequestVariable('msg');

        AccountManager::getInstance()->email($to, $subject, $msg);

        return JsonResponseBuilder::success();
    }

    /**
     * Update a given UI configuration's option for the current user
     */
    public function confUpdate()
    {
        AccountManager::getInstance()->isLogged();

        $item      = $this->getRequestVariable('item');
        $value     = $this->getRequestVariable('value');

        AccountManager::getInstance()->updateConf($item, $value);

        return JsonResponseBuilder::success();
    }

    /**
     * Get all files from the repository. Also used to search for some files into the current LANG & EN documentation
     */
    public function getAllFiles()
    {
        AccountManager::getInstance()->isLogged();

        $node   = $this->getRequestVariable('node');
        $search = $this->getRequestVariable('search');

        if ($this->hasRequestVariable('search')) {
            $files = RepositoryFetcher::getInstance()->getFileByKeyword($search);
        } else {
            $files = RepositoryFetcher::getInstance()->getFilesByDirectory($node);
        }

        return JsonResponseBuilder::response($files);
    }

    /**
     * Save a log message into DB to use it later
     */
    public function saveLogMessage()
    {
        AccountManager::getInstance()->isLogged();

        if (AccountManager::getInstance()->vcsLogin == 'anonymous') {
            return JsonResponseBuilder::failure();
        }

        $messID = $this->getRequestVariable('messID');
        $mess   = stripslashes($this->getRequestVariable('mess'));

        LogManager::getInstance()->updateCommitLog($messID, $mess);

        return JsonResponseBuilder::success();
    }

    /**
     * Delete a log message from the DB
     */
    public function deleteLogMessage()
    {
        AccountManager::getInstance()->isLogged();

        if (AccountManager::getInstance()->vcsLogin == 'anonymous') {
            return JsonResponseBuilder::failure();
        }

        $messID = $this->getRequestVariable('messID');

        LogManager::getInstance()->delCommitLog($messID);

        return JsonResponseBuilder::success();
    }

    /**
     * Get all files for a given Extension. Allow user who reviewed the documentation to open all files about a given extension.
     */
    public function getAllFilesAboutExtension()
    {
        AccountManager::getInstance()->isLogged();

        $ExtName = $this->getRequestVariable('ExtName');

        $r = RepositoryFetcher::getInstance()->getFilesByExtension($ExtName);

        return JsonResponseBuilder::success(
            array(
                'files' => $r
            )
        );
    }

    /**
     * All tasks to be done after a patch have been accepted
     */
    public function afterPatchAccept()
    {
        AccountManager::getInstance()->isLogged();

        $PatchUniqID = $this->getRequestVariable('PatchUniqID');

        RepositoryManager::getInstance()->postPatchAccept($PatchUniqID);

        return JsonResponseBuilder::success();
    }

    /**
     * All tasks to be done after a patch have been rejected
     */
    public function afterPatchReject()
    {
        AccountManager::getInstance()->isLogged();

        if (AccountManager::getInstance()->vcsLogin == 'anonymous') {
            return JsonResponseBuilder::failure();
        }

        $PatchUniqID = $this->getRequestVariable('PatchUniqID');

        RepositoryManager::getInstance()->postPatchReject($PatchUniqID);

        return JsonResponseBuilder::success();
    }

    /**
     * Get data about the CheckEntities's tools (ToolsCheckEntities's class).
     */
    public function getCheckEntitiesData()
    {
        AccountManager::getInstance()->isLogged();

        $ToolsCheckEntities = new ToolsCheckEntities();
        $r = $ToolsCheckEntities->getData();

        return JsonResponseBuilder::success(
            array(
                'nbItems' => $r['nb'],
                'Items'   => $r['node']
            )
        );
    }

    /**
     * Get data about the CheckDoc's tools (ToolsCheckDoc's class).
     */
    public function getCheckDocData()
    {
        AccountManager::getInstance()->isLogged();

        $ToolsCheckDoc = new ToolsCheckDoc();
        $r = $ToolsCheckDoc->getCheckDocData();

        return JsonResponseBuilder::success(
            array(
                'nbItems' => $r['nb'],
                'Items'   => $r['node']
            )
        );
    }

    /**
     * Start the dowload of a given Failed build
     */
    public function downloadFailedBuildLog()
    {
        AccountManager::getInstance()->isLogged();

        $idFailedBuild = $this->getRequestVariable('idFailedBuild');

        $r['mess'] = LogManager::getInstance()->getFailedBuildData($idFailedBuild, false);

        $name = 'failed-build-' . time() . '.txt';
        $content = implode("\r\n", $r['mess']);

        $size = strlen($content);

        header("Content-Type: application/force-download; name=\"$name\"");
        header("Content-Transfer-Encoding: binary");
        header("Content-Disposition: attachment; filename=\"$name\"");
        header("Expires: 0");
        header("Cache-Control: no-cache, must-revalidate");
        header("Pragma: no-cache");

        return $content;
    }

    /**
     * Get the content of a failed build
     */
    public function getFailedBuildData()
    {
        AccountManager::getInstance()->isLogged();

        $idFailedBuild = $this->getRequestVariable('idFailedBuild');

        $r['mess'] = LogManager::getInstance()->getFailedBuildData($idFailedBuild);
        $r['state'] = 'full';

        if( count($r['mess']) > 50 ) {
          $r['mess'] = array_slice($r['mess'], 0, 50);
          $r['state'] = 'truncate';
        }

        return JsonResponseBuilder::success(
            array(
                'mess'  => $r['mess'],
                'state' => $r['state']
            )
        );
    }

    /**
     * Get all failed build
     */
    public function getFailedBuild()
    {
        AccountManager::getInstance()->isLogged();

        $r = LogManager::getInstance()->getFailedBuild();

        return JsonResponseBuilder::success(
            array(
                'nbItems' => $r['nb'],
                'Items'   => $r['node']
            )
        );
    }

    /**
     * Get all files about the CheckDoc's tools (ToolsCheckDoc's class).
     */
    public function getCheckDocFiles()
    {
        AccountManager::getInstance()->isLogged();

        $path      = $this->getRequestVariable('path');
        $errorType = $this->getRequestVariable('errorType');

        $ToolsCheckDoc = new ToolsCheckDoc();
        $r = $ToolsCheckDoc->getCheckDocFiles($path, $errorType);

        return JsonResponseBuilder::success(
            array(
                'files' => $r
            )
        );
    }

    /**
     * Start the dowload of a given patch
     */
    public function downloadPatch()
    {
        $FilePath = $this->getRequestVariable('FilePath');
        $FileName = $this->getRequestVariable('FileName');

        $t = explode('/', $FilePath);
        $FileLang = array_shift($t);
        $FilePath = implode('/', $t);

        $file  = new File($FileLang, $FilePath, $FileName);
        $patch = $file->rawDiff(false);

        $name = 'patch-' . time() . '.patch';

        $size = strlen($patch);

        header("Content-Type: application/force-download; name=\"$name\"");
        header("Content-Transfer-Encoding: binary");
        header("Content-Disposition: attachment; filename=\"$name\"");
        header("Expires: 0");
        header("Cache-Control: no-cache, must-revalidate");
        header("Pragma: no-cache");

        return $patch;
    }

    /**
     * Logout from this application
     */
    public function logout()
    {
        $_SESSION = array();
        setcookie(session_name(), '', time()-42000, '/');
        session_destroy();
        header("Location: ../");
        exit;
    }

    /**
     * Get information to build the language specific graph
     */
    public function getGraphLang()
    {

        AccountManager::getInstance()->isLogged();
        $lang = AccountManager::getInstance()->vcsLang;

        $summary = RepositoryFetcher::getInstance()->getStaticValue('translation_summary', $lang);

        $return[0]['id'] = $summary[0]->id;
        $return[0]['libel'] = $summary[0]->libel;
        $return[0]['total'] = $summary[0]->nbFiles;

        $return[1]['id'] = $summary[1]->id;
        $return[1]['libel'] = $summary[1]->libel;
        $return[1]['total'] = $summary[1]->nbFiles;

        $return[2]['id'] = $summary[2]->id;
        $return[2]['libel'] = $summary[2]->libel;
        $return[2]['total'] = $summary[2]->nbFiles;

        return JsonResponseBuilder::success(
            array(
                'nbItems' => 3,
                'Items'   => $return
            )
        );

    }

    /**
     * Get information to build the graph for all languages
     */
    public function getGraphLangs()
    {

        AccountManager::getInstance()->isLogged();

        $return = array();

        $j=0;
        foreach (RepositoryManager::getInstance()->availableLang as $lang) {

            $lang = $lang["code"];
            $summary = RepositoryFetcher::getInstance()->getStaticValue('translation_summary', $lang);

            $return[$j]['id'] = $j;
            $return[$j]['libel'] = str_replace("_", "", $lang);
            $return[$j]['total'] = ( !isset($summary[0]) || $summary[0]->nbFiles == NULL ) ? 0 : $summary[0]->nbFiles;

            $j ++;
        }

        return JsonResponseBuilder::success(
            array(
                'nbItems' => count($return),
                'Items'   => $return
            )
        );

    }

    /**
     * Get the date/time of the last data update
     */
    public function getLastUpdate()
    {
        AccountManager::getInstance()->isLogged();
        $r = RepositoryFetcher::getInstance()->getLastUpdate();

        return JsonResponseBuilder::success(
            array(
                'success'    => true,
                'lastupdate' => $r['lastupdate']
            )
        );
    }

    /**
     * Mark a file to be deleted
     */
    public function markAsNeedDelete()
    {
        AccountManager::getInstance()->isLogged();

        $FilePath = $this->getRequestVariable('FilePath');
        $FileName = $this->getRequestVariable('FileName');

        $t = explode('/', $FilePath);
        $FileLang = array_shift($t);
        $FilePath = implode('/', $t);

        $file = new File($FileLang, $FilePath, $FileName);

        $r = RepositoryManager::getInstance()->addPendingDelete($file);

        return JsonResponseBuilder::success(
            array(
                'id'   => $r['id'],
                'by'   => $r['by'],
                'date' => $r['date']
            )
        );
    }

}
