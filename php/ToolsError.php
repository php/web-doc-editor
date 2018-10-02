<?php
/**
 * Class file for checking errors
 */

require_once dirname(__FILE__) . '/AccountManager.php';
require_once dirname(__FILE__) . '/EntitiesAcronymsFetcher.php';
require_once dirname(__FILE__) . '/DBConnection.php';
require_once dirname(__FILE__) . '/VCSFactory.php';

class ToolsError
{

    /**
     * EN content of the file without any comment.
     *
     * @var string
     */
    private $en_content;

    /**
     * EN content of the file with comments.
     *
     * @var string
     */
    private $en_content_with_comment;

    /**
     * LANG content of the file without any comment.
     *
     * @var string
     */
    private $lang_content;
    /**
     * LANG content of the file with comments.
     *
     * @var string
     */
    private $lang_content_with_comment;

    /**
     * LANG of the checked file.
     *
     * @var string
     */
    private $lang;

    /**
     * Maitainer of the checked file.
     *
     * @var string
     */
    private $maintainer;

    /**
     * The path of the checked file.
     *
     * @var string
     */
    private $filePath;

    /**
     * The name of the checked file.
     *
     * @var string
     */
    private $fileName;

    /**
     * The stack of errors
     *
     * @var string
     */
    private $errorStack;

    private $conn;

    /**
     * Initialise the check
     */
    function __construct()
    {
        $this->errorStack = array();
        $this->conn = DBConnection::getInstance();
    }

    /**
     * Set parameters to perform a check
     *
     * @param string $en_content
     * @param string $lang_content
     * @param string $lang
     * @param string $filePath
     * @param string $fileName
     * @param string $maintainer
     */
    function setParams($en_content, $lang_content, $lang, $filePath, $fileName, $maintainer)
    {
        $this->lang_content_with_comment = $lang_content;
        $this->en_content_with_comment = $en_content;

        $this->lang_content = preg_replace('/<!--(.*?)?-->/s', '', $lang_content);
        $this->en_content   = preg_replace('/<!--(.*?)?-->/s', '', $en_content);

        $this->lang         = $lang;
        $this->filePath     = $filePath;
        $this->fileName     = $fileName;
        $this->maintainer   = $maintainer;
    }

    /**
     * Update error's informations about a file after his commit.
     * @param array  $nodes        An array of files.
     * @param string $action       Can be 'commit' or not if we call this method after a commit action or not
     * @return An array of information
     */
    function updateFilesError($nodes, $action='commit') {

        $project = AccountManager::getInstance()->project;

        for ($i = 0; $i < count($nodes); $i++) {

            $FileLang = $nodes[$i]['lang'];
            $FilePath = $nodes[$i]['path'];
            $FileName = $nodes[$i]['name'];

            // Remove all row in errorfiles tables
            $s = 'DELETE FROM errorfiles WHERE `project`="%s" AND lang="%s" AND path="%s" AND name="%s"';
            $params = array($project, $FileLang, $FilePath, $FileName);
            $this->conn->query($s, $params);

            if( $FileLang != 'en' ) {
                $this->setParams($nodes[$i]['en_content'], $nodes[$i]['lang_content'], $FileLang, $FilePath, $FileName, $nodes[$i]['maintainer']);
            } else {
                $this->setParams($nodes[$i]['lang_content'], '', 'en', $FilePath, $FileName, '');
            }

            $this->clearError();
            $this->run();


            if (count($this->errorStack)) {

                $this->saveError();

            } elseif ($action != 'commit' ) {

                // Case if there is no error but this file isn't commit now. We must stay it in DB for commit later
                // Build empty error
                $this->clearError();
                $this->addError(array( 'value_en' => '-',  'value_lang' => '-', 'type' => '-No error-' ));
                $this->saveError();

            }

            if ($i == 0 && $action != 'commit' ) {
                if (count($this->errorStack)) {
                    $return['state'] = true;
                    $return['first'] = $this->errorStack[0]['type'];
                } else {
                    $return['state'] = false;
                    $return['first'] = '';
                }
                return $return;
            }
        }

    }

    /**
     * Get informations about errors into a file
     *
     * @return An array of information
     */
    function getInfo()
    {
        $am      = AccountManager::getInstance();
        $project = $am->project;

        if ( $am->userConf->error->skipNbLiteralTag ) {
            $type = ' type != \'nbLiteralTag\' AND ';
        } else {
            $type = '';
        }

        $s = 'SELECT
                   `value_en`, `value_lang`, `type`
                FROM
                   `errorfiles`
                WHERE
                   '.$type.'
                   `project` = "%s" AND
                   `lang` = "%s" AND
                   `path` = "%s" AND
                   `name` = "%s"
               ';
        $params = array(
            $project,
            $this->lang,
            $this->filePath,
            $this->fileName
        );
        $r = $this->conn->query($s, $params);

        $return = array();

        while ($record = $r->fetch_object()) {
            if (isset($return[$record->type]['error'])) {
                $i = count($return[$record->type]['error']);
            } else {
                $i = 0;
            }
            $return[$record->type]['error'][$i]['value_en']   = $record->value_en;
            $return[$record->type]['error'][$i]['value_lang'] = $record->value_lang;

        }
        return $return;
    }

    /**
     * Get all files in error for a given lang
     *
     * @param array $ModifiedFiles An array containing all modified files in order to display them in red
     * @return An array of information
     */
    function getFilesError($ModifiedFiles)
    {
        $am      = AccountManager::getInstance();
        $project = $am->project;

        if ( $am->userConf->error->skipNbLiteralTag ) {
            $type = 'type != "nbLiteralTag" AND ';
        } else {
            $type = '';
        }

        $s = 'SELECT
                *
             FROM
                `errorfiles`
             WHERE
                '.$type.'
                `project`=  "%s" AND
                `lang`   =  "%s" AND
                `type`   != "-No error-"';

        $params = array(
            $project,
            $this->lang
        );

        $r    = $this->conn->query($s, $params);
        $node = array();

        $alreadyNode = array();

        while ($a = $r->fetch_object()) {

            if (!isset($alreadyNode[$a->path.$a->name])) {

                $isModifiedLang = ( isset($ModifiedFiles[$this->lang.$a->path.$a->name]) ) ? $ModifiedFiles[$this->lang.$a->path.$a->name] : false ;

                if ( $isModifiedLang ) {

                    $new_maintainer = $isModifiedLang['maintainer'];

                    $node[] = array(
                    "id"                => $a->id,
                    "path"              => $a->path,
                    "name"              => $a->name,
                    "maintainer"        => $new_maintainer,
                    "value_en"          => $a->value_en,
                    "value_lang"        => $a->value_lang,
                    "type"              => $a->type,
                    "fileModified"      => ( isset($isModifiedLang) && $isModifiedLang != false ) ? '{"user":"'.$isModifiedLang["user"].'", "anonymousIdent":"'.$isModifiedLang["anonymousIdent"].'"}' : false
                    );

                } else {

                    $node[] = array(
                    "id"                => $a->id,
                    "path"              => $a->path,
                    "name"              => $a->name,
                    "maintainer"        => ( $isModifiedLang ) ? $isModifiedLang['maintainer'] : $a->maintainer,
                    "value_en"          => $a->value_en,
                    "value_lang"        => $a->value_lang,
                    "type"              => $a->type,
                    "fileModifiedEN"    => ( isset($isModifiedEN) && $isModifiedEN != false )  ? '{"user":"'.$isModifiedEN["user"].'", "anonymousIdent":"'.$isModifiedEN["anonymousIdent"].'"}'   : false,
                    "fileModifiedLang"  => ( isset($isModifiedLang) && $isModifiedLang != false ) ? '{"user":"'.$isModifiedLang["user"].'", "anonymousIdent":"'.$isModifiedLang["anonymousIdent"].'"}' : false
                    );

                }

                $alreadyNode[$a->path.$a->name] = 1;
            }

        }

        if( count($node) > $am->userConf->error->nbDisplay && $am->userConf->error->nbDisplay != 0 ) {
            $node = array_slice($node, 0, $am->userConf->error->nbDisplay);
        }

        return array('nb'=>count($node), 'node'=>$node);

    }

    /**
     * Save the error's stack into DB
     *
     */
    function saveError()
    {
        $project = AccountManager::getInstance()->project;

        if( count($this->errorStack) > 0 ) {

            $sql = 'INSERT INTO errorfiles (`project`, `lang`, `path`, `name`, `maintainer`, `value_en`,`value_lang`,`type`) VALUES ';

            $errorSQL = array();
            $params = array();
            foreach ($this->errorStack as $error) {
                $errorSQL[] = '("%s", "%s", "%s", "%s", "%s", "%s", "%s", "%s")';

                $params[] = $project;
                $params[] = $this->lang;
                $params[] = $this->filePath;
                $params[] = $this->fileName;
                $params[] = $this->maintainer;
                $params[] = $error['value_en'];
                $params[] = $error['value_lang'];
                $params[] = $error['type'];
            }

            $this->conn->query($sql . implode(', ', $errorSQL), $params);

        }

    }

    /**
     * Clear all error from the stack
     *
     */
    function clearError() {
        return $this->errorStack = array();
    }

    /**
     * Add a new error into the stack
     *
     * @param array $error The new error as an array
     *
     */
    function addError($error) {
        if (is_array($error)) { array_push($this->errorStack, $error); }
    }

