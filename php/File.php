<?php

require_once dirname(__FILE__) . '/DBConnection.php';
require_once dirname(__FILE__) . '/GTranslate.php';
require_once dirname(__FILE__) . '/RepositoryManager.php';
require_once dirname(__FILE__) . '/SaferExec.php';
require_once dirname(__FILE__) . '/VCSFactory.php';

class File
{
    public $lang;
    public $name;

    public $path;

    public $full_path;
    public $full_new_path;

    public $full_path_fallback;

    public $full_path_dir;
    public $full_new_path_dir;

    public $isDir;
    public $isFile;

    private $conn;

    /**
     * Constructor will normalize the lang and the path as specified as parameters.
     * The path can be a folder or a file.
     *
     * @param $lang '/' netural
     * @param $path with leading and tailing '/'
     * @param $name '/' netural
     */
    public function __construct($lang='', $path='')
    {
        $appConf = AccountManager::getInstance()->appConf;
        $project = AccountManager::getInstance()->project;

        // Security
        $path = str_replace('..', '',  $path);
        $path = str_replace('//', '/', $path);

        $this->lang = $lang = trim($lang, '/');
        $path = trim($path, '.');
        $path = trim($path, '/');

        // Find if the path is a folder or a file. As it, if the path contains an extension, we assume the path is a file.
        // Else, it's a folder.
        $path_parts = pathinfo($path);

        if( !isset($path_parts['extension']) ) {
            $this->isDir = true;
            $this->isFile = false;
            $this->name = '';
            $path_parts['dirname'] = isset($path_parts['dirname']) ? $path_parts['dirname'] : '';
            $path = $path_parts['dirname'].'/'.$path_parts['basename'];
        } else {
            $this->isDir = false;
            $this->isFile = true;
            $this->name = $path_parts['basename'];
            $path = $path_parts['dirname'];
        }

        $path = trim($path, '.');
        $path = trim($path, '/');
        $path = trim($path, '.');

        if (strlen($path) > 0) {
            $this->path = "/$path/";

            $this->full_path = $appConf[$project]['vcs.path'].$lang.'/'.$path.'/'.$this->name;
            $this->full_new_path = $appConf['GLOBAL_CONFIGURATION']['data.path'].$appConf[$project]['vcs.module'].'-new/'.$lang.'/'.$path.'/'.$this->name;

            $this->full_path_dir = $appConf[$project]['vcs.path'].$lang.'/'.$path.'/';
            $this->full_new_path_dir = $appConf['GLOBAL_CONFIGURATION']['data.path'].$appConf[$project]['vcs.module'].'-new/'.$lang.'/'.$path.'/';

            // The fallback file : if the file don't exist, we fallback to the EN file witch should always exist
            $this->full_path_fallback = $appConf[$project]['vcs.path'].'en/'.$path.'/'.$this->name;
        } else {
            $this->path = '/';

            $this->full_path = $appConf[$project]['vcs.path'].$lang.'/'.$this->name;
            $this->full_new_path = $appConf['GLOBAL_CONFIGURATION']['data.path'].$appConf[$project]['vcs.module'].'-new/'.$lang.'/'.$this->name;

            $this->full_path_dir = $appConf[$project]['vcs.path'].$lang.'/';
            $this->full_new_path_dir = $appConf['GLOBAL_CONFIGURATION']['data.path'].$appConf[$project]['vcs.module'].'-new/'.$lang.'/';

            $this->full_path_fallback = $appConf[$project]['vcs.path'].'en/'.$this->name;
        }

        $this->conn = DBConnection::getInstance();
    }

    public function exist()
    {
    	if( $this->isDir ) return is_dir($this->full_path_dir);
        else return is_file($this->full_path);
    }


