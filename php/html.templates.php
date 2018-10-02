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
function headerTemplate($title = 'Php Docbook Online Editor', $depth = 0)
{
    $prefix = str_repeat('../', $depth);
    return <<<EOD
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"  "http://www.w3.org/TR/html4/loose.dtd">
<html>
 <head>
  <title>$title</title>
  <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
  <meta name="description" content="" />
  <link rel="shortcut icon" href="{$prefix}themes/img/icon_php.png" />
  <link type="text/css" rel="stylesheet" href="{$prefix}themes/loading-min.css" />
 </head>
 <body>
  <div id="loading-mask" style=""></div>
  <div id="loading">
   <div class="loading-indicator">
    <img src="{$prefix}themes/img/php.png" class="loading-php-logo" alt="PHP" />Php Docbook Online Editor
    <div id="loading-msg">Loading styles and images...</div>
    <div id="loading-progressBar"></div>
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
 * Returns a raw element
 *
 * @param string $raw The raw content of the element
 * @return string The raw content
 */
function insertRawElement($raw)
{
    return sprintf('  %s', $raw) . "\n";
}

/**
 * Returns a javascript script loading element
 *
 * @return string The script element
 */
function jsLoadi18nTemplate()
{
    global $ExtJsVersion;
    $return='';

    // We check the configuration for this user.
    // If $_SESSION['userConf']['main']['uiLang'] is set to 'default', we don't change anythings as the old beaviours

    if ( !isset($_SESSION['userConf']->main->uiLang) || $_SESSION['userConf']->main->uiLang == 'default' ) {

        //i18n for ExtJs library
        if( @file_get_contents('js/ExtJs/src/locale/ext-lang-'.$_SESSION['lang'].'.js') )
        {
            $return.= sprintf('  <script type="text/javascript" src="%s"></script>', 'js/ExtJs/src/locale/ext-lang-'.$_SESSION['lang'].'.js') . "\n";
        }

        //i18n for the UI
        if( is_file('js/locale/'.strtolower($_SESSION['lang']).'.js') )
        {
            $return.= sprintf('  <script type="text/javascript" src="%s"></script>', 'js/locale/'.strtolower($_SESSION['lang']).'.js') . "\n";
        }

    } else {

        //i18n for ExtJs library
        if( @file_get_contents('js/ExtJs/src/locale/ext-lang-'.$_SESSION['userConf']->main->uiLang.'.js') )
        {
            $return.= sprintf('  <script type="text/javascript" src="%s"></script>', 'js/ExtJs/src/locale/ext-lang-'.$_SESSION['userConf']->main->uiLang.'.js') . "\n";
        }

        //i18n for the UI
        if( is_file('js/locale/'.strtolower($_SESSION['userConf']->main->uiLang).'.js') )
        {
            $return.= sprintf('  <script type="text/javascript" src="%s"></script>', 'js/locale/'.strtolower($_SESSION['userConf']->main->uiLang).'.js') . "\n";
        }

    }


    return $return;
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
function footerTemplate($isLoginPage=false)
{
    $elephpants = ( $isLoginPage ) ? '<div id="elephpants"><div id="elephpants-images"></div></div>' : '';

    return <<<EOD
    $elephpants
 </body>
</html>
EOD;
}