    /**
     * Run all errors checks
     *
     */
    function run()
    {
        // Check Error specific to EN files
        if( $this->lang == 'en' )
        {
            //$this->checkAcronym(); Disable acronym check for EN document
            $this->missingInitializer();
            $this->spaceOrPeriodRefpurposeTag($this->lang);
            $this->tabCharacterInDocument($this->lang);
            $this->documentNotUTF8($this->lang);
            $this->SgmlDefaultDTDFile($this->lang);
            //$this->checkVCSKeyWords(); Disable for now. This take too much time
        }

        // Check Error specific to LANG files
        else
        {
            $this->attributeAppendixTag();
            $this->attributeBookTag();
            $this->attributePhpdocClassrefTag();
            $this->attributeChapterTag();
            $this->attributeLinkTag();
            $this->attributeXrefTag();
            $this->attributePrefaceTag();
            $this->attributeQandaentryTag();
            $this->attributeRefsec1Tag();
            $this->attributeRefentryTag();
            $this->attributeReferenceTag();
            $this->attributeSect1Tag();
            $this->attributeSectionTag();
            $this->attributeVarlistentryTag();
            $this->classsynopsis();
            $this->methodsynopsis();
            $this->nbCdataTag();
            $this->nbElInTable();
            $this->nbMemberInSeeAlso();
            $this->nbTag();
            $this->spaceOrPeriodRefpurposeTag($this->lang);
            $this->tabCharacterInDocument($this->lang);
            $this->documentNotUTF8($this->lang);
            $this->SgmlDefaultDTDFile($this->lang);
            $this->checkMembershipComment();
            $this->checkPurposeComment();
            $this->checkPhpDocTag();
            //$this->checkVCSKeyWords(); Disable for now. This take too much time
        }

    }

    /**
     * Check SgmlDefaultDTDFile
     * Add an entry into the error's stack if the default's sgml dtd file isn't "~/.phpdoc/manual.ced"
     *
     */
    function SgmlDefaultDTDFile($lang)
    {
        if( $lang == 'en' ) {
            $content = $this->en_content_with_comment;
        } else {
            $content = $this->lang_content_with_comment;
        }

        $matches = array();
        preg_match_all('@sgml-default-dtd-file:"(.*)"@', $content, $matches);

        if ( !empty($matches) && isset($matches[1][0]) && $matches[1][0] != '~/.phpdoc/manual.ced')
        {
            $this->addError(array(
                'value_en'   => 'N/A',
                'value_lang' => 'N/A',
                'type'       => 'SgmlDefaultDTDFile'
            ));
        }
    }


    /**
     * Check all acronyms
     * Add an entry into the error's stack if an acronym is found without <acronym> tag
     *
     */
    function checkAcronym()
    {
        // Get acronyms
        $acronyms = EntitiesAcronymsFetcher::getInstance()->getAcronyms();

        for( $i=0; $i < count($acronyms); $i++ ) {

            $match = array();
            $acronym = $acronyms[$i]['items'];
            preg_match_all("/\s($acronym)\s/si", $this->en_content, $match);

            for( $j=0; $j < count($match[1]); $j++ ) {

                $this->addError(array(
                        'value_en'   => $match[1][$j],
                        'value_lang' => '',
                        'type'       => 'acronym'
                ));

            }
        }
    }

    /**
     * Check attributes in chapter tag
     * Add an entry into the error's stack if an error is found
     *
     */
    function attributeChapterTag()
    {

        $reg = '/<chapter\s*?xml:id="(.*?)"\s*?(xmlns="(.*?)")?\s*?(xmlns:xlink="(.*?)"\s*?)?(version="(.*?)"\s*?)?>/s';

        $en_chapter = array();
        $match = array();
        if (preg_match_all($reg, $this->en_content, $match)) {
            $en_chapter['xmlid'] = $match[1];
            $en_chapter['xmlns'] = $match[3];
            $en_chapter['xmlnsxlink'] = $match[5];
            $en_chapter['version'] = $match[7];
        }

        $lang_chapter = array();
        $match = array();
        if (preg_match_all($reg, $this->lang_content, $match)) {
            $lang_chapter['xmlid'] = $match[1];
            $lang_chapter['xmlns'] = $match[3];
            $lang_chapter['xmlnsxlink'] = $match[5];
            $lang_chapter['version'] = $match[7];
        }

        $properties = array(
        'xmlid'      => 'XmlId',
        'xmlns'      => 'XmlNs',
        'xmlnsxlink' => 'XmlXlink',
        'version'    => 'Version'
        );

        foreach ($properties as $property => $label) {

            if( !isset($en_chapter[$property]) ) {
                $en_chapter[$property] = '';
            }

            if( !isset($en_chapter[$property]) ) {
                $en_chapter[$property] = '';
            }

            for ($i = 0; $i < count($en_chapter[$property]); $i++) {
                if (!isset($en_chapter[$property][$i])) {
                    $en_chapter[$property][$i] = '';
                }
                if (!isset($lang_chapter[$property][$i])) {
                    $lang_chapter[$property][$i] = '';
                }

                if ($en_chapter[$property][$i] != $lang_chapter[$property][$i] ) {
                    $this->addError(array(
                        'value_en'   => $en_chapter[$property][$i],
                        'value_lang' => $lang_chapter[$property][$i],
                        'type'       => 'attribute' . $label . 'Chapter'
                    ));

                }
            }
        }

    }

    /**
     * Check attributes in appendix tag
     * Add an entry into the error's stack if an error is found
     *
     */
    function attributeAppendixTag()
    {

        $reg = '/<appendix\s*?xml:id="(.*?)"\s*?(xmlns="(.*?)")?\s*?(xmlns:xlink="(.*?)"\s*?)?>/s';

        $match = $en_appendix = array();
        preg_match_all($reg, $this->en_content, $match);
        $en_appendix["xmlid"] = $match[1];
        $en_appendix["xmlns"] = $match[3];
        $en_appendix["xmlnsxlink"] = $match[5];

        $match = $lang_appendix = array();
        preg_match_all($reg, $this->lang_content, $match);
        $lang_appendix['xmlid'] = $match[1];
        $lang_appendix['xmlns'] = $match[3];
        $lang_appendix['xmlnsxlink'] = $match[5];


        $properties = array(
        'xmlid' => 'XmlId',
        'xmlns' => 'XmlNs',
        'xmlnsxlink' => 'XmlXlink',
        );

        foreach ($properties as $property => $label) {

            for ($i = 0; $i < count($en_appendix[$property]); $i++) {

                if (!isset($en_appendix[$property][$i])) { $en_appendix[$property][$i] = ''; }
                if (!isset($lang_appendix[$property][$i])) { $lang_appendix[$property][$i] = ''; }

                if ($en_appendix[$property][$i] != $lang_appendix[$property][$i] ) {
                    $this->addError(array(
                        'value_en'   => $en_appendix[$property][$i],
                        'value_lang' => $lang_appendix[$property][$i],
                        'type'       => 'attribute' . $label . 'Appendix',
                    ));

                }
            }
        }
    }

    /**
     * Check attributes in qandaentry tag
     * Add an entry into the error's stack if an error is found
     *
     */
    function attributeQandaentryTag()
    {

        $reg = '/<qandaentry\s*?xml:id="(.*?)"\s*?>/s';

        $match = $en_qandaentry = array();
        if (preg_match_all($reg, $this->en_content, $match)) {
            $en_qandaentry = $match[1];
        }

        $match = $lang_qandaentry = array();
        if (preg_match_all($reg, $this->lang_content, $match)) {
            $lang_qandaentry = $match[1];
        }

        for ($i = 0; $i < count($en_qandaentry); $i++) {

            if (!isset($en_qandaentry[$i])) {
                $en_qandaentry[$i] = '';
            }
            if (!isset($lang_qandaentry[$i])) {
                $lang_qandaentry[$i] = '';
            }

            if ($en_qandaentry[$i] != $lang_qandaentry[$i] ) {
                $this->addError(array(
                    'value_en'   => $en_qandaentry[$i],
                    'value_lang' => $lang_qandaentry[$i],
                    'type'       => 'attributeXmlIdQandaentry'
                ));

            }
        }
    }

    /**
     * Check attributes in Xref tag
     * Add an entry into the error's stack if an error is found
     *
     */
    function attributeXrefTag()
    {

        $reg = '/<xref\s*?linkend=\s*?"(.[^"]*?)"\s*\/>/s';

        $match = $en_xref = array();
        preg_match_all($reg, $this->en_content, $match);
        $en_xref = $match[1];

        $match = $lang_xref = array();
        preg_match_all($reg, $this->lang_content, $match);
        $lang_xref = $match[1];

        for ($i = 0; $i < count($en_xref); $i++) {

            if (!isset($lang_xref[$i])) { $lang_xref[$i] = ''; }

            if( !in_array($en_xref[$i], $lang_xref) || $lang_xref[$i] == '' ) {
                $this->addError(array(
                    "value_en"   => $en_xref[$i],
                    "value_lang" => $lang_xref[$i],
                    "type"       => "attributeLinkendXref"
                ));
            }
        }

        if( count($en_xref) < count($lang_xref) ) {
                $this->addError(array(
                    "value_en"   => count($en_xref),
                    "value_lang" => count($lang_xref),
                    "type"       => "NbXref"
                ));
        }
    }

