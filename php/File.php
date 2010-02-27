<?php

require_once dirname(__FILE__) . '/conf.inc.php';
require_once dirname(__FILE__) . '/DBConnection.php';
require_once dirname(__FILE__) . '/GTranslate.php';
require_once dirname(__FILE__) . '/RepositoryManager.php';
require_once dirname(__FILE__) . '/VCSFactory.php';

class File
{
    public $lang;
    public $path;
    public $name;

    public $full_path;
    public $full_path_fallback;

    /**
     * Constructor will normalize the lang, path, name as specified as parameters
     *
     * @param $lang '/' netural
     * @param $path with leading and tailing '/'
     * @param $name '/' netural
     */
    public function __construct($lang='', $path='', $name='')
    {
        // Security
        $path = str_replace('..', '',  $path);
        $path = str_replace('//', '/', $path);

        $this->lang = $lang = trim($lang, '/');
        $this->name = $name = trim($name, '/');

        if (substr($path, 0, 1) != '/') $path = '/'.$path;
        if (substr($path, -1)   != '/') $path = $path.'/';
        $this->path = $path;

        $this->full_path = $GLOBALS['DOC_EDITOR_VCS_PATH'].$lang.$path.$name;

        // The fallback file : if the file don't exist, we fallback to the EN file witch should always exist
        $this->full_path_fallback = $GLOBALS['DOC_EDITOR_VCS_PATH'].'en'.$path.$name;
    }

    public function fileExist()
    {
        return is_file($this->full_path);
    }


