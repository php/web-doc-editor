<?php
session_start();
error_reporting(E_ALL);

require_once "./php/AccountManager.php";
require_once "./php/ToolsError.php";

$am = AccountManager::getInstance();
$am->isLogged();

if (isset($_GET['dir']) && isset($_GET['file'])) {

    // We retrieve all this error from DB to display the value.
    $errorTools = new ToolsError();
    $errorTools->setParams('', '', $am->vcsLang, $_GET['dir'], $_GET['file'], '');
    $error_to_display = $errorTools->getInfo();

    if( empty($error_to_display) ) {
        // We fake an empty error
        $error_to_display['-No error-']['error'][0]['value_en']   = '-';
        $error_to_display['-No error-']['error'][0]['value_lang'] = '-';
    }

    $fileLibel = $_GET['dir'] . $_GET['file'];

} else {
    $error_to_display = array();
    $fileLibel = NULL;
}

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

// Commun number of tags check

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

foreach ($tags as $tag => $label)
{
    $error['nb' . $label . 'Tag']['head'] = $label . ' tag';
    $error['nb' . $label . 'Tag']['desc'] = 'Throw if the number of <b>' . $label . '</b> tags is different in the english version.';
}

$error['-No error-']['head'] = '- No errors -';
$error['-No error-']['desc'] = 'There are no more errors in this file.';

$error['attributeXmlXlinkAppendix']['head'] = 'Appendix tag';
$error['attributeXmlXlinkAppendix']['desc'] = 'Throw if the value of the attribute <b>xmlns:xlink</b> is different in the english version.';
$error['attributeXmlNsAppendix']['head'] = 'Appendix tag';
$error['attributeXmlNsAppendix']['desc'] = 'Throw if the value of the attribute <b>xmlns</b> is different in the english version.';
$error['attributeXmlIdAppendix']['head'] = 'Appendix tag';
$error['attributeXmlIdAppendix']['desc'] = 'Throw if the value of the attribute <b>xml:id</b> is different in the english version.';

$error['attributeXmlXlinkBook']['head'] = 'Book tag';
$error['attributeXmlXlinkBook']['desc'] = 'Throw if the value of the attribute <b>xmlns:xlink</b> is different in the english version.';
$error['attributeXmlNsBook']['head'] = 'Book tag';
$error['attributeXmlNsBook']['desc'] = 'Throw if the value of the attribute <b>xmlns</b> is different in the english version.';
$error['attributeXmlIdBook']['head'] = 'Book tag';
$error['attributeXmlIdBook']['desc'] = 'Throw if the value of the attribute <b>xml:id</b> is different in the english version.';

$error['nbCdataTag']['head'] = 'Cdata section';
$error['nbCdataTag']['desc'] = 'Throw if the number of <b>cdata</b> section is different in the english version.';

$error['attributeXmlXlinkChapter']['head'] = 'Chapter tag';
$error['attributeXmlXlinkChapter']['desc'] = 'Throw if the value of the attribute <b>xmlns:xlink</b> is different in the english version.';
$error['attributeXmlNsChapter']['head'] = 'Chapter tag';
$error['attributeXmlNsChapter']['desc'] = 'Throw if the value of the attribute <b>xmlns</b> is different in the english version.';
$error['attributeXmlIdChapter']['head'] = 'Chapter tag';
$error['attributeXmlIdChapter']['desc'] = 'Throw if the value of the attribute <b>xml:id</b> is different in the english version.';

$error['attributeVersionChapter']['head'] = 'Chapter tag';
$error['attributeVersionChapter']['desc'] = 'Throw if the value of the attribute <b>version</b> is different in the english version.';

$error['nbEntryTag']['head'] = 'Entry tag';
$error['nbEntryTag']['desc'] = 'Throw if the number of <b>entry</b> tags is different in the english version.';

$error['errorFieldsynopsisInitializer']['head'] = 'Fieldsynopsis tag';
$error['errorFieldsynopsisInitializer']['desc'] = 'Throw if the value of the <b>initializer</b> tags is different in the english version.';
$error['errorFieldsynopsisModifier']['head'] = 'Fieldsynopsis tag';
$error['errorFieldsynopsisModifier']['desc'] = 'Throw if the value of the <b>modifier</b> tags is different in the english version.';
$error['errorFieldsynopsisType']['head'] = 'Fieldsynopsis tag';
$error['errorFieldsynopsisType']['desc'] = 'Throw if the value of the <b>type</b> tags is different in the english version.';
$error['errorFieldsynopsisVarnameAttr']['head'] = 'Fieldsynopsis tag';
$error['errorFieldsynopsisVarnameAttr']['desc'] = 'Throw if the value of the attribute <b>varname</b> is different in the english version.';
$error['errorFieldsynopsisVarnameValue']['head'] = 'Fieldsynopsis tag';
$error['errorFieldsynopsisVarnameValue']['desc'] = 'Throw if the value of the <b>varname</b> tags is different in the english version.';