    /**
     * Translate the content of a file with Google Translate API.
     *
     * @return The automatic translation.
     */
    public function translate()
    {
        // We must check if the file exist.
        // For example, when we start a translation, save it, and then open it from work in progress module, the path don't exist and we must use the fallback path for translation

        $originalContent = ( is_file($this->full_path) ) ? file_get_contents($this->full_path) : file_get_contents($this->full_path_fallback);

        // We search for new line caracters and mark it ! (Google API delete new line)
        $originalContent = str_replace("\n", "[@]", $originalContent);

        $lang = AccountManager::getInstance()->vcsLang;

        $translation = false;
        $gt = new Gtranslate;
        $gt->setRequestType('curl');
        $translation = $gt->translate('en', $lang, $originalContent);

        // Replace new line mark
        $translation = str_replace("[@]", "\n", $translation);

        // Few substitutions
        $translation = str_replace("&amp;" , "&", $translation);
        $translation = str_replace("&amp;  ", "&", $translation);
        $translation = str_replace("&#39;" , "'", $translation);
        $translation = str_replace("&quot;", '"', $translation);
        $translation = str_replace("&lt;"  , '<', $translation);
        $translation = str_replace("&gt;"  , '>', $translation);

        // CLeanUp entities. Google return it like this : & Reftitle.parameters;. We convert it like this : &reftitle.parameters;
        $translation = preg_replace_callback("/(&)\s(.)(.[^;]*?)(;)/s",
            create_function(
                '$matches',
                'return $matches[1].strtolower($matches[2]).$matches[3].$matches[4];'
            ),
        $translation);

        // We remove extra space after :: operator
        $translation = preg_replace("/(\w+)(::)(\s)(\w+)/s", "$1$2$4", $translation);

        // We delete space into tab like this </ b>
        $translation = preg_replace("/(<\/\s(\w+[^>]*)>)/s", "</$2>", $translation);

        // We delete space just after an open tag, and just before a close tag, like this <b> foo </b>
        $translation = preg_replace("/(<(\w+[^>]*)>)(\s?)(.[^>]*?)(\s?)(<\/(\\2)>)/s", "<$2>$4</$7>", $translation);

        return $translation;
    }

    /**
     * Read the content of a file.
     *
     * @param $readOriginal true to read the original content of the file, false to read the modified file (if any). By default, false.
     * @return The content of the file.
     */
    public function read($readOriginal=false)
    {
        if( $readOriginal ) {
            $isModified = false;
        } else {
            $isModified = $this->isModified();
            $isModified = (bool) $isModified;
        }

        $path = ($readOriginal || !$isModified)
                ? $this->full_path
                : $this->full_new_path;

        if( is_file($path) ) {
            return file_get_contents($path);
        } elseif( is_file($this->full_path_fallback) ) {
            // usefull for a patch from the FNT module.
            return file_get_contents($this->full_path_fallback);
        } else {
            return false;
        }

    }

    /**
     * Save a file after modification.
     *
     * @param $content The new content.
     * @return The path to the new file successfully created.
     */
    public function save($content)
    {

        // Ensure the folder exist.
        if( ! is_dir($this->full_new_path_dir) ) {
            mkdir( $this->full_new_path_dir, 0777, true );
        }

        // Open in w+ mode
        $h = @fopen($this->full_new_path, 'w+');
        if( $h ) {
            fwrite($h, $content);
            fclose($h);
            return $this->full_new_path;
        } else {
            return array(
             'state' => false
            );
        }
    }

    /**
     * Create a new folder locally & register it to pendingCommit
     * If $path is provided, it is used to create the according path. Else, we use the current folder's path.
     *
     * @param string $path The path to create. By default, we use the current path.
     * @return boolean TRUE if the path have been created successfully, FALSE otherwise.
     */
    public function createFolder($path=false)
    {
       $am      = AccountManager::getInstance();
       $appConf = $am->appConf;
       $project = $am->project;

       if( !$path ) {
           $path = $this->path;
       }

       $parentFolder = dirname($path);
       if(!is_dir($parentFolder)) {
           $this->createFolder($parentFolder);
       }

       // We create this folder localy
       if( ! @mkdir($appConf['GLOBAL_CONFIGURATION']['data.path'].$appConf[$project]['vcs.module'].'-new/'.$this->lang.'/'.$path, 0777, true) ) {
           return false;
       }

       // We register this new folder to be committed
       $obj = (object) array('lang' => $this->lang, 'path' => $path, 'name' => '-');
       RepositoryManager::getInstance()->addProgressWork($obj, '-', '-', '-', '-', '-', 'new');

       return true;

    }