    /**
     * Check attributes in Link tag
     * Add an entry into the error's stack if an error is found
     *
     */
    function attributeLinkTag()
    {

        $reg = '/<link\s*?xlink:href=\s*?"(.[^"]*?)"(\s*|\s*?\/)?>/s';

        $match = $en_xlink = array();
        preg_match_all($reg, $this->en_content, $match);
        $en_xlink = $match[1];

        $match = $lang_xlink = array();
        preg_match_all($reg, $this->lang_content, $match);
        $lang_xlink = $match[1];

        for ($i = 0; $i < count($en_xlink); $i++) {

            if( !in_array($en_xlink[$i], $lang_xlink) ) {

                if (!isset($lang_xlink[$i])) { $lang_xlink[$i] = ''; }

                $this->addError(array(
                    "value_en"   => $en_xlink[$i],
                    "value_lang" => $lang_xlink[$i],
                    "type"       => "attributeXlinkLink"
                ));

            }

        }

        if( count($en_xlink) < count($lang_xlink) ) {

                $this->addError(array(
                    "value_en"   => count($en_xlink),
                    "value_lang" => count($lang_xlink),
                    "type"       => "NbXlinkLink"
                ));

        }


        $reg = '/<link\s*?linkend=("|\')(.*?)("|\')\s*?>/s';

        $en_linkend = array();
        $match = array();
        if (preg_match_all($reg, $this->en_content, $match)) {
            $en_linkend = $match[2];
        }

        $lang_linkend = array();
        $match = array();
        if (preg_match_all($reg, $this->lang_content, $match)) {
            $lang_linkend = $match[2];
        }

        for ($i = 0; $i <count($en_linkend); $i++) {
            if (!isset($lang_linkend[$i])) {
                $lang_linkend[$i] = '';
            }
            if ($en_linkend[$i] != $lang_linkend[$i]) {
                $this->addError(array(
                    "value_en"   => $en_linkend[$i],
                    "value_lang" => $lang_linkend[$i],
                    "type"       => "attributeLinkendLink"
                ));

            }
        }
    }

    /**
     * Check attributes in Sect1 tag
     * Add an entry into the error's stack if an error is found
     *
     */
    function attributeSect1Tag()
    {

        $reg = '/<sect1\s*?xml:id="(.*?)"\s*?(xmlns="(.*?)")?\s*?(xmlns:xlink="(.*?)"\s*?)?>/s';

        $en_sect1 = array();
        $match = array();
        preg_match_all($reg, $this->en_content, $match);
        $en_sect1["xmlid"] = $match[1];
        $en_sect1["xmlns"] = $match[3];
        $en_sect1["xmlnsxlink"] = $match[5];

        $lang_sect1 = array();
        $match = array();
        preg_match_all($reg, $this->lang_content, $match);
        $lang_sect1["xmlid"] = $match[1];
        $lang_sect1["xmlns"] = $match[3];
        $lang_sect1["xmlnsxlink"] = $match[5];

        for ($i = 0; $i < count($en_sect1["xmlid"]); $i++) {
            if (isset($lang_sect1["xmlid"][$i]) && $en_sect1["xmlid"][$i] != $lang_sect1["xmlid"][$i] ) {
                $this->addError(array(
                    "value_en"   => $en_sect1["xmlid"][$i],
                    "value_lang" => $lang_sect1["xmlid"][$i],
                    "type"       => "attributeXmlIdSect1"
                ));

            }
        }
        for ($i = 0; $i < count($en_sect1["xmlns"]); $i++) {
            if (isset($lang_sect1["xmlns"][$i]) && $en_sect1["xmlns"][$i] != $lang_sect1["xmlns"][$i] ) {
                $this->addError(array(
                    "value_en"   => $en_sect1["xmlns"][$i],
                    "value_lang" => $lang_sect1["xmlns"][$i],
                    "type"       => "attributeXmlNsSect1"
                ));

            }
        }
        for ($i = 0; $i < count($en_sect1["xmlnsxlink"]); $i++) {
            if (isset($lang_sect1["xmlnsxlink"][$i]) && $en_sect1["xmlnsxlink"][$i] != $lang_sect1["xmlnsxlink"][$i] ) {
                $this->addError(array(
                    "value_en"   => $en_sect1["xmlnsxlink"][$i],
                    "value_lang" => $lang_sect1["xmlnsxlink"][$i],
                    "type"       => "attributeXmlNsXlinkSect1"
                ));

            }
        }
    }

    /**
     * Check attributes in <phpdoc:classref> tag
     * Add an entry into the error's stack if an error is found
     *
     */
    function attributePhpdocClassrefTag()
    {
        $reg = '/<phpdoc:classref (.[^>]*)>/s';
        $reg2 = '/(.*?)="(.*?)"/s';

        $en_PhpdocClassref = $match = $_match = array();

        preg_match($reg, $this->en_content, $_match);
        if( !isset($_match[1]) ) $_match[1]=false;
        preg_match_all($reg2, $_match[1], $match);

        for( $i=0; $i < count($match[1]); $i++ ) {
            $en_PhpdocClassref[trim($match[1][$i])] = $match[2][$i];
        }

        $lang_PhpdocClassref = $match = $_match = array();

        preg_match($reg, $this->lang_content, $_match);
        if( !isset($_match[1]) ) $_match[1]=false;
        preg_match_all($reg2, $_match[1], $match);

        for( $i=0; $i < count($match[1]); $i++ ) {
            $lang_PhpdocClassref[trim($match[1][$i])] = $match[2][$i];
        }

        $en_PhpdocClassref["xml:id"] = isset($en_PhpdocClassref["xml:id"]) ? $en_PhpdocClassref["xml:id"] : false;
        $lang_PhpdocClassref["xml:id"] = isset($lang_PhpdocClassref["xml:id"]) ? $lang_PhpdocClassref["xml:id"] : false;

        if ($en_PhpdocClassref["xml:id"] != $lang_PhpdocClassref["xml:id"] ) {
            $this->addError(array(
                "value_en"   => $en_PhpdocClassref["xml:id"],
                "value_lang" => $lang_PhpdocClassref["xml:id"],
                "type"       => "attributeXmlIdPhpdocClassref"
            ));

        }

        $en_PhpdocClassref["xmlns:phpdoc"] = isset($en_PhpdocClassref["xmlns:phpdoc"]) ? $en_PhpdocClassref["xmlns:phpdoc"] : false;
        $lang_PhpdocClassref["xmlns:phpdoc"] = isset($lang_PhpdocClassref["xmlns:phpdoc"]) ? $lang_PhpdocClassref["xmlns:phpdoc"] : false;

        if ($en_PhpdocClassref["xmlns:phpdoc"] != $lang_PhpdocClassref["xmlns:phpdoc"] ) {
            $this->addError(array(
                "value_en"   => $en_PhpdocClassref["xmlns:phpdoc"],
                "value_lang" => $lang_PhpdocClassref["xmlns:phpdoc"],
                "type"       => "attributeXmlNsPhpdocPhpdocClassref"
            ));

        }

        $en_PhpdocClassref["xmlns"] = isset($en_PhpdocClassref["xmlns"]) ? $en_PhpdocClassref["xmlns"] : false;
        $lang_PhpdocClassref["xmlns"] = isset($lang_PhpdocClassref["xmlns"]) ? $lang_PhpdocClassref["xmlns"] : false;

        if ($en_PhpdocClassref["xmlns"] != $lang_PhpdocClassref["xmlns"] ) {
            $this->addError(array(
                "value_en"   => $en_PhpdocClassref["xmlns"],
                "value_lang" => $lang_PhpdocClassref["xmlns"],
                "type"       => "attributeXmlNsBook"
            ));

        }

        $en_PhpdocClassref["xmlns:xlink"] = isset($en_PhpdocClassref["xmlns:xlink"]) ? $en_PhpdocClassref["xmlns:xlink"] : false;
        $lang_PhpdocClassref["xmlns:xlink"] = isset($lang_PhpdocClassref["xmlns:xlink"]) ? $lang_PhpdocClassref["xmlns:xlink"] : false;

        if ($en_PhpdocClassref["xmlns:xlink"] != $lang_PhpdocClassref["xmlns:xlink"] ) {
            $this->addError(array(
                "value_en"   => $en_PhpdocClassref["xmlns:xlink"],
                "value_lang" => $lang_PhpdocClassref["xmlns:xlink"],
                "type"       => "attributeXmlXlinkBook"
            ));
        }

        $en_PhpdocClassref["xmlns:xi"] = isset($en_PhpdocClassref["xmlns:xi"]) ? $en_PhpdocClassref["xmlns:xi"] : false;
        $lang_PhpdocClassref["xmlns:xi"] = isset($lang_PhpdocClassref["xmlns:xi"]) ? $lang_PhpdocClassref["xmlns:xi"] : false;

        if ($en_PhpdocClassref["xmlns:xi"] != $lang_PhpdocClassref["xmlns:xi"] ) {
            $this->addError(array(
                "value_en"   => $en_PhpdocClassref["xmlns:xi"],
                "value_lang" => $lang_PhpdocClassref["xmlns:xi"],
                "type"       => "attributeXmlXlinkBook"
            ));
        }
    }