$error['attributeLinkendLink']['head'] = 'Linkend and xlink tags';
$error['attributeLinkendLink']['desc'] = 'Throw if the value of the attribute <b>linkend</b> is different in the english version.';
$error['attributeXlinkLink']['head'] = 'Linkend and xlink tags';
$error['attributeXlinkLink']['desc'] = 'Throw if the value of the attribute <b>xlink:href</b> is different in the english version.';

$error['NbXlinkLink']['head'] = 'Linkend and xlink tags';
$error['NbXlinkLink']['desc'] = 'Throw if the number of <b>Link</b> tags is different in the english version.';

$error['NbXref']['head'] = 'Xref tags';
$error['NbXref']['desc'] = 'Throw if the number of <b>Xref</b> tags is different in the english version.';
$error['attributeLinkendXref']['head'] = 'Xref tags';
$error['attributeLinkendXref']['desc'] = 'Throw if the value of the attribute <b>linkend</b> is different in the english version.';

$error['errorRoleMethodsynopsis']['head'] = 'Methodsynopsis tag';
$error['errorRoleMethodsynopsis']['desc'] = 'Throw if the value of the attribute <b>role</b> is different in the english version.';
$error['errorOptionalMethodsynopsis']['head'] = 'Methodsynopsis tag';
$error['errorOptionalMethodsynopsis']['desc'] = 'Throw if the value of the attribute <b>choice</b> is different in the english version.';
$error['errorParameterInitializerMethodsynopsis']['head'] = 'Methodsynopsis tag';
$error['errorParameterInitializerMethodsynopsis']['desc'] = 'Throw if the value of the <b>initializer</b> tags is different in the english version.';
$error['errorParameterTypeMethodsynopsis']['head'] = 'Methodsynopsis tag';
$error['errorParameterTypeMethodsynopsis']['desc'] = 'Throw if the value of the <b>type</b> tags is different in the english version.';
$error['errorParameterNameMethodsynopsis']['head'] = 'Methodsynopsis tag';
$error['errorParameterNameMethodsynopsis']['desc'] = 'Throw if the value of the <b>parameter</b> tags is different in the english version.';
$error['errorNbMethodparamMethodsynopsis']['head'] = 'Methodsynopsis tag';
$error['errorNbMethodparamMethodsynopsis']['desc'] = 'Throw if the number of <b>parameter</b> tags is different in the english version.';
$error['errorTypeMethodsynopsis']['head'] = 'Methodsynopsis tag';
$error['errorTypeMethodsynopsis']['desc'] = 'Throw if the value of the <b>type</b> tags is different in the english version.';
$error['errorMethodnameMethodsynopsis']['head'] = 'Methodsynopsis tag';
$error['errorMethodnameMethodsynopsis']['desc'] = 'Throw if the value of the <b>methodname</b> tags is different in the english version.';

$error['errorNbOoclassClassname']['head'] = 'Ooclass tag';
$error['errorNbOoclassClassname']['desc'] = 'Throw if the number of <b>classname</b> tags is different in the english version.';
$error['errorOoclassClassname']['head'] = 'Ooclass tag';
$error['errorOoclassClassname']['desc'] = 'Throw if the value of the <b>classname</b> tags is different in the english version.';

$error['attributeXmlNsXlinkPreface']['head'] = 'Preface tag';
$error['attributeXmlNsXlinkPreface']['desc'] = 'Throw if the value of the attribute <b>xmlns:xlink</b> is different in the english version.';
$error['attributeXmlNsPreface']['head'] = 'Preface tag';
$error['attributeXmlNsPreface']['desc'] = 'Throw if the value of the attribute <b>xmlns</b> is different in the english version.';
$error['attributeXmlIdPreface']['head'] = 'Preface tag';
$error['attributeXmlIdPreface']['desc'] = 'Throw if the value of the attribute <b>xml:id</b> is different in the english version.';

$error['attributeXmlIdQandaentry']['head'] = 'Qandaentry tag';
$error['attributeXmlIdQandaentry']['desc'] = 'Throw if the value of the attribute <b>xml:id</b> is different in the english version.';

$error['attributeXmlNsXlinkRefentry']['head'] = 'Refentry tag';
$error['attributeXmlNsXlinkRefentry']['desc'] = 'Throw if the value of the attribute <b>xmlns:xlink</b> is different in the english version.';
$error['attributeXmlNsRefentry']['head'] = 'Refentry tag';
$error['attributeXmlNsRefentry']['desc'] = 'Throw if the value of the attribute <b>xmlns</b> is different in the english version.';
$error['attributeXmlIdRefentry']['head'] = 'Refentry tag';
$error['attributeXmlIdRefentry']['desc'] = 'Throw if the value of the attribute <b>xml:id</b> is different in the english version.';

