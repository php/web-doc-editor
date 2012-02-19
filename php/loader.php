<?php

function load_class($classname)
{
    $path = dirname(__FILE__) . '/'. $classname .'.php';
    if (!file_exists($path)) return false;
    require_once $path;
    if (!class_exists($classname, false)) return false;
}
spl_autoload_register('load_class');

?>