    /**
     * Check attributes in Book tag
     * Add an entry into the error's stack if an error is found
     *
     */
    function attributeBookTag()
    {

        $reg = '/<book\s*?xml:id="(.*?)"\s*?(xmlns="(.*?)")?\s*?(xmlns:xlink="(.*?)"\s*?)?>/s';

        $en_book = $match = array();
        preg_match_all($reg, $this->en_content, $match);
        $en_book["xmlid"] = $match[1];
        $en_book["xmlns"] = $match[3];
        $en_book["xmlnsxlink"] = $match[5];

        $lang_book = $match = array();
        preg_match_all($reg, $this->lang_content, $match);
        $lang_book["xmlid"] = $match[1];
        $lang_book["xmlns"] = $match[3];
        $lang_book["xmlnsxlink"] = $match[5];

        for ($i = 0; $i < count($en_book["xmlid"]); $i++) {
            if ($en_book["xmlid"][$i] != $lang_book["xmlid"][$i] ) {
                $this->addError(array(
                    "value_en"   => $en_book["xmlid"][$i],
                    "value_lang" => $lang_book["xmlid"][$i],
                    "type"       => "attributeXmlIdBook"
                ));

            }
        }

        for ($i = 0; $i < count($en_book["xmlns"]); $i++) {
            if ($en_book["xmlns"][$i] != $lang_book["xmlns"][$i] ) {
                $this->addError(array(
                    "value_en"   => $en_book["xmlns"][$i],
                    "value_lang" => $lang_book["xmlns"][$i],
                    "type"       => "attributeXmlNsBook"
                ));

            }
        }

        for ($i = 0; $i < count($en_book["xmlnsxlink"]); $i++) {
            if ($en_book["xmlnsxlink"][$i] != $lang_book["xmlnsxlink"][$i] ) {
                $this->addError(array(
                    "value_en"   => $en_book["xmlnsxlink"][$i],
                    "value_lang" => $lang_book["xmlnsxlink"][$i],
                    "type"       => "attributeXmlXlinkBook"
                ));
            }
        }
    }

    /**
     * Check attributes in Preface tag
     * Add an entry into the error's stack if an error is found
     *
     */
    function attributePrefaceTag()
    {

        $reg = '/<preface\s*?xml:id="(.*?)"\s*?(xmlns="(.*?)")?\s*?(xmlns:xlink="(.*?)"\s*?)?>/s';

        $match = $en_preface = array();
        if (preg_match_all($reg, $this->en_content, $match)) {
            $en_preface['xmlid']      = $match[1];
            $en_preface['xmlns']      = $match[3];
            $en_preface['xmlnsxlink'] = $match[5];
        }

        $match = $lang_preface = array();
        if (preg_match_all($reg, $this->lang_content, $match)) {
            $lang_preface['xmlid']      = $match[1];
            $lang_preface['xmlns']      = $match[3];
            $lang_preface['xmlnsxlink'] = $match[5];
        }

        $properties = array(
            'xmlid'      => 'XmlId',
            'xmlns'      => 'XmlNs',
            'xmlnsxlink' => 'XmlNsXlink'
        );
        foreach ($properties as $property => $label) {

            if( !isset($en_preface[$property]) ) {
                $en_preface[$property] = '';
            }

            if( !isset($lang_preface[$property]) ) {
                $lang_preface[$property] = '';
            }

            for ($i = 0; $i < count($en_preface[$property]); $i++) {

                if( !isset($en_preface[$property][$i]) ) {
                    $en_preface[$property][$i] = '';
                }

                if( !isset($lang_preface[$property][$i]) ) {
                    $lang_preface[$property][$i] = '';
                }

                if ($en_preface[$property][$i] != $lang_preface[$property][$i] ) {
                    $this->addError(array(
                        'value_en' => $en_preface[$property][$i],
                        'value_lang' => $lang_preface[$property][$i],
                        'type' => 'attribute' . $label . 'Preface'
                    ));

                }
            }
        }
    }

    /**
     * Check attributes in Section tag
     * Add an entry into the error's stack if an error is found
     *
     */
    function attributeSectionTag()
    {

        $reg = '/<section\s*?xml:id=("|\')(.*?)("|\')\s*?(xmlns=("|\')(.*?)("|\'))?\s*?(xmlns:xlink=("|\')(.*?)("|\')\s*?)?>/s';

        $en_section = array();
        $match = array();
        if (preg_match_all($reg, $this->en_content, $match)) {
            $en_section["xmlid"] = $match[2];
            $en_section["xmlns"] = $match[6];
            $en_section["xmlnsxlink"] = $match[10];
        }

        $lang_section = array();
        $match = array();
        if (preg_match_all($reg, $this->lang_content, $match)) {
            $lang_section["xmlid"] = $match[2];
            $lang_section["xmlns"] = $match[6];
            $lang_section["xmlnsxlink"] = $match[10];
        }

        $properties = array(
            'xmlid'      => 'XmlId',
            'xmlns'      => 'XmlNs',
            'xmlnsxlink' => 'XmlNsXlink'
        );

        foreach ($properties as $property => $label) {

            if( !isset($en_section[$property]) ) {
                $en_section[$property] = '';
            }

            if( !isset($lang_section[$property]) ) {
                $lang_section[$property] = '';
            }

            for ($i = 0; $i < count($en_section[$property]); $i++) {

                if( !isset($en_section[$property][$i]) ) {
                    $en_section[$property][$i] = '';
                }

                if( !isset($lang_section[$property][$i]) ) {
                    $lang_section[$property][$i] = '';
                }

                if ($en_section[$property][$i] != $lang_section[$property][$i] ) {
                    $this->addError(array(
                        'value_en'   => $en_section[$property][$i],
                        'value_lang' => $lang_section[$property][$i],
                        'type'       => 'attribute' . $label . 'Section'
                    ));

                }
            }

        }
    }

    /**
     * Check attributes in Varlistentry tag
     * Add an entry into the error's stack if an error is found
     *
     */
    function attributeVarlistentryTag()
    {

        $reg = '/<varlistentry\s*?xml:id=("|\')(.*?)("|\')\s*?>/s';

        $match = $en_varlistentry = array();
        if (preg_match_all($reg, $this->en_content, $match)) {
            $en_varlistentry = $match[2];
        }

        $match = $lang_varlistentry = array();
        if (preg_match_all($reg, $this->lang_content, $match)) {
            $lang_varlistentry = $match[2];
        }

        for ($i = 0; $i < count($en_varlistentry); $i++) {

            if (!isset($en_varlistentry[$i]) )   {
                $en_varlistentry[$i]   = '';
            }
            if (!isset($lang_varlistentry[$i])) {
                $lang_varlistentry[$i] = '';
            }

            if ($en_varlistentry[$i] != $lang_varlistentry[$i] ) {
                $this->addError(array(
                "value_en"   => $en_varlistentry[$i],
                "value_lang" => $lang_varlistentry[$i],
                "type"       => "attributeXmlIdVarlistentry"
                ));
            }
        }
    }

    /**
     * Check attributes in Reference tag
     * Add an entry into the error's stack if an error is found
     *
     */
    function attributeReferenceTag()
    {

        $reg = '/<reference\s*?xml:id="(.*?)"\s*?xmlns="(.*?)"\s*?(xmlns:xlink="(.*?)"\s*?)?>/s';

        $en_reference = array();
        $match = array();
        preg_match_all($reg, $this->en_content, $match);
        $en_reference["xmlid"] = $match[1];
        $en_reference["xmlns"] = $match[2];
        $en_reference["xmlnsxlink"] = $match[4];

        $lang_reference = array();
        $match = array();
        preg_match_all($reg, $this->lang_content, $match);
        $lang_reference["xmlid"] = $match[1];
        $lang_reference["xmlns"] = $match[2];
        $lang_reference["xmlnsxlink"] = $match[4];

        for ($i = 0; $i < count($en_reference["xmlid"]); $i++) {

            if (!isset($en_reference["xmlid"][$i]) )   { $en_reference["xmlid"][$i]   = ''; }
            if (!isset($lang_reference["xmlid"][$i])) { $lang_reference["xmlid"][$i] = ''; }

            if ($en_reference["xmlid"][$i] != $lang_reference["xmlid"][$i] ) {
                $this->addError(array(
                    "value_en"   => $en_reference["xmlid"][$i],
                    "value_lang" => $lang_reference["xmlid"][$i],
                    "type"       => "attributeXmlIDReference"
                ));

            }
        }

        for ($i = 0; $i < count($en_reference["xmlns"]); $i++) {

            if (!isset($en_reference["xmlns"][$i]) )   { $en_reference["xmlns"][$i]   = ''; }
            if (!isset($lang_reference["xmlns"][$i])) { $lang_reference["xmlns"][$i] = ''; }

            if ($en_reference["xmlns"][$i] != $lang_reference["xmlns"][$i] ) {
                $this->addError(array(
                    "value_en"   => $en_reference["xmlns"][$i],
                    "value_lang" => $lang_reference["xmlns"][$i],
                    "type"       => "attributeXmlNsReference"
                ));
            }
        }

        for ($i = 0; $i < count($en_reference["xmlnsxlink"]); $i++) {

            if (!isset($en_reference["xmlnsxlink"][$i]) )   { $en_reference["xmlnsxlink"][$i]   = ''; }
            if (!isset($lang_reference["xmlnsxlink"][$i])) { $lang_reference["xmlnsxlink"][$i] = ''; }

            if ($en_reference["xmlnsxlink"][$i] != $lang_reference["xmlnsxlink"][$i] ) {
                $this->addError(array(
                    "value_en"   => $en_reference["xmlnsxlink"][$i],
                    "value_lang" => $lang_reference["xmlnsxlink"][$i],
                    "type"       => "attributeXmlNsXlinkReference"
                ));
            }
        }
    }

