<?php

class Oauth_github
{
    public $redirect_uri;
    public $clientID;
    public $clientSecret;
    public $tokenURL;
    public $serveurURL;
    public $userInfoURL;
    
    public function __construct() {
        
        $this->serveurURL = 'https://github.com/login/oauth/authorize';
        $this->tokenURL = 'https://github.com/login/oauth/access_token';
        $this->userInfoURL = 'https://api.github.com/user';
        
        // Dev - OK
        //$this->redirect_uri = 'http://phpdoc.local/';
        //$this->clientID = 'cd59e5a636c4f0de0f79';
        //$this->clientSecret = '4ef43189760ae9889539507a76f3b5f7aea02c77';
        
        // Prod - OK
        $this->redirect_uri = 'https://edit.php.net/';
        $this->clientID = '5ca48f6dadff47ffe5b4';
        $this->clientSecret = '0f6b44d38340150e58d17d5d45d31c55a5130ce7';
    }
    
    public function RequestCode() {
     
        $query_params = array(
            'response_type' => 'code',
            'client_id' => $this->clientID,
            'redirect_uri' => $this->redirect_uri,
            'scope' => 'user'
        );

        $forward_url = $this->serveurURL . '?' . http_build_query($query_params);

        header('Location: ' . $forward_url);
        exit;
    }
    
    public function RequestToken($code)
    {
        $params = array(
            "code" => $code,
            "client_id" => $this->clientID,
            "client_secret" => $this->clientSecret,
            "redirect_uri" => $this->redirect_uri
        );

        $postString = rawurldecode(http_build_query( $params ));
        
        $ch = curl_init($this->tokenURL);
        
        curl_setopt( $ch, CURLOPT_FOLLOWLOCATION, false );
        curl_setopt( $ch, CURLOPT_HEADER, false );
        curl_setopt( $ch, CURLOPT_RETURNTRANSFER, true );
        curl_setopt( $ch, CURLOPT_POST, true );
        curl_setopt ( $ch, CURLOPT_POSTFIELDS, $postString );
        
        $httpResponse = curl_exec( $ch );
        
        parse_str($httpResponse, $output);
        
        return $output["access_token"];
    }
    
    public function getUserInfo($access_token)
    {
        $curl = curl_init($this->userInfoURL);
        
        curl_setopt_array($curl, array(
            CURLOPT_RETURNTRANSFER => 1,
            CURLOPT_HTTPHEADER => array( 'Authorization: token ' . $access_token ),
            CURLOPT_USERAGENT => 'Php Docbook Online Editor'
        ));
        $resp = curl_exec($curl);
        return json_decode($resp);
    }
    
    
}

class Oauth_stackoverflow
{
    public $redirect_uri;
    public $clientID;
    public $clientSecret;
    public $clientKey;
    public $tokenURL;
    public $serveurURL;
    public $userInfoURL;
    
    public function __construct() {
        
        $this->serveurURL = 'https://stackexchange.com/oauth';
        $this->tokenURL = 'https://stackexchange.com/oauth/access_token';
        $this->userInfoURL = 'https://api.stackexchange.com/me';
        
        // Dev - OK
        //$this->redirect_uri = 'http://phpdoc.local/';
        //$this->clientID = '3333';
        //$this->clientSecret = '8y7KkcWXYil*DOGMF)bL*g((';
        //$this->clientKey = 'Peqo3*0QVMQbPpw*YvKkrw((';
        
        // Prod - OK
        $this->redirect_uri = 'https://edit.php.net/';
        $this->clientID = '3338';
        $this->clientSecret = 'tPjwsBG6Qawkr7eOgl)Luw((';
        $this->clientKey = 'taHVAxpz*cMJyTCHACkixA((';
    }
    
    public function RequestCode() {
     
        $query_params = array(
            'response_type' => 'code',
            'client_id' => $this->clientID,
            'redirect_uri' => $this->redirect_uri,
            'scope' => ''
        );

        $forward_url = $this->serveurURL . '?' . http_build_query($query_params);

        header('Location: ' . $forward_url);
        exit;
    }
    