    /**
     * Translate the content of a file with Google Translate API.
     * 
     * @return The automatic translation.
     */
    public function translate() {

        $originalContent = file_get_contents($this->full_path);

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
        $path = ($readOriginal || !$this->isModified())
                ? $this->full_path
                : $this->full_path . '.new';

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
     * @param $isPatch Indicate whether saving file as patch (default=false)
     * @param $uniqID Patch unique ID (provided if isPatch=true)
     * @return The path to the new file successfully created.
     */
    public function save($content, $isPatch, $uniqID=false)
    {
        $ext  = ($isPatch) ? '.' . $uniqID . '.patch' : '.new';
        $path = $this->full_path . $ext;

        // Open in w+ mode
        $h = @fopen($path, 'w+');
        if( $h ) {
            fwrite($h, $content);
            fclose($h);
            return $path;
        } else {
            return array(
             'state' => false
            );
        }
    }

    /**
     * Create a new folder localy & register it to pendingCommit
     *
     * @param $path path to create
     * @return true
     */
    private function createFolder($path) {

       // We create this folder localy
       mkdir($GLOBALS['DOC_EDITOR_VCS_PATH'].$this->lang.$path);

       // We register this new folder to be committed
       $obj = (object) array('lang' => $this->lang, 'path' => $path, 'name' => '-');
       RepositoryManager::getInstance()->addPendingCommit($obj, '-', '-', '-', '-', 'new');

    }

    /**
     * Check if the path of this $file exist or not. If not, try to create it recursively with createFolder's method
     *
     * @return true
     */
    public function folderExist() {

        $folders = array();
        $_folders = explode("/", $this->path);

        //Skip empty value
        for( $i=0; $i < count($_folders); $i++) {
           if( $_folders[$i] != "" ) {
              $folders[] = $_folders[$i];
           }
        }

        $path = '';

        for( $i=0; $i < count($folders); $i++ ) {

           $herePath = $path.'/'.$folders[$i];

           if( !is_dir($GLOBALS['DOC_EDITOR_VCS_PATH'].$this->lang.$herePath) ) {
              $this->createFolder($herePath);
           }

           $path = $herePath;
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
     * @param $lang The lang of the tested file.
     * @param $path The path of the tested file.
     * @param $name The name of the tested file.
     *
     * @return Boolean TRUE if the file is a modified file, FALSE otherwise.
     */
    public function isModified()
    {
        $s = sprintf(
            'SELECT `id`, `lang`, `path`, `name` FROM `pendingCommit` WHERE
            `lang`="%s" AND `path`="%s" AND `name`="%s"',
            $this->lang, $this->path, $this->name
        );
        $r = DBConnection::getInstance()->query($s);

        return ( $r->num_rows == 0 ) ? false : true;
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
            $content = file_get_contents($this->full_path);
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
            'status'     => 'NULL',
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
        if (preg_match('/<!--\s*Reviewed:\s*(.*?)\s*-->/', $content, $match)) {
            $info['reviewed'] = trim($match[1]);
        }

        // All xmlid
        $match = array();
        if (preg_match_all('/xml:id=("|\')(.*?)("|\')/', $content, $match)) {
            $info['xmlid'] = implode('|',$match[2]);
        }

        return $info;
    }

    /**
     * Get a raw diff between a file and its modified file / patch.
     *
     * @param $isPatch Indicate whether diff with patch (default=false)
     * @param $uniqID Patch unique ID (to be provided if isPatch=true)
     * @return The diff of the file with its modified/patched version.
     */
    public function rawDiff($isPatch=false, $uniqID='')
    {
        $ext = ($isPatch) ? '.' . $uniqID . '.patch' : '.new';
        $cmd = 'cd '.$GLOBALS['DOC_EDITOR_VCS_PATH'].$this->lang.$this->path.'; '
              .'diff -uN '.$this->name.' '.$this->name.$ext;

        $output = array();
        exec($cmd, $output);

        return implode("\r\n", $output);
    }

    /**
     * Get the diff of a file with his modified version.
     *
     * @param $rev1 First revison.
     * @param $rev2 Second revision.
     * @return The diff a the file with his modified version, as HTML, ready to be display.
     */
    public function Diff($type, $options)
    {

        if( $type == 'vcs' ) {

            $output = VCSFactory::getInstance()->diff(
                $this->lang.$this->path,
                $this->name, $options['rev1'], $options['rev2']
            );

        } elseif( $type == 'file' || $type == 'patch' ) {

            $ext = ( $options['type'] == 'patch' ) ? '.' . $options['uniqID'] . '.patch' : '.new';
            $cmd = 'cd '.$GLOBALS['DOC_EDITOR_VCS_PATH'].$this->lang.$this->path.'; '
                  .'diff -uN '.$this->name.' '.$this->name.$ext;

            $output = array();
            $trial_threshold = 3;
            while ($trial_threshold-- > 0) {
                $output = array();
                exec($cmd, $output);
                if (strlen(trim(implode('', $output))) != 0) break;
            }

        }

        $output = htmlentities(join("\n", $output));
        $match = array();
        preg_match_all('/@@([^@]+)@@(.*?)(?=@@|\z)/si', $output, $match);

        $diff = array();
        for ($i = 0; $i < count($match[1]); $i++) {

            $diff[$i]['line']    = $match[1][$i];
            $diff[$i]['content'] =  $match[2][$i];
        }

        $return = '<table class="code">';
        for ($i = 0; $i < count($diff); $i++) {

            // Line
            $return .= '
             <tr>
              <td class="line">'.$diff[$i]['line'].'</td>
             </tr>
            ';

            // Content
            $tmp = explode("\n", trim($diff[$i]['content']));

            for ($j=0; $j < count($tmp); $j++) {
                $tmp[$j] = str_replace(" ", "&nbsp;", $tmp[$j]);

                switch (substr($tmp[$j], 0, 1)) {
                    case '+':
                        $class = 'ins';
                        break;
                    case '-':
                        $class = 'del';
                        break;
                    default:
                        $class = '';
                        break;
                }

                $return .= '
                 <tr>
                  <td class="'.$class.'">'.$tmp[$j].'</td>
                 </tr>
                ';
            }

            // Separator
            $return .= '
             <tr>
              <td class="truncated">&nbsp;</td>
             </tr>
            ';
        }
        $return .= '<table>';

        return $return;
    }

    /**
     * Get the image content.
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
