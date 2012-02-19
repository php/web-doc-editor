<?php
class ExecStatement
{
    private $command;
    private $args;

    /**
     * Represents a shell command to be executed.
     *
     * The first parameter, $command, should be a format string (eg: the kind of string you pass to printf).
     * The directives in that string should correspond to the arguments passed as part of the second parameter, the $args array.
     *
     * The assumptions about security made here only holds when $command is a static string. If $command is
     * even partly derived from user input, any assumptions made about safety and security no longer hold.
     */
    public function __construct($command, array $args = array())
    {
        $this->command = $command;

        // We validate and escape certain types of input.
        $this->args = array();
        foreach ($args as $key => $val)
        {
            if (is_bool($val) || is_float($val) || is_int($val) || is_null($val))
                $this->args[$key] = $val;
            else if (is_string($val))
                $this->args[$key] = escapeshellarg($val);
            else if (is_object($val))
                $this->args[$key] = escapeshellarg($val->__toString());
            else
                trigger_error('Argument with unexpected type used to construct ExecStatement. It has been omitted from the command string.', E_USER_WARNING);
        }
    }

    public function getCommand()
    {
        return $this->command;
    }

    public function getArgs()
    {
        return $this->args;
    }

    public function __toString()
    {
        return vsprintf($this->getCommand(), $this->getArgs());
    }
}
?>