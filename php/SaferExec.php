<?php
/**
 * A mildly safer substitute for PHP's exec function. It is meant to reduce the chances of arbitrary command execution
 * via calls to the exec function.
 */
class SaferExec
{
    /**
     * Executes a single ExecStatement
     */
    public static function exec(ExecStatement $command, &$output = array(), &$return_var = 0)
    {
        return exec($command, $output, $return_var);
    }

    /**
     * Executes an array of ExecStatements as a single command
     */
    public static function execMulti(array $command_array, &$output = array(), &$return_var = 0)
    {
        // Verify that we're working with ExecStatements
        foreach ($command_array as $cur_command)
        {
            if (!($cur_command instanceof ExecStatement))
            {
                trigger_error('Unexpected object encountered. Command will not execute.', E_USER_ERROR);
                return '';
            }
        }

        // Now that we've verified that we're looking at an array of ExecStatements, we can start working with them
        $command = implode('; ', $command_array);

        return exec($command, $output, $return_var);
    }
}


