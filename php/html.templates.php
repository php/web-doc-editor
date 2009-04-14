<?php
/**
 * HTML templates 
 */

/**
 * Gets the tool header template
 *
 * @param string $title The HTML page title. Default to the tool name
 * @return string
 */
function headerTemplate($title = 'PHP Documentation Online Editor', $depth = 0)
{
    $prefix = str_repeat('../', $depth);
    return <<<EOD
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html>
 <head>
  <title>$title</title>
  <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
  <meta name="description" content="" />
  <link type="text/css" rel="stylesheet" href="{$prefix}themes/loading.css" />
 </head>
 <body>
  <div id="loading-mask" style=""></div>
  <div id="loading">
   <div class="loading-indicator">
    <img src="{$prefix}themes/img/php.png" class="loading-php-logo" alt="PHP" />PhpDocumentation Online Editor<br/>
    <span id="loading-msg">Loading styles and images...</span>
   </div>
  </div>

EOD;
}

/**
 * Returns a javascript inline call
 *
 * @param string $script The javascript code
 * @return string The script element
 */
function jsCallTemplate($script)
{
    return sprintf('  <script type="text/javascript">%s</script>', $script) . "\n";
}

/**
 * Returns a javascript script loading element
 *
 * @param string $src The script url
 * @return string The script element
 */
function jsLoadTemplate($src)
{
    return sprintf('  <script type="text/javascript" src="%s"></script>', $src) . "\n";
}

/**
 * Returns a javascript script loading element
 *
 * @param string $src The script url
 * @return string The script element
 */
function jsLoadi18nTemplate()
{
    if( is_file('js/locale/'.strtolower($_SESSION['lang']).'.js') )
    {
        return sprintf('  <script type="text/javascript" src="%s"></script>', 'js/locale/'.strtolower($_SESSION['lang']).'.js') . "\n";
    }

}

/**
 * Returns a stylesheet loading element
 *
 * @param string $href The stylesheet url
 * @param string $id An optional id for the HTML element
 * @return string The link element
 */
function cssLoadTemplate($href, $id = '')
{
    if ($id) {
        $id = 'id="' . $id . '" ';
    }
    return sprintf('  <link type="text/css" rel="stylesheet" href="%s" %s/>', $href, $id) . "\n";
}

/**
 * Returns the tool footer template
 *
 * @return string
 */
function footerTemplate()
{
    return <<<EOD
 </body>
</html>
EOD;
}
