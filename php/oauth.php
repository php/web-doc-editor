<?php
class Oauth_github
{
    public $redirect_uri;
    public $clientID;
    public $clientSecret;
    public $tokenURL;
    public $serveurURL;
    public $userInfoURL;

    public function __construct($clientID, $clientSecret) {

        $this->serveurURL = 'https://github.com/login/oauth/authorize';
        $this->tokenURL = 'https://github.com/login/oauth/access_token';
        $this->userInfoURL = 'https://api.github.com/user';

        $this->redirect_uri = 'https://edit.php.net/';
        $this->clientID = $clientID;
        $this->clientSecret = $clientSecret;
    }

    public function RequestCode() {

        $query_params = array(
            'response_type' => 'code',
            'client_id' => $this->clientID,
            'redirect_uri' => $this->redirect_uri,
            'scope' => 'user:email'
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
        curl_setopt( $ch, CURLOPT_POSTFIELDS, $postString );

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
            CURLOPT_USERAGENT => 'Php Docbook Online Editor',
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

    public function __construct($clientID, $clientSecret, $clientKey) {

        $this->serveurURL = 'https://stackexchange.com/oauth';
        $this->tokenURL = 'https://stackexchange.com/oauth/access_token';
        $this->userInfoURL = 'https://api.stackexchange.com/me';

        // Prod - OK
        $this->redirect_uri = 'https://edit.php.net/';
        $this->clientID = $clientID;
        $this->clientSecret = $clientSecret;
        $this->clientKey = $clientKey;
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
        curl_setopt( $ch, CURLOPT_POSTFIELDS, $postString );

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
            CURLOPT_USERAGENT => 'Php Docbook Online Editor',
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

    public function __construct($clientID, $clientSecret) {

        $this->serveurURL = 'https://www.facebook.com/dialog/oauth';
        $this->tokenURL = 'https://graph.facebook.com/oauth/access_token';
        $this->userInfoURL = 'https://graph.facebook.com/me';

        // Prod - OK
        $this->redirect_uri = 'https://edit.php.net/';
        $this->clientID = $clientID;
        $this->clientSecret = $clientSecret;
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
        curl_setopt( $ch, CURLOPT_POSTFIELDS, $postString );

        $httpResponse = curl_exec( $ch );

        $output = json_decode($httpResponse, true);

        return $output["access_token"];
    }

    public function getUserInfo($access_token)
    {
        $curl = curl_init($this->userInfoURL . '?access_token=' . $access_token . '&fields=name,email');

        curl_setopt_array($curl, array(
            CURLOPT_ENCODING => "",
            CURLOPT_RETURNTRANSFER => 1,
            CURLOPT_USERAGENT => 'Php Docbook Online Editor',
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

    public function __construct($clientID, $clientSecret) {

        $this->serveurURL = 'https://accounts.google.com/o/oauth2/auth';
        $this->tokenURL = 'https://accounts.google.com/o/oauth2/token';
        $this->userInfoURL = 'https://www.googleapis.com/oauth2/v1/userinfo';

        // Prod
        $this->redirect_uri = 'https://edit.php.net/';
        $this->clientID = $clientID;
        $this->clientSecret = $clientSecret;
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
        curl_setopt( $ch, CURLOPT_POSTFIELDS, $postString );

        $httpResponse = curl_exec( $ch );

        $httpResponse = json_decode($httpResponse);

        return $httpResponse->access_token;
    }

    public function getUserInfo($access_token)
    {
        $curl = curl_init($this->userInfoURL.'?alt=json&access_token='.$access_token);

        curl_setopt_array($curl, array(
            CURLOPT_ENCODING => "",
            CURLOPT_RETURNTRANSFER => 1,
            CURLOPT_USERAGENT => 'Php Docbook Online Editor',
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

    public function __construct($clientID, $clientSecret) {

        $this->serveurURL = 'https://www.linkedin.com/uas/oauth2/authorization';
        $this->tokenURL = 'https://www.linkedin.com/uas/oauth2/accessToken';
        $this->userInfoURL = 'https://api.linkedin.com/v2/me';

        // Prod - OK
        $this->redirect_uri = 'https://edit.php.net/';
        $this->clientID = $clientID;
        $this->clientSecret = $clientSecret;
    }

    public function RequestCode() {

        $query_params = array(
            'response_type' => 'code',
            'client_id' => $this->clientID,
            'redirect_uri' => $this->redirect_uri,
            'scope' => 'r_liteprofile r_emailaddress',
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

        $postString = rawurldecode(http_build_query($params));

        $ch = curl_init($this->tokenURL);

        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
        curl_setopt($ch, CURLOPT_HEADER, false);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postString);

        $httpResponse = curl_exec($ch);

        $httpResponse = json_decode($httpResponse);

        return $httpResponse->access_token;
    }

    public function getUserInfo($access_token) {
        $curl = curl_init($this->userInfoURL);
        curl_setopt_array($curl, array(
            CURLOPT_ENCODING => "",
            CURLOPT_RETURNTRANSFER => 1,
            CURLOPT_USERAGENT => 'Php Docbook Online Editor',
            CURLOPT_HTTPHEADER => array(
                'Authorization: Bearer ' . $access_token
            )
        ));

        $user = json_decode(curl_exec($curl), true);
        
        return array(
            'id' => $user['id'],
            'name' => $user['localizedFirstName'] . ' ' . $user['localizedLastName'],
        );
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

    public function __construct($clientID, $clientSecret) {

        $this->serveurURL = 'https://api.instagram.com/oauth/authorize/';
        $this->tokenURL = 'https://api.instagram.com/oauth/access_token';
        $this->userInfoURL = 'https://graph.instagram.com/me';

        // Prod - OK
        $this->redirect_uri = 'https://edit.php.net/';
        $this->clientID = $clientID;
        $this->clientSecret = $clientSecret;
    }

    public function RequestCode() {

        $query_params = array(
            'response_type' => 'code',
            'client_id' => $this->clientID,
            'redirect_uri' => $this->redirect_uri,
            'scope' => 'user_profile',
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
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postString);

        $httpResponse = curl_exec($ch);

        $httpResponse = json_decode($httpResponse);

        return $httpResponse;
    }

    public function getUserInfo($access_token) {
        $curl = curl_init($this->userInfoURL . '?access_token=' . $access_token . '&fields=username');

        curl_setopt_array($curl, array(
            CURLOPT_ENCODING => "",
            CURLOPT_RETURNTRANSFER => 1,
            CURLOPT_USERAGENT => 'Php Docbook Online Editor',
        ));

        $resp = curl_exec($curl);

        return json_decode($resp);
    }
}
