<?php
session_start();
error_reporting(E_ALL);

include "./php/class.php";

$phpDoc = new phpDoc();
$phpDoc->isLogged();

if (isset($_GET['dir']) && isset($_GET['file'])) {

    // We retrieve all this error from DB to display the value.
    $errorTools = new ToolsError($phpDoc->db);
    $errorTools->setParams('', '', $phpDoc->cvsLang, $_GET['dir'], $_GET['file'], '');
    $error_to_display = $errorTools->getInfo();

    $fileLibel = $_GET['dir'] . $_GET['file'];

} else {
    $error_to_display = array();
    $fileLibel = NULL;
}

/*
echo '<pre>';
print_r($error_to_display);
echo '</pre>';
*/

?>
<style type="text/css">

.member-table {
    font-size: 13px;
    color: #222222;
    font-family: Tahoma,Verdana,Arial,Helvetica,sans-serif;
    margin: 10px;
    width: 98%;
    border: 1px solid #D0D0D0;
}

.config-row {
    vertical-align: top;
}

td.micon {
    background: #F9F9F9 url(./themes/img/expand-bg.gif) repeat-y scroll right top;
    border-right: 1px solid #D0D0D0;
    border-top: 1px solid #D0D0D0;
    padding: 0;
    width: 16px;
}

td.sig {
    border-top: 1px solid #D0D0D0;
    padding: 4px 15px 4px 4px;
}

.mdesc {
    color: #444444;
    padding: 5px 0;
    margin: 0;
}

em.exi {
    background: transparent url(./themes/img/member-collapsed.gif) no-repeat scroll 5px 6px;
    height: 30px;
    width: 98%;
    display: block;
}

th.sig-header {
    background: #F9F9F9 url(./themes/img/grid3-hrow.gif) repeat-x scroll 0 top;
    padding: 3px;
    text-align: left;
    vertical-align: middle;
}

h1.error-type-title {
    margin: 10px;
    font-size: 15px;
    color: #3764A0;
    border-bottom: 2px solid #99BBE8;
}

</style>

<?php

$error['-No error-']['head'] = '- No error -';
$error['-No error-']['desc'] = 'There is no more error in this file.';

$error['attributXmlXlinkAppendix']['head'] = 'Appendix tag';
$error['attributXmlXlinkAppendix']['desc'] = 'Throw if the value of the attribut <b>xmlns:xlink</b> is different from english version.';
$error['attributXmlNsAppendix']['head'] = 'Appendix tag';
$error['attributXmlNsAppendix']['desc'] = 'Throw if the value of the attribut <b>xmlns</b> is different from english version.';
$error['attributXmlIdAppendix']['head'] = 'Appendix tag';
$error['attributXmlIdAppendix']['desc'] = 'Throw if the value of the attribut <b>xml:id</b> is different from english version.';

$error['attributXmlXlinkBook']['head'] = 'Book tag';
$error['attributXmlXlinkBook']['desc'] = 'Throw if the value of the attribut <b>xmlns:xlink</b> is different from english version.';
$error['attributXmlNsBook']['head'] = 'Book tag';
$error['attributXmlNsBook']['desc'] = 'Throw if the value of the attribut <b>xmlns</b> is different from english version.';
$error['attributXmlIdBook']['head'] = 'Book tag';
$error['attributXmlIdBook']['desc'] = 'Throw if the value of the attribut <b>xml:id</b> is different from english version.';

$error['nbCdataTag']['head'] = 'Cdata section';
$error['nbCdataTag']['desc'] = 'Throw if the number of <b>cdata</b> section is different from english version.';

$error['attributXmlXlinkChapter']['head'] = 'Chapter tag';
$error['attributXmlXlinkChapter']['desc'] = 'Throw if the value of the attribut <b>xmlns:xlink</b> is different from english version.';
$error['attributXmlNsChapter']['head'] = 'Chapter tag';
$error['attributXmlNsChapter']['desc'] = 'Throw if the value of the attribut <b>xmlns</b> is different from english version.';
$error['attributXmlIdChapter']['head'] = 'Chapter tag';
$error['attributXmlIdChapter']['desc'] = 'Throw if the value of the attribut <b>xml:id</b> is different from english version.';

$error['attributVersionChapter']['head'] = 'Chapter tag';
$error['attributVersionChapter']['desc'] = 'Throw if the value of the attribut <b>version</b> is different from english version.';