    /**
     * Check attributes in Refentry tag
     * Add an entry into the error's stack if an error is found
     *
     */
    function attributeRefentryTag()
    {

        $reg = '/<refentry\s*?xml:id="(.*?)"\s*?xmlns="(.*?)"\s*?(xmlns:xlink="(.*?)"\s*?)?>/s';

        $en_refentry = array();
        $match = array();
        preg_match_all($reg, $this->en_content, $match);
        $en_refentry["xmlid"]      = $match[1];
        $en_refentry["xmlns"]      = $match[2];
        $en_refentry["xmlnsxlink"] = $match[4];

        $lang_refentry = array();
        $match = array();
        preg_match_all($reg, $this->lang_content, $match);
        $lang_refentry["xmlid"] = $match[1];
        $lang_refentry["xmlns"] = $match[2];
        $lang_refentry["xmlnsxlink"] = $match[4];

        for ($i = 0; $i < count($en_refentry["xmlid"]); $i++) {

            if (!isset($en_refentry["xmlid"][$i])) { $en_refentry["xmlid"][$i] = ''; }
            if (!isset($lang_refentry["xmlid"][$i])) { $lang_refentry["xmlid"][$i] = ''; }

            if ($en_refentry["xmlid"][$i] != $lang_refentry["xmlid"][$i] ) {
                $this->addError(array(
                    "value_en"   => $en_refentry["xmlid"][$i],
                    "value_lang" => $lang_refentry["xmlid"][$i],
                    "type"       => "attributeXmlIdRefentry"
                ));
            }
        }

        for ($i = 0; $i < count($en_refentry["xmlns"]); $i++) {

            if (!isset($en_refentry["xmlns"][$i])) { $en_refentry["xmlns"][$i] = ''; }
            if (!isset($lang_refentry["xmlns"][$i])) { $lang_refentry["xmlns"][$i] = ''; }

            if ($en_refentry["xmlns"][$i] != $lang_refentry["xmlns"][$i] ) {
                $this->addError(array(
                    "value_en"   => $en_refentry["xmlns"][$i],
                    "value_lang" => $lang_refentry["xmlns"][$i],
                    "type"       => "attributeXmlNsRefentry"
                ));

            }
        }

        for ($i = 0; $i < count($en_refentry["xmlnsxlink"]); $i++) {

            if (!isset($en_refentry["xmlnsxlink"][$i])) { $en_refentry["xmlnsxlink"][$i] = ''; }
            if (!isset($lang_refentry["xmlnsxlink"][$i])) { $lang_refentry["xmlnsxlink"][$i] = ''; }

            if ($en_refentry["xmlnsxlink"][$i] != $lang_refentry["xmlnsxlink"][$i] ) {
                $this->addError(array(
                    "value_en"   => $en_refentry["xmlnsxlink"][$i],
                    "value_lang" => $lang_refentry["xmlnsxlink"][$i],
                    "type"       => "attributeXmlNsXlinkRefentry"
                ));

            }
        }
    }

    /**
     * Check attributes in Refsec1 tag
     * Add an entry into the error's stack if an error is found
     *
     */
    function attributeRefsec1Tag()
    {

        $reg = '/<refsect1\s*?role="(.*?)"\s*?>/s';

        $en_refsect1 = array();
        $match = array();
        preg_match_all($reg, $this->en_content, $match);
        $en_refsect1 = $match[1];

        $lang_refsect1 = array();
        $match = array();
        preg_match_all($reg, $this->lang_content, $match);
        $lang_refsect1 = $match[1];

        for ($i = 0; $i < count($en_refsect1); $i++) {
            if (isset($lang_refsect1[$i]) && $en_refsect1[$i] != $lang_refsect1[$i] ) {
                $this->addError(array(
                    "value_en"   => $en_refsect1[$i],
                    "value_lang" => $lang_refsect1[$i],
                    "type"       => "attributeRefsect1"
                ));
            }
        }
    }
    /**
     * Check Space or period at the end of Refpurpose tag
     * Add an entry into the error's stack if an error is found
     *
     */
    function spaceOrPeriodRefpurposeTag($lang)
    {

        $reg = '/<refpurpose>.*([^A-Za-z1-9 ])<\/refpurpose>/s';

        if( $lang == 'en' ) {
            $content = $this->en_content;
        } else {
            $content = $this->lang_content;
        }

        $match = array();
        preg_match_all($reg, $this->lang_content, $match);

        if (isset($match[1][0])) {

            if ($match[1][0] == '.')  {
                $this->addError(array(
                    'value_en'   => 'N/A',
                    'value_lang' => 'N/A',
                    'type'       => 'spaceOrPeriodRefpurpose'
                ));
            }
        }
    }

    /**
     * Check for missing <initializer> tag
     * Add an entry into the error's stack if a missing <initializer> tag was found
     *
     * This is the convertion of the following script :
     * https://svn.php.net/viewvc/phpdoc/doc-base/trunk/scripts/check-missing-initializers.php?view=markup
     *
     * This method is only available for EN files.
     */
    function missingInitializer()
    {
	$matches = array();
	preg_match_all('@<methodparam choice="opt"><type>(.*)</type><parameter>(.*)</parameter>(.*)</methodparam>@', $this->en_content, $matches);

	if ( !empty($matches))
	{
            $i=0;
	    foreach ($matches[3] as $match) {
		if ( (empty($match) || (false === strpos($match, '<initializer>')) ) && trim($matches[2][$i]) != '...' ) {
		    $this->addError(array(
			'value_en'   => $matches[2][$i],
			'value_lang' => 'N/A',
			'type'       => 'missingInitializer'
		    ));
		}
                $i++;
	    }
	}
    }

    /**
     * Check for tabs into the document
     * Add an entry into the error's stack if a tab is found in the document
     *
     */
    function tabCharacterInDocument($lang)
    {

        if( $lang == 'en' ) {
            $content = $this->en_content;
        } else {
            $content = $this->lang_content;
        }

        if ( strstr($content, "\t")) {

            $this->addError(array(
                'value_en'   => 'N/A',
                'value_lang' => 'N/A',
                'type'       => 'tabCharacterInDocument'
            ));
        }
    }

    /**
     * Check the document encoding
     * Add an entry into the error's stack if the document is not UTF-8
     *
     */
    function documentNotUTF8($lang)
    {
        if( $lang == 'en' ) {
            $content = $this->en_content;
        } else {
            $content = $this->lang_content;
        }

        $exprs = array(
            '#<\?xml[^>]+encoding=([\'"])[Uu][Tt][Ff]-8\1#U',
            '#<meta\s+(?:(?:http-equiv\s*=\s*([\'"])content-type\1\s*)|(?:content\s*=\s*([\'"])text/html\s*;.*charset\s*=\s*utf-?8.*\2\s*)){2}#Ui',
            '#<meta\s+charset\s*=\s*([\'"])utf-?8\1#Ui',
        );

        foreach ($exprs as $expr) {
            if ( $match = preg_match($expr, $content) ) {
                break;
            }
        }

        if (!$match) {
            $this->addError(array(
                'value_en'   => 'N/A',
                'value_lang' => 'N/A',
                'type'       => 'documentNotUTF8'
            ));
        }
    }

    /**
     * Check Nb <![CDATA tag
     * Add an entry into the error's stack if an error is found
     *
     */
    function nbCdataTag()
    {

        $reg = '/<!\[CDATA\[(.*?)\]\]>/s';

        $en_cdataSection = 0;
        $match = array();
        if (preg_match_all($reg, $this->en_content, $match)) {
            $en_cdataSection = count($match[1]);
        }

        $lang_cdataSection = 0;
        $match = array();
        if (preg_match_all($reg, $this->lang_content, $match)) {
            $lang_cdataSection = count($match[1]);
        }

        if ($en_cdataSection != $lang_cdataSection ) {
            $this->addError(array(
                "value_en"   => $en_cdataSection,
                "value_lang" => $lang_cdataSection,
                "type"       => "nbCdataTag"
            ));
        }
    }

