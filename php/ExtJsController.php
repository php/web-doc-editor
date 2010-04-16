<?php
/**
 * Ext JS controller class definition file
 *
 * @todo Add inline documentation for each controller task
 */

require_once dirname(__FILE__) . '/AccountManager.php';
require_once dirname(__FILE__) . '/BugReader.php';
require_once dirname(__FILE__) . '/DictionnaryManager.php';
require_once dirname(__FILE__) . '/EntitiesAcronymsFetcher.php';
require_once dirname(__FILE__) . '/File.php';
require_once dirname(__FILE__) . '/GTranslate.php';
require_once dirname(__FILE__) . '/JsonResponseBuilder.php';
require_once dirname(__FILE__) . '/LogManager.php';
require_once dirname(__FILE__) . '/LockFile.php';
require_once dirname(__FILE__) . '/NewsReader.php';
require_once dirname(__FILE__) . '/ProjectManager.php';
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
        $project   = $this->getRequestVariable('project');

        $response = AccountManager::getInstance()->login($project, $vcsLogin, $vcsPasswd, $lang);

        if ($response['state'] === true) {
            // This user is already know as a valid user

            // We stock this info into DB
            $value = array();
            $value['user'] = $vcsLogin;
            $value['lang'] = $lang;
            RepositoryManager::getInstance()->setStaticValue('info', 'login', json_encode($value), true);

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
     * Add a new folder
     * 
     */
    public function addNewFolder()
    {
        $am = AccountManager::getInstance();
        $am->isLogged();
        $project = $am->project;
        $appConf = $am->appConf;

        $parentFolder  = $this->getRequestVariable('parentFolder');
        $newFolderName = $this->getRequestVariable('newFolderName');

        // Don't allow to add a new folder into root system
        if( $parentFolder == "/" ) {
            return JsonResponseBuilder::failure();
        }

        $t = explode("/", $parentFolder);
        $fileLang = $t[1];
        array_shift($t); // skip the first witch is empty
        array_shift($t); // skip the second witch is the lang

        $filePath = "/".implode("/", $t);

        $file = new File($fileLang, $filePath, '');

        // We test if this folder not already exist
        if( is_dir($appConf[$project]['vcs.path'].$fileLang.$filePath."/".$newFolderName) )
        {
            return JsonResponseBuilder::failure(
                array(
                    'type' => 'folder_already_exist',
                    'mess' => ''
                )
            );
        }
        
        if( $file->createFolder($filePath."/".$newFolderName) ) {
            return JsonResponseBuilder::success();
        } else {
            return JsonResponseBuilder::failure();
        }
        
    }


    /**
     * Check if a lock file exist or not
     */
    public function checkLockFile()
    {
        AccountManager::getInstance()->isLogged();

        $lockFile  = $this->getRequestVariable('lockFile');
        $lockFiles = $this->getRequestVariable('lockFiles');

        if( $lockFile )
        {
            $lock = new LockFile($lockFile);

            return $lock->isLocked()
                ? JsonResponseBuilder::success()
                : JsonResponseBuilder::failure();
        }

        if( $lockFiles )
        {
            $ok = false;
            $files = explode("|", $lockFiles);

            foreach ($files as $i => $file)
            {
                $lock = new LockFile($file);
                if( $lock->isLocked() )
                {
                    $ok = true;
                }
            }
            if( $ok )
            {
                return JsonResponseBuilder::success();
            } else {
                return JsonResponseBuilder::failure();
            }
        }
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
     * Get all available project
     */
    public function getAvailableProject()
    {

        $r = ProjectManager::getInstance()->getAvailableProject();

        return JsonResponseBuilder::success(
            array(
                'nbItems' => count($r),
                'Items'   => $r
            )
        );

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

    public function getSkeletonsNames()
    {
        $am = AccountManager::getInstance();
        $am->isLogged();

        $rf = RepositoryFetcher::getInstance();

        $return[] = Array("name"=> "Empty file", "path"=> "-");


        // Get skeletons info
        $skeletons = $rf->getSkeletonsNames();

        $return = array_merge($return, $skeletons);

        return JsonResponseBuilder::success(
            array(
                'Items' => $return
            )
        );
    }

    /**
     * Apply all tools on the documentation
     */
    public function applyTools()
    {
        $am = AccountManager::getInstance();
        $am->isLogged();

        $rm = RepositoryManager::getInstance();

        $project = $am->project;
        $vcsLogin = $am->vcsLogin;
        $vcsLang = $am->vcsLang;

        $rm->cleanUp();

        // Set the lock File
        $lock = new LockFile('project_'.$project.'_lock_apply_tools');

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

            // Store this info
            $info = array();
            $info['user']   = $vcsLogin;

            $rm->setStaticValue('info', 'updateData', json_encode($info), true);
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
        $am = AccountManager::getInstance();

        if( ! $am->isLogged() ) {
            return JsonResponseBuilder::failure();
        }

        $rf = RepositoryFetcher::getInstance();

        $lang = $am->vcsLang;

        if( $lang != 'en' ) {
            $data['NbPendingTranslate'] = $rf->getNbPendingTranslate();
            $data['NbPendingUpdate']    = $rf->getNbPendingUpdate();

            $errorTools = new ToolsError();
            $errorTools->setParams('', '', $am->vcsLang, '', '', '');
            $t = $errorTools->getFilesError($rf->getModifies());
            $data['NbFilesError'] = $t['nb'];

            $data['NbPendingReview'] = $rf->getNbPendingReview();
            $data['NbNotInEn']       = $rf->getNbNotInEn();
        }

        $data['NbPendingCommit'] = $rf->getNbPendingCommit();
        $data['NbPendingPatch']  = $rf->getNbPendingPatch();

        $data['lastInfoDate'] = $rf->getLastInfoDate();

        $response = !isset($_SESSION['userID']) ? 'false' : 'pong';

        return JsonResponseBuilder::success(
            array(
                'ping'      => $response,
                'totalData' => $data
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
     * Get informations about apps
     */
    public function getInfos()
    {
        AccountManager::getInstance()->isLogged();

        $start = $this->getRequestVariable('start');
        $limit = $this->getRequestVariable('limit');

        $infos = RepositoryFetcher::getInstance()->getInfos($start, $limit);

        return JsonResponseBuilder::success(
            array(
                'nbItems' => $infos['total'],
                'Items'   => $infos['value']
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
     * Get the translation from a given string using Google Translate API
     */
    public function getGGTranslation()
    {
        AccountManager::getInstance()->isLogged();

        $str = $this->getRequestVariable('str');

        $lang = AccountManager::getInstance()->vcsLang;

        $translation = false;

        $str = str_replace("\n", "[@]", $str);

        $gt = new Gtranslate;
        $gt->setRequestType('curl');
        $translation = $gt->translate('en', $lang, $str);

        // Replace new line mark
        $translation = str_replace("[@]", "<br>", $translation);

        // Few substitutions
        $translation = str_replace("&amp;" , "&", $translation);
        $translation = str_replace("&amp;  ", "&", $translation);
        $translation = str_replace("&#39;" , "'", $translation);
        $translation = str_replace("&quot;", '"', $translation);
        $translation = str_replace("&lt;"  , '<', $translation);
        $translation = str_replace("&gt;"  , '>', $translation);

        return JsonResponseBuilder::success(
            array(
                'translation' => $translation
            )
         );

    }

    /**
     * Get information of a file by his xmlID
     */
    public function getFileInfoByXmlID()
    {
        $am = AccountManager::getInstance();

        $am->isLogged();
        $lang = $am->vcsLang;

        $xmlID = $this->getRequestVariable('xmlID');

        $r = RepositoryFetcher::getInstance()->getFileByXmlID($lang, $xmlID);

        if (false == is_null($r)) {
            return JsonResponseBuilder::success(
                array(
                    'lang' => $lang,
                    'path' => $r->path,
                    'name' => $r->name
                )
            );
        } else {
            return JsonResponseBuilder::failure();
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

        $ggTranslate  = $this->hasRequestVariable('ggTranslate')
                        ? $this->getRequestVariable('ggTranslate')
                        : false;

        $skeleton = $this->getRequestVariable('skeleton');

        // ExtJs pass false as a string ; fix it
        if( $readOriginal == "false" ) $readOriginal = false;
        if( $ggTranslate  == "false" ) $ggTranslate  = false;
        if( $skeleton     == "false" ) $skeleton     = false;

        // Handle if we want to load a skeleton when we create a new file
        if( $skeleton )
        {
            $return['content'] = ( $skeleton == '-' ) ? '' : file_get_contents($skeleton);
            $return['warn_tab'] = false;
            $return['warn_encoding'] = false;
            $return['xmlid'] = '';
            return JsonResponseBuilder::success($return);
        }

        $t = explode('/', $FilePath);
        $FileLang = array_shift($t);
        $FilePath = implode('/', $t);

        // We must detect the encoding of the file with the first line "xml version="1.0" encoding="utf-8"
        // If this utf-8, we don't need to use utf8_encode to pass to this app, else, we apply it

        $file = new File($FileLang, $FilePath, $FileName);

        // If we want to get the translation from google translate API
        if( $ggTranslate ) {
            $content  = $file->translate();
            $return['content'] = $content;
            $return['warn_tab'] = false;
            $return['warn_encoding'] = false;
            $return['xmlid'] = '';
            return JsonResponseBuilder::success($return);
        }

        $content  = $file->read($readOriginal);
        $encoding = $file->getEncoding($content);
        $info     = $file->getInfo($content);

        $return = array();
        $return['warn_encoding'] = false;

        if (strtoupper($encoding) == 'UTF-8') {
            $return['content'] = $content;
        } else {
            $return['content'] = iconv($encoding, "UTF-8", $content);

            // We mark this file to be automatically modified by codemirror only if this file is a lang/ or en/ file.
            if( RepositoryManager::getInstance()->isValidLanguage($FileLang) ) { $return['warn_encoding'] = true; }

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
            $fileContent = iconv("UTF-8", $charset, $fileContent);
        }

        // We detect tab caracters and trow an error if we find one.
        if( strstr("\t", $fileContent) ) {
            return JsonResponseBuilder::failure(
                array(
                    'type' => 'tabs_found',
                    'mess' => ''
                )
            );
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

            // We must ensure that this folder exist localy
            if( $file->folderExist() ) {

                $uniqID = RepositoryManager::getInstance()->addPendingPatch(
                    $file, $emailAlert
                );

                $file->save($fileContent, true, $uniqID);

                return JsonResponseBuilder::success(
                    array(
                        'uniqId' => $uniqID
                    )
                );

            } else {
              return JsonResponseBuilder::failure();
            }
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
     * Get Acronyms to be display into a grid into the "All files modules"
     */
    public function getAcronyms()
    {
        AccountManager::getInstance()->isLogged();

        $r = EntitiesAcronymsFetcher::getInstance()->getAcronyms();

        return JsonResponseBuilder::success(
            array(
                'nbItems' => count($r),
                'Items'   => $r
            )
        );
    }
    
    /**
     * Update a single folder recursively
     */
    public function updateFolder()
    {
        $am = AccountManager::getInstance();
        $am->isLogged();

        $rm = RepositoryManager::getInstance();
        $path = $this->getRequestVariable('path');
        
        $r = $rm->updateFolder($path);
        
        return JsonResponseBuilder::success(
            array(
                'result' => $r
            )
        );
    }

    /**
     * Get the response after an update single folder
     */
    function getUpdateFolderResponse()
    {
        return JsonResponseBuilder::success(
            array(
                'result' => json_encode($_SESSION['updateFolder'])
            )
        );
    }

    /**
     * Get Entities to be display into a grid into the "All files modules"
     */
    public function getEntities()
    {
        AccountManager::getInstance()->isLogged();
        
        $path = $this->getRequestVariable('path');

        $r = EntitiesAcronymsFetcher::getInstance()->getEntities();

        return JsonResponseBuilder::success(
            array(
                'nbItems' => count($r),
                'Items'   => $r
            )
        );
    }

    /**
     * Get the diff of a given file
     */
    public function getDiff()
    {
        AccountManager::getInstance()->isLogged();
        $DiffType = $this->getRequestVariable('DiffType');
        $FilePath = $this->getRequestVariable('FilePath');
        $FileName = $this->getRequestVariable('FileName');

        $t = explode('/', $FilePath);
        $FileLang = array_shift($t);
        $FilePath = implode('/', $t);

        $opt = null;

        if( $DiffType == 'vcs' ) {
            $Rev1 = $this->getRequestVariable('Rev1');
            $Rev2 = $this->getRequestVariable('Rev2');

            // Ensure Rev2 is always a value greater than Rev1
            if( $Rev2 < $Rev1 )
            {
                $tmp  = $Rev2;
                $Rev2 = $Rev1;
                $Rev1 = $tmp;
            }

            $opt = Array('rev1'=>$Rev1, 'rev2' => $Rev2);

        } elseif( $DiffType == 'file' ) {

            $opt['type'] = 'file';

        } elseif( $DiffType == 'patch' ) {

            $uniqID = $this->getRequestVariable('uniqID');
            $opt['type'] = 'patch';
            $opt['uniqID'] = $uniqID;

        }

        $file = new File($FileLang, $FilePath, $FileName);
        $r = $file->Diff($DiffType, $opt);

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
        $ac = AccountManager::getInstance();

        $ac->isLogged();

        if ($ac->vcsLogin == 'anonymous') {
            return JsonResponseBuilder::failure();
        }

        $lock = new LockFile('project_' . $ac->project . '_lock_check_entities');
        if ($lock->lock()) {

            ToolsCheckEntities::getInstance()->startCheck();

        }
        // Remove the lock File
        $lock->release();

        $info = array();
        $info['user']   = $ac->vcsLogin;

        RepositoryManager::getInstance()->setStaticValue('info', 'checkEntities', json_encode($info), true);

        return JsonResponseBuilder::success();
    }

    /**
     * Check the build for a given LANG documentation
     */
    public function checkBuild()
    {
        $am = AccountManager::getInstance();

        $am->isLogged();

        if ($am->vcsLogin == 'anonymous') {
            return JsonResponseBuilder::failure();
        }

        $xmlDetails = $this->getRequestVariable('xmlDetails');
        $return = "";

        $lang = $am->vcsLang;

        $lock = new LockFile('project_'.$am->project.'_lock_check_build_'.$lang);
        if ($lock->lock()) {

            // Remove old log from DB
            RepositoryManager::getInstance()->cleanUpBeforeCheckBuild();

            // Start the checkBuild system
            $return = RepositoryManager::getInstance()->checkBuild($lang, $xmlDetails);
        }
        // Remove the lock File
        $lock->release();

        // Send output into a log file
        LogManager::getInstance()->saveOutputLog('project_'.$am->project.'_log_check_build_'.$lang, $return["logContent"]);

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
        $am = AccountManager::getInstance();
        $rm = RepositoryManager::getInstance();

        $am->isLogged();

        if ($am->vcsLogin == 'anonymous') {
            return JsonResponseBuilder::failure();
        }

        $nodes = $this->getRequestVariable('nodes');
        $logMessage = stripslashes($this->getRequestVariable('logMessage'));

        $anode = json_decode(stripslashes($nodes));

        $commitResponse = $tmp = '';

        // We create a lock for this commit process

        $lock = new LockFile('project_'.$am->project.'_lock_'.$am->vcsLogin.'_commit');

        if ($lock->lock()) {

            $tmp = $rm->commitChanges($anode, $logMessage);
            $commitResponse = $tmp['commitResponse'];
            $anode          = $tmp['anode'];

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
                $rm->updateFileInfo($existFiles);

                // Remove all this files in needcommit
                $rm->delPendingCommit($existFiles);

            } // End of $existFiles stuff

            // ... for deleted Files
            if( !empty($deleteFiles) ) {

                // Remove this files from the repository
                $rm->delFiles($deleteFiles);

                // Remove all this files in needcommit
                $rm->delPendingCommit($deleteFiles);

            } // End of $deleteFiles stuff

            // Manage log message (add new or ignore it if this message already exist for this user)
            LogManager::getInstance()->addCommitLog($logMessage);

            // We re-compute summary statistics for the global documentation & by translators
            $lang = AccountManager::getInstance()->vcsLang;
            $rm->updateTranslatorInfo();
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
        $am = AccountManager::getInstance();

        $am->isLogged();

        $r = array();
        $r['project']   = $am->project;
        $r['userLang']  = $am->vcsLang;
        $r['userLogin'] = $am->vcsLogin;
        $r['userConf']  = $am->userConf;
        $r['appConf']   = Array(
            "projectMailList" => $am->appConf[$am->project]['project.mail.list'],
            "viewVcUrl"       => $am->appConf[$am->project]['viewVc.url']
        );

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
        AccountManager::getInstance()->isLogged();

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
        $am = AccountManager::getInstance();
        $am->isLogged();
        
        $value = array();
        $value['user'] = $am->vcsLogin;
        RepositoryManager::getInstance()->setStaticValue('info', 'logout', json_encode($value), true);

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
        
        $langs = RepositoryManager::getInstance()->availableLang;
        
        sort($langs);

        foreach ($langs as $lang) {

            $langCode = $lang["code"];
            $langName = $lang["name"];
            $summary = RepositoryFetcher::getInstance()->getStaticValue('translation_summary', $langCode);

            if( isset($summary[0]) && !empty($summary[0]->nbFiles) ) {
                $return[$j]['id']        = $j;
                $return[$j]['libel']     = $langCode;
                $return[$j]['fullLibel'] = $langName;
                $return[$j]['total']     = $summary[0]->nbFiles;
                $return[$j]['percent']   = $summary[0]->percentFiles;

                $j ++;
            }
        }

        return JsonResponseBuilder::success(
            array(
                'nbItems' => count($return),
                'Items'   => $return
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

    public function getImageContent() {
        AccountManager::getInstance()->isLogged();

        $FileLang = $this->getRequestVariable('FileLang');
        $FilePath = $this->getRequestVariable('FilePath');
        $FileName = $this->getRequestVariable('FileName');

        $file  = new File($FileLang, $FilePath, $FileName);
        $imageContent = $file->getImageContent();

        header("Content-Type: ".$imageContent['content-type']);
        header("Expires: 0");
        header("Cache-Control: no-cache, must-revalidate");
        header("Pragma: no-cache");

        return $imageContent['content'];

    }

    /**
     * Dictionnary : Manage a word. Delete or update it.
     */
    public function manageDictionnaryWord()
    {
        AccountManager::getInstance()->isLogged();

        if (AccountManager::getInstance()->vcsLogin == 'anonymous') {
            return JsonResponseBuilder::failure();
        }

        $wordId    = $this->getRequestVariable('wordId');
        $valueEn   = $this->getRequestVariable('valueEn');
        $valueLang = $this->getRequestVariable('valueLang');

        $dateUpdate = DictionnaryManager::getInstance()->manageDictionnaryWord($wordId, $valueEn, $valueLang);

        return JsonResponseBuilder::success(
            array(
                'dateUpdate' => $dateUpdate
            )
        );

    }

    /**
     * Dictionnary : Get all works for a given language
     */
    public function getDictionnaryWords()
    {
        AccountManager::getInstance()->isLogged();

        $r = DictionnaryManager::getInstance()->getWords();

        return JsonResponseBuilder::success(
            array(
                'nbItems' => count($r),
                'Items'   => $r
            )
        );
        
    }

    /**
     * Dictionnary : Delete a word
     */
    public function delDictionnaryWord()
    {
        AccountManager::getInstance()->isLogged();

        if (AccountManager::getInstance()->vcsLogin == 'anonymous') {
            return JsonResponseBuilder::failure();
        }

        $wordId = $this->getRequestVariable('wordId');

        DictionnaryManager::getInstance()->delWord($wordId);

        return JsonResponseBuilder::success();

    }

}