$error['nbChapterTag']['head'] = 'Chapter tag';
$error['nbChapterTag']['desc'] = 'Throw if the number of <b>chapter</b> tags is different from english version.';

$error['nbSimparaTag']['head'] = 'Simpara tag';
$error['nbSimparaTag']['desc'] = 'Throw if the number of <b>simpara</b> tags is different from english version.';

$error['nbCautionTag']['head'] = 'Caution tag';
$error['nbCautionTag']['desc'] = 'Throw if the number of <b>caution</b> tags is different from english version.';

$error['nbAcronymTag']['head'] = 'Acronym tag';
$error['nbAcronymTag']['desc'] = 'Throw if the number of <b>acronym</b> tags is different from english version.';

$error['nbConstantTag']['head'] = 'Constant tag';
$error['nbConstantTag']['desc'] = 'Throw if the number of <b>constant</b> tags is different from english version.';

$error['nbTipTag']['head'] = 'Tip tag';
$error['nbTipTag']['desc'] = 'Throw if the number of <b>tip</b> tags is different from english version.';

$error['nbEntryTag']['head'] = 'Entry tag';
$error['nbEntryTag']['desc'] = 'Throw if the number of <b>entry</b> tags is different from english version.';

$error['nbCommandTag']['head'] = 'Command tag';
$error['nbCommandTag']['desc'] = 'Throw if the number of <b>command</b> tags is different from english version.';

$error['nbEmphasisTag']['head'] = 'Emphasis tag';
$error['nbEmphasisTag']['desc'] = 'Throw if the number of <b>emphasis</b> tags is different from english version.';

$error['nbVarnameTag']['head'] = 'Varname tag';
$error['nbVarnameTag']['desc'] = 'Throw if the number of <b>varname</b> tags is different from english version.';

$error['errorFieldsynopsisInitializer']['head'] = 'Fieldsynopsis tag';
$error['errorFieldsynopsisInitializer']['desc'] = 'Throw if the value of the <b>initializer</b> tags is different from english version.';
$error['errorFieldsynopsisModifier']['head'] = 'Fieldsynopsis tag';
$error['errorFieldsynopsisModifier']['desc'] = 'Throw if the value of the <b>modifier</b> tags is different from english version.';
$error['errorFieldsynopsisType']['head'] = 'Fieldsynopsis tag';
$error['errorFieldsynopsisType']['desc'] = 'Throw if the value of the <b>type</b> tags is different from english version.';
$error['errorFieldsynopsisVarnameAttr']['head'] = 'Fieldsynopsis tag';
$error['errorFieldsynopsisVarnameAttr']['desc'] = 'Throw if the value of the attribut <b>varname</b> is different from english version.';
$error['errorFieldsynopsisVarnameValue']['head'] = 'Fieldsynopsis tag';
$error['errorFieldsynopsisVarnameValue']['desc'] = 'Throw if the value of the <b>varname</b> tags is different from english version.';

$error['attributLinkendLink']['head'] = 'Linkend and xlink tags';
$error['attributLinkendLink']['desc'] = 'Throw if the value of the attribut <b>linkend</b> is different from english version.';
$error['attributXlinkLink']['head'] = 'Linkend and xlink tags';
$error['attributXlinkLink']['desc'] = 'Throw if the value of the attribut <b>xlink:href</b> is different from english version.';

$error['nbLiteralTag']['head'] = 'Literal tag';
$error['nbLiteralTag']['desc'] = 'Throw if the number of <b>literal</b> tags is different from english version.';

$error['nbProductnameTag']['head'] = 'Productname tag';
$error['nbProductnameTag']['desc'] = 'Throw if the number of <b>productname</b> tags is different from english version.';

$error['nbFilenameTag']['head'] = 'Filename tag';
$error['nbFilenameTag']['desc'] = 'Throw if the number of <b>filename</b> tags is different from english version.';

$error['nbAbbrevTag']['head'] = 'Abbrev tag';
$error['nbAbbrevTag']['desc'] = 'Throw if the number of <b>abbrev</b> tags is different from english version.';