    /**
     * Check error in <classsynopsis> tag
     * Add an entry into the error's stack if an error is found
     *
     */
    function classsynopsis()
    {

        $reg1 = '/<classsynopsis>(\s.*?)<\/classsynopsis>/s';
        $reg2 = '/<ooclass><classname>(.*?)<\/classname><\/ooclass>/s';
        $reg3 = '/<fieldsynopsis>\s*?<modifier>(.*?)<\/modifier>\s*?<type>(.*?)<\/type>\s*?<varname(.*?)>(.*?)<\/varname>\s*?(<initializer>(.*?)<\/initializer>\s*?)?<\/fieldsynopsis>/s';

        $match = $en_classsynopsis = array();
        preg_match_all($reg1, $this->en_content, $match);

        for ($i = 0; $i < count($match[1]); $i++) {
            $match2 = array();
            preg_match_all($reg2, $match[1][$i], $match2);
            if (!isset($match2[1][0])) { $match2[1][0] = ''; }
            $en_classsynopsis[$i]['ooclass']['classname']['libel'] = $match2[1][0];
            $en_classsynopsis[$i]['ooclass']['classname']['nb'] = count($match2[1]);

            $match2 = array();
            preg_match_all($reg3, $match[1][$i], $match2);
            $en_classsynopsis[$i]['fieldsynopsis']['modifier']            = $match2[1];
            $en_classsynopsis[$i]['fieldsynopsis']['type']                = $match2[2];
            $en_classsynopsis[$i]['fieldsynopsis']['varname']['attr']     = $match2[3];
            $en_classsynopsis[$i]['fieldsynopsis']['varname']['value']    = $match2[4];
            $en_classsynopsis[$i]['fieldsynopsis']['initializer']         = $match2[6];

        }

        $lang_classsynopsis = array();
        $match = array();
        preg_match_all($reg1, $this->lang_content, $match);

        for ($i = 0; $i < count($match[1]); $i++) {
            $match2 = array();
            preg_match_all($reg2, $match[1][$i], $match2);
            if (!isset($match2[1][0])) { $match2[1][0] = ''; }
            $lang_classsynopsis[$i]['ooclass']['classname']['libel'] = $match2[1][0];
            $lang_classsynopsis[$i]['ooclass']['classname']['nb'] = count($match2[1]);

            preg_match_all($reg3, $match[1][$i], $match2);

            $lang_classsynopsis[$i]['fieldsynopsis']['modifier']            = $match2[1];
            $lang_classsynopsis[$i]['fieldsynopsis']['type']                = $match2[2];
            $lang_classsynopsis[$i]['fieldsynopsis']['varname']['attr']     = $match2[3];
            $lang_classsynopsis[$i]['fieldsynopsis']['varname']['value']    = $match2[4];
            $lang_classsynopsis[$i]['fieldsynopsis']['initializer']         = $match2[6];

        }

        // Verification
        for ($i = 0; $i < count($en_classsynopsis); $i++) {

            if (!isset($lang_classsynopsis[$i]['ooclass']['classname']['libel'])) {
                $lang_classsynopsis[$i]['ooclass']['classname']['libel'] = '';
            }

            // ooclass, classname
            if ($en_classsynopsis[$i]['ooclass']['classname']['libel'] != $lang_classsynopsis[$i]['ooclass']['classname']['libel'] ) {
                $this->addError(array(
                    "value_en"   => $en_classsynopsis[$i]['ooclass']['classname']['libel'],
                    "value_lang" => $lang_classsynopsis[$i]['ooclass']['classname']['libel'],
                    "type"       => "errorOoclassClassname"
                ));

            }
            if (!isset($lang_classsynopsis[$i]['ooclass']['classname']['nb'])) { $lang_classsynopsis[$i]['ooclass']['classname']['nb'] = 0; }

            // ooclass, classname
            if ($en_classsynopsis[$i]['ooclass']['classname']['nb'] != $lang_classsynopsis[$i]['ooclass']['classname']['nb'] ) {
                $this->addError(array(
                    "value_en"   => $en_classsynopsis[$i]['ooclass']['classname']['nb'],
                    "value_lang" => $lang_classsynopsis[$i]['ooclass']['classname']['nb'],
                    "type"       => "errorNbOoclassClassname"
                ));

            }


            // fieldsynopsis
            for ($j = 0; $j < count($en_classsynopsis[$i]['fieldsynopsis']['varname']['value']); $j++ ) {

                // fieldsynopsis varname value
                if (!isset($lang_classsynopsis[$i]['fieldsynopsis']['varname']['value'][$j])) {
                    $lang_classsynopsis[$i]['fieldsynopsis']['varname']['value'][$j] = '';
                }
                if ($en_classsynopsis[$i]['fieldsynopsis']['varname']['value'][$j] != $lang_classsynopsis[$i]['fieldsynopsis']['varname']['value'][$j] ) {
                    $this->addError(array(
                        "value_en"   => $en_classsynopsis[$i]['fieldsynopsis']['varname']['value'][$j],
                        "value_lang" => $lang_classsynopsis[$i]['fieldsynopsis']['varname']['value'][$j],
                        "type"       => "errorFieldsynopsisVarnameValue"
                    ));

                }

                // fieldsynopsis varname attr
                if (!isset($lang_classsynopsis[$i]['fieldsynopsis']['varname']['attr'][$j])) {
                    $lang_classsynopsis[$i]['fieldsynopsis']['varname']['attr'][$j] = '';
                }
                if ($en_classsynopsis[$i]['fieldsynopsis']['varname']['attr'][$j] != $lang_classsynopsis[$i]['fieldsynopsis']['varname']['attr'][$j] ) {
                    $this->addError(array(
                        "value_en"   => $en_classsynopsis[$i]['fieldsynopsis']['varname']['attr'][$j],
                        "value_lang" => $lang_classsynopsis[$i]['fieldsynopsis']['varname']['attr'][$j],
                        "type"       => "errorFieldsynopsisVarnameAttr"
                    ));

                }

                // fieldsynopsis type
                if (!isset($lang_classsynopsis[$i]['fieldsynopsis']['type'][$j])) {
                    $lang_classsynopsis[$i]['fieldsynopsis']['type'][$j] = '';
                }
                if ($en_classsynopsis[$i]['fieldsynopsis']['type'][$j] != $lang_classsynopsis[$i]['fieldsynopsis']['type'][$j] ) {
                    $this->addError(array(
                        "value_en"   => $en_classsynopsis[$i]['fieldsynopsis']['type'][$j],
                        "value_lang" => $lang_classsynopsis[$i]['fieldsynopsis']['type'][$j],
                        "type"       => "errorFieldsynopsisType"
                    ));

                }

                // fieldsynopsis modifier
                if (!isset($lang_classsynopsis[$i]['fieldsynopsis']['modifier'][$j])) { $lang_classsynopsis[$i]['fieldsynopsis']['modifier'][$j] = ''; }
                if ($en_classsynopsis[$i]['fieldsynopsis']['modifier'][$j] != $lang_classsynopsis[$i]['fieldsynopsis']['modifier'][$j] ) {
                    $this->addError(array(
                        "value_en"   => $en_classsynopsis[$i]['fieldsynopsis']['modifier'][$j],
                        "value_lang" => $lang_classsynopsis[$i]['fieldsynopsis']['modifier'][$j],
                        "type"       => "errorFieldsynopsisModifier"
                    ));

                }

                // fieldsynopsis initializer
                if (!isset($lang_classsynopsis[$i]['fieldsynopsis']['initializer'][$j])) { $lang_classsynopsis[$i]['fieldsynopsis']['initializer'][$j] = ''; }
                if ($en_classsynopsis[$i]['fieldsynopsis']['initializer'][$j] != $lang_classsynopsis[$i]['fieldsynopsis']['initializer'][$j] ) {
                    $this->addError(array(
                        "value_en"   => $en_classsynopsis[$i]['fieldsynopsis']['initializer'][$j],
                        "value_lang" => $lang_classsynopsis[$i]['fieldsynopsis']['initializer'][$j],
                        "type"       => "errorFieldsynopsisInitializer"
                    ));

                }

            }
        }
    }

    /**
     * Check Nb <*> tag
     * Add an entry into the error's stack if an error is found
     *
     */
    function nbTag()
    {

        // When you add a new tag here, you must add it too into error_type.php files (array => tags)
        $tags = array(
            'abbrev'      => 'Abbrev',
            'acronym'     => 'Acronym',
            'caution'     => 'Caution',
            'command'     => 'Command',
            'chapter'     => 'Chapter',
            'constant'    => 'Constant',
            'emphasis'    => 'Emphasis',
            'filename'    => 'Filename',
            'literal'     => 'Literal',
            'note'        => 'Note',
            'para'        => 'Para',
            'productname' => 'Productname',
            'simpara'     => 'Simpara',
            'tip'         => 'Tip',
            'userinput'   => 'Userinput',
            'varname'     => 'Varname',
            'warning'     => 'Warning'
        );

        foreach ($tags as $tag => $label) {

            $reg = '/<' . $tag . '(\s|>)/s';

            $nb_en = 0;
            $match = array();
            if (preg_match_all($reg, $this->en_content, $match)) {
                $nb_en = count($match[0]);
            }

            $nb_lang = 0;
            $match = array();
            if (preg_match_all($reg, $this->lang_content, $match)) {
                $nb_lang = count($match[0]);
            }

            if ($nb_en != $nb_lang ) {
                $this->addError(array(
                    "value_en"   => $nb_en,
                    "value_lang" => $nb_lang,
                    "type"       => "nb" . $label . "Tag"
                ));
            }

        } // foreach

    }