    /**
     * Check if the path of this $file exist or not. If not, try to create it
     *
     * @return true
     */
    public function folderExist()
    {
        $am      = AccountManager::getInstance();
        $appConf = $am->appConf;
        $project = $am->project;

        if( !is_dir($this->full_new_path_dir) ) {
            $this->createFolder();
        }

        return true;
    }

    /**
     * Parse an array of string to find all attributes in form of (key=value) pairs.
     *
     * @param $key_value_pairs Array of key-value pair strings to be parsed.
     * @return An associated array whos key is the name of the attribute, and value, the value of the attribute.
     */
    public function parseAttribute($key_value_pairs)
    {
        $processed = array();

        foreach ($key_value_pairs as $pair) {

            // Get attr name and values
            $attributes = array();
            preg_match_all('!(.+)=\\s*(["\'])\\s*(.+)\\2!U', $pair, $attributes);

            // Assign all attributes to one associative array
            $key_value = array();
            foreach ($attributes[1] as $k => $name) {
                $key_value[trim($name)] = trim($attributes[3][$k]);
            }
            // Collect in order of tags received
            $processed[] = $key_value;
        }

        return $processed;
    }

    /**
     * Test if the file is a modified file.
     *
     * @return Mixed FALSE if the file haven't been modified, otherwise, some information about the user how have modified it.
     */
    public function isModified()
    {
        $am      = AccountManager::getInstance();
        $project = $am->project;

        $s = 'SELECT
                `id` as fidDB,
                `users`.`vcs_login` as `user`,
                `users`.`userID`,
                `users`.`authService`,
                `module` as fromModule,
                `type` as ftype,
                `work`.`userID`
             FROM
                `work`,
                `users`
             WHERE
                `work`.`userID` = `users`.`userID` AND
                `work`.`project` = "%s" AND
                `lang`="%s" AND
                `path`="%s" AND
                `name`="%s"';
        $params = array(
            $project,
            $this->lang,
            $this->path,
            $this->name
        );

        $r = $this->conn->query($s, $params);

        if( $r->num_rows == 0 ) {
            return false;
        } else {
            $a = $r->fetch_assoc();
            if ($a['user'] == 'anonymous') $a['user'] = $a['user'] . ' #' . $a['userID'];
            $a['haveKarma'] = (($a['authService'] == 'VCS') && ($am->checkKarma($a['user'], $this->lang) === true));
            return json_encode($a);
        }
    }

    /**
     * Get encoding of a file, regarding his XML's header.
     *
     * @param $content The content of the file
     * @return The charset as a string.
     */
    public function getEncoding($content=false)
    {
        if (!$content) {
            $content = @file_get_contents($this->full_path);
        }

        $content = preg_replace('/\\s+/', ' ', $content);

        $match = array();
        preg_match('!<\?xml(.+)\?>!U', $content, $match);
        $xmlinfo = $this->parseAttribute($match);

        $charset = isset($xmlinfo[1]['encoding'])
                   ? strtolower($xmlinfo[1]['encoding'])
                   : 'iso-8859-1';

        return $charset;
    }