$error['errorRoleMethodsynopsis']['head'] = 'Methodsynopsis tag';
$error['errorRoleMethodsynopsis']['desc'] = 'Throw if the value of the attribut <b>role</b> is different from english version.';
$error['errorOptionalMethodsynopsis']['head'] = 'Methodsynopsis tag';
$error['errorOptionalMethodsynopsis']['desc'] = 'Throw if the value of the attribut <b>choice</b> is different from english version.';
$error['errorParameterInitializerMethodsynopsis']['head'] = 'Methodsynopsis tag';
$error['errorParameterInitializerMethodsynopsis']['desc'] = 'Throw if the value of the <b>initializer</b> tags is different from english version.';
$error['errorParameterTypeMethodsynopsis']['head'] = 'Methodsynopsis tag';
$error['errorParameterTypeMethodsynopsis']['desc'] = 'Throw if the value of the <b>type</b> tags is different from english version.';
$error['errorParameterNameMethodsynopsis']['head'] = 'Methodsynopsis tag';
$error['errorParameterNameMethodsynopsis']['desc'] = 'Throw if the value of the <b>parameter</b> tags is different from english version.';
$error['errorNbMethodparamMethodsynopsis']['head'] = 'Methodsynopsis tag';
$error['errorNbMethodparamMethodsynopsis']['desc'] = 'Throw if the number of <b>parameter</b> tags is different from english version.';
$error['errorTypeMethodsynopsis']['head'] = 'Methodsynopsis tag';
$error['errorTypeMethodsynopsis']['desc'] = 'Throw if the value of the <b>type</b> tags is different from english version.';
$error['errorMethodnameMethodsynopsis']['head'] = 'Methodsynopsis tag';
$error['errorMethodnameMethodsynopsis']['desc'] = 'Throw if the value of the <b>methodname</b> tags is different from english version.';

$error['nbNoteTag']['head'] = 'Note tag';
$error['nbNoteTag']['desc'] = 'Throw if the number of <b>note</b> tags is different from english version.';

$error['errorNbOoclassClassname']['head'] = 'Ooclass tag';
$error['errorNbOoclassClassname']['desc'] = 'Throw if the number of <b>classname</b> tags is different from english version.';
$error['errorOoclassClassname']['head'] = 'Ooclass tag';
$error['errorOoclassClassname']['desc'] = 'Throw if the value of the <b>classname</b> tags is different from english version.';

$error['nbParaTag']['head'] = 'Para tag';
$error['nbParaTag']['desc'] = 'Throw if the number of <b>para</b> tags is different from english version.';

$error['attributXmlNsXlinkPreface']['head'] = 'Preface tag';
$error['attributXmlNsXlinkPreface']['desc'] = 'Throw if the value of the attribut <b>xmlns:xlink</b> is different from english version.';
$error['attributXmlNsPreface']['head'] = 'Preface tag';
$error['attributXmlNsPreface']['desc'] = 'Throw if the value of the attribut <b>xmlns</b> is different from english version.';
$error['attributXmlIdPreface']['head'] = 'Preface tag';
$error['attributXmlIdPreface']['desc'] = 'Throw if the value of the attribut <b>xml:id</b> is different from english version.';

$error['attributXmlIdQandaentry']['head'] = 'Qandaentry tag';
$error['attributXmlIdQandaentry']['desc'] = 'Throw if the value of the attribut <b>xml:id</b> is different from english version.';

$error['attributXmlNsXlinkRefentry']['head'] = 'Refentry tag';
$error['attributXmlNsXlinkRefentry']['desc'] = 'Throw if the value of the attribut <b>xmlns:xlink</b> is different from english version.';
$error['attributXmlNsRefentry']['head'] = 'Refentry tag';
$error['attributXmlNsRefentry']['desc'] = 'Throw if the value of the attribut <b>xmlns</b> is different from english version.';
$error['attributXmlIdRefentry']['head'] = 'Refentry tag';
$error['attributXmlIdRefentry']['desc'] = 'Throw if the value of the attribut <b>xml:id</b> is different from english version.';

$error['attributXmlNsXlinkReference']['head'] = 'Reference tag';
$error['attributXmlNsXlinkReference']['desc'] = 'Throw if the value of the attribut <b>xmlns:xlink</b> is different from english version.';
$error['attributXmlNsReference']['head'] = 'Reference tag';
$error['attributXmlNsReference']['desc'] = 'Throw if the value of the attribut <b>xmlns</b> is different from english version.';
$error['attributXmlIDReference']['head'] = 'Reference tag';
$error['attributXmlIDReference']['desc'] = 'Throw if the value of the attribut <b>xml:id</b> is different from english version.';

$error['spaceOrPeriodRefpurpose']['head'] = 'Refpurpose tag';
$error['spaceOrPeriodRefpurpose']['desc'] = 'Throw if there is a space or a period at the end of refpurpose value.';