    /**
     * Check attr in <row> tag
     * Add an entry into the error's stack if an error is found
     *
     */
    function nbElInTable()
    {

        $reg = '/<row(\s.*?)xml:id="(.*?)">/s';

        $en_attrRow = array();
        $lang_attrRow = array();
        $match = array();

        $lang_attrRow['xmlid']='';
        $en_attrRow['xmlid']='';

        if (preg_match_all($reg, $this->en_content, $match)) {
            $en_attrRow['xmlid'] = $match[2];
        }

        $match = array();
        if (preg_match_all($reg, $this->lang_content, $match)) {
            $lang_attrRow['xmlid'] = $match[2];
        }

        for ($i = 0; $i < count($en_attrRow['xmlid']); $i++) {

            if (!isset($en_attrRow['xmlid'][$i])) { $en_attrRow['xmlid'][$i] = ''; }
            if (!isset($lang_attrRow['xmlid'][$i])) { $lang_attrRow['xmlid'][$i] = ''; }

            if ($en_attrRow['xmlid'][$i] != $lang_attrRow['xmlid'][$i] ) {
                $this->addError(array(
                    'value_en'   => $en_attrRow['xmlid'][$i],
                    'value_lang' => $lang_attrRow['xmlid'][$i],
                    'type'       => 'attributeXmlIdRow'
                ));

            }
        }

        $tags = array('row', 'thead', 'tbody', 'entry');

        foreach ($tags as $tag) {

            $reg = '/<' . $tag . '>/s';
            $en_tag = 0;
            $match = array();
            if (preg_match_all($reg, $this->en_content, $match)) {
                $en_tag = count($match[0]);
            }

            $lang_tag = 0;
            $match = array();
            if (preg_match_all($reg, $this->lang_content, $match)) {
                $lang_tag = count($match[0]);
            }

            if ($en_tag != $lang_tag) {
                $this->addError(array(
                    'value_en'   => $en_tag,
                    'value_lang' => $lang_tag,
                    'type'       => 'nb' . ucfirst($tag) . 'Tag'
                ));
            }
        }

    }

    /**
     * Check SeeAlso section : check nb member
     * Add an entry into the error's stack if an error is found
     *
     */
    function nbMemberInSeeAlso()
    {

        $reg  = '!<refsect1 role="seealso">(.*)</refsect1>!s';
        $reg2 = '!<member>(.*?)</member>!s';

        $match = array();
        $en_seeAlsoMember = 0;
        preg_match($reg, $this->en_content, $match);

        if (isset($match[1])) {
            $match2 = array();
            preg_match_all($reg2, $match[1], $match2);
            if (isset($match2[1])) {
                $en_seeAlsoMember = count($match2[1]);
            }
        }

        $match = array();
        $lang_seeAlsoMember = 0;
        preg_match($reg, $this->lang_content, $match);

        if (isset($match[1])) {
            $match2 = array();
            preg_match_all($reg2, $match[1], $match2);
            if (isset($match2[1])) {
                $lang_seeAlsoMember = count($match2[1]);
            }
        }

        if ($en_seeAlsoMember != $lang_seeAlsoMember ) {
            $this->addError(array(
                    "value_en"   => $en_seeAlsoMember,
                    "value_lang" => $lang_seeAlsoMember,
                    "type"       => "nbSeeAlsoMember"
            ));

        }
    }

    /**
     * Check methodsynopsis
     * Add an entry into the error's stack if an error is found
     *
     */
    function methodsynopsis()
    {

        $reg1 = '/<methodsynopsis>(\s.*?)<\/methodsynopsis>/s';
        $reg2 = '/(<modifier>(.*?)<\/modifier>)?\s*?<type>(.*?)<\/type>\s*?<methodname>(.*?)<\/methodname>/s';
        $reg3 = '/<methodparam\s*?((choice=\'opt\')|(choice="opt"))?>\s*?<type>(.*?)<\/type>\s*?<parameter\s*?((role=\'reference\')|(role="reference"))?>(.*?)<\/parameter>\s*?(<initializer>(.*?)<\/initializer>\s*?)?<\/methodparam>/s';


        $match = $en_methodsynopsis = array();
        preg_match_all($reg1, $this->en_content, $match);

        for ($i = 0; $i < count($match[1]); $i++) {

            $match2 = array();

            preg_match_all($reg2, $match[1][$i], $match2);

            if (isset($match2[2][0]) && isset($match2[1][0])) {

                $en_methodsynopsis[$i]['methodname']['name'] = $match2[2][0];
                $en_methodsynopsis[$i]['methodname']['type'] = $match2[1][0];
                $en_methodsynopsis[$i]['methodname']['modifier'] = $match2[2][0];

                $match2 = array();
                preg_match_all($reg3, $match[1][$i], $match2);

                $en_methodsynopsis[$i]['methodparam']['parameter']   = $match2[8];
                $en_methodsynopsis[$i]['methodparam']['initializer'] = $match2[10];
                $en_methodsynopsis[$i]['methodparam']['type']        = $match2[4];



                for ($j = 0; $j < count($match2[1]); $j++) {
                    if (trim($match2[1][$j]) == 'choice="opt"' || trim($match2[1][$j]) == "choice='opt'" ) {
                        $en_methodsynopsis[$i]['methodparam']['optionnel'][$j] = 1;
                    }
                    else {
                        $en_methodsynopsis[$i]['methodparam']['optionnel'][$j] = 0;
                    }
                }

                for ($j = 0; $j < count($match2[5]); $j++) {
                    if (trim($match2[5][$j]) == "role='reference'" || trim($match2[5][$j]) == 'role="reference"' ) {
                        $en_methodsynopsis[$i]['methodparam']['role'][$j] = 1;
                    }
                    else {
                        $en_methodsynopsis[$i]['methodparam']['role'][$j] = 0;
                    }
                }

            }
        }

        $match = $lang_methodsynopsis = array();
        preg_match_all($reg1, $this->lang_content, $match);

        for ($i = 0; $i < count($match[1]); $i++) {

            $match2 = array();
            preg_match_all($reg2, $match[1][$i], $match2);

            if (isset($match2[2][0]) && isset($match2[1][0])) {

                $lang_methodsynopsis[$i]['methodname']['name'] = $match2[2][0];
                $lang_methodsynopsis[$i]['methodname']['type'] = $match2[1][0];
                $lang_methodsynopsis[$i]['methodname']['modifier'] = $match2[2][0];

                $match2 = array();
                preg_match_all($reg3, $match[1][$i], $match2);

                $lang_methodsynopsis[$i]['methodparam']['parameter']   = $match2[8];
                $lang_methodsynopsis[$i]['methodparam']['initializer'] = $match2[10];
                $lang_methodsynopsis[$i]['methodparam']['type']        = $match2[4];

                for ($j=0; $j < count($match2[1]); $j++) {

                    if (trim($match2[1][$j]) == 'choice="opt"' || trim($match2[1][$j]) == "choice='opt'" ) {
                        $lang_methodsynopsis[$i]['methodparam']['optionnel'][$j] = 1;
                    } else {
                        $lang_methodsynopsis[$i]['methodparam']['optionnel'][$j] = 0;
                    }

                }

                for ($j=0; $j < count($match2[5]); $j++) {
                    if (trim($match2[5][$j]) == "role='reference'" || trim($match2[5][$j]) == 'role="reference"' ) {
                        $lang_methodsynopsis[$i]['methodparam']['role'][$j] = 1;
                    } else {
                        $lang_methodsynopsis[$i]['methodparam']['role'][$j] = 0;
                    }

                }

            }

        }

        for ($i = 0; $i < count($en_methodsynopsis); $i++) {

            // Check on name
            if (isset($en_methodsynopsis[$i]['methodname']['name'])) {

                if (!isset($lang_methodsynopsis[$i]['methodname']['name'])) { $lang_methodsynopsis[$i]['methodname']['name'] = ''; }
                if ($en_methodsynopsis[$i]['methodname']['name'] != $lang_methodsynopsis[$i]['methodname']['name'] ) {
                    $this->addError(array(
                        'value_en'   => $en_methodsynopsis[$i]['methodname']['name'],
                        'value_lang' => $lang_methodsynopsis[$i]['methodname']['name'],
                        'type'       => 'errorMethodnameMethodsynopsis'
                    ));

                }

            }

            // Check on type
            if (isset($en_methodsynopsis[$i]['methodname']['type'])) {

                if (!isset($lang_methodsynopsis[$i]['methodname']['type'])) { $lang_methodsynopsis[$i]['methodname']['type'] = ''; }
                if ($en_methodsynopsis[$i]['methodname']['type'] != $lang_methodsynopsis[$i]['methodname']['type'] ) {
                    $this->addError(array(
                        'value_en'   => $en_methodsynopsis[$i]['methodname']['type'],
                        'value_lang' => $lang_methodsynopsis[$i]['methodname']['type'],
                        'type'       => 'errorTypeMethodsynopsis'
                    ));

                }
            }

            // Check on modifier
            if (isset($en_methodsynopsis[$i]['methodname']['modifier'])) {

                if (!isset($lang_methodsynopsis[$i]['methodname']['modifier'])) { $lang_methodsynopsis[$i]['methodname']['modifier'] = ''; }
                if ($en_methodsynopsis[$i]['methodname']['modifier'] != $lang_methodsynopsis[$i]['methodname']['modifier'] ) {

                    $this->addError(array(
                        'value_en'   => $en_methodsynopsis[$i]['methodname']['modifier'],
                        'value_lang' => $lang_methodsynopsis[$i]['methodname']['modifier'],
                        'type'       => 'errorModifierMethodsynopsis'
                    ));

                }
            }

            // Check on methodparam
            if (isset($en_methodsynopsis[$i]['methodparam']['parameter'])) {

                // Init
                if (!isset($en_methodsynopsis[$i]['methodparam']['parameter']))   { $en_methodsynopsis[$i]['methodparam']['parameter']=array(); }
                if (!isset($lang_methodsynopsis[$i]['methodparam']['parameter'])) { $lang_methodsynopsis[$i]['methodparam']['parameter']=array(); }

                // Check on Nb
                $nb_lang = count($lang_methodsynopsis[$i]['methodparam']['parameter']);
                $nb_en = count($en_methodsynopsis[$i]['methodparam']['parameter']);

                if ($nb_lang != $nb_en){
                    $this->addError(array(
                        'value_en'   => $nb_en,
                        'value_lang' => $nb_lang,
                        'type'       => 'errorNbMethodparamMethodsynopsis'
                    ));
                }

                for($j=0;$j<count($en_methodsynopsis[$i]['methodparam']['parameter']);$j++) {

                    // Check on parameter
                    if (isset($en_methodsynopsis[$i]['methodparam']['parameter'][$j])) {

                        if (!isset($lang_methodsynopsis[$i]['methodparam']['parameter'][$j])) { $lang_methodsynopsis[$i]['methodparam']['parameter'][$j]=''; }

                        if ($en_methodsynopsis[$i]['methodparam']['parameter'][$j] != $lang_methodsynopsis[$i]['methodparam']['parameter'][$j]) {
                            $this->addError(array(
                                'value_en'   => $en_methodsynopsis[$i]['methodparam']['parameter'][$j],
                                'value_lang' => $lang_methodsynopsis[$i]['methodparam']['parameter'][$j],
                                'type'       => 'errorParameterNameMethodsynopsis'
                            ));
                        }

                    }

                    // Check on type
                    if (isset($en_methodsynopsis[$i]['methodparam']['type'][$j])) {

                        if (!isset($lang_methodsynopsis[$i]['methodparam']['type'][$j])) { $lang_methodsynopsis[$i]['methodparam']['type'][$j]=''; }

                        if ($en_methodsynopsis[$i]['methodparam']['type'][$j]!=$lang_methodsynopsis[$i]['methodparam']['type'][$j]) {
                            $this->addError(array(
                                'value_en'   => $en_methodsynopsis[$i]['methodparam']['type'][$j],
                                'value_lang' => $lang_methodsynopsis[$i]['methodparam']['type'][$j],
                                'type'       => 'errorParameterTypeMethodsynopsis'
                            ));
                        }
                    }

                    // Check on initializer
                    if (isset($en_methodsynopsis[$i]['methodparam']['initializer'][$j])) {

                        if (!isset($lang_methodsynopsis[$i]['methodparam']['initializer'][$j])) { $lang_methodsynopsis[$i]['methodparam']['initializer'][$j]=''; }

                        if ($en_methodsynopsis[$i]['methodparam']['initializer'][$j]!=$lang_methodsynopsis[$i]['methodparam']['initializer'][$j]) {
                            $this->addError(array(
                                'value_en'   => $en_methodsynopsis[$i]['methodparam']['initializer'][$j],
                                'value_lang' => $lang_methodsynopsis[$i]['methodparam']['initializer'][$j],
                                'type'       => 'errorParameterInitializerMethodsynopsis'
                            ));
                        }
                    }

                    // Check on optionnel
                    if (isset($en_methodsynopsis[$i]['methodparam']['optionnel'][$j])) {

                        if (!isset($lang_methodsynopsis[$i]['methodparam']['optionnel'][$j])) {
                            $lang_methodsynopsis[$i]['methodparam']['optionnel'][$j] = '';
                        }

                        if ($en_methodsynopsis[$i]['methodparam']['optionnel'][$j] != $lang_methodsynopsis[$i]['methodparam']['optionnel'][$j]) {
                            $tmp1 = ($en_methodsynopsis[$i]['methodparam']['optionnel'][$j] == 0) ? $en_methodsynopsis[$i]['methodparam']['parameter'][$j] . ' <strong>ISN\'T</strong> optional' : $en_methodsynopsis[$i]['methodparam']['parameter'][$j].' <strong>IS</strong> optional (choice="opt")';

                            $tmp2 = ($lang_methodsynopsis[$i]['methodparam']['optionnel'][$j] == 0) ? $lang_methodsynopsis[$i]['methodparam']['parameter'][$j].' <strong>ISN\'T</strong> optional' : $lang_methodsynopsis[$i]['methodparam']['parameter'][$j].' <strong>IS</strong> optional (choice="opt")';

                            $this->addError(array(
                                'value_en'   => $tmp1,
                                'value_lang' => $tmp2,
                                'type'       => 'errorOptionalMethodsynopsis'
                            ));
                        }
                    }

                    // Check on role
                    if (isset($en_methodsynopsis[$i]['methodparam']['role'][$j])) {

                        if (!isset($lang_methodsynopsis[$i]['methodparam']['role'][$j])) {
                            $lang_methodsynopsis[$i]['methodparam']['role'][$j]='';
                        }

                        if ($en_methodsynopsis[$i]['methodparam']['role'][$j] != $lang_methodsynopsis[$i]['methodparam']['role'][$j] ) {
                            $tmp1 = ($en_methodsynopsis[$i]['methodparam']['role'][$j] == 0) ? $en_methodsynopsis[$i]['methodparam']['parameter'][$j].' <strong>ISN\'T</strong> reference' : $en_methodsynopsis[$i]['methodparam']['parameter'][$j].' <strong>IS</strong> reference (role="reference")';
                            $tmp2 = ($lang_methodsynopsis[$i]['methodparam']['role'][$j]==0) ? $lang_methodsynopsis[$i]['methodparam']['parameter'][$j].' <strong>ISN\'T</strong> reference' : $lang_methodsynopsis[$i]['methodparam']['parameter'][$j].' <strong>IS</strong> reference (role="reference")';

                            $this->addError(array(
                                'value_en'   => $tmp1,
                                'value_lang' => $tmp2,
                                'type'       => 'errorRoleMethodsynopsis'
                            ));
                        }
                    }
                }
            }
        }
    }

