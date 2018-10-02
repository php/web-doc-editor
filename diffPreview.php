<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN"
    "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">

  <head>
    <meta http-equiv="Content-Type" content="text/html;charset=utf-8" />
    <title></title>
    <style type="text/css" media="all">

      .msg {
        font: normal 12px arial, tahoma, helvetica, sans-serif;
        background-color: #EEE;
        padding: 10px;
        margin-top: 10px;
        margin-right: 10px;
        text-align: center;
        border-radius: 15px;
      }

    </style>

  </head>

  <body>

  <?php

  if( isset($_GET['msg']) ) {
     $msg = $_GET['msg'];
  } else {
     $msg = '';
  }

  ?>


    <p class="msg"><?php echo htmlspecialchars($msg); ?></p>
  </body>

</html>