    public function RequestToken($code)
    {
        $params = array(
            "code" => $code,
            "client_id" => $this->clientID,
            "client_secret" => $this->clientSecret,
            "redirect_uri" => $this->redirect_uri
        );

        $postString = rawurldecode(http_build_query( $params ));
        
        $ch = curl_init($this->tokenURL);
        
        curl_setopt( $ch, CURLOPT_FOLLOWLOCATION, false );
        curl_setopt( $ch, CURLOPT_HEADER, false );
        curl_setopt( $ch, CURLOPT_RETURNTRANSFER, true );
        curl_setopt( $ch, CURLOPT_POST, true );
        curl_setopt ( $ch, CURLOPT_POSTFIELDS, $postString );
        
        $httpResponse = curl_exec( $ch );
        
        parse_str($httpResponse, $output);
        
        return $output["access_token"];
    }
    
    public function getUserInfo($access_token)
    {
        $curl = curl_init($this->userInfoURL.'?site=stackoverflow&access_token='.$access_token.'&key='.$this->clientKey);
        
        curl_setopt_array($curl, array(
            CURLOPT_ENCODING => "",
            CURLOPT_RETURNTRANSFER => 1,
            CURLOPT_USERAGENT => 'Php Docbook Online Editor'
        ));
        
        $resp = curl_exec($curl);
        
        return json_decode($resp);
    }
    
}

class Oauth_facebook
{
    public $redirect_uri;
    public $clientID;
    public $clientSecret;
    public $clientKey;
    public $tokenURL;
    public $serveurURL;
    public $userInfoURL;
    
    public function __construct() {
        
        $this->serveurURL = 'https://www.facebook.com/dialog/oauth';
        $this->tokenURL = 'https://graph.facebook.com/oauth/access_token';
        $this->userInfoURL = 'https://graph.facebook.com/me';
        
        // Dev - OK
        //$this->redirect_uri = 'http://phpdoc.local/';
        //$this->clientID = '687771861310348';
        //$this->clientSecret = '482d1d6df9981e3e6d8350da8a166edc';
        
        // Prod
        $this->redirect_uri = 'https://edit.php.net/';
        $this->clientID = '128417830579090';
        $this->clientSecret = '2e18fd9adfc219ddb85031fe08f481d9';
    }
    
    public function RequestCode() {
     
        $query_params = array(
            'response_type' => 'code',
            'client_id' => $this->clientID,
            'redirect_uri' => $this->redirect_uri,
            'scope' => 'email'
        );

        $forward_url = $this->serveurURL . '?' . http_build_query($query_params);

        header('Location: ' . $forward_url);
        exit;
    }
    
    public function RequestToken($code)
    {
        $params = array(
            "code" => $code,
            "client_id" => $this->clientID,
            "client_secret" => $this->clientSecret,
            "redirect_uri" => $this->redirect_uri
        );

        $postString = rawurldecode(http_build_query( $params ));
        
        $ch = curl_init($this->tokenURL);
        
        curl_setopt( $ch, CURLOPT_FOLLOWLOCATION, false );
        curl_setopt( $ch, CURLOPT_HEADER, false );
        curl_setopt( $ch, CURLOPT_RETURNTRANSFER, true );
        curl_setopt( $ch, CURLOPT_POST, true );
        curl_setopt ( $ch, CURLOPT_POSTFIELDS, $postString );
        
        $httpResponse = curl_exec( $ch );
        
        parse_str($httpResponse, $output);
        
        return $output["access_token"];
    }
    
    public function getUserInfo($access_token)
    {
        $curl = curl_init($this->userInfoURL.'?access_token='.$access_token);
        
        curl_setopt_array($curl, array(
            CURLOPT_ENCODING => "",
            CURLOPT_RETURNTRANSFER => 1,
            CURLOPT_USERAGENT => 'Php Docbook Online Editor'
        ));
        
        $resp = curl_exec($curl);
        
        return json_decode($resp);
    }
    
}

class Oauth_google
{
    public $redirect_uri;
    public $clientID;
    public $clientSecret;
    public $clientKey;
    public $tokenURL;
    public $serveurURL;
    public $userInfoURL;
    