    /**
     * Check VCS keyWords
     * Add an entry into the error's stack if keywords are dirty
     *
     */
    function checkVCSKeyWords()
    {
        $result = VCSFactory::getInstance()->checkKeyWords($this->lang,$this->filePath,$this->fileName);

        if( $result ) {

            $errLibel = "";

            if( $result["keyWords"] ) {
                $errLibel .= "keyWords : ".$result["keyWords"]." ; ";
            }
            if( $result["EolStyle"] ) {
                $errLibel .= "EolStyle : ".$result["EolStyle"]." ; ";
            }

            $this->addError(array(
                    'value_en'   => $errLibel,
                    'value_lang' => '',
                    'type'       => 'VCSKeyWordsEolStyle'
            ));

        }

    }

    /**
     * Check MemberShip Comment
     * Add an entry into the error's stack if MemberShip's Comment isn't the same as EN version
     *
     */

    function checkMembershipComment()
    {
        $reg = '/<!-- Membership: (.*?) -->/s';

        $en_MembershipComment = array();
        $match = array();
        preg_match($reg, $this->en_content_with_comment, $match);
        $en_MembershipComment = (isset($match[1])) ? $match[1] : false;

        $lang_MembershipComment = array();
        $match = array();
        preg_match($reg, $this->lang_content_with_comment, $match);
        $lang_MembershipComment = (isset($match[1])) ? $match[1] : false;

        if( $en_MembershipComment != $lang_MembershipComment ) {

            $this->addError(array(
                    'value_en'   => $en_MembershipComment,
                    'value_lang' => $lang_MembershipComment,
                    'type'       => 'MembershipComment'
            ));

        }

    }

    /**
     * Check Purpose Comment
     * Add an entry into the error's stack if Purpose's Comment isn't the same as EN version
     *
     */

    function checkPurposeComment()
    {
        $reg = '/<!-- Purpose: (.*?) -->/s';

        $en_MembershipComment = array();
        $match = array();
        preg_match($reg, $this->en_content_with_comment, $match);
        $en_MembershipComment = (isset($match[1])) ? $match[1] : false;

        $lang_MembershipComment = array();
        $match = array();
        preg_match($reg, $this->lang_content_with_comment, $match);
        $lang_MembershipComment = (isset($match[1])) ? $match[1] : false;

        if( $en_MembershipComment != $lang_MembershipComment ) {

            $this->addError(array(
                    'value_en'   => $en_MembershipComment,
                    'value_lang' => $lang_MembershipComment,
                    'type'       => 'PurposeComment'
            ));

        }

    }

    /**
     * Check PhpDoc Tag
     *
     */

    function checkPhpDocTag()
    {
        $reg = '/<\?phpdoc\s(.*?)="(.*?)"\s?\?>/s';

        $en_PhpDocTag = array();
        preg_match_all($reg, $this->en_content, $en_PhpDocTag);

        $lang_PhpDocTag = array();
        preg_match_all($reg, $this->lang_content, $lang_PhpDocTag);

        if( count($en_PhpDocTag[0]) != count($lang_PhpDocTag[0]) ) {
            $this->addError(array(
                    'value_en'   => count($en_PhpDocTag[0]),
                    'value_lang' => count($lang_PhpDocTag[0]),
                    'type'       => 'PhpDocTagNb'
            ));

        } else {
            for( $i=0; $i < count($en_PhpDocTag[0]); $i++ ) {

                if( $en_PhpDocTag[1][$i] != $lang_PhpDocTag[1][$i] ||
                    $en_PhpDocTag[2][$i] != $lang_PhpDocTag[2][$i] ) {

                    $this->addError(array(
                            'value_en'   => $en_PhpDocTag[0][$i],
                            'value_lang' => $lang_PhpDocTag[0][$i],
                            'type'       => 'PhpDocTagError'
                    ));

                }

            }
        }
    } // checkPhpDocTag

}