$error['attributeXmlNsXlinkReference']['head'] = 'Reference tag';
$error['attributeXmlNsXlinkReference']['desc'] = 'Throw if the value of the attribute <b>xmlns:xlink</b> is different in the english version.';
$error['attributeXmlNsReference']['head'] = 'Reference tag';
$error['attributeXmlNsReference']['desc'] = 'Throw if the value of the attribute <b>xmlns</b> is different in the english version.';
$error['attributeXmlIDReference']['head'] = 'Reference tag';
$error['attributeXmlIDReference']['desc'] = 'Throw if the value of the attribute <b>xml:id</b> is different in the english version.';

$error['spaceOrPeriodRefpurpose']['head'] = 'Refpurpose tag';
$error['spaceOrPeriodRefpurpose']['desc'] = 'Throw if there is a space or a period at the end of refpurpose value.';

$error['attributeRefsect1']['head'] = 'Refsect1 tag';
$error['attributeRefsect1']['desc'] = 'Throw if the value of the attribute <b>role</b> is different in the english version.';

$error['nbRowTag']['head'] = 'Row tag';
$error['nbRowTag']['desc'] = 'Throw if the number of <b>row</b> tags is different in the english version.';
$error['attributeXmlIdRow']['head'] = 'Row tag';
$error['attributeXmlIdRow']['desc'] = 'Throw if the value of the attribute <b>xml:id</b> is different in the english version.';

$error['attributeXmlNsXlinkSect1']['head'] = 'Sect1 tag';
$error['attributeXmlNsXlinkSect1']['desc'] = 'Throw if the value of the attribute <b>xmlns:xlink</b> is different in the english version.';
$error['attributeXmlNsSect1']['head'] = 'Sect1 tag';
$error['attributeXmlNsSect1']['desc'] = 'Throw if the value of the attribute <b>xmlns</b> is different in the english version.';
$error['attributeXmlIdSect1']['head'] = 'Sect1 tag';
$error['attributeXmlIdSect1']['desc'] = 'Throw if the value of the attribute <b>xml:id</b> is different in the english version.';

$error['attributeXmlNsXlinkSection']['head'] = 'Section tag';
$error['attributeXmlNsXlinkSection']['desc'] = 'Throw if the value of the attribute <b>xmlns:xlink</b> is different in the english version.';
$error['attributeXmlNsSection']['head'] = 'Section tag';
$error['attributeXmlNsSection']['desc'] = 'Throw if the value of the attribute <b>xmlns</b> is different in the english version.';
$error['attributeXmlIdSection']['head'] = 'Section tag';
$error['attributeXmlIdSection']['desc'] = 'Throw if the value of the attribute <b>xml:id</b> is different in the english version.';

$error['nbSeeAlsoMember']['head'] = 'SeeAlso section';
$error['nbSeeAlsoMember']['desc'] = 'Throw if the number of <b>member</b> tags is different in the english version.';

$error['nbTbodyTag']['head'] = 'Tbody tag';
$error['nbTbodyTag']['desc'] = 'Throw if the number of <b>tbody</b> tags is different in the english version.';

$error['nbTheadTag']['head'] = 'Thead tag';
$error['nbTheadTag']['desc'] = 'Throw if the number of <b>thead</b> tags is different in the english version.';

$error['attributeXmlIdVarlistentry']['head'] = 'Varlistentry tag';
$error['attributeXmlIdVarlistentry']['desc'] = 'Throw if the value of the attribute <b>xml:id</b> is different in the english version.';


$error['acronym']['head'] = 'Missing &lt;acronym&gt; tag';
$error['acronym']['desc'] = 'An acronym have been found but without &lt;acronym&gt; tag around him.';

$error['tabCharacterInDocument']['head'] = 'Tab character in the document';
$error['tabCharacterInDocument']['desc'] = 'A tab character have been found in the document We must change it to spaces.';

$error['missingInitializer']['head'] = 'Missing &lt;initializer&gt; tag';
$error['missingInitializer']['desc'] = 'An &lt;initializer&gt; tag is missing.';

$error['documentNotUTF8']['head'] = 'Document encoding is not UTF-8';
$error['documentNotUTF8']['desc'] = 'We recommand to set your document in UTF-8 encoding.';

$error['SgmlDefaultDTDFile']['head'] = 'Wrong Sgml default dtd file';
$error['SgmlDefaultDTDFile']['desc'] = 'You must set it like this : <br><br><b>sgml-default-dtd-file:"~/.phpdoc/manual.ced"</b>';