$error['attributRefsect1']['head'] = 'Refsect1 tag';
$error['attributRefsect1']['desc'] = 'Throw if the value of the attribut <b>role</b> is different from english version.';

$error['nbRowTag']['head'] = 'Row tag';
$error['nbRowTag']['desc'] = 'Throw if the number of <b>row</b> tags is different from english version.';
$error['attributXmlIdRow']['head'] = 'Row tag';
$error['attributXmlIdRow']['desc'] = 'Throw if the value of the attribut <b>xml:id</b> is different from english version.';

$error['attributXmlNsXlinkSect1']['head'] = 'Sect1 tag';
$error['attributXmlNsXlinkSect1']['desc'] = 'Throw if the value of the attribut <b>xmlns:xlink</b> is different from english version.';
$error['attributXmlNsSect1']['head'] = 'Sect1 tag';
$error['attributXmlNsSect1']['desc'] = 'Throw if the value of the attribut <b>xmlns</b> is different from english version.';
$error['attributXmlIdSect1']['head'] = 'Sect1 tag';
$error['attributXmlIdSect1']['desc'] = 'Throw if the value of the attribut <b>xml:id</b> is different from english version.';

$error['attributXmlNsXlinkSection']['head'] = 'Section tag';
$error['attributXmlNsXlinkSection']['desc'] = 'Throw if the value of the attribut <b>xmlns:xlink</b> is different from english version.';
$error['attributXmlNsSection']['head'] = 'section tag';
$error['attributXmlNsSection']['desc'] = 'Throw if the value of the attribut <b>xmlns</b> is different from english version.';
$error['attributXmlIdSection']['head'] = 'section tag';
$error['attributXmlIdSection']['desc'] = 'Throw if the value of the attribut <b>xml:id</b> is different from english version.';

$error['nbSeeAlsoMember']['head'] = 'SeeAlso section';
$error['nbSeeAlsoMember']['desc'] = 'Throw if the number of <b>member</b> tags is different from english version.';

$error['nbTbodyTag']['head'] = 'Tbody tag';
$error['nbTbodyTag']['desc'] = 'Throw if the number of <b>tbody</b> tags is different from english version.';

$error['nbTheadTag']['head'] = 'Thead tag';
$error['nbTheadTag']['desc'] = 'Throw if the number of <b>thead</b> tags is different from english version.';

$error['attributXmlIdVarlistentry']['head'] = 'varlistentry tag';
$error['attributXmlIdVarlistentry']['desc'] = 'Throw if the value of the attribut <b>xml:id</b> is different from english version.';

$to_display = array();

// Si $error_to_display est un array vide, on lui attribut toutes les erreurs (page par d�faut)
if( empty($error_to_display) ) {
    while (list($k, $v) = each($error)) {
        $type[] = $k;
    }
} else {
    while (list($k, $v) = each($error_to_display)) {
        $type[] = $k;
    }
}

for( $i=0; $i < count($type); $i++ ) {
    $to_display[$error[$type[$i]]['head']][$type[$i]]['desc'] = $error[$type[$i]]['desc'];
} // Fin for

// Display title
if( $fileLibel ) {
    echo '<h1 class="error-type-title">Check for errors in '.$fileLibel.'</h1>';
}

while (list($k, $v) = each($to_display)) {

    if( $k == '- No error -' && empty($error_to_display) ) { continue; }
?>

<table class="member-table" cellspacing="0">
<tr>
 <th class="sig-header" colspan="2"><?php echo $k; ?></th>
</tr>
<?php
    while (list($k2, $v2) = each($v)) {

?>
<tr class="config-row">
 <td class="micon"><em class="exi">&nbsp;</em></td>
 <td class="sig"><a id="<?php echo $k2; ?>" /><b><?php echo $k2; ?></b><div class="mdesc"><?php echo $v2['desc']; ?></div>
<?php
        if (isset($error_to_display[$k2]['error'])) {
            for ($i = 0; $i < count($error_to_display[$k2]['error']); $i++) {
                echo 'value in En : ' . $error_to_display[$k2]['error'][$i]['value_en'] . '<br/>';
                echo 'value in ' . ucfirst($phpDoc->cvsLang) . ' : ' . $error_to_display[$k2]['error'][$i]['value_lang'] . '<br/>';
            }
        }
?>
 </td>
</tr>
<?php
    }
?>
</table>
<?php
}
?>