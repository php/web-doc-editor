<?php

require_once dirname(__FILE__) . '/DBConnection.php';

/**
 * A class for the check doc tools
 * Original check_phpdoc script have been written by didou <didou@php.net>
 * you can found it here : https://svn.php.net/viewvc/phpdoc/doc-base/trunk/scripts/check_phpdoc/
 *
 */
class ToolsCheckDoc {

    private $conn;

    /**
     * Initialise
     *
     */
    function __construct()
    {
        $this->conn = DBConnection::getInstance();
    }

    /**
     * Get Files for a particular path and errorType.
     *
     * @param string $path The path for the files to retrieve
     * @param string $errorType The type of error to retrieve
     * @return An indexed array readable by ExtJs
     */
    function getCheckDocFiles($path, $errorType)
    {
        $errorTypes = array('check_oldstyle', 'check_undoc', 'check_roleerror', 'check_badorder', 'check_noseealso', 'check_noreturnvalues', 'check_noparameters', 'check_noexamples', 'check_noerrors');

        if (!in_array($errorType, $errorTypes))
            return array();

        $s = 'SELECT name FROM `files` WHERE `lang`="en" AND `path`="%s" AND `%s`=1';
        $params = array($path, $errorType);
        $r = $this->conn->query($s, $params);

        $node = array();
        while ($row = $r->fetch_assoc()) {
            $node[] = $row;
        }
        return $node;
    }

    /**
     * Get check doc data.
     *
     * @return An indexed array readable by ExtJs
     */
    function getCheckDocData() {

        $node = array();

        $s = 'SELECT
                   path,
                   COUNT(*) AS total,
                   SUM(check_oldstyle)       as total_check_oldstyle,
                   SUM(check_undoc)          as total_check_undoc,
                   SUM(check_roleerror)      as total_check_roleerror,
                   SUM(check_badorder)       as total_check_badorder,
                   SUM(check_noseealso)      as total_check_noseealso,
                   SUM(check_noreturnvalues) as total_check_noreturnvalues,
                   SUM(check_noparameters)   as total_check_noparameters,
                   SUM(check_noexamples)     as total_check_noexamples,
                   SUM(check_noerrors)       as total_check_noerrors

                  FROM files

                  WHERE
                   `lang`=\'en\' AND
                   `path` REGEXP "^/reference/.*/functions/$"

                  GROUP BY path

                  ORDER BY path';

        $r  = $this->conn->query($s, array());
        $nb = $r->num_rows;
        $i = 0;
        while ($a = $r->fetch_object()) {
            $i++;

            $tmp = explode('/', $a->path);
            $extension = $tmp[2];

            $node[] = array(
            "id"                   => $i,
            "extension"            => ucFirst($extension),
            "path"                 => $a->path,
            "check_oldstyle"       => ( !$a->total_check_oldstyle)       ? 0 : (int)$a->total_check_oldstyle,
            "check_undoc"          => ( !$a->total_check_undoc)          ? 0 : (int)$a->total_check_undoc,
            "check_roleerror"      => ( !$a->total_check_roleerror)      ? 0 : (int)$a->total_check_roleerror,
            "check_badorder"       => ( !$a->total_check_badorder)       ? 0 : (int)$a->total_check_badorder,
            "check_noseealso"      => ( !$a->total_check_noseealso)      ? 0 : (int)$a->total_check_noseealso,
            "check_noreturnvalues" => ( !$a->total_check_noreturnvalues) ? 0 : (int)$a->total_check_noreturnvalues,
            "check_noparameters"   => ( !$a->total_check_noparameters)   ? 0 : (int)$a->total_check_noparameters,
            "check_noexamples"     => ( !$a->total_check_noexamples)     ? 0 : (int)$a->total_check_noexamples,
            "check_noerrors"       => ( !$a->total_check_noerrors)       ? 0 : (int)$a->total_check_noerrors
            );

        } // While

        return array('nb' => $nb, 'node' => $node);

    }

