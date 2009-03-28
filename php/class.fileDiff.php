<?php
#########################################################
# http://scrivna.com/blog/2008/08/09/php-file-diff/     #
#########################################################

class diff {

    var $changes = array();
    var $diff = array();
    var $linepadding = null;
    var $charset;

    function doDiff($old, $new){
        $maxlen='';

        if (!is_array($old)) $old = file($old);
        if (!is_array($new)) $new = file($new);

        foreach($old as $oindex => $ovalue){
            $nkeys = array_keys($new, $ovalue);
            foreach($nkeys as $nindex){
                $matrix[$oindex][$nindex] = isset($matrix[$oindex - 1][$nindex - 1]) ? $matrix[$oindex - 1][$nindex - 1] + 1 : 1;
                if($matrix[$oindex][$nindex] > $maxlen){
                    $maxlen = $matrix[$oindex][$nindex];
                    $omax = $oindex + 1 - $maxlen;
                    $nmax = $nindex + 1 - $maxlen;
                }
            }
        }
        if($maxlen == 0) return array(array('d'=>$old, 'i'=>$new));

        return array_merge(
        $this->doDiff(array_slice($old, 0, $omax), array_slice($new, 0, $nmax)),
        array_slice($new, $nmax, $maxlen),
        $this->doDiff(array_slice($old, $omax + $maxlen), array_slice($new, $nmax + $maxlen)));

    }

    function diffWrap($old, $new){
        $this->diff = $this->doDiff($old, $new);
        $this->changes = array();
        $ndiff = array();
        foreach ($this->diff as $line => $k){
            if(is_array($k)){
                if (isset($k['d'][0]) || isset($k['i'][0])){
                    $this->changes[] = $line;
                    $ndiff[$line] = $k;
                }
            } else {
                $ndiff[$line] = $k;
            }
        }
        $this->diff = $ndiff;
        return $this->diff;
    }

    function formatcode($code){
        // Convert to UTF-8
        if( $this->charset != 'utf-8' ) { $code = iconv($this->charset, "UTF-8", $code); }

        $code = str_replace("<",'&#60;',$code);
        $code = str_replace(">",'&#62;',$code);
        $code = str_replace("@",'&#64;',$code);
        $code = str_replace("~",'&#126;',$code);
        $code = str_replace(" ",'&nbsp;',$code);
        $code = str_replace("\t",'&nbsp;&nbsp;&nbsp;&nbsp;',$code);
        return $code;
    }

    function showline($line){
        if ($this->linepadding === 0){
            if (in_array($line,$this->changes)) return true;
            return false;
        }
        if(is_null($this->linepadding)) return true;

        $start = (($line - $this->linepadding) > 0) ? ($line - $this->linepadding) : 0;
        $end = ($line + $this->linepadding);
        //echo '<br />'.$line.': '.$start.': '.$end;
        $search = range($start,$end);
        //pr($search);
        foreach($search as $k){
            if (in_array($k,$this->changes)) return true;
        }
        return false;

    }

    function inline($old, $new, $linepadding=null, $charset){
        $this->linepadding = $linepadding;
        $this->charset = $charset;

        $ret = '<pre><table width="100%" border="0" cellspacing="0" cellpadding="0" class="code">';
        $ret.= '<tr><td>Old</td><td>New</td><td></td></tr>';
        $count_old = 1;
        $count_new = 1;

        $insert = false;
        $delete = false;
        $truncate = false;

        $diff = $this->diffWrap($old, $new);

        foreach($diff as $line => $k){
            if ($this->showline($line)){
                $truncate = false;
                if(is_array($k)){
                    foreach ($k['d'] as $val){
                        $class = '';
                        if (!$delete){
                            $delete = true;
                            $class = 'first';
                            if ($insert) $class = '';
                            $insert = false;
                        }
                        $ret.= '<tr><th>'.$count_old.'</th>';
                        $ret.= '<th>&nbsp;</th>';
                        $ret.= '<td class="del '.$class.'">'.$this->formatcode($val).'</td>';
                        $ret.= '</tr>';
                        $count_old++;
                    }
                    foreach ($k['i'] as $val){
                        $class = '';
                        if (!$insert){
                            $insert = true;
                            $class = 'first';
                            if ($delete) $class = '';
                            $delete = false;
                        }
                        $ret.= '<tr><th>&nbsp;</th>';
                        $ret.= '<th>'.$count_new.'</th>';
                        $ret.= '<td class="ins '.$class.'">'.$this->formatcode($val).'</td>';
                        $ret.= '</tr>';
                        $count_new++;
                    }
                } else {
                    $class = ($delete) ? 'del_end' : '';
                    $class = ($insert) ? 'ins_end' : $class;
                    $delete = false;
                    $insert = false;
                    $ret.= '<tr><th>'.$count_old.'</th>';
                    $ret.= '<th>'.$count_new.'</th>';
                    $ret.= '<td class="'.$class.'">'.$this->formatcode($k).'</td>';
                    $ret.= '</tr>';
                    $count_old++;
                    $count_new++;
                }
            } else {
                $class = ($delete) ? 'del_end' : '';
                $class = ($insert) ? 'ins_end' : $class;
                $delete = false;
                $insert = false;

                if (!$truncate){
                    $truncate = true;
                    $ret.= '<tr><th>...</th>';
                    $ret.= '<th>...</th>';
                    $ret.= '<td class="truncated '.$class.'">&nbsp;</td>';
                    $ret.= '</tr>';
                }
                $count_old++;
                $count_new++;

            }
        }
        $ret.= '</table></pre>';
        return $ret;
    }
}