    /**
     * Get the information from the content of a file.
     *
     * @param $content The content of the file.
     * @return An associated array of informations.
     */
    public function getInfo($content=false)
    {
        if (!$content) {
            $content = file_get_contents($this->full_path);
        }

        $info = array(
            'rev'        => 0,
            'en-rev'     => 0,
            'maintainer' => 'NULL',
            'reviewed'   => 'NULL',
            'reviewed_maintainer' => 'NULL',
            'status'     => '-',
            'xmlid'      => 'NULL',
            'content'    => $content
        );

        // revision tag
        $match = array();
        preg_match('/<!-- .Revision: (\d+) . -->/', $content, $match);
        if (!empty($match)) {
            $info['rev'] = $match[1];
        }

        // Rev tag
        $match = array();
        preg_match('/<!--\s*EN-Revision:\s*((\d+)|(n\/a))\s*Maintainer:\s*(\\S*)\s*Status:\s*(.+)\s*-->/U', $content, $match);
        if (!empty($match)) {
            $info['en-rev']     = ($match[1] == 'n/a') ? 0 : $match[1];
            $info['maintainer'] = $match[4];
            $info['status']     = $match[5];
        }

        // Reviewed tag
        $match = array();
        if (preg_match('/<!--\s*Reviewed:\s*(.*?)\s*(Maintainer:\s*(\\S*)\s*)?-->/i', $content, $match)) {
            $info['reviewed'] = ( isset($match[1]) ) ? trim($match[1]) : NULL;
            $info['reviewed_maintainer'] = ( isset($match[3]) ) ? trim($match[3]) : NULL;
        }

        // All xmlid
        $match = array();
        if (preg_match_all('/xml:id=("|\')(.*?)("|\')/', $content, $match)) {
            $info['xmlid'] = implode('|',$match[2]);
        }

        return $info;
    }


    public function diff($optNbLine=3, $optB=false, $optW=false)
    {

        // $optNbLine need to be an integer, >= 3
        $optNbLine = (int) $optNbLine;
        if( $optNbLine < 3 ) $optNbLine = 3;

        // $optB & $optW need to be a boolean
        $optB = ($optB == 'true') ? true : false;
        $optW = ($optW == 'true') ? true : false;

        $_optB = ( $optB == 'true' ) ? ' -b' : '';
        $_optW = ( $optW == 'true' ) ? ' -w' : '';

        /* Diff option (from man page) :
        * U : output NUM (default 3) lines of unified context
        *
        * N : treat absent files as empty
        *
        * b : ignore changes in the amount of white space
        * Ne pas tenir compte des différences concernant des espaces blancs.
        *
        * w : ignore all white space
        * Ignorer les espaces blancs lors de la comparaison de lignes.
        *
        */

        $commands = array(
            new ExecStatement(
                'diff -uN -U '.$optNbLine.' '.$_optB.$_optW.' --label %s --label %s %s %s',
                array(
                    $this->lang.$this->path.$this->name,
                    $this->lang.$this->path.$this->name,
                    $this->full_path,
                    $this->full_new_path
                )
            )
        );

        $trial_threshold = 3;
        while ($trial_threshold-- > 0)
        {
            $output = array();
            SaferExec::execMulti($commands, $output);
            if (strlen(trim(implode('', $output))) != 0) break;
        }

        return $output;
    }

    public static function patchDiff($patchId)
    {
        $output = array();
        $patchFiles = RepositoryManager::getInstance()->getPatchFilesByID($patchId);
        foreach ($patchFiles as $patchFile) {
            $patchFile = new File($patchFile->lang, $patchFile->path.$patchFile->name);
            // file delimeter
            $output[] = 'Index: '.$patchFile->lang.$patchFile->path.$patchFile->name;
            $output = array_merge($output, $patchFile->diff());
        }
        return $output;
    }

    /**
     * Get the image content.
     *
     * @return An associative array with 'content-type' and 'content' keys
     */
    public function getImageContent()
    {
        $t = explode('.', $this->full_path);

        $return['content-type'] = 'image/'.$t[count($t)-1];
        $return['content'] = file_get_contents($this->full_path);

        return $return;
    }
}

?>
