<?php

require_once __DIR__.'/../vendor/autoload.php';

class GitRepository extends \Cz\Git\GitRepository
{
    public function getLastFileCommitId($path)
    {
        $this->begin();
        $lastLine = exec('git log -n 1 --pretty=format:%H -- ' . $path);
        $this->end();

        if (preg_match('/^[0-9a-f]{40}$/i', $lastLine)) {
            return $lastLine;
        }

        return null;
    }
}