    public function __construct() {
        
        $this->serveurURL = 'https://accounts.google.com/o/oauth2/auth';
        $this->tokenURL = 'https://accounts.google.com/o/oauth2/token';
        $this->userInfoURL = 'https://www.googleapis.com/plus/v1/people/me';
        
        // Dev - OK
        //$this->redirect_uri = 'http://localhost/';
        //$this->clientID = '175713024907-23ur2ii7e6eupirce8u72c4su9c682dq.apps.googleusercontent.com';
        //$this->clientSecret = '_Lm3fJcvS8Ubct4z_dJ3OJzq';
        
        // Prod
        $this->redirect_uri = 'https://edit.php.net/';
        $this->clientID = '100526866357.apps.googleusercontent.com';
        $this->clientSecret = 'FcKf36077Rco6S2xvdad9-WG';
    }
    
    public function RequestCode() {
     
        $query_params = array(
            'response_type' => 'code',
            'client_id' => $this->clientID,
            'redirect_uri' => $this->redirect_uri,
            'scope' => 'https://www.googleapis.com/auth/userinfo.email',
        );

        $forward_url = $this->serveurURL . '?' . http_build_query($query_params);

        header('Location: ' . $forward_url);
        exit;
    }
    
    public function RequestToken($code)
    {
        $params = array(
            "code" => $code,
            "client_id" => $this->clientID,
            "client_secret" => $this->clientSecret,
            "redirect_uri" => $this->redirect_uri,
            "grant_type" => 'authorization_code'
        );

        $postString = rawurldecode(http_build_query( $params ));
        
        $ch = curl_init($this->tokenURL);
        
        curl_setopt( $ch, CURLOPT_FOLLOWLOCATION, false );
        curl_setopt( $ch, CURLOPT_HEADER, false );
        curl_setopt( $ch, CURLOPT_RETURNTRANSFER, true );
        curl_setopt( $ch, CURLOPT_POST, true );
        curl_setopt ( $ch, CURLOPT_POSTFIELDS, $postString );
        
        $httpResponse = curl_exec( $ch );
        
        $httpResponse = json_decode($httpResponse);
        
        return $httpResponse->access_token;
    }
    
    public function getUserInfo($access_token)
    {
        $curl = curl_init($this->userInfoURL.'?access_token='.$access_token);
        
        curl_setopt_array($curl, array(
            CURLOPT_ENCODING => "",
            CURLOPT_RETURNTRANSFER => 1,
            CURLOPT_USERAGENT => 'Php Docbook Online Editor'
        ));
        
        $resp = curl_exec($curl);
        
        return json_decode($resp);
    }
    
}

class Oauth_linkedin
{
    public $redirect_uri;
    public $clientID;
    public $clientSecret;
    public $clientKey;
    public $tokenURL;
    public $serveurURL;
    public $userInfoURL;
    
    public function __construct() {
        
        $this->serveurURL = 'https://www.linkedin.com/uas/oauth2/authorization';
        $this->tokenURL = 'https://www.linkedin.com/uas/oauth2/accessToken';
        $this->userInfoURLEmail = 'https://api.linkedin.com/v1/people/~/email-address';
        $this->userInfoURL = 'https://api.linkedin.com/v1/people/~:(firstName,lastName)';
        
        // Dev - OK
        //$this->redirect_uri = 'http://phpdoc.local/';
        //$this->clientID = '77jy88t0ioyi51';
        //$this->clientSecret = 'FglhuuI0g7IjiYZQ';
        
        // Prod - OK
        $this->redirect_uri = 'https://edit.php.net/';
        $this->clientID = '77x6uic1m4ilry';
        $this->clientSecret = 'KFsgABtaBLuWX3sf';
    }
    
    public function RequestCode() {
     
        $query_params = array(
            'response_type' => 'code',
            'client_id' => $this->clientID,
            'redirect_uri' => $this->redirect_uri,
            'scope' => 'r_fullprofile r_emailaddress',
            'state' => 'DCEEFWF45453sdffef424'
        );

        $forward_url = $this->serveurURL . '?' . http_build_query($query_params);

        header('Location: ' . $forward_url);
        exit;
    }
    