$error['VCSKeyWordsEolStyle']['head'] = 'Wrong VCS Keywords & Eol-style';
$error['VCSKeyWordsEolStyle']['desc'] = 'There is some error on this file about VCS Keywords & Eol-Style. Just commit this file against the editor, it will fix it for you.';


$to_display = array();

// If $error_to_display is an empty array, we add it all errors (default page)
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
}

// Display title
if( $fileLibel ) {
    echo '<h1 class="error-type-title">Check for errors in '.htmlspecialchars($fileLibel).'</h1>';
}

ksort($to_display);

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
                if( $am->vcsLang != 'en' ) { echo 'value in ' . ucfirst($am->vcsLang) . ' : ' . $error_to_display[$k2]['error'][$i]['value_lang'] . '<br/>'; }
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
<?php if ( comments_open() ) : ?>
<div class="comments">
    <?php if ( post_password_required() ) : ?>
        <p class="nopassword"><?php _e('Пожалуйста, введите пароль для просмотра комментариев.'); ?></p>
                </div><!-- #comments -->
    <?php
        /* Stop the rest of comments.php from being processed,
        * but don't kill the script entirely -- we still have
        * to fully load the template.
        */
        return;
    endif;
    ?>

<?php
    // You can start editing here -- including this comment!
    ?>

<div id="comments">
    <?php if (have_comments()) : ?>
    <h3><?php printf(_n('1 отзыв', 'отзывов (%1$s)', get_comments_number()), number_format_i18n( get_comments_number() ), '' ); ?></h3>
    <div class="comment_list">

        <!-- <div class="navigation">
                <div class="alignleft"><?php previous_comments_link() ?></div>
                <div class="alignright"><?php next_comments_link() ?></div>
            </div> -->

        <ol>
            <?php wp_list_comments(array('callback' => 'commentslist')); ?>
        </ol>

        <!-- <div class="navigation">
                <div class="alignleft"><?php previous_comments_link() ?></div>
                <div class="alignright"><?php next_comments_link() ?></div>
            </div> -->

    </div>
    <?php endif; // end have_comments() ?>
</div>

<?php if ('open' == $post->comment_status) : ?>

    <div id="respond">
        <h3>Что вы думаете?</h3>
        <div class="comment_form">

            <?php if ( get_option('comment_registration') && !$user_ID ) : ?>
            <p class="comment_message">Вы должны <a href="<?php echo get_option('siteurl'); ?>/wp-login.php?redirect_to=<?php echo urlencode(get_permalink()); ?>">войти</a>, чтобы оставлять комментарии.</p>
            <?php else : ?>

            <form action="<?php echo get_option('siteurl'); ?>/wp-comments-post.php" method="post" id="commentform">

                <?php if ( $user_ID ) : ?>

                <p class="comment_message">Вы вошли как <a href="<?php echo get_option('siteurl'); ?>/wp-admin/profile.php"><?php echo $user_identity; ?></a>. <a href="<?php echo wp_logout_url(get_permalink()); ?>" title="Выйти с этого аккаунта">Выйти &raquo;</a></p>

                <table>
                    <tr>
                        <td colspan="3">
                            <div class="commform-textarea">
                                <textarea name="comment" id="comment" cols="50" rows="7" tabindex="1"></textarea>
                            </div>
                        </td>
                    </tr>
                </table>

                <?php else : ?>

                <table>
                    <tr>
                        <td colspan="3">
                            <div class="commform-textarea">
                                <textarea name="comment" id="comment" cols="50" rows="7" tabindex="1"></textarea>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td class="commform-author">
                            <p>Имя <span>обязательно</span></p>
                            <div>
                                <input type="text" name="author" id="author" tabindex="2" />
                            </div>
                        </td>
                        <td class="commform-email">
                            <p>E-mail <span>обязательно</span></p>
                            <div>
                                <input type="text" name="email" id="email" tabindex="3" />
                            </div>
                        </td>
                        <td class="commform-url">
                            <p>Сайт</p>
                            <div>
                                <input type="text" name="url" id="url" tabindex="4" />
                            </div>
                        </td>
                    </tr>
                </table>

                <?php endif; ?>

                <!--<p class="comment_message"><small><strong>XHTML:</strong> Вы можете использовать следующие теги: <code><?php echo allowed_tags(); ?></code></small></p>-->

                <div class="submit clear">
                    <input name="submit" type="submit" id="submit" tabindex="5" value="Отправить" />
                    <p id="cancel-comment-reply"><?php cancel_comment_reply_link() ?></p>
                </div>

                <div><?php comment_id_fields(); ?><?php do_action('comment_form', $post->ID); ?></div>

            </form>

            <?php endif; // If registration required and not logged in ?>

        </div>

        <?php endif; // if you delete this the sky will fall on your head ?>

    </div>

</div>
<?php endif; // end ! comments_open() ?>
<!-- #comments -->