<?php

require_once dirname(__FILE__) . '/conf.inc.php';

class CvsClient
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
     * Use to encode Cvs Password when we try to identify the user into PHP CVS Server.
     *
     * @param $passwd The password to encode.
     * @param $prefix Prefix of encoded password.
     * @return string The encoded password
     */
    private function passwdEncode($passwd, $prefix)
    {
        static $code = array(
            0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
            14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
            31, 114, 120, 53, 79, 96, 109, 72, 108, 70, 64, 76, 67, 116, 74, 68,
            87, 111, 52, 75, 119, 49, 34, 82, 81, 95, 65, 112, 86, 118, 110, 122,
            105, 41, 57, 83, 43, 46, 102, 40, 89, 38, 103, 45, 50, 42, 123, 91,
            35, 125, 55, 54, 66, 124, 126, 59, 47, 92, 71, 115, 78, 88, 107, 106,
            56, 36, 121, 117, 104, 101, 100, 69, 73, 99, 63, 94, 93, 39, 37, 61,
            48, 58, 113, 32, 90, 44, 98, 60, 51, 33, 97, 62, 77, 84, 80, 85, 223,
            225, 216, 187, 166, 229, 189, 222, 188, 141, 249, 148, 200, 184, 136,
            248, 190, 199, 170, 181, 204, 138, 232, 218, 183, 255, 234, 220, 247,
            213, 203, 226, 193, 174, 172, 228, 252, 217, 201, 131, 230, 197, 211,
            145, 238, 161, 179, 160, 212, 207, 221, 254, 173, 202, 146, 224, 151,
            140, 196, 205, 130, 135, 133, 143, 246, 192, 159, 244, 239, 185, 168,
            215, 144, 139, 165, 180, 157, 147, 186, 214, 176, 227, 231, 219, 169,
            175, 156, 206, 198, 129, 164, 150, 210, 154, 177, 134, 127, 182, 128,
            158, 208, 162, 132, 167, 209, 149, 241, 153, 251, 237, 236, 171, 195,
            243, 233, 253, 240, 194, 250, 191, 155, 142, 137, 245, 235, 163, 242,
            178, 152
        );

        $encoded = $prefix . $passwd;
        $pl      = strlen($prefix);
        for ($i = 0; $i < strlen($passwd); $i++) {
            $encoded[$i+$pl] = chr($code[ord($passwd[$i])]);
        }
        return $encoded;
    }

    /**
     * Test the CVS credentials against the server
     *
     * @param $cvsLogin CVS login name.
     * @param $cvsPasswd CVS login password.
     * @return TRUE if the loggin success, error message otherwise.
     */
    public function authenticate($cvsLogin, $cvsPasswd)
    {
        $fp = fsockopen(DOC_EDITOR_VCS_SERVER_HOST, DOC_EDITOR_VCS_SERVER_PORT);
        fwrite($fp,
            implode("\n", array(
                'BEGIN AUTH REQUEST',
                DOC_EDITOR_VCS_SERVER_PATH,
                $cvsLogin,
                $this->passwdEncode($cvsPasswd, 'A'),
                'END AUTH REQUEST'."\n"
            ))
        );

        $r = trim(fread($fp, 1024));
        fclose($fp);

        if ($r != 'I LOVE YOU') {
            if ($r == 'I HATE YOU') {
                return 'Bad password';
            } else {
                return $r;
            }
        } else {
            return true;
        }
    }

    /**
     *  cvs -d :pserver:cvsread:phpfi@cvs.php.net:/repository checkout phpdoc-all under DOC_EDITOR_DATA_PATH
     */
    public function checkout()
    {
        $cmd = 'cd '.DOC_EDITOR_DATA_PATH.'; cvs -d :pserver:cvsread:phpfi@cvs.php.net:/repository login;'
              .'cvs -d :pserver:cvsread:phpfi@cvs.php.net:/repository checkout phpdoc-all;';
        exec($cmd);
    }

    /**
     *  cvs -f -q update -d -P . under DOC_EDITOR_VCS_PATH
     */
    public function update()
    {
        $cmd = 'cd '.DOC_EDITOR_VCS_PATH.'; cvs -f -q update -d -P .;';
        exec($cmd);
    }

    /**
     * Get Cvs log of a specified file.
     *
     * @param $path The path of the file.
     * @param $file The name of the file.
     * @return An array containing all Cvs log informations.
     */
    public function log($path, $file)
    {
        $cmd = 'cd '.DOC_EDITOR_VCS_PATH.$path.'; cvs log '.$file;

        $output = array();
        exec($cmd, $output);

        $output = implode("\n", $output);

        $output = str_replace('=============================================================================', '', $output);

        $part = explode('----------------------------', $output);

        $final = array();
        for ($i=1; $i < count($part); $i++ ) {

            $o = array();

            $o['id']  = $i;
            $o['raw'] = $part[$i];

            // Get revision
            $out = array();
            preg_match('/revision (.*?)\n/e', $part[$i], $out);
            $o['revision'] = $out[1];

            // Get date
            $out = array();
            preg_match('/date: (.*?);/e', $part[$i], $out);
            $o['date'] = $out[1];

            // Get user
            $out = array();
            preg_match('/author: (.*?);/e', $part[$i], $out);
            $o['author'] = $out[1];

            //Get content
            $content = explode("\n", $part[$i]);

            if (substr($content[3], 0, 9) == 'branches:' ) { $j=4; }
            else { $j=3; }

            $o['content'] = '';

            for ($h=$j; $h < count($content); $h++) {
                $o['content'] .= $content[$h]."\n";
            }
            $o['content'] = str_replace("\n", '<br/>', trim($o['content']));

            $final[] = $o;
        }

        return $final;
    }

    /**
     * Execute cvs diff on specific file
     *
     * @param $path Path to file
     * @param $file Filename
     * @param $rev1 Diff revision 1
     * @param $rev2 Diff revision 2
     * @return Array of stdout of cvs diff
     */
    public function diff($path, $file, $rev1, $rev2)
    {
        $cmd = 'cd '.DOC_EDITOR_VCS_PATH.$path.'; cvs diff -kk -u -r '.$rev2.' -r '.$rev1.' '.$file;

        $output = array();
        exec($cmd, $output);

        return $output;
    }

    /**
     * Executes cvs commit
     *
     * @param $log Commit log
     * @param $create Array of files to be created
     * @param $update Array of files to be updated
     * @param $delete Array of files to be deleted
     * @return Array of stdout of cvs commit
     */
    public function commit($log, $create=false, $update=false, $delete=false)
    {
        $create_stack = array();
        for ($i = 0; $create && $i < count($create); $i++) {
            $create_stack[] = $create[$i]->lang.'/'.$create[$i]->path.'/'.$create[$i]->name;
        }

        $update_stack = array();
        for ($i = 0; $update && $i < count($update); $i++) {
            $p = $update[$i]->lang.'/'.$update[$i]->path.'/'.$update[$i]->name;
            $update_stack[] = $p;

            // Pre-commit : rename .new to actual file
/*
            @unlink(DOC_EDITOR_VCS_PATH.$p);
*/
            @copy(  DOC_EDITOR_VCS_PATH.$p.'.new', DOC_EDITOR_VCS_PATH.$p);
            @unlink(DOC_EDITOR_VCS_PATH.$p.'.new');
        }

        $delete_stack = array();
        for ($i = 0; $delete && $i < count($delete); $i++) {
            $delete_stack[] = $delete[$i]->lang.'/'.$delete[$i]->path.'/'.$delete[$i]->name;
        }

        // Linearization
        $filesCreate = implode($create_stack, ' ');
        $filesUpdate = implode($update_stack, ' ');
        $filesDelete = implode($delete_stack, ' ');

        // Buil the command line
        $cvsLogin  = AccountManager::getInstance()->vcsLogin;
        $cvsPasswd = AccountManager::getInstance()->vcsPasswd;

        $cmdCreate = $cmdDelete = '';
        if (trim($filesCreate) != '') {
            $cmdCreate = "cvs -d :pserver:$cvsLogin:$cvsPasswd@cvs.php.net:/repository -f add $filesCreate && ";
        }
        if (trim($filesDelete) != '') {
            $cmdDelete = "cvs -d :pserver:$cvsLogin:$cvsPasswd@cvs.php.net:/repository -f remove -f $filesDelete && ";
        }

        // Escape single quote
        $log = str_replace("'", "\\'", $log);
        $cmd = $cmdDelete.
               $cmdCreate.
               "cvs -d :pserver:$cvsLogin:$cvsPasswd@cvs.php.net:/repository -f commit -l -m '$log' $filesUpdate $filesDelete $filesCreate";

        // First, login into Cvs
        $fullCmd = 'export CVS_PASSFILE='.realpath(DOC_EDITOR_DATA_PATH).'/.cvspass && cd '.DOC_EDITOR_VCS_PATH.' && '
                  ."cvs -d :pserver:$cvsLogin:$cvsPasswd@cvs.php.net:/repository login && $cmd";

        $output  = array();
        exec($fullCmd, $output);

        return $output;
    }
}

?>