    public function RequestToken($code)
    {
        $params = array(
            "code" => $code,
            "client_id" => $this->clientID,
            "client_secret" => $this->clientSecret,
            "redirect_uri" => $this->redirect_uri,
            "grant_type" => 'authorization_code'
        );

        $postString = rawurldecode(http_build_query( $params ));
        
        $ch = curl_init($this->tokenURL);
        
        curl_setopt( $ch, CURLOPT_FOLLOWLOCATION, false );
        curl_setopt( $ch, CURLOPT_HEADER, false );
        curl_setopt( $ch, CURLOPT_RETURNTRANSFER, true );
        curl_setopt( $ch, CURLOPT_POST, true );
        curl_setopt ( $ch, CURLOPT_POSTFIELDS, $postString );
        
        $httpResponse = curl_exec( $ch );
        
        $httpResponse = json_decode($httpResponse);
        
        return $httpResponse->access_token;
    }
    
    public function getUserInfo($access_token)
    {
        //email
        
        $curl = curl_init($this->userInfoURLEmail.'?oauth2_access_token='.$access_token);
        
        curl_setopt_array($curl, array(
            CURLOPT_ENCODING => "",
            CURLOPT_RETURNTRANSFER => 1,
            CURLOPT_USERAGENT => 'Php Docbook Online Editor'
        ));
        
        $resp = curl_exec($curl);
        $xml = simplexml_load_string($resp);
        
        $return['email'] = (string) $xml;
        
        //profil
        
        $curl = curl_init($this->userInfoURL.'?oauth2_access_token='.$access_token);
        
        curl_setopt_array($curl, array(
            CURLOPT_ENCODING => "",
            CURLOPT_RETURNTRANSFER => 1,
            CURLOPT_USERAGENT => 'Php Docbook Online Editor'
        ));
        
        $resp = curl_exec($curl);
        $xml = simplexml_load_string($resp);
        
        $return['profil'] = $xml->{'first-name'}.' '.$xml->{'last-name'};
        
        return $return;
    }
    
    
}

class Oauth_instagram
{
    public $redirect_uri;
    public $clientID;
    public $clientSecret;
    public $tokenURL;
    public $serveurURL;
    public $userInfoURL;
    
    public function __construct() {
        
        $this->serveurURL = 'https://api.instagram.com/oauth/authorize/';
        $this->tokenURL = 'https://api.instagram.com/oauth/access_token';
        $this->userInfoURL = 'https://api.instagram.com/v1/user';
        
        // Dev - OK
        //$this->redirect_uri = 'http://phpdoc.local/';
        //$this->clientID = 'a6f32c43608648c2aca7ab29d2300dd4';
        //$this->clientSecret = 'c5a9f895cdc9414ea5a8d82cfddfd975';
        
        // Prod - OK
        $this->redirect_uri = 'https://edit.php.net/';
        $this->clientID = '3e83439913b441829396fd009dcee1b3';
        $this->clientSecret = '01d24b054bda44c4946eeca3629b3f8d';
    }
    
    public function RequestCode() {
     
        $query_params = array(
            'response_type' => 'code',
            'client_id' => $this->clientID,
            'redirect_uri' => $this->redirect_uri
        );

        $forward_url = $this->serveurURL . '?' . http_build_query($query_params);

        header('Location: ' . $forward_url);
        exit;
    }
    
    public function RequestToken($code)
    {
        $params = array(
            "code" => $code,
            "client_id" => $this->clientID,
            "client_secret" => $this->clientSecret,
            "redirect_uri" => $this->redirect_uri,
            "grant_type" => 'authorization_code'
        );

        $postString = rawurldecode(http_build_query( $params ));
        
        $ch = curl_init($this->tokenURL);
        
        curl_setopt( $ch, CURLOPT_FOLLOWLOCATION, false );
        curl_setopt( $ch, CURLOPT_HEADER, false );
        curl_setopt( $ch, CURLOPT_RETURNTRANSFER, true );
        curl_setopt( $ch, CURLOPT_POST, true );
        curl_setopt ( $ch, CURLOPT_POSTFIELDS, $postString );
        
        $httpResponse = curl_exec( $ch );
        
        $httpResponse = json_decode($httpResponse);
        
        return $httpResponse;
    }
    
    
}
?>