    /**
     * Run check doc tools on a file.
     *
     * @param string $content The content of the file
     * @param string $path The path of the file
     * @return An indexed array for saving into DB
     */
    function checkDoc($content, $path) {

        $return['check_oldstyle']       = 'NULL';
        $return['check_undoc']          = 'NULL';
        $return['check_roleerror']      = 'NULL';
        $return['check_badorder']       = 'NULL';
        $return['check_noseealso']      = 'NULL';
        $return['check_noreturnvalues'] = 'NULL';
        $return['check_noparameters']   = 'NULL';
        $return['check_noexamples']     = 'NULL';
        $return['check_noerrors']       = 'NULL';

        if (isset($tmp[1]) && isset($tmp[3]) && $tmp[1] == 'reference' && $tmp[3] == 'functions' ) {
            return $return;
        }

        $xmlstr = str_replace('&', '&amp;', $content);

        $xml = new DOMDocument();
        $xml->preserveWhiteSpace = false;

        if (!@$xml->loadXml($xmlstr)) {
            //echo "XML Parse Error: $function\n";
            return $return;
        }

        // Variables initialisation
        $noparameters = false;
        $returnvoid = false;


        $refsect1s  = $xml->getElementsByTagName('refsect1');
        foreach ($refsect1s as $refsect1) {
            $role = $refsect1->getAttribute('role');
            switch ($role) {
                case 'description':

                    // Get text buffer for various checks
                    $whole_description = $refsect1->nodeValue;

                    // If not documented, mark it and skip to next function
                    if (strpos($whole_description, '&warn.undocumented.func;') !== false) {
                        $return['check_undoc'] = 1;
                        return $return;
                    }

                    // If deprecated, skip to next function
                    // @todo: add a better way of handling this (new entity in phpdoc?)
                    if (strpos($whole_description, 'This function is deprecated') !== false) {
                        return $return;
                    }

                    // If an alias, skip to next function
                    if (strpos($whole_description, '&info.function.alias;') !== false) {
                        return $return;
                    } else {
                        $refnamedivs  = $xml->getElementsByTagName('refnamediv');
                        foreach ($refnamedivs as $refnamediv) {
                            if (stripos($refnamediv->nodeValue, 'alias') !== false) {
                                return $return;
                            }
                        }
                    }

                    // Look into the methodsynopsys tag(s)
                    $methodsynopsiss =  $xml->getElementsByTagName('methodsynopsis');
                    foreach ($methodsynopsiss as $methodsynopsis) {
                        foreach ($methodsynopsis->childNodes as $child) {
                            switch ($child->nodeName) {
                                case '#comment':
                                    // Skip comments
                                    continue;

                                case 'type':
                                    // This is the return type
                                    break;

                                case 'void':
                                    // This either the return type or 0 parameters
                                    if (!isset($methodname)) {

                                    } else { // no parameters
                                        $noparameters = true;
                                    }
                                    break;

                                case 'methodname':
                                    $methodname = $child->nodeValue;
                                    break;

                                case 'methodparam':
                                case 'modifier':
                                    break;

                                default:
                            }
                        }
                    }


                    break;

                case 'returnvalues':
                case 'parameters':
                case 'seealso':
                case 'examples':
                case 'notes':
                case 'changelog':
                case 'errors':
                case 'unicode':
                    // test order
                    switch ($role) {
                        case 'parameters':
                            if (isset($notes) && isset($changelog) && isset($returnvalues) && isset($examples) && isset($seealso)) {
                                $return['check_badorder'] = 1;
                            }
                            break;
                        case 'returnvalues':
                            if (isset($notes) && isset($changelog) && isset($examples) && isset($seealso)) {
                                $return['check_badorder'] = 1;
                            }
                            break;
                        case 'changelog':
                            if (isset($notes) && isset($examples) && isset($seealso)) {
                                $return['check_badorder'] = 1;
                            }
                            break;
                        case 'examples':
                            if (isset($notes) && isset($seealso)) {
                                $return['check_badorder'] = 1;
                            }
                            break;
                        case 'notes':
                            if (isset($seealso)) {
                                $return['check_badorder'] = 1;
                            }
                            break;
                    }
                    $$role = 1;
                    $whole_content = $refsect1->nodeValue;

                    // Check for default stub generated by xml_proto
                    if ($role == 'returnvalues' && strpos($whole_content, 'What the function returns, first on success, then on failure.') !== false) {
                        unset($returnvalues);
                    }
                    break;

                default:
                    if ($role != '') {
                        $check_doc['check_roleerror'] = 1;
                    } else {
                        $check_doc['check_oldstyle'] = 1;
                        // Skip the remaining refsect1
                        return $return;
                    }
            }
        }

        // See also checks
        if (!isset($seealso)) {
            $return['check_noseealso'] = 1;
        }
        unset($seealso);

        // Return Values
        if (!isset($returnvalues)) {
            $return['check_noreturnvalues'] = 1;
        }
        unset($returnvalues);

        // Parameters
        if (!isset($parameters) && !$noparameters) {
            $return['check_noparameters'] = 1;
        }
        unset($parameters);

        // Examples checks
        if (!isset($examples)) {
            $return['check_noexamples'] = 1;
        }
        unset($examples);

        // Errors checks
        if (!isset($errors)) {
            $return['check_noerrors'] = 1;
        }
        unset($errors);

        return $return;
    }

}
