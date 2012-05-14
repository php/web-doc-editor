<?php

require_once dirname(__FILE__) . '/AccountManager.php';

class AuthServices
{
    private $google;
    private $googleOAuth2;
    private $facebook;

    const GOOGLE = 1;
    const FACEBOOK = 2;


    public function __construct()
    {
        $this->initGoogle();
        $this->initFacebook();
    }

    private function initGoogle()
    {

        $appConf = AccountManager::getInstance()->appConf;

        // Google API
        require_once 'google-api-php-client/src/apiClient.php';
        require_once 'google-api-php-client/src/contrib/apiOauth2Service.php';

        $this->google = new apiClient();
        $this->google->setApplicationName("PhDOE : Php Docbook Online Editor");
        $this->google->setClientId($appConf['GLOBAL_CONFIGURATION']['auth.google.id']);
        $this->google->setClientSecret($appConf['GLOBAL_CONFIGURATION']['auth.google.secret']);
        $this->google->setRedirectUri('http://edit.irker.net/');
        $this->google->setState('googleAPI');
        $this->googleOAuth2 = new apiOauth2Service($this->google);
    }

    private function initFacebook()
    {
        $appConf = AccountManager::getInstance()->appConf;

        // Facebook API
        require_once 'facebook-api-php-client/src/facebook.php';
        $this->facebook = new Facebook(array(
            'appId'  => $appConf['GLOBAL_CONFIGURATION']['auth.facebook.id'],
            'secret' => $appConf['GLOBAL_CONFIGURATION']['auth.facebook.secret'],
        ));
    }


    public function auth($state)
    {
        if ($state == 'googleAPI') {
            $this->google->authenticate();
            $_SESSION['GGtoken'] = $this->google->getAccessToken();
        } else {
            $_SESSION['FBtoken'] = $this->facebook->getAccessToken();
        }
    }

    public function getAuthUrl($service)
    {
        if ($service == self::GOOGLE) {
            return $this->google->createAuthUrl();
        } else {
            return $this->facebook->getLoginUrl(array('scope' => 'email'));
        }
    }


    public function getUser($service)
    {
        if ($service == self::GOOGLE) {
            return $this->getGoogleUser();
        } else {
            return $this->getFacebookUser();
        }
    }

    private function getGoogleUser()
    {
        $user = false;
        if (isset($_SESSION['GGtoken']))
        {
            try {

                $this->google->setAccessToken($_SESSION['GGtoken']);

                $gUser = $this->googleOAuth2->userinfo->get();

                $user = array(
                    'id' => $gUser['id'],
                    'name' => $gUser['name'],
                    'email' => filter_var($gUser['email'], FILTER_SANITIZE_EMAIL),
                    'img' => filter_var($gUser['picture'], FILTER_VALIDATE_URL)
                );

                // The access token may have been updated lazily.
                $_SESSION['GGtoken'] = $this->google->getAccessToken();
            } catch (apiServiceException $e) {
                unset($_SESSION['GGtoken']);
                $user = false;
            }
        }
        return $user;
    }

    private function getFacebookUser()
    {
        $user = false;

        if (isset($_SESSION['FBtoken']))
        {
            try {
                $this->facebook->setAccessToken($_SESSION['FBtoken']);

                $FBuser = $this->facebook->getUser();

                // Proceed knowing you have a logged in user who's authenticated.
                $FBuser_profile = $this->facebook->api('/me');

                $user = array(
                    'id' => $FBuser_profile['id'],
                    'name' => $FBuser_profile['name'],
                    'email' => filter_var($FBuser_profile['email'], FILTER_SANITIZE_EMAIL),
                    'img' => "https://graph.facebook.com/" . $FBuser . "/picture"
                );

                $_SESSION['FBtoken'] = $this->facebook->getAccessToken();
            } catch (FacebookApiException $e) {
                unset($_SESSION['FBtoken']);
                $user = false;
            }
        }

        return $user;
    }


}