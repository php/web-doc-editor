<?php

require_once dirname(__FILE__) . '/SaferExec.php';

class ToolsXmllint
{
    public $xmlContent;
    public $XmlFileName;
    public $XmlFileResult;
    public $rawErrors;
    public $Errors;

    public function __construct()
    {
    }

    public function __destruct() {
        @unlink($this->XmlFileName);
        @unlink($this->XmlFileResult);
    }

    public function saveInTmpFile()
    {
        $this->XmlFileName = tempnam(sys_get_temp_dir(), 'PhDOE_'.mt_rand());
        $h = fopen($this->XmlFileName, "w");
        fwrite($h, $this->xmlContent);
        fclose($h);
    }

    public function checkForError($xmlContent)
    {
        $am      = AccountManager::getInstance();
        $appConf = $am->appConf;
        $project = $am->project;

        $this->xmlContent = $xmlContent;
        $this->saveInTmpFile();

        $this->XmlFileResult = tempnam(sys_get_temp_dir(), 'PhDOE_'.mt_rand());

        $cmd = new ExecStatement($appConf['GLOBAL_CONFIGURATION']['xmllint.bin'] . ' --noout %s > %s 2>&1', array($this->XmlFileName, $this->XmlFileResult));

        $trial_threshold = 3;
        while ($trial_threshold-- > 0) {
            $output = array();
            SaferExec::exec($cmd, $output);
            if (strlen(trim(implode('', $output))) != 0) break;
        }

        $this->rawErrors = file($this->XmlFileResult);

        $this->Errors = $this->parseResult();

        return $this->Errors;

    }

    public function parseResult()
    {
        // Each Error is on 3 lines
        $return = array();

        $tmp = 0;
        $numResult = 0;

        for($i=0; $i < count($this->rawErrors); $i++)
        {
            $return[$numResult][$tmp] = $this->rawErrors[$i];

            if( $tmp != 2 ) {
                $tmp ++;
            } else {
                $tmp = 0;
                $numResult ++;
            }
        }

        $result = array();
        $numResult = 0;

        // We check all errors
        for( $i=0; $i < count($return); $i++) {

            // We skip the filename in the first element of the array
            $return[$i][0] = substr($return[$i][0], strlen($this->XmlFileName), strlen($return[$i][0]));

            // We search the line number
            $match = array();
            preg_match("/^(:)(\d*)(: )/", $return[$i][0], $match);
            $return[$i]['line'] = $match[2];

            $return[$i][0] = substr($return[$i][0], strlen($match[2])+3, strlen($return[$i][0]));

            // We skip all entity not defined
            $match = array();
            preg_match("/^parser error : Entity (.*?) not defined/", $return[$i][0], $match);

            if( count($match) == 0 ) {
                $result[$numResult]['libel'] = $return[$i][0];
                $result[$numResult]['ctx1'] = $return[$i][1];
                $result[$numResult]['ctx2'] = $return[$i][2];
                $result[$numResult]['line'] = $return[$i]['line'];
                $numResult ++;
            }


        }

        return empty($result) ? 'no_error' : $result;

    }

}

